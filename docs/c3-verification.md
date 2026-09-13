# C3 场次、预约与站内通知：交付与验收记录

项目：`D:\Project\Murder_Mystery_Game`  
日期：2026-09-13  
范围：C3-T1～T5，衔接已完成的 C2 开发实现；不提前交付 C4 押金/锁车/履约、C5 结算或 C8 Web Push。

## 1. 冻结的业务规则

本轮经需求方确认，已同步至 `docs/superpowers/plans/2026-09-09-decisions.md`：

- **D01 自动报名**：自主预约通过时，同事务创建 `source=customer` 场次、申请人的 N 人 `joined` 报名、审核结果、审计及 outbox。3 人申请获批 = 1 场次 + 1 报名 + 3 个坑位。联系人快照在提交时从本人账号取得；快照/容量不合法则整体回滚，保持 pending。
- **D10 时间基础**：UTC 存储，Asia/Shanghai 显示及筛选；周一为周起始。审批原样保留申请时间，不因界面只显示分钟而截断原时间的秒/毫秒。C7 报表归属政策未在本轮越权冻结。
- **编辑保护**：草稿/无人报名时可编辑合法排期字段；已有报名后，仅允许备注及人数上限，上限不得低于已报人数或最低人数。剧本、DM、时间、价格、人数下限等承诺字段不能直接改变。
- **权限延续源计划**：DM/manager/boss 管理场次及审批，没有新增“仅自己场次”限制；所有登录角色可使用本人报名功能。不扩大 C1 员工账号管理或资金权限。

## 2. 已实现

### T1 场次与状态机

- 真实草稿/开放场次，主 DM 与备选 DM、上架剧本关联校验、默认价格快照与覆盖。
- 人数限制、未来时间、带时区 ISO、不可实现日期、金额格式及总额上限校验。
- 完整保留 `draft/open/full/locked/running/finished/cancelled` 状态；C3 不提供锁车/开本/结束捷径。
- 强制 `updated_at` 编辑版本，陈旧编辑 409。容量驱动 full/open；满员不是锁车。
- 商家取消未涉押金/履约场次时，批量取消 joined 报名并一次释放容量；员工写入与审计同事务。

### T2 团队占坑与取消

- 报名、取消、修改容量、商家取消统一先锁 Session，再操作 Booking。
- 幂等事务采用 **READ COMMITTED**：避免在等待行锁之前由幂等查询建立的旧快照被误用于容量决策；不是依赖 Redis 锁或前端 disabled。
- actor + operation（含目标 ID）+ key 唯一；同键同 payload 重放原结果，异 payload 409。
- 本人 joined 取消只释放一次，full 释放后恢复 open。他人 403；锁车/押金保护记录 409。
- 前端“结果未知”期间保留原请求正文及幂等键，明确要求重试确认，不允许换请求悄悄再占一单。
- C4 接入真实押金记录时，须将 `depositRecorded` 保护标记与押金记录原子更新/复核；该标记不是金额账本，不接受普通 C3 PATCH 写入。

### T3 审批与我的预约

- 独立 `BookingRequest` 表，不用 Booking.pending 冒充待审核。
- pending 行锁 + 唯一 sessionId，两个员工通过、通过/拒绝竞争只能有一个结论。
- 通过自动报名、联系人快照、精确原时间、不足容量全部受同事务保护；拒绝保存原因并通知申请人。
- `/me/booking` 分别展示申请与报名；批准申请不会算成第二份报名，后续取消状态以报名记录为准。
- `/me` 最近预约也改为真实读取，不再显示固定演示场次。

### T4 真实通知消费者

- `booking_request.created` → 有审批权限的有效员工；approved/rejected → 申请人。
- `booking.joined/cancelled` → 有场次权限的员工；`session.cancelled` → 受影响报名账号。
- `session.capacity_reached` 仅在人数从低于 player_min 跨到达标时触发；提示不是锁车授权。
- outbox 与业务同事务；Redis 失效信号和 notifications 由真实 worker 后续处理。
- `eventId + userId` 唯一、消费者行锁/状态复查、退避重试；进程停止后保留 pending，重启继续扫描。
- 通知收件人只由服务端计算，派发时复核有效账号/员工角色。正文不包含联系人手机号。
- 本人列表/未读数/已读；混入他人或不存在的通知 ID 时整体 403，不部分更新。
- 复用原小铃铛和 Dialog；默认 20 秒刷新，也可打开后立即刷新；不请求浏览器 Push 授权。

事件 ID/type 存在 outbox 行中，其余 actor、subject、发生时间、收件人及最小业务载荷存在 payloadJson；沿用 C1 outbox，不建设第二份消息队列。

### T5 真实页面

- 顾客：`/sessions`、`/booking/new`、`/me/booking`、首页近期场次、剧本详情的场次/预约入口。
- 员工：`/admin` 真实今日场次/待审数、`/admin/sessions`、`/admin/sessions/pending`、`/admin/bookings`。
- 日期范围、剧本和状态筛选、稳定分页；北京时间“本周末/下周/今日”一致。
- 原排期页保留 data-list/data-row 行式布局；复用设计变量、Button/Field/Dialog、AntD 表单/表格与 React Query。新增 SessionCard 行/卡片模式及通知组件接入开发设计系统预览。
- 后台身份标签读取真实账号角色，不再把 DM/BOSS 一律显示为店长。
- 未接通的 C4 金融/履约按钮不再展示假成功；`/admin/ops` 的审核/报名页签也改接真实待审与名单入口，不保留另一套模拟审批。

## 3. 证据与结果

C3 功能开发与隔离测试验收已完成；这不是生产部署完成声明。最终构建/运行检查结果见下表。

| 检查 | 已确认结果 |
| --- | --- |
| TypeScript / ESLint | **PASS**：TypeScript（cmd195/205），ESLint（cmd205，0 error / 0 warning） |
| 单元测试 | **PASS 15/15**（cmd198），含状态机、北京时间边界和非法日期 |
| MySQL/HTTP 集成 | **PASS 53/53**（cmd169，43 个 C1/C2 + 10 个 C3），包含审批中途容量失败/审计 |
| C3 浏览器 | **PASS**（cmd195 联合执行 2/2，浏览器部分约 1 分钟）；真实建场、登录回跳、审批占坑、通知已读、响应丢失时原键重试、取消、三档宽度与价格/容量可见性、旧运营入口跳转 |
| C2 浏览器回归 | **PASS**（cmd195 同一 Playwright worker 联合运行；真实内容保存/冲突、关联跳转、三档视口） |
| 生产构建 / Prisma | **PASS**（cmd205）：Client generate、优化构建、构建内 TypeScript、standalone 静态资源准备；schema validate PASS（cmd198） |
| C3 安全迁移演练 | PASS（cmd205 最终重跑；此前 cmd174 亦通过）；4 类旧状态/报名、计数、金额、联系人、房间、封面/slug 和归档均核对，隔离临时表已清理 |
| worker 停止/重启/重复消费 | PASS（cmd205 最终重跑；此前 cmd176 亦通过）；停机期间 pending 留存，重启送达，重投仍为 2 事件/2 通知 |
| 实际数据库/schema 对比 | PASS（cmd205 最终重跑；此前 cmd193 亦通过），真实连接 diff 为空，含两张历史归档；没有执行 diff SQL |
| 编辑器诊断 | 0 error / 0 warning（最终编辑后复核） |

已确认最终基础检查命令：`cmd_1789301329706_169`（typecheck/lint、15 单元、53 集成、Prisma validate 均通过）。其联合浏览器步骤发现跨文件连接清理问题，后续修复结果单独记录，不把该整条命令误记为退出 0。

最终可追溯命令（均为工具返回的实际标识）：
- `cmd_1789301329706_169`：15 单元 / **53 集成** / Prisma validate；当时的联合浏览器连接清理问题已修复。
- `cmd_1789301870380_195`：TypeScript、联合 Edge **2/2**；遗留的 1 条 unused import lint warning 已移除并由 cmd205 验证为零。
- `cmd_1789301963043_198`：最终单元 **15/15** + Prisma validate，exit 0。
- `cmd_1789302115806_205`：最终 Prisma generate、零告警 lint、production build/postbuild、实际 DB 无差异、worker 重启重投、完整旧数据迁移演练，**整链 exit 0**。
- 编辑器最终诊断：0 error / 0 warning。源码范围 `git diff --check` 未发现空白错误；Windows LF/CRLF 提示不是编译/测试失败。

### 验收对应

| 编号 | 可复核证据 |
| --- | --- |
| AC-C3-01 | 员工建场、价格默认/覆盖、主备 DM/剧本关系、非法人数、顾客 403；后台实际创建后数据库回读 |
| AC-C3-02 | 剩余 3 坑两个账号各报 2 人，仅一个 201；同键重放不新增、异体 409；改上限与报名竞争保持 count ≤ capacity 且等于 joined 汇总 |
| AC-C3-03 | 并发重复取消只释放一次、full→open；他人 403、锁车/押金保护 409；无自动锁车/超时取消 |
| AC-C3-04 | 双通过/通过拒绝竞争一场一单；3 人自动占坑；拒绝不生成场次；快照/时间非法不通过；容量失败回滚场次与审计 |
| AC-C3-05 | 申请/报名分开，首页/大厅/后台同源；浏览器真实刷新；缓存失效故障回源；结果未知的网络重试不重复报名 |
| AC-C3-06 | 真实 worker 自动送达（首次断言前不手工 dispatcher）；停机/重启/重投记录；通知已读权限矩阵；无联系人扩散 |
| AC-C3-07 | 员工场次与审批审计；顾客报名不增加员工操作日志；Redis 故障不会回滚已提交业务，outbox 保留补偿路径 |

失败修复证据：最初状态机测试因模块未实现而失败；之后修正了 ES 目标下 BigInt 字面量、React effect 同步状态 lint、格式化后移动的测试 lint 注释。联合浏览器还发现每文件直接 quit Redis 会污染同一个 Playwright worker，现使用共用 worker-scoped fixture 统一关闭连接。响应丢失使用 Playwright 真正先完成上游请求再断开浏览器响应，不是假设网络成功。Redis 故障测试是受控注入缓存/派发调用失败，不宣称关闭过共享 Redis 服务。

### 浏览器产物

- `test-results/c3-browser/checks.json`
- `sessions/request/mine/home/admin/review/bookings-{390,820,1440}.png`
- `reference-sessions-{390,820,1440}.png`
- `test-results/c3-worker-restart.json`

已实际查看桌面/手机大厅、手机申请表和后台截图，对照原稿修正大厅行式布局；后台截图补充等待加载完成。手机截图复核发现原稿 CSS 会隐藏价格/容量列，已针对真实场次改成窄屏纵向排列，并增加 390/820/1440 可见性断言。自动水平溢出与运行时错误检查不是逐像素视觉验收。截图中的 Next 开发指示器不属于生产 UI。C8 的九视口、正式素材和部署环境人工验收仍需单独执行。

## 4. 缓存与故障边界

- 公开大厅使用短 TTL（5 秒）Redis 缓存，键包含筛选条件与 epoch；首页复用同一查询。授权名单/通知/个人预约不放进公共缓存。
- 成功响应前在事务提交后主动推进 epoch；Redis 故障被捕获，不让已提交报名变成误导性 500。缓存读取失败回源。
- 后台普通场次变更及报名/取消事件由 worker 再次推进 epoch，提供恢复补偿。Redis 操作有有界等待。
- 容量永远读锁定的 MySQL 行，缓存陈旧不会超报。
- 通知接口从数据库读取；Redis 存储失效/新通知信号而非权威通知正文。重建信号不影响数据库已读状态。
- worker 退避重试最多 10 次后保留 dead 事件；运维应排障后只重投确认范围内的事件，不能清空整个 outbox。服务临时故障不删除已提交预约。

## 5. 迁移与上线保护

本轮仅操作 `shisanwu_test`，迁移前导出 **`backups/c2-test-1789300400240.json`（21 表）**。此为测试库备份，不是生产备份。

迁移：`prisma/migrations/20260913143000_booking_sessions/migration.sql`。

| 旧值/字段 | 转换规则 |
| --- | --- |
| Session.scheduled | 无占坑时 draft；存在转为 joined 的旧报名时按容量 open/full |
| Session.completed | finished |
| Booking.pending / confirmed / completed | joined / locked / finished；原值归档，不伪装成自主申请 |
| 存在旧 confirmed 报名的非终态场次 | 保守保留为 locked，不能被 C3 普通取消/编辑重新打开 |
| 计数 | 从非取消旧报名汇总占坑；异常容量由迁移 guard 拒绝，须人工核对 |
| 价格/联系人 | 场次默认价格取剧本；原 Booking.totalAmount 不改写；联系人从原账号快照 |
| 旧房间、结束时间、预约编号、封面/slug | 保留，不删原列或重建业务记录 |
| 原状态/计数/金额 | 保存 `c3_legacy_sessions`、`c3_legacy_bookings` 归档 |

`npm run prisma:migrate` 已串联 C2 与 C3 guard。业务库 C3 待迁移时默认拒绝；只有完成外部完整备份、恢复副本演练、历史状态/容量/押金事实核对并停止写入后，才由获授权人员设置 `C3_MIGRATION_CONFIRMED=准确库名` 执行。不要把这个变量常驻配置，更不要借它绕过 C2 的安全升级门禁。

只读实际数据库对比 `npm run c3:schema:check` 已通过（`test-results/c3-schema-diff.sql` 为 empty migration）。不要使用 Windows 大小写归一化后的两个 schema 文本差异替代真实数据库对比，也不要自动执行任何 diff SQL。

C3 新增外键明确 `onUpdate: NoAction`，与已执行 SQL 的实际约束一致；账号/场次 ID 不可修改。两个归档表以 `@@ignore` 模型保留在 schema（不生成业务写 delegate），防止后续迁移误建议删除历史归档。

本轮演练在测试 schema 内新建 `c3r_<timestamp>_*` 临时命名空间，使用真实初始 SQL、C2 安全 SQL 和 C3 SQL，校验后按 FK 依赖清理；不需要 CREATE DATABASE、不 reset、不改现有业务表。DDL 非整体事务，迁移失败后应停止并检查，不盲目回滚标记重跑。

**未执行生产迁移、生产备份恢复或 Docker/Nginx 部署验收。** C2 留存的上线门禁继续有效。没有上线支付、押金退款或账户余额变更；Booking.totalAmount 仅为预约价格快照。

## 6. 复现与运行

先按 C2 文档准备隔离 `.env.test`，确认 TEST_DATABASE_URL 指向 `shisanwu_test`、TEST_REDIS_PREFIX 以 `ssw-test:` 开头。测试与应用须使用相同库、前缀、端口及媒体根，不要连到业务库。

PowerShell 服务窗口：

```powershell
$env:UPLOAD_PUBLIC_DIR='var/test-uploads'
$env:UPLOAD_PRIVATE_DIR='var/test-private-media'
npm run dev:test
```

另开 worker 窗口（C3 集成与浏览器通知验证必须实际运行）：

```powershell
$env:OUTBOX_POLL_MS='300'
npm run dev:worker:test
```

验证窗口，逐条检查退出码：

```powershell
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run prisma:validate
npm run c3:migration:rehearse
npm run c3:schema:check
$env:PLAYWRIGHT_CHANNEL='msedge'
npx playwright test tests/e2e --workers=1 --reporter=line
npm run build
```

worker 重投检查启动了两个实际消费者，但不宣称每次都人为强制它们同时争抢同一行；数据库去重约束与实际重投结果均已验证。

worker 重启检查需先停止上面的测试 worker（否则无法证明停机期间未投递），执行：

```powershell
npm run c3:worker:verify
```

该检查只启动/停止自己创建的子进程，完成后清理自己创建的测试账号/事件。测试 DB 中其它数据、共享 Redis 和非本轮进程不作全局清理。cmd169 失败运行遗留的三个人工测试账号（523/524/525）已按精确创建时间/测试名称并确认无报名申请或员工业务操作后清理；没有按手机号段批量删除。

开发/验证流程已可用；生产 worker 的进程守护、Docker 集成、监控告警和 Web Push 按 C8 计划生产化。精简 standalone 镜像不应被假定自带 tsx/Prisma 迁移工具。

本轮临时 API/worker 已停止；复现请按上方命令显式启动，不依赖遗留进程。

## 7. 交接 C4

- 继续使用同一 Session/Booking 表、状态机、锁顺序、幂等键、outbox 与 `/admin/bookings` 名单，不另建平行订单或资金表冒充账本。
- `full` 只是容量状态，达最低人数只是通知。锁车政策 D02、押金/跳车/退款政策 D03 和免押金权益仍须 C4 确认。
- C3 将有押金保护/locked/running/finished/jumped 记录拒绝在普通取消路径之外；C4 必须以真实押金/履约记录扩展，不靠前端按钮约束。
- 回退先暂停新报名/审批，保留只读和事件记录；用已验证备份与兼容版本恢复。不得删除报名或清空 outbox 来“回到演示状态”。

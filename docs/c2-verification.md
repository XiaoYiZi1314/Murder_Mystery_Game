# C2 内容与媒体：完成状态与验收记录

- 项目：`D:\Project\Murder_Mystery_Game`
- 日期：2026-09-13
- 范围：C2-T1～T4；不扩展 C3 排期、C4 履约历史、C6 发评或 C8 COS/完整视觉验收。
- 结论：**C2 开发实现及本机测试已补齐；生产数据升级、Docker/Nginx 实机验收仍是上线前置条件，不能据此宣布生产已验收。**

## 1. 本轮完成内容

| 工作包 | 完成内容 |
| --- | --- |
| T1 内容与数据 | 剧本/角色/标签/妆造/DM 真实 DTO 和查询；名称、标签、精选、分页及稳定排序；字符串 ID/金额；关系事务、审计、outbox；引用冲突 409；强制版本条件更新；旧 slug 保留；安全 C1→C2 数据转换 SQL 和演练工具 |
| T2 媒体 | JPEG/PNG/WebP ≤5 MiB，MIME+签名+解码三重校验；24MP 上限；去 EXIF、重编码和缩略图；随机文件键；公私目录隔离；用途/所有者读取校验；DB 失败补偿；至少 7 天无引用孤儿清理；容器卷、非 root 写权限和 Nginx 公开资源配置 |
| T3 后台 | `/admin/scripts`、`/admin/costumes`、`/admin/dms`、`/admin/settings` 真实读写；角色排序、标签、DM/妆造关联；字段级错误；409 后明确重新加载；DM 只改本人展示资料；设置逐键白名单；同事务审计 |
| T4 顾客页面 | RSC/DTO adapter 接真实数据；列表公开，剧本详情服务端鉴权；HTML/RSC/预取不泄漏简介；登录回跳；slug 与关联往返；真实首页精选/二维码；无评价、无履约历史、未接入排期时展示真实空态 |

D11 已按需求方本轮确认冻结：**manager 与 boss 可修改精选、商家二维码和通知开关；DM/customer 不可修改。** 精选唯一来源为 `Script.featured`，设置页链接剧本管理，不在 `Setting` 双写。通知配置只保存服务端开关，实际渠道消费交 C3/C8，不影响日志/账本。员工账号权限不因本次确认而改变。

旧封面兼容：已在数据库中的 C1 剧本/妆造封面可原样保留并继续编辑其他字段；任何新建或替换图片仍须经过受控上传登记。旧静态素材不会被孤儿清理器当作新上传资源删除。

## 2. 执行证据

最终回归记录如下；不以某条 PowerShell 复合命令的末尾成功掩盖前序失败，回归命令均显式检查 `$LASTEXITCODE`。

| 检查 | 结果 / 证据 |
| --- | --- |
| TypeScript | PASS；最终回归 `cmd_1789297225587_133` |
| 单元测试 | PASS 11/11；最终回归 cmd133，覆盖格式、元数据移除、像素限制、签名/损坏/大小拒绝等 |
| MySQL/HTTP 集成 | PASS 43/43；最终回归 cmd133，含 15 个内容用例、6 个媒体用例和 C1 回归 |
| ESLint | PASS；最终回归 cmd133 |
| Prisma schema | PASS；最终回归 cmd133 |
| Next 生产构建 | PASS；最终回归 cmd133，含 TypeScript、页面生成及 standalone 素材准备 |
| 浏览器 | PASS 1/1；最终 `cmd_1789297262524_135`，Edge，17.5s：登录回跳、关联往返、后台保存/API 回读、409/重载、Escape、三档宽度及运行时错误检查 |
| 安全 SQL 演练 | PASS；`cmd_1789296665325_108`，隔离前缀表创建 C1 fixture → 安全转换 → 断言 → 清理 |
| 编辑器诊断 | 最终检查 0 error / 0 warning |

### 浏览器与视觉证据

目录：`test-results/c2-browser/`（测试产物，不作为业务数据提交）。

- `checks.json`：5 个顾客页面 × 390/820/1440 宽度，无文档水平溢出；登录、保存、冲突与 Escape 断言；浏览器未捕获运行时错误列表。
- `scripts-*`、`script-detail-*`、`costume-detail-*`、`dm-detail-*`、`home-*`：真实页面截图。
- `editor-*`：后台编辑器三档宽度截图。
- `reference-scripts-*`：原稿页面截图。
- 已实际查看截图并与原稿核对列表的字体、背景、容器、卡片和工具栏；修正了桌面筛选表单过宽换行问题；查看了手机详情和窄屏编辑器。自动“无溢出”检查不等于逐像素视觉验收。截图采用测试素材/测试文案，不冒充正式门店内容。
- 本次为 C2 三档响应式与交互检查；C8 九视口、全页逐像素/人工验收未执行。

### AC 对照

| 验收项 | 当前证据 |
| --- | --- |
| AC-C2-01 | 内容 MySQL/HTTP 测试：持久化、排序角色、重复关联去重、双向关系、引用删除冲突、条件更新；浏览器保存后独立 API 回读 |
| AC-C2-02 | 匿名列表 200，详情 API 401；HTML/RSC/预取不含受限正文；登录后可读，浏览器回跳及妆造往返 |
| AC-C2-03 | customer/DM/manager/boss 服务端权限矩阵；DM 自改/改他人；D11 设置允许/拒绝；不依赖按钮隐藏 |
| AC-C2-04 | 图像/HTTP 恶意输入、私有所有者/BOSS读取、路径拒绝、补偿和孤儿保护已测；**Docker 卷/Nginx 实机项待部署环境** |
| AC-C2-05 | 名称/标签/分页/价格/latest/rating 稳定查询；真实精选及二维码公开白名单；无伪造评分/排期/履约历史 |
| AC-C2-06 | 内容/关系/DM/设置/上传审计，catalog.changed outbox，不给顾客发内容维护通知；版本冲突保护；类型/lint/build/测试记录见上 |

当前顾客内容不使用持久化数据缓存，读取最新数据库投影；`catalog.changed` 保留内容缓存失效事件契约，不生成顾客通知。

## 3. 安全迁移：不要直接执行历史破坏性迁移

发现的历史文件 `prisma/migrations/20260913093727_content_media/migration.sql` 存在旧状态枚举收缩、封面/旧字段及关联迁移风险，也有 Linux 表名大小写问题。**未改写已应用的迁移历史。** 新增：

- `prisma/upgrade/c2-safe.sql`：安全替代转换。
- `scripts/c2-safe-upgrade.mts` / `npm run c2:upgrade`：默认只读预检；真正 apply 必须显式确认目标库、停写、外部备份。
- `scripts/c2-migrate-guard.mts`：`npm run prisma:migrate` 先阻止待应用的危险 C2 历史迁移，避免盲目 deploy。
- `scripts/c2-migration-rehearsal.mts` / `npm run c2:migration:rehearse`：仅在严格校验的 `shisanwu_test` 下创建时间戳前缀临时表，不需要 CREATE DATABASE，不重置现有表。

映射规则：

| C1 数据 | C2 处理 |
| --- | --- |
| Script `published` / `archived` | `on` / `off`；draft 保持 |
| Costume `available` / 其他旧状态 | `on` / `off` |
| Costume `imageUrl` | 原值保留，列更名为 `coverUrl` |
| Script JSON 标签 | 归一化去空白、去重，转 `Tag` / `ScriptTag`；预检拒绝异常标签 |
| `_CostumeToScript` | 转 `ScriptCostume`，保留两侧 ID |
| 原 Script slug | 保留；新增妆造/DM slug 列为加法迁移 |
| 库存、难度、旧状态/标签/关系 | 归档至 `c2_legacy_*` 表，不虚构正式库存业务 |
| C1 DM 演示评分 | 清空为真实无评价状态，等待 C6 汇总 |

成功演练断言：slug 未变、状态正确、图片未丢、2 个标准化标签、2 个 ScriptTag 关系、1 个 ScriptCostume 关系、归档库存 3。修复并验证了 Windows 表名大小写清理和 JSON_TABLE collation 兼容问题。临时表已按依赖顺序清理。

**尚未执行/授权：生产库升级、生产备份恢复测试、完整升级 runner 的 apply→备份→Prisma journal resolve 流程验收。SQL fixture 演练通过不等于这些流程已通过。**

生产前建议流程（下面不是本次已执行记录）：

1. 在独立恢复副本中核对旧 schema / 数据量 / 素材；取得包含结构与数据的外部完整备份并验证可恢复。脚本附加 JSON 导出仅作辅助证据，不能替代完整备份。
2. 停止所有内容写入与相关 worker；确认没有历史迁移部分成功、已有 `c2_legacy_*` 或异常标签。
3. `npm run c2:upgrade` 只读预检。C1 或全新空库均不得绕过 guard 直接跑危险历史迁移。
4. 获准后才运行 `npm run c2:upgrade -- --apply --backup-confirmed --writers-stopped --confirm-database=实际库名`。
5. 转换/迁移日志核对后运行 `npm run prisma:migrate` 应用加法迁移，再 `npm run prisma:generate`。源代码/工具环境执行迁移；不要假定精简 standalone 运行镜像含 Prisma CLI。
6. 复核数据数量、旧 slug、封面、关联、账号和权限，保留完整备份及 `c2_legacy_*` 后再恢复写入。

若历史 C2 已应用，升级器只报告该事实，不伪造已丢字段的恢复。需要从原备份恢复受影响数据。MySQL DDL 不是完整事务；失败后停写并人工检查，禁止盲目重跑、reset、删除 uploads 或用空库覆盖业务库。生产回退须使用已验证的数据库/文件备份及对应兼容应用版本。

本次仅对测试库应用加法迁移，操作前导出：`backups/c2-test-1789295743842.json`、`backups/c2-test-1789296143751.json`。这些是测试快照，不是生产备份。未清空共享 Redis 或全局 outbox。早期超时浏览器测试残留已按已识别的两个 fixture 精确清理，本轮新增的 `c2-browser-inspect.mts`、`c2-fixture-recovery.mts` 已删除；不清理来源不明或原先已有的未提交文件。

## 4. 存储与部署交接

- `STORAGE_DRIVER=local`；公开根 `/data/uploads`，私有根 `/data/private-media`，必须为互不包含的目录。
- Compose 命名卷：`uploads-public` / `uploads-private`。app 可写两者；Nginx 仅以只读方式挂载公开卷 `/srv/uploads`。
- Dockerfile 为非 root 用户准备目录所有权；私有根 0700，私有文件 0600。已有卷升级时应先检查 UID/GID/权限，不要对业务目录盲目递归删除或开放 0777。
- Nginx 只直出随机 32 位十六进制 `.webp` / `-thumb.webp`，加 `nosniff`；其他 `/uploads/` 和 `/private-media/` 路径拒绝。
- 上传只接受文件 ≤5 MiB；HTTP multipart 与 Nginx 请求体上限另计协议开销。原项目已审查静态 SVG 保留，用户 SVG 上传拒绝。
- 缩略图最长边 480；角色图上限 900×1200，DM 图 1200×1500，其他图 1600×1600，保持比例且不放大。
- `cleanupOrphans(graceDays)` 最小宽限期 7 天、批次上限 100，保护已引用资源；本次没有在业务库启动自动清理。C8 接运维调度及 COS 备份。
- `.dockerignore` / `.gitignore` 排除环境密钥、测试产物、私有媒体和备份。

**环境阻塞：本机 `docker` 命令不可用。** 配置已实现/静态核对，但卷持久化、容器重建后资源仍可读、Nginx 公私访问边界必须在 Docker 环境继续实测。不能把 Node/Edge 测试当作该项通过。

## 5. 可复现测试

准备隔离 `.env.test`：`TEST_DATABASE_URL` 指向测试 schema、`TEST_REDIS_PREFIX` 以 `ssw-test:` 开头；不要把生产 URL 放进测试变量。测试服务和测试进程必须使用同一测试库及媒体根。

PowerShell 窗口 A（仅在端口无现有测试服务时启动）：

```powershell
$env:UPLOAD_PUBLIC_DIR='var/test-uploads'
$env:UPLOAD_PRIVATE_DIR='var/test-private-media'
npm run dev:test
```

窗口 B：

```powershell
npm run typecheck
npm test
npm run test:integration
npm run lint
npm run prisma:validate
npm run c2:migration:rehearse
$env:PLAYWRIGHT_CHANNEL='msedge'
npx playwright test tests/e2e/content.spec.ts --workers=1 --reporter=line
npm run build
```

本轮验收专用开发服务已主动停止，避免继续占用测试端口；按窗口 A 可重新启动。逐条确认退出码。Edge 是本次实际运行的浏览器；如机器无 Edge，需自行安装对应 Playwright 浏览器。测试使用临时账号/已审查项目图片，不写入正式门店资料。没有创建正式商家二维码或杜撰业务剧本；上线内容仍需门店录入并审核。

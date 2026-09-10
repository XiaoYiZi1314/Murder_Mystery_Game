# C8 开发文档：PWA、Push、离线、备份恢复与上线

> 执行提示：同一会话按 `superpowers:subagent-driven-development` 分派独立工作包；另开会话按 `superpowers:executing-plans` 执行。先复核前置验收，再实现和验证；本文为开发计划，复选框与示例均不代表已完成。

**Goal：** 在全部一期业务已验收的基础上交付可安装、可离线查看、可可靠通知、可恢复、可运维的正式单店应用。
**Architecture：** 延续 Next.js 单体、MySQL 权威数据、Redis Session/队列；Workbox 管理浏览器缓存，现有事件 outbox 驱动站内通知与独立 Push worker，Docker Compose 单机运行。
**Tech Stack：** 当前 Next.js/React/Prisma、MySQL/Redis、Ant Design/Tailwind；拟新增 Workbox、web-push、VAPID、COS 备份适配及系统 crontab，按锁文件核对兼容版本。
**Spec：** `docs/设计文档.md` §4.2、§5.2、§6.2、§8.2–8.4、§9、§10、§12；`AGENTS.md`；`docs/verification.md`。

## 1. 全局约束与本期边界

- “开发页面时，**必须优先复用已有组件**。”可通过 props、variant、className、children/slot 扩展时先扩展，现有组件无法满足才新增。
- “不做支付：充值、消费、押金均通过微信私下转账，由商家在后台手动记账。”离线缓存不得引入自动支付或资金重放队列。
- “需求方要求一期全做完、自己开发。”C1–C8 是一期内部迭代，C8 的进入不等于其他需求可延期。
- 共同遵循 [共享协议](2026-09-09-shared-contracts.md)、[决策记录](2026-09-09-decisions.md) 和 [总路线图](2026-09-09-development-roadmap.md)；API 使用 `/api`、`{code,message,data}`、snake_case、字符串 ID/金额。
- 所有服务端接口独立鉴权；员工敏感写与审计同事务；已提交账务不得因通知失败回滚；失联客户端不能写业务数据。

**现状：** 已有 manifest、三类图标、共享组件、开发对照页、standalone 的 `postbuild` 静态资源准备和 Docker 配置；此前构建及 HTTP 检查通过，截图与真实浏览器交互验收未完成。真实 PWA/Push/备份运行结果不能从这些记录推定。
**前置：** C1 账号/RBAC/审计/outbox 已验收；C3 小铃铛列表、未读/已读及首批通知已上线到测试环境；C4–C6 补齐业务事件；C7 财务口径/日志及一期全功能通过。可提前准备域名、COS 与浏览器矩阵，正式退出依赖 C1–C7 全部通过。
**不含后续：** 不接短信/邮箱、小程序、线上支付、多门店、COS 媒体迁移或线上礼品订单；保留既有 Provider/STORAGE_DRIVER 边界。COS 异地备份本期必须实现。

## 2. 输入、输出与决策冻结

| 类别 | 具体内容与交付要求 |
| --- | --- |
| 输入 | 各周期验收记录、真实测试业务数据、原生 HTML/23 页映射、组件预览、当前迁移与容器配置、事件目录、媒体路径及权限表 |
| 输出 | 安装/离线/更新可运行产物，Push worker 与重试记录，所有触发点核验表，周备份与恢复实测记录，九视口截图，发布/回退操作手册 |
| D08：C8-T4 部署前 | 冻结正式域名备案/TLS、腾讯云机器、COS 桶/地域/访问策略/可用凭据；未就绪可做隔离演练，不得宣布正式可上线 |
| D09：C8-T1 图标及 C8-T5 视觉验收前 | 确认 Logo/素材/主题色；源示例 `#0f0e17` 与现有浅色设计不能擅自选一个覆盖，定稿结果同步 manifest、meta 和图标 |
| D12：C8-T2 开工前 | 逐路由确定已访问/未访问页、详情动态 ID、会员/财务/举报数据的离线内容、授权期限、账号隔离与设备清理规则；记录不可达场景的显示内容与验收方式 |
| D10：沿用 C7 已冻结结果 | 备份计划使用业务时区与明确星期；日志同时保留 UTC 时间和业务时区，避免主机默认时区误触发 |

“所有页面离线可访问”必须覆盖源文档 C/B 端路由清单，不得静默缩成仅首页或公共页。未访问页无历史数据、离线期间权限撤销无法实时感知等限制须在 D12 写明接受标准；必要的预取/快照须计入本期任务。若敏感数据保护与离线要求仍冲突，则阻塞该项及正式发布，不能自行删减需求。

## 3. C8-T1：安装入口、运行配置与更新体验

**复用/修改：** `src/app/manifest.ts`、`src/app/layout.tsx`、`src/features/home/home-page.tsx`、`src/components/ui/Dialog.tsx`、`public/icons/`、`scripts/generate-icons.mjs`、`.env.example`。
**拟新增：** `src/features/pwa/{PwaProvider,InstallPrompt,OfflineBanner,UpdatePrompt}.tsx`、`src/features/pwa/pwa.css`、`src/lib/pwa/client.ts`、`tests/e2e/pwa-install.spec.ts`。
- [ ] 清点已有浏览器安装与通知提示，扩展真实共享 Dialog/Button；不得复制首页或引入独立展示样式体系。
- [ ] 校准 name/short_name/start_url/display 与 192/512/maskable 图标；图标来自已确认素材，实际检查安全区、独立启动、深链接与导航回退。
- [ ] `beforeinstallprompt` 可用时展示用户触发的引导；iOS Safari 展示“添加到主屏幕”图文步骤；不支持安装时保留正常网页使用。
- [ ] 发布版本附缓存版本号；新 SW 等待用户确认更新，未提交表单给予明确提醒，不在记账过程中强制刷新；更新成功再清理旧静态缓存。
- [ ] 明确 dev/prod 隔离：普通开发不遗留生产 SW；专用生产测试 origin 校验 SW。`/dev/*` 永不进入生产产物缓存。

## 4. C8-T2：全路由离线与身份隔离

**复用/修改：** C1 `src/server/auth/session.ts`、C3–C7 页面读模型、`src/components/layout/`、`src/lib/routes.ts`、`next.config.ts`、`package.json`。
**拟新增：** `src/service-worker/sw.ts`、`scripts/build-service-worker.mjs`、`src/lib/pwa/{cache-policy,identity-cache}.ts`、`tests/e2e/{offline,offline-identity}.spec.ts`、`docs/operations/offline-route-matrix.md`。

| 资源/请求 | 计划策略与必须验证的边界 |
| --- | --- |
| App Shell/版本化样式 JS/实际字体 | Workbox precache；只打包使用资源，不增加替代字体；资源清单跟随构建哈希 |
| 公共图片/静态资源 | Cache First + Expiration/LRU，明确条目、容量与过期上限；公开 uploads 与私有举报证据分开 |
| 页面导航 | Network First，断网展示最后在线数据及时间；按 D12 实现全部路由的快照/预取或约定空壳，覆盖直接访问与客户端跳转 |
| Next.js RSC/导航预取 | 区分 document、RSC、查询和请求变体，避免缓存 HTML 误回给 flight；不把认证页面当公共文档复用 |
| `/api` 与其他写请求 | 默认 Network Only；只读缓存必须走明确白名单和同一身份隔离策略。POST/PATCH/PUT/DELETE 无离线重试队列 |
| 会员/财务/举报及证据 | 依 D12 独立授权快照策略实现，禁止通用 runtime catch-all；不能以隐藏 UI 代替缓存隔离或身份核验 |

- [ ] 建立全部正式页面清单，包含 `/me/*`、所有细分 `/admin/*`、详情样本、筛选分页、登录/注册及禁止缓存路径；逐项写线上/离线预期与证据文件。
- [ ] 缓存命名至少区分部署版本与不可伪造的账号缓存域；不将 Cookie、密码、Session 密钥放入 CacheStorage/localStorage，不从前端 role 字段授予离线权限。
- [ ] 登录/登出/换号/禁用后重新联网均清理或失效对应缓存、React Query 与 SW 内存状态；多标签同步，避免 B 账号看到 A 账号余额、财务或举报。
- [ ] 依 D12 对离线授权过期、首次访问、浏览器清缓存/配额不足提供明确状态；重新联网先核验权限再更新敏感视图，不能把陈旧数据显示为实时余额。
- [ ] 离线横幅使用“当前离线，展示缓存数据”；禁用报名、审批、押金、记账、兑换、评价、上传等写入口，保留用户可理解的原因；服务端断网仍是最终失败边界。
- [ ] 模拟弱网、真正断网、SW 更新、不同账号/角色、过期授权和缓存损坏；验证恢复联网不会自动提交此前未完成的资金或报名操作。

## 5. C8-T3：Push 投递与完整通知核验

**复用/修改：** C1 `src/server/events/{types,outbox,dispatcher}.ts`、C3 `src/server/notifications/service.ts`、现有小铃铛组件、C3–C6 事件触发点及通知开关。
**拟新增：** `src/server/push/{subscriptions,sender,worker}.ts`、`src/app/api/push/subscribe/route.ts`、`src/app/api/push/unsubscribe/route.ts`、`scripts/run-notification-worker.ts`、`tests/integration/push.test.ts`。
**表：** 源 `push_subscriptions(id,user_id,endpoint UNIQUE,p256dh,auth,created_at)`；拟新增投递状态表 `push_deliveries(event_id,subscription_id,attempts,status,next_attempt_at,last_error)`，业务去重键为 `(event_id,subscription_id)`。端点/密钥不写普通日志。
- [ ] 登录后完成首次预约等有意义操作再征求权限；拒绝或系统不支持时仅用小铃铛，不重复弹浏览器权限；订阅绑定服务端 Actor，禁止客户端指定 user_id。
- [ ] 订阅验证 HTTPS endpoint 与 Web Push 服务域/允许规则，禁止任意内网请求；限制字段长度、频次和有效密钥。相同本人 endpoint 幂等更新，其他账号占用需先完成安全解绑，不能静默改归属。
- [ ] 登出关闭此设备 Push 并解绑当前账号；换号重新确认绑定。撤销通知权限时清理本设备关系，不误删同账号其他设备的有效订阅。
- [ ] 仅 Push 预约通过、场次锁车、场次取消；通知载荷避免手机号/余额/举报信息。点击通过站内相对地址打开目标页并重新鉴权，不信任任意 URL。
- [ ] 沿用提交后 outbox 分发：先持久化站内通知再入 Redis，队列故障由 outbox 补发；Push 错误不影响已提交业务结果，且不能永久丢事件。
- [ ] 初次失败后最多重试 3 次，指数退避并处理 `Retry-After`；429/网络/5xx 不删除订阅，404/410 确认失效后清理。耗尽重试进入失败记录供受控重放；worker 重启继续任务。
- [ ] 发送成功与回执更新之间崩溃可能造成重复：使用 event_id 通知 tag 与投递幂等减少重复，不宣称外部 Push 严格 exactly-once。Provider 保留未来 SMS/Email 接口而不接入。

| 完整触发核验 | 站内收件人/来源 | 本期 Push |
| --- | --- | --- |
| 自主预约通过、拒绝 | 申请顾客；C3 | 仅通过 |
| 锁车、取消 | 受影响报名顾客；C4 | 两者均推 |
| 评价回复 | 被回复顾客；C6 | 不推 |
| 积分/余额变化、等级升级 | 本人；C4 押金及 C5 钱分规则产生对应事件 | 不推 |
| 新自主预约、新报名、人数达标 | 具备处理权限员工；C3 | 不推 |
| 待结算提醒 | 带本 DM/有权限员工；C4–C5 | 不推 |
| 新举报 | 仅 BOSS；C6，内容不含举报人身份/正文 | 不推 |

该表用于核验此前已实现的钩子与通知，发现漏项回对应周期修复；不在 C8 另建第二套小铃铛或业务事件。

## 6. C8-T4：周备份、恢复与生产环境

**复用/修改：** `Dockerfile`、`docker-compose.yml`、`docker/nginx.conf`、`.env.example`、`scripts/prepare-standalone.mjs`、C2 公私媒体存储、C1 数据迁移。
**拟新增：** `scripts/ops/{backup,restore,release,rollback}.sh`、`docker/backup.cron`、`src/app/api/health/route.ts`、`docs/operations/{deployment,backup-restore,release-runbook}.md`；Push worker 可用同镜像独立进程，仍属单体部署。
- [ ] TLS/备案与正式 origin 验证通过；生产 Cookie Secure，密钥仅服务端环境；数据库/Redis 不公开端口。补齐 app 公私 uploads 持久卷与写入权限，Nginx 仅直出公有目录。
- [ ] 沿用 `npm run build` → `postbuild` → `.next/standalone/server.js`，不得改回缺失静态资源的启动方式；构建后的 SW、public、`.next/static` 均在 standalone 与 Docker 镜像可读。
- [ ] 在已冻结业务时区每周日凌晨执行一次全量备份，具体时刻写入 cron（提案 02:00，冻结后落地）；加互斥锁避免重叠，失败返回非零、记录并通知负责运维的 BOSS。
- [ ] `mysqldump --single-transaction --routines --triggers --events --hex-blob` 导出 MySQL，禁止同期 DDL；在受控短维护窗口阻止新写入/媒体删除，保证数据库与公有、私有 uploads 为同一批次后恢复服务。
- [ ] 批次包含 DB、public uploads、private uploads、版本/迁移号/时区/文件清单/SHA-256；密码经权限受限配置传入，不进命令日志。含举报附件的备份加密，恢复凭据与备份分开保管。
- [ ] 本地保留最近 4 份成功完整批次，COS 至少保留最近 1 份完整可恢复批次；先上传并校验新批次，再轮换旧批次，上传失败保留旧 COS 备份及本地失败证据。
- [ ] 从 COS 实际下载，在隔离空数据库/空 uploads 恢复，验证行数、钱分/押金对账、图片与举报权限；重建缓存并使旧 Session 失效，检查 outbox/Push 任务不会无意重放历史通知。
- [ ] 记录备份/恢复时间、数据截止点、校验结果与实测恢复耗时；每周备份意味着最多约一周数据窗口，不能宣称零丢失。首次演练不允许直接覆盖生产数据库。

## 7. C8-T5：真实浏览器验收与发布门禁

**复用/修改：** `scripts/smoke-routes.mjs`、`tests/`、`docs/verification.md`；开发时使用现有 `/dev/compare` 与 `/dev/design-system`。
**拟新增：** `tests/e2e/{release,visual-regression}.spec.ts`、`docs/operations/release-acceptance.md`，截图按路由/视口/状态归档。
- [ ] 执行 `npm ci`、Prisma validate/generate、typecheck、lint、单元/集成/e2e、生产 build 和 HTTP smoke；真实 MySQL/Redis 验证不能由内存 mock 代替。
- [ ] 覆盖 360×800、390×844、430×932、600×960、820×1180、1024×768、1366×768、1440×900、1920×1080；以同设备/浏览器截图比较原稿和当前页面的布局、间距、颜色、字体与换行。
- [ ] 23 份迁移页面与新增业务路由均覆盖九视口默认态截图；源断点两侧、动态长内容和独有弹窗再专项检查，异常/空态按页面族记录覆盖映射，不能以一张首页截图代替全站验收。
- [ ] 实机 iOS Safari/主屏幕及 Android Chrome/安装后验证登录、安装、离线、Push；桌面 Chromium 与 Safari/WebKit/Firefox 验证核心业务和不支持能力的降级。
- [ ] 检查 hover/focus/active/disabled/loading/error/success、表单/空态、Tab/Esc/遮罩关闭与焦点恢复；横向溢出、点击遮挡、字号和弹窗几何差异修复后回归。
- [ ] 检查 JS/CSS/图标正确 MIME、响应体、TLS 跳转、静态缓存头、SW 更新头；生产 `/dev/design-system`、`/dev/compare`、`/dev/reference/*` 返回 404，私有附件不能公开直取。

## 8. HTTP 协议与可执行验证示例

拟新增 `POST /api/push/subscribe`，已登录且校验 Origin/CSRF 后接收浏览器原生订阅：
```http
POST /api/push/subscribe
Content-Type: application/json
Cookie: shisanwu_session=<隔离测试账号有效会话>
Origin: https://<测试域名>
X-CSRF-Token: <GET /api/auth/csrf 返回的 data.csrf_token>

{"endpoint":"https://<浏览器真实推送服务>/<实际端点>","keys":{"p256dh":"<真实公钥>","auth":"<真实认证密钥>"}}
```
订阅写入在数据库事务内按本人 endpoint 唯一键 upsert；投递状态用条件更新抢占，同键同事件只形成一个任务，不能仅靠 Redis 锁。成功 HTTP 200：`{"code":0,"message":"订阅已保存","data":{"id":"81"}}`；重复本人订阅返回同 ID。无登录 401/2xxx，非法字段 422/1xxx，跨账号端点冲突 409/3xxx，限流 429。拟新增 `POST /api/push/unsubscribe` 接收 `{"endpoint":"<本人端点>"}`，重复解绑仍返回成功且不能解绑他人。
拟新增 `GET /api/health`：就绪返回 HTTP 200、`{"code":0,"message":"ok","data":{"status":"ready"}}`；依赖失效返回 503/5xxx，不公开连接串、版本密钥或数据库细节。Nginx 原 `/healthz` 只证明代理存活，不能代替业务就绪。

下面是未来保存为拟新增 `tests/release-http.mjs` 的接口测试示例；先部署隔离生产构建、建立测试账号并登录取得 `SESSION_CUSTOMER_COOKIE`，设置 `BASE_URL`；在同源真实浏览器授权 Push 后把订阅 JSON 放入 `TEST_SUBSCRIPTION`。此刻只提供测试方案，未执行、未通过。
```js
import assert from 'node:assert/strict';
const base = process.env.BASE_URL, cookie = process.env.SESSION_CUSTOMER_COOKIE;
assert.ok(base && cookie && process.env.TEST_SUBSCRIPTION, '先准备测试环境和订阅');
const csrf = await fetch(`${base}/api/auth/csrf`, { headers: { cookie } });
assert.equal(csrf.status, 200);
const { data: { csrf_token } } = await csrf.json();
const headers = { 'content-type': 'application/json', cookie, origin: new URL(base).origin,
  'x-csrf-token': csrf_token };
const subscription = JSON.parse(process.env.TEST_SUBSCRIPTION);
const subscribe = () => fetch(`${base}/api/push/subscribe`, {
  method: 'POST', headers, body: JSON.stringify(subscription),
});
const first = await subscribe(), second = await subscribe();
assert.equal(first.status, 200); assert.equal(second.status, 200);
const a = await first.json(), b = await second.json();
assert.equal(a.code, 0); assert.equal(a.data.id, b.data.id);
assert.equal((await fetch(`${base}/api/health`)).status, 200);
for (const route of ['/dev/design-system', '/dev/compare', '/dev/reference/index.html'])
  assert.equal((await fetch(base + route)).status, 404);
assert.equal((await fetch(`${base}/api/push/subscribe`, {
  method: 'POST', headers: { 'content-type': 'application/json', origin: new URL(base).origin,
    'x-csrf-token': csrf_token },
  body: JSON.stringify(subscription),
})).status, 401);
```
所有写请求按 C1 共享协议同时校验 Origin 与 X-CSRF-Token；测试通过 `GET /api/auth/csrf` 取得 Token，不得为通过示例降低认证保护。接口测试不证明通知真的抵达或离线可用，仍执行浏览器与故障注入验收。

## 9. 验收、演示及发布/回退

| 编号 | 通过标准与证据 |
| --- | --- |
| AC-C8-01 | D08/D09/D12 已冻结；安装/启动/深链接/更新通过目标浏览器，manifest 图标与定稿一致 |
| AC-C8-02 | 全路由离线矩阵逐项通过，九视口证据齐；会员/财务/举报跨账号与过期授权无泄漏，离线写入零成功、联网无自动重放 |
| AC-C8-03 | 完整通知触发矩阵通过；只有三个指定事件 Push；拒绝权限正常使用小铃铛；重试/404/410/429/断队列/worker 重启均有证据 |
| AC-C8-04 | 每周日任务配置、4 份本地与 1 份 COS 保留已验证；从 COS 恢复 DB 和公私 uploads 后账务/权限/附件核验通过 |
| AC-C8-05 | 先前缺失的截图及真实交互验收已补齐；共享组件状态、原稿断点和所有正式路由不存在未关闭的阻塞缺陷 |
| AC-C8-06 | C1–C7 与本期验证全部通过；生产静态资源/SW/健康检查/开发入口 404 通过；发布前备份及版本回退在隔离环境演练成功 |

**期末演示：** 顾客预约→商家通过→小铃铛及 Push→安装并断网查看历史数据→尝试写入被阻止→登出换号无旧数据→真实恢复备份后逐笔对账。BOSS 单独演示举报权限与敏感离线策略，不在公开演示暴露个人资料。
**正式发布顺序：** 记录验收版本与制品哈希→完成发布前额外备份→受控维护窗口→执行经演练的前向兼容迁移→更新 app/worker/nginx→健康与业务 smoke→恢复写入→观察错误、队列积压、通知与账务指标。部署操作另按实际执行时的授权进行，本文不触发上线。
**阻塞条件：** 任一一期验收未过、D08/D09/D12 未冻结、账务不一致、越权/缓存泄露、资金重复写、恢复失败、原稿视觉缺口未关闭、产物静态资源或 TLS/PWA 不可用，均不得宣布完成一期上线。
**回退方案：** 优先停写/暂停 worker 并回到上一已验收镜像、配置及兼容 SW；保留当前 DB 和 outbox，不能删账或把已发通知当未发。破坏性迁移仅在事先演练且明确恢复点时按手册恢复 DB+公私 uploads，并核对备份后新增业务；不自动 reset 真库。恢复后强制重新登录并重建缓存，逐项确认资金、坑位和通知状态。
**交接：** 提交版本、部署/备份/恢复/回退手册、密钥保管位置与轮换步骤、全路由/浏览器证据、故障处理负责人及已关闭决策；不把凭据写入仓库或文档。

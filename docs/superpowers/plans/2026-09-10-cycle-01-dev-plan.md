# C1 开发方案（实施细化）

> 依据：[C1 计划](2026-09-09-cycle-01-foundation.md)（权威边界，本文只做实施细化，不改变其范围与验收）、[共享协议](2026-09-09-shared-contracts.md)、[决策清单](2026-09-09-decisions.md)、[AGENTS](../../../AGENTS.md)。
> 状态：待评审。执行时按 `superpowers:executing-plans` 以工作包推进，保存每包验收证据。

## 0. 现状核对结论（2026-09-10 实勘）

| 项 | 现状 | 对 C1 的影响 |
| --- | --- | --- |
| `src/app/api/` | **不存在**，23 页均为演示数据 | 全部端点为新建，无历史包袱 |
| `prisma/schema.prisma` | cuid 字符串 ID；枚举与源不符（场次 `SCHEDULED/COMPLETED`、报名 `PENDING/CONFIRMED`）；`MemberLevel.pointsThreshold`；User 缺 nickname/balance/total_topup；含 email 唯一 | 按源重建基础模型；旧模型仅作参考，不平行保留 |
| `src/lib/api/contracts.ts` | `/api/v1` + `{ok,error}`，含通用 `PATCH users` 可改 role/points/level | 统一改 `/api` + `{code,message,data}`；删除改账草约 |
| `package.json` | 无 argon2、无 Redis 客户端 | 需新增依赖（见 §2） |
| `docker-compose.yml` | `mysql:8.4` | **已定（2026-09-10）**：按需求方要求使用本机 MySQL **8.0.46**（服务 `MySQL80` 运行中）→ 镜像对齐 `mysql:8.0`；开发直连本机实例，`.env` 用 `127.0.0.1`，与源约定版本一致，无例外 |
| `tests/` | 仅 3 个单测（routes/booking/design-preview） | 新增 `tests/integration/`，与单测命令分离 |
| `.env.example` | 有基础项 | 补会话 TTL、限流参数、测试库/Redis 命名空间 |
| 后台 | `/admin` 已有 content/finance/ops/sessions 占位 + AntD 布局 | 本期只加 staff 模块与导航，不动其他页 |

## 1. 目标与边界（复述，不扩缩）

**目标**：真实账号（手机号+密码）、真实数据库、Redis 会话、集中 RBAC、敏感命令审计/幂等/事件 outbox，四件套作为后续全部周期的共用契约。
**不做**：充值/报名/内容 CRUD、支付、SaaS、验证码/第三方登录、代登录、密码找回（不阻塞本期）、未实现端点返回 404（不以空数据冒充完成）。

## 2. 前置动作（开工当天完成，半日）

1. **环境**：开发库在本机 `MySQL80`（8.0.46）新建独立 schema；Redis 用 compose `redis:7` 或本机实例（不得指向任何真实数据）；盘点目标库是否为空并记录；有数据则先备份、写迁移映射，禁止 reset/drop。
2. **决策冻结确认**（按 C1 前置要求，开工前抛给需求方，缺失结论时采用“建议值”并在文档标注）：
   - D11：**已冻结（2026-09-10）**——店长可创建/维护员工（目标限 DM，详见 §4.3）；余额/积分人工调整仍仅 BOSS；设置项逐键权限 C2 前按矩阵细化；
   - D10：UTC 存储 + `Asia/Shanghai` 显示（C1 只存储/传输 UTC ISO，显示转换不在本期）。
3. **依赖新增**（`package.json`）：
   - `@node-rs/argon2`（napi 预编译，Windows 开发机无需 node-gyp；参数走环境变量，默认 OWASP 推荐 argon2id m=19456,t=2,p=1，测试环境降级提速）；
   - `ioredis`（会话、限流、命名空间 `keyPrefix`）；
   - 不引入 zod 等校验库：C1 用小型手写校验器保持零新增方案面，C2 再评估。
4. **脚本新增**：`prisma:migrate`(deploy) / `prisma:seed` / `bootstrap:boss` / `dev:worker`(tsx watch outbox-worker) / `test:integration`（`node --import tsx --test tests/integration/*.test.ts`，加载 `.env.test`）。

## 3. 数据模型契约（T1 核心交付）

### 3.1 模型变更（Prisma，MySQL 8.0 / InnoDB / utf8mb4）

- **ID**：全部 `BigInt @id @default(autoincrement())`，wire 层一律十进制字符串（`Id = string`），禁止 `JSON.stringify` 直接输出 Prisma 行（BigInt 序列化）；金额 `Decimal(10,2)` 输出两位小数字符串；积分为整型；时间统一 UTC `DateTime`。
- **User**：`phone String @unique`（必填）、`nickname VarChar(80)`、`passwordHash VarChar(255)`、**删除 email 必填假设**（保留可空列与否由迁移映射定，新注册不写）、`balance Decimal(10,2) @default(0)`、`points Int @default(0)`、`totalTopup Decimal(10,2) @default(0)`、`role customer|dm|manager|boss`、`status active|disabled`、`memberLevelId` 关联。枚举统一改小写 snake（DB enum 存 `customer` 等值，与 wire 一致，免映射漂移）。**移除**：`email @unique`（源未要求，避免遗留歧义）。
- **MemberLevel**：`topupThreshold Decimal(10,2)` 替代 `pointsThreshold`；种子：见雾0 / 望遥500 / 栖月1500 / 书烬3000 / 云影6000（rank 1-5，code 固定）；`benefits Json?` 留空待 D07。
- **Dm**：一对一 `userId @unique`；本期仅建表与关系，展示资料 C2 扩展。
- **新增表（C1 固化）**：
  - `operation_logs`：actor_id/actor_role/action/target_type/target_id/summary_before/summary_after/ip/created_at（索引 actor_id+created_at、target）；
  - `idempotency_records`：`@@unique([actorId, operation, key])` + request_hash/status(pending|completed)/response_json/created_at/completed_at；
  - `event_outbox`：type/payload_json/status(pending|delivered|dead)/attempts/next_retry_at/created_at/delivered_at；
  - `notifications`：按源字段（user_id/type/title/body/read_at/created_at）**仅数据边界**，C3 才有消费 UI。
- **场次/报名/预约申请**：本期只在 `src/types/domain.ts` 与 contracts 中**声明契约**（场次 draft/open/full/locked/running/finished/cancelled；报名 joined/locked/finished/cancelled/jumped；申请 pending/approved/rejected），实体表随 C3 迁移；现有 Session/Booking/Script/Costume 草案表**保留不扩**，C2/C3 重建。
- **迁移策略**：开发库为空 → 单次 `foundation` 迁移建全新模型；旧草案表若无数据一并重建（记录于迁移说明）。seed：`member_levels` upsert 幂等（连跑两次无重复，AC-C1-01），不含任何账号或演示金额。

### 3.2 契约调整

`domain.ts` 与 `contracts.ts` 按源重写到 `/api` + `{code,message,data}`：成功 `code=0`；错误码 1xxx 参数 / 2xxx 认证权限 / 3xxx 业务 / 5xxx 服务端；HTTP 200/201/400/401/403/404/409/422/429/500。删除 `UpdateUserRequest` 中 role/points/memberLevelId/points 改账字段；`PATCH /api/me` 仅 `nickname` 等资料白名单。旧 `/api/v1` 类型直接替换，不保留并行（无人消费）。

## 4. 服务端架构与文件清单

### 4.1 模块与签名（与共享协议 §4 对齐）

```
src/server/db/prisma.ts        单例；启动缺 DATABASE_URL 即报明确错误退出
src/server/db/redis.ts         ioredis 单例 + keyPrefix（env REDIS_PREFIX，默认 ssw:，测试 ssw-test:）
src/server/auth/password.ts    hashPassword/verifyPassword（argon2id；参数 env 可配）

src/server/auth/session.ts     createSession/revokeSession/revokeUserSessions/requireActor
                               Redis: sess:{token} → {userId,role,csrfToken,createdAt}（TTL env）
                               索引 user_sessions:{uid} = Set(token)（吊销/禁用用）
src/server/auth/permissions.ts PERMISSIONS 集中注册表（role→permission 集，含未来 boss-only 预声明）
src/server/auth/authorize.ts   assertPermission(actor, permission, resource?) 抛 AuthorizationError

src/server/http/response.ts    ok(data,status)/fail(code,message,status) → NextResponse
src/server/http/errors.ts      ApiError 族（400/401/403/404/409/422/429）+ 统一 catch 映射
src/server/http/rate-limit.ts  Redis INCR+EXPIRE 窗口计数器
src/server/http/idempotency.ts withIdempotency：actor+operation+key 唯一（DB 约束，非进程 Map）
src/server/http/with-command.ts withCommand({permission?, idempotent?, csrf:true}, work) 组合：
                               统一错误、Actor、CSRF/Origin、幂等开闭、params 校验入口；**不含业务事务**
src/server/audit/log.ts        appendAudit(tx, input)（敏感字段黑名单：密码/Session/CSRF/举报正文）
src/server/events/types.ts     事件类型注册（C1: staff.created/staff.disabled/staff.role_changed）
src/server/events/outbox.ts    appendEvent(tx, event)（与业务同 tx）
src/server/events/dispatcher.ts派发到 channels（C1 仅 in-app notifications 入表）
src/server/notifications/service.ts 数据边界最小实现
src/worker/outbox-worker.ts    可启动进程：扫 pending → 派送 → 标记/退避重试（dead 阈值）；启动即扫未完成
scripts/bootstrap-boss.ts      交互式 CLI：stdin 隐式读密、argon2id、已有 boss 则拒绝再跑
```

会话 Cookie：`SESSION_COOKIE_NAME`，HttpOnly、生产 Secure、`SameSite=Lax`、Path=/；token ≥128bit 随机，只存 Redis，不落库不落日志。注销/禁用/改角色 → `revokeUserSessions`（删 token + user 索引集），**旧 Cookie 立即 401**（AC-C1-02/05）。

### 4.2 限流（T2）

`rl:login:ip:{ip}` 与 `rl:login:phone:{phone}` 双计数：仅失败尝试 INCR，键 TTL=600s（env 可配）；任一键 ≥5 次后第 6 次返回 429（统一错误文案，不区分账号存在性）；登录成功清零对应 phone 键。**独立测试两种计数**（AC-C1-03）。

### 4.3 集中权限表（T3，按 §2.2 + D11 冻结）

| permission | customer | dm | manager | boss |
| --- | --- | --- | --- | --- |
| `me:read/write`（本人） | ✓ | ✓ | ✓ | ✓ |
| `dm:profile:write`（仅本人 DM 资料，C2 启用） | – | ✓own | – | – |
| `staff:read` | – | – | ✓(仅DM) | ✓ |
| `staff:create/update/disable` | – | – | ✓(仅目标DM；禁创建店长/BOSS、禁改自身角色、禁操作BOSS) | ✓ |
| 预声明 boss-only（C4+ 实现时取用）：`finance:*`、`reports:read-pii`、`logs:read`、`lexicon:write`、`levels:write`、`settings:write` | | | | ✓ |

判定顺序：未登录 401 → 无权限 403 → 资源不存在/非本人 403 或 404（按接口语义，员工列表类对非 BOSS 一律 403 不试探存在性）。UI 菜单按权限渲染（admin layout 读 `/api/me`），但**每个 Route Handler 独立鉴权**。

### 4.4 幂等与事务边界（T4）

`withCommand({idempotent: operation})` 流程：`requireActor`+CSRF → 校验 `Idempotency-Key` → 开 MySQL tx：`INSERT idempotency_records(pending)`（撞唯一 → 取已有：同 hash 返回首次响应、异 hash 409、pending 且并发返回 409-conflict）→ 业务服务在**同一 tx** 内写业务 + `appendAudit` + `appendEvent` → 标记 completed 存响应摘要 → commit。tx 回滚则幂等记录、业务、审计、outbox **同归于尽**（AC-C1-07）。outbox-worker 异步派送，Redis/进程崩溃后重启扫描续投，不重复通知（派送与 read 标记分离，consumer 幂等）。

## 5. API 清单（本期新建；未建端点自然 404）

| 方法/路径 | 权限 | 说明 |
| --- | --- | --- |
| `POST /api/auth/register` | 匿名+同源JSON+限流 | 仅创建 customer；拒绝 body 传 role；201 |
| `POST /api/auth/login` | 匿名+同源JSON+双限流 | 成功 Set-Cookie；统一错误不泄露 |
| `POST /api/auth/logout` | 已登录+CSRF | 撤销当前会话 |
| `GET /api/auth/csrf` | **仅已登录**（匿名 401，理由见 §8.1 D-CSRF） | `data.csrf_token`，与会话绑定 |
| `GET /api/me` | 已登录 | 本人资料+等级+只读资金字段（balance/points/total_topup/level） |
| `PATCH /api/me` | 已登录+CSRF | 仅 nickname 白名单 |
| `GET /api/admin/staff` | `staff:read` | BOSS 见全部；店长仅见 DM；响应不含 password_hash 等 |
| `POST /api/admin/staff` | `staff:create`+幂等 | BOSS 可建 dm/manager；店长仅可建 dm；dm 同步建 Dm 档案；审计 |
| `PATCH /api/admin/staff/[id]` | `staff:update`+幂等 | 昵称/角色/禁用；店长仅可操作 DM（目标校验 403）；禁用或改角色即吊销其全部会话；审计 |
| （现有 23 页对应 GET 查询） | — | C2 起逐周期接入，本期不实现 |

**页面改造**（复用优先）：`AuthPage.tsx` 切真实 register/login（保留共享表单/错误态/Toast、防重复提交、成功回跳）；`MePage.tsx` 接 `/api/me` 读显与 nickname 编辑（用现有 Field）；`admin/layout.tsx` 按 actor 渲染导航；新增 `StaffPage.tsx`（复用 admin 表格/表单范式）；`/dev` 预览不受影响。

## 6. 工作包执行序列（与验收映射）

> 每包收尾均跑 `typecheck`/`lint`/`test`/`build`；小步提交；证据（命令输出、迁移版本）存档。

| 序 | 工作包 | 步骤级拆解 | 里程碑验收 |
| --- | --- | --- | --- |
| W0 | 前置 | §2.1–2.4（环境、盘点、依赖、脚本、compose MySQL 8.0、.env*.example） | compose 起停可重复；缺配置启动报明确错误 |
| W1 | T1 数据基础 | 重建 schema→`foundation` 迁移→seed（五级 upsert）→prisma/redis 单例→契约重写（domain/contracts） | AC-C1-01（seed×2 五级精确）；手机号唯一；`"0.10"` 与 BIGINT 字符串往返无损 |
| W2 | T2 账号会话 | password/session/response/errors/rate-limit→auth 四个 route→/api/me→AuthPage/MePage 接入 | AC-C1-02、03、06（CSRF/Origin）；响应无哈希/Session |
| W3 | T3 权限员工 | permissions/authorize→bootstrap-boss→staff service/routes→admin 导航+StaffPage | AC-C1-04、05 + §5只读脚本（401/403/200、无 password_hash） |
| W4 | T4 审计幂等事件 | operation_logs/idempotency/outbox 迁移→audit/events/notifications→withCommand 装配→staff 命令接入→outbox-worker | AC-C1-07；事务失败三方同滚；队列恢复不重投；日志无敏感串 |
| W5 | 期末 | 集成测试补齐、演示脚本走查（§8 演示顺序）、回退预案、向 C2 交接清单 | AC-C1-01~07 全绿；文档归档 |

**集成测试**（`tests/integration/`，`.env.test` 独立库 + `ssw-test:` 前缀，启动自检隔离）：
`foundation.test.ts`(W1) / `auth.test.ts`(W2：注册/登录/限流×2/CSRF/me) / `permissions.test.ts`(W3：越权矩阵、禁用吊销) / `command-boundary.test.ts`(W4：重放/409/回滚/恢复)。
**用例-AC 映射**直接以名为 `AC_C1_0x` 的 test 命名，演示时一一对应。

## 7. 安全红线自查（对应 Global Constraints，每次提交过一遍）

- [ ] 密码仅 argon2id 哈希；任何响应/日志不含哈希、token、CSRF
- [ ] 注册忽略 body.role；`/api/me` PATCH 忽略 role/余额/积分/累计储值
- [ ] 员工接口仅 BOSS/店长（店长目标限 DM，越权 403）；无代登录入口/接口/内部捷径；页面隐藏不是授权
- [ ] 登录双限流 5/10min；统一错误文案
- [ ] Cookie HttpOnly/生产 Secure/SameSite；过期与注销后旧 Cookie 拒绝
- [ ] 写请求（Cookie 鉴权）校验 Origin + 会话绑定 CSRF
- [ ] 生产与测试密钥/库不共用；仓库无真实口令（bootstrap 隐式输入）

## 8. 风险与对策

| 风险 | 对策 |
| --- | --- |
| argon2 原生编译失败（Win 开发机） | 用 `@node-rs/argon2` 预编译；CI/容器一致 |
| BigInt 序列化漏网（500 on JSON.stringify） | 所有 route 经 wire mapper；`response.ts` 统一出口加 BigInt 防御性 replacer（开发期告警） |
| compose `mysql:8.4`→`8.0` 变更遗忘 | W0 即改镜像并跑一次迁移冒烟；如需求方要求 8.4，回写设计文档例外说明 |
| 旧 23 页演示数据被误当真实 | C1 不接业务数据；端点 404；`/dev` 对照保持只读 |
| 会话吊销遗漏（改角色/禁用） | 集中 `revokeUserSessions`，在 staff service 与 me PATCH 中强制调用点评审 |
| 幂等表膨胀 | 记录保留策略留待 C7/C8 运维化，本期仅索引与字段 |

## 8.1 决策记录（2026-09-10）

**D-CSRF｜匿名态 `GET /api/auth/csrf` = 401，不向匿名访客签发令牌。**

- 已登录写请求：双校验——同源 Origin + 会话绑定的 `X-CSRF-Token`；
- 匿名写请求（register/login）：不依赖 CSRF 令牌，改为 ①同源校验（`Origin` 与 `Host` 一致；有 `Sec-Fetch-Site` 时拒绝 `cross-site`）②强制 `Content-Type: application/json` ③既有双轨限流（IP/手机号 5次/10分钟）；**登录/注册成功即轮换会话令牌**防会话固定；
- 理由：CSRF 的放大器是"浏览器自动携带已登录 Cookie"——匿名端点没有已授权身份可冒用，残余风险仅是登录 CSRF（把受害者登入攻击者账号），已由 SameSite=Lax Cookie、同源校验与会话轮换覆盖；给每个匿名访客签发可写"预会话"会放大 Redis 写入面、引入匿名会话与令牌固定的管理复杂度，安全收益不抵成本；且"令牌永远只绑定它所保护的会话"是更小、更好测的契约。

**D-DB｜MySQL = 8.0（本机 8.0.46 / 服务 `MySQL80`）**：按需求方要求使用本机版本，compose 镜像对齐 `mysql:8.0`，与源约定天然一致。

**D-STAFF｜员工资源范围（D11 冻结）**：店长可创建/维护员工，目标限 DM；不得创建店长/BOSS、不得变更自身角色、不得操作 BOSS；越权 403；禁用/改角色一律吊销目标全部会话。

## 9. 交接与回退

- 向 C2：可用账号体系、DM 身份、上传鉴权边界雏形（requireActor/权限表）、五级与只读资金字段。
- 向全部周期：统一 `{code,message,data}`、Actor/withCommand/幂等/审计/事件协议、测试环境。
- 回退：应用可回滚；DB 只向前走已审查修复，不 reset；会话协议变更则全量失效旧会话。

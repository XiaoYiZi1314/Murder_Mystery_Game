# C1｜基线纠偏、数据基础、账号权限与审计开发计划

> **For agentic workers:** 实施本计划时使用 `superpowers:subagent-driven-development` 或 `superpowers:executing-plans`，按工作包推进并保留验收证据。

**Goal:** 把前端演示工程变成具备真实账号、数据库、会话和集中权限的可运行基础，使后续业务共用同一套契约。

**Architecture:** 保留现有 App Router 与组件体系，新增服务端 db/auth/http/audit/events 模块。权限、员工敏感操作留痕、提交后事件从第一期建立；业务表与服务按后续归属周期逐步增加。

**Tech Stack:** 现有 Next.js 16 / React / TypeScript strict；Prisma + MySQL 8.0、Redis 7；argon2id；已有 Node test/tsx 工具链。

**Spec:** [设计文档](../../设计文档.md) §1、§2、§6、§7.1/7.4、§8、§10；[共享协议](2026-09-09-shared-contracts.md)；[AGENTS](../../../AGENTS.md)。

## Global Constraints

- “不做支付”“不做 SaaS”；初期手机号 + 密码，不引入验证码、微信登录或第三方认证平台。
- “明确禁止『BOSS 登录顾客账号』功能”；“全站 RBAC 中间件，B 端接口逐个校验角色”。
- “密码 argon2id 哈希；登录接口限流（Redis 计数，同 IP/同手机号 5 次/10 分钟）”。
- 开发页面必须优先复用已有组件，优先通过 props、variant、className 扩展，只有不能满足需求才新增。

## 1. 前置、现状与本期边界

现有23页、UI组件、部署文件、Prisma及API草案可复用；认证、真实数据库及权限尚未接入。7项前端单测和页面HTTP检查不是本期业务验收。

前置：在独立开发环境准备 MySQL/Redis连接，记录现有数据及备份状态；对照[决策D11](2026-09-09-decisions.md)冻结设置权限和员工资源范围，严格按源已确认角色矩阵开发，不以未要求的密码找回功能阻塞本期。

本期不实现充值、报名或内容CRUD；不迁入原稿中的虚构余额、顾客、真实账号密码。后续周期的受保护端点尚未实现时仍返回404，不用空数据伪造“已完成”。

## 2. 输入与输出

| 输入 | 输出及消费者 |
| --- | --- |
| 现有 `src/types/domain.ts`、`src/lib/api/contracts.ts` | 按源统一的ID、响应、角色、各业务状态约定，供全部周期使用 |
| 原设计users/member_levels/dms角色关系 | 可迁移的基础表与五级种子，C2扩DM展示，C5实现账务和规则配置 |
| MySQL/Redis配置 | db客户端、会话命名空间、可重复启动与健康检查 |
| 集中角色矩阵 | Actor、requireActor、assertPermission、withCommand；每个后续命令显式接入 |
| 事务与事件约定 | appendAudit、appendEvent及outbox分发边界；C3接入首批业务通知 |

所有拟新增文件均为项目根相对路径，服务签名及幂等协议以[共享协议](2026-09-09-shared-contracts.md)为准。

## 3. C1-T1｜纠正模型、API与可重复开发环境

**修改已有：** `prisma/schema.prisma`、`src/types/domain.ts`、`src/lib/api/contracts.ts`、`.env.example`、`docker-compose.yml`、`package.json`。
**拟新增：** `prisma/migrations/<timestamp>_foundation/migration.sql`、`prisma/seed.ts`、`src/server/db/prisma.ts`、`src/server/db/redis.ts`、`tests/integration/foundation.test.ts`。

- [ ] 盘点并记录数据库是否为空；存在用户数据时制定ID/字段迁移映射和校验，不删除重置。落实MySQL 8.0、InnoDB、utf8mb4，锁定BIGINT→JSON字符串、Decimal金额和UTC时间约定；业务显示时区按D10前置冻结。
- [ ] 基础用户补手机号唯一、nickname、balance、points、total_topup、role/status；member_levels用topup_threshold替代pointsThreshold；建立DM账号一对一关系。
- [ ] 五级种子：见雾0、望遥500、栖月1500、书烬3000、云影6000；充值前用户金额/积分为零。等级权益内容见D07，本期不把示例折扣当正式规则。
- [ ] 把场次/报名/预约申请的状态契约分别声明；实体和迁移按C3–C5补齐，不把pending报名冒充自主预约申请。
- [ ] API草约统一 `/api` 与 `{code,message,data}`；移除通用用户PATCH可直接改points/role/level的方案，改由后续专用命令承担。
- [ ] 增加真实测试数据库/Redis命名空间配置、迁移和种子命令；为后续集成测试增加脚本（使用现有Node test/tsx），生产与测试密钥不共用。

**验收：** 干净开发库可迁移/seed两次且五级无重复；手机号唯一约束生效；大整数ID和`"0.10"`能无损往返；启动失败明确指出缺失配置；不含生产默认账号或密钥。

## 4. C1-T2｜真实注册、登录、会话与个人资料

**拟新增：** `src/server/auth/{password,session}.ts`、`src/server/http/{response,errors,with-command}.ts`；`src/app/api/auth/{register,login,logout,csrf}/route.ts`；`src/app/api/me/route.ts`；`tests/integration/auth.test.ts`。
**修改已有：** `src/features/member/AuthPage.tsx`、`src/features/member/MePage.tsx`，复用已有表单、错误态和Toast。

- [ ] 注册只创建customer；手机号/昵称/密码服务端校验，不能通过body传role升级；密码仅存argon2id哈希。
- [ ] 登录按同IP与同手机号两条计数分别限制5次/10分钟；返回统一错误，不泄露哈希、Session ID等内部信息。
- [ ] Redis存会话，Cookie HttpOnly、生产Secure、SameSite；会话期限通过明确配置控制，过期与注销后拒绝旧Cookie。
- [ ] 增加GET CSRF令牌端点，已登录写请求校验Origin和会话绑定令牌；注册/登录要求可信同源JSON请求。
- [ ] `/api/me`返回本人资料、等级及资金积分只读字段；修改本人昵称等资料不允许改role、余额、累计储值、积分。
- [ ] 登录/注册页面切真实请求；加载、错误、重复提交、成功跳转保持共享组件和原视觉。顾客可修改个人资料的入口在/me组合现有Field，不能只实现登录。

**拟定API示例：** `POST /api/auth/register` body `{"phone":"13800000001","password":"test-only-password","nickname":"测试顾客"}`；成功201、`code=0`，响应不含密码哈希。`POST /api/auth/login`设置Cookie；`POST /api/auth/logout`撤销会话；`PATCH /api/me`只接受个人资料白名单字段。

## 5. C1-T3｜集中权限与BOSS受控员工管理

**拟新增：** `src/server/auth/{permissions,authorize}.ts`、`scripts/bootstrap-boss.ts`、`src/server/staff/service.ts`、`src/app/api/admin/staff/route.ts`、`src/app/api/admin/staff/[id]/route.ts`、`src/app/admin/staff/page.tsx`、`src/features/admin/staff/StaffPage.tsx`、`tests/integration/permissions.test.ts`。
**修改已有：** `src/app/admin/layout.tsx`、`src/features/admin/admin-shared.tsx`；保留旧后台入口并扩展导航。

- [ ] 将§2.2每项权限落成集中表；role为customer/dm/manager/boss，不把“有/admin页面”当授权。
- [ ] 创建BOSS使用受控CLI、显式秘密输入与单次初始化保护，无默认生产口令；员工API只允许BOSS创建/维护DM与店长，不开放代登录或任意顾客提权。
- [ ] 员工账号同步关联DM身份；DM仍有自己的顾客账户，禁用或变更角色要吊销相关Session。
- [ ] 所有者规则落在服务端：DM只能编辑自己的展示资料；其他资源按矩阵与D11冻结范围执行。未来财务/举报/日志/词库/等级等能力预先声明仅BOSS。
- [ ] UI菜单按权限呈现，同时逐接口鉴权；未登录401、越权403、不存在资源404，不能靠页面跳转隐藏接口。

**验收：** 顾客不能构造员工请求；DM/店长不能创建员工；BOSS可创建DM/店长；被禁用员工的旧Cookie失效；不存在代登录入口/接口/内部服务捷径。

## 6. C1-T4｜敏感命令审计、幂等与事件基础

**拟新增：** `src/server/audit/log.ts`、`src/server/events/{types,outbox,dispatcher}.ts`、`src/worker/outbox-worker.ts`、`src/server/notifications/service.ts`、`src/server/http/idempotency.ts`、`tests/integration/command-boundary.test.ts`；迁移包含operation_logs和建议的idempotency_records/event_outbox，notifications按源定义。

- [ ] withCommand提供actor/权限/参数/CSRF/统一错误上下文，业务服务负责MySQL事务；appendAudit和appendEvent使用同一个tx。
- [ ] 员工敏感动作记录操作人、动作、对象、前后摘要、时间和可信IP；顾客操作不记员工日志，机密及举报正文不进普通日志。
- [ ] actor+operation+Idempotency-Key唯一，同payload返回首次结果，异payload409；并发时由数据库唯一约束保证一次，不仅靠进程内Map。
- [ ] outbox提交后幂等分发，Redis故障可恢复重试；回滚事务不发通知。提供可实际启动的outbox-worker及本地运行/退出命令，启动时扫描未完成记录，不能只定义无人消费的函数。C1验证基础机制，C3同时运行消费者并交付业务通知UI，C8增加Push和生产运维配置。
- [ ] 用员工创建/禁用等本期真实命令串联审计；未来资金/占坑服务必须自行补业务唯一键，不能误以为框架已覆盖所有并发。

**验收：** 人为制造事务失败，业务/日志/outbox均不落成功记录；同键两次请求只有一次员工敏感变更与事件；队列短暂中断恢复后不重复通知；日志中找不到密码、Cookie或CSRF令牌。

## 7. 具体验收与测试样例

| 编号 | 前置/操作 | 预期 |
| --- | --- | --- |
| AC-C1-01 | 新测试库迁移、连续seed两次 | 五级精确为0/500/1500/3000/6000，无重复 |
| AC-C1-02 | 账号A登录、退出后拿旧Cookie访问/me | 退出前200，退出后401 |
| AC-C1-03 | 同IP或同手机号第6次受限登录；独立验证两种计数 | 429；窗口重置按测试时间配置恢复 |
| AC-C1-04 | 顾客伪造role/points，DM请求员工管理 | 不发生提权/改账，返回校验错误或403 |
| AC-C1-05 | 登录员工被BOSS禁用后继续写操作 | 旧Session不可再使用 |
| AC-C1-06 | 跨Origin/无CSRF令牌提交已登录写操作 | 403且无数据写入 |
| AC-C1-07 | 同键同请求/不同payload/数据库回滚 | 重放幂等、冲突409、回滚无成功事件 |

下面是本期完成后可执行的只读权限检查，不代表现在已存在真实接口。先在独立测试环境创建并登录顾客/BOSS，将完整Cookie分别放入指定变量，然后运行 `node --input-type=module` 输入：

```js
import assert from 'node:assert/strict';
const base = process.env.BASE_URL ?? 'http://localhost:3000';
for (const name of ['SESSION_CUSTOMER_COOKIE', 'SESSION_BOSS_COOKIE']) assert.ok(process.env[name], name);
assert.equal((await fetch(`${base}/api/me`)).status, 401);
assert.equal((await fetch(`${base}/api/admin/staff`, {headers:{Cookie:process.env.SESSION_CUSTOMER_COOKIE}})).status, 403);
const response = await fetch(`${base}/api/admin/staff`, {headers:{Cookie:process.env.SESSION_BOSS_COOKIE}});
assert.equal(response.status, 200);
const body = await response.json();
assert.equal(body.code, 0);
assert.ok(!JSON.stringify(body).includes('password_hash'));
```

## 8. 期末演示、交接与回退

演示顺序：迁移→初始化BOSS→注册顾客→真实登录/注销→BOSS创建DM→DM使用顾客身份及员工入口→越权被拒绝→禁用后Session失效→展示审计和事务失败证据。

- [ ] TypeScript、ESLint、已有前端测试与生产构建继续通过；本期真实集成测试通过；保存迁移版本、权限矩阵、API契约与测试输出。
- [ ] 向C2交付可用的账号、DM身份、上传鉴权边界；向所有后期交付统一错误、Actor、幂等、审计、事件协议和测试环境。
- [ ] 回退应用版本前检查数据库兼容；有真实数据只走已审查的向前修复/恢复方案，不重置数据库。会话协议变化时统一失效旧会话，不能让旧权限继续生效。

**退出门槛：** AC-C1-01～07全部通过，权限与数据契约已冻结，未把演示数据当真实记录；随后进入[周期C2](2026-09-09-cycle-02-content-media.md)。

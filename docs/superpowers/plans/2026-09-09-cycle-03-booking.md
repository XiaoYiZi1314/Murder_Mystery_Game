# C3 场次、预约与站内通知开发计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐工作包执行，使用复选框记录结果。本周期与 C4 合成预约履约闭环，不能提前宣称押金和锁车完成。

**Goal:** 交付商家排期、散客/团队占坑、自主预约审核、未锁车取消及站内小铃铛，保证并发不超报、重复请求不重建场次。

**Architecture:** 场次、报名单、自主预约申请分表并集中执行状态转换；坑位和报名写入在 MySQL 同事务内完成。提交时写 outbox，提交后失效 Redis 拼车缓存并派发去重的站内通知，通知失败可补偿且不回滚已提交报名。

**Tech Stack:** 当前 Next.js App Router、Prisma / MySQL 8.0、Redis 7、React Query、Ant Design、既有 C 端设计系统。

**Spec:** [设计文档](../../设计文档.md) §2.2、§3.1、§4.2/4.6、§5.1–5.2、§6.2–6.3、§7.2–7.3、§8.3、§10.3；[共享契约](2026-09-09-shared-contracts.md)；[决策记录](2026-09-09-decisions.md)。

## Global Constraints

- 「场次一场一本、可配主 DM 与备选 DM。」
- 「报名替全队占坑；散客拼车展示还差人数。」
- 「未锁车可自由取消，跳车不退押金；押金退款留痕对账。」
- 「不做支付、不做超时自动取消；『已确认/锁车』为商家手动操作。」
- 「bookings.player_count 与 sessions.booked_count 在同事务内更新，报名时校验 booked_count + n <= player_max。」
- 「站内通知。触发点」包含自主预约审核、新报名和人数达标；小铃铛在 C3 开始形成真实闭环。
- 遵守 `AGENTS.md` 组件复用和共享契约：`/api`、snake_case、十进制字符串 ID/金额、服务端鉴权、事务审计；满员不等于锁车，结束不等于结算。

## 周期边界与交付物

**实施前基线：** `src/features/booking/{sessions-page,booking-page,validation}.tsx/ts`、`src/features/admin/admin-sessions.tsx` 和 `/me/booking` 已有原稿界面，当前报名和场次变化仍为客户端演示状态，小铃铛为提示。

**前置：** C1 身份/RBAC/审计/幂等命令/outbox 基础验收；C2 内容 ID、上架状态、价格与 DM 可选项可查询；通知 recipients 只能由服务端权限计算。

**已冻结（2026-09-13）：** D01 审批通过自动为申请人生成 N 人 `joined` 报名，同事务占坑；无效联系人/容量整体回滚。D10 使用 UTC 存储、Asia/Shanghai 展示、周一起周。下述编辑保护矩阵已获需求方确认。

**输入：** Actor、有效剧本/DM、用户联系方式、期望时间/人数、主备 DM 与价格；C1 `requireActor()`、`assertPermission(...)`、`withCommand(...)`、`appendAudit(tx, input)`、`appendEvent(tx, event)`。

**输出：** 排期管理、拼车大厅、申请审核、我的预约、报名单列表、通知列表/未读/已读；持久化数据、事件及并发测试证据。

**本期不含：** 押金、免押金、锁车、跳车、开本/结束由 C4 实现；金额结算由 C5 实现；Web Push 由 C8 实现。已触发押金/锁车的记录不能走本期未锁车取消路径。

## 表、状态与接口

| 对象 | 约束与输出 |
| --- | --- |
| `sessions` | 源状态完整保留 `draft/open/full/locked/running/finished/cancelled`；本期按下述矩阵编辑草稿/未锁车场次，支持开放报名、容量驱动 full/open、未涉押金场次取消 |
| 场次字段 | `script_id,primary_dm_id,start_time,player_min,player_max,booked_count,price,source,initiator_user_id,remark`；主 DM 单选、备选多选去重，主 DM 不重复出现在备选集合 |
| `session_backup_dms` | 场次/DM 联合唯一；允许的 DM 来自 C2 有效员工与可带剧本关系；关联写入与场次保存同事务 |
| `bookings` | `joined/locked/finished/cancelled/jumped`；整数 `player_count>0`、联系人/手机号、取消时间；不使用 pending 表示待审核申请 |
| `booking_requests`（拟新增） | 独立 `pending/approved/rejected`，申请人/剧本/期望时间/人数/备注、审核人/时间/结果原因、生成的 `session_id`；一申请最多一个生成场次 |
| `notifications` | 仅按当前 actor 查询和已读；`event.id + recipient` 唯一去重；不在公开场次或通知载荷中扩散联系人手机号 |
| 索引/计数 | `sessions(start_time,status)`、`bookings(session_id,status)`、申请状态/创建时间；C3 固定 joined 占坑、cancelled 释放且只释放一次；jumped 是否占位、是否重新招人由 C4 在 D02/D03 冻结，不能预先从计数排除 |

| API（拟新增） | 权限、参数与失败语义 |
| --- | --- |
| `GET /api/sessions?status=open&from=&to=&script_id=` | 公开；显示已报/上限/还差人数，完整大厅可请求 open/full；返回公开字段，禁止附报名人列表 |
| `GET,POST /api/admin/sessions`、`PATCH /api/admin/sessions/:id` | DM/manager/boss；按范围查列表，可建草稿或直接 open；仅接受本期合法状态，冲突 409，不可通过任意 PATCH 绕过 C4 |
| `POST /api/sessions/:id/bookings` | 所有已登录角色均可报名；`{player_count,contact:{name,phone}}`，带 `Idempotency-Key`，容量不足/状态冲突 409 |
| `DELETE /api/bookings/:id` | 本人取消未锁车 `joined` 单；他人操作 403，已锁车 409；同一取消重试返回原结果，不重复减坑 |
| `POST /api/booking-requests` | 登录；`{script_id,expected_time,player_count,remark}`；带幂等键，校验未来时间/剧本可见/人数为正且不越剧本上限 |
| `GET /api/admin/sessions/pending`、`POST /api/admin/booking-requests/:id/approve` 或 `/reject` | DM/manager/boss；审批带幂等键、条件 `status=pending`；重复同请求回原结果，不同决策竞争 409 |
| `GET /api/me/bookings`、`GET /api/me/booking-requests`、`GET /api/admin/bookings` | 前两项仅本人，第三项员工且按 D11 数据范围；支持状态/分页；顾客 UI 合并两类条目但保留实体类型 |
| `GET /api/notifications`、`POST /api/notifications/read` | 登录；列表含 `items,unread_count`；已读 body `{ids:["..."]}`；列表与变更都限定本人，重复已读无副作用 |

审批通过 body 为 `{primary_dm_id,backup_dm_ids,start_time,player_min,player_max,price}`，拒绝为 `{reason}`；ID/价格为字符串，日期为带时区 ISO 8601；同一请求的剧本沿用申请记录，时间须与已确认申请一致，不能静默替换顾客选择。

**场次编辑矩阵（实施保护提案，C3-T1 评审冻结；源要求场次可编辑，但未逐字段规定边界）：** 所有编辑均受服务端权限、版本条件和审计约束，`booked_count/source/initiator_user_id` 不可作为普通表单字段直接修改。

| 状态/人数 | 本期可编辑字段与拒绝条件 |
| --- | --- |
| draft，或 open 且 booked_count=0 | 剧本、主备 DM、时间、人数上下限、价格、备注；仍须有效关联、人数区间和未来时间校验 |
| open/full 且 booked_count>0 | 备注与人数上限；上限不得低于 booked_count 或 player_min，变更后按实际容量计算 open/full；剧本/主备 DM/时间/价格/人数下限等承诺字段修改返回 409，防止静默改变已报名条件 |
| locked/running/finished/cancelled | C3 普通编辑返回 409；锁车后管理及履约动作由 C4 的状态机和冻结政策定义，不能借通用 PATCH 执行 |

## C3-T1：场次管理与状态边界

**文件：** 修改 `prisma/schema.prisma`、`src/lib/api/contracts.ts`、`src/types/domain.ts`、`src/features/admin/admin-sessions.tsx`；拟新增 `src/server/sessions/{service,state-machine,queries,validation}.ts`、`src/app/api/admin/sessions/route.ts`、`src/app/api/admin/sessions/[id]/route.ts`、`tests/integration/sessions.test.ts`。

**输入/输出：** 消费 C1 Actor 与 C2 内容查询；拟输出 `createSession(actor,input)`、`updateSession(actor,id,input)`、`listPublicSessions(query)`。场次 DTO 统一 `booked_count,player_max,remaining_count,status,price`，C4 继续扩展同一状态机。

- [x] 测试已覆盖：customer 创建 403、DM 可创建、一场一本、主备 DM 重复/无效关系 422、最小人数大于最大人数 422、默认价格复制和显式覆盖。
- [x] 用迁移修正原 `SCHEDULED/COMPLETED` 等演示枚举，保留 C4 全部状态；写明旧数据映射并在测试库独立表命名空间验证，不直接假定现有记录可丢弃。
- [x] 创建支持 draft/open；按编辑矩阵分别测试允许和拒绝：已报名场次合法改备注/人数上限成功，上限低于 booked_count 或变更承诺字段 409；并发报名与改上限必须在同一数据库条件下重新核验容量。
- [x] 状态/关系写与 `appendAudit`、相关 `appendEvent` 同事务；取消仅本期 open/full/draft 且无押金状态，批量取消 joined 单并一次释放坑位，C4 接管有押金和开本后路径。
- [x] 验证不允许自动锁车、定时取消、直接跳 finished；后台显示真实权限和服务端冲突，提交可独立审查的场次管理变更。

## C3-T2：原子团队报名与取消

**文件：** 拟新增 `src/server/bookings/{service,validation,queries}.ts`、`src/app/api/sessions/[id]/bookings/route.ts`、`src/app/api/bookings/[id]/route.ts`、`tests/integration/booking-concurrency.test.ts`；扩展既有 `src/features/booking/validation.ts`。

**输入/输出：** 消费 actor、场次行与 C1 幂等协议；拟输出 `joinSession(actor, sessionId, input, commandContext)`、`cancelBooking(actor, bookingId, commandContext)`，均返回持久化报名和最新容量 DTO。

- [x] 写并发测试：剩余 3 坑时两个不同账号各报 2 人，仅一个成功；确认失败可由 409 明确解释，最终计数与订单人数一致。
- [x] 在同一事务内以条件更新或行锁完成 `booked_count+n<=player_max` 检查、报名创建和计数递增；Redis 锁、客户端校验和 disabled 不能代替数据库约束。
- [x] 幂等唯一键为 actor+operation+key，同键同 payload 回原报名，不同 payload 409；新建报名只接受服务端读取到的可报名状态和当前容量。
- [x] 本人取消以 `status=joined` 条件更新为 cancelled，同事务减坑；full 释放后转 open；取消与报名/商家取消并发必须产生单一合法结果，已取消重试不再扣人数。
- [x] 报名/取消成功提交后主动失效大厅缓存；数据库提交后 Redis 故障不返回误导性业务失败，读缓存失败回源，失效事件可重试；核验过期缓存不参与容量决策。

## C3-T3：自主预约审核与我的预约

**文件：** 拟新增 `src/server/booking-requests/{service,validation}.ts`、`src/app/api/booking-requests/route.ts`、`src/app/api/admin/booking-requests/[id]/{approve,reject}/route.ts`、`src/app/admin/sessions/pending/page.tsx`、`src/features/admin/booking-requests.tsx`、`tests/integration/booking-requests.test.ts`；修改 `src/features/booking/booking-page.tsx` 与 `src/app/(customer)/me/booking/page.tsx`。

**输入/输出：** 输入申请和冻结后的 D01；拟输出 `submitBookingRequest(actor,input,context)`、`reviewBookingRequest(actor,id,decision,input,context)`；通过结果必有唯一 `session_id`，D01 决定是否同时返回 `booking_id`。

- [x] 先覆盖申请提交/重复、非法时间与人数、非员工审批、两个员工同时通过、通过与拒绝竞争；断言只生成一个场次且审核结论不可被覆盖。
- [x] 审核通过由员工核对申请剧本/时间并确认主备 DM、人数上下限和价格；锁定 pending 申请，在单事务内创建 `source=customer` 的 open 场次、记录 initiator 和审批结果。
- [x] 按已冻结 D01 实现同事务自动报名；自动报名需要人数仍合法和服务端用户联系人快照，否则 422 并保持 pending，不能创建半成品；达到上限时依容量规则显示 full。
- [x] 拒绝记录原因和审核人，不创建场次；`/me/booking` 分别读取 request 与 booking，展示待审核/已报名/已锁车/已完成/已取消/跳车，并避免把 approved 申请重复计作另一单报名。
- [x] 保留 `/admin/sessions` 聚合入口并链接 `/admin/sessions/pending`、`/admin/bookings`；取消操作复用 T2；锁车/履约按钮等到 C4 服务接通后启用，不能继续展示假成功。

## C3-T4：小铃铛与提交后通知

**文件：** 扩展 C1 `src/server/events/{types,outbox,dispatcher}.ts`、`src/server/notifications/service.ts`、C1 拟新增的 `src/worker/outbox-worker.ts`；拟新增 `src/app/api/notifications/route.ts`、`src/app/api/notifications/read/route.ts`、`src/features/notifications/{notification-bell,notification-list}.tsx`、`tests/integration/notifications.test.ts`；复用 `src/components/layout/SiteHeader.tsx`、`src/features/member/components.tsx`、`src/features/booking/customer-header.tsx`、`src/features/admin/admin-shared.tsx`。

**输入/输出：** 统一 `DbEvent {id,type,occurredAt,actorUserId,subjectType,subjectId,recipientUserIds,payload}`；输出持久化通知、本人未读数/已读，以及可供 C4–C8 扩展的事件派发接口。

- [x] `booking_request.created` 发给有审核权限的员工；`booking_request.approved/rejected` 发申请人；`booking.joined` 发可见场次的员工；`booking.cancelled` 更新相关员工待办；`session.cancelled` 发受影响报名账号。
- [x] `session.capacity_reached` 在人数跨越场次 player_min 时发员工“人数达标”提示，携带当前/最小/最大人数；只是提示而非锁车授权，C4 按 D02 校验真正锁车条件，容量满时显示 full。
- [x] 业务与 outbox 同事务；dispatcher 用 `event.id+recipient` 唯一键写 notifications 并入 Redis，重复消费不重发；进程在任一步骤退出后能重试，不因 Redis 暂时失败永久丢事件。
- [x] C3 必须启动真实消费者：在加载测试/开发环境后运行 `node --import tsx src/worker/outbox-worker.ts`，持续领取未处理 outbox、调用 dispatcher、记录重试及处理结果；C1 提供可运行入口，C3 接入本期事件并验证进程重启可继续消费，不能依赖手工调用 dispatcher 或等待 C8。
- [x] 只返回本人通知；ids 包含他人通知时 403 且不部分更新；多设备重复已读不产生新通知；列表空态/加载/错误、未读数和点击跳转复用实际 Button/Card/导航组件。
- [x] 在实际运行消费者时提交预约，轮询通知接口验证自动送达；再用重启/重复投递/Redis 断开测试核对事件数、通知数与幂等结果；本期不弹浏览器 Push 授权框，C8 只将现有 worker 生产化并接入关键事件 Push。

## C3-T5：真实页面集成与回归

**文件：** 修改 `src/features/booking/{sessions-page,booking-page,customer-header}.tsx`、`src/features/home/home-page.tsx`、`src/features/admin/{admin-sessions,admin-dashboard}.tsx`；拟新增 `src/features/booking/adapters.ts`、`src/app/api/me/{bookings,booking-requests}/route.ts`、`src/app/api/admin/bookings/route.ts`、`src/app/admin/bookings/page.tsx`、`src/features/admin/bookings/BookingList.tsx`、`tests/e2e/booking.spec.ts`。

- [x] 场次列表使用真实时间、剧本、DM 和容量，筛选通过查询参数读取；首页近期场次复用同一查询，展示“已报 X / 上限 Y，还差 Z 人”。
- [x] 报名表提交时保留用户输入，409 展示最新剩余人数并要求重新确认；网络超时用原幂等键重试，不先在 UI 永久乐观占坑。
- [x] 自主预约提交成功后进入我的预约并可重载查询；后台今日场次与待审核数取真实数据，铃铛入口不再只弹演示 Toast。
- [x] `/admin/bookings`在本期交付真实只读报名列表，支持授权范围内按场次/状态筛选与分页，复用现有后台表格；C4在同一页面扩展锁车/跳车等操作，不另建第二份名单。
- [x] 验证登录回跳、键盘焦点、loading/disabled/error/success、窄屏团队表单和后台表格；运行类型、lint、构建、并发集成与端到端测试并记录失败修复证据。

## HTTP 契约样例与可执行验收

以下为 HTTP 契约样例；实际已执行结果及差异见 [C3 验收记录](../../c3-verification.md)。先在独立测试库创建 3 坑且无人报名的 open 场次，以及已登录的 customer 和 DM 顾客身份；每次测试使用新场次，禁止对真实预约执行。写请求先通过 `GET /api/auth/csrf` 取得当前会话 `data.csrf_token`。

```http
POST /api/sessions/201/bookings
Cookie: <customer session>
Origin: https://test.shisanwu.example
X-CSRF-Token: <csrf_token>
Idempotency-Key: c3-team-a-001
Content-Type: application/json

{"player_count":2,"contact":{"name":"测试顾客","phone":"13800000001"}}

HTTP/1.1 201 Created
{"code":0,"message":"报名成功","data":{"id":"301","session_id":"201","player_count":2,"status":"joined","remaining_count":1}}
```

拟新增 `tests/http/c3-booking.mjs`，运行 `node --env-file=.env.test tests/http/c3-booking.mjs`；先配置下列环境值，Cookie 由 C1 登录接口获得。

```js
import assert from 'node:assert/strict';
const { BASE_URL: base, TEST_SESSION_ID: id, SESSION_CUSTOMER_COOKIE: a, SESSION_DM_COOKIE: b } = process.env;
assert.ok(base && id && a && b, '先创建容量为3的空场次并登录两个测试账号');
const cookies = [a,b], origin = new URL(base).origin;
const csrf = await Promise.all(cookies.map(async cookie => {
  const r = await fetch(`${base}/api/auth/csrf`, {headers:{cookie}});
  assert.equal(r.status,200); return (await r.json()).data.csrf_token;
}));
const suffix = crypto.randomUUID();
const join = (index, key) => fetch(`${base}/api/sessions/${id}/bookings`, {
  method:'POST', headers:{cookie:cookies[index],origin,'X-CSRF-Token':csrf[index],'Content-Type':'application/json','Idempotency-Key':key},
  body:JSON.stringify({player_count:2,contact:{name:'并发测试',phone:'13800000001'}})
});
const keys = [`a-${suffix}`, `b-${suffix}`];
const responses = await Promise.all(cookies.map((_,i)=>join(i,keys[i])));
assert.deepEqual(responses.map(r=>r.status).sort(), [201,409]);
const winner = responses.findIndex(r=>r.status===201), first = await responses[winner].json();
const repeated = await join(winner,keys[winner]);
assert.ok([200,201].includes(repeated.status));
assert.equal((await repeated.json()).data.id,first.data.id);
assert.equal(first.data.remaining_count,1);
```

| 验收编号 | 可判定证据 |
| --- | --- |
| AC-C3-01 | 员工创建草稿/开放场次；主备 DM、价格覆盖、人数校验正确；customer 直调管理接口 403 |
| AC-C3-02 | 并发团队报名仅合法数量成功，计数等于占坑报名汇总；同键重试不重复占坑，异 payload 409 |
| AC-C3-03 | 本人未锁车取消释放一次坑位，full 回 open；他人 403、已锁车 409；没有自动锁车/超时取消 |
| AC-C3-04 | 申请通过只生成一个 source=customer 场次，D01 分支有明确验收；拒绝不生成场次；审批竞争不覆写 |
| AC-C3-05 | 我的预约分别识别申请与报名，刷新后状态正确；首页/大厅/后台展示一致且缓存失效可恢复 |
| AC-C3-06 | 真实 outbox 消费者在 C3 独立运行，顾客收到通过/拒绝/取消通知，员工收到新申请/报名/人数达标；重启可续发、重试无重复、已读仅本人、无联系人泄漏 |
| AC-C3-07 | 员工场次变更和审核有同事务审计；顾客报名不写员工日志；Redis/网络故障后业务和事件可核对 |

## 期末演示、交接与回退

- 演示：DM 开场 → 两位顾客并发组队报名 → 满员仅 full → 一人取消恢复 open → 自主申请通过/拒绝 → 顾客与员工铃铛刷新 → 重试请求不重复创建。
- 交接 C4：同一 sessions/bookings 状态机、幂等命令、容量事务、事件收件人和 outbox；保留锁车/跳车/押金规则入口，禁止另造平行报名表或钱账。
- 交接 C5/C7：场次来源、主 DM、申请人、团队报名账号和审计；交接 C8：关键预约事件与通知去重 ID，Push 无需反向控制业务提交。
- 回退先暂停新报名/审批入口并保留只读查询，处理未发 outbox 后发布兼容版本；不能删除已生成场次/报名来“恢复演示数据”，容量修复必须基于数据库核对并留痕。


## 2026-09-13 实施结果与边界

C3-T1～T5 已接通真实数据库/API/UI/消费者；实现文件按职责合并至 `src/server/{sessions,bookings,booking-requests,notifications}` 与共用 helpers，集成验收集中在 `tests/integration/booking.test.ts`（未机械建立每个拟定测试文件）。完整证据、故障修复、命令及上线门禁见 [C3 验收记录](../../c3-verification.md)。

已通过的基础检查：15 单元、53 全量集成（10 C3）、真实 Edge 的 C2/C3 联合流程、旧状态迁移演练和实际 worker 停止/重启/重投；最终版本的命令编号以验收记录为准。业务生产库未迁移，生产备份恢复、Docker/Nginx 验收及 C4/C5/C8 范围不在本次完成声明内。

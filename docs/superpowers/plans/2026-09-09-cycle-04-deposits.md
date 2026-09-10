# C4｜押金、锁车、跳车与场次履约

> 执行提示：在本会话实施时使用 `superpowers:subagent-driven-development`；另开执行会话时使用 `superpowers:executing-plans`。本文是待实施计划，示例与验收项尚未执行。

**Goal：** 在 C3 真实预约数据之上实现线下押金登记、商家锁车和开本履约，使每次状态变化与资金记录可追溯，向 C5 提供准确的已结束待结算场次。

**Architecture：** Route Handler → C1 鉴权及 `withCommand` → 押金/场次服务 → 同一 MySQL 事务内的业务记录、公共 journal、员工审计与 outbox；提交后刷新查询及通知。

**Tech Stack：** 沿用 Next.js App Router、Prisma/MySQL、Redis、Ant Design、React Query 和现有设计系统；金额统一 Decimal，不引入线上支付服务。

**Spec：** `../../设计文档.md` §2.2、§3.1～3.2、§4.5～4.7、§5.1～5.2、§6.2～6.3、§7.2～7.4、附录；前序 [C3](2026-09-09-cycle-03-booking.md)，后序 [C5](2026-09-09-cycle-05-membership-ledger.md)。

## Global Constraints

> 开发页面时，必须优先复用已有组件。已有组件可以通过 props、variant、className、children/slot 扩展时，必须优先扩展，而不是重新创建相似组件。只有现有组件经过合理扩展仍无法满足需求时，才新增组件。

遵循根 `AGENTS.md` 与 [共享协议](2026-09-09-shared-contracts.md)：`/api`、`{code,message,data}`、snake_case、字符串 ID/金额、服务端权限、数据库事务及业务幂等。单店、线下收款、无超时自动取消、无管理员代登录；隐藏按钮不能代替授权。

## 现状、入口与退出边界

- 当前 `src/features/admin/admin-sessions.tsx` 及 `admin-finance.tsx` 仍以演示状态工作；押金表和真实流水尚未落库，不能将现有按钮响应视为资金已登记。
- 入口要求：C1 员工权限、审计、命令幂等与 outbox 已验收；C3 的独立预约申请、场次、报名单和人数事务已验收，通知列表已可用。
- 开始资金模型和锁车实现前冻结 [D02、D03、D05](2026-09-09-decisions.md)：锁车人数/免押金校验、商家取消及退款时机/部分退、资金视角/科目/冲正；D02 必须同时冻结 D07 的免押金子集，完整权益配置 UI 仍由 C5 交付。未冻结项不以代码默认值替代产品决定。
- 输入：已上架场次、有效报名单、已注册顾客、线下实收凭据、授权员工；输出：押金及分录、完整状态历史、站内事件、`finished` 场次。
- 本周期不实现消费抵扣、充值、积分和实际结算；尤其不默认押金抵消费。`finished` 仅表示结束，绝不等同 `settled`。

## 状态与资金约束

| 对象 | 本周期允许的操作 | 必须分离的含义 |
| --- | --- | --- |
| `sessions` | `open/full → locked → running → finished`；非结束状态由商家取消 | 人数满只表示 `full`，不得自动锁车；锁车人数按 D02 |
| `bookings` | `joined → locked → finished`；`locked → jumped` | 未锁车取消仍沿用 C3；申请 `pending/approved/rejected` 不混入本表 |
| 押金 | 收取、按 D03 退款、跳车没收的明确处置 | `refund_amount=0` 本身不能区分尚未退款和已没收，必须有处置记录 |
| 结算 | 只发出结束及待结算事件，提供只读待结算候选查询 | C5 独立结算记录，不向场次状态枚举追加 `settled` |

跳车不等于自动重新开放场次；是否释放/再招坑位、取消锁车场次的处理必须作为 D02/D03 的状态转移表一并确认。结束仅完成仍有效报名单，保留已取消/跳车历史。

## C4-T1｜押金模型与唯一公共 journal

- [ ] 修改现有 `prisma/schema.prisma`，补齐源 `deposits`、`transactions`；核对旧数据后编写增量迁移，禁止 reset 真实库。
- [ ] 拟新增 `src/server/ledger/journal.ts`，提供共享 `appendJournal(tx,input)`：输入含 actorUserId/userId、operation、businessKey、reference、moneyLines 与可选 pointLines，返回分录标识；统一校验金额及业务引用，禁止内部另开事务导致半成功。
- [ ] 拟新增 `src/server/deposits/{service,policy,queries}.ts`；押金关联报名单与场次必须一致，顾客归属由数据库推出，禁止信任请求的 user_id。
- [ ] 复用 `transactions` 作为关联押金的不可变分录，源 `deposits` 保留汇总、经手人和时间；处置类型等必要字段依 D03/D05 增量补齐。若 D03 允许多次退款，再确认退款明细扩展，不提前另造押金账。
- [ ] 分录金额使用 `Decimal(10,2)`；请求采用正数金额，内部符号与余额/现金/押金科目映射由 D05 决定，不在接口层猜测。
- [ ] 建立 `transactions(user_id,created_at)`、`(type,created_at)` 索引与分录唯一业务键；同一业务不能因换 Idempotency-Key 重复记账。追加式冲正关联原分录，禁止编辑/删除历史流水。

完成标准：迁移可在脱敏测试数据上升级；一笔收取能关联到顾客、报名、场次、经手员工、审计和分录；journal 接口可被 C5 直接复用。

## C4-T2｜登记、退款与冲突防护

- [ ] 拟新增 `src/app/api/admin/deposits/route.ts` 和 `[id]/refund/route.ts`，实现源收取/退款 API；查询接口 `GET /api/admin/deposits` 为拟新增扩展。
- [ ] 收取与退款权限均为 DM/manager/boss；调用 C1 `assertPermission`，进一步按已确认的员工资源范围判定。顾客只有自己的流水读取权限。
- [ ] 在一个事务内写押金明细、journal、`appendAudit(tx,…)`、`appendEvent(tx,…)`；审计包含原因及前后摘要，不保存密码或不必要的隐私材料。
- [ ] 退款通过锁定押金行或带版本条件更新验证「累计退还 + 本次退还 ≤ 可退金额」；禁止只在 UI 或 Redis 锁中校验，禁止因并发超退。
- [ ] 同键同请求返回第一次已提交结果，同键不同金额/对象返回 HTTP 409；失联重试先查原命令结果，不能让员工再次登记同一笔实收。
- [ ] 负数、零值收取、三位小数和超出 Decimal 范围返回 422；未登录 401、无权 403、不存在 404、状态或重复处置冲突 409。退款/冲正是否可做依 D03/D05，而非强行通过。

完成标准：系统只记录已线下发生的动作；禁止将 API 成功文案写成已自动发起微信退款。资金提交后通知故障不能回滚账务，outbox 保留并重试。

## C4-T3｜锁车及履约的跨记录事务

- [ ] 拟扩展 C3 `src/server/sessions/service.ts` 和 `src/server/bookings/service.ts`，为锁车、开本、结束、商家取消及跳车逐条声明前置状态和权限；拟新增源 `PATCH /api/admin/bookings/:id` 的Route Handler，调用同一履约服务，不能通过单改报名状态绕过场次/押金约束。
- [ ] 在同一事务内验证当前人数、有效报名及 D02 要求的实收/免押金依据，再修改场次与关联报名；免押金不是录一笔 0 元押金，记录校验结果与规则来源。
- [ ] 拟新增 `src/server/membership/deposit-policy.ts`，只从当前用户真实 `level_id` 联表读取 C1 `member_levels.benefits` 中经 D02+D07 确认的免押金规则及版本；用受控种子/迁移写入并留痕，缺失配置拒绝免押金。锁车保存命中规则快照，禁止读前端权益文案、客户端勾选或演示等级；C5 完整权益管理复用该来源。
- [ ] 手动锁车时与取消/报名并发争用同一场次保护机制，失败方返回 409 并重新读取；不能出现已取消报名被锁车、超员或已锁车继续普通报名。
- [ ] 跳车事务保留原实收、写没收处置与审计；`locked → jumped` 不创建一笔虚假「再收押金」现金收入。退款和没收互斥/部分处置规则遵循 D03。
- [ ] 商家取消覆盖 draft/open/full/locked/running；退款安排依D03，未确认前不得把running取消默认等同普通未锁车取消。另扩展C3本人未锁车取消路径：即使已登记押金，顾客仍保留源规定的自行取消权，释放坑位并依D03留下退款动作/待办，不因已收押金静默禁止取消或抹去应退款记录。
- [ ] 拟新增 `src/server/settlements/queries.ts` 的 `listSettlementCandidates` 及 `src/app/api/admin/sessions/settlement/route.ts`，实现源 `GET /api/admin/sessions/settlement`：只查 `sessions.status=finished` 且存在 `bookings.status=finished` 的有效报名；排除取消/跳车，按 C1/D11 校验员工资源范围。带本 DM 的本人场次优先展示，源赋予DM/店长/BOSS结算权限，不能把“优先本人”擅改成“只能本人”；额外收紧范围须D11明确。
- [ ] 该只读查询返回场次/剧本/主 DM、价格及有效报名候选，C4 不创建结算表、临时待结算状态或虚假账务；C5 在同一路径和查询上联接其唯一结算记录，排除已完成的结算单元。结束只发事件，不扣余额、不发积分、不创建消费流水。
- [ ] 扩展 C2 DM 查询与 `src/features/catalog/dm-detail-screen.tsx`：按已结束场次的真实 `primary_dm_id` 聚合实际带过的剧本、场次数和最近场次时间，回填 `GET /api/dms/:id` 的 `hosted_scripts`；替换 C2 等待真实数据的空态，不能把 `script_dms` 的「可带」或备选 DM 关联算作「带过」。

完成标准：状态矩阵有合法/非法迁移测试；C3 的未锁车自主取消能力不退化；每个敏感写与审计同事务。

## C4-T4｜复用页面、通知与完整验收

- [ ] 扩展现有 `src/features/admin/admin-sessions.tsx`、`admin-shared.tsx` 和 `src/features/member/MePage.tsx`；拟新增 `features/admin/deposits/` 领域表单与查询适配器，复用 Button/Dialog/Field/状态徽章。
- [ ] 扩展C3已有 `/admin/bookings`只读名单，增加履约操作；拟新增 `/admin/deposits`及只读 `/admin/sessions/settlement` 页面，后者仅展示真实候选，C5再接入结算写操作。原 `/admin/sessions`、`/admin/finance` 聚合入口保留并导航至细分操作页，财务汇总本身仍须BOSS权限。
- [ ] 对照实际原稿补齐收款金额、经手人、收/退时间、原因、锁车条件、跳车确认，以及 pending/error/retry 状态；重复点击不能重复提交，且服务端仍独立保护。
- [ ] 复用 C3 通知基础设施，发出 `deposit.received/refunded/forfeited`、`session.locked/started/finished/cancelled`、`booking.jumped`、`settlement.required`；dispatcher 按共享订阅写通知，同 `event.id + recipient` 去重，C8 才补关键事件 Push。
- [ ] 拟新增 `tests/integration/deposits.test.ts`、`session-fulfillment.test.ts`、`tests/e2e/deposits.spec.ts`；以真实 MySQL 事务验收并发、回滚和去重，不以 mock 通过代替资金一致性。

## HTTP 合同示例（拟实现）

`GET /api/admin/sessions/settlement?page=1&page_size=20` 返回 HTTP 200：`{"code":0,"message":"ok","data":{"items":[{"session_id":"4201","status":"finished","script_id":"101","primary_dm_id":"201","start_time":"2026-09-09T11:00:00.000Z","price":"100.00","eligible_bookings":[{"booking_id":"2201","user_id":"1201","player_count":1}]}],"page":1,"page_size":20,"total":1}}`。这里只列事实候选，不把报名单提前定义成 D04 的结算单元；无候选为 `items:[]`。该接口鉴权为 DM/manager/boss，C5 维持相同外层分页及基础字段，按 D04 补充未结单元信息；不新增并行查询或占位资金表。

```http
POST /api/admin/deposits
Cookie: session=<测试员工会话>
Idempotency-Key: c4-receive-2201-001
Content-Type: application/json

{"booking_id":"2201","amount":"100.00","note":"已核对线下微信实收"}
```

首次成功 HTTP 201：`{"code":0,"message":"押金已登记","data":{"id":"3101","booking_id":"2201","amount":"100.00","refund_amount":"0.00"}}`。`received_by/received_at` 由服务器填写，不能由请求伪造。

```http
POST /api/admin/deposits/3101/refund
Idempotency-Key: c4-refund-3101-001
Content-Type: application/json

{"amount":"100.00","note":"按已确认规则线下退还"}
```

该退款示例仅在 D03 允许且员工已核实线下退款时成立；超额退款示例 HTTP 409：`{"code":3001,"message":"可退金额不足","data":null}`。锁车沿用 `PATCH /api/admin/sessions/:id`，例如 `{"status":"locked"}`，不接受客户端声明的「已满足押金」替代查询。

## 可执行接口测试样例（实施后执行）

先在隔离测试库创建开放场次和一张未收押金报名单，完成带本 DM 登录；传入 `BASE_URL`、`SESSION_DM_COOKIE`、`TEST_BOOKING_ID`。将以下内容保存为拟新增 `tests/manual/c4-receipt.mjs` 后执行 `node tests/manual/c4-receipt.mjs`；不要针对生产账号运行。

```js
import assert from 'node:assert/strict';
const base = process.env.BASE_URL;
const cookie = process.env.SESSION_DM_COOKIE;
const bookingId = process.env.TEST_BOOKING_ID;
assert.ok(base && cookie && bookingId, '需测试地址、员工会话及干净报名单');
const csrfResponse = await fetch(`${base}/api/auth/csrf`, {headers: {Cookie: cookie}});
assert.equal(csrfResponse.status, 200);
const {data: {csrf_token}} = await csrfResponse.json();
const key = `c4-${crypto.randomUUID()}`;
const send = async (amount) => {
  const r = await fetch(`${base}/api/admin/deposits`, {
    method: 'POST', headers: {Cookie: cookie, Origin: new URL(base).origin,
      'Content-Type': 'application/json', 'Idempotency-Key': key, 'X-CSRF-Token': csrf_token},
    body: JSON.stringify({booking_id: bookingId, amount, note: '隔离测试'})
  });
  return {status: r.status, body: await r.json()};
};
const first = await send('100.00');
assert.equal(first.status, 201); assert.equal(first.body.code, 0);
const repeats = await Promise.all(Array.from({length: 6}, () => send('100.00')));
for (const item of repeats) {
  assert.ok([200, 201].includes(item.status));
  assert.deepEqual(item.body.data, first.body.data);
}
assert.equal((await send('101.00')).status, 409);
console.log('C4 收取幂等接口断言通过；还须核对数据库唯一分录与审计');
```

## 验收矩阵

| 编号 | 具体数据/操作 | 可判定结果 |
| --- | --- | --- |
| AC-C4-01 | 同一报名收 `100.00`，同键重复 6 次，再异金额 `101.00` | 仅一次收取/资金分录/员工审计/业务事件；重复返回原结果，异金额 409 |
| AC-C4-02 | 已收 `100.00`，并发退 `100.00` 两次、不同键 | 仅一笔成功，另一笔 409；累计退款 `100.00`，余额/分录无多退 |
| AC-C4-03 | 锁车条件不足；再补足或按 D02 验证免押金 | 不足时任何状态均不变；满足时一次事务锁车；满员不自动锁车 |
| AC-C4-04 | 顾客未锁车取消与员工锁车同时提交 | 仅一个有效顺序成立，无已取消又锁车、人数漂移或遗漏报名 |
| AC-C4-05 | 锁车后跳车、正常结束、商家 locked/running 取消 | 分别命中已冻结规则；未退款不被误记没收；结束后未生成消费/积分 |
| AC-C4-06 | 在写审计前注入数据库故障；提交后暂停 dispatcher | 前者业务与钱账全回滚；后者账务保留，恢复后通知仅到达一次 |
| AC-C4-07 | customer 调用押金写；员工读取他人越权资源 | 403，无任何分录/状态/审计成功记录；自己流水只含自己数据 |
| AC-C4-08 | 1 场 running、1 场 finished 含有效/取消/跳车报名、1 场 cancelled，查询待结算 | 仅返回 finished 场次的有效报名；DM 只能看授权范围；API/只读页面相同，查询不创建结算记录 |
| AC-C4-09 | 同剧本 2 场 finished 主 DM 为甲，另 1 场仅备选乙、1 场 running | 甲主页显示实际带本 2 次；乙不因备选身份增加记录；未结束不计入，C2 空态正确替换 |
| AC-C4-10 | 合资格会员和无规则账号分别勾选前端免押金；随后篡改请求等级 | 仅服务器真实等级+已冻结规则允许免押金，记录规则版本；前端勾选/伪造等级无效 |

若 D03 允许部分退，追加 `100.00 → 退30.00 → 并发退80.00/70.00`，累计不得超过 `100.00`；不允许则部分退款直接 422，此分支需记录所选规则。

## 期末演示、交接与回退

- 演示顺序：C3 报名 → 线下收取登记 → 锁车 → 开本 → 结束 → 出现在待结算数据；另演示跳车与按 D03 的退款，顾客端通知同步可见。
- 交给 C5：journal 接口及资金科目/冲正规则、同一路径的只读待结算候选查询/API/页面、服务端免押金配置和快照、押金核对样本、事件/审计业务键；交给 C7：可回溯的押金收支与没收处置数据。DM 实际带本聚合已接回 C2 主页，不转嫁给后续周期。
- 验收证据保存测试命令、数据库前后摘要、角色矩阵、失败注入和页面截图；本文勾选前不能声明真实押金闭环完成。
- 回退以关闭新写入口和回滚应用版本为先，保留已提交业务数据与历史分录；有真实收退款记录后禁止降级迁移删表，已错业务用 D05 冲正并再次对账。

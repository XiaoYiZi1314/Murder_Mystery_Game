# C5｜会员、充值、消费结算、积分与线下礼品

> 执行提示：在本会话实施时使用 `superpowers:subagent-driven-development`；另开执行会话时使用 `superpowers:executing-plans`。本文是待实施计划，示例与验收项尚未执行。

**Goal：** 形成充值、累计储值升级、消费结算、积分和线下兑换的真实账务闭环；一笔业务只记一次钱和分，顾客能查到自己的完整历史。

**Architecture：** 复用 C4 `src/server/ledger/journal.ts` 与 C1 命令事务/权限/审计/outbox，新增钱包、会员、结算和礼品领域服务；前端使用查询适配器替换演示数据。

**Tech Stack：** 沿用 Next.js、Prisma/MySQL 8.0、Redis、Ant Design/React Query 与既有 UI/tokens；服务端 Decimal 金额、整型积分及数据库条件更新。

**Spec：** `../../设计文档.md` §2.2、§3.2、§3.5、§4.7、§5.1～5.2、§6.2～6.3、§7.2～7.4、附录；前序 [C4](2026-09-09-cycle-04-deposits.md)，后序 [C6](2026-09-09-cycle-06-reviews-reports.md)、[C7](2026-09-09-cycle-07-boss-operations.md)。

## Global Constraints

> 开发页面时，必须优先复用已有组件。已有组件可以通过 props、variant、className、children/slot 扩展时，必须优先扩展，而不是重新创建相似组件。只有现有组件经过合理扩展仍无法满足需求时，才新增组件。

遵循根 `AGENTS.md` 与 [共享协议](2026-09-09-shared-contracts.md)：`/api`、`{code,message,data}`、snake_case、字符串 ID/金额、服务端鉴权、事务和幂等。不做线上支付，不允许 BOSS 代登录顾客；礼品仅线下兑换，不增加线上订单、发货或库存电商需求。

## 现状、前置条件与边界

- 当前 `MePage`、`WalletPage`、`GiftsPage` 和 `AdminFinance` 是复用基线；原 Prisma `pointsThreshold` 不是正确升级条件，应已在 C1 纠偏为累计储值阈值。
- 输入：C1 真实账号/五等级种子/权限，C2 礼品图片可复用的媒体能力，C4 journal 与 `finished` 场次、报名和押金记录；输出：可核对的钱/分历史、结算凭据、等级权益和线下兑换历史。
- 实施结算前冻结 [D04](2026-09-09-decisions.md)：结算粒度、团队参与账号及积分归属、是否混合付款、1:1 小数/折扣计分基数；不能让输入框设计偷偷决定这些业务规则。
- 实施充值纠错及完整权益变更前冻结 D06/D07：累计储值回滚与等级/积分影响、规则变更追溯/降级、正式折扣/赠礼配置；免押金子集已由 C4 随 D02 冻结，本周期复用同一服务端配置并提供完整管理 UI。D05 的资金视角与冲正方案沿用 C4，不另选一套。
- 五级及默认累计储值阈值已确认：见雾 `0.00`、望遥 `500.00`、栖月 `1500.00`、书烬 `3000.00`、云影 `6000.00`。阈值不是未决项，正式权益细目才是 D07。
- 本周期不交付财务经营报表或 BOSS 日志查询页（C7），不交付 Web Push（C8）；资金、积分、升级的站内通知及审计本周期必须可用。

## 账务与结算不变量

| 业务 | 余额 / 累计储值 | 积分与状态 |
| --- | --- | --- |
| 微信线下充值登记 | 余额及 `total_topup` 同时增加，按累计储值升级 | 充值不等于消费，不发消费积分 |
| 余额消费 | 扣注册账号余额；不足拒绝，不隐式转微信 | 依 D04 规则按消费 1:1 发分；不增加累计储值 |
| 现金/微信直接消费 | 不扣储值余额，不增加累计储值 | 注册散客同样发分，不能以余额为零拒绝积分 |
| 押金收退 | 继续通过 C4 journal，按 D05 独立核对 | 不是消费，不发积分，不自动抵消费 |
| 礼品兑换 | 不产生虚构现金收支 | 线下发放后扣分及新增兑换记录，同事务且不可超扣 |
| 场次结束 / 结算 | `sessions.status=finished` 与结算记录分离 | 结束不扣款；所有应结单元完成后才从待结算列表消失 |

客户端不能提供最终可信的积分数、等级或余额；保留源 `settle` 的 points 字段时只能作为需匹配服务端计算的校验值，不得任意发分。

## C5-T1｜增量模型、journal 扩展与个人流水

- [ ] 修改现有 `prisma/schema.prisma`，补齐源 `users.balance/total_topup`、`points_ledger`、`gifts`、`gift_redemptions`；复核 `transactions` 与 C4 关联，禁止新建第二套押金流水。
- [ ] 拟新增唯一一组 `settlements`、`settlement_items`（源表的必要扩展）：前者关联场次，后者保存按 D04 冻结的结算单元/付款账号/应付及实收/方式/积分归属；业务键唯一防同单元重复结算。C4 候选是查询结果，不另建候选表或第二套结算/押金账本。
- [ ] 拟新增 `src/server/wallet/{service,queries}.ts`、`src/server/settlements/{service,policy}.ts`、`src/server/membership/service.ts`、`src/server/gifts/service.ts`，扩展 C4 已交付的 `src/server/settlements/queries.ts`；资金/积分写统一调用已有 journal。
- [ ] 扩展 journal 支持同事务资金与积分分录、原因/引用/操作员工及纠错关联；余额/积分快照与分录一致更新，禁止直接 PATCH User.points 或 balance 绕过分录。
- [ ] 实现源 `GET /api/me/wallet` 的分页与类型过滤，汇合充值、三种方式消费、积分、押金和兑换；通过业务引用分组但保留明细，不把同时扣余额/发分误当两次消费。
- [ ] 实现源 `GET /api/me/history` 及拟新增 `src/server/history/queries.ts`：按已结束且本人有效参与的场次聚合剧本，保留 `script_id`、`play_count`、`last_played_at` 和本人场次明细；排除取消/跳车，不要求已结算。所有个人查询由登录用户定位 owner，外部 user_id 不能读取他人钱包/历史。
- [ ] 扩展 C1 `GET /api/me`，返回真实 `level`、`benefits`、`balance`、`points`、`total_topup`、`next_level`、`topup_to_next_level`；差额用服务端 Decimal 计算 `max(下级阈值-total_topup,0)`，云影为 `next_level:null`、差额 `"0.00"`，页面显示已达最高等级。

完成标准：金额使用两位十进制字符串，积分整数；索引覆盖 user/time/type；迁移前识别真实数据，不把演示余额作为开账依据。

## C5-T2｜充值、权益与受控纠错

- [ ] 实现源 `POST /api/admin/wallet/topup`：店长/BOSS 按手机号定位注册顾客，核对线下实收后登记；DM 调用必须 403。
- [ ] 充值事务锁定/条件更新顾客行，增加余额和累计储值、计算等级、写 journal、审计与余额/升级事件；同键重复不叠加，不同充值并发不得丢更新。
- [ ] 拟新增 `/admin/members` 和 `/admin/levels`，实现源 `GET /api/admin/members?q=` 与 `GET/PUT /api/admin/levels`；前者提供会员查询和明确的调整入口，后者仅BOSS配置阈值/权益。人工余额/积分调整权限按D11冻结，不默认给所有员工；沿用C1五级种子，不用积分重新推算等级。
- [ ] `PATCH /api/admin/members/:id/adjust` 使用明确金额或积分差额、原因和原业务引用；充值错误走 D06 专门纠错规则，不把普通调余额当作撤销累计储值。
- [ ] 权益配置保存版本与操作审计；复用 C4 `src/server/membership/deposit-policy.ts` 与同一 `member_levels.benefits` 免押金来源，禁止 UI 另存一套布尔值。历史结算保存当次规则快照，升降级/追溯按 D06/D07，而非擅自即时重算历史。
- [ ] 所有人工纠错追加分录并关联原业务；禁止编辑金额或删除旧流水。发出 `wallet.topped_up/adjusted`、`points.changed`、`membership.upgraded` 对应站内通知，禁止以通知失败撤销已提交账务。

完成标准：`499.99 + 0.01` 的累计储值准确达到望遥，不受浮点误差影响；余额和累计储值不因积分兑换改变。

## C5-T3｜待结算与消费的唯一事务

- [ ] 扩展 C4 已实现的 `GET /api/admin/sessions/settlement`，新增源 `POST /api/admin/sessions/:id/settle`；默认责任人为带本 DM，店长/BOSS 可记账，额外员工资源范围遵循 D11。
- [ ] 在同一 `listSettlementCandidates` 查询内保留 finished/有效报名过滤，联接本周期唯一结算记录排除已结单元，补充按 D04 定义的 `pending_units`；保留 C4 外层分页和基础字段，不另造状态或平行查询。部分完成如何展示按 D04，只有全部单元完成才移除场次。
- [ ] 对选定结算单元、付款账号、余额行采用稳定锁顺序；校验状态、应付、支付方式和参与归属，金额/积分由服务端计算，不信任页面汇总值。
- [ ] 一次事务创建结算/明细、扣余额（如适用）、记消费和积分、写审计及 `settlement.completed`/`points.changed` outbox；任何一项失败全回滚。唯一业务键和条件余额更新必须同时存在。
- [ ] 并发记同一结算单元：同键返回原结果，异键冲突 409；不同场次竞争同一余额时仍不能超扣。客户端重试保留原键，不把按钮禁用当作唯一保护。
- [ ] 现金/微信消费记录必须关联注册账号并发积分；团队无需凭空注册虚构成员，按 D04 已确认账号归属实现；混合付款只在 D04 确认需要时开放。

完成标准：会计数据可逐笔回溯场次/剧本/带本 DM/支付方式/经手员工；场次结束后只有全部应结单元成功才移出待结算。

## C5-T4｜礼品管理与线下兑换

- [ ] 实现源 `CRUD /api/admin/gifts` 和 `POST /api/admin/gift-redemptions`，仅店长/BOSS 写；拟新增 `/admin/gifts`，复用 C2 图片选择及 `admin-shared` 表单。
- [ ] 礼品包含名称、图片、所需积分、可兑起止时间和状态；拟新增 `GET /api/gifts` 提供公开橱窗只读投影，顾客展示使用现有 `src/features/member/GiftsPage.tsx`，不加「线上立即兑换」订单按钮。
- [ ] 兑换请求由已登录员工核对礼品与顾客，服务端检查生效时段/上下架和积分；在同一事务扣分、记 points_ledger、兑换记录、审计及 `gift.redeemed`/`points.changed` 事件，按共享订阅避免重复业务通知。
- [ ] 使用条件更新保证 `points >= points_cost`；历史保存当次礼品名称/所需积分等展示快照，后续调价不能改写过去兑换。
- [ ] 顾客可查询自己的兑换历史；拟新增 `GET /api/me/gift-redemptions` 与展示区，记录线下完成时间和实际扣分，不出现物流/发货状态。

完成标准：100 积分同时兑换两件各 80 积分礼品，最多成功一件，余额积分为 20；重复请求不再扣分。

## C5-T5｜页面接线与账务验收

- [ ] 扩展现有 `src/features/member/{MePage,WalletPage,GiftsPage,HistoryDetailPage,components}.tsx` 及 `src/features/admin/{admin-finance,admin-dashboard,admin-shared}.tsx`，保留原样式和聚合导航；`/me/member` 接真实等级/权益/距下级储值差额，`/me/history` 与 `/me/history/[id]` 接本人真实历史，保留原 slug 兼容映射。
- [ ] 拟新增 `/admin/wallet`，扩展 C4 只读 `/admin/sessions/settlement` 为真实结算操作页，使用既有 Button/Field/Dialog/Toast/Card；金额输入明确元，展示 pending/error/retry 和服务器结果。
- [ ] 用 RSC/服务端查询呈现顾客私有数据，后台 React Query 接线并在成功提交后失效相关查询；移除业务演示数据及客户端假余额更新，设备筛选偏好可保留。
- [ ] 拟新增 `tests/integration/{topup,settlement,gift-redemption,ledger-reconciliation}.test.ts` 与 `tests/e2e/membership-ledger.spec.ts`；使用真实 MySQL 并发和事务失败注入。
- [ ] 执行原类型/lint/单元/生产构建检查，加角色接口与交易核对；原 7 个前端测试并不能证明本周期的资金一致性。

## HTTP 合同示例（拟实现）

```http
POST /api/admin/wallet/topup
Cookie: session=<测试店长会话>
Idempotency-Key: c5-topup-1201-001
Content-Type: application/json

{"user_id":"1201","amount":"500.00","note":"已核对线下微信充值"}
```

空账户首次成功 HTTP 201：`{"code":0,"message":"充值已登记","data":{"transaction_id":"5101","balance":"500.00","total_topup":"500.00","points":0,"level_name":"望遥"}}`。经手人由 Session 决定；提交的自定义 operator_id/level_id 不可覆盖服务器结果。

```http
POST /api/admin/sessions/4201/settle
Idempotency-Key: c5-settle-4201-unit1
Content-Type: application/json

{"method":"balance","amount":"100.00","note":"线下核实后结算"}
```

以上为源设计的最小字段示例，适用于 D04 确认的一名注册顾客/一个结算单元测试场次；多单元/团队/混合付款的具体请求结构须先冻结 D04，再版本化补充合同。积分服务端算出；余额不足 HTTP 409：`{"code":3002,"message":"余额不足","data":null}`。

## 可执行接口测试样例（实施后执行）

先建立隔离测试账户：余额和累计储值均 `499.99`、积分 `17`、等级见雾，使用默认五级规则；登录店长并传入 `BASE_URL`、`SESSION_MANAGER_COOKIE`、`TEST_MEMBER_ID`。保存为拟新增 `tests/manual/c5-topup.mjs`，执行 `node tests/manual/c5-topup.mjs`，不可对生产账号运行。

```js
import assert from 'node:assert/strict';
const base = process.env.BASE_URL;
const cookie = process.env.SESSION_MANAGER_COOKIE;
const userId = process.env.TEST_MEMBER_ID;
assert.ok(base && cookie && userId, '需测试地址、店长会话及499.99测试账号');
const csrfResponse = await fetch(`${base}/api/auth/csrf`, {headers: {Cookie: cookie}});
assert.equal(csrfResponse.status, 200);
const {data: {csrf_token}} = await csrfResponse.json();
const key = `c5-${crypto.randomUUID()}`;
const send = async () => {
  const r = await fetch(`${base}/api/admin/wallet/topup`, {
    method: 'POST', headers: {Cookie: cookie, Origin: new URL(base).origin,
      'Content-Type': 'application/json', 'Idempotency-Key': key, 'X-CSRF-Token': csrf_token},
    body: JSON.stringify({user_id: userId, amount: '0.01', note: '隔离测试'})
  });
  assert.ok([200, 201].includes(r.status));
  const result = await r.json(); assert.equal(result.code, 0);
  return result.data;
};
const first = await send();
assert.equal(first.balance, '500.00'); assert.equal(first.total_topup, '500.00');
assert.equal(first.level_name, '望遥'); assert.equal(first.points, 17);
for (const result of await Promise.all(Array.from({length: 8}, send))) {
  assert.deepEqual(result, first);
}
console.log('C5 充值/阈值/重放接口断言通过；还须核对唯一账务记录');
```

## 验收矩阵

| 编号 | 具体数据/操作 | 可判定结果 |
| --- | --- | --- |
| AC-C5-01 | `499.99+0.01` 充值并重复 8 次；另测 1499.99/2999.99/5999.99 跨阈值 | 一笔入账、一次升级，积分不增；五级按累计储值而非积分 |
| AC-C5-02 | 零余额散客现金消费 `100.00`；另一账号微信消费 `100.00` | 各得 100 积分，余额和累计储值不变；支付方式分别可查询 |
| AC-C5-03 | 余额 `150.00`，两场各消费 `100.00` 并发扣款 | 仅一场成功、余额 `50.00`；失败场仍待结算且无消费/积分残留 |
| AC-C5-04 | 同场同单元同时提交两笔结算，使用不同键 | 唯一业务键只允许一笔；重复项 409，不二次发分，成功单元不再待结算 |
| AC-C5-05 | 100 积分并发兑换两件 80 积分礼品；过期/下架礼品各试一次 | 仅一件有效兑换、积分 20；过期/下架拒绝，零兑换分录 |
| AC-C5-06 | 冲正 `500.00` 充值；修改权益规则；消费 `99.99` | 依 D06/D07/D04 冻结规则验证，保留原分录和规则版本，不擅自降级/四舍五入 |
| AC-C5-07 | 分录写入后注入异常；提交后暂停通知；DM 尝试充值 | 异常全回滚，通知恢复不重记资金；DM 403，钱/分均不变 |
| AC-C5-08 | 对账期初余额+净变动、积分期初+净变动，逐笔比对 UI/API/DB | 当前快照一致，押金不算消费，充值与余额消费可分别识别且不误算现金 |
| AC-C5-09 | 望遥累计储值 `1200.00`、云影 `6000.00`，访问 `/me/member` | 前者距栖月 `300.00`，后者最高等级/差额 `0.00`；真实权益与服务端配置一致，充值后页面刷新 |
| AC-C5-10 | 同人 2 场同剧本 finished（1 场未结算），另有取消/跳车及他人场次 | `GET /api/me/history` 与列表/详情均仅汇总本人有效 2 场；未结算仍算玩过，伪造 user_id 无法越权 |
| AC-C5-11 | 按D04冻结的结算粒度完成C4候选；若支持多个独立单元，补先部分再全部结清样本 | 单单元完成即移除；多单元在全部完成前保留未结部分；状态始终finished，无重复候选表或消费分录，不以此用例默认要求分批结算 |

## 期末演示、交接与回退

- 演示：手机号找到顾客 → 线下充值跨等级 → C4 结束场次结算 → 顾客查余额/积分/流水 → 店内兑换扣分 → 重复请求与余额不足均安全失败。
- 交给 C6：储值记录存在性与当前积分查询、等级徽章、玩后评价引导数据；评价资格是曾储值或当前积分大于 0，不能改成当前余额大于 0。
- 交给 C7：统一 journal、结算明细与现金/余额/押金区分、积分兑换和规则版本、审计及可复现对账样本；待 C7 冻结 D10 后生成正式期间报表。
- 验收证据包含真实事务测试、并发结果、金额/积分核对表、各角色页面和通知；本周期完成后 C6/C7 可并行，C8 仍需最终全量验收。
- 回退先暂停充值/结算/兑换写入口并保留查询；不得回滚数据库到丢失已线下发生交易的状态。修正业务使用 D05/D06 追加冲正，记录影响与再次对账结果。

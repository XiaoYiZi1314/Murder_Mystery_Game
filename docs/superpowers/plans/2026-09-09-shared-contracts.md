# 开发周期共享协议与实现边界

状态：规划约定，尚未实现。版本：2026-09-09。依据：[设计文档](../../设计文档.md) §2、§3、§6–§10 与项目根 [AGENTS](../../../AGENTS.md)。

这份协议供 C1–C8 共同引用。业务源要求优先于现有演示代码；下文标注“建议”的工程方案由 C1 固化为代码契约。业务政策未闭合的部分见[决策清单](2026-09-09-decisions.md)，不能用演示值替代确认。

## 1. 现有资产与应纠正的草约

| 当前资产 | 保留与后续动作 |
| --- | --- |
| 23 个原稿入口、共享 UI/布局、56 项变量 | 继续复用，不重新搭建整套页面；各期接入真实数据并核验原稿样式 |
| `src/lib/routes.ts` 与页面 slug | 保留原 HTML 跳转和实体选择；数据库 ID 与页面 slug 分开映射 |
| `prisma/schema.prisma` | 仅草案：补真实表、字段、索引、状态；禁止把已有演示枚举当成已确认业务 |
| `src/lib/api/contracts.ts` | 现 `/api/v1` 和 `{ok,...}` 与设计不一致，C1统一到 `/api`、`{code,message,data}` |
| `MemberLevel.pointsThreshold` | 改成累计储值门槛；补用户 balance、total_topup；积分不能作为会员升级依据 |
| `PATCH users` 的 role/points/level 草约 | 用员工管理、充值、积分调整等独立授权命令替代，禁止通用资料接口直接改账 |
| `admin-ops` 的举报处理演示 | C6删除“标记处理/线下处理中”等在线处置，仅允许 BOSS 读取和最小已读 |
| 当前公开剧本详情 | C2接入真实数据时恢复“列表公开、详情需登录” |
| 当前 manifest 与图标 | 保留视觉基线；不代表 SW、离线、Push 已完成 |

本轮仅制定计划，不执行以上代码修改。实施前核对真实数据库：若只有已标识的开发样本，可重建开发数据；若存在用户数据，先备份、写迁移映射与校验，不得 reset/drop。

## 2. API、ID、时间与错误

- 源约定：Next.js Route Handlers、REST、统一 `/api`；响应 `{ code, message, data }`。建议成功 `code=0`；错误沿用 1xxx 参数、2xxx 认证权限、3xxx 业务、5xxx 服务端。
- 建议 HTTP：200/201 成功，400 格式错误，401 未登录，403 无权限，404 不存在，409 状态/幂等冲突，422 业务输入非法，429 限流，500 未预期故障。错误返回 `data:null`，可在需要时用独立的字段错误结构，C1统一一次。
- wire 字段采用设计源的 snake_case，UI 使用显式适配器转换 camelCase。新增端点在各期标为“拟新增”；当前草约没有真实实现，不为其保留第二套并行服务。
- 源数据库 ID 为 BIGINT；建议沿用并在 JSON/TypeScript 中传十进制字符串，避免 JavaScript 大整数丢精度。页面 slug 保留兼容查询，不直接当数据库主键。
- 金额用 `DECIMAL(10,2)` / Prisma Decimal，API用两位小数字符串，例如 `"268.00"`；不以 JS 浮点直接加减账本。积分为整数；金额转积分规则必须在 D04 冻结。
- 建议 DB/API 存储和传输 UTC 时间；报表按店铺业务时区转换。`Asia/Shanghai`、周一作为周起始是 D10 的建议值，源没有明定，不能混用服务器本地时区。
- 价格、操作者、积分、升级结果、权限不信任客户端。表单提供输入，服务端读取权威规则并计算后返回。

```json
{"code":0,"message":"报名成功","data":{"id":"301","session_id":"201","player_count":2,"status":"joined"}}
```

```json
{"code":3001,"message":"剩余坑位不足","data":null}
```

## 3. 目录与服务边界（全部为拟新增，现有文件另标）

| 路径 | 首次周期 | 职责 |
| --- | --- | --- |
| `src/server/db/prisma.ts`、`redis.ts` | C1 | 连接及服务端访问入口 |
| `src/server/auth/session.ts`、`password.ts`、`permissions.ts`、`authorize.ts` | C1 | argon2id、Redis Session、集中权限与资源所有权 |
| `src/server/http/response.ts`、`errors.ts`、`with-command.ts` | C1 | API封装、校验错误、会话与CSRF，不替代业务事务 |
| `src/server/audit/log.ts` | C1 | 员工敏感操作留痕 |
| `src/server/events/types.ts`、`outbox.ts`、`dispatcher.ts` | C1 | 事件协议与提交后可靠分发 |
| `src/server/notifications/service.ts` | C1/C3 | C1数据边界，C3站内通知可用 |
| `src/server/catalog/`、`src/server/media/` | C2 | 真实内容及公私媒体存储 |
| `src/server/sessions/`、`src/server/bookings/`、`src/server/booking-requests/` | C3 | 排期、占坑、审批三个独立责任 |
| `src/server/ledger/journal.ts`、`src/server/deposits/` | C4 | 统一不可变分录与押金命令 |
| `src/server/membership/deposit-policy.ts`、`src/server/settlements/queries.ts` | C4 | 免押金权威读取、已结束待结算候选查询 |
| `src/server/wallet/`、`src/server/membership/`、`src/server/settlements/`、`src/server/gifts/` | C5扩展 | 在C4边界上补充值、权益、消费结算与兑换，继续共用分录 |
| `src/server/reviews/`、`moderation/`、`reports/` | C6 | 评价统计、词库与举报私有数据 |
| `src/server/finance/` | C7 | 报表查询、汇总和同口径CSV |
| `src/worker/outbox-worker.ts` | C1/C3 | C1建立可运行的恢复扫描入口，C3持续投递真实站内通知 |
| `src/server/push/{subscriptions,sender,worker}.ts`、`scripts/run-notification-worker.ts` | C8 | Push渠道消费、重试及订阅维护，生产化已有消费者 |
| `src/lib/api/contracts.ts`、`src/types/domain.ts`（已有） | 各期 | 按已确认协议更新类型，禁止平行再造同名业务类型 |

`src/app` 只作路由组合；C端优先服务端读取/RSC，必要表单与筛选保持客户端组件；B端保留 Ant Design / React Query。共用组件只能按 AGENTS 规定复用/扩展后再新增。表中的目录是责任边界，不要求为对称而创建空模块。

## 4. 权限、会话、幂等与审计

C1拟提供以下契约（实现应补齐具体类型，不把这个示意块直接当可编译代码）：

```ts
type Actor = { userId: string; role: 'customer' | 'dm' | 'manager' | 'boss' };
// requireActor(): Promise<Actor>
// assertPermission(actor, permission, resource?): void
// withCommand(context, work): Promise<Response>
// appendAudit(tx, input): Promise<void>
// appendEvent(tx, event): Promise<void>
```

- 每个API调用权限表与资源所有权判断；页面重定向、隐藏按钮、proxy检查只改善体验，不能当授权边界。DM仍可使用顾客功能，但只编辑自己的DM展示资料。
- 自研 HttpOnly Cookie + Redis Session；argon2id。登录同IP、同手机号分别执行 5次/10分钟限流。禁用、改角色、重置凭证后撤销相应会话。
- C1建议增加 `GET /api/auth/csrf`，返回与当前会话绑定的 `data.csrf_token`；Cookie鉴权写请求校验同源 Origin 与 `X-CSRF-Token`。未登录注册/登录要求可信同源JSON请求，单独限流。
- 资金、押金、兑换、结算、报名、审批使用 `Idempotency-Key`。服务端按 actor + operation + key 唯一约束并保存请求摘要；同键同请求重放返回首次结果，异请求返回409。
- 幂等键不能替代业务唯一性：两把不同幂等键仍不能重复审批、超报、重复结算、超额退款。用数据库事务、条件更新、唯一业务键保护。
- 员工敏感操作、账本与审计在同一事务提交；失败不能留下“成功”日志。不把顾客操作混入 `operation_logs`。日志不得写密码、Session、完整举报正文或举报人身份。
- `withCommand`统一触发审计上下文，真正前后值由业务服务在事务里采集，不能只靠HTTP中间件事后猜测结果。

## 5. 状态与数据边界

| 对象 | 固定状态/关系 | 不能混淆的语义 |
| --- | --- | --- |
| 自主预约申请 | pending / approved / rejected；建议补 `booking_requests` 表 | 待审核不是报名单状态；审批只生成一次场次，是否同时占坑见D01 |
| 场次 | draft / open / full / locked / running / finished / cancelled | full表示坑位满，locked表示人工锁车；不能自动等同 |
| 报名单 | joined / locked / finished / cancelled / jumped | 未锁车取消释放坑位，锁车后走跳车规则 |
| 押金 | 源 `deposits` 保存收退金额、时间、经手人，流水关联deposit | 未处理、未退与没收不能仅凭refund_amount=0判断，必须保留明确动作证据 |
| 结算 | C5建议 `settlements` / `settlement_items` + 唯一业务约束 | finished场次进入待结算，完成结算才消失 |
| 会员 | balance / points / total_topup / level_id 独立 | 等级看total_topup；历史充值事实不等于当前余额 |

场次创建/编辑/取消与报名应使 Redis 场次缓存主动失效。数据库是坑位真相，展示缓存只提升查询性能。合法迁移、操作者、前置条件和关联动作按 C3–C5逐项建表验证，取消及退款政策受D02/D03约束。

源未列但流程必需的建议表：`booking_requests`、`settlements`、`settlement_items`；可靠性建议表：`idempotency_records`、`event_outbox`。它们是本规划的工程补齐，不是额外产品功能；无需微服务或新增外部平台。

## 6. 同一份账本（C4首次实现，C5扩展）

拟新增 `appendJournal(tx, input)`：input含服务端派生的 `actorUserId`、`userId`、`operation`、`businessKey`、`reference:{type,id}`、`moneyLines`，以及C5启用的可选`pointLines`；返回本次资金/积分分录标识。金额行对应源transactions，积分行对应points_ledger。

- 每个收款、退款、充值、消费、兑换、调整有可追溯业务引用和唯一业务键。C4不另建一套“押金账”，C5不复制押金流水逻辑。
- 已提交分录不直接改删；更正通过关联原记录的可审计操作实现，具体冲正规则D05/D06先确定。
- 不把充值与余额消费重复计入店铺现金收入。押金收入/退还/没收和消费分别统计；不擅自实现押金抵扣消费。
- 仅余额支付改变储值余额；现金、微信消费仍记录资金事实并发积分；充值不发消费积分。
- 积分与余额不足、重复提交、并发扣减都必须在服务端阻断。结算的参与账号、明细粒度、发分基数与小数处理按D04冻结后实现。

## 7. 通知事件跨期协议

```ts
type DbEvent = {
  id: string; type: string; occurredAt: string; actorUserId: string | null;
  subjectType: string; subjectId: string; recipientUserIds: string[];
  payload: Record<string, unknown>;
};
```

建议业务事务写outbox，提交后dispatcher幂等写notifications并投Redis队列；站内唯一键为event.id + recipientUserId。C1建立可启动、可恢复扫描的outbox消费者及本地运行命令，C3与应用同时启动并交付真实通知；不能把可执行Worker留到C8才补。队列暂时不可用可重试，不回滚已成功的账务，也不丢业务事件。payload只放白名单展示数据和引用，不放可被普通收件人读到的敏感身份。

| 首次周期 | 事件类型 | 站内接收人/作用 | C8 Push |
| --- | --- | --- | --- |
| C2 | catalog.changed / settings.changed | 刷新内容和配置缓存，不强制通知顾客 | 否 |
| C3 | booking_request.created | 有审核权限员工 | 否 |
| C3 | booking_request.approved / rejected | 发起顾客 | 仅approved |
| C3 | booking.joined / cancelled | 相应员工；顾客查看自己的预约状态 | 否 |
| C3 | session.capacity_reached | 人数达标提醒给员工，是否可锁车另按D02校验 | 否 |
| C4 | session.locked / cancelled | 受影响报名顾客 | 是 |
| C4 | session.started / finished / booking.jumped | 更新状态和后续处理，不扩大Push范围 | 否 |
| C4 | deposit.received / refunded / forfeited | 对应顾客资金状态与员工对账 | 否 |
| C4 | settlement.required | 带本DM优先及有结算权限员工 | 否 |
| C5 | wallet.topped_up / adjusted、points.changed、membership.upgraded、gift.redeemed、settlement.completed | 受影响顾客；资金积分升级通知，合并同业务重复提示 | 否 |
| C6 | review.created / deleted | 重算对应剧本/DM评分 | 否 |
| C6 | review.replied | 评价作者 | 否 |
| C6 | report.created | 仅BOSS，通知不含举报人或举报正文 | 否 |

C3必须交付 `GET /api/notifications`、`POST /api/notifications/read` 和未读数，C4–C6当期接入各自产生的通知；不把站内铃铛拖到C8。C8增加VAPID Push渠道、权限邀请、订阅管理、失败重试和死订阅清理，预留SMS/Email接口但不接入真实短信邮箱。

## 8. 公私媒体、离线与测试约定

- 公有内容素材可由Nginx `/uploads`直出；举报截图必须使用私有目录和鉴权读取，猜中URL也不能越权。备份同时包含公私媒体。
- 所有上传按源要求≤5MB、类型白名单、sharp重编码与缩略图。COS媒体驱动留接口；COS异地备份是本期必交付。
- 离线所有页面的访问/快照范围需D12确认；至少不可公共缓存另一账号的钱包/财务/举报数据，登出、换号、角色失效清理关联缓存。离线写操作禁用，不加入资金请求的后台重放队列。
- 计划中HTTP测试使用 `BASE_URL`、`SESSION_CUSTOMER_COOKIE`、`SESSION_DM_COOKIE`、`SESSION_MANAGER_COOKIE`、`SESSION_BOSS_COOKIE`；Cookie来自测试用户真实登录，不使用生产身份。写请求先通过 `/api/auth/csrf`取token。
- 测试在独立测试数据库/Redis命名空间进行，创建有稳定标识的样本。未来新增集成脚本应运行Node现有test工具链；不能把现有7个前端单测或HTTP页面200当作真实业务验收。
- 每期留下迁移版本、测试输出、演示路径和未通过项；视觉与浏览器交互证据单独记录，不能由build或HTTP检查替代。

# C7 开发文档：BOSS 财务报表、日志查询与角色工作台

> 执行提示：同一会话使用 `superpowers:subagent-driven-development`；独立会话使用 `superpowers:executing-plans`。先冻结 D10 和核验 C4/C5 账务协议，再按 C7-T1～T5 执行；本文是待执行计划，测试样例尚未执行。

**Goal：** 让 BOSS 按日/周/月、剧本、DM 和支付方式核对真实资金/积分流水，导出一致数据，并从员工日志追溯敏感操作；各员工只进入权限内工作台。
**Architecture：** 复用 C4/C5 不可变资金/积分记录构建只读查询模型；报表与 CSV 共用查询服务；后台聚合页只组合已有领域服务和入口，集中鉴权不下放浏览器。
**Tech Stack：** 当前 Next.js Route Handlers、Prisma/MySQL 8、TypeScript Decimal、Ant Design/React Query、既有后台共享组件；先使用索引和分页，不为小店引入数据仓库或微服务。
**Spec：** `docs/设计文档.md` §2.2、§3.2、§5.1～5.2、§6.2～6.3、§7.3、§10.1/10.4、§12.1；`AGENTS.md` 与 `docs/verification.md` 是现状基线。

## Global Constraints

- 原句：“开发页面时，**必须优先复用已有组件**。先检查 `components/ui`、`components/layout` 和相关 `features/*`。”
- 原句：“已有组件可以通过 **props、variant、className、children/slot** 扩展时，**必须优先扩展，而不是重新创建相似组件**。”
- 原句：“**只有现有组件经过合理扩展仍无法满足需求时，才新增组件**。”
- 原句：“不做支付：充值、消费、押金均通过微信私下转账，由商家在后台手动记账。”
- 原句：“仅 BOSS 可查；顾客操作不记录。”原句：“**明确禁止**「BOSS 登录顾客账号」功能（需求方确认），会员余额调整只能通过留痕的管理操作。”
- 遵守 [共享协议](2026-09-09-shared-contracts.md) 的 `/api`、ID 字符串、Decimal 金额、RBAC、事务和幂等约定；未决事项由 [决策记录](2026-09-09-decisions.md) 冻结，不以原型文案替代业务规则。
- 报表是业务账务的展示与对账，不自行成为法定会计/税务报表；不接在线支付、不新增积分估值或礼品电商订单。

## 现状、前置与范围

- 当前 `admin-finance.tsx` 的金额、流水、导出均为演示数据，时间选项是“本月/本季/本年”；应纠正为需求的日/周/月真实汇总。
- 当前财务聚合页嵌入演示结算表单；C5 已交付 `/admin/sessions/settlement`，本期保留视觉入口并导向该页，不复制结算命令。
- 前置：C1 员工管理/鉴权/审计；C2 内容/设置；C3～C4 状态与押金；C5 充值、结算、积分、兑换和冲正记录。C6 可并行，C7 退出前完成其治理入口接入。
- `/admin/staff` 在 C1、`/admin/levels` 在 C5、`/admin/words` 与 `/admin/reports` 在 C6 完成；本期只验证权限和导航，不重建这些管理模块。
- 输入：C4/C5 已确认资金科目、结算项、押金状态和不可变分录；输出：财务 API/CSV、日志查询、真实角色工作台和可逐笔复核的对账数据集。
- 不包含：新的充值/退款/结算引擎、任意编辑历史流水、老板代登录、举报处理、员工薪资/利润核算、跨门店合并报表。
- **D10 在 C7-T1 开始前冻结：** 业务时区、周起始、跨期更正与跳车没收列示口径。建议 `Asia/Shanghai`、周一开始；仅为提案，不当作源文档既定事实。
- D04/D05/D06 必须继承 C4/C5 的冻结值；若发现口径冲突，先补决策与迁移方案，不能在报表层偷偷改交易历史。

## 报表口径与读取模型

| 项目 | 计量与对账规则 |
| --- | --- |
| 时间 | API `from`、`to` 为明确时区的时间边界，采用 `[from,to)`；按 D10 转换业务日/周/月，响应带 `timezone`、`as_of` 和口径版本 |
| 充值收入 | 单独累计有效充值及对应冲正；不能与余额消费相加后当作再次现金入账 |
| 消费 | 余额、现金、微信分别累计结算实付额；总消费 = 三种方式消费之和，金额按 C5 折扣/归属规则计算 |
| 外部收款净额 | 充值 + 现金/微信消费 + 押金实收 − 押金退款 ± 已定义外部资金更正；余额消费不再次贡献现金流 |
| 押金 | 分列收取、退还、未退余额与跳车没收；没收是已收押金的状态/科目变化，不能再记一笔现金流入，列示时点按 D10 |
| 积分兑换 | 展示兑换次数、扣减积分和礼品；积分是整数数量，不转换成人民币收入/费用，不与金额混加 |
| 剧本/DM | 消费按 C5 结算项关联的剧本及带本 DM 归属；无关联充值列“未关联”，不强行分配、丢弃或多对多重复计数 |
| 支付方式 | 依原记录 `balance/cash/wechat` 分类；不根据当前会员等级推测，不把积分兑换归为现金 |
| 更正 | 使用原交易与冲正业务键关联，按冻结时点计入相应期间；历史分录不可更新/删除，页面能解释跨期差异 |
| 一致性 | 同一查询快照中的汇总/明细/导出可追溯至相同业务记录；SQL join 必须防止一场多报名/多回复造成流水倍增 |

金额 API 一律十进制字符串；服务端用 Decimal 聚合，前端只格式化展示。无数据时各金额为 `"0.00"`、计数为 0，不沿用演示金额。报表只读、不产生资金事务；员工敏感写入与审计在前置周期已实现。

## 接口与文件边界

| API | 查询与权限 |
| --- | --- |
| `GET /api/admin/finance` | boss；`dim=day|week|month&from=&to=&script_id=&dm_id=&method=&page=`；响应 summary、groups、rows、page_info 和口径元数据 |
| `GET /api/admin/finance/export` | boss；与报表完全同样的筛选/快照参数；成功返回 UTF-8 CSV 文件，错误仍返回统一 JSON 包装 |
| `GET /api/admin/logs` | boss；按 employee_id、action、target_type、target_id、from/to 分页，稳定 `created_at,id` 排序 |
| `GET /api/admin/overview`（拟新增） | DM/manager/boss；仅返回当前角色授权的今日场次/待办；DM 优先本人带本待结算，不自动扩大 D11 数据范围 |
| 工作台复用 | 待审核/待结算/押金读取调用 C3～C5 服务；治理入口调用 C6 服务，不另建“已处理举报”等状态 |
| 失败语义 | 401 未登录、403 非 boss 报表/日志/导出、422 日期/维度不合法、500 查询故障；无数据是 200 空结果，不能伪装故障为空表 |

已有文件：`src/features/admin/{admin-finance,admin-dashboard,admin-ops,admin-shared,admin-providers}.tsx`、`src/app/admin/{page,finance/page,ops/page}.tsx`、`prisma/schema.prisma`、`src/lib/api/contracts.ts`。
拟新增：`src/server/finance/{query,definitions,csv}.ts`、`src/server/audit/queries.ts`、`src/server/admin/overview.ts`；`src/app/api/admin/finance/route.ts`、`src/app/api/admin/finance/export/route.ts`、`src/app/api/admin/logs/route.ts`、`src/app/api/admin/overview/route.ts`；`src/app/admin/logs/page.tsx`、`src/features/admin/{admin-logs,finance-filters}.tsx`；不新增第二套 ledger 服务。

## C7-T1：冻结口径并实现真实汇总查询

- [ ] 将 D10 结果和 C4/C5 科目映射写入 `finance/definitions.ts`，为充值、三类消费、押金收退/没收、积分兑换逐项建立预期结果 fixture。
- [ ] 审查 `transactions`、`deposits`、`settlements/items`、`points_ledger`、`gift_redemptions` 索引及关联，先按业务键去重，再聚合；不直接跨多个一对多表求和。
- [ ] `requireActor()` + `assertPermission(actor, 'finance.read')` 在服务端执行；JSON 与 RSC 数据均不预先向非 boss 返回完整财务后再由前端隐藏。
- [ ] 统一解析时间、筛选与分页，使用参数化 Prisma/SQL；from≥to、非法日期、未知维度/支付方式返回 422；长区间采用分页和受控导出资源限制。
- [ ] 同次查询用一致数据库读取快照，返回 `as_of` 及账本高水位标识；押金状态按截至该时点的分录还原，不能拿当前可变状态冒充历史快照；记录代表性数据的解释计划与耗时基线。

## C7-T2：财务页面与安全 CSV 导出

- [ ] 用真实查询替换 `metricSets`、`ledgers`；保留原稿 MetricGrid、PageHead、Segmented、表格样式，并扩展日/周/月、区间、剧本、DM、支付方式筛选。
- [ ] 将结算操作导向 C5 页面，保留“待结算”概览入口；DM/manager 可用工作台记账，但不能借旧财务 URL 访问 BOSS 报表。
- [ ] 导出复用 `finance/query.ts` 与 `definitions.ts`，包含相同口径列、筛选条件、时间边界、币种/积分单位，分页遍历全部命中记录，不只导出当前页。
- [ ] 为可重现对账，导出携带报表 `as_of` 截止并使用同口径；若无法重现已过期快照，明确要求刷新报表，不返回表面相同的不同结果。
- [ ] CSV 正确转义逗号、引号、换行；对文本字段以 `= + - @` 等开头的公式注入做安全编码，合法金额列不被随意改成文本；支持中文 Excel 打开。
- [ ] 响应设置 `Content-Disposition`、`text/csv; charset=utf-8`、`Cache-Control: no-store`；途中失败不提示导出完成，客户端保留筛选供重试。

## C7-T3：员工操作日志查询与覆盖补验

- [ ] 新增只读日志页面复用 AdminFrame、PageHead、现有筛选和表格；显示操作人、动作、对象、前后值摘要、时间、IP，不提供改删日志 UI/API。
- [ ] 接入 C1 `operation_logs`，查询用白名单字段，不把密码哈希、Session、证据地址、举报人身份或完整私密正文拼入摘要。
- [ ] 逐项核对余额/积分调整、充值、消费、押金收退、场次状态、内容增删改、评价管理删除、等级、词库、员工管理的敏感写与审计同事务。
- [ ] 前置服务漏记由所属服务补齐 `appendAudit(tx, ...)`，本期日志查询不伪造历史记录；顾客报名、自删评价等不记员工操作日志。
- [ ] 操作 IP 只接受可信 Nginx 代理链并使用 C1 统一提取；查询失败返回真实错误，权限失败不得返回摘要、记录总数或缓存片段。

## C7-T4：角色工作台与既有治理导航

- [ ] `admin-dashboard.tsx` 接入真实今日场次/待办；DM 首屏优先本人待结算，manager 显示权限内运营待办，boss 增加财务/日志和治理导航。
- [ ] 原 `/admin/content`、`/admin/ops` 聚合页保留，链接源要求的 `/admin/scripts`、`/admin/costumes`、`/admin/dms`、`/admin/reviews` 等细分页；业务动作复用已有命令。
- [ ] `/admin/staff`、`/admin/levels`、`/admin/words`、`/admin/reports` 链接按角色过滤，直接请求仍由服务端拒绝；只更新入口，不重做这些页面。
- [ ] 非 boss 工作台和小铃铛不包含举报计数/内容/真实身份；boss 举报入口仅查看与最小已读，无处理工作流或处理完成按钮。
- [ ] React Query key 包含账号/角色与查询参数；登出、禁用或降权后失效数据并重新鉴权，不把上个账号的 BOSS 财务显示给后续登录者。

## C7-T5：对账样本、权限矩阵与期末证据

- [ ] 拟新增 `tests/unit/finance-definitions.test.ts`、`tests/integration/cycle07-finance.mjs`、`tests/e2e/admin-roles.spec.ts`，隔离 fixture 覆盖跨日/月、零金额结果、退款、没收、跨期冲正、未关联与中文/CSV 特殊字符。
- [ ] 用独立预期表核验业务输入：充值 500.00、余额消费 200.00、现金消费 100.00、微信消费 150.00；两笔独立押金分别收取 20.00 和 40.00，前者全额退还 20.00，后者全额没收 40.00；该期间外部净收 790.00，总消费 450.00。
- [ ] 上述第二笔押金没收 40.00 不再增加外部净收，没收列示依 D10；两笔均按全退/全没收处理，不假定 D03 允许同笔部分退款。流水正负号映射依 D05 实际冻结契约；此业务输入样本不代表押金抵消费或没收归类政策已确认。兑换 100 积分只改积分列，各维度汇总回到同一总额。
- [ ] 记录页面、接口、CSV 与数据库预期表比对结果；补齐后台键盘/移动筛选/空态/错误态回归，不把图表存在作为数据正确证据。

| 验收编号 | 可观察通过条件 |
| --- | --- |
| AC-C7-01 | 日/周/月边界与冻结时区一致；跨月/跨周样本只落入一个桶，from≥to 返回 422 |
| AC-C7-02 | 上述 fixture 得到净收 790.00、消费 450.00；余额消费未重复计入现金，积分未与金额相加 |
| AC-C7-03 | 按剧本/DM/支付方式分组与明细合计一致，无关联记录有明确分组，无一对多 join 重复记账 |
| AC-C7-04 | 报表/CSV 同筛选、同截止、同口径逐项一致，导出包含全部页；中文和特殊字符可正确读取 |
| AC-C7-05 | 顾客/DM/manager 请求财务、CSV、日志均 403；未登录 401；RSC、预取和缓存没有越权数据 |
| AC-C7-06 | 敏感员工操作均有同事务审计；失败事务无成功日志，顾客操作无员工日志，日志无敏感正文/密钥 |
| AC-C7-07 | DM 工作台优先本人待结算；降权/换号后不残留 BOSS 数据；已有 staff/levels/words/reports 权限通过 |
| AC-C7-08 | 数据库/导出故障显示可重试错误，无假空表或假成功；查询不改变余额、积分、押金或流水 |
| AC-C7-09 | 冲正不修改旧流水，跨期更正按 D10 可解释；旧聚合页可进入全部权限内细分管理页 |

## HTTP 样例与可执行接口测试

先在隔离数据库准备 C7-T5 对账样本并通过 C1 登录获取 Session；示例日期使用已冻结时区转换后的边界。接口为待新增实现，不代表当前项目已有真实报表。

```http
GET /api/admin/finance?dim=day&from=2026-09-01T00%3A00%3A00%2B08%3A00&to=2026-10-01T00%3A00%3A00%2B08%3A00 HTTP/1.1
Cookie: <BOSS Session>

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{"code":0,"message":"查询成功","data":{"summary":{"topup_amount":"500.00","consumption_amount":"450.00","external_net_amount":"790.00","gift_points":100},"timezone":"Asia/Shanghai","as_of":"2026-10-01T00:00:00+08:00"}}
```

以上响应仅节选 summary 和口径元字段；完整实现还需返回 groups、rows、page_info，并保证与 summary 一致。时区若 D10 冻结为其他值，测试窗口和预期同步修改。
将以下内容保存为拟新增 `tests/integration/cycle07-finance.mjs`，设置 `BASE_URL`、`SESSION_BOSS_COOKIE`、`SESSION_MANAGER_COOKIE`、`REPORT_FROM`、`REPORT_TO` 后运行 `node tests/integration/cycle07-finance.mjs`。

```js
import assert from 'node:assert/strict';
for (const k of ['BASE_URL','SESSION_BOSS_COOKIE','SESSION_MANAGER_COOKIE','REPORT_FROM','REPORT_TO']) assert.ok(process.env[k], k);
const base = process.env.BASE_URL;
const q = new URLSearchParams({dim:'day',from:process.env.REPORT_FROM,to:process.env.REPORT_TO});
const response = await fetch(`${base}/api/admin/finance?${q}`, {headers:{Cookie:process.env.SESSION_BOSS_COOKIE}});
assert.equal(response.status, 200); const body = await response.json(); assert.equal(body.code, 0);
assert.equal(body.data.summary.external_net_amount, '790.00');
assert.equal(body.data.summary.consumption_amount, '450.00');
for (const path of ['/api/admin/finance','/api/admin/finance/export','/api/admin/logs']) {
  const denied = await fetch(`${base}${path}?${q}`, {headers:{Cookie:process.env.SESSION_MANAGER_COOKIE}});
  assert.equal(denied.status, 403, path);
}
const csv = await fetch(`${base}/api/admin/finance/export?${q}`, {headers:{Cookie:process.env.SESSION_BOSS_COOKIE}});
assert.equal(csv.status, 200); assert.match(csv.headers.get('content-type') ?? '', /text\/csv/);
assert.ok((await csv.text()).length > 0);
```

## 期末演示、交接与回退

依次演示真实分录 → 日/周/月及三类业务维度 → 明细对账 → CSV → 员工操作日志 → DM/manager/boss 工作台差异 → 降权后的直接 API 拒绝；另附 AC-C7-04 的逐单元 CSV 核对结果，不能只使用上面的非空冒烟样例。
交给 C8 财务/日志/举报的敏感页面清单、缓存隔离要求、查询快照协议和验收数据集；D12 未冻结前，不宣称这些页面已支持安全离线。将实际命令、结果、截图和缺陷关闭记录写入 `docs/verification.md`。
回退应用查询版本或临时关闭故障报表/导出入口，保留 C4/C5 已完成账务及审计；不得通过删除流水、重算覆盖余额或去掉鉴权来“修复报表”。索引变更按迁移记录回退，先评估线上查询影响。

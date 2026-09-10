# C6 开发文档：评价、敏感词与匿名举报

> 执行提示：同一会话使用 `superpowers:subagent-driven-development`；独立会话使用 `superpowers:executing-plans`。先读共享协议与决策记录，再按 C6-T1～T5 执行；本文是待执行计划，测试样例尚未执行。

**Goal：** 将剧本/DM 评价、商家回复、自己删除、管理删除、DFA 拦截与 BOSS 举报查询接入真实数据，形成可验证的隐私与权限闭环。
**Architecture：** 薄 Route Handler → 集中鉴权 → 评价/举报服务 → Prisma 事务；词库由 MySQL 持久化、Redis 缓存；C3 通知事件和 C2 私有媒体能力直接复用。
**Tech Stack：** 当前 Next.js App Router、TypeScript strict、Prisma/MySQL 8、Redis 7、既有 React/AntD 组件；DFA 为服务端纯函数，不引入第三方审核平台。
**Spec：** `docs/设计文档.md` §2.2、§3.3～3.4、§4.3/4.5/4.7/4.8、§5.1～5.2、§6.2、§7.2～7.3、§10.1、§12.7。

## Global Constraints

- 原句：“开发页面时，**必须优先复用已有组件**。先检查 `components/ui`、`components/layout` 和相关 `features/*`。”
- 原句：“已有组件可以通过 **props、variant、className、children/slot** 扩展时，**必须优先扩展，而不是重新创建相似组件**。”
- 原句：“**只有现有组件经过合理扩展仍无法满足需求时，才新增组件**。”
- 原句：“评价门槛：账号有**储值记录或积分余额**才能发评价（防刷评）。”
- 原句：“需求方确认**不加**拦截记录功能，接受该取舍。”
- 遵守 [共享协议](2026-09-09-shared-contracts.md) 的 API、ID、鉴权、事务、错误码、事件和幂等约定；范围冲突以 [决策记录](2026-09-09-decisions.md) 冻结结论为准。
- 举报仅 BOSS 可看真实信息；无在线处理、分派、回复、处理状态或顾客进度查询。源表 `read_at` 只允许最小已读标记。

## 现状、前置与周期边界

- 当前 `ReviewsPage.tsx`、剧本/DM 详情使用本地演示评价；`ReportPage.tsx` 只生成临时状态，截图未上传；`admin-ops.tsx` 的“标记处理”不是需求允许的真实功能。
- 开始条件：C1 Session/RBAC/审计可用；C2 目标实体与公私分离媒体可用；C3 站内通知可用；C5 储值历史、积分余额和已结束场次可查询。
- 结束条件：真实评价即时显示、平均分准确、DFA 热更新、举报隔离、服务端权限和失败路径通过；不以页面出现成功 Toast 作为验收。
- 不包含：限制只能评价玩过的剧本、消费加权评分、评价审批队列、敏感词拦截历史、举报案件管理、Web Push、短信或邮件。
- 与 C7 可并行；共享 `admin-ops.tsx` 的修改串行合并，本期先完成治理入口，C7 只接入角色工作台，不重写本期服务。
- 输入：C5 真实资格查询、C2 目标/附件 ID、C3 `appendEvent`；输出：评价/举报 API、治理页面、通知事件及下述验收证据。

## 数据与接口契约

| 类型 | 本期内容与权限 |
| --- | --- |
| 表（拟新增） | `reviews`、`review_replies`、`sensitive_words`、`reports`；字段以设计源为准，补目标/时间、作者/时间、举报时间索引 |
| 评价状态 | 新增成功只写 `visible`；删除写 `deleted` 和 `deleted_by`；源枚举 `blocked` 可保留兼容，但拦截时不创建记录、不保存正文 |
| 资格 | 有有效历史储值记录 **或** 当前 `points > 0`；余额已用完且积分为 0 的历史储值账号仍可评价，不要求参加过目标场次 |
| 统计 | 剧本/DM 的 `avg_rating`、`review_count` 只计算 visible 评价；增加与删除必须在同一事务中更新并防止并发覆盖 |
| `POST /api/reviews` | 登录且符合评价资格；`target_type` 为 script/dm，ID 字符串，rating 为 1～5 整数，content 非空 |
| `GET /api/me/reviews`（拟新增） | 只返回当前账号评价，按对象类型筛选、分页；无需再次满足发布资格 |
| `DELETE /api/reviews/:id` | 作者本人随时可删自己的评价；不能删除他人的评价，资格丧失不妨碍删除 |
| `POST /api/reviews/:id/replies` | DM/manager/boss 可回复；普通顾客不可回复；官方身份由服务端生成，不能信任请求中的标识 |
| `/api/admin/reviews` | 拟新增 GET 列表供员工回复使用；DELETE `/:id` 仅 manager/boss；POST `/:id/replies` 复用同一回复服务 |
| `GET/PUT /api/admin/words` | 仅 boss；PUT 采用规范化去重后的完整词集和版本，过期版本返回 409 |
| `POST /api/reports` | 登录账号提交；类型与目标互斥匹配；不要求储值或积分，成功只返回“已收到反馈”与空 data |
| `GET /api/admin/reports` | 仅 boss 可联表读取举报人真实信息、对象、内容、时间和私有图片；分页且响应 `Cache-Control: no-store` |
| `POST /api/admin/reports/:id/read`（拟新增） | 仅 boss，条件写首次 `read_at`；再次调用保持首次时间，不增设其他处理状态 |
| 私有证据接口 | 使用 C2 的媒体服务生成受控读取路由；提交时验证上传者和私有用途，BOSS 查询逐次鉴权，禁止公开 `/uploads` URL |

写入接口统一校验 Session、来源/CSRF 与参数；创建评价、回复、举报接受 `Idempotency-Key` 防止网络重试重复提交，同键异请求返回 409。正文长度和词集上限作为技术参数写入共享校验，不添加新的产品审批门槛。

## C6-T1：评价存储与服务端资格

**文件：** 修改 `prisma/schema.prisma`、`src/lib/api/contracts.ts`；拟新增 `src/server/reviews/{service,queries,validation}.ts`、`src/app/api/reviews/route.ts`、`src/app/api/reviews/[id]/route.ts`、`src/app/api/me/reviews/route.ts`。

- [ ] 从 C5 历史储值记录判断“曾有储值”，不以余额或等级代替；发生充值纠错时的资格计算继承 D06 冻结结论，不自行把历史记录抹掉。
- [ ] 校验对象存在及可被评价；不接受任意 `user_id`，发布者由 `requireActor()` 决定；新增评分/目标参数边界测试。
- [ ] 事务内创建评价并更新对象统计，同时写 `review.created`/`review.deleted` 事件使详情缓存失效；并发创建/删除锁定同一统计对象或采用等价原子方案，最终 count 与重新聚合一致。
- [ ] 删自己的评价条件限定作者；管理删除先 `assertPermission`，业务变化与 `appendAudit(tx, ...)` 同事务，顾客自删不记员工日志。
- [ ] 重复删除返回已删除结果，不二次减统计；事务任一步失败不留下评价、孤立统计或成功响应。

## C6-T2：DFA 与敏感词管理

**文件：** 拟新增 `src/server/reviews/{dfa,word-store}.ts`、`src/app/api/admin/words/route.ts`、`src/app/admin/words/page.tsx`、`src/features/admin/admin-words.tsx`；复用 `src/features/admin/admin-shared.tsx`。

- [ ] DFA 覆盖前后缀重叠、中文、重复词、空词和 Unicode 标准化；评价正文与公开回复提交前走同一过滤入口。
- [ ] boss 更新词库时在事务内保存版本并写审计；审计只记词集变更摘要，不混入任何顾客被拦截正文。
- [ ] 提交后更新 Redis 版本/缓存；多实例读到新版本后替换 DFA。Redis 不可用时回源数据库，过滤器不可构建则返回 500，不能绕过过滤发布。
- [ ] 命中只返回可理解的 422 错误；不写 `reviews`、审核表、操作日志正文、请求日志正文或通知正文。
- [ ] 初次读取失败、冲突更新和版本切换分别验收；新词生效不追溯删除已发布评价，不新增历史审查任务。

## C6-T3：详情评价、回复与双对象引导

**文件：** 修改 `src/features/catalog/{script-detail-screen,dm-detail-screen}.tsx`、`src/features/member/{ReviewsPage,HistoryDetailPage,components}.tsx`、`src/features/admin/admin-ops.tsx`；拟新增 `src/features/reviews/{ReviewComposer,ReviewThread}.tsx`、`src/app/admin/reviews/page.tsx`；拟新增 `src/app/api/reviews/[id]/replies/route.ts`、`src/app/api/admin/reviews/route.ts`、`src/app/api/admin/reviews/[id]/route.ts`、`src/app/api/admin/reviews/[id]/replies/route.ts`。

- [ ] 先扩展既有 `ReviewCard` 和基础表单；需要跨详情复用时再提取 ReviewComposer/ReviewThread，保留原稿间距、字体、评分和嵌套回复样式。
- [ ] 详情显示系统 ID/昵称、等级徽章、评分和正文；用 React 文本输出防止 HTML 执行，删除评价同时移除公开回复展示。
- [ ] 历史详情在场次结束后提供剧本和主 DM 两个独立评分区及“跳过”；任一失败只重试失败对象，不重复成功评价。
- [ ] 服务器提交成功后刷新列表/统计；失败保留输入并恢复按钮，删除失败保留原卡片；不提前显示已保存的假状态。
- [ ] 回复成功同事务 `appendEvent` 写 `review.replied`，C3 dispatcher 给评价作者发站内通知；通知失败可重投，不回滚已提交回复。

## C6-T4：匿名举报与 BOSS 只读入口

**文件：** 修改 `src/features/member/ReportPage.tsx`、`src/features/admin/admin-ops.tsx`；拟新增 `src/server/reports/{service,queries,validation}.ts`、`src/app/api/reports/route.ts`、`src/app/api/admin/reports/route.ts`、`src/app/api/admin/reports/[id]/read/route.ts`、`src/app/admin/reports/page.tsx`、`src/features/admin/admin-reports.tsx`。

- [ ] 表单使用真实 DM/剧本 ID；截图复用 C2 私有上传，≤5MB、白名单、sharp 重编码；失败保留表单，未提交临时附件按 C2 清理策略回收。
- [ ] `reporter_user_id` 由 Session 写入；请求体不能伪造举报人或引用他人的上传附件；成功页面仅“已收到反馈”，不提供查询入口。
- [ ] 删除原型“标记处理/线下处理中”按钮与状态；BOSS 列表和详情仅查看，已读接口只能写 `read_at`。
- [ ] 本期产生 `report.created` 并复用C3通知服务，只向boss发送“收到新举报”及受控链接；普通员工通知、聚合计数、日志、页面预取均不得携带举报人身份或举报正文。
- [ ] 举报详情和证据不进入公共缓存；非 boss 即使猜到 ID 或附件路径也不得读取；最小已读审计仅记操作人、举报 ID、前后已读时间。

## C6-T5：联调、隐私与回归验收

**文件：** 拟新增 `tests/unit/reviews.test.ts`、`tests/integration/cycle06-reviews-reports.mjs`、`tests/e2e/reviews-reports.spec.ts`；扩展 `docs/verification.md`。

- [ ] 建立隔离 fixture：有历史储值但余额/积分均 0、仅积分>0、从未储值且积分0、普通顾客、DM、manager、boss、两条目标实体与私有截图。
- [ ] 覆盖资格、并发统计、事务回滚、幂等、词库缓存故障、越权删除和跨账号附件引用；只对隔离测试数据执行删除。
- [ ] 检查浏览器响应、服务端请求日志、普通员工小铃铛和静态资源路径，确认举报真实信息只出现在 BOSS 受控响应。

| 验收编号 | 可观察通过条件 |
| --- | --- |
| AC-C6-01 | 两种合法资格均可评任意有效目标；无资格 422，未登录 401，rating=6 为 422，数据库无新增 |
| AC-C6-02 | 命中词返回 422；评价/审计/请求日志均无被拦截正文；热更新后新请求立即使用新词库 |
| AC-C6-03 | 20 次并发发布/删除后 count 和 avg 与 visible 评价重新聚合一致，无负计数或重复幂等记录 |
| AC-C6-04 | 作者自删成功；另一顾客和 DM 管理删除均 403；manager/boss 删除成功且一笔审计对应一笔实际删除 |
| AC-C6-05 | DM/manager/boss 回复成功并通知作者；普通顾客回复 403；重试只生成一次回复和一次站内通知 |
| AC-C6-06 | 玩后可分别评价剧本/DM或跳过；没有游玩记录不被当作发布权限门槛 |
| AC-C6-07 | 举报提交成功无举报人字段；非 boss 的列表/证据读取均失败；boss 能看到真实信息和有效截图 |
| AC-C6-08 | 已读重复提交保持首次时间；不存在“处理/分派/回复”API；用户无举报进度查询；普通日志和通知不泄露身份 |
| AC-C6-09 | 事务、数据库或私有上传故障不显示假成功；故障恢复重试无重复记录；既有页面和组件交互回归通过 |

## HTTP 样例与可执行接口测试

先在隔离 MySQL/Redis 中运行本周期 fixture 并通过 C1 登录接口获取 Cookie/CSRF；以下 ID 为示例，不能直接对生产运行。

```http
POST /api/reviews HTTP/1.1
Content-Type: application/json
Cookie: <历史储值账号 Session>
Origin: <BASE_URL 对应的 origin>
X-CSRF-Token: <该 Session 的令牌>
Idempotency-Key: c6-example-review-1

{"target_type":"script","target_id":"101","rating":5,"content":"主持节奏清楚，故事体验完整。"}

HTTP/1.1 201 Created
{"code":0,"message":"评价已发布","data":{"id":"301","target_type":"script","target_id":"101","rating":5}}
```

将下列代码保存为拟新增 `tests/integration/cycle06-reviews-reports.mjs`，配置 `BASE_URL`、`SESSION_CUSTOMER_COOKIE`（历史储值资格）、`SESSION_DM_COOKIE`、`SCRIPT_ID` 后运行 `node tests/integration/cycle06-reviews-reports.mjs`。这是待实现接口的验收样例，不代表当前通过。

```js
import assert from 'node:assert/strict';
const base = process.env.BASE_URL;
for (const k of ['BASE_URL','SESSION_CUSTOMER_COOKIE','SESSION_DM_COOKIE','SCRIPT_ID']) assert.ok(process.env[k], k);
const csrfResponse = await fetch(`${base}/api/auth/csrf`, {headers:{Cookie:process.env.SESSION_CUSTOMER_COOKIE}});
assert.equal(csrfResponse.status, 200); const csrf = (await csrfResponse.json()).data.csrf_token;
const headers = { 'Content-Type':'application/json', Cookie:process.env.SESSION_CUSTOMER_COOKIE, Origin:new URL(base).origin, 'X-CSRF-Token':csrf, 'Idempotency-Key':`c6-${Date.now()}` };
const body = JSON.stringify({target_type:'script',target_id:process.env.SCRIPT_ID,rating:5,content:'节奏清楚，体验完整。'});
const created = await fetch(`${base}/api/reviews`, {method:'POST',headers,body});
assert.equal(created.status, 201); const first = await created.json(); assert.equal(first.code, 0);
const retried = await fetch(`${base}/api/reviews`, {method:'POST',headers,body});
assert.equal(retried.status, 201); assert.equal((await retried.json()).data.id, first.data.id);
const denied = await fetch(`${base}/api/admin/reports`, {headers:{Cookie:process.env.SESSION_DM_COOKIE}});
assert.equal(denied.status, 403); const error = await denied.json(); assert.ok(error.code >= 2000 && error.code < 3000);
assert.ok(!JSON.stringify(error).includes('reporter_user_id'));
```

## 期末演示、交接与回退

演示顺序：历史储值账号发剧本评价 → 双对象引导 → DM 回复与小铃铛 → 自删与管理删 → boss 热更新词库并拦截 → 顾客提交私有举报 → DM 越权失败 → boss 查看并已读。
交给 C7 评价治理/词库/举报的已验收页面和受控查询入口；交给 C8 举报敏感缓存标记及只限站内的通知类型。记录测试命令、实际结果、截图和未关闭缺陷，未通过项阻止本周期退出。
回退时停用本期写入口并回退应用版本；保留已提交评价、词库、举报和审计，禁止为恢复旧 UI 删除生产数据；媒体读取继续维持私有鉴权，通知 outbox 保留可重投。

# 一期需求覆盖矩阵

版本：2026-09-09。源：[设计文档](../../设计文档.md) v1.0（2025-09），本轮已完整读取770行并核对当前项目内容。源文件SHA-256：`de4942defdc4c48f9d5a692c197d3b7b501bf4b44385a21975a0def4c3af6f97`。

本表表示**已纳入计划的覆盖关系**，不表示功能已实现或验收通过。现有前端仅作为复用基线；所有真实业务验收仍待各周期执行。`C1–C8` 链接见下表，`Tn` 是工作包，`AC` 是对应周期可判定验收项；完整业务需要跨期时列出全部归属。

| 编号 | 周期文档 |
| --- | --- |
| C1 | [基础、账号权限与审计](2026-09-09-cycle-01-foundation.md) |
| C2 | [内容与媒体](2026-09-09-cycle-02-content-media.md) |
| C3 | [场次与预约](2026-09-09-cycle-03-booking.md) |
| C4 | [押金与履约](2026-09-09-cycle-04-deposits.md) |
| C5 | [会员、结算与积分](2026-09-09-cycle-05-membership-ledger.md) |
| C6 | [评价与举报](2026-09-09-cycle-06-reviews-reports.md) |
| C7 | [财务与运营治理](2026-09-09-cycle-07-boss-operations.md) |
| C8 | [PWA与上线验收](2026-09-09-cycle-08-pwa-release.md) |

## 1. 功能与非功能需求

| 需求ID | 源章节 | 需求及边界 | 归属工作包 | 主要验收依据 |
| --- | --- | --- | --- | --- |
| R01 | §1、§11、附录 | 单店、一期全做完、个人可维护的Next.js单体 | C1-T1，全部周期，C8-T4 | 总览范围；AC-C8-06 |
| R02 | §2、§7.1、§10.1 | 四角色、DM兼顾客身份、手机号密码注册登录、本人资料 | C1-T2/T3 | AC-C1-02/04/05 |
| R03 | §8、§10.1 | argon2id、Redis Session、HttpOnly Cookie、双维度5次/10分钟限流 | C1-T2 | AC-C1-02/03/06 |
| R04 | §2.2、§10.1 | 后台逐接口RBAC，DM只编辑自己主页；明确禁止代登录 | C1-T3，C2-T3，各期服务 | AC-C1-04/05；AC-C2-03；权限表回查 |
| R05 | §2.2、§5.1 | BOSS创建/维护DM及店长账号，禁用后旧会话失效 | C1-T3 | AC-C1-05；受控初始化/员工演示 |
| R06 | §4.2、§5.1 | 品牌区、后台精选、近期场次、微信二维码、通知开关 | C2-T3/T4，C3页面/通知，C8-T1/T3 | AC-C2-05；AC-C3-06；AC-C8-01/03 |
| R07 | §4.3、§7.2 | 剧本公开列表，标签/名称筛选，最新/价格/评分排序、分页 | C2-T1/T4 | AC-C2-01/05 |
| R08 | §2.2、§4.3 | 剧本详情需登录，封面/时长/人数/价格/简介/评分 | C2-T1/T4，C6统计 | AC-C2-02；AC-C6-03 |
| R09 | §4.3、§6.2 | 非剧透角色图/简介/排序，标签独立关系 | C2-T1/T3/T4 | AC-C2-01 |
| R10 | §4.3–4.5、§6.2 | 剧本↔DM、剧本↔妆造双向多对多关联与跳转 | C2-T1/T3/T4 | AC-C2-01/05 |
| R11 | §4.4、§5.1 | 妆造列表/详情、多图、统一比例及后台上下架，非租赁库存 | C2-T1/T2/T3/T4 | AC-C2-01/04/05 |
| R12 | §4.5、§5.1 | DM列表/主页、照片自上传、简介/擅长、评分 | C2-T2/T3/T4，C6-T1/T3 | AC-C2-03/04；AC-C6-03 |
| R13 | §4.5 | DM真实带过的剧本，不将可带关系或备选身份当带本事实 | C4-T3回接C2主页 | AC-C4-09 |
| R14 | §5.1、§6.2 | 内容CRUD、草稿/上下架、历史引用保护 | C2-T1/T3 | AC-C2-01/06 |
| R15 | §3.1、§5.2、§6.2 | 一场一本、主/备选DM、时间、人数上下限、可覆盖默认价格、来源/发起人 | C3-T1 | 场次创建/编辑矩阵与C3期末演示 |
| R16 | §3.1、§4.6、§6.3 | 拼车已报/上限/还差人数，替全队N人报名和联系人，原子占坑 | C3-T2 | AC-C3-01/02；数据库人数不变量 |
| R17 | §3.1、§4.6 | 自主预约：剧本/期望时间/人数/备注，审核通过生成开放场次，拒绝通知 | C3-T3 | AC-C3-04/05；D01确定是否同时占坑 |
| R18 | §3.1、§4.6 | 我的预约区分申请和报名；未锁车本人取消、坑位释放 | C3-T2/T4 | AC-C3-03；本人范围/状态联调 |
| R19 | §3.1、§6.2 | full不等于locked，禁止自动锁车/超时自动取消 | C3状态，C4-T3 | AC-C4-03/04/05 |
| R20 | §3.1、§3.2、§5.1 | 押金收取/退款金额、操作人、时间，可对账且不自动调用支付 | C4-T1/T2 | AC-C4-01/02/06/07 |
| R21 | §3.1、§6.2 | 人工锁车、跳车没收、开本/结束、非结束商家取消 | C4-T3 | AC-C4-03/04/05；D02/D03 |
| R22 | §3.2、§5.2 | 结束自动进入待结算候选；带本DM优先；成功结清才从列表消失 | C4-T3/T4，C5-T3/T5 | AC-C4-08；AC-C5-04/11 |
| R23 | §3.2、§6.2 | 线下充值，余额+累计储值+流水+等级同步 | C5-T1/T2 | AC-C5-01/07/08 |
| R24 | §3.2、§6.2、附录 | 五级按累计储值升级，0/500/1500/3000/6000；BOSS配置门槛/权益 | C1种子，C4免押金读取，C5-T2 | AC-C1-01；AC-C4-10；AC-C5-01/06/09 |
| R25 | §3.2、§5.2 | 余额/现金/微信消费全部记账；仅余额支付扣储值；注册散客同样1:1得积分 | C5-T3 | AC-C5-02/03/04/06；D04 |
| R26 | §3.2、§6.3 | 同场不重复结算、余额/积分不超扣、事务失败全回滚 | C5-T1/T3/T4 | AC-C5-03/04/05/07 |
| R27 | §5.1、§7.3、§10.1 | 会员查询、余额/积分受控调整和留痕，禁止通用资料改账 | C1契约，C5-T2 | AC-C1-04；AC-C5-06/08；D05/D06/D11 |
| R28 | §4.7 | 个人真实等级/余额/积分/权益/距离下级储值差额及最高等级 | C5-T1/T5 | AC-C5-09 |
| R29 | §4.7、§7.2 | 本人充值/各类消费/积分/押金/兑换流水分页筛选 | C4押金，C5-T1/T5 | AC-C5-08；查询本人隔离 |
| R30 | §4.7、§7.2 | 玩过剧本按本人已结束场次聚合，未结算也计入 | C5-T1/T5 | AC-C5-10 |
| R31 | §3.5、§5.1 | 礼品橱窗、图片/所需积分/可兑时段、线下兑换扣分/历史，无网购订单 | C5-T4/T5 | AC-C5-05/08 |
| R32 | §3.2/3.3、§12、附录 | 历史储值或当前积分可发评价，不限制必须玩过/当前余额 | C6-T1 | AC-C6-01/06 |
| R33 | §3.3、§4.3/4.5 | 剧本与DM评分/文字即时展示，昵称/等级徽章、平均分及计数 | C6-T1/T3 | AC-C6-01/03 |
| R34 | §3.3、§4.7 | 我的评价、随时自删；员工回复、店长/BOSS管理删 | C6-T1/T3 | AC-C6-04/05 |
| R35 | §3.3 | 玩后剧本+DM两个评分引导，可跳过，失败对象独立重试 | C6-T3 | AC-C6-06 |
| R36 | §3.3、§8、§12.7 | DFA拦截，Redis词库热更新，仅BOSS维护；不做审核/拦截记录 | C6-T2 | AC-C6-02 |
| R37 | §3.4、§4.8、§6.2 | 举报DM服务/剧本内容，可附截图；顾客仅收确认，无进度查询 | C6-T4 | AC-C6-07/08/09 |
| R38 | §2.2、§3.4、§10.1 | 举报身份/正文/私有附件仅BOSS看；只读内容，read_at不变处理状态 | C2私有媒体，C6-T4/T5，C8缓存 | AC-C2-04；AC-C6-07/08；AC-C8-02 |
| R39 | §5.2、§8.3 | 站内通知列表、未读/已读及全部顾客/员工触发点 | C3-T4，C4–C6当期接入，C8核验 | AC-C3-06；各业务事件验收；AC-C8-03 |
| R40 | §8.3、§9.4 | VAPID Push三类关键事件、有意义时机授权、重试3次/死订阅清理 | C8-T3 | AC-C8-03 |
| R41 | §5.2、§7.3 | BOSS财务日/周/月，充值/消费/押金/兑换，剧本/DM/支付方式 | C7-T1/T2 | AC-C7-01/02/03/05 |
| R42 | §5.2、§7.3 | 财务CSV可用Excel打开，与查询同筛选/同口径/全部页 | C7-T2/T5 | AC-C7-04 |
| R43 | §5.2、§7.4、§10.4 | 全部后台敏感写审计，操作人/动作/对象/前后/时间/IP；顾客不记员工日志 | C1-T4，各业务事务，C7-T3 | AC-C1-07；AC-C7-06 |
| R44 | §2.2、§5.1 | BOSS日志只读；角色工作台今日场次/待办；后台导航齐全 | C3/C4阶段待办，C7-T3/T4 | AC-C7-05/07/09 |
| R45 | §6、§8、§10.3 | MySQL8 InnoDB utf8mb4/Prisma、Redis7、金额精度、必需索引 | C1-T1、各期迁移 | 基础迁移/数据断言；C3/C5并发；C7查询计划 |
| R46 | §6.3、§10.3 | 场次查询走Redis，报名/状态变更主动失效，数据库作为坑位真相 | C3-T1/T2，C4-T3 | C3人数/缓存验收；AC-C4-04 |
| R47 | §7、§8.2 | `/api`、统一响应/错误码、App Router，C端RSC、B端AntD/React Query | C1契约，各期接线 | 共享协议；各期真实接口/构建结果 |
| R48 | §8.1、§10.1/10.3 | 图片≤5MB、白名单/sharp重编码/缩略图、本地持久存储、STORAGE_DRIVER | C2-T2，C8-T4 | AC-C2-04；AC-C8-04/06 |
| R49 | §9.1/9.3 | Manifest、192/512/maskable图标、安装提示、iOS图文引导 | C8-T1 | AC-C8-01 |
| R50 | §9.2 | Workbox：shell预缓存、图片CacheFirst+LRU、页面NetworkFirst/最后在线数据 | C8-T2 | AC-C8-02；D12全路由矩阵 |
| R51 | §9.2、§10.1 | 离线横幅、禁写、重新联网不自动补交资金；账号/角色缓存隔离 | C8-T2 | AC-C8-02 |
| R52 | §8.2/8.4、§10 | 腾讯云单机Compose app/mysql/redis/nginx，dev/prod密钥、HTTPS | C1环境，C8-T4 | AC-C8-06；D08 |
| R53 | §10.2 | 每周日凌晨DB+公私uploads，本地4份、COS1份，实际恢复演练 | C8-T4 | AC-C8-04 |
| R54 | §10.3/10.4 | 规模相称单体、缩略图/查询缓存、ESLint/Prettier/TS strict | C1、C2、C3、C7查询、C8-T5 | 各期既有工具链回归和性能证据 |
| R55 | 用户前端要求、AGENTS | 复用组件/扩展优先，设计系统预览仅开发且纯CSR，视觉/响应式/状态还原 | 各期页面，C8-T1/T5 | AC-C8-02/05/06；原稿对照截图 |
| R56 | §12 | 人工错账/押金纠纷、弱评价门槛、备案/素材、敏感词误伤的既定取舍 | C4/C5留痕与D项，C6边界，C8 | 决策清单；不新增被源明确排除的功能 |

## 2. 源页面逐项归属

已有页面沿用现有features和路由适配；源要求细分后台路径当前未齐全的，按归属周期扩展。原 `/admin/content`、`/admin/ops` 等聚合入口保留导航，不取代细分页面。

| 源页面 | 首次真实接线/完成周期 | 交接说明 |
| --- | --- | --- |
| `/` | C2品牌/推荐，C3近期场次，C8安装 | 三个真实来源分别接入 |
| `/scripts`、`/scripts/[id]` | C2，C6评价 | 详情服务端登录边界 |
| `/costumes`、`/costumes/[id]` | C2 | 多图与剧本双向关联 |
| `/dms`、`/dms/[id]` | C2资料，C4带本历史，C6评价 | “可带”与“带过”分开 |
| `/sessions`、`/booking/new` | C3 | 团队占坑与自主申请不同服务 |
| `/login`、`/register`、`/me` | C1，C5完整会员投影 | 个人资料C1，钱分权益C5 |
| `/me/booking` | C3，C4完整履约状态 | 申请/报名合并展示但实体分开 |
| `/me/member`、`/me/wallet`、`/me/history` | C5 | 历史详情复用现有 `/me/history/[id]`；C6增加玩后引导 |
| `/me/reviews`、`/report` | C6 | 举报无进度页 |
| `/gifts` | C5 | 橱窗与本人线下兑换记录 |
| `/admin` | C3/C4阶段待办，C7汇总 | 今日场次/待审核/本人优先待结算，不能泄漏BOSS数据 |
| `/admin/sessions`、`/admin/sessions/pending` | C3，C4状态扩展 | 手动履约接C4 |
| `/admin/sessions/settlement` | C4只读候选，C5真实结算 | 同一查询扩展排除已结单元 |
| `/admin/scripts`、`/admin/costumes`、`/admin/dms` | C2 | DM账号创建跳C1员工管理 |
| `/admin/bookings` | C3只读名单，C4履约操作 | 本人未锁车取消在C3顾客端；同一报名状态和权限 |
| `/admin/deposits` | C4 | 收退/没收证据 |
| `/admin/wallet`、`/admin/members`、`/admin/gifts`、`/admin/levels` | C5 | 等级规则仅BOSS |
| `/admin/reviews`、`/admin/words`、`/admin/reports` | C6 | 词库/举报仅BOSS，举报内容只读 |
| `/admin/finance`、`/admin/logs` | C7 | 仅BOSS |
| `/admin/staff` | C1 | 提前支撑账号和权限，不等C7 |
| `/admin/settings` | C2配置，C3/C8通知渠道消费 | 逐键权限D11 |

所有正式页面在C8进入离线/设备/视口矩阵；动态详情以代表性有效ID、无权和不存在三类场景验收。开发对照入口不列入正式离线页面，生产须404。

## 3. 源API逐组归属

以下列出源§7全部接口族；精确请求、权限和响应以共享协议及对应周期为准。表中未写HTTP动词的CRUD按列表/创建/详情/修改/删除逐项实现，不以一个列表代替整组。

| 源API | 周期 | 约束/补充 |
| --- | --- | --- |
| `POST /api/auth/register`、`/login`、`/logout` | C1 | 真实Session；拟增CSRF端点 |
| `GET /api/me` | C1→C5 | 本人基础资料→真实权益/升级差额；拟增PATCH本人资料白名单 |
| `GET /api/scripts`、`/api/scripts/:id` | C2 | 公开列表/登录详情 |
| `GET /api/costumes`、`/api/costumes/:id`；`GET /api/dms`、`/api/dms/:id` | C2→C4/C6 | DM实际历史C4，评分C6 |
| `GET /api/sessions`；`POST /api/sessions/:id/bookings` | C3 | 原子人数、联系人、幂等 |
| `POST /api/booking-requests`；`DELETE /api/bookings/:id` | C3 | 待审核独立表；取消仅未锁车本人 |
| `POST /api/reviews`；`DELETE /api/reviews/:id`；`POST /api/reviews/:id/replies` | C6 | 回复仅员工，自删本人，资格仅约束发布 |
| `GET /api/me/wallet`、`/api/me/history` | C5 | 自己数据、真实历史/分页筛选 |
| `POST /api/reports` | C6 | 只确认收悉，无本人进度查询API |
| `GET /api/notifications`；`POST /api/notifications/read` | C3 | 后续周期当期接入事件，不能拖到C8 |
| `POST /api/push/subscribe` | C8 | 绑定本人设备、拟增unsubscribe、安全端点验证 |
| `POST /api/admin/sessions`；`PATCH /api/admin/sessions/:id` | C3→C4 | 创建/编辑/开放C3，锁车/开本/结束/取消C4 |
| `GET /api/admin/sessions/pending`；`POST /api/admin/booking-requests/:id/approve`、`/reject` | C3 | 审批恰好生成一次场次 |
| `GET /api/admin/sessions/settlement`；`POST /api/admin/sessions/:id/settle` | C4查询→C5结算 | finished≠settled；客户端points不作权威值 |
| `CRUD /api/admin/scripts`、`/api/admin/costumes` | C2 | 包含角色、标签、DM/妆造关联及上下架 |
| `GET /api/admin/bookings`；`PATCH /api/admin/bookings/:id` | C3列表→C4履约命令 | 禁止任意状态跳转绕过场次/押金事务 |
| `POST /api/admin/deposits`；`POST /api/admin/deposits/:id/refund` | C4 | 明确收退操作者/时间/账本引用 |
| `POST /api/admin/wallet/topup` | C5 | 仅manager/boss |
| `GET /api/admin/members`；`PATCH /api/admin/members/:id/adjust` | C5 | 查询/调整授权明确，D11；D05/D06纠错 |
| `CRUD /api/admin/gifts`；`POST /api/admin/gift-redemptions` | C5 | 店长/BOSS，原子扣分 |
| `DELETE /api/admin/reviews/:id`；`POST /api/admin/reviews/:id/replies` | C6 | 管理删manager/boss；回复DM/manager/boss |
| `GET/PUT /api/admin/words`；`GET /api/admin/reports` | C6 | 仅BOSS，拟增最小read_at接口 |
| `GET /api/admin/finance`；`GET /api/admin/finance/export`；`GET /api/admin/logs` | C7 | BOSS、日周月、CSV与报表同口径 |
| `CRUD /api/admin/staff` | C1 | 仅BOSS，员工停用/权限变更吊销Session |
| `GET/PUT /api/admin/levels` | C5 | 仅BOSS，C4先有免押金权威读取 |
| `GET/PUT /api/admin/settings` | C2→C3/C8 | 源未逐键定义权限，D11冻结 |

为已存在流程补齐的拟新增接口包括：C2上传/受控媒体/标签与DM维护/公开设置；C3本人报名与申请查询；C5公开礼品/本人兑换历史；C6本人评价/后台评价列表/举报最小已读；C7角色overview；C8取消Push订阅和health。它们服务于源功能，不扩大为新产品模块。

## 4. 表与数据责任

| 源§6表 | 首次建立/实际业务归属 | 数据约束 |
| --- | --- | --- |
| users、member_levels、dms身份 | C1；C2 DM资料；C4免押金；C5权益账务 | 手机号唯一、DM一对一、累计储值与积分分离 |
| scripts、script_characters、tags、script_tags | C2 | 角色归属、关联唯一、上下架与历史引用 |
| costumes、script_costumes、script_dms | C2 | 多对多唯一；不能将可带关联当真实游玩 |
| sessions、session_backup_dms、bookings | C3→C4 | 一场一本、主/备选区分、状态与原子人数 |
| deposits、transactions | C4首次；C5扩展统一journal；C7只读聚合 | 金额Decimal、业务引用、明确没收动作、不可改删分录 |
| points_ledger、gifts、gift_redemptions | C5 | 原子整数扣增、消费/兑换引用和历史快照 |
| reviews、review_replies | C6 | visible/deleted统计，敏感词命中不留正文 |
| reports | C6 | reporter_user_id仅BOSS读，read_at非处理状态 |
| notifications | C1表/基础，C3可用，C4–C6事件 | 本人读取、event+recipient去重 |
| sensitive_words | C6 | 版本化词库、Redis热更新 |
| operation_logs | C1起全业务写入，C7查询 | 员工敏感动作同事务，BOSS只读 |
| settings | C2；C3/C8按渠道读取 | 键白名单/逐键权限，公开投影不泄密 |
| push_subscriptions | C8 | endpoint唯一、服务端绑定user、设备解绑 |

源未列但必要的工程补齐：C3 `booking_requests`；C5 `settlements/settlement_items`；C1 `idempotency_records/event_outbox`；C2建议 `media_assets`；C8建议 `push_deliveries`。记录首次归属并逐期迁移，不一次创建大量空表；结算粒度须先冻结D04。

## 5. 通知与权限回查

站内通知逐触发点的责任固定如下，事件名以[共享协议](2026-09-09-shared-contracts.md)为准：

| 源触发点 | 首次完成 | 收件人 | Web Push |
| --- | --- | --- | --- |
| 自主预约被通过/拒绝 | C3 | 发起顾客 | C8仅通过 |
| 新自主预约待审核 | C3 | 有审批权限员工 | 无 |
| 新报名、人数达标 | C3 | 有处理权限员工 | 无 |
| 场次锁车/取消 | C4 | 受影响顾客 | C8两者 |
| 待结算提醒 | C4，C5处理完成 | 带本DM优先及有权限员工 | 无 |
| 余额/积分变动、等级升级 | C5；C4先有押金事件 | 本人 | 无 |
| 评价被回复 | C6 | 评价作者 | 无 |
| 新举报 | C6 | 仅BOSS，载荷无身份/正文 | 无 |

权限基线：顾客与员工均可用本人C端功能；DM/店长/BOSS创建场次、审批、押金及消费记账；店长/BOSS维护剧本妆造、充值、礼品与管理删评价；BOSS专属员工、等级规则、词库、举报身份、财务、日志。DM编辑展示资料仅本人；“带本DM优先结算”不能自行收紧成其他有权员工不可操作。设置与人工调整未明定处按D11确认。

## 6. 源风险、明确排除与最终复核

| 项目 | 本期处理/后续边界 |
| --- | --- |
| 人工错记漏记、押金纠纷 | C4/C5不可变流水/可追溯动作，C4待结算提醒，C7逐笔报表与日志，不承诺代替线下事实核实 |
| 储值规则与展示 | D06/D07明确规则，C5真实权益展示；不把源中的经营描述扩展成法律结论 |
| 弱评价门槛、词库误伤 | 沿用已接受取舍，不增加玩过门槛、消费加权、拦截记录/人工审核 |
| 域名/Logo素材 | D08/D09持续跟踪，C8门禁；不能用模板值宣称已完成 |
| 后续小程序/验证码/SMS/Email | 保留API/身份/Provider扩展边界，未纳入本次业务实现 |
| 运行时图片迁移COS | C2保留STORAGE_DRIVER；与C8必须完成的COS备份区分 |
| 线上支付/SaaS/自动超时取消/代登录/线上礼品订单/妆造租借库存 | 明确排除；原演示如有相似交互不得接成真实产品能力 |

最终复核顺序：源功能R01–R56→页面清单→源API全部接口族→表/索引/事务→角色与通知→C8全路由离线/视觉/恢复。每项在实施后补对应证据路径和通过状态；目前全部业务项为“已规划，待实现与验收”。

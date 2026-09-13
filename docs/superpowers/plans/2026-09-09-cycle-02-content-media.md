# C2 内容与媒体开发计划

> **2026-09-13 执行状态：** C2 开发实现已补齐，详情见 [完成与验收记录](../../c2-verification.md)。本机测试、三档浏览器检查与安全 SQL 演练已执行；生产升级 runner 全流程、生产备份恢复和 Docker/Nginx 实机验收不冒充已完成，见下方未勾选事项。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐工作包执行，使用复选框记录结果。本文件是一期交付的内部周期，不是功能缩水后的独立产品分期。

**Goal:** 让剧本、妆造、DM、首页推荐和图片上传接入真实数据，顾客可浏览、员工可按权限维护，为 C3 排期提供可信内容。

**Architecture:** 保留现有页面与设计系统，以薄 Route Handler 调用集中领域服务；C 端由 RSC 加载公开/受限数据，筛选与表单保留客户端交互，后台使用现有 AntD 和 React Query。内容关系写入、员工审计同事务完成；媒体经统一存储接口处理，数据服务只接收受控资源标识。

**Tech Stack:** 当前 Next.js App Router、TypeScript strict、Prisma / MySQL 8.0、Redis 7、sharp、Tailwind CSS、Ant Design。

**Spec:** [设计文档](../../设计文档.md) §2.2、§4.2–4.5、§5.1–5.2、§6.2、§7.2–7.3、§8.1、§10.1/10.3；[共享契约](2026-09-09-shared-contracts.md)；[决策记录](2026-09-09-decisions.md)。

## Global Constraints

- 「不做 SaaS：系统仅服务本店，无多商户概念。」
- 「剧本列表公开、详情需登录。」
- 「上传文件类型/大小白名单（图片 ≤5MB，sharp 重编码防恶意文件）。」
- 「初期存服务器本地磁盘（/uploads，Nginx 直出）」；此公开展示规则不适用于私有举报证据。
- 「操作日志：记录所有 B 端敏感操作」；「顾客操作不记录」。
- 遵守根 `AGENTS.md`：优先复用组件；可经 props、variant、className 扩展时先扩展；只有现有组件无法满足才新增。
- API 一律 `/api`、`{ code, message, data }`、snake_case；JSON ID 为十进制字符串，金额为十进制字符串；公共接口和错误码遵守共享契约。

## 周期边界与交付物

**检查前基线（保留记录）：** `src/features/catalog/*`、`src/features/home/home-page.tsx`、`src/features/admin/admin-content.tsx` 已有视觉页面和演示交互；Prisma 中 JSON 标签、妆造库存和状态与需求存在差异，尚无真实上传和内容 CRUD。

**前置：** C1 已交付正确身份/数据基线、`requireActor()`、`assertPermission(actor, permission, resource?)`、`withCommand(context, work)`、`appendAudit(tx, input)`；确认迁移目标库和备份，不执行真实库 reset。

**冻结项：** D11 已由需求方于本轮确认：manager/boss 可修改精选、商家二维码、通知开关；DM/customer 禁止。精选唯一来源为 Script.featured，设置白名单不允许任意 JSON PATCH；不改变员工账号权限。

**输入：** C1 的用户/DM 身份、数据库连接和鉴权；原 HTML、现有素材和设计变量；经内容负责人确认的剧本角色背景、标签及关联数据。

**输出：** 可维护的三类内容及关联、隔离公私资源的本地上传服务、精选/二维码设置、顾客实际数据页面、带审计的后台细分页面。

**本期不含：** 排期和占坑由 C3 实现；评分由 C6 的真实评价汇总，当前展示无评价空态；COS 媒体仅预留驱动接口，COS 备份由 C8 实现；不增加妆造库存租赁、电商下单或剧透素材管理。

## 数据、接口与权限

| 数据对象 | 本期约束与关系 |
| --- | --- |
| `scripts` | 封面/简介/分钟数/人数区间/Decimal 价格/`draft,on,off`/精选/评分计数；保留 slug 兼容层；外键已引用时拒绝物理删除，允许下架 |
| `script_characters` | 名称、图片、非剧透简介、排序；属于一个剧本，不能越过父剧本修改 |
| `tags, script_tags` | 标签独立表，多对多联合唯一；删除被用标签前明确解除关系，不通过 JSON 再造第二套标签 |
| `costumes, script_costumes` | `draft,on,off`、封面、多图、说明；与剧本双向多对多，删除不应级联删除剧本 |
| `dms, script_dms` | 关联既有员工账号；姓名/头像/照片/简介/擅长标签/`active,inactive`；会带剧本关联与实际带本历史分开 |
| `settings` | 商家微信二维码、精选推荐、通知开关按白名单拆字段；公开投影仅返回展示字段，不能返回内部开关/密钥 |
| 媒体元数据（拟新增） | 文件随机键、所有者、用途、公私可见性、格式、字节数、尺寸、缩略图和引用；建议独立 `media_assets` 表，避免任意外链当可信上传 |

| API（拟新增） | 权限及行为 |
| --- | --- |
| `GET /api/scripts?tag=&q=&sort=latest&page=1`、`GET /api/scripts/:id` | 列表公开，sort 支持 `latest,price_asc,price_desc,rating`；详情须登录；顾客只见 `on`；分页上限与共享契约一致 |
| `GET /api/costumes`、`GET /api/costumes/:id`、`GET /api/dms`、`GET /api/dms/:id` | 展示可见内容和关联；只投影公开 DM 资料，不暴露账号手机号/员工权限 |
| `GET,POST /api/admin/scripts`、`GET,PATCH,DELETE /api/admin/scripts/:id` | manager/boss；详情提交可包含 `characters,tag_ids,dm_ids,costume_ids`，整体校验后同事务替换关联 |
| `GET,POST /api/admin/tags`、`PATCH,DELETE /api/admin/tags/:id` | manager/boss；名称去空白、唯一，关联使用冲突返回 409 |
| `GET,POST /api/admin/costumes`、`GET,PATCH,DELETE /api/admin/costumes/:id` | manager/boss；图片均为已授权公开资源；关联有效性同步校验 |
| `GET /api/admin/dms`、`GET,PATCH /api/admin/dms/:id` | DM 仅可编辑自己的展示字段，manager/boss 可管理；员工账号创建复用 C1 `/admin/staff` |
| `POST /api/uploads`、`GET /api/media/:id` | 上传需登录且按用途授权；公开资源直接访问，私有资源按读取策略校验；举报用途由 C6 接入 |
| `GET /api/settings/public`、`GET,PUT /api/admin/settings` | 公开字段白名单；管理写入按 D11 集中权限校验，变更同事务审计 |

## C2-T1：内容模型与查询服务

**文件：** 修改 `prisma/schema.prisma`、`src/lib/api/contracts.ts`、`src/types/domain.ts`；拟新增 `prisma/migrations/<生成标识>_content/`、`src/server/catalog/{queries,commands,validation}.ts`、`src/server/catalog/dto.ts`、`tests/integration/content.test.ts`。

**输入/输出：** 消费 C1 Prisma 和 Actor；输出 `getScriptDetail(actor, id)`、`listScripts(query)`、`saveScript(actor, id, input)` 及对应 costume/DM 服务。`id` 是十进制字符串；DTO 必须显式转换 Decimal 和关联集合，不直接返回 Prisma 对象。

- [x] 真实 MySQL 测试覆盖：匿名详情 401、公开列表无草稿、角色与双向关联、无效人数区间 422、重复关联不会重复记录；执行记录见验收文档（不回填未留证的先红后绿顺序）。
- [x] 按源字段建立安全替代迁移和映射；库存/难度与正式字段分离；测试库操作前导出，安全 SQL 已以 C1 fixture 演练。保留已应用历史，不将演练等同于生产升级。
- [ ] 上线门禁：在恢复副本验证升级 runner 的 apply/备份/Prisma resolve 全流程，获得真实库备份、停写与升级授权后执行业务迁移。
- [x] 实现筛选、名称搜索、稳定次序加 ID 打破并列、分页、价格排序和评分排序；缺少评价时 `review_count=0`，不伪造真实评分。
- [x] 每次员工内容写入先 `assertPermission`，在 `withCommand` 事务内完成主表/关系/`appendAudit`；追加 `catalog.changed` outbox 事件失效公开内容缓存，不通知顾客；外键引用删除冲突返回 409，不能连带删除历史场次。
- [x] 运行集成测试及 Prisma 校验，核对新增/编辑/上下架/删除的前后摘要；变更保留在工作区供审查，本轮未自动创建 Git 提交。

## C2-T2：统一上传与公私存储边界

**文件：** 拟新增 `src/server/media/{storage,local-storage,process-image,authorization}.ts`、`src/app/api/uploads/route.ts`、`src/app/api/media/[id]/route.ts`、`tests/integration/media.test.ts`；修改 `.env.example`、`docker/nginx.conf`、`docker-compose.yml`。

**输入/输出：** 定义拟新增 `StorageDriver.put({ key, bytes, contentType, visibility })`、`read(key)`、`delete(key)`；返回资源元数据和公开 URL/受限读取地址。`STORAGE_DRIVER=local`，私有目录独立于公开 `/uploads` 和 Nginx alias。

- [x] 先准备 JPEG/PNG/WebP、伪装文本、损坏图、超 5MB 图、路径穿越名测试；对私有文件直接 URL 和另一账号读取断言拒绝。
- [x] 同时校验声明 MIME、文件签名和 sharp 解码；仅接收本期白名单 JPEG/PNG/WebP，拒绝用户上传 SVG，原项目已审查的静态 SVG 素材继续保留。
- [x] 在 sharp 解码阶段限制像素量，重编码去掉原始元数据；按封面/角色/DM/妆造现有展示比例生成尺寸和缩略图，保留列表使用缩略图的映射。
- [x] 随机生成服务端键，不使用客户端路径；上传后 DB 失败须删除新文件，引用更新失败不得删旧图；仅清理超出宽限期且无引用的孤立资源。
- [x] 上传权限区分 DM 本人照片、manager/boss 内容素材、C6 举报证据；私有读取必须重新鉴权，日志仅记资源 ID 和用途；媒体测试通过，Dockerfile/Compose/Nginx 配置及非 root 目录权限已实现。
- [ ] 上线门禁：Docker 环境中实测公私卷持久化、容器重建、Nginx 公开直出与私有拒绝。本机未安装 Docker，不能勾选该项。

## C2-T3：后台内容管理与门店设置

**文件：** 扩展 `src/features/admin/admin-content.tsx`、`admin-shared.tsx`、`admin-providers.tsx`；拟新增 `src/features/admin/content/{script-editor,costume-editor,dm-editor,settings-editor}.tsx`，及 `src/app/admin/{scripts,costumes,dms,settings}/page.tsx` 和表中 Route Handlers。

**输入/输出：** 消费内容 DTO、上传资源、C1 权限表；输出可重复编辑的表单、明确的保存结果和刷新后的真实列表。原 `/admin/content` 保留聚合入口并链接细分路径。

- [x] 权限测试矩阵覆盖：customer 禁止维护；DM 修改他人资料 403、修改自己成功；manager/boss 内容 CRUD；D11 允许与拒绝设置写入分别覆盖。
- [x] 从现有共享 Modal/Form/Card/Button 扩展编辑器，支持角色排序、标签、上下架、DM/妆造多选关联；服务端返回字段错误时定位到原表单字段。
- [x] 保存以最后读取的 `updated_at` 或明确版本作条件，陈旧修改返回 409 并显示重新加载选项；内容写不依靠前端 disabled 解决覆盖。
- [x] 设置编辑精选、二维码和通知开关时只接受D11冻结的白名单键及逐键权限；精选在 scripts 与 settings 中确定一个规范来源，另一侧仅引用，不双写失配。通知开关保存服务端配置，交C3/C8在各自渠道实际消费，不能仅改变前端按钮；日志/账本不受通知开关影响。
- [x] 上下架、删除、关联、DM 资料和设置均检查审计；HTTP 请求可绕过按钮时仍受同等限制；完成后台键盘和窄屏表单检查。

## C2-T4：替换顾客演示数据并保持视觉

**文件：** 修改 `src/features/catalog/data.ts`、`src/features/catalog/{catalog-cards,scripts-screen,script-detail-screen,costumes-screen,costume-detail-screen,dms-screen,dm-detail-screen}.tsx`、`src/features/home/home-page.tsx`、`src/app/(customer)/{scripts,costumes,dms}/`；拟新增 `src/features/catalog/adapters.ts`、`tests/e2e/content.spec.ts`。

**输入/输出：** 消费 snake_case API/RSC DTO，经 adapter 转 UI camelCase；输出原样式页面、筛选 URL、加载/错误/空态、真实资料及详情登录回跳。

- [x] 剧本详情鉴权放服务端，避免 HTML、RSC payload、接口、预取或缓存向游客泄漏受限内容；公开列表封面/概要仍可浏览。
- [x] 保留原 slug 链接映射和 23 页作用域，不把数据库 ID 直接替换已有分享链接；列表和详情的关联点击可完整往返。
- [x] 首页推荐来自后台，二维码来自公开设置；近期场次区域在 C3 接入，不能把原示例排期冒充实时排期；DM 带过剧本在 C4 履约记录产生前显示真实空态。
- [x] 接入多图比例、非剧透角色介绍和 DM 擅长标签；评价区消费 C6 约定只读结构/空态，不在 C2 新建发评假流程。
- [x] 对照原稿验证 390/820/1440 宽度的封面、文字换行、间距和表单状态；完整九视口与截图验收归 C8，不以构建成功替代视觉结论。

## HTTP 契约样例与可执行验收

以下为契约使用样例；实际实现和执行结果以验收记录为准。测试前在独立测试库创建 manager、customer、DM、妆造及可上架剧本并登录取得 Cookie。写操作须先带对应 Cookie 请求 `GET /api/auth/csrf`，取 `data.csrf_token` 并传入 `X-CSRF-Token`；`Origin` 为 `new URL(BASE_URL).origin`。

```http
POST /api/admin/scripts
Cookie: <manager session>
Origin: https://test.shisanwu.example
X-CSRF-Token: <csrf_token>
Content-Type: application/json

{"title":"雾港来信","cover":"/uploads/approved-cover.webp","duration_minutes":240,"player_min":5,"player_max":6,"price":"168.00","synopsis":"非剧透简介","status":"draft","tag_ids":["11"],"dm_ids":["21"],"costume_ids":["31"],"characters":[{"name":"林舟","image":"/uploads/approved-role.webp","bio":"非剧透背景","sort":1}]}

HTTP/1.1 201 Created
{"code":0,"message":"创建成功","data":{"id":"101","status":"draft"}}
```

本段保留为手工 HTTP 示例（未新增独立 `tests/http/c2-content.mjs`）；实际自动化由 `tests/integration/content.test.ts` 与 `tests/e2e/content.spec.ts` 覆盖。若单独执行下面示例，环境提供 `BASE_URL`、`TEST_SCRIPT_ID`、`SESSION_CUSTOMER_COOKIE`，对象必须是专用测试库已上架剧本。

```js
import assert from 'node:assert/strict';
const { BASE_URL: base, TEST_SCRIPT_ID: id, SESSION_CUSTOMER_COOKIE: cookie } = process.env;
assert.ok(base && id && cookie, '先创建测试内容并登录顾客');
const anon = await fetch(`${base}/api/scripts/${id}`);
assert.equal(anon.status, 401);
const detail = await fetch(`${base}/api/scripts/${id}`, { headers: { cookie } });
assert.equal(detail.status, 200);
const body = await detail.json();
assert.equal(body.code, 0); assert.equal(body.data.id, id);
assert.match(body.data.price, /^\d+\.\d{2}$/);
assert.ok(Array.isArray(body.data.characters));
const list = await fetch(`${base}/api/scripts?sort=price_asc&page=1`);
assert.equal(list.status, 200); assert.equal((await list.json()).code, 0);
```

| 验收编号 | 可判定证据 |
| --- | --- |
| AC-C2-01 | 剧本/妆造 CRUD、上下架、角色与标签、双向关联数据重载后保持；引用删除 409 |
| AC-C2-02 | 匿名列表 200，受限详情接口/页面/预取无正文泄漏；登录后可读且关联跳转正常 |
| AC-C2-03 | DM 越权请求 403，自改成功；manager/boss 内容维护及 D11 设置权限符合冻结矩阵 |
| AC-C2-04 | 类型伪造/超限/穿越被拒，图片重新编码并生成缩略图；私有资源无公开直出路径 |
| AC-C2-05 | 过滤、搜索、三类排序与分页稳定；首页推荐/二维码来自真实配置；缺数据有真实空态 |
| AC-C2-06 | 所有员工敏感写含同事务审计；条件更新冲突不会覆盖；类型、lint、构建和集成测试有执行记录 |

## 期末演示、交接与回退

- 演示顺序：店长上传图片建剧本/角色并关联 DM、妆造 → 上架精选 → 游客浏览/详情被拦 → 登录后查看 → DM 自改头像 → 越权与非法上传被拒 → BOSS 核对审计。
- 交接 C3：上架剧本 ID/slug、人数区间和默认价格、可选 DM、查询 DTO；交接 C6：公开评分展示结构、媒体私有接口；交接 C8：公私卷位置、缩略图规则与资源统计。
- 回退以数据库备份和兼容发布为准：先停内容写入口、恢复兼容应用再按已演练迁移方案处理；保留被历史记录引用的数据与原素材，禁止直接删除 uploads 或 reset 数据库。

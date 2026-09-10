# 十三雾 Murder Mystery Game

剧本杀门店「十三雾」的 Next.js 前端。按照 `docs/设计文档.md` 初始化工程，并将 `设计网站落地页/` 中 23 份原生 HTML 迁移为 React 页面与共享组件。

## 开始开发

需要 Node.js 20.9+，推荐 Node.js 24。在项目根目录运行：

```bash
npm install
npm run dev
```

打开 http://localhost:3000。当前页面使用前端演示数据，无需启动数据库或创建 `.env` 即可查看。已有锁文件的全新安装使用 `npm ci`。

| 入口               | 地址                                                                          |
| ------------------ | ----------------------------------------------------------------------------- |
| 首页 / 独立落地页  | `/`、`/shisanwu-landing`                                                      |
| 剧本 / DM / 妆造   | `/scripts`、`/dms`、`/costumes`；各自包含独立详情                             |
| 拼车 / 自主预约    | `/sessions`、`/booking/new`                                                   |
| 会员与记录         | `/me`、`/me/wallet`、`/me/reviews`、`/me/history/wugang-laixin`               |
| 账号 / 举报 / 礼品 | `/login`、`/register`、`/report`、`/gifts`                                    |
| 商家后台           | `/admin`、`/admin/sessions`、`/admin/finance`、`/admin/content`、`/admin/ops` |
| 设计系统预览       | `/dev/design-system`，仅 development，主体纯客户端渲染                        |
| 原稿视口对照       | `/dev/compare`，仅 development                                                |
| 原型页面地图       | `/dev/prototype-map`，仅 development                                          |

旧 `*.html` 链接及原稿详情参数由 `src/lib/routes.ts` 统一转换。所有开发工具在生产返回 404。

## 架构与开发规则

- `src/app/`：App Router 路由与薄页面组合。
- `src/components/ui/`：Button、Card、Badge、表单、Tabs、Dialog、Toast 等通用组件。
- `src/components/layout/`：Screen、SiteHeader、SiteFooter。
- `src/features/`：首页、目录、预约、会员、后台与开发工具的业务组件和演示数据。
- `src/styles/tokens.css`：56 项基础变量与原稿必要的页面覆盖。
- `src/styles/reference.css`：保留规则顺序并按 Screen 去重的原稿视觉基线。
- `src/styles/globals.css`：Tailwind theme/utilities、通用语义与少量增强；不引入 preflight 重置原稿。

**开发页面必须优先复用现有组件；能用 props、variant、className、children 扩展时优先扩展；只有现有组件无法满足需求才新增。** 完整规则见 `AGENTS.md`，变量、响应式契约和映射见 `docs/design-system.md`。

## 验证与维护

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run start
node scripts/smoke-routes.mjs --production
python scripts/design-css.py --verify-only
```

`npm run build` 会自动执行 `postbuild`，把静态资源复制到 standalone 输出；`npm run start` 使用生成的官方 `server.js`，与 Docker 使用同一份产物。生产端口用 `PORT` 配置，监听地址用 `HOSTNAME` 配置。

HTTP 检查默认访问 http://localhost:3000，可用 `SMOKE_BASE_URL` 更改目标；开发服务器检查时去掉 `--production`。它验证业务路由、旧链接转换、开发工具门禁、未知实体 404 和图标可用性，不代替浏览器交互与截图验证。

CSS 工具需要 Python 3.10+，只使用标准库，默认只读。只有明确运行 `python scripts/design-css.py --write` 才从 `temp/` 的原 HTML 重建 tokens 与 reference CSS。`node scripts/generate-icons.mjs` 从提供的品牌图片生成 PWA 图标。最新实际检查结果和视觉验证限制见 `docs/verification.md`。

## 当前业务范围

顾客筛选、排序、预约校验、弹窗、评价删除、流水筛选和后台状态编辑均由 React 状态驱动。页面数据为演示数据，刷新后业务变更不持久化；少量 localStorage 仅用于筛选偏好。未接入真实登录、客户记录、上传、通知、预约或财务写入。PWA 已配置 manifest 与图标，尚未实现离线缓存。

基础工程已准备 Ant Design / TanStack Query、共享领域类型、未来 API 契约、Prisma 模型草案、MySQL/Redis/nginx 的 Docker Compose。它们不代表服务端业务已完成。不要将演示前端当作真实权限、结算或支付系统；礼品仅到店线下兑换。

## 后续服务端与容器开发

使用前先复制 `.env.example` 为 `.env`，替换占位值。Prisma Client 与数据服务尚未接入前端；`npm run prisma:validate` 和 `npm run prisma:generate` 用于后续模型工作。

```bash
docker compose up --build
```

nginx 默认监听 80，可用 `NGINX_PORT` 修改。MySQL 和 Redis 仅在内部 Docker 网络可用。未来认证采用服务端 HttpOnly Cookie 与 Redis Session，所有角色权限和账务变更必须由服务端校验。

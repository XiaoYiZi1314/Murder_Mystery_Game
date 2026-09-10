# 十三雾 · 项目开发指南

## 项目介绍

本项目是剧本杀门店「十三雾」的单店 PWA，覆盖顾客内容浏览、拼车预约、会员记录和商家运营。需求来源为 `docs/设计文档.md`，视觉与交互基准为 `设计网站落地页/` 中的 23 份原生 HTML；`temp/` 是开发对照副本。

当前阶段完成 Next.js 前端迁移与全栈基础配置。页面使用原稿演示数据和客户端状态；Prisma/MySQL/Redis、领域类型与 API 契约已预留。真实认证、持久化记账、上传与通知服务尚未接入，不能把演示状态当作真实业务写入。

## 前端目录结构

| 目录                     | 职责                                                                     |
| ------------------------ | ------------------------------------------------------------------------ |
| `src/app/(customer)/`    | 顾客端独立路由与薄页面组合                                               |
| `src/app/admin/`         | 后台路由及 Ant Design / React Query Provider                             |
| `src/app/dev/`           | 仅开发环境的设计系统预览、原稿对照与页面地图                             |
| `src/app/[legacy]/`      | 原 HTML 和旧扁平地址兼容跳转，不承载业务页面                             |
| `src/components/ui/`     | Button、Card、Badge、Input、Select、Textarea、Field、Tabs、Dialog、Toast |
| `src/components/layout/` | Screen、SiteHeader、SiteFooter 等共享结构                                |
| `src/features/home/`     | 首页与独立品牌落地页的共享业务区域                                       |
| `src/features/catalog/`  | 剧本、DM、妆造列表、详情及卡片                                           |
| `src/features/booking/`  | 场次、预约表单和报名校验                                                 |
| `src/features/member/`   | 会员中心、流水、评价、账号、反馈与礼品                                   |
| `src/features/admin/`    | 后台业务模块、表单和状态管理                                             |
| `src/styles/`            | 设计变量、基础规则和去重后的原稿样式                                     |
| `src/lib/`、`src/types/` | 样式工具、路由映射、API 契约、领域类型                                   |
| `public/`                | 实际使用的原始素材和 PWA 图标                                            |
| `tests/`                 | 业务校验、路由映射和交互验证                                             |
| `prisma/`、`docker/`     | 后续数据层与部署基础                                                     |
| `temp/`                  | 只读参考副本；不作为生产页面运行时来源                                   |

## 设计系统架构

- `tokens.css` 是颜色、字体、字号、间距、圆角、阴影、容器和动效的单一来源。强调色 `#0071e3`、正文 `#1d1d1f`；保留原系统字体栈，不引入近似网络字体。
- `globals.css` 引入 Tailwind theme/utilities，不引入会重置原稿的 preflight；通用组件直接消费设计变量和原类名。
- `reference.css` 合并原稿共同规则前缀，并以零特异性的 `:where([data-screen="..."])` 保留各页差异。不要把同名类粗暴并成无作用域样式，也不要每页复制整份 CSS。
- `Screen name` 对应原文件名去掉 `.html`，例如 `index`、`script-detail`、`wallet-detail`；路由名称和视觉作用域是两个概念。导航、页脚、弹窗均应位于同一个 Screen 内。
- 首页弹窗使用 `Dialog variant="home"`，普通应用使用默认 `variant="app"`，共用焦点、键盘和关闭行为。第三方 portal 必须有对应主题与样式边界。
- 后台通过 AntD ConfigProvider 使用同一套颜色、字体和圆角，复杂表单优先扩展现有后台组件。
- 原稿特有的小范围增强放在对应 feature 的具名 CSS；数据驱动的进度、布局几何可用动态 style，重复静态值应提升为变量或组件样式。

完整变量与断点说明见 `docs/design-system.md`。新增样式值前必须先检索现有 tokens，避免同一语义多处硬编码。

## 组件复用规范（必须遵守）

1. 开发页面时，**必须优先复用已有组件**。先检查 `components/ui`、`components/layout` 和相关 `features/*`。
2. 已有组件可以通过 **props、variant、className、children/slot** 扩展时，**必须优先扩展，而不是重新创建相似组件**。
3. **只有现有组件经过合理扩展仍无法满足需求时，才新增组件**。新增组件应有明确职责、类型接口和实际复用场景，并补入设计系统预览。
4. 页面只组合布局和业务模块；禁止在多个页面重新定义同样的按钮、输入框、卡片、导航、弹窗、状态徽章或表单校验。
5. 业务状态使用 React 管理。禁止用旧脚本整体注入、iframe、dangerouslySetInnerHTML 实现产品页面，也禁止用 querySelector 修改业务状态。焦点管理和测量等必要 DOM 行为应封装在基础组件中。
6. 保留语义化链接、按钮、表单、label、键盘焦点，以及 disabled/loading/error/success、Tab/Escape 和关闭后焦点回归。
7. 原稿 SVG、渐变封面和明确的缺图占位属于设计的一部分，不得擅自换成随机图片或框架默认图标。

## 路由与数据边界

- `/` 与 `/shisanwu-landing` 独立入口，共享首页业务区域。
- 详情使用 `/scripts/[id]`、`/dms/[id]`、`/costumes/[id]`；会员流水 `/me/wallet`，历史详情 `/me/history/[id]`。
- 原 HTML 链接集中映射在 `src/lib/routes.ts`，转换时必须保留实体选择、查询参数和锚点。
- 演示数据不能混入真实资料或账务；密码不得保存到客户端持久化存储。localStorage 仅可用于设备上的筛选等偏好，不可冒充认证或权限。
- 后续余额、积分、坑位和押金的真实变更需要服务端事务；角色权限在服务端集中校验。后台 UI 隐藏按钮不是安全边界。
- 不做线上支付，礼品线下兑换；禁止管理员代登录顾客账号。举报人真实身份只能由后端向 BOSS 权限查询返回。

## 开发预览与验证

- `/dev/design-system` 仅 development 可访问，生产必须返回 404；独立客户端 Loader 通过 dynamic import 与 `ssr: false` 渲染预览主体。
- 预览必须消费实际通用组件，不能另造展示专用组件。
- 原稿对照入口只能读取白名单 HTML/图片，禁止暴露文档、配置或任意文件，并在生产关闭。
- 新增或扩展组件后核验默认、hover、focus、active、disabled、loading、error、success 与空态。
- 视口矩阵：360×800、390×844、430×932、600×960、820×1180、1024×768、1366×768、1440×900、1920×1080。保留原稿 920/560 及各页 620/640/700 等断点差异。
- 首次 `npm install`，有锁文件后使用 `npm ci`；`npm run dev` 启动，`npm run typecheck`、`npm run lint`、`npm test`、`npm run build` 检查，`npm run start` 验证生产行为。
- 修改前阅读相关文件，保护用户已有改动。保留 Next 自动维护的类型配置与版本规则；将构建、实际渲染和交互验证分别记录，不用构建成功代替视觉保真结论。

<!-- BEGIN:nextjs-agent-rules -->

This version of Next.js may differ from older examples. Read the relevant guide in `node_modules/next/dist/docs/` before changing framework conventions. Keep this generated-version boundary aligned with the installed package.

<!-- END:nextjs-agent-rules -->

# 前端迁移验证记录

日期：2026-09-09。目标项目：`D:\Project\Murder_Mystery_Game`。本记录区分构建、静态规则、运行响应与视觉验收。

## 已交付范围

- 23 份原稿均映射到独立业务路由或开发地图；顾客端、详情、会员、后台及旧 HTML 地址兼容已实现。
- 56 项基础设计变量、原稿页面族样式、UI/布局/业务模块复用结构。
- 根 `AGENTS.md`、设计系统文档、CSR 开发预览与原稿视口对照。
- 提供 Next.js 工程、后台 Provider、未来领域/API/Prisma 边界与容器配置；实际业务数据仍为前端演示。

## 验证结果

| 检查 | 结果与证据范围 |
| --- | --- |
| TypeScript | Windows 严格类型检查通过；最终生产构建的 TypeScript 阶段也通过 |
| ESLint | 全项目检查通过，无 error / warning；后续启动脚本与详情边界修正定向检查通过 |
| 单元测试 | 7/7 通过；必填、手机号、剩余坑位、预览字段、23源路由与详情参数转换 |
| 生产构建 | Windows 最终源码 `npm run build` 通过；`postbuild` 静态资源准备及官方 standalone `server.js` 启动通过 |
| HTTP 运行检查 | 独立生产产物 64 项通过，开发环境 68 项通过；覆盖业务页面、旧链接、未知实体、环境门禁、JS/CSS 和图标 |
| IDE 诊断 | `src/` 当前 0 error / warning |
| 独立静态审查 | 已关闭已发现问题；静态 Spec / Code PASS |
| CSS 提取等价 | 23/23 原规则序列和 tokens/页面覆盖匹配，磁盘产物与提取结果一致 |
| 截图及真实浏览器交互 | 未完成：本轮浏览器预览服务不可用 |

CSS 去重从 3,097 条规则合并为 1,332 条，移除 1,765 条重复规则；CSS 与 tokens gzip 合计约 19 KB。该检查证明样式提取与规则序列保留，不证明 React DOM 与原 HTML 的所有最终像素相同。

已补齐 standalone 的静态资源打包，并统一本机生产与 Docker 启动方式。

已修正复核发现的场次时间保存/取消表单残留、资产草稿三态、会员子入口锚点、报名弹窗结构/字号、首页与普通页面 Toast 位置、原始封面素材和详情页页脚几何。共享 Card 与 Badge 使用 variant，避免不同原稿类名叠加后相互覆盖。

## 本机视觉核验入口

本轮开发服务保留在项目所在 Windows 机器的 `http://127.0.0.1:3217`；以后直接 `npm run dev` 默认使用 3000 端口。

`npm run dev` 后访问 `/dev/compare`，选择原稿或当前页面及视口；`/dev/design-system` 展示真实共享组件。建议先检查首页、目录、详情、拼车弹窗、会员流水和后台表单，再覆盖其余页面。

视口矩阵：360×800、390×844、430×932、600×960、820×1180、1024×768、1366×768、1440×900、1920×1080。核验 hover/focus/active/disabled/loading、表单错误与成功、筛选与空态、Esc/Tab/遮罩关闭及关闭后的焦点恢复。

原稿没有独立中文字体包，保留原系统字体栈。同一设备和浏览器比较才能判断真实字形及换行差异。原稿缺少素材的头像、妆造和礼品保留其占位设计。

## 复现命令

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run start
node scripts/smoke-routes.mjs --production
python scripts/design-css.py --verify-only
```

HTTP 检查默认端口 3000，支持 `SMOKE_BASE_URL`。开发服务器去掉 `--production`。这些检查不能代替截图和浏览器交互验收。

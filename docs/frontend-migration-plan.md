# 前端迁移实施记录

设计依据：`docs/设计文档.md` 与 `设计网站落地页/` 中的 23 份原生 HTML。按“设计审计 → 工程初始化 → 组件与页面 → 集成验证”执行。

1. 提取原稿：读取全部 HTML、内联 CSS、交互脚本和使用的图片，将对照副本保存到 `temp/`；提取 56 项基础设计变量与页面族断点。
2. 初始化：Next.js App Router、TypeScript strict、Tailwind utilities、后台 Ant Design / React Query；补充部署配置、Prisma 草案及演示数据边界。
3. 组件迁移：建立 UI、布局、业务模块三级结构；按首页/预约、目录/详情、会员、后台分组迁移，保留各原稿 Screen 样式作用域。
4. 开发工具：建立纯客户端 `/dev/design-system`，开发页面地图与原稿对照；生产全部关闭；编写 AGENTS.md 复用与扩展规范。
5. 复核：静态类型、ESLint、表单及路由单元测试、原 CSS 规则序列和 token 等价检查、Next 生产构建与 HTTP 路由检查；独立审查状态流转和样式作用域。

最新结果及未完成的视觉验证见 `docs/verification.md`。浏览器截图比对与构建是两项独立证据，不互相替代。

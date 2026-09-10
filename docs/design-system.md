# 十三雾原生设计源审计

视觉来源是项目根目录 `设计网站落地页/` 的 23 个完整 HTML、DESIGN-HANDOFF.md 与 DESIGN-MANIFEST.json。`temp/` 保存原稿对照，运行时由 Next.js / React 组件渲染，不读取或注入原始 HTML。

## 源结构与复用机会

所有页面均自包含 CSS 与 JavaScript，没有独立样式或脚本依赖。全局提取 56 项基础 :root 变量；仅保留两组原生页面差异：运营页容器1120px，我的评价页自有 --max/--gutter/--ease 别名及简化 mono 栈。以下 8 页的 CSS 完全一致：scripts、sessions、booking、me、admin、admin-sessions、admin-finance、prototype-map；admin-content、script-detail 只在该公共样式后增加小量特例。index 与 shisanwu-landing 的 CSS 与 JS 完全一致。9 个业务页的通用 JS 完全一致，sessions 在此基础上补充筛选持久化。

manifest 将 index 标作 launcher-overview，但实际 index 是完整可交互的营销首页；真正模块导航是 prototype-map。因此首页以实际 HTML 为视觉基准，保留 landing 独立入口，不能把 23 页合并成首页。

## 设计变量

| 变量 | 原值 |
|---|---|
| `--bg` | `#ffffff` |
| `--surface` | `#f5f5f7` |
| `--surface-warm` | `#fbfbfd` |
| `--fg` | `#1d1d1f` |
| `--fg-2` | `#424245` |
| `--muted` | `#6e6e73` |
| `--meta` | `#86868b` |
| `--border` | `#d2d2d7` |
| `--border-soft` | `#e8e8ed` |
| `--accent` | `#0071e3` |
| `--accent-on` | `#ffffff` |
| `--accent-hover` | `#0077ed` |
| `--accent-active` | `#0066cc` |
| `--success` | `#16a34a` |
| `--warn` | `#eab308` |
| `--danger` | `#dc2626` |
| `--font-display` | `"SF Pro Display", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif` |
| `--font-body` | `"SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif` |
| `--font-mono` | `"SF Mono", ui-monospace, "JetBrains Mono", Menlo, Monaco, Consolas, monospace` |
| `--text-xs` | `12px` |
| `--text-sm` | `14px` |
| `--text-base` | `17px` |
| `--text-lg` | `21px` |
| `--text-xl` | `28px` |
| `--text-2xl` | `40px` |
| `--text-3xl` | `56px` |
| `--text-4xl` | `80px` |
| `--leading-body` | `1.47` |
| `--leading-tight` | `1.05` |
| `--tracking-display` | `-0.015em` |
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-12` | `48px` |
| `--section-y-desktop` | `100px` |
| `--section-y-tablet` | `64px` |
| `--section-y-phone` | `40px` |
| `--radius-sm` | `8px` |
| `--radius-md` | `12px` |
| `--radius-lg` | `18px` |
| `--radius-pill` | `980px` |
| `--elev-flat` | `none` |
| `--elev-ring` | `0 0 0 1px var(--border)` |
| `--elev-raised` | `0 12px 32px rgba(0, 0, 0, 0.08)` |
| `--focus-ring` | `0 0 0 4px color-mix(in oklab, var(--accent), transparent 65%)` |
| `--motion-fast` | `150ms` |
| `--motion-base` | `220ms` |
| `--ease-standard` | `cubic-bezier(0.28, 0, 0.22, 1)` |
| `--container-max` | `1024px` |
| `--container-gutter-desktop` | `22px` |
| `--container-gutter-tablet` | `18px` |
| `--container-gutter-phone` | `16px` |

## 已实现的 CSS 架构与去重验证

根布局 `src/app/layout.tsx` 导入 `src/styles/globals.css` 和共享组件补充样式 `src/components/ui/ui.css`。globals 的内部顺序为 Tailwind theme → utilities（无 preflight）→ tokens → reference → 少量无障碍兜底。没有使用 Tailwind 的默认 reset，以免改变原生 heading、button、table、form 的浏览器基线。

`reference.css` 由23页完整CSS解析后的有序规则序列建立前缀树生成。同一路径的相同规则只输出一次；每条规则附带所有使用该规则的页面集合，并用 `:where([data-screen='...'],...)` 作为祖先作用域，额外 specificity 为零。媒体条件与其内部选择器递归处理，规则体与各页源顺序保留。相同名字在不同页面族的不同几何（如 .card、.section、.review、.modal）互不污染。未用全局 selector 集合排序或末条覆盖算法。

| 校验项 | 结果 |
|---|---:|
| 完整源页面 | 23 |
| 全局基础变量 | 56 |
| 原CSS（UTF-8字节） | 301,937 |
| reference.css（UTF-8字节） | 230,171 |
| tokens.css（UTF-8字节） | 2,053 |
| 两文件gzip | 19,160 |
| 排除root/html/scroll-lock后的原规则（含媒体内规则） | 3,097 |
| 去重后规则（含媒体内规则） | 1,332 |
| 移除重复规则 | 1,765 |
| 各页原规则序列逐项等值验证 | 23 / 23 |

文件体积含精确页面作用域字符串；压缩后减少的重复结构由gzip继续共享。验证是CSS结构与来源顺序检查，不代替浏览器像素对比。

### CSS等价性验证范围

项目审计脚本 `scripts/design-css.py` 先去除CSS注释并规范化字符串外的空白，再解析顶层规则与媒体内部规则。每个源页面的规则序列进入前缀树；输出时同时记录该页面收到的原始Rule对象序列，并断言它与输入序列逐项完全相等。这验证规则内容、相对顺序与页面成员关系，而不是只比较规则数。全局化的root/html/body滚动锁是显式排除项，原body视觉样式另外映射到页面作用域。

变量验证将56项全局值与两组页面覆盖合并，与每页原root定义逐项比较；只把空白、等价的零前缀小数与三位/六位十六进制颜色视作同值。生成结果再次解析检查括号与规则结构。审计脚本的 `--verify-only` 模式仅内存重建期望CSS，并与当前tokens.css/reference.css逐字比较，不写文件；若集成阶段有意改动基线，这个检查会明确失败，不能直接运行生成模式覆盖改动。该检查不验证组件DOM是否相同，也不能代替真实浏览器的computed style、交互与截图对比。

在项目根目录执行（Python 3.10+，只用标准库）：

```bash
python scripts/design-css.py --verify-only
```

不传参数也默认只读验证。脚本直接从 `temp/*.html` 提取内联style，不需要额外保存CSS副本，不依赖其他工作目录或浏览器。只有明确需要将已更新的原稿重新生成视觉基线时，才执行 `python scripts/design-css.py --write`；该模式只写 `src/styles/tokens.css` 与 `src/styles/reference.css`。不要用再生覆盖尚未回写到原稿的有意集成修改。

`tokens.css` 的原生页面覆盖：

```css
:where([data-screen='admin-ops']) { --container-max: 1120px; }
:where([data-screen='me-reviews']) {
  --font-mono: "SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace;
  --ease: cubic-bezier(.28, 0, .22, 1);
  --max: 1024px;
  --gutter: 22px;
}
```

页面容器必须设置原源文件stem对应的 `data-screen`，例如 `<div data-screen="scripts">`。`index` 额外兼容 `home`；`prototype-map` 额外兼容原始的 `overview`。其他页面保持 `dm-detail`、`wallet-detail`、`admin-sessions` 等命名，与地址栏路由可不同。导航、footer和模态必须位于该容器作用域中；若模态用 portal，其外层必须携带同一个 data-screen。纯展示preview如复用某一页面族，应在对应样本外层使用相同data-screen，保证组件的原生variant样式可见。

原 body 的视觉声明映射到页面容器。html 文档滚动与字体基础统一在 globals；模态滚动锁由交互组件控制。`[hidden] { display:none!important }` 防止原生grid/flex覆盖React的隐藏状态。无障碍兜底包含键盘focus、按钮disabled/loading、输入invalid、sr-only、prefers-reduced-motion，以及原稿缺失的首页DM手机单列规则。

## 当前组件与目录结构

以下路径与导出均已存在。`src/app/` 保存显式 App Router 页面，页面将参数传给 `src/features/` 的对应模块；原生HTML留在 `temp/` 作开发对照。

| 层级 | 实际文件/目录 | 当前职责 |
|---|---|---|
| 通用UI | `src/components/ui/Button.tsx` | primary/secondary/ghost/danger variant、href链接或原生button、loading、disabled、className扩展 |
| 通用UI | `src/components/ui/Card.tsx` | Card（as/className）、Badge（className）、EmptyState |
| 表单 | `src/components/ui/form-controls.tsx` | Input、Select、Textarea、Field；标签、帮助文本与错误展示 |
| 交互 | `src/components/ui/Tabs.tsx`、`Dialog.tsx`、`Toast.tsx` | 标签选择与键盘切换；弹窗聚焦/关闭；ToastProvider、useToast与提示出口 |
| 页面外壳 | `src/components/layout/Screen.tsx`、`SiteHeader.tsx`、`SiteFooter.tsx` | data-screen作用域、页内Toast出口、可配置导航与页脚 |
| 剧本/DM/妆造 | `src/features/catalog/` | catalog-cards中的ScriptCard/DmCard/CostumeCard；catalog-chrome；data.ts；各列表与详情screen |
| 会员与账户 | `src/features/member/` | components.tsx中的MemberHeaderActions、MemberBadge、WalletLedger、ReviewCard与业务空态；data.ts；账户/评价/流水/历史/登录/举报/礼品页面 |
| 首页 | `src/features/home/home-page.tsx` | HomePage通过variant组合首页与独立landing，保留原生模块布局 |
| 预约与场次 | `src/features/booking/` | CustomerHeader、BookingPage、SessionsPage、validation.ts |
| 后台 | `src/features/admin/` | admin-shared中的AdminFrame、PageHead、MetricGrid、StatusBadge、Segmented等；各运营页面；admin-providers配置AntD主题与React Query |
| 开发工具 | `src/features/dev/` | 设计系统纯客户端预览、原型导航数据、ViewportCompare |
| 路由与契约 | `src/lib/routes.ts`、`src/lib/api/contracts.ts` | 原HTML与规范路由映射、旧query转换；后续API类型边界 |
| 样式 | `src/styles/`、`src/components/ui/ui.css`、各feature的enhancements.css | 基础tokens、去重视觉基线、通用组件补充状态、必要的局部增强 |

新增页面必须先查这些现有导出。能通过 props、variant、as、href、className 或已有业务数据扩展时，优先扩展原组件；现有组件确实不能满足需求时才新增。布局的 `.container`、`.section`、`.stack`、`.grid-*` 等目前是共享CSS类，并没有同名的Container/Section/Grid React组件。项目也没有 `components/domain/` 目录。

未来建议：仅当新增需求形成明确的跨页面复用时，再考虑抽取Container、PageHeading、Switch、Progress或独立domain层；不要把这些建议视为已实现API。公共基础组件与feature内部的业务组件可继续分层，不需为目录对称而搬迁。

营销剧本卡为4:3封面、22px body、竖排文字、hover -4px；业务剧本卡为16:10封面、20px body、hover -2px。这些原生几何差异必须保留，不能把一种样式全局覆盖另一种。React事件与状态负责交互；不使用eval、动态脚本插入或整页HTML注入承载业务页面。

## 页面映射（当前实现）

下面的默认目标逐项对应 `src/lib/routes.ts` 的 sourceRoutes。详情页支持动态id，但旧原稿未提供参数时转到表中默认记录。

| 原 HTML | Next 路由 | 页面 | 行为 |
|---|---|---|---|
| `index.html` | `/` | 营销首页 | 预约、场次日期筛选、安装引导、通知 |
| `shisanwu-landing.html` | `/shisanwu-landing` | 独立落地页 | 与首页共享模块；导航与场次网格不同 |
| `scripts.html` | `/scripts` | 剧本列表 | 推荐/全部/新上架标签；搜索；价格/评分排序 |
| `script-detail.html` | `/scripts/wugang-laixin` | 剧本详情 | 角色、评分、关联DM/妆造、评价表单 |
| `sessions.html` | `/sessions` | 拼车大厅 | 日期+剧本双筛选、保存筛选、加入弹窗 |
| `booking.html` | `/booking/new` | 自主预约 | 剧本、人数、时间、联系人表单 |
| `dms.html` | `/dms` | DM列表 | 题材+关键词双筛选 |
| `dm-detail.html` | `/dms/linshen` | DM详情 | linshen/adu/shisan记录切换 |
| `costumes.html` | `/costumes` | 妆造列表 | 题材+关键词双筛选 |
| `costume-detail.html` | `/costumes/wugang-old` | 妆造详情 | wugang-old/letter-room/chang-an记录切换 |
| `gifts.html` | `/gifts` | 礼品橱窗 | 积分导航、待配置位、兑换流程 |
| `login.html` | `/login` | 登录注册 | tab、验证、成功态 |
| `me.html` | `/me` | 个人中心 | 侧导航、预约、会员、流水、历史/评价入口 |
| `me-reviews.html` | `/me/reviews` | 我的评价 | 筛选、删除、空态 |
| `played-script-detail.html` | `/me/history/wugang-laixin` | 玩过剧本 | 封面loading/ready/error、缺失素材态 |
| `wallet-detail.html` | `/me/wallet` | 流水明细 | 类型筛选、空态、响应式表格 |
| `report.html` | `/report` | 举报 | 类型联动对象、上传入口、验证成功态 |
| `admin.html` | `/admin` | 运营工作台 | 统计、今日场次、待办 |
| `admin-sessions.html` | `/admin/sessions` | 场次管理 | 搜索、新建、押金登记弹窗 |
| `admin-finance.html` | `/admin/finance` | 财务结算 | 结算表单、开关、账目表格 |
| `admin-content.html` | `/admin/content` | 内容员工 | tab、搜索、新建剧本弹窗、关联资产 |
| `admin-ops.html` | `/admin/ops` | 运营处理 | 审核、登记/退款/结算、内容治理与资产状态 |
| `prototype-map.html` | `/dev/prototype-map` | 原型导航 | 各模块入口；开发工具性质 |

`src/app/[legacy]/page.tsx` 为原始 `*.html` URL 及相应扁平名称提供重定向。`sourceHref` 将DM旧参数 `?dm=linshen|adu|shisan`、妆造旧参数 `?costume=wugang-old|letter-room|chang-an`、剧本旧参数 `?script=<id>` 转为对应动态详情路由，并保留其余query与hash。

附加入口已经有独立页面文件：`/register`、`/me/booking`、`/me/member`、`/me/history`。开发工具入口为 `/dev/design-system`、`/dev/prototype-map`、`/dev/compare`；原稿对照通过开发专用 `/dev/reference/[...path]` 提供。

## 响应式契约

| 页面族 | 平板规则 | 手机规则 |
|---|---|---|
| 公共业务页面 | 920px：2/3/4列与2:1区域改单列；侧导航两列；表单单列；calendar四列；数据行隐藏次要列 | 560px：导航两行，所有主入口仍可见；calendar两列；section40px；卡片20px；toast两边16px；评价时间落第二列 |
| 首页/landing | 920px：导航链接隐藏；hero/session/experience单列；section64px | 620px：section40px；nav58px；剧本单列；场次操作移第二列；模态缩边距 |
| DM/妆造/礼品/举报/login/admin-ops | 920px与620px，依各自页面族保留网格与表单转换 | 不可套用560px页面规则 |
| played-script-detail | 920px调整gutter与段距 | 640px：导航两行；历史表格变卡片，封面上限280px |
| wallet-detail | 920px：表格变双列数据字段卡，::before用data-label | 640px：单列字段卡、标题行堆叠、导航两行 |
| me-reviews | 独立700px断点 | 保留其独立列表网格与导航行为 |

验证视口：360×800、390×844、430×932、600×960、820×1180、1024×768、1366×768、1440×900、1920×1080。保留原 clamp、颜色混合、object-fit 与字体栈；避免横向页面滚动，表格容器滚动应仅在源使用 table-wrap 时保留。

## 交互与状态清单

迁移检查涵盖下面这些原生状态。通用行为为 tabs、表单校验、toast、模态、搜索/排序；页面级包括 DM/妆造档案数据映射、评价删除与空态、举报对象联动、运营列表状态推进、钱包筛选、封面加载状态。sessions 筛选存储键为 shisanwu-session-filter；通用最近页键为 shisanwu-last-screen。兼容存储异常（隐私模式等）时不得崩溃。

## 资源与保真风险

1. 实际使用仅3个本地图片资源：`assets/shisanwu-logo.jpg`（全部页面）、`43947e6d13429e6e24ef2f82a3ac0265.jpg`（剧本列表与详情）、`assets/wugang-laixin-cover.svg`（玩过的剧本）。其余预览PNG不应当作整页背景替代真实组件。
2. DM头像、妆造实拍、礼品橱窗和两本历史封面明确无素材；保留结构与待上传/待配置状态，不引入未经提供的照片或商品价格。
3. 原稿无本地字体包且未加载CDN。SF Pro回退到Helvetica/Arial，再由系统处理中文；跨系统字体差异是原稿本身特性。必须与原稿在同一浏览器/系统对比，不擅自换成Inter或默认Tailwind字体。
4. 首页 .dm-grid 缺失手机列数覆盖，是应修复的窄屏溢出缺口。landing 的场次区域比index少一层右栏div，若修复其错列，应在验证记录中明确几何修正。
5. 原稿同一本剧本在营销与业务页的人数/年份/评分略有矛盾；本次以各页原始文案保真，不把假数据混同真实业务记录。
6. 源包含“原型/真实环境接入”之类实现说明。根据交接要求，正式产品界面应去除设计流程注释；必要的演示模式提示应简短准确，避免宣称真实认证、退款、结算、通知已发生。模拟数据留在独立fixture层。
7. 前端实现只能体现权限所对应的UI，不能替代服务端权限；公开路由不得意外渲染真实举报人等后端敏感数据。
8. 后台现有AdminProviders已通过AntD ConfigProvider设置品牌色、字体和圆角，并挂载React Query。继续沿用此配置；不要用未配置的AntD默认外观替代原稿组件。

## 开发预览页验收

`/dev/design-system` 通过路由层 `NODE_ENV` 检查仅在development开放，production返回404。DesignSystemLoader使用dynamic import与 `ssr:false` 加载DesignSystemPreview，展示内容由客户端渲染。预览复用实际Button、Card、Badge、Input/Select/Textarea/Field、Tabs、Dialog和Toast，以及共享布局CSS类，演示颜色、字体、间距、圆角、阴影与控件状态；预览样式在 `src/features/dev/design-system/preview.css` 中。页面不依赖后端数据请求。

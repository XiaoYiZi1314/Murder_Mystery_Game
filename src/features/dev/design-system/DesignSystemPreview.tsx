"use client";

import { useState, type FormEvent } from "react";
import { SiteHeader, Screen } from "@/components/layout";
import {
  Badge,
  Button,
  Card,
  Dialog,
  Field,
  Input,
  Select,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import { ContentCard } from "@/features/catalog/catalog-cards";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { SessionCard } from "@/features/booking/session-card";
import { MediaField } from "@/features/admin/content/media-field";
import { validatePreviewEmail } from "./validation";

const colors = [
  ["背景", "--bg", "#ffffff"],
  ["表面", "--surface", "#f5f5f7"],
  ["暖色表面", "--surface-warm", "#fbfbfd"],
  ["主文字", "--fg", "#1d1d1f"],
  ["次文字", "--fg-2", "#424245"],
  ["弱文字", "--muted", "#6e6e73"],
  ["元信息", "--meta", "#86868b"],
  ["边框", "--border", "#d2d2d7"],
  ["柔和边框", "--border-soft", "#e8e8ed"],
  ["品牌色", "--accent", "#0071e3"],
  ["悬停", "--accent-hover", "#0077ed"],
  ["按下", "--accent-active", "#0066cc"],
  ["成功", "--success", "#16a34a"],
  ["提醒", "--warn", "#eab308"],
  ["危险", "--danger", "#dc2626"],
] as const;

const typeScale = [
  ["展示 4", "--text-4xl", "80px"],
  ["展示 3", "--text-3xl", "56px"],
  ["展示 2", "--text-2xl", "40px"],
  ["标题", "--text-xl", "28px"],
  ["副标题", "--text-lg", "21px"],
  ["正文", "--text-base", "17px"],
  ["辅助", "--text-sm", "14px"],
  ["标注", "--text-xs", "12px"],
] as const;

const spaces = [4, 8, 12, 16, 20, 24, 32, 48] as const;

const pageLinks = [
  ["首页", "/", "品牌与体验入口"],
  ["剧本", "/scripts", "目录、搜索与筛选"],
  ["拼车大厅", "/sessions", "日期与剧本筛选"],
  ["自主预约", "/booking/new", "完整预约表单"],
  ["我的", "/me", "会员与个人记录"],
  ["运营工作台", "/admin", "商家管理入口"],
] as const;

export function DesignSystemPreview() {
  const toast = useToast();
  const [tab, setTab] = useState("overview");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [emailValid, setEmailValid] = useState(false);

  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validatePreviewEmail(email);
    setEmailError(error);
    setEmailValid(!error);
    toast(error ?? "表单校验通过");
  }

  return (
    <Screen name="scripts" className="design-preview">
      <SiteHeader active="scripts" mode="customer">
        <Button href="/" variant="secondary">
          返回首页
        </Button>
      </SiteHeader>

      <main>
        <section className="page-head">
          <div className="container dp-hero">
            <div>
              <p className="eyebrow">Development only / 56 tokens</p>
              <h1>十三雾设计系统</h1>
              <p className="lead">
                用真实共享组件检查视觉语言、响应式布局和交互状态。此页面只在开发环境可访问。
              </p>
            </div>
            <div className="dp-hero-meta" aria-label="预览说明">
              <span>CLIENT RENDERED</span>
              <strong>Components · Tokens · Patterns</strong>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="color-title">
          <div className="container">
            <SectionHead
              eyebrow="Foundations"
              title="颜色与语义状态"
              id="color-title"
              detail="来自 56 项共享 token 的核心颜色。"
            />
            <div className="dp-color-grid">
              {colors.map(([label, token, value]) => (
                <article className="dp-color" key={token}>
                  <span
                    className="dp-color-swatch"
                    style={{ background: `var(${token})` }}
                  />
                  <span>
                    <strong>{label}</strong>
                    <code>{token}</code>
                    <small>{value}</small>
                  </span>
                </article>
              ))}
            </div>
            <div className="dp-status-row" aria-label="语义状态">
              <Badge variant="status" className="open">
                成功 · 可加入
              </Badge>
              <Badge variant="status" className="pending">
                提醒 · 待确认
              </Badge>
              <Badge variant="status" className="locked">
                信息 · 已锁车
              </Badge>
              <Badge variant="status" className="danger">
                危险 · 需处理
              </Badge>
              <Badge>默认标签</Badge>
              <Badge variant="pill">深色胶囊</Badge>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="type-title">
          <div className="container">
            <SectionHead
              eyebrow="Typography"
              title="字体与层级"
              id="type-title"
              detail="展示字体、正文字体与等宽字体各司其职。"
            />
            <div className="dp-font-stacks">
              <Card>
                <span className="meta">DISPLAY</span>
                <strong className="dp-display-sample">雾里见真章 Aa</strong>
                <code>SF Pro Display · Helvetica Neue · Arial</code>
              </Card>
              <Card>
                <span className="meta">BODY</span>
                <strong className="dp-body-sample">
                  杭州线下剧本杀体验空间
                </strong>
                <code>SF Pro Text · Helvetica Neue · Arial</code>
              </Card>
              <Card>
                <span className="meta">MONO</span>
                <strong className="dp-mono-sample">06.08 · 19:30 · ¥298</strong>
                <code>SF Mono · JetBrains Mono · Menlo</code>
              </Card>
            </div>
            <div className="dp-type-scale">
              {typeScale.map(([label, token, value]) => (
                <div className="dp-type-row" key={token}>
                  <span className="meta">
                    {label}
                    <code>{token}</code>
                  </span>
                  <span style={{ fontSize: `var(${token})` }}>十三雾</span>
                  <code>{value}</code>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="shape-title">
          <div className="container">
            <SectionHead
              eyebrow="Geometry"
              title="间距、圆角与阴影"
              id="shape-title"
              detail="4px 基础节奏覆盖密集工具和舒展内容。"
            />
            <div className="grid-2">
              <Card>
                <h3>间距尺</h3>
                <div className="dp-space-list">
                  {spaces.map((size, index) => (
                    <div key={size}>
                      <code>
                        space-{index + 1} · {size}px
                      </code>
                      <span style={{ width: size * 3 }} />
                    </div>
                  ))}
                </div>
              </Card>
              <div className="dp-shape-grid">
                <div className="dp-shape dp-radius-sm">
                  <code>8px · small</code>
                </div>
                <div className="dp-shape dp-radius-md">
                  <code>12px · medium</code>
                </div>
                <div className="dp-shape dp-radius-lg">
                  <code>18px · large</code>
                </div>
                <div className="dp-shape dp-radius-pill">
                  <code>pill · 980px</code>
                </div>
                <div className="dp-shape dp-elev-ring">
                  <code>elev-ring</code>
                </div>
                <div className="dp-shape dp-elev-raised">
                  <code>elev-raised</code>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="component-title">
          <div className="container">
            <SectionHead
              eyebrow="Components"
              title="按钮、字段与卡片"
              id="component-title"
              detail="下列实例直接使用 components/ui 的导出。"
            />
            <Card className="dp-component-block" as="section">
              <div className="dp-block-head">
                <h3>Button</h3>
                <code>Button</code>
              </div>
              <div className="dp-control-row" data-screen="admin-ops">
                <Button onClick={() => toast("主操作已触发")}>Primary</Button>
                <Button
                  variant="secondary"
                  onClick={() => toast("次操作已触发")}
                >
                  Secondary
                </Button>
                <Button variant="ghost" onClick={() => toast("轻操作已触发")}>
                  Ghost
                </Button>
                <Button
                  variant="danger"
                  onClick={() => toast("危险操作仅作演示")}
                >
                  Danger
                </Button>
                <Button disabled>Disabled</Button>
                <Button loading>Loading</Button>
              </div>
            </Card>

            <div className="grid-2 dp-form-and-card">
              <Card as="section">
                <div className="dp-block-head">
                  <h3>Form controls</h3>
                  <code>Field · Input · Select · Textarea</code>
                </div>
                <form className="dp-form" onSubmit={validate} noValidate>
                  <Field
                    label="正常字段"
                    htmlFor="preview-name"
                    help="点击或按 Tab 查看真实 focus ring。"
                  >
                    <Input id="preview-name" placeholder="输入玩家昵称" />
                  </Field>
                  <Field
                    label="聚焦状态"
                    htmlFor="preview-focus"
                    help="以共享 --focus-ring 展示。"
                  >
                    <Input
                      id="preview-focus"
                      className="dp-forced-focus"
                      defaultValue="雾中来信"
                    />
                  </Field>
                  <Field
                    label="邮箱校验"
                    htmlFor="preview-email"
                    error={emailError}
                    help={
                      emailValid ? (
                        <span className="dp-success">格式正确，可以继续</span>
                      ) : (
                        "提交以查看错误或成功状态。"
                      )
                    }
                  >
                    <Input
                      id="preview-email"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setEmailError(undefined);
                        setEmailValid(false);
                      }}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={
                        emailError
                          ? "preview-email-error"
                          : "preview-email-help"
                      }
                      placeholder="name@example.com"
                    />
                  </Field>
                  <Field label="选择" htmlFor="preview-select">
                    <Select id="preview-select" defaultValue="mystery">
                      <option value="mystery">推理</option>
                      <option value="emotion">情感</option>
                      <option value="mechanism">机制</option>
                    </Select>
                  </Field>
                  <Field
                    label="禁用字段"
                    htmlFor="preview-disabled"
                    help="不可编辑状态。"
                  >
                    <Input
                      id="preview-disabled"
                      value="已由系统锁定"
                      disabled
                      readOnly
                    />
                  </Field>
                  <Field
                    label="备注"
                    htmlFor="preview-note"
                    className="dp-span-2"
                  >
                    <Textarea
                      id="preview-note"
                      placeholder="记录玩家的特殊需求"
                    />
                  </Field>
                  <Button type="submit">验证表单</Button>
                </form>
              </Card>

              <div className="dp-card-stack">
                <Card as="article">
                  <div className="dp-card-header">
                    <span className="eyebrow">Default card</span>
                    <Badge>剧本</Badge>
                  </div>
                  <div className="dp-card-body">
                    <h3>雾中来信</h3>
                    <p>
                      Header、body 与 footer 以组合方式复用同一个 Card 外壳。
                    </p>
                  </div>
                  <div className="dp-card-footer">
                    <span className="meta">6 人 · 4.5 小时</span>
                    <Button href="/scripts/wugang" variant="ghost">
                      查看详情
                    </Button>
                  </div>
                </Card>
                <Card variant="surface" as="article">
                  <span className="eyebrow">Surface</span>
                  <h3>弱层级信息</h3>
                  <p>适合辅助说明与次级内容。</p>
                </Card>
                <Card variant="dark" as="article">
                  <span className="eyebrow">Dark</span>
                  <h3>关键指标</h3>
                  <p className="muted">在高对比容器中承载聚焦信息。</p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="interaction-title">
          <div className="container">
            <SectionHead
              eyebrow="Interaction"
              title="Tabs、Dialog 与 Toast"
              id="interaction-title"
              detail="交互完全保留在浏览器状态中，不发出数据请求。"
            />
            <div className="dp-interaction" data-screen="admin-ops">
              <Tabs
                label="预览内容"
                value={tab}
                onChange={setTab}
                items={[
                  { value: "overview", label: "概览" },
                  { value: "usage", label: "使用方式" },
                  { value: "disabled", label: "不可用", disabled: true },
                ]}
              />
              <Card className="dp-tab-panel" role="tabpanel">
                {tab === "overview" ? (
                  <>
                    <h3>共享边界清楚</h3>
                    <p>
                      页面组合组件，组件读取 token，源页面样式由 data-screen
                      选择。
                    </p>
                  </>
                ) : (
                  <>
                    <h3>组合优先</h3>
                    <p>
                      用 Card、Field 和 Button
                      组合业务界面，保持语义和交互一致。
                    </p>
                  </>
                )}
              </Card>
              <div className="dp-control-row">
                <Button onClick={() => setDialogOpen(true)}>打开 Dialog</Button>
                <Button
                  variant="secondary"
                  onClick={() => toast("这是一条来自共享 useToast 的消息")}
                >
                  触发 Toast
                </Button>
              </div>
            </div>
            <div data-screen="home">
              <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title="确认预览交互"
                description="共享 Dialog 提供焦点管理、Esc 关闭和焦点恢复。"
              >
                <div className="dp-dialog-body">
                  <p>此操作只改变当前浏览器中的展示状态。</p>
                  <div className="dp-control-row">
                    <Button
                      onClick={() => {
                        setDialogOpen(false);
                        toast("Dialog 已确认");
                      }}
                    >
                      确认
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setDialogOpen(false)}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              </Dialog>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="content-media-preview">
          <div className="container">
            <h2 id="content-media-preview">内容与媒体组件</h2>
            <p>以下复用实际卡片和上传控件；上传仍受真实会话权限约束。</p>
            <div className="grid-3">
              <ContentCard
                item={{
                  id: "preview",
                  href: "/scripts",
                  title: "内容空态预览",
                  image: null,
                  summary: "门店尚未上传图片时的明确占位。",
                  tags: [],
                  rating: null,
                }}
              />
            </div>
            <MediaField purpose="script_cover" />
          </div>
        </section>
        <section className="section">
          <div className="container">
            <h2>C3 场次与通知组件</h2>
            <p>
              以下为开发预览数据，不进入业务列表；小铃铛读取当前账号真实通知。
            </p>
            <NotificationBell />
            <SessionCard
              session={{
                id: "preview",
                script_id: "preview",
                script: {
                  id: "preview",
                  title: "场次空态预览",
                  slug: "preview",
                  cover: "",
                },
                primary_dm_id: null,
                primary_dm_name: null,
                backup_dm_ids: [],
                start_time: "2030-01-01T06:00:00Z",
                player_min: 4,
                player_max: 6,
                booked_count: 0,
                remaining_count: 6,
                needed_count: 4,
                price: "0.00",
                status: "draft",
                source: "preview",
                remark: null,
                updated_at: "2030-01-01T00:00:00Z",
              }}
              onJoin={() => undefined}
            />
          </div>
        </section>
        <section className="section" aria-labelledby="layout-title">
          <div className="container">
            <SectionHead
              eyebrow="Patterns"
              title="导航与响应式布局"
              id="layout-title"
              detail="缩放浏览器即可检查 2、3、4 列在断点下的变化。"
            />
            <div className="dp-layout-group">
              <LayoutSample columns="grid-2" count={2} label="2 columns" />
              <LayoutSample columns="grid-3" count={3} label="3 columns" />
              <LayoutSample columns="grid-4" count={4} label="4 columns" />
            </div>
            <h3 className="dp-links-title">关键页面</h3>
            <div className="grid-3 dp-link-grid">
              {pageLinks.map(([label, href, detail]) => (
                <Card as="article" key={href} className="dp-link-card">
                  <div>
                    <Badge>{label}</Badge>
                    <p>{detail}</p>
                  </div>
                  <Button href={href} variant="ghost">
                    打开页面 →
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </Screen>
  );
}

function SectionHead({
  eyebrow,
  title,
  detail,
  id,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  id: string;
}) {
  return (
    <div className="dp-section-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
      </div>
      <p>{detail}</p>
    </div>
  );
}

function LayoutSample({
  columns,
  count,
  label,
}: {
  columns: "grid-2" | "grid-3" | "grid-4";
  count: number;
  label: string;
}) {
  return (
    <div>
      <code>{label}</code>
      <div className={`${columns} dp-layout-sample`}>
        {Array.from({ length: count }, (_, index) => (
          <Card key={index}>
            <span className="meta">{String(index + 1).padStart(2, "0")}</span>
            <strong>布局单元</strong>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* eslint-disable @next/next/no-img-element -- approved local brand and reencoded media */
"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Dialog, useToast } from "@/components/ui";
import { Screen, SiteFooter, SiteHeader } from "@/components/layout";
import type { ScriptSummaryDto, DmPublicDto } from "@/lib/api/contracts";
import { SessionCard } from "@/features/booking/session-card";
import type { SessionDto } from "@/lib/api/contracts";
type HomeVariant = "home" | "landing";
type BookingSeed = { script?: string; session?: string };
export interface HomeContent {
  sessions?: SessionDto[];
  scripts: ScriptSummaryDto[];
  dms: DmPublicDto[];
  wechat_qrcode: string | null;
}
function HomeBookingDialog({
  open,
  onClose,
  qr,
}: {
  open: boolean;
  onClose: () => void;
  qr: string | null;
}) {
  return (
    <Dialog
      variant="home"
      open={open}
      onClose={onClose}
      title="联系门店确认预约"
    >
      <p>选择已有场次直接报名，或提交自主预约；审核通过后自动为团队占坑。</p>
      <div className="c3-actions">
        <Button href="/sessions">查看开放场次</Button>
        <Button href="/booking/new">提交自主预约</Button>
      </div>
      {qr ? (
        <img
          src={qr}
          width={240}
          height={240}
          style={{ objectFit: "contain" }}
          alt="商家微信二维码"
        />
      ) : (
        <p>商家二维码暂未配置，请通过门店现有联系方式咨询。</p>
      )}
      <Button onClick={onClose}>关闭</Button>
    </Dialog>
  );
}
function ScriptSection({ scripts }: { scripts: ScriptSummaryDto[] }) {
  return (
    <section
      className="section light-section"
      id="scripts"
      data-od-id="scripts"
    >
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">精选剧本</p>
            <h2>故事先替你留好位置。</h2>
            <p>每一本都标注了时长、人数和风格。</p>
          </div>
          <Link className="text-link" href="/scripts">
            查看全部剧本 →
          </Link>
        </div>
        <div className="grid-3">
          {scripts.map((s) => (
            <article className="script-card" key={s.id}>
              <div className="script-cover">
                <img
                  src={s.thumbnail ?? s.cover}
                  alt={s.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div className="cover-meta">
                  <span>{s.tags.join(" · ")}</span>
                  <span>
                    {s.player_min}–{s.player_max} 人
                  </span>
                </div>
              </div>
              <div className="script-body">
                <div className="script-title">
                  <h3>{s.title}</h3>
                  <span className="rating">
                    {s.review_count ? s.avg_rating : "暂无评价"}
                  </span>
                </div>
                <p className="script-desc">
                  {s.tagline ?? "详细介绍登录后查看"}
                </p>
                <div className="tag-row">
                  {s.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
                <div className="script-bottom">
                  <span className="price">
                    人均 <strong>¥{s.price}</strong>
                  </span>
                  <Button variant="secondary" href={`/scripts/${s.slug}`}>
                    查看详情
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!scripts.length && (
          <p role="status">暂无精选剧本，门店发布后将在这里展示。</p>
        )}
      </div>
    </section>
  );
}
function SessionSection({ sessions }: { sessions: SessionDto[] }) {
  return (
    <section className="section" id="sessions">
      <div className="container">
        <p className="eyebrow">近期场次</p>
        <h2>下一场故事，一起入座。</h2>
        <div className="c3-grid">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
        {!sessions.length && <p>暂无开放场次，门店发布后将在这里显示。</p>}
      </div>
    </section>
  );
}

function DmSection({ dms }: { dms: DmPublicDto[] }) {
  return (
    <section className="section dm-section" id="dms">
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">认识 DM</p>
            <h2>找到适合这本故事的带本人。</h2>
          </div>
          <Link className="text-link" href="/dms">
            查看全部 DM →
          </Link>
        </div>
        <div className="dm-grid">
          {dms.map((d) => (
            <article className="dm-card" key={d.id}>
              <div className="dm-card-head">
                <div className="dm-avatar">
                  {d.avatar ? (
                    <img src={d.avatar} alt={d.name} width={64} height={64} />
                  ) : (
                    d.name.slice(0, 1)
                  )}
                </div>
                <h3>{d.name}</h3>
              </div>
              <p>{d.bio ?? "个人介绍待补充"}</p>
              <div className="tag-row">
                {d.specialty_tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
              <div className="dm-card-foot">
                <Link href={`/dms/${d.slug ?? d.id}`}>查看主页 →</Link>
              </div>
            </article>
          ))}
        </div>
        {!dms.length && <p>暂无已发布的 DM 资料。</p>}
      </div>
    </section>
  );
}
function ExperienceSection() {
  return (
    <section
      className="section experience-section"
      id="experience"
      data-od-id="experience"
    >
      <div className="container experience-grid">
        <div className="experience-copy">
          <p className="eyebrow">一场完整的体验</p>
          <h2 data-od-id="experience-heading">从坐下那一刻，故事就开始了。</h2>
          <p>
            十三雾把选本、组局、妆造和带本放进同一场体验里。你只需要带着好奇心到店。
          </p>
          <a className="text-link" href="#booking" data-od-id="experience-link">
            了解预约方式 →
          </a>
        </div>
        <div className="experience-list">
          <div className="experience-item" data-od-id="experience-step-01">
            <span className="experience-index">01</span>
            <div>
              <h3>先选一个想进入的世界</h3>
              <p>按题材、人数和时长找到适合今晚的故事。</p>
            </div>
          </div>
          <div className="experience-item" data-od-id="experience-step-02">
            <span className="experience-index">02</span>
            <div>
              <h3>和同频的人拼成一桌</h3>
              <p>查看门店发布的真实开放场次，为你的团队报名。</p>
            </div>
          </div>
          <div className="experience-item" data-od-id="experience-step-03">
            <span className="experience-index">03</span>
            <div>
              <h3>让 DM 带你走到真相前</h3>
              <p>现场妆造、角色状态和沉浸式流程，一次准备好。</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomePage({
  variant,
  data = { scripts: [], dms: [], wechat_qrcode: null },
}: {
  variant: HomeVariant;
  data?: HomeContent;
}) {
  const toast = useToast();
  const [booking, setBooking] = useState<BookingSeed | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const installPrompt = useRef<{
    prompt: () => void;
    userChoice: Promise<unknown>;
  } | null>(null);

  useEffect(() => {
    function capture(event: Event) {
      event.preventDefault();
      installPrompt.current = event as Event & {
        prompt: () => void;
        userChoice: Promise<unknown>;
      };
    }
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  function confirmInstall() {
    const prompt = installPrompt.current;
    if (!prompt) {
      const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      toast(
        isiOS
          ? "请点浏览器的分享按钮，再选择“添加到主屏幕”"
          : "安装方式会随浏览器显示，按步骤即可添加到桌面",
      );
      setInstallOpen(false);
      return;
    }
    prompt.prompt();
    void prompt.userChoice.finally(() => {
      installPrompt.current = null;
      setInstallOpen(false);
    });
  }

  const openBooking = (seed: BookingSeed = {}) => setBooking(seed);
  return (
    <Screen name={variant === "home" ? "index" : "shisanwu-landing"}>
      <SiteHeader
        mode={variant}
        onBooking={() => openBooking()}
        navItems={
          variant === "landing"
            ? [
                { key: "scripts", href: "/scripts", label: "剧本" },
                { key: "sessions", href: "/sessions", label: "拼车大厅" },
                {
                  key: "experience",
                  href: "#experience",
                  label: "关于十三雾",
                },
              ]
            : undefined
        }
      />
      <main id="top">
        <section className="hero-dark" data-od-id="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">十三雾 · 剧本杀现场</p>
              <h1 data-od-id="hero-heading">今晚，进入另一个身份。</h1>
              <p className="lead">
                选一本想玩的故事，约上同频的人。剩下的交给
                DM、妆造，以及灯亮之后的两个小时。
              </p>
              <div className="hero-cta">
                <Button
                  onClick={() => openBooking()}
                  data-open-booking=""
                  data-od-id="hero-primary-cta"
                >
                  联系门店预约
                </Button>
                <Button
                  variant="secondary"
                  className="btn-arrow"
                  href="/scripts"
                  data-od-id="hero-secondary-cta"
                >
                  先看看剧本
                </Button>
              </div>
            </div>
            <div className="hero-logo-stage" aria-label="十三雾品牌标志">
              <img
                className="hero-logo"
                src="/assets/shisanwu-logo.jpg"
                alt="十三雾猫形品牌标志"
              />
            </div>
            <div className="hero-foot row-between">
              <span className="scroll-mark">向下探索</span>
              <span className="meta">杭州 · 单店预约制</span>
            </div>
          </div>
        </section>
        <ScriptSection scripts={data.scripts} />
        <SessionSection sessions={data.sessions ?? []} />
        <DmSection dms={data.dms} />
        <ExperienceSection />
        <section
          className="section cta-section"
          id="booking"
          data-od-id="cta-strip"
        >
          <div className="container">
            <p className="eyebrow">下一场，见</p>
            <h2 data-od-id="cta-heading">把今晚留给一个好故事。</h2>
            <p className="lead">
              告诉我们你想玩的剧本、时间和人数。十三雾会在确认后联系你。
            </p>
            <Button
              onClick={() => openBooking()}
              data-open-booking=""
              data-od-id="cta-booking"
            >
              联系门店预约
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter
        dataOdId="footer"
        meta={
          <>
            <span className="meta">预约制 · 线下体验 · 杭州</span>
            <Button
              variant="ghost"
              onClick={() => setInstallOpen(true)}
              data-open-install=""
              data-od-id="install-trigger-footer"
            >
              添加到桌面
            </Button>
          </>
        }
      >
        <span>© 2025 十三雾 · 剧本杀</span>
        <span className="meta">预约制 · 线下体验 · 杭州</span>
        <Button
          variant="ghost"
          onClick={() => setInstallOpen(true)}
          data-open-install=""
          data-od-id="install-trigger-footer"
        >
          添加到桌面
        </Button>
      </SiteFooter>
      <HomeBookingDialog
        open={booking !== null}
        qr={data.wechat_qrcode}
        onClose={() => setBooking(null)}
      />
      <Dialog
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        title={<span data-od-id="install-heading">添加到桌面</span>}
        description="下次打开不用再找链接，预约和小铃铛都在同一个入口。"
        className="install-dialog"
        variant="home"
        dataOdId="install-dialog"
      >
        <p className="eyebrow">把十三雾放在手边</p>
        <div className="install-list">
          <div className="install-step">
            <span className="install-number">01</span>
            <div>
              <strong>手机浏览器</strong>
              <p>打开浏览器菜单，选择“添加到主屏幕”。</p>
            </div>
          </div>
          <div className="install-step">
            <span className="install-number">02</span>
            <div>
              <strong>电脑浏览器</strong>
              <p>在地址栏右侧选择安装图标，确认添加十三雾。</p>
            </div>
          </div>
          <div className="install-step">
            <span className="install-number">03</span>
            <div>
              <strong>已经安装过？</strong>
              <p>直接关闭这扇窗，入口会保留在你的桌面。</p>
            </div>
          </div>
        </div>
        <div className="form-actions">
          <Button
            onClick={confirmInstall}
            data-install-confirm=""
            data-od-id="install-confirm"
          >
            知道了
          </Button>
        </div>
      </Dialog>
    </Screen>
  );
}

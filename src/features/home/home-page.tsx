/* Original local logo markup preserves the supplied intrinsic sizing and CSS. */
/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Dialog,
  Input,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import { Screen, SiteFooter, SiteHeader } from "@/components/layout";
import {
  validateBookingRequest,
  type BookingRequestValues,
} from "@/features/booking/validation";

type HomeVariant = "home" | "landing";
type CalendarFilter = "all" | "sat" | "sun" | "mon";

const scripts = [
  {
    name: "雾港来信",
    cover: "cover-a",
    kind: "情感 · 还原",
    players: "6人",
    rating: "4.9",
    description: "一封迟到十年的信，把六个人重新带回那场未完的告别。",
    tags: ["情感", "本格", "4.5小时"],
    price: "268",
  },
  {
    name: "长夜行",
    cover: "cover-b",
    kind: "机制 · 阵营",
    players: "7人",
    rating: "4.8",
    description: "城门关闭前，七位行者必须在真相和信任之间做出选择。",
    tags: ["机制", "阵营", "5小时"],
    price: "298",
  },
  {
    name: "金陵旧梦",
    cover: "cover-c",
    kind: "古风 · 情感",
    players: "6人",
    rating: "4.7",
    description: "繁华落幕后，一场旧梦在六个人的记忆里各自生长。",
    tags: ["古风", "情感", "4小时"],
    price: "238",
  },
] as const;

const sessions = [
  {
    key: "sat",
    od: "session-雾港来信-0614",
    date: "06.14",
    weekday: "周六",
    time: "13:30",
    script: "雾港来信",
    dm: "林深",
    capacity: 6,
    joined: 4,
    price: 268,
    progress: "67%",
  },
  {
    key: "sun",
    od: "session-长夜行-0615",
    date: "06.15",
    weekday: "周日",
    time: "18:00",
    script: "长夜行",
    dm: "阿渡",
    capacity: 7,
    joined: 3,
    price: 298,
    progress: "43%",
  },
  {
    key: "mon",
    od: "session-金陵旧梦-0616",
    date: "06.16",
    weekday: "周一",
    time: "19:00",
    script: "金陵旧梦",
    dm: "十三",
    capacity: 6,
    joined: 3,
    price: 238,
    progress: "50%",
  },
] as const;

type BookingSeed = { script?: string; session?: string };

function HomeBookingDialog({
  open,
  seed,
  onClose,
}: {
  open: boolean;
  seed: BookingSeed;
  onClose: () => void;
}) {
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof BookingRequestValues, string>>
  >({});

  function close() {
    setSuccess(false);
    setErrors({});
    onClose();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values: BookingRequestValues = {
      script: String(data.get("script") ?? ""),
      time: String(data.get("time") ?? ""),
      players: String(data.get("players") ?? ""),
      name: String(data.get("name") ?? ""),
      contact: String(data.get("contact") ?? ""),
    };
    const nextErrors = validateBookingRequest(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setSuccess(true);
  }

  const description = seed.session
    ? `已选择场次：${seed.session}。提交后我们会与你确认押金信息。`
    : "留下你的想法，我们来帮你把这一桌拼起来。";

  return (
    <Dialog
      open={open}
      onClose={close}
      title={<span data-od-id="booking-heading">发起预约</span>}
      description={description}
      id="booking-modal"
      variant="home"
    >
      {!success ? (
        <form
          className="modal-form"
          id="booking-form"
          onSubmit={submit}
          noValidate
        >
          <div className="field">
            <label htmlFor="script-select">想玩哪个剧本</label>
            <Select
              id="script-select"
              name="script"
              defaultValue={seed.script ?? ""}
              required
              aria-invalid={Boolean(errors.script)}
            >
              <option value="">请选择剧本</option>
              <option>雾港来信</option>
              <option>长夜行</option>
              <option>金陵旧梦</option>
            </Select>
            {errors.script && (
              <p className="field-error" role="alert">
                {errors.script}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="time-select">期望时间</label>
            <Input
              id="time-select"
              name="time"
              type="datetime-local"
              required
              aria-invalid={Boolean(errors.time)}
            />
            <p className="field-help">也可以直接加入拼车大厅中的开放场次。</p>
            {errors.time && (
              <p className="field-error" role="alert">
                {errors.time}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="player-count">预计人数</label>
            <Input
              id="player-count"
              name="players"
              type="number"
              min="1"
              max="12"
              placeholder="例如：4"
              required
              aria-invalid={Boolean(errors.players)}
            />
            {errors.players && (
              <p className="field-error" role="alert">
                {errors.players}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="contact-name">联系人</label>
            <Input
              id="contact-name"
              name="name"
              type="text"
              placeholder="怎么称呼你"
              required
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && (
              <p className="field-error" role="alert">
                {errors.name}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="contact-phone">微信 / 手机号</label>
            <Input
              id="contact-phone"
              name="contact"
              type="tel"
              inputMode="tel"
              placeholder="方便我们联系你"
              required
              aria-invalid={Boolean(errors.contact)}
            />
            {errors.contact && (
              <p className="field-error" role="alert">
                {errors.contact}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="booking-note">备注（选填）</label>
            <Textarea
              id="booking-note"
              name="note"
              placeholder="例如：希望周末晚上、第一次玩剧本杀"
            />
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={close}>
              取消
            </Button>
            <Button type="submit" data-od-id="booking-submit">
              提交预约
            </Button>
          </div>
        </form>
      ) : (
        <div className="success-state is-visible" id="booking-success">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 2.5 2.5L16 9" />
          </svg>
          <h3>预约信息已记录（前端演示）</h3>
          <p>当前未连接店内后台，不会生成真实订单。</p>
          <Button onClick={close}>知道了</Button>
        </div>
      )}
    </Dialog>
  );
}

function ScriptSection({
  openBooking,
}: {
  openBooking: (seed?: BookingSeed) => void;
}) {
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
            <h2 data-od-id="scripts-heading">故事先替你留好位置。</h2>
            <p>每一本都标注了时长、人数和风格。先从你今天想成为谁开始。</p>
          </div>
          <Link
            className="text-link"
            href="/sessions"
            data-od-id="scripts-view-all"
          >
            查看可报名场次 →
          </Link>
        </div>
        <div className="grid-3">
          {scripts.map((script) => (
            <article
              className="script-card"
              key={script.name}
              data-od-id={`script-card-${script.name}`}
            >
              <div
                className={`script-cover ${script.cover}`}
                aria-label={`${script.name}剧本封面`}
              >
                <div className="cover-art">
                  <span>{script.name}</span>
                </div>
                <div className="cover-meta">
                  <span>{script.kind}</span>
                  <span>{script.players}</span>
                </div>
              </div>
              <div className="script-body">
                <div className="script-title">
                  <h3>{script.name}</h3>
                  <span className="rating">
                    <strong>{script.rating}</strong> / 5
                  </span>
                </div>
                <p className="script-desc">{script.description}</p>
                <div className="tag-row">
                  {script.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
                <div className="script-bottom">
                  <span className="price">
                    人均 <strong>¥{script.price}</strong>
                  </span>
                  <Button
                    variant="secondary"
                    className="btn-arrow"
                    onClick={() => openBooking({ script: script.name })}
                    data-script={script.name}
                    data-open-booking=""
                    data-od-id={`script-book-${script.name}`}
                  >
                    预约
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SessionSection({
  variant,
  openBooking,
}: {
  variant: HomeVariant;
  openBooking: (seed?: BookingSeed) => void;
}) {
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const content = (
    <>
      <div
        className="session-calendar"
        role="group"
        aria-label="选择日期"
        data-od-id="session-calendar"
      >
        {(
          [
            {
              key: "all",
              strong: "全部",
              text: "3 场开放",
              od: "calendar-all",
            },
            {
              key: "sat",
              strong: "06.14",
              text: "周六 · 1 场",
              od: "calendar-sat",
            },
            {
              key: "sun",
              strong: "06.15",
              text: "周日 · 1 场",
              od: "calendar-sun",
            },
            {
              key: "mon",
              strong: "06.16",
              text: "周一 · 1 场",
              od: "calendar-mon",
            },
          ] as const
        ).map((item) => (
          <button
            type="button"
            key={item.key}
            className={filter === item.key ? "is-active" : undefined}
            data-calendar-filter={item.key}
            aria-pressed={filter === item.key}
            data-od-id={item.od}
            onClick={() => setFilter(item.key)}
          >
            <strong>{item.strong}</strong>
            <span>{item.text}</span>
          </button>
        ))}
      </div>
      <div className="session-list" aria-label="开放报名场次列表">
        {sessions
          .filter((session) => filter === "all" || session.key === filter)
          .map((session) => (
            <article
              className="session-row"
              data-calendar-date={session.key}
              data-od-id={session.od}
              key={session.key}
            >
              <div className="session-date">
                <strong>{session.date}</strong>
                {session.weekday} · {session.time}
              </div>
              <div className="session-main">
                <h3>{session.script}</h3>
                <p>
                  主 DM：{session.dm} · {session.capacity}人本 · ¥
                  {session.price} / 人
                </p>
                <div className="session-progress">
                  <span style={{ width: session.progress }} />
                </div>
              </div>
              <div className="session-availability">
                <span className="availability">
                  已报 <strong>{session.joined}</strong> / {session.capacity} ·
                  还差 {session.capacity - session.joined} 人
                </span>
                <Button
                  variant="secondary"
                  onClick={() =>
                    openBooking({
                      script: session.script,
                      session: `${session.date.replace(".", "月")}日 ${session.weekday} ${session.time}`,
                    })
                  }
                  data-script={session.script}
                  data-session={`${session.date} ${session.weekday} ${session.time}`}
                  data-open-booking=""
                  data-od-id={`session-book-${session.script}-${session.date.replace(".", "")}`}
                >
                  加入
                </Button>
              </div>
            </article>
          ))}
      </div>
    </>
  );
  return (
    <section
      className="section session-section"
      id="sessions"
      data-od-id="sessions"
    >
      <div className="container session-layout">
        <div className="session-intro">
          <p className="eyebrow">拼车大厅</p>
          <h2 data-od-id="sessions-heading">还有几席，等你入戏。</h2>
          <p>
            一个人也能来。选一场还差几人的开放场次，和同样想玩这个故事的人坐到一起。
          </p>
          <div className="session-note">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>报名后，店家会通过微信与你确认押金和锁车信息。</span>
          </div>
        </div>
        {variant === "home" ? <div>{content}</div> : content}
      </div>
    </section>
  );
}

function DmSection() {
  const dms = [
    {
      key: "linshen",
      avatar: "林",
      name: "林深",
      role: "情感还原 · 雾港来信",
      copy: "擅长把线索交到情绪刚好的位置，让每一次沉默都有回应。",
      tags: ["情感", "新手友好"],
      count: 3,
    },
    {
      key: "adu",
      avatar: "渡",
      name: "阿渡",
      role: "机制推进 · 阵营本",
      copy: "节奏清楚、反馈及时，适合喜欢做选择，也喜欢被故事推着走的人。",
      tags: ["机制", "阵营"],
      count: 4,
    },
    {
      key: "shisan",
      avatar: "十",
      name: "十三",
      role: "古风沉浸 · 角色状态",
      copy: "从妆造到入场词都提前准备，让古风故事从推门之前就开始。",
      tags: ["古风", "沉浸"],
      count: 2,
    },
  ];
  return (
    <section className="section dm-section" id="dms" data-od-id="dms">
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DM 速览</p>
            <h2 data-od-id="dms-heading">找到适合这本故事的带本人。</h2>
            <p>先看他们擅长的节奏与题材，再决定把哪一晚交给谁。</p>
          </div>
          <Link className="text-link" href="/dms" data-od-id="dms-view-all">
            查看全部 DM →
          </Link>
        </div>
        <div className="dm-grid">
          {dms.map((dm) => (
            <article
              className="dm-card"
              data-od-id={`dm-card-${dm.key}`}
              key={dm.key}
            >
              <div className="dm-card-head">
                <div className="dm-avatar" aria-hidden="true">
                  {dm.avatar}
                </div>
                <div>
                  <h3>{dm.name}</h3>
                  <div className="dm-role">{dm.role}</div>
                </div>
              </div>
              <p>{dm.copy}</p>
              <div className="tag-row">
                {dm.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <div className="dm-card-foot">
                <span className="meta">可带剧本 · {dm.count} 本</span>
                <Button
                  variant="ghost"
                  className="btn-arrow"
                  href="/dms"
                  data-od-id={`dm-link-${dm.key}`}
                >
                  查看主页
                </Button>
              </div>
            </article>
          ))}
        </div>
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
              <p>开放场次持续更新，散客也可以轻松报名。</p>
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

export function HomePage({ variant }: { variant: HomeVariant }) {
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
                  发起一场预约
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
        <ScriptSection openBooking={openBooking} />
        <SessionSection variant={variant} openBooking={openBooking} />
        <DmSection />
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
              发起一场预约
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
        seed={booking ?? {}}
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

"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button, Dialog, Input, Select, useToast } from "@/components/ui";
import { Screen, SiteFooter } from "@/components/layout";
import { CustomerHeader } from "./customer-header";
import { validateJoinRequest, type JoinRequestValues } from "./validation";

type Range = "all" | "weekend" | "next";
type ScriptName = "all" | "雾港来信" | "长夜行" | "金陵旧梦";

type Session = {
  id: string;
  range: Exclude<Range, "all">;
  script: Exclude<ScriptName, "all">;
  title: string;
  detail: string;
  remainingTime: string;
  joined: number;
  capacity: number;
  status: "open" | "locked";
  context: string;
  odId: string;
};

const sessionData: Session[] = [
  {
    id: "wugang",
    range: "weekend",
    script: "雾港来信",
    title: "雾港来信 · 周六下午场",
    detail: "06 月 14 日 周六 · 13:30 开始 · 主 DM：阿岚",
    remainingTime: "2 天",
    joined: 4,
    capacity: 6,
    status: "open",
    context: "雾港来信 · 06 月 14 日 周六 13:30",
    odId: "session-wugang-0614",
  },
  {
    id: "jinling",
    range: "weekend",
    script: "金陵旧梦",
    title: "金陵旧梦 · 周日上午场",
    detail: "06 月 15 日 周日 · 10:00 开始 · 主 DM：小满",
    remainingTime: "3 天",
    joined: 3,
    capacity: 6,
    status: "open",
    context: "金陵旧梦 · 06 月 15 日 周日 10:00",
    odId: "session-jinling-0615",
  },
  {
    id: "night",
    range: "next",
    script: "长夜行",
    title: "长夜行 · 下周五夜场",
    detail: "06 月 20 日 周五 · 19:00 开始 · 主 DM：阿岚",
    remainingTime: "8 天",
    joined: 8,
    capacity: 8,
    status: "locked",
    context: "长夜行 · 06 月 20 日 周五 19:00",
    odId: "session-night-0620",
  },
];

export function SessionsPage() {
  const toast = useToast();
  const [range, setRange] = useState<Range>("all");
  const [script, setScript] = useState<ScriptName>("all");
  const [selected, setSelected] = useState<Session | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof JoinRequestValues, string>>
  >({});

  useEffect(() => {
    let frame = 0;
    try {
      const saved = JSON.parse(
        localStorage.getItem("shisanwu-session-filter") ?? "null",
      ) as { range?: Range; script?: ScriptName } | null;
      frame = requestAnimationFrame(() => {
        if (saved?.range && ["all", "weekend", "next"].includes(saved.range))
          setRange(saved.range);
        if (
          saved?.script &&
          ["all", "雾港来信", "长夜行", "金陵旧梦"].includes(saved.script)
        )
          setScript(saved.script);
      });
    } catch {
      /* Ignore malformed device-local preferences. */
    }
    return () => cancelAnimationFrame(frame);
  }, []);

  const filtered = useMemo(
    () =>
      sessionData.filter(
        (item) =>
          (range === "all" || item.range === range) &&
          (script === "all" || item.script === script),
      ),
    [range, script],
  );

  function saveFilter() {
    localStorage.setItem(
      "shisanwu-session-filter",
      JSON.stringify({ range, script }),
    );
    toast("筛选条件已保存");
  }

  function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const values: JoinRequestValues = {
      players: String(data.get("players") ?? ""),
      name: String(data.get("name") ?? ""),
      contact: String(data.get("contact") ?? ""),
    };
    const nextErrors = validateJoinRequest(
      values,
      selected.capacity - selected.joined,
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    event.currentTarget.reset();
    setSelected(null);
    toast("报名信息已提交（前端演示），可前往“我的预约”查看界面状态");
  }

  return (
    <Screen name="sessions">
      <CustomerHeader active="sessions" />
      <main id="content">
        <section className="page-head" data-od-id="page-head">
          <div className="container">
            <p className="eyebrow">C 端 / 场次</p>
            <div className="row-between">
              <div>
                <h1 data-od-id="page-title">还有几席，等你入戏。</h1>
                <p className="lead">
                  开放报名的场次会显示已报人数与还差人数。锁车前可自行取消，锁车后由店内联系确认押金。
                </p>
              </div>
              <Button href="/booking/new" data-od-id="sessions-primary-cta">
                发起一场新预约
              </Button>
            </div>
          </div>
        </section>
        <section
          className="section"
          data-od-id="session-list"
          data-session-filters=""
        >
          <div className="container">
            <div className="toolbar">
              <div className="toolbar-left">
                <div className="segmented" role="group" aria-label="日期范围">
                  {(
                    [
                      { value: "all", label: "全部日期" },
                      { value: "weekend", label: "本周末" },
                      { value: "next", label: "下周" },
                    ] as const
                  ).map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={range === option.value ? "active" : undefined}
                      data-session-range={option.value}
                      aria-pressed={range === option.value}
                      onClick={() => setRange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="toolbar-right">
                <Select
                  style={{ width: 150 }}
                  aria-label="按剧本筛选"
                  value={script}
                  onChange={(event) =>
                    setScript(event.target.value as ScriptName)
                  }
                  data-session-script-filter=""
                >
                  <option value="all">全部剧本</option>
                  <option value="雾港来信">雾港来信</option>
                  <option value="长夜行">长夜行</option>
                  <option value="金陵旧梦">金陵旧梦</option>
                </Select>
                <Button
                  variant="secondary"
                  onClick={saveFilter}
                  data-save-session-filter=""
                >
                  保存筛选
                </Button>
              </div>
            </div>
            <p className="meta" aria-live="polite">
              当前显示 {filtered.length} 场
            </p>
            {filtered.length ? (
              <div className="data-list">
                {filtered.map((item) => (
                  <div
                    className="data-row"
                    data-session-date={item.range}
                    data-session-script={item.script}
                    data-od-id={item.odId}
                    key={item.id}
                  >
                    <div className="main">
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <div>
                      <span className="meta">剩余时间</span>
                      <strong>{item.remainingTime}</strong>
                    </div>
                    <div>
                      <span className={`status ${item.status}`}>
                        {item.status === "open" ? "开放报名" : "已锁车"}
                      </span>
                      <div
                        style={{
                          marginTop: 6,
                          color: "var(--muted)",
                          fontSize: 13,
                        }}
                      >
                        已报{" "}
                        <b className="num">
                          {item.joined} / {item.capacity}
                        </b>{" "}
                        ·{" "}
                        {item.status === "open"
                          ? `还差 ${item.capacity - item.joined} 人`
                          : "等待开本"}
                      </div>
                    </div>
                    <div>
                      {item.status === "open" ? (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setErrors({});
                            setSelected(item);
                          }}
                          data-session={item.context}
                          data-od-id={`join-${item.id}`}
                        >
                          加入本场
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            toast("本场已锁车，可关注取消后的空位")
                          }
                        >
                          关注空位
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" role="status">
                <strong>没有匹配的开放场次</strong>
                <span>换一个日期范围或剧本看看。</span>
              </div>
            )}
          </div>
        </section>
        <Dialog
          open={selected !== null}
          onClose={() => setSelected(null)}
          eyebrow="加入开放场次"
          descriptionClassName="lead"
          title="替全队占几个位置？"
          description="报名后店内会通过微信与你确认押金；未锁车前可在我的预约里取消。"
          id="join-modal"
          dataOdId="join-modal"
        >
          <p className="field-help" aria-live="polite">
            {selected ? `当前场次：${selected.context}` : ""}
          </p>
          <form className="stack" onSubmit={submitJoin} noValidate>
            <div className="field">
              <label htmlFor="join-players">预计人数</label>
              <Input
                id="join-players"
                name="players"
                type="number"
                min="1"
                max={selected ? selected.capacity - selected.joined : 1}
                defaultValue="1"
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
              <label htmlFor="join-name">联系人</label>
              <Input
                id="join-name"
                name="name"
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
              <label htmlFor="join-contact">微信 / 手机号</label>
              <Input
                id="join-contact"
                name="contact"
                placeholder="方便店内联系你"
                required
                aria-invalid={Boolean(errors.contact)}
              />
              {errors.contact && (
                <p className="field-error" role="alert">
                  {errors.contact}
                </p>
              )}
            </div>
            <div className="row-between">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                取消
              </Button>
              <Button type="submit">提交报名</Button>
            </div>
          </form>
        </Dialog>
      </main>
      <SiteFooter meta="单店自用 PWA · 杭州" />
    </Screen>
  );
}

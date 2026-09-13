"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Dialog, Input, Select, Field } from "@/components/ui";
import { Screen, SiteFooter } from "@/components/layout";
import { ApiClientError } from "@/lib/api/client";
import { CustomerHeader } from "./customer-header";
import { useRemote, useBookingCommand, type PageResult } from "./api-state";
import { SessionCard } from "./session-card";
import type { SessionDto } from "./types";
import "./booking.css";
export function SessionsPage({
  initial,
  query = "",
  scripts = [],
}: {
  initial: PageResult<SessionDto>;
  query?: string;
  scripts?: { id: string; title: string }[];
}) {
  const router = useRouter();
  const q = useRemote<PageResult<SessionDto>>(
      "/api/sessions?" + query,
      initial,
    ),
    command = useBookingCommand();
  const [selected, setSelected] = useState<SessionDto | null>(null),
    [success, setSuccess] = useState("");
  const params = new URLSearchParams(query),
    page = Number(params.get("page") ?? 1);
  async function join(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!selected) return;
    try {
      await command.run(`/api/sessions/${selected.id}/bookings`, "POST", {
        player_count: Number(f.get("player_count")),
        contact: { name: f.get("name"), phone: f.get("phone") },
      });
      setSelected(null);
      setSuccess("报名成功，团队位置已写入数据库。");
      await q.reload();
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        const latest = await q.reload();
        const row = latest?.items.find((s) => s.id === selected.id);
        if (row) setSelected(row);
      }
    }
  }
  function pageHref(n: number) {
    const p = new URLSearchParams(query);
    p.set("page", String(n));
    return "/sessions?" + p;
  }
  return (
    <Screen name="sessions">
      <CustomerHeader active="sessions" />
      <main id="content">
        <section className="page-head">
          <div className="container">
            <p className="eyebrow">C 端 / 拼车大厅</p>
            <h1>还有几席，等你入戏。</h1>
            <p className="lead">
              公开查看真实排期，登录后为整个团队占坑。所有时间均为北京时间。
            </p>
          </div>
        </section>
        <section className="section">
          <div className="container c3-stack">
            <div className="toolbar">
              <div className="toolbar-left">
                <div className="segmented" role="group" aria-label="日期范围">
                  {[
                    ["", "全部日期"],
                    ["weekend", "本周末"],
                    ["next", "下周"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        (params.get("range") ?? "") === value
                          ? "active"
                          : undefined
                      }
                      aria-pressed={(params.get("range") ?? "") === value}
                      onClick={() => {
                        const p = new URLSearchParams(query);
                        p.set("range", value);
                        p.delete("page");
                        router.push("/sessions?" + p);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <form className="toolbar-right c3-filter" action="/sessions">
                <input
                  type="hidden"
                  name="range"
                  value={params.get("range") ?? ""}
                />
                <Select
                  name="status"
                  aria-label="场次状态"
                  defaultValue={params.get("status") ?? ""}
                >
                  <option value="">开放与满员</option>
                  <option value="open">可报名</option>
                  <option value="full">已满员</option>
                </Select>
                <Select
                  name="script_id"
                  aria-label="按剧本筛选"
                  defaultValue={params.get("script_id") ?? ""}
                >
                  <option value="">全部剧本</option>
                  {scripts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </Select>
                <Button variant="secondary" type="submit">
                  筛选
                </Button>
              </form>
            </div>
            {success && (
              <p role="status">
                {success} <Link href="/me/booking">查看我的预约</Link>
              </p>
            )}
            {q.loading && <p role="status">刷新场次中…</p>}
            {q.error && (
              <p role="alert">
                {q.error.message}{" "}
                <Button onClick={() => void q.reload()}>重试</Button>
              </p>
            )}
            <div className="data-list">
              {q.data?.items.map((s) => (
                <SessionCard
                  key={s.id}
                  variant="row"
                  session={s}
                  onJoin={(s) => {
                    command.clear();
                    setSelected(s);
                  }}
                />
              ))}
            </div>
            {q.data && !q.data.items.length && (
              <p>暂无符合条件的开放场次，可以提交自主预约。</p>
            )}
            <div className="c3-pagination">
              {page > 1 && <Link href={pageHref(page - 1)}>上一页</Link>}
              <span>
                第 {page} 页 / 共 {q.data?.page_info.total ?? 0} 场
              </span>
              {page < (q.data?.page_info.total_pages ?? 0) && (
                <Link href={pageHref(page + 1)}>下一页</Link>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter>
        <span>十三雾 · 把今晚留给一个故事</span>
      </SiteFooter>
      <Dialog
        open={!!selected}
        onClose={() => !command.pending && setSelected(null)}
        title="为团队报名"
        description={
          selected
            ? `${selected.script.title} · 最新剩余 ${selected.remaining_count} 位`
            : ""
        }
      >
        <form className="c3-form" onSubmit={(e) => void join(e)}>
          <fieldset
            disabled={command.pending || command.uncertain}
            className="c3-stack"
          >
            <Field
              label="团队人数"
              htmlFor="join-count"
              error={
                command.error instanceof ApiClientError
                  ? command.error.fieldErrors?.player_count?.[0]
                  : undefined
              }
            >
              <Input
                id="join-count"
                name="player_count"
                type="number"
                min={1}
                max={selected?.remaining_count || 100}
                defaultValue={1}
                required
              />
            </Field>
            <Field label="联系人姓名" htmlFor="join-name">
              <Input id="join-name" name="name" maxLength={80} required />
            </Field>
            <Field label="联系人手机号" htmlFor="join-phone">
              <Input
                id="join-phone"
                name="phone"
                type="tel"
                pattern="1[3-9][0-9]{9}"
                required
              />
            </Field>
          </fieldset>
          {command.error && (
            <p role="alert" className="c3-error">
              {command.error.message}
              {command.error instanceof ApiClientError &&
                command.error.status === 401 && (
                  <Link
                    href={
                      "/login?next=" + encodeURIComponent("/sessions?" + query)
                    }
                  >
                    {" "}
                    去登录
                  </Link>
                )}
            </p>
          )}
          <p>未锁车且未涉及押金时可取消；押金与锁车流程由 C4 接入。</p>
          <Button type="submit" disabled={command.pending}>
            {command.pending
              ? "提交中…"
              : command.uncertain
                ? "用原请求重试确认"
                : "确认团队报名"}
          </Button>
        </form>
      </Dialog>
    </Screen>
  );
}

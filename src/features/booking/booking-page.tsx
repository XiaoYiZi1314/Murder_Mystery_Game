"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Input,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import { Screen, SiteFooter } from "@/components/layout";
import { CustomerHeader } from "./customer-header";
import {
  validateBookingRequest,
  type BookingRequestValues,
} from "./validation";

export function BookingPage() {
  const toast = useToast();
  const [errors, setErrors] = useState<
    Partial<Record<keyof BookingRequestValues, string>>
  >({});
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values: BookingRequestValues = {
      script: String(data.get("script") ?? ""),
      players: String(data.get("players") ?? ""),
      time: String(data.get("time") ?? ""),
      name: String(data.get("name") ?? ""),
      contact: String(data.get("contact") ?? ""),
    };
    const nextErrors = validateBookingRequest(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    event.currentTarget.reset();
    setSubmitted(true);
    toast("预约申请已提交（前端演示）");
  }

  return (
    <Screen name="booking">
      <CustomerHeader active="booking" />
      <main id="content">
        <section className="page-head" data-od-id="page-head">
          <div className="container">
            <p className="eyebrow">C 端 / 预约</p>
            <h1 data-od-id="page-title">把你的时间，交给我们来拼。</h1>
            <p className="lead">
              选择一本剧本、期望时间与人数。提交后由 DM /
              店长审核，通过后会自动生成一个开放报名场次。
            </p>
          </div>
        </section>
        <section className="section" data-od-id="booking-form-section">
          <div className="container grid-2-1">
            <form
              className="card stack"
              onSubmit={submit}
              noValidate
              data-od-id="booking-form"
            >
              <div className="row-between">
                <div>
                  <p className="eyebrow">新预约申请</p>
                  <h2 style={{ fontSize: 32 }}>先留下四个信息。</h2>
                </div>
                <Badge variant="status" className="pending">
                  待审核
                </Badge>
              </div>
              {submitted && (
                <div className="notice" role="status">
                  <strong>演示申请已记录</strong>
                  <p>
                    当前页面未连接后台，不会生成真实订单。你可以继续提交另一份演示申请。
                  </p>
                </div>
              )}
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="script">想玩哪个剧本</label>
                  <Select
                    id="script"
                    name="script"
                    required
                    aria-invalid={Boolean(errors.script)}
                  >
                    <option value="">请选择剧本</option>
                    <option>雾港来信</option>
                    <option>金陵旧梦</option>
                    <option>长夜行</option>
                  </Select>
                  {errors.script && (
                    <p className="field-error" role="alert">
                      {errors.script}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="players">预计人数</label>
                  <Input
                    id="players"
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
                  <label htmlFor="time">期望时间</label>
                  <Input
                    id="time"
                    name="time"
                    type="datetime-local"
                    required
                    aria-invalid={Boolean(errors.time)}
                  />
                  {errors.time && (
                    <p className="field-error" role="alert">
                      {errors.time}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="name">联系人</label>
                  <Input
                    id="name"
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
                <div className="field span-2">
                  <label htmlFor="contact">微信 / 手机号</label>
                  <Input
                    id="contact"
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
                <div className="field span-2">
                  <label htmlFor="note">备注（选填）</label>
                  <Textarea
                    id="note"
                    name="note"
                    placeholder="例如：周末晚上、第一次玩剧本杀、希望安排情感本"
                  />
                </div>
              </div>
              <div className="row-between">
                <span className="field-help">
                  不需要线上支付。押金与价格由店内确认后线下沟通。
                </span>
                <Button type="submit" data-od-id="booking-submit">
                  提交预约
                </Button>
              </div>
            </form>
            <aside className="stack">
              <div className="dark-panel" data-od-id="booking-process">
                <p className="eyebrow" style={{ color: "var(--bg)" }}>
                  提交之后
                </p>
                <div className="stack" style={{ gap: 18 }}>
                  <div>
                    <span
                      className="meta"
                      style={{
                        color: "color-mix(in oklch,var(--bg) 60%,transparent)",
                      }}
                    >
                      01
                    </span>
                    <strong style={{ display: "block", marginTop: 4 }}>
                      店内审核时间
                    </strong>
                    <p
                      className="muted"
                      style={{ fontSize: 14, margin: "4px 0 0" }}
                    >
                      确认剧本、DM 与时间是否可排。
                    </p>
                  </div>
                  <div>
                    <span
                      className="meta"
                      style={{
                        color: "color-mix(in oklch,var(--bg) 60%,transparent)",
                      }}
                    >
                      02
                    </span>
                    <strong style={{ display: "block", marginTop: 4 }}>
                      生成开放场次
                    </strong>
                    <p
                      className="muted"
                      style={{ fontSize: 14, margin: "4px 0 0" }}
                    >
                      通过后，你的申请会变成可拼车场次。
                    </p>
                  </div>
                  <div>
                    <span
                      className="meta"
                      style={{
                        color: "color-mix(in oklch,var(--bg) 60%,transparent)",
                      }}
                    >
                      03
                    </span>
                    <strong style={{ display: "block", marginTop: 4 }}>
                      人数达标后锁车
                    </strong>
                    <p
                      className="muted"
                      style={{ fontSize: 14, margin: "4px 0 0" }}
                    >
                      店内联系收取押金，确认后推进开本。
                    </p>
                  </div>
                </div>
              </div>
              <div className="notice">
                <strong>想更快成局？</strong>
                <p>先去拼车大厅看看现成场次，报名后直接占位。</p>
                <Link
                  href="/sessions"
                  style={{
                    display: "inline-block",
                    marginTop: 10,
                    textDecoration: "underline",
                  }}
                >
                  查看开放场次 →
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter meta="单店自用 PWA · 杭州" />
    </Screen>
  );
}

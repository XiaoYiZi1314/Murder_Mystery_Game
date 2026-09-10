"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, useToast } from "@/components/ui";
import { Screen, SiteFooter, SiteHeader } from "@/components/layout";

export type AuthTab = "login" | "register";

export function AuthPage({ initialTab = "login" }: { initialTab?: AuthTab }) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [completed, setCompleted] = useState<AuthTab | null>(null);
  const toast = useToast();

  function activate(next: AuthTab) {
    setTab(next);
    setCompleted(null);
  }

  function submit(event: FormEvent<HTMLFormElement>, kind: AuthTab) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    event.currentTarget.reset();
    setCompleted(kind);
    toast(kind === "login" ? "登录演示已完成" : "注册演示已完成");
  }

  return (
    <Screen name="login">
      <SiteHeader mode="auth">
        <Button variant="secondary" href="/">
          返回首页
        </Button>
      </SiteHeader>
      <main id="content">
        <section className="section" data-od-id="auth-section">
          <div className="container auth-layout">
            <div className="auth-copy">
              <p className="eyebrow">十三雾 / 账号</p>
              <h1 data-od-id="page-title">先登录，再进入故事。</h1>
              <p>
                登录后可以查看完整剧本详情、报名场次、管理自己的余额与积分，也可以留下评价。
              </p>
              <div className="auth-note">
                当前为前端演示，不会发送真实请求，也不会保存密码。
              </div>
            </div>
            <div className="auth-card" data-od-id="auth-card">
              <div className="auth-tabs" role="tablist" aria-label="登录或注册">
                <button
                  type="button"
                  className={tab === "login" ? "active" : undefined}
                  data-auth-tab="login"
                  data-od-id="login-tab"
                  role="tab"
                  aria-selected={tab === "login"}
                  onClick={() => activate("login")}
                >
                  登录
                </button>
                <button
                  type="button"
                  className={tab === "register" ? "active" : undefined}
                  data-auth-tab="register"
                  data-od-id="register-tab"
                  role="tab"
                  aria-selected={tab === "register"}
                  onClick={() => activate("register")}
                >
                  注册
                </button>
              </div>

              <form
                className={`auth-form${completed || tab !== "login" ? " form-hidden" : ""}`}
                id="login-form"
                data-auth-form="login"
                aria-hidden={Boolean(completed) || tab !== "login"}
                onSubmit={(event) => submit(event, "login")}
              >
                <div className="field">
                  <label htmlFor="phone">手机号</label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="请输入手机号"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="password">密码</label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="请输入密码"
                    required
                  />
                  <p className="field-help">演示环境不会发送真实请求。</p>
                </div>
                <Button
                  variant="primary"
                  type="submit"
                  data-od-id="login-submit"
                >
                  登录十三雾
                </Button>
              </form>

              <form
                className={`auth-form${completed || tab !== "register" ? " form-hidden" : ""}`}
                id="register-form"
                data-auth-form="register"
                aria-hidden={Boolean(completed) || tab !== "register"}
                onSubmit={(event) => submit(event, "register")}
              >
                <div className="field">
                  <label htmlFor="register-phone">手机号</label>
                  <Input
                    id="register-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="请输入手机号"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="register-password">设置密码</label>
                  <Input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="至少 6 位"
                    minLength={6}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="nickname">系统内昵称</label>
                  <Input
                    id="nickname"
                    type="text"
                    placeholder="例如：林间有雾"
                    required
                  />
                </div>
                <Button
                  variant="primary"
                  type="submit"
                  data-od-id="register-submit"
                >
                  创建顾客账号
                </Button>
              </form>

              <div
                className={`success${completed ? " is-visible" : ""}`}
                id="auth-success"
                data-od-id="auth-success"
                aria-hidden={!completed}
              >
                <div className="success-mark">完成</div>
                <strong>
                  {completed === "register"
                    ? "注册演示已完成。"
                    : "登录演示已完成。"}
                </strong>
                <p>
                  这是前端演示，未登录或创建真实账号，也不会保存你输入的密码。
                </p>
                <Button variant="secondary" href="/me" data-od-id="auth-me">
                  进入个人中心
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter meta="手机号 + 密码 · 单店自用 PWA" />
    </Screen>
  );
}

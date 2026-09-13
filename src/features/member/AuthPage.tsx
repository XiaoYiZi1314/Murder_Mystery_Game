"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, useToast } from "@/components/ui";
import { Screen, SiteFooter, SiteHeader } from "@/components/layout";
import { apiFetch, errorMessage, type ApiClientError } from "@/lib/api/client";
import type { MeDto } from "@/lib/api/contracts";

export type AuthTab = "login" | "register";

export function AuthPage({ initialTab = "login", returnTo="/me" }: { initialTab?: AuthTab; returnTo?:string }) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  function activate(next: AuthTab) {
    setTab(next);
    setFormError(null);
  }

  function readForm(event: FormEvent<HTMLFormElement>): { phone: string; password: string; nickname: string } {
    const data = new FormData(event.currentTarget);
    return {
      phone: String(data.get("phone") ?? "").trim(),
      password: String(data.get("password") ?? ""),
      nickname: String(data.get("nickname") ?? "").trim(),
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>, kind: AuthTab) {
    event.preventDefault();
    if (busy) return;
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    const { phone, password, nickname } = readForm(event);
    setBusy(true);
    setFormError(null);
    try {
      if (kind === "login") {
        const me = await apiFetch<MeDto>("/api/auth/login", { method: "POST", body: { phone, password } });
        toast(`欢迎回来，${me.nickname}`);
      } else {
        const me = await apiFetch<MeDto>("/api/auth/register", {
          method: "POST",
          body: { phone, password, nickname },
        });
        toast(`注册成功，欢迎 ${me.nickname}`);
      }
      router.push(returnTo);
      router.refresh();
    } catch (error: unknown) {
      const typed = error as ApiClientError;
      const detail = typed?.fieldErrors ? Object.values(typed.fieldErrors).flat().join("；") : "";
      setFormError(detail ? `${errorMessage(error)}：${detail}` : errorMessage(error));
    } finally {
      setBusy(false);
    }
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
                账号真实可用：密码经 argon2id 单向加密保存，连续输错会被暂时锁定。
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
                className={`auth-form${tab !== "login" ? " form-hidden" : ""}`}
                id="login-form"
                data-auth-form="login"
                aria-hidden={tab !== "login"}
                onSubmit={(event) => submit(event, "login")}
              >
                <div className="field">
                  <label htmlFor="phone">手机号</label>
                  <Input
                    id="phone"
                    name="phone"
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
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="请输入密码"
                    required
                  />
                  <p className="field-help">连续输错会被暂时锁定，请确认后再试。</p>
                </div>
                {tab === "login" && formError ? (
                  <p className="field-error" role="alert" data-od-id="auth-error">
                    {formError}
                  </p>
                ) : null}
                <Button
                  variant="primary"
                  type="submit"
                  loading={busy && tab === "login"}
                  data-od-id="login-submit"
                >
                  登录十三雾
                </Button>
              </form>

              <form
                className={`auth-form${tab !== "register" ? " form-hidden" : ""}`}
                id="register-form"
                data-auth-form="register"
                aria-hidden={tab !== "register"}
                onSubmit={(event) => submit(event, "register")}
              >
                <div className="field">
                  <label htmlFor="register-phone">手机号</label>
                  <Input
                    id="register-phone"
                    name="phone"
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
                    name="password"
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
                    name="nickname"
                    type="text"
                    placeholder="例如：林间有雾"
                    required
                  />
                </div>
                {tab === "register" && formError ? (
                  <p className="field-error" role="alert" data-od-id="auth-error">
                    {formError}
                  </p>
                ) : null}
                <Button
                  variant="primary"
                  type="submit"
                  loading={busy && tab === "register"}
                  data-od-id="register-submit"
                >
                  创建顾客账号
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter meta="手机号 + 密码 · 单店自用 PWA" />
    </Screen>
  );
}

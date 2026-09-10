"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Card, useToast } from "@/components/ui";
import { Screen, SiteFooter, SiteHeader } from "@/components/layout";
import { MemberBadge, MemberHeaderActions, WalletLedger } from "./components";
import { ledgerEntries } from "./data";

export type MeTab = "overview" | "bookings" | "member" | "history";

const accountLinks: {
  tab: MeTab | "wallet" | "reviews";
  label: string;
  href: string;
}[] = [
  { tab: "overview", label: "概览", href: "/me#overview" },
  { tab: "bookings", label: "我的预约", href: "/me/booking#bookings" },
  { tab: "member", label: "会员与权益", href: "/me/member#member" },
  { tab: "wallet", label: "流水记录", href: "/me/wallet" },
  { tab: "history", label: "玩过的剧本", href: "/me/history#history" },
  { tab: "reviews", label: "我的评价", href: "/me/reviews" },
];

export function MePage({ initialTab = "overview" }: { initialTab?: MeTab }) {
  const toast = useToast();

  useEffect(() => {
    if (initialTab === "overview") return;
    const hash = `#${initialTab}`;
    if (window.location.hash !== hash) window.location.replace(hash);
  }, [initialTab]);

  return (
    <Screen name="me">
      <SiteHeader active="me" mode="customer">
        <MemberHeaderActions notifications />
      </SiteHeader>
      <main id="content">
        <section className="page-head" data-od-id="page-head">
          <div className="container">
            <p className="eyebrow">C 端 / 我的</p>
            <div className="row-between">
              <div>
                <h1 data-od-id="page-title">林间有雾</h1>
                <p className="lead">
                  你的每一次入戏、每一笔积分和每一场预约，都在这里留档。
                </p>
              </div>
              <MemberBadge />
            </div>
          </div>
        </section>

        <section className="section" data-od-id="account-overview">
          <div className="container account-grid">
            <aside className="side-nav" data-od-id="account-nav">
              {accountLinks.map((item) => (
                <Link
                  href={item.href}
                  key={item.tab}
                  aria-current={item.tab === initialTab ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </aside>

            <div className="stack">
              <div
                className="balance-card"
                id="overview"
                data-od-id="member-balance"
              >
                <span className="label">可用储值余额</span>
                <div className="amount num">¥ 680.00</div>
                <div className="row-between mini-stat">
                  <span className="label">当前积分</span>
                  <strong className="num">1,260</strong>
                  <span className="label">距离栖月还差 ¥820</span>
                </div>
              </div>

              <div className="grid-2">
                <Card id="bookings" data-od-id="my-bookings">
                  <div className="row-between">
                    <div>
                      <p className="eyebrow">最近预约</p>
                      <h3>雾港来信 · 周六下午场</h3>
                    </div>
                    <span className="status open">已报名</span>
                  </div>
                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: 14,
                      marginBottom: 0,
                    }}
                  >
                    06 月 14 日 周六 · 13:30 · 已报 1 人 · 还差 2 人
                  </p>
                  <div className="row" style={{ marginTop: 18 }}>
                    <Button variant="secondary" href="/sessions">
                      查看场次
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => toast("未锁车前可取消报名")}
                    >
                      取消规则
                    </Button>
                  </div>
                </Card>

                <Card id="member" data-od-id="member-benefits">
                  <p className="eyebrow">会员权益</p>
                  <h3>望遥 · 9.5 折</h3>
                  <div style={{ margin: "15px 0 9px" }} className="progress">
                    <span style={{ width: "46%" }} />
                  </div>
                  <div className="row-between">
                    <span className="meta">累计储值 ¥680</span>
                    <span className="meta">升级至栖月 ¥1,500</span>
                  </div>
                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: 14,
                      marginBottom: 0,
                    }}
                  >
                    当前可享剧本 9.5 折，生日月赠积分。
                  </p>
                  <Button variant="ghost" className="btn-arrow" href="/gifts">
                    浏览积分礼品
                  </Button>
                </Card>
              </div>

              <Card id="wallet" data-od-id="wallet-ledger">
                <div className="row-between">
                  <div>
                    <p className="eyebrow">最近流水</p>
                    <h3>每一笔都能对上</h3>
                  </div>
                  <Button
                    variant="ghost"
                    href="/me/wallet"
                    aria-label="查看全部流水明细"
                  >
                    查看全部
                  </Button>
                </div>
                <WalletLedger entries={ledgerEntries} compact />
              </Card>

              <div className="grid-2">
                <Link
                  className="surface-card card"
                  id="history"
                  href="/me/history/wugang-laixin"
                  aria-label="查看最近玩过的剧本：雾港来信"
                  data-od-id="played-history"
                >
                  <p className="eyebrow">玩过的剧本</p>
                  <h3>3 本</h3>
                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: 14,
                      marginBottom: 0,
                    }}
                  >
                    最近玩过：雾港来信、长夜行、金陵旧梦。
                  </p>
                </Link>
                <div
                  className="surface-card"
                  id="reviews"
                  data-od-id="my-reviews"
                >
                  <p className="eyebrow">我的评价</p>
                  <h3>2 条</h3>
                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: 14,
                      marginBottom: 0,
                    }}
                  >
                    有 1 条评价收到 DM 回复，去看看新的回信。
                  </p>
                  <Button
                    variant="ghost"
                    className="btn-arrow"
                    href="/me/reviews"
                  >
                    去写或管理评价
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter meta="单店自用 PWA · 杭州" />
    </Screen>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { Screen, SiteHeader, SiteFooter } from "@/components/layout";
import { sourceHref } from "@/lib/routes";
import { groups } from "@/features/dev/prototype-map/data";

export default function PrototypeMap() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <Screen name="prototype-map">
      <SiteHeader
        navItems={[
          { key: "scripts", href: "/scripts", label: "剧本" },
          { key: "sessions", href: "/sessions", label: "拼车大厅" },
          { key: "me", href: "/me", label: "我的" },
        ]}
      />
      <main id="content">
        <section className="page-head" data-od-id="page-head">
          <div className="container">
            <p className="eyebrow">十三雾 / 产品原型地图</p>
            <h1 data-od-id="page-title">从一场预约，到一整套店内运营。</h1>
            <p className="lead">
              落地页之外，下面是根据开发文档补齐的 C 端与 B
              端核心模块。每张卡片都可以直接打开查看交互与页面状态。
            </p>
          </div>
        </section>
        {groups.map((group) => (
          <section key={group.id} className="section" data-od-id={group.id}>
            <div className="container stack">
              <div className="row-between">
                <div>
                  <p className="eyebrow">{group.eyebrow}</p>
                  <h2>{group.title}</h2>
                </div>
                <span className="meta">{group.count}</span>
              </div>
              <div className="grid-4">
                {group.cards.map((card) => (
                  <Link
                    className="card launcher-card"
                    key={card.id}
                    href={sourceHref(card.href!)}
                    data-od-id={card.id}
                  >
                    <span className="pill">{card.badge}</span>
                    <h3>{card.title}</h3>
                    <p className="lead" style={{ fontSize: 15 }}>
                      {card.description}
                    </p>
                    <span className="route">{card.route}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ))}
        <section className="section" data-od-id="principles">
          <div className="container grid-3">
            {[
              ["1", "每一场只对应一本剧本，减少排期误读。"],
              ["2", "顾客侧与商家侧共享同一套状态语言。"],
              ["0", "线上支付；所有现金动作由商家留痕记账。"],
            ].map(([number, text]) => (
              <div className="metric" key={number}>
                <div className="value">{number}</div>
                <div className="label">{text}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter meta="单店自用 PWA · 杭州" />
    </Screen>
  );
}

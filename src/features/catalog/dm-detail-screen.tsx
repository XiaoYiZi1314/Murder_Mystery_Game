import Link from "next/link";

import { Screen } from "@/components/layout";
import { Button } from "@/components/ui";

import "./catalog-enhancements.css";
import { CatalogFooter, DmsHeader } from "./catalog-chrome";
import { getDm, type DmId } from "./data";

export function DmDetailScreen({ id }: { id: DmId }) {
  const dm = getDm(id);

  return (
    <Screen name="dm-detail">
      <DmsHeader />
      <main id="content">
        <section className="detail-hero" data-od-id="dm-detail-hero">
          <div className="container detail-grid">
            <div
              className="profile-mark"
              aria-label={`${dm.name}头像素材待上传`}
            >
              <strong>{dm.mark}</strong>
              <span>头像素材待上传</span>
            </div>
            <div className="detail-copy">
              <p className="eyebrow">DM 主页 / {dm.specialty}</p>
              <h1 data-od-id="dm-title">{dm.name}</h1>
              <p className="lead">{dm.description}</p>
              <div className="row" style={{ marginTop: 24 }}>
                {dm.tags.map((tag) => (
                  <span
                    className="tag"
                    key={tag}
                    style={{
                      borderColor:
                        "color-mix(in oklch,var(--bg) 38%,transparent)",
                      color: "var(--bg)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
                <span
                  className="meta"
                  style={{
                    color: "color-mix(in oklch,var(--bg) 68%,transparent)",
                  }}
                >
                  {dm.series}
                </span>
              </div>
              <div className="row" style={{ marginTop: 30 }}>
                <Button
                  variant="primary"
                  href="/booking/new"
                  data-od-id="dm-booking"
                >
                  按{dm.name}发起预约
                </Button>
                <Button variant="secondary" href="/dms" data-od-id="dm-back">
                  返回 DM 列表
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="section" data-od-id="dm-work">
          <div className="container grid-2">
            <div className="surface-card" data-od-id="dm-scripts">
              <p className="eyebrow">带过的剧本</p>
              <h3>
                {dm.id === "linshen" ? "适合需要留白的故事" : dm.styleTitle}
              </h3>
              <div className="related-list">
                {dm.scripts.map((script, index) => (
                  <Link
                    className="related-item"
                    href={script.href}
                    key={script.href}
                    data-od-id={
                      index === 0 ? "dm-script-wugang" : "dm-script-jinling"
                    }
                  >
                    <strong>{script.name}</strong>
                    <span>{script.meta}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="surface-card" data-od-id="dm-style">
              <p className="eyebrow">带本方式</p>
              <h3>{dm.styleTitle}</h3>
              <p>{dm.style}</p>
              <div className="row" style={{ marginTop: 16 }}>
                {dm.styleTags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="section" data-od-id="dm-reviews">
          <div className="container">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <p className="eyebrow">玩家评价</p>
                <h2 data-od-id="dm-review-heading">把体验留给玩过的人说。</h2>
              </div>
              <Button variant="secondary" href="/report" data-od-id="dm-report">
                举报 DM 服务
              </Button>
            </div>
            <div className="review" data-od-id="dm-review-1">
              <strong>Kingfisher</strong>
              <span className="tag" style={{ marginLeft: 8 }}>
                见雾
              </span>
              <p>
                第一次玩情感本，DM
                带得很稳，角色信息给得清楚，适合朋友一起入门。
              </p>
              <time>上周</time>
              <div className="review-reply">
                <span>{dm.name}</span>
                回复：谢谢你把第一次留给雾港，希望下次还在故事里见。
              </div>
            </div>
            <div className="review" data-od-id="dm-review-2">
              <strong>林间有雾</strong>
              <span className="tag" style={{ marginLeft: 8 }}>
                望遥
              </span>
              <p>
                最后一幕结束的时候，大家都没有马上说话。喜欢这种把情绪留在桌上的本。
              </p>
              <time>3 天前</time>
            </div>
            <div className="note" data-od-id="dm-review-note">
              评价需要账号有储值记录或积分余额；敏感词命中后不会展示。店长及以上可删除违规评价。
            </div>
          </div>
        </section>
      </main>
      <CatalogFooter meta="DM 由店内排期 · 杭州" />
    </Screen>
  );
}

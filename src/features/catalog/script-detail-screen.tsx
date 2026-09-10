"use client";

import type { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";

import { Screen } from "@/components/layout";
import { Button, Select, Textarea, useToast } from "@/components/ui";

import "./catalog-enhancements.css";
import { CatalogFooter, ScriptsHeader } from "./catalog-chrome";
import { getScript, type RelatedItem, type ScriptId } from "./data";

function RelatedLink({ item }: { item: RelatedItem }) {
  return (
    <Link className="related-item" href={item.href} data-od-id={item.odId}>
      <div>
        <strong>{item.name}</strong>
        <span>{item.meta}</span>
      </div>
      <span aria-hidden="true">→</span>
    </Link>
  );
}

export function ScriptDetailScreen({ id }: { id: ScriptId }) {
  const script = getScript(id);
  const toast = useToast();
  const isWugang = id === "wugang-laixin";

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    form.reset();
    toast("评价已发布，感谢你把故事说给我们听");
  }

  return (
    <Screen name="script-detail">
      <ScriptsHeader />
      <main id="content">
        <section className="detail-hero" data-od-id="script-detail-hero">
          <div className="container detail-grid">
            <div
              className={`detail-cover${script.coverImage ? "" : " catalog-word-cover"}`}
            >
              {script.coverImage ? (
                <Image
                  src={script.coverImage}
                  alt={script.coverAlt ?? `${script.name}剧本封面`}
                  width={685}
                  height={685}
                  priority
                />
              ) : (
                <div className="cover-word">
                  {script.coverWords?.[0]}
                  <br />
                  {script.coverWords?.[1]}
                </div>
              )}
            </div>
            <div className="detail-copy">
              <p className="eyebrow">剧本档案 · 店内展示</p>
              <h1 data-od-id="script-title">{script.name}</h1>
              <p className="lead">{script.description}</p>
              <div className="row" style={{ flexWrap: "wrap", marginTop: 22 }}>
                {script.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
                <span
                  className="meta"
                  style={{
                    color: "color-mix(in oklch,var(--bg) 68%,transparent)",
                  }}
                >
                  {script.duration} · {script.people} · ¥{script.price} / 人
                </span>
              </div>
              <div className="row" style={{ marginTop: 28 }}>
                <Button
                  variant="primary"
                  href="/sessions"
                  data-od-id="detail-session-cta"
                >
                  查看可报名场次
                </Button>
                <Button
                  variant="secondary"
                  href="/booking/new"
                  style={{
                    background: "transparent",
                    color: "var(--bg)",
                    borderColor:
                      "color-mix(in oklch,var(--bg) 42%,transparent)",
                  }}
                  data-od-id="detail-booking-cta"
                >
                  自主发起预约
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="section" data-od-id="script-info">
          <div className="container grid-2-1">
            <div className="stack">
              <div>
                <p className="eyebrow">{script.storyEyebrow}</p>
                <h2>{script.storyHeading}</h2>
              </div>
              <div className="grid-2">
                {script.storyCards.map((item) => (
                  <div className="surface-card" key={item.meta}>
                    <div className="meta">{item.meta}</div>
                    <h3 style={{ marginTop: 12 }}>{item.title}</h3>
                    <p
                      style={{
                        color: "var(--muted)",
                        fontSize: 14,
                        marginBottom: 0,
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <aside className="dark-panel" data-od-id="script-side-summary">
              <p className="eyebrow" style={{ color: "var(--bg)" }}>
                {script.experienceLabel}
              </p>
              <div
                className="metric"
                style={{
                  borderColor: "color-mix(in oklch,var(--bg) 30%,transparent)",
                }}
              >
                <div className="value" style={{ color: "var(--bg)" }}>
                  {script.rating}
                </div>
                <div className="label muted">
                  {script.reviewCount
                    ? `来自 ${script.reviewCount} 条评价`
                    : "综合评分"}
                </div>
              </div>
              <hr className="rule" />
              <div className="stack" style={{ gap: 12 }}>
                <div className="row-between">
                  <span className="muted">适合人数</span>
                  <strong>{script.people}</strong>
                </div>
                <div className="row-between">
                  <span className="muted">体验时长</span>
                  <strong>{script.duration}</strong>
                </div>
                {script.relatedCostumes[0] ? (
                  <div className="row-between">
                    <span className="muted">推荐妆造</span>
                    <span className="tag">
                      {script.relatedCostumes[0].name}
                    </span>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </section>

        <section className="section" data-od-id="script-reviews">
          <div className="container">
            <div className="row-between">
              <div>
                <p className="eyebrow">玩家评价</p>
                <h2>玩完之后，再把故事说给我们听。</h2>
              </div>
              <Button
                variant="secondary"
                href="#script-review-entry"
                data-od-id="write-review"
              >
                写一条评价
              </Button>
            </div>
            {isWugang ? (
              <>
                <div className="review">
                  <div className="avatar">林</div>
                  <div>
                    <div className="row">
                      <strong>林间有雾</strong>
                      <span className="tag">望遥</span>
                    </div>
                    <p>
                      最后一幕结束的时候，大家都没有马上说话。喜欢这种把情绪留在桌上的本。
                    </p>
                  </div>
                  <span className="time">3 天前</span>
                </div>
                <div className="review">
                  <div className="avatar">K</div>
                  <div>
                    <div className="row">
                      <strong>Kingfisher</strong>
                      <span className="tag">见雾</span>
                    </div>
                    <p>
                      第一次玩情感本，DM
                      带得很稳，角色信息给得清楚，适合朋友一起入门。
                    </p>
                  </div>
                  <span className="time">上周</span>
                </div>
              </>
            ) : (
              <div className="empty">
                <strong>还没有公开评价</strong>
                玩完之后，可以把非剧透感受留在这里。
              </div>
            )}
          </div>
        </section>

        <section className="section" data-od-id="script-relations">
          <div className="container grid-2">
            <div className="surface-card" data-od-id="related-dms">
              <p className="eyebrow">关联 DM</p>
              <h3 data-od-id="related-dms-heading">
                这本故事，可以交给谁来带？
              </h3>
              <div className="related-list">
                {script.relatedDms.map((item) => (
                  <RelatedLink key={item.href} item={item} />
                ))}
              </div>
              <Button
                variant="ghost"
                className="btn-arrow"
                href="/dms"
                data-od-id="related-dm-more"
              >
                查看全部 DM
              </Button>
            </div>
            <div className="surface-card" data-od-id="related-costumes">
              <p className="eyebrow">推荐妆造</p>
              <h3 data-od-id="related-costumes-heading">
                让角色从推门之前就出现。
              </h3>
              <div className="related-list">
                {script.relatedCostumes.map((item) => (
                  <RelatedLink key={item.href} item={item} />
                ))}
              </div>
              <Button
                variant="ghost"
                className="btn-arrow"
                href="/costumes"
                data-od-id="related-costume-more"
              >
                浏览妆造
              </Button>
            </div>
          </div>
        </section>

        <section
          className="section"
          id="script-review-entry"
          data-od-id="script-review-entry"
        >
          <div className="container">
            <div className="review-form" data-od-id="review-form">
              <h3 data-od-id="review-form-heading">玩过这本？留下你的评价。</h3>
              <p className="field-help">
                账号有储值记录或积分余额即可发布，内容会先经过敏感词过滤。
              </p>
              <form className="form-grid" onSubmit={submitReview}>
                <div className="field">
                  <label htmlFor="review-rating">评分</label>
                  <Select
                    className="select"
                    id="review-rating"
                    name="rating"
                    data-od-id="review-rating"
                    required
                  >
                    <option value="">请选择</option>
                    <option>5 分</option>
                    <option>4 分</option>
                    <option>3 分</option>
                    <option>2 分</option>
                    <option>1 分</option>
                  </Select>
                </div>
                <div className="field">
                  <label htmlFor="review-target">评价对象</label>
                  <Select
                    className="select"
                    id="review-target"
                    name="target"
                    data-od-id="review-target"
                    required
                  >
                    <option>{script.name}</option>
                    {script.relatedDms[0] ? (
                      <option>带本 DM：{script.relatedDms[0].name}</option>
                    ) : null}
                  </Select>
                </div>
                <div className="field span-2">
                  <label htmlFor="review-content">想说的话</label>
                  <Textarea
                    id="review-content"
                    name="content"
                    data-od-id="review-content"
                    placeholder="分享非剧透感受，至少写一句"
                    required
                  />
                </div>
                <div
                  className="span-2"
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <Button
                    variant="secondary"
                    type="submit"
                    data-od-id="review-submit"
                  >
                    发布评价
                  </Button>
                  <Button
                    variant="ghost"
                    href="/report"
                    data-od-id="report-script-link"
                  >
                    举报剧本内容
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
      <CatalogFooter meta="单店自用 PWA · 杭州" />
    </Screen>
  );
}

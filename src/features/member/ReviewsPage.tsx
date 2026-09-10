"use client";

import { useMemo, useState } from "react";
import { Button, Select, useToast } from "@/components/ui";
import { Screen, SiteFooter, SiteHeader } from "@/components/layout";
import { EmptyState, ReviewCard } from "./components";
import { initialReviews, type ReviewKind } from "./data";

type ReviewFilter = "all" | ReviewKind;

export function ReviewsPage() {
  const [reviews, setReviews] = useState(initialReviews);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const toast = useToast();
  const visibleReviews = useMemo(
    () =>
      reviews.filter((review) => filter === "all" || review.kind === filter),
    [filter, reviews],
  );

  function deleteReview(id: string) {
    setReviews((items) => items.filter((item) => item.id !== id));
    toast("评价已删除");
  }

  return (
    <Screen name="me-reviews">
      <SiteHeader active="me" mode="customer">
        <Button variant="secondary" href="/me">
          回到个人中心
        </Button>
      </SiteHeader>
      <main>
        <section className="page-head">
          <div className="container">
            <p className="eyebrow">C 端 / 我的评价</p>
            <h1>写下你真正记得的部分。</h1>
            <p className="lead">
              这里集中显示你发布过的剧本与 DM
              评价。你可以随时删除自己的评价，商家回复会保留在原评价下方。
            </p>
          </div>
        </section>
        <section className="section">
          <div className="container">
            <div className="toolbar">
              <div>
                <p className="eyebrow">评价记录</p>
                <h2 style={{ fontSize: 34 }}>共 {reviews.length} 条评价。</h2>
              </div>
              <div className="toolbar-group">
                <label htmlFor="review-filter" className="meta">
                  查看对象
                </label>
                <Select
                  id="review-filter"
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value as ReviewFilter)
                  }
                >
                  <option value="all">全部</option>
                  <option value="script">剧本</option>
                  <option value="dm">DM</option>
                </Select>
              </div>
            </div>
            <div className="review-list" id="review-list">
              {reviews.map((review) => (
                <ReviewCard
                  review={review}
                  onDelete={deleteReview}
                  key={review.id}
                  hidden={filter !== "all" && review.kind !== filter}
                />
              ))}
            </div>
            <EmptyState
              id="review-empty"
              title="还没有符合条件的评价。"
              visible={visibleReviews.length === 0}
            >
              玩过一本剧本后，可以回到详情页留下非剧透感受。
            </EmptyState>
            <div className="note">
              评价门槛：账号有储值记录或积分余额即可发布。敏感词命中会拦截；删除自己的评价不会影响储值和积分流水。
            </div>
          </div>
        </section>
      </main>
      <SiteFooter meta="评价只属于发布它的人 · 杭州" />
    </Screen>
  );
}

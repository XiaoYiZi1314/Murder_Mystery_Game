"use client";

import { useMemo, useState } from "react";

import { Screen } from "@/components/layout";
import { Button, Input } from "@/components/ui";

import "./catalog-enhancements.css";
import { CatalogFooter, DmsHeader } from "./catalog-chrome";
import { DmCard } from "./catalog-cards";
import { dms } from "./data";

const dmFilters = [
  ["all", "全部 DM"],
  ["情感", "情感还原"],
  ["机制", "机制推进"],
  ["古风", "古风沉浸"],
] as const;

export function DmsScreen() {
  const [filter, setFilter] = useState<(typeof dmFilters)[number][0]>("all");
  const [query, setQuery] = useState("");

  const visibleDms = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    return dms.filter((dm) => {
      const matchesTag = filter === "all" || dm.tags.join(" ").includes(filter);
      const haystack = `${dm.name} ${dm.specialty} ${dm.tags.join(" ")} ${dm.listDescription}`;
      return (
        matchesTag &&
        haystack.toLocaleLowerCase("zh-CN").includes(normalizedQuery)
      );
    });
  }, [filter, query]);

  return (
    <Screen name="dms">
      <DmsHeader />
      <main id="content">
        <section className="page-head" data-od-id="dm-head">
          <div className="container">
            <p className="eyebrow">C 端 / DM</p>
            <div className="row-between">
              <div>
                <h1 data-od-id="page-title">把故事交给适合的带本人。</h1>
                <p className="lead">
                  按擅长题材与带本风格浏览
                  DM。每个人都有自己的节奏，详情页会列出可带剧本与评价。
                </p>
              </div>
              <Button
                variant="primary"
                href="/booking/new"
                data-od-id="dm-booking"
              >
                按 DM 发起预约
              </Button>
            </div>
          </div>
        </section>
        <section className="section" data-od-id="dm-list">
          <div className="container">
            <div className="toolbar">
              <div
                className="toolbar-group"
                role="group"
                aria-label="DM 类型筛选"
              >
                <div className="segmented">
                  {dmFilters.map(([value, label]) => {
                    const active = filter === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        className={active ? "active" : undefined}
                        aria-pressed={active}
                        onClick={() => setFilter(value)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="toolbar-group">
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索 DM 或擅长题材"
                  aria-label="搜索 DM 或擅长题材"
                  data-od-id="dm-search"
                />
              </div>
            </div>
            {visibleDms.length ? (
              <div className="grid-3" data-od-id="dm-grid">
                {visibleDms.map((dm) => (
                  <DmCard key={dm.id} dm={dm} />
                ))}
              </div>
            ) : (
              <div className="empty" role="status">
                <strong>没有找到匹配的 DM</strong>
                换一个名字或擅长题材试试。
              </div>
            )}
            <div className="note" data-od-id="dm-note">
              DM 照片由员工自行上传，店长与 BOSS
              负责展示状态。未上传照片时，页面会显示名字首字。
            </div>
          </div>
        </section>
      </main>
      <CatalogFooter meta="DM 由店内排期 · 杭州" />
    </Screen>
  );
}

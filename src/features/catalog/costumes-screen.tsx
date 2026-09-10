"use client";

import { useMemo, useState } from "react";

import { Screen } from "@/components/layout";
import { Button, Input } from "@/components/ui";

import "./catalog-enhancements.css";
import { CatalogFooter, CostumesHeader } from "./catalog-chrome";
import { CostumeCard } from "./catalog-cards";
import { costumes } from "./data";

const costumeFilters = [
  ["all", "全部"],
  ["情感", "情感"],
  ["古风", "古风"],
] as const;

export function CostumesScreen() {
  const [filter, setFilter] =
    useState<(typeof costumeFilters)[number][0]>("all");
  const [query, setQuery] = useState("");

  const visibleCostumes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    return costumes.filter((costume) => {
      const matchesTag =
        filter === "all" || costume.tags.join(" ").includes(filter);
      const haystack = `${costume.name} ${costume.tags.join(" ")} ${costume.listDescription}`;
      return (
        matchesTag &&
        haystack.toLocaleLowerCase("zh-CN").includes(normalizedQuery)
      );
    });
  }, [filter, query]);

  return (
    <Screen name="costumes">
      <CostumesHeader />
      <main id="content">
        <section className="page-head" data-od-id="costume-head">
          <div className="container">
            <p className="eyebrow">C 端 / 妆造</p>
            <div className="row-between">
              <div>
                <h1 data-od-id="page-title">先把角色穿上身。</h1>
                <p className="lead">
                  按故事与气质浏览店内妆造。详情页会标明适合的剧本与搭配方式，现场由店内确认档期。
                </p>
              </div>
              <Button
                variant="primary"
                href="/booking/new"
                data-od-id="costume-booking"
              >
                连妆造一起预约
              </Button>
            </div>
          </div>
        </section>
        <section className="section" data-od-id="costume-list">
          <div className="container">
            <div className="toolbar">
              <div
                className="toolbar-group"
                role="group"
                aria-label="妆造分类"
                data-od-id="costume-filters"
              >
                <div className="segmented">
                  {costumeFilters.map(([value, label]) => {
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
                  placeholder="搜索妆造名称"
                  aria-label="搜索妆造名称"
                  data-od-id="costume-search"
                />
              </div>
            </div>
            {visibleCostumes.length ? (
              <div className="grid-3" data-od-id="costume-grid">
                {visibleCostumes.map((costume) => (
                  <CostumeCard key={costume.id} costume={costume} />
                ))}
              </div>
            ) : (
              <div className="empty" role="status">
                <strong>没有找到匹配的妆造</strong>
                换一个名称或风格试试。
              </div>
            )}
            <div className="note" data-od-id="costume-note">
              妆造图片、尺寸与可用状态由店内统一维护；未上传实拍照片时显示名称档案位。
            </div>
          </div>
        </section>
      </main>
      <CatalogFooter meta="妆造由店内确认 · 杭州" />
    </Screen>
  );
}

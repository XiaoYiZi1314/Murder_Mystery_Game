"use client";

import { useMemo, useState } from "react";

import { Screen } from "@/components/layout";
import { Button, Input, Select } from "@/components/ui";

import "./catalog-enhancements.css";
import { CatalogFooter, ScriptsHeader } from "./catalog-chrome";
import { ScriptCard } from "./catalog-cards";
import { scripts } from "./data";

type ScriptTab = "recommend" | "all" | "new";
type ScriptSort = "default" | "rating" | "price";

const tabs: readonly { id: ScriptTab; label: string }[] = [
  { id: "recommend", label: "精选推荐" },
  { id: "all", label: "全部剧本" },
  { id: "new", label: "最近上架" },
];

export function ScriptsScreen() {
  const [tab, setTab] = useState<ScriptTab>("recommend");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ScriptSort>("default");

  const visibleScripts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    const filtered = scripts.filter((script) =>
      `${script.name} ${script.category} ${script.summary}`
        .toLocaleLowerCase("zh-CN")
        .includes(normalizedQuery),
    );

    if (sort === "rating") {
      return [...filtered].sort((a, b) => b.rating - a.rating);
    }
    if (sort === "price") {
      return [...filtered].sort((a, b) => a.price - b.price);
    }
    return filtered;
  }, [query, sort]);

  return (
    <Screen name="scripts">
      <ScriptsHeader />
      <main id="content">
        <section className="page-head" data-od-id="page-head">
          <div className="container">
            <p className="eyebrow">C 端 / 剧本</p>
            <div className="row-between">
              <div>
                <h1 data-od-id="page-title">先挑一个今晚想成为的人。</h1>
                <p className="lead">
                  剧本详情需要登录查看。这里先用标签、时长和价格，帮你缩小选择范围。
                </p>
              </div>
              <Button
                variant="primary"
                href="/booking/new"
                data-od-id="scripts-primary-cta"
              >
                按时间发起预约
              </Button>
            </div>
          </div>
        </section>
        <section className="section" data-od-id="script-list">
          <div className="container">
            <div className="toolbar">
              <div className="toolbar-left">
                <div className="segmented" role="tablist">
                  {tabs.map((item) => {
                    const active = tab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        className={active ? "active" : undefined}
                        aria-selected={active}
                        aria-controls={`scripts-${item.id}`}
                        onClick={() => setTab(item.id)}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="toolbar-right">
                <Input
                  type="search"
                  style={{ width: 220 }}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索剧本名称"
                  aria-label="搜索剧本名称"
                />
                <Select
                  className="select"
                  style={{ width: 140 }}
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as ScriptSort)
                  }
                  aria-label="排序方式"
                >
                  <option value="default">综合排序</option>
                  <option value="rating">评分优先</option>
                  <option value="price">价格从低到高</option>
                </Select>
              </div>
            </div>

            <div
              className="grid-3"
              id="scripts-recommend"
              role="tabpanel"
              hidden={tab !== "recommend"}
              data-od-id="script-grid"
            >
              {visibleScripts.map((script) => (
                <ScriptCard key={script.id} script={script} />
              ))}
            </div>
            {tab === "recommend" && visibleScripts.length === 0 ? (
              <div className="empty" role="status">
                <strong>没有找到匹配的剧本</strong>
                换一个名称或题材试试。
              </div>
            ) : null}
            <div
              id="scripts-all"
              className="empty"
              role="tabpanel"
              hidden={tab !== "all"}
            >
              <strong>全部剧本</strong>
              同一套筛选结构可复用到完整剧本库。
            </div>
            <div
              id="scripts-new"
              className="empty"
              role="tabpanel"
              hidden={tab !== "new"}
            >
              <strong>最近上架</strong>
              暂无新的上架剧本，关注小铃铛获取通知。
            </div>
          </div>
        </section>
      </main>
      <CatalogFooter meta="单店自用 PWA · 杭州" />
    </Screen>
  );
}

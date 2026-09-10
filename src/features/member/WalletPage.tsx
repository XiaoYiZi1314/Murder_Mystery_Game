"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Screen, SiteFooter, SiteHeader } from "@/components/layout";
import {
  EmptyState,
  ledgerFilters,
  MemberHeaderActions,
  WalletLedger,
} from "./components";
import { ledgerEntries, type LedgerKind } from "./data";

type Filter = "all" | LedgerKind;

export function WalletPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const entries =
    filter === "all"
      ? ledgerEntries
      : ledgerEntries.filter((entry) => entry.kinds.includes(filter));

  return (
    <Screen name="wallet-detail">
      <SiteHeader active="me" mode="customer">
        <MemberHeaderActions />
      </SiteHeader>
      <main id="content">
        <section className="page-head" data-od-id="wallet-page-head">
          <div className="container head-row">
            <div>
              <p className="eyebrow">C 端 / 我的 / 流水记录</p>
              <h1 data-od-id="page-title">流水明细</h1>
              <p className="lead">储值与积分分开记录，每一笔变动都可以核对。</p>
            </div>
            <Button variant="secondary" href="/me">
              返回个人中心
            </Button>
          </div>
        </section>

        <section className="ledger-section" data-od-id="wallet-ledger-detail">
          <div className="container">
            <div className="ledger-summary" data-od-id="ledger-summary">
              <strong>全部记录</strong>
              <div className="summary-meta">
                <span>
                  当前余额 <b>¥680.00</b>
                </span>
                <span>
                  当前积分 <b>1,260</b>
                </span>
              </div>
            </div>
            <div
              className="filters"
              role="group"
              aria-label="按流水类型筛选"
              data-od-id="ledger-filters"
            >
              {ledgerFilters.map((item) => (
                <button
                  className="filter"
                  type="button"
                  aria-pressed={filter === item.value}
                  data-filter={item.value}
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="table-wrap" data-od-id="ledger-table-wrap">
              <WalletLedger entries={ledgerEntries} filter={filter} />
              <EmptyState
                id="ledger-empty"
                title="暂无此类流水"
                visible={entries.length === 0}
              >
                新的记录产生后会显示在这里。
              </EmptyState>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter meta="单店自用 PWA · 杭州" />
    </Screen>
  );
}

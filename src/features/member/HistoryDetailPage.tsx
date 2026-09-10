"use client";

import { useState } from "react";
import Image from "next/image";
import { Screen, SiteFooter, SiteHeader } from "@/components/layout";
import type { PlayedScript } from "./data";
import { MemberHeaderActions } from "./components";

export function HistoryDetailPage({ script }: { script: PlayedScript }) {
  const [coverState, setCoverState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  return (
    <Screen name="played-script-detail">
      <SiteHeader active="me" mode="customer">
        <MemberHeaderActions />
      </SiteHeader>
      <main id="content">
        <section className="page-head" data-od-id="page-head">
          <div className="container">
            <p className="eyebrow">C 端 / 我的 / 历史记录</p>
            <h1 data-od-id="page-title">玩过的剧本</h1>
          </div>
        </section>
        <section className="history-section" data-od-id="played-script-record">
          <div className="container">
            <div
              className="history-table-wrap"
              data-od-id="played-script-table"
            >
              <table className="history-table">
                <caption className="sr-only">已玩过的剧本与对应封面</caption>
                <thead>
                  <tr>
                    <th scope="col">剧本名</th>
                    <th scope="col">封面图</th>
                  </tr>
                </thead>
                <tbody>
                  <tr data-od-id={`played-script-${script.id}`}>
                    <th scope="row">{script.name}</th>
                    <td className="cover-cell">
                      {script.image ? (
                        <figure
                          className="cover-frame"
                          data-state={coverState}
                          data-od-id={`played-script-${script.id}-cover`}
                        >
                          <Image
                            src={script.image}
                            width={900}
                            height={1200}
                            alt={script.imageAlt}
                            decoding="async"
                            fetchPriority="high"
                            onLoad={() => setCoverState("ready")}
                            onError={() => setCoverState("error")}
                          />
                          <div
                            className="cover-status"
                            role="status"
                            aria-live="polite"
                          >
                            {coverState === "error"
                              ? "封面暂时无法显示"
                              : "封面加载中"}
                          </div>
                        </figure>
                      ) : (
                        <figure
                          className="cover-frame"
                          data-state="placeholder"
                          data-od-id={`played-script-${script.id}-cover`}
                        >
                          <div
                            className="cover-placeholder"
                            role="img"
                            aria-label={script.imageAlt}
                          >
                            <strong>封面待上传</strong>
                            <span>暂未找到项目本地素材</span>
                          </div>
                        </figure>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter meta="单店自用 PWA · 杭州" />
    </Screen>
  );
}

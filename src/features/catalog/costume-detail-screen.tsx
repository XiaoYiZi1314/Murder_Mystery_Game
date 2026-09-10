import Link from "next/link";

import { Screen } from "@/components/layout";
import { Button } from "@/components/ui";

import "./catalog-enhancements.css";
import { CatalogFooter, CostumesHeader } from "./catalog-chrome";
import { getCostume, type CostumeId } from "./data";

export function CostumeDetailScreen({ id }: { id: CostumeId }) {
  const costume = getCostume(id);

  return (
    <Screen name="costume-detail">
      <CostumesHeader detail />
      <main id="content">
        <section className="detail-hero" data-od-id="costume-detail-hero">
          <div className="container detail-grid">
            <div
              className="detail-art"
              aria-label={`${costume.name}妆造照片待上传`}
            >
              <strong>{costume.name}</strong>
              <span>实拍照片待店内上传</span>
            </div>
            <div className="detail-copy">
              <p className="eyebrow">妆造档案 / {costume.series}</p>
              <h1 data-od-id="costume-title">{costume.name}</h1>
              <p className="lead">{costume.description}</p>
              <div className="row" style={{ marginTop: 24 }}>
                {costume.tags.map((tag) => (
                  <span
                    className="tag"
                    key={tag}
                    style={{
                      border:
                        "1px solid color-mix(in oklch,var(--bg) 38%,transparent)",
                      padding: "5px 10px",
                      borderRadius: "var(--radius-pill)",
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
                  {costume.fit}
                </span>
              </div>
              <div className="row" style={{ marginTop: 30 }}>
                <Button
                  variant="primary"
                  href="/booking/new"
                  data-od-id="costume-booking"
                >
                  连妆造一起预约
                </Button>
                <Button
                  variant="secondary"
                  href="/costumes"
                  data-od-id="costume-back"
                >
                  返回妆造列表
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="section" data-od-id="costume-gallery">
          <div className="container">
            <p className="eyebrow">统一展示比例</p>
            <h2 data-od-id="gallery-heading">看细节，再决定角色的轮廓。</h2>
            <div className="gallery">
              <div className="gallery-item" data-od-id="gallery-front">
                <strong>正面档案</strong>
                <span>实拍素材待上传</span>
              </div>
              <div className="gallery-item" data-od-id="gallery-detail">
                <strong>材质细节</strong>
                <span>实拍素材待上传</span>
              </div>
              <div className="gallery-item" data-od-id="gallery-match">
                <strong>搭配档案</strong>
                <span>实拍素材待上传</span>
              </div>
            </div>
            <div className="note" data-od-id="gallery-note">
              妆造档案采用统一比例展示；实拍照片由店内更新，方便比较正面、材质与搭配细节。
            </div>
          </div>
        </section>
        <section className="section" data-od-id="costume-usage">
          <div className="container grid-2">
            <div className="surface-card" data-od-id="costume-scripts">
              <p className="eyebrow">关联剧本</p>
              <h3>适合把情绪留在桌上的故事</h3>
              <div className="related-list">
                {costume.scripts.map((script, index) => (
                  <Link
                    className="related-item"
                    href={script.href}
                    key={script.href}
                    data-od-id={
                      index === 0
                        ? "costume-script-wugang"
                        : "costume-script-jinling"
                    }
                  >
                    <strong>{script.name}</strong>
                    <span>{script.meta}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="surface-card" data-od-id="costume-guidance">
              <p className="eyebrow">到店准备</p>
              <h3>预约时告诉我们你的角色方向</h3>
              <p>
                店内会根据场次、角色与当天可用状态确认妆造。这里不做线上下单，也不会产生额外支付。
              </p>
              <Button
                variant="ghost"
                className="btn-arrow"
                href="/booking/new"
                data-od-id="costume-guidance-link"
              >
                在预约备注里说明
              </Button>
            </div>
          </div>
        </section>
      </main>
      <CatalogFooter meta="妆造由店内确认 · 杭州" />
    </Screen>
  );
}

import { Button } from "@/components/ui";
import { Screen, SiteFooter, SiteHeader } from "@/components/layout";

const giftSlots = [
  {
    id: "01",
    text: "店内填写礼品名称、图片、兑换分值与有效时段后，这里会显示可兑换内容。",
  },
  {
    id: "02",
    text: "保留第二个橱窗位，避免在没有真实礼品资料时编造商品或兑换价格。",
  },
  {
    id: "03",
    text: "上架后会同步展示到这里，兑换仍由店内完成并写入积分流水。",
  },
];

export function GiftsPage() {
  return (
    <Screen name="gifts">
      <SiteHeader active="me" mode="customer">
        <Button variant="primary" href="/booking/new">
          发起预约
        </Button>
      </SiteHeader>
      <main id="content">
        <section className="page-head" data-od-id="gift-head">
          <div className="container">
            <p className="eyebrow">C 端 / 积分礼品</p>
            <div className="row-between">
              <div>
                <h1 data-od-id="page-title">把积分，换成带得走的记忆。</h1>
                <p className="lead">
                  礼品只做店内橱窗展示，兑换由店员在后台操作并记录流水，不做线上下单或发货。
                </p>
              </div>
              <Button variant="primary" href="/me/member">
                查看我的积分
              </Button>
            </div>
          </div>
        </section>

        <section className="section" data-od-id="gift-overview">
          <div className="container grid-2">
            <div className="balance-card" data-od-id="gift-balance">
              <span className="label">当前可用积分</span>
              <div className="amount num">1,260</div>
              <hr className="rule" />
              <div className="row-between" style={{ marginTop: 16 }}>
                <span className="label">兑换方式</span>
                <strong>到店登记</strong>
              </div>
            </div>
            <div className="notice" data-od-id="gift-policy">
              <strong
                style={{
                  display: "block",
                  color: "var(--fg)",
                  fontSize: 18,
                  marginBottom: 6,
                }}
              >
                先看清规则
              </strong>
              <p style={{ margin: 0 }}>
                礼品名称、图片、所需积分与可兑时段由后台配置；店员核对账号后扣分，兑换记录会出现在你的流水中。
              </p>
              <Button variant="ghost" className="btn-arrow" href="/me/wallet">
                查看兑换流水
              </Button>
            </div>
          </div>
        </section>

        <section className="section" data-od-id="gift-catalog">
          <div className="container">
            <div className="row-between">
              <div>
                <p className="eyebrow">礼品橱窗</p>
                <h2 data-od-id="catalog-heading">当前橱窗等待店内配置。</h2>
              </div>
              <span className="status" data-od-id="catalog-status">
                尚未上架
              </span>
            </div>
            <div className="grid-3" style={{ marginTop: 28 }}>
              {giftSlots.map((slot) => (
                <article
                  className="gift-slot"
                  data-od-id={`gift-slot-${slot.id}`}
                  key={slot.id}
                >
                  <div className="gift-art">礼品图片待上传</div>
                  <div className="gift-body">
                    <div className="row-between">
                      <h3>礼品位 {slot.id}</h3>
                      <span className="meta">积分待配置</span>
                    </div>
                    <p>{slot.text}</p>
                    <span className="status">待上架</span>
                  </div>
                </article>
              ))}
            </div>
            <div className="notice" data-od-id="gift-config-note">
              当前开发文档只定义了礼品字段，没有提供真实礼品资料；因此这里保留可用的橱窗结构和明确待配置状态。
            </div>
          </div>
        </section>

        <section className="section" data-od-id="gift-process">
          <div className="container">
            <p className="eyebrow">线下兑换流程</p>
            <h2 data-od-id="process-heading">三步完成一次兑换。</h2>
            <div className="steps">
              <div className="step" data-od-id="gift-step-01">
                <span className="step-index">01</span>
                <strong>到店选礼品</strong>
                <p>在橱窗确认名称、分值与可兑时段。</p>
              </div>
              <div className="step" data-od-id="gift-step-02">
                <span className="step-index">02</span>
                <strong>店员核对账号</strong>
                <p>确认你的注册账号与当前积分余额。</p>
              </div>
              <div className="step" data-od-id="gift-step-03">
                <span className="step-index">03</span>
                <strong>扣分并记录</strong>
                <p>店员后台完成兑换，历史会保留在流水中。</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter meta="礼品线下兑换 · 杭州" />
    </Screen>
  );
}

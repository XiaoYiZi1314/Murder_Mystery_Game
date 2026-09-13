"use client";

import { useState } from "react";
import { useRemote } from "@/features/booking/api-state";
import type { BookingRequestDto, PaginatedDto } from "@/lib/api/contracts";
import { Form, Input as AntInput, Modal, Select as AntSelect } from "antd";
import { Button, useToast } from "@/components/ui";
import {
  AdminFrame,
  PageHead,
  Segmented,
  StatusBadge,
} from "./admin-shared";

export type OpsTab = "requests" | "registrations" | "governance" | "assets";
type Governance = {
  id: string;
  kind: "review" | "report";
  title: string;
  detail: string;
  status: string;
  metaLabel: string;
  meta: string;
};
type AssetVisibility = "公开展示" | "隐藏" | "草稿";
type Asset = {
  id: string;
  type: "妆造" | "DM";
  name: string;
  relation: string;
  status: string;
  statLabel: string;
  stat: string;
  availabilityLabel: string;
  availability: string;
  visibility: AssetVisibility;
};

const governanceSeed: Governance[] = [
  {
    id: "governance-review-001",
    kind: "review",
    title: "评价 · 林间有雾",
    detail: "雾港来信 · “最后一幕结束的时候，大家都没有马上说话。”",
    status: "待回复",
    metaLabel: "对象",
    meta: "剧本评价",
  },
  {
    id: "governance-report-001",
    kind: "report",
    title: "匿名举报 · DM 服务",
    detail: "对象：已隐藏 · 含附加截图 · 举报人身份不可见",
    status: "待查看",
    metaLabel: "提交时间",
    meta: "今天 09:42",
  },
  {
    id: "governance-review-002",
    kind: "review",
    title: "评价 · Kingfisher",
    detail: "金陵旧梦 · “DM 带得很稳，信息给得清楚。”",
    status: "待回复",
    metaLabel: "对象",
    meta: "DM 评价",
  },
];
const assetSeed: Asset[] = [
  {
    id: "asset-costume-001",
    type: "妆造",
    name: "雾港旧衣",
    relation: "关联：雾港来信 · 情感",
    status: "已上架",
    statLabel: "照片",
    stat: "待上传 3 张",
    availabilityLabel: "可用状态",
    availability: "店内确认",
    visibility: "公开展示",
  },
  {
    id: "asset-dm-001",
    type: "DM",
    name: "林深",
    relation: "关联：雾港来信 · 情感还原",
    status: "主页公开",
    statLabel: "头像",
    stat: "待上传 1 张",
    availabilityLabel: "账号角色",
    availability: "DM · 可自编辑",
    visibility: "公开展示",
  },
];

export function AdminOps({ initialTab = "requests" }: { initialTab?: OpsTab }) {
  const toast = useToast();
  const [tab, setTab] = useState<OpsTab>(initialTab);
  const requests = useRemote<PaginatedDto<BookingRequestDto>>(
    "/api/admin/sessions/pending?page_size=1",
  );
  const [governance, setGovernance] = useState(governanceSeed);
  const [assets, setAssets] = useState(assetSeed);
  const [replying, setReplying] = useState<Governance | null>(null);
  const [report, setReport] = useState<Governance | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetForm] = Form.useForm<{
    name: string;
    visibility: AssetVisibility;
  }>();

  function closeGovernance(row: Governance, action: "delete" | "close") {
    setGovernance((rows) => rows.filter((item) => item.id !== row.id));
    toast(
      action === "delete"
        ? "评价已删除并记录操作 · 仅当前页面演示"
        : "举报已标记为线下处理中 · 仅当前页面演示",
    );
  }

  function toggleAsset(asset: Asset) {
    const next: AssetVisibility =
      asset.visibility === "公开展示" ? "隐藏" : "公开展示";
    setAssets((rows) =>
      rows.map((item) =>
        item.id === asset.id
          ? {
              ...item,
              visibility: next,
              status:
                next === "隐藏"
                  ? "已隐藏"
                  : item.type === "DM"
                    ? "主页公开"
                    : "已上架",
            }
          : item,
      ),
    );
    toast(
      `${asset.name}${next === "公开展示" ? "已恢复公开" : "已隐藏"} · 仅当前页面演示`,
    );
  }

  function openAsset(asset: Asset) {
    setEditingAsset(asset);
    assetForm.setFieldsValue({
      name: asset.name,
      visibility: asset.visibility,
    });
  }

  function saveAsset(values: { name: string; visibility: AssetVisibility }) {
    if (!editingAsset) return;
    setAssets((rows) =>
      rows.map((asset) =>
        asset.id === editingAsset.id
          ? {
              ...asset,
              name: values.name,
              visibility: values.visibility,
              status:
                values.visibility === "草稿"
                  ? "草稿"
                  : values.visibility === "隐藏"
                    ? "已隐藏"
                    : asset.type === "DM"
                      ? "主页公开"
                      : "已上架",
            }
          : asset,
      ),
    );
    setEditingAsset(null);
    toast("资产状态已保存 · 仅当前页面演示");
  }

  return (
    <AdminFrame screen="admin-ops" active="ops" opsFooter>
      <PageHead
        odId="ops-head"
        eyebrow="B 端 / 运营处理"
        title="把临时情况，变成有记录的操作。"
        lead="预约审核与报名使用真实记录；押金、退款和履约操作尚未接通。"
      />
      <section className="section" data-od-id="ops-section">
        <div className="container">
          <div className="summary-grid" data-od-id="ops-summary">
            <div className="metric">
              <strong>{requests.data?.page_info.total ?? "—"}</strong>
              <span>待审核自主预约</span>
            </div>
            <div className="metric">
              <strong>C4</strong>
              <span>押金与履约待接通</span>
            </div>
            <div className="metric">
              <strong>{governance.length}</strong>
              <span>待处理评价/举报</span>
            </div>
            <div className="metric">
              <strong>
                {
                  assets.filter((asset) => asset.visibility === "公开展示")
                    .length
                }
              </strong>
              <span>可见内容资产</span>
            </div>
          </div>
          <Segmented
            className="tabs"
            value={tab}
            onChange={setTab}
            options={[
              { value: "requests", label: "预约审核" },
              { value: "registrations", label: "报名与押金" },
              { value: "governance", label: "评价与举报" },
              { value: "assets", label: "妆造与 DM" },
            ]}
          />

          {tab === "requests" && (
            <div
              className="panel"
              data-panel="requests"
              data-od-id="requests-panel"
            >
              <div className="panel-head">
                <div>
                  <p className="eyebrow">真实自主预约</p>
                  <h2>确认需求，再审核占坑。</h2>
                  <p>
                    通过将同事务生成一个场次和申请人的团队报名，不在当前页面模拟审批结果。
                  </p>
                </div>
                <StatusBadge tone="pending">
                  {requests.data?.page_info.total ?? "—"} 条待处理
                </StatusBadge>
              </div>
              {requests.error && <p role="alert">{requests.error.message}</p>}
              <Button href="/admin/sessions/pending">查看待审核申请</Button>
            </div>
          )}

          {tab === "registrations" && (
            <div
              className="panel"
              data-panel="registrations"
              data-od-id="registration-panel"
            >
              <div className="panel-head">
                <div>
                  <p className="eyebrow">真实报名名单</p>
                  <h2>以数据库记录为准。</h2>
                  <p>
                    查询已报名和已取消记录；押金、锁车、退款与结算将在后续周期接通，当前不提供演示成功按钮。
                  </p>
                </div>
              </div>
              <Button href="/admin/bookings">查看报名名单</Button>
            </div>
          )}

          {tab === "governance" && (
            <div
              className="panel"
              data-panel="governance"
              data-od-id="governance-panel"
            >
              <div className="panel-head">
                <div>
                  <p className="eyebrow">评价与举报</p>
                  <h2>先处理风险，再维护口碑。</h2>
                  <p>
                    评价支持回复和删除；举报内容默认匿名，对外不显示处理进度，当前演示不展示真实举报人信息。
                  </p>
                </div>
                <StatusBadge tone="danger">
                  {governance.length} 条待处理
                </StatusBadge>
              </div>
              <div className="data-list">
                {governance.map((row) => (
                  <div className="data-row" key={row.id} data-od-id={row.id}>
                    <div className="main">
                      <strong>{row.title}</strong>
                      <span>{row.detail}</span>
                    </div>
                    <div>
                      {row.kind === "report" ? (
                        <StatusBadge tone="danger">{row.status}</StatusBadge>
                      ) : (
                        <span className="tag">{row.status}</span>
                      )}
                    </div>
                    <div>
                      <span className="meta">{row.metaLabel}</span>
                      <span>{row.meta}</span>
                    </div>
                    <div className="action-row">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          row.kind === "report"
                            ? setReport(row)
                            : setReplying(row)
                        }
                      >
                        {row.kind === "report" ? "查看" : "回复"}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() =>
                          closeGovernance(
                            row,
                            row.kind === "report" ? "close" : "delete",
                          )
                        }
                      >
                        {row.kind === "report" ? "标记处理" : "删除"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {!governance.length && (
                <div className="empty">
                  <strong>待处理队列已清空</strong>当前没有待处理评价或举报。
                </div>
              )}
              <div className="notice">
                敏感词过滤在发布前完成；删除评价、查看举报等高风险动作应在真实后端增加审计日志与权限检查。
              </div>
            </div>
          )}

          {tab === "assets" && (
            <div
              className="panel"
              id="asset-panel"
              data-panel="assets"
              data-od-id="asset-panel"
            >
              <div className="panel-head">
                <div>
                  <p className="eyebrow">内容资产</p>
                  <h2>把照片、状态与关联关系维护清楚。</h2>
                  <p>
                    妆造由店内维护；DM 可编辑自己的主页，店长与 BOSS
                    负责账号与展示状态。
                  </p>
                </div>
                <Button
                  variant="primary"
                  href="/admin/content"
                  data-od-id="asset-content-link"
                >
                  进入内容库
                </Button>
              </div>
              <div className="asset-grid">
                {assets.map((asset) => (
                  <article
                    className="asset-card"
                    key={asset.id}
                    data-od-id={asset.id}
                  >
                    <div className="asset-header">
                      <div>
                        <h3>{asset.name}</h3>
                        <p>{asset.relation}</p>
                      </div>
                      <StatusBadge
                        tone={
                          asset.visibility === "公开展示" ? "open" : "default"
                        }
                      >
                        {asset.status}
                      </StatusBadge>
                    </div>
                    <div className="asset-meta">
                      <div>
                        <span>{asset.statLabel}</span>
                        <strong>{asset.stat}</strong>
                      </div>
                      <div>
                        <span>{asset.availabilityLabel}</span>
                        <strong>{asset.availability}</strong>
                      </div>
                    </div>
                    <div className="action-row" style={{ marginTop: 18 }}>
                      <Button
                        variant="secondary"
                        onClick={() => openAsset(asset)}
                      >
                        {asset.type === "DM" ? "编辑主页" : "编辑资产"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => toggleAsset(asset)}
                      >
                        {asset.visibility === "公开展示"
                          ? asset.type === "DM"
                            ? "隐藏主页"
                            : "下架"
                          : asset.visibility === "草稿"
                            ? "上架"
                            : "恢复展示"}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="notice">
                当前工程没有提供店内实拍或员工头像素材；页面保留上传字段和公开/隐藏状态，避免用虚构图片冒充真实内容。
              </div>
            </div>
          )}
        </div>
      </section>

      <Modal
        className="admin-antd-modal"
        getContainer={false}
        open={replying !== null}
        onCancel={() => setReplying(null)}
        footer={null}
        destroyOnHidden
        title={
          <>
            <p className="eyebrow">评价回复</p>
            <span>把回复写在故事之后。</span>
          </>
        }
      >
        <p className="field-help">
          {replying?.title.replace("评价 · ", "回复")}
        </p>
        <Form
          layout="vertical"
          onFinish={() => {
            if (replying)
              setGovernance((rows) =>
                rows.filter((row) => row.id !== replying.id),
              );
            setReplying(null);
            toast("回复已保存 · 仅当前页面演示");
          }}
          requiredMark={false}
        >
          <Form.Item
            label="回复内容"
            name="reply"
            rules={[{ required: true, message: "请输入回复内容" }]}
          >
            <AntInput.TextArea rows={5} placeholder="写给玩家的公开回复" />
          </Form.Item>
          <Button variant="primary" type="submit">
            保存回复
          </Button>
        </Form>
      </Modal>

      <Modal
        className="admin-antd-modal"
        getContainer={false}
        open={report !== null}
        onCancel={() => setReport(null)}
        footer={null}
        title={
          <>
            <p className="eyebrow">权限内只读查看</p>
            <span>匿名举报详情。</span>
          </>
        }
      >
        <div className="stack">
          <p style={{ margin: 0, color: "var(--fg-2)", fontSize: 14 }}>
            举报描述：现场服务节奏与预约前沟通不一致，希望店内核实当日带本记录。
          </p>
          <div className="notice admin-redacted" style={{ marginTop: 0 }}>
            举报人身份：已脱敏隐藏 · 当前前端演示不加载真实个人信息。
          </div>
          <Button variant="secondary" onClick={() => setReport(null)}>
            确认已阅读
          </Button>
        </div>
      </Modal>

      <Modal
        className="admin-antd-modal"
        getContainer={false}
        open={editingAsset !== null}
        onCancel={() => setEditingAsset(null)}
        footer={null}
        destroyOnHidden
        title={
          <>
            <p className="eyebrow">内容资产编辑</p>
            <span>更新展示信息。</span>
          </>
        }
      >
        <p className="field-help">
          {editingAsset && `${editingAsset.type}：${editingAsset.name}`}
        </p>
        <Form
          form={assetForm}
          layout="vertical"
          onFinish={saveAsset}
          requiredMark={false}
        >
          <Form.Item
            label="展示名称"
            name="name"
            rules={[{ required: true, message: "请输入展示名称" }]}
          >
            <AntInput placeholder="保持和店内称呼一致" />
          </Form.Item>
          <Form.Item label="上传图片">
            <AntInput type="file" accept="image/*" />
            <p className="field-help">
              原型仅演示上传入口，真实环境接入对象存储后再保存 URL。
            </p>
          </Form.Item>
          <Form.Item label="展示状态" name="visibility">
            <AntSelect
              options={["公开展示", "隐藏", "草稿"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>
          <Button variant="primary" type="submit">
            保存资产
          </Button>
        </Form>
      </Modal>
    </AdminFrame>
  );
}

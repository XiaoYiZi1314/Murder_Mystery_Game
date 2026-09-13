"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Table,
  Pagination,
  Select,
} from "antd";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { businessTime, isoToLocalInput } from "@/lib/booking-time";
import {
  useBookingCommand,
  type PageResult,
} from "@/features/booking/api-state";
import { stateLabels, type BookingRequestDto } from "@/features/booking/types";
import { AdminFrame, PageHead } from "./admin-shared";
import { SessionFields, type ScriptOption } from "./bookings/session-fields";
import "./content/content.css";
export function BookingRequests() {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState("pending"),
    [selected, setSelected] = useState<BookingRequestDto | null>(null),
    [decision, setDecision] = useState<"approve" | "reject">("approve"),
    [notice, setNotice] = useState(""),
    [form] = Form.useForm<Record<string, unknown>>();
  const command = useBookingCommand(),
    client = useQueryClient();
  const list = useQuery({
      queryKey: ["booking-requests", page, status],
      queryFn: () =>
        apiFetch<PageResult<BookingRequestDto>>(
          `/api/admin/sessions/pending?page=${page}&status=${status}`,
        ),
    }),
    options = useQuery({
      queryKey: ["session-options"],
      queryFn: () => apiFetch<ScriptOption[]>("/api/admin/sessions/options"),
    });
  function open(r: BookingRequestDto, d: "approve" | "reject") {
    command.clear();
    setSelected(r);
    setDecision(d);
    form.resetFields();
    const s = options.data?.find((x) => x.id === r.script_id);
    form.setFieldsValue({
      script_id: r.script_id,
      start_time: isoToLocalInput(r.expected_time),
      player_min: s?.player_min,
      player_max: s?.player_max,
      price: s?.price,
      backup_dm_ids: [],
    });
  }
  const review = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      if (!selected) return;
      const body =
        decision === "reject"
          ? { reason: v.reason }
          : {
              primary_dm_id: v.primary_dm_id,
              backup_dm_ids: v.backup_dm_ids,
              start_time: selected.expected_time,
              player_min: v.player_min,
              player_max: v.player_max,
              price: v.price,
            };
      return command.run(
        `/api/admin/booking-requests/${selected.id}/${decision}`,
        "POST",
        body,
      );
    },
    onSuccess: () => {
      setSelected(null);
      setNotice(
        decision === "approve"
          ? "审核通过，场次与团队报名已同时生成"
          : "已拒绝并通知申请人",
      );
      void client.invalidateQueries({ queryKey: ["booking-requests"] });
      void client.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e) => {
      if (e instanceof ApiClientError && e.fieldErrors)
        form.setFields(
          Object.entries(e.fieldErrors).map(([name, errors]) => ({
            name,
            errors,
          })),
        );
    },
  });
  return (
    <AdminFrame screen="admin-sessions" active="sessions">
      <PageHead
        eyebrow="B 端 / 自主预约"
        title="每一个想玩的故事，都认真回应。"
        lead="D01：审核通过即自动为申请人团队占坑。不得静默修改顾客申请时间。"
      />
      <section className="section">
        <div className="container">
          <nav className="content-nav">
            <Link href="/admin/sessions">返回排期</Link>
            <Link href="/admin/bookings">报名名单</Link>
          </nav>
          {notice && <Alert title={notice} />}
          <Select
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={["pending", "approved", "rejected"].map((s) => ({
              value: s,
              label: stateLabels[s],
            }))}
          />
          {list.error && (
            <Alert
              title={list.error.message}
              type="error"
              action={<Button onClick={() => void list.refetch()}>重试</Button>}
            />
          )}
          <div className="table-wrap">
            <Table
              rowKey="id"
              loading={list.isPending}
              pagination={false}
              dataSource={list.data?.items ?? []}
              scroll={{ x: 700 }}
              columns={[
                { title: "剧本", dataIndex: "script_title" },
                {
                  title: "期望时间（北京时间）",
                  render: (_, r: BookingRequestDto) =>
                    businessTime(r.expected_time),
                },
                { title: "团队人数", dataIndex: "player_count" },
                { title: "备注", dataIndex: "remark" },
                {
                  title: "状态",
                  render: (_, r: BookingRequestDto) => stateLabels[r.status],
                },
                {
                  title: "操作",
                  render: (_, r: BookingRequestDto) =>
                    r.status === "pending" ? (
                      <div className="content-nav">
                        <Button onClick={() => open(r, "approve")}>
                          审核通过
                        </Button>
                        <Button danger onClick={() => open(r, "reject")}>
                          拒绝
                        </Button>
                      </div>
                    ) : r.session_id ? (
                      <Link href={`/admin/bookings?session_id=${r.session_id}`}>
                        生成的报名
                      </Link>
                    ) : (
                      r.reason
                    ),
                },
              ]}
            />
          </div>
          <Pagination
            current={page}
            pageSize={12}
            total={list.data?.page_info.total ?? 0}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      </section>
      <Modal
        className="admin-antd-modal"
        getContainer={false}
        open={!!selected}
        onCancel={() => !command.pending && setSelected(null)}
        title={decision === "approve" ? "确认排期并自动占坑" : "拒绝申请"}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <p>
          {selected?.script_title} · 团队 {selected?.player_count} 人
        </p>
        {command.error && (
          <Alert
            title={command.error.message}
            type="error"
            action={
              <Button
                onClick={() => {
                  setSelected(null);
                  void list.refetch();
                }}
              >
                重新加载申请
              </Button>
            }
          />
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => review.mutate(v)}
          disabled={command.pending || command.uncertain}
        >
          {decision === "approve" ? (
            <SessionFields form={form} options={options.data ?? []} approval />
          ) : (
            <Form.Item
              name="reason"
              label="拒绝原因"
              rules={[{ required: true }]}
            >
              <Input.TextArea maxLength={500} />
            </Form.Item>
          )}
          <Button type="primary" htmlType="submit" loading={command.pending}>
            确认审核
          </Button>
        </Form>
        {command.uncertain && (
          <Button onClick={() => review.mutate(form.getFieldsValue())}>
            用原请求重试确认
          </Button>
        )}
      </Modal>
    </AdminFrame>
  );
}

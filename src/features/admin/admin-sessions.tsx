"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Form,
  Modal,
  Select,
  Table,
  Pagination,
  Popconfirm,
} from "antd";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import {
  businessTime,
  isoToLocalInput,
  localInputToIso,
} from "@/lib/booking-time";
import {
  useBookingCommand,
  type PageResult,
} from "@/features/booking/api-state";
import { stateLabels, type SessionDto } from "@/features/booking/types";
import { AdminFrame, PageHead } from "./admin-shared";
import { SessionFields, type ScriptOption } from "./bookings/session-fields";
import "./content/content.css";
export function AdminSessions() {
  const client = useQueryClient(),
    command = useBookingCommand(),
    [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [scriptFilter, setScriptFilter] = useState(""),
    [editing, setEditing] = useState<SessionDto | "new" | null>(null),
    [notice, setNotice] = useState("");
  const [form] = Form.useForm<Record<string, unknown>>();
  const list = useQuery({
    queryKey: ["sessions", page, status, scriptFilter],
    queryFn: () =>
      apiFetch<PageResult<SessionDto>>(
        `/api/admin/sessions?page=${page}&status=${status}&script_id=${scriptFilter}`,
      ),
  });
  const options = useQuery({
    queryKey: ["session-options"],
    queryFn: () => apiFetch<ScriptOption[]>("/api/admin/sessions/options"),
  });
  function open(row: SessionDto | "new") {
    command.clear();
    setEditing(row);
    form.resetFields();
    form.setFieldsValue(
      row === "new"
        ? { status: "draft", backup_dm_ids: [] }
        : { ...row, start_time: isoToLocalInput(row.start_time) },
    );
  }
  async function reload() {
    if (!editing || editing === "new") return;
    try {
      open(await apiFetch<SessionDto>(`/api/admin/sessions/${editing.id}`));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "重载失败");
    }
  }
  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (!editing) return;
      const body =
        editing !== "new" && editing.booked_count > 0
          ? {
              player_max: values.player_max,
              remark: values.remark,
              updated_at: editing.updated_at,
            }
          : {
              ...values,
              start_time:
                editing !== "new" &&
                String(values.start_time) ===
                  isoToLocalInput(editing.start_time)
                  ? editing.start_time
                  : localInputToIso(String(values.start_time)),
              ...(editing === "new" ? {} : { updated_at: editing.updated_at }),
            };
      return command.run(
        `/api/admin/sessions${editing === "new" ? "" : "/" + editing.id}`,
        editing === "new" ? "POST" : "PATCH",
        body,
      );
    },
    onSuccess: () => {
      setEditing(null);
      setNotice("场次已保存到数据库");
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
  async function cancel(s: SessionDto) {
    try {
      await command.run(`/api/admin/sessions/${s.id}`, "PATCH", {
        status: "cancelled",
        updated_at: s.updated_at,
      });
      setNotice("场次已取消，未涉及押金的报名已释放");
      await list.refetch();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "取消失败");
    }
  }
  return (
    <AdminFrame screen="admin-sessions" active="sessions">
      <PageHead
        eyebrow="B 端 / 排期"
        title="把每一场，安排清楚。"
        lead="已有报名仅可改备注与上限；满员不自动锁车。锁车、押金与履约操作在 C4 接入。"
      >
        <Button type="primary" onClick={() => open("new")}>
          新建场次
        </Button>
      </PageHead>
      <section className="section">
        <div className="container">
          <nav className="content-nav">
            <Link href="/admin/sessions/pending">自主预约审核</Link>
            <Link href="/admin/bookings">报名名单</Link>
          </nav>
          {notice && <Alert title={notice} closable />}
          <div className="content-nav">
            <Select
              aria-label="筛选场次状态"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "全部状态" },
                ...Object.keys(stateLabels)
                  .filter(
                    (s) =>
                      ![
                        "joined",
                        "jumped",
                        "pending",
                        "approved",
                        "rejected",
                      ].includes(s),
                  )
                  .map((s) => ({ value: s, label: stateLabels[s] })),
              ]}
            />
            <Select
              aria-label="筛选剧本"
              value={scriptFilter}
              onChange={(v) => {
                setScriptFilter(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "全部剧本" },
                ...(options.data ?? []).map((s) => ({
                  value: s.id,
                  label: s.title,
                })),
              ]}
            />
          </div>
          {list.error && (
            <Alert
              type="error"
              title={list.error.message}
              action={<Button onClick={() => void list.refetch()}>重试</Button>}
            />
          )}
          <div className="table-wrap">
            <Table
              rowKey="id"
              loading={list.isPending}
              pagination={false}
              dataSource={list.data?.items ?? []}
              columns={[
                { title: "剧本", render: (_, s: SessionDto) => s.script.title },
                {
                  title: "开始时间（北京时间）",
                  render: (_, s: SessionDto) => businessTime(s.start_time),
                },
                { title: "主 DM", dataIndex: "primary_dm_name" },
                {
                  title: "人数",
                  render: (_, s: SessionDto) =>
                    `${s.booked_count} / ${s.player_max}`,
                },
                {
                  title: "状态",
                  render: (_, s: SessionDto) => stateLabels[s.status],
                },
                {
                  title: "操作",
                  render: (_, s: SessionDto) => (
                    <div className="content-nav">
                      <Button
                        disabled={!["draft", "open", "full"].includes(s.status)}
                        onClick={() => open(s)}
                      >
                        编辑
                      </Button>
                      <Link href={`/admin/bookings?session_id=${s.id}`}>
                        名单
                      </Link>
                      {["draft", "open", "full"].includes(s.status) && (
                        <Popconfirm
                          title="取消整场并释放团队位置？涉及押金时服务端会拒绝。"
                          onConfirm={() => cancel(s)}
                        >
                          <Button danger disabled={command.pending}>
                            取消场次
                          </Button>
                        </Popconfirm>
                      )}
                    </div>
                  ),
                },
              ]}
              scroll={{ x: 900 }}
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
        open={editing !== null}
        title={editing === "new" ? "新建场次" : "编辑场次"}
        onCancel={() => !command.pending && setEditing(null)}
        footer={null}
        width={760}
        destroyOnHidden
      >
        {command.error && (
          <Alert
            type="error"
            title={command.error.message}
            action={
              command.error instanceof ApiClientError &&
              command.error.status === 409 ? (
                <Button onClick={() => void reload()}>
                  重新加载（放弃修改）
                </Button>
              ) : undefined
            }
          />
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => save.mutate(v)}
          disabled={command.pending || command.uncertain}
        >
          <SessionFields
            form={form}
            options={options.data ?? []}
            locked={!!editing && editing !== "new" && editing.booked_count > 0}
          />
          {(editing === "new" || (editing && editing.status === "draft")) && (
            <Form.Item name="status" label="状态">
              <Select
                options={[
                  { value: "draft", label: "草稿" },
                  { value: "open", label: "开放报名" },
                ]}
              />
            </Form.Item>
          )}
          <Button
            type="primary"
            htmlType="submit"
            disabled={command.pending}
            loading={command.pending}
          >
            保存场次
          </Button>
        </Form>
        {command.uncertain && (
          <Button onClick={() => save.mutate(form.getFieldsValue())}>
            用原请求重试确认
          </Button>
        )}
      </Modal>
    </AdminFrame>
  );
}

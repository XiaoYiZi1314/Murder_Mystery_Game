"use client";

import { useCallback, useEffect, useState } from "react";
import { Form, Input as AntInput, Modal, Select as AntSelect } from "antd";
import { Button, useToast } from "@/components/ui";
import { ApiClientError, apiFetch, errorMessage, getCsrfToken } from "@/lib/api/client";
import type { StaffDto } from "@/lib/api/contracts";
import { AdminFrame, EmptyState, PageHead, Segmented, StatusBadge } from "./admin-shared";

type RoleFilter = "all" | "dm" | "manager";
type StaffRole = "dm" | "manager";

interface CreateValues {
  phone: string;
  password: string;
  nickname: string;
  role: StaffRole;
}

interface EditValues {
  nickname: string;
  role: StaffRole;
  status: "active" | "disabled";
  new_password?: string;
}

const ROLE_LABEL: Record<string, string> = { dm: "DM", manager: "店员", boss: "店长" };
const STATUS_TONE: Record<string, "open" | "locked"> = { active: "open", disabled: "locked" };
const STATUS_LABEL: Record<string, string> = { active: "在职", disabled: "已禁用" };

function shortDate(iso: string): string {
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

export function AdminStaff() {
  const toast = useToast();
  const [rows, setRows] = useState<StaffDto[]>([]);
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [editing, setEditing] = useState<StaffDto | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [createForm] = Form.useForm<CreateValues>();
  const [editForm] = Form.useForm<EditValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<StaffDto[]>("/api/admin/staff");
      setRows(data);
      setDenied(false);
    } catch (error: unknown) {
      if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
        setDenied(true);
      } else {
        toast(errorMessage(error, "员工列表加载失败"));
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // 首屏加载走 promise 回调设状态（effect 内禁止同步 setState，见 react-hooks/set-state-in-effect）。
    let cancelled = false;
    apiFetch<StaffDto[]>("/api/admin/staff").then(
      (data) => {
        if (cancelled) return;
        setRows(data);
        setDenied(false);
        setLoading(false);
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
          setDenied(true);
        } else {
          toast(errorMessage(error, "员工列表加载失败"));
        }
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (editing) {
      editForm.setFieldsValue({
        nickname: editing.nickname,
        role: editing.role as StaffRole,
        status: editing.status,
        new_password: "",
      });
    }
  }, [editing, editForm]);

  async function withWrite<T>(fn: (csrf: string) => Promise<T>): Promise<T | null> {
    try {
      const csrf = await getCsrfToken();
      return await fn(csrf);
    } catch (error: unknown) {
      if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
        setDenied(true);
        return null;
      }
      toast(errorMessage(error, "操作失败，请稍后重试"));
      return null;
    }
  }

  async function submitCreate(values: CreateValues) {
    setCreateBusy(true);
    try {
      const created = await withWrite((csrf) =>
        apiFetch<StaffDto>("/api/admin/staff", {
          method: "POST",
          body: values,
          csrf,
          idempotencyKey: crypto.randomUUID(),
        }),
      );
      if (!created) return;
      toast(`已创建${ROLE_LABEL[created.role] ?? created.role} ${created.nickname}`);
      setCreateOpen(false);
      createForm.resetFields();
      await load();
    } finally {
      setCreateBusy(false);
    }
  }

  async function submitEdit(values: EditValues) {
    if (!editing) return;
    setEditBusy(true);
    try {
      const body: Record<string, unknown> = { nickname: values.nickname, role: values.role, status: values.status };
      if (values.new_password) body.new_password = values.new_password;
      const updated = await withWrite((csrf) =>
        apiFetch<StaffDto>(`/api/admin/staff/${editing.id}`, {
          method: "PATCH",
          body,
          csrf,
          idempotencyKey: crypto.randomUUID(),
        }),
      );
      if (!updated) return;
      toast(`已更新 ${updated.nickname}`);
      setEditing(null);
      await load();
    } finally {
      setEditBusy(false);
    }
  }

  async function toggleStatus(row: StaffDto) {
    const next = row.status === "active" ? "disabled" : "active";
    setActingId(row.id);
    try {
      const updated = await withWrite((csrf) =>
        apiFetch<StaffDto>(`/api/admin/staff/${row.id}`, {
          method: "PATCH",
          body: { status: next },
          csrf,
          idempotencyKey: crypto.randomUUID(),
        }),
      );
      if (!updated) return;
      toast(next === "disabled" ? `已禁用 ${row.nickname}（其会话已全部吊销）` : `已恢复 ${row.nickname}`);
      await load();
    } finally {
      setActingId(null);
    }
  }

  const visible = filter === "all" ? rows : rows.filter((row) => row.role === filter);

  return (
    <AdminFrame screen="staff" active="staff">
      <PageHead
        eyebrow="商家工作台 / 员工"
        title="员工管理"
        lead="DM 与店员账号由店长统一创建；禁用或改密会立即吊销该员工全部会话，所有操作写入审计日志。"
      >
        <Button variant="primary" onClick={() => setCreateOpen(true)} data-od-id="staff-create-open">
          新建员工
        </Button>
      </PageHead>
      <section className="section">
        <div className="container stack">
          {denied ? (
            <EmptyState title="仅店长可管理员工">
              <p>当前账号无后台权限，请用店长账号登录后再试。</p>
            </EmptyState>
          ) : (
            <>
              <Segmented<RoleFilter>
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: `全部（${rows.length}）` },
                  { value: "dm", label: "DM" },
                  { value: "manager", label: "店员" },
                ]}
              />
              {loading ? (
                <EmptyState title="正在加载…">
                  <p>正在读取员工列表。</p>
                </EmptyState>
              ) : visible.length === 0 ? (
                <EmptyState title="暂无员工">
                  <p>点击「新建员工」创建第一位 DM 或店员。</p>
                </EmptyState>
              ) : (
                <div className="stack">
                  {visible.map((row) => (
                    <div className="surface-card" key={row.id} data-od-id="staff-row">
                      <div className="row-between">
                        <div>
                          <p className="eyebrow">
                            {ROLE_LABEL[row.role] ?? row.role} · {row.phone}
                          </p>
                          <h3>{row.nickname}</h3>
                        </div>
                        <StatusBadge tone={STATUS_TONE[row.status] ?? "default"}>
                          {STATUS_LABEL[row.status] ?? row.status}
                        </StatusBadge>
                      </div>
                      <div className="row-between">
                        <span className="meta">
                          {row.dm_profile_id ? "已建 DM 档案" : "无 DM 档案"} · 创建于 {shortDate(row.created_at)}
                        </span>
                      </div>
                      <div className="row" style={{ marginTop: 12 }}>
                        <Button variant="secondary" type="button" onClick={() => setEditing(row)}>
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          type="button"
                          loading={actingId === row.id}
                          onClick={() => void toggleStatus(row)}
                        >
                          {row.status === "active" ? "禁用" : "恢复"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Modal title="新建员工" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null} destroyOnHidden>
        <Form<CreateValues> form={createForm} layout="vertical" onFinish={(v) => void submitCreate(v)}>
          <Form.Item
            label="手机号"
            name="phone"
            rules={[{ required: true, pattern: /^1[3-9]\d{9}$/, message: "请输入 11 位大陆手机号" }]}
          >
            <AntInput placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          <Form.Item label="初始密码" name="password" rules={[{ required: true, min: 6, message: "密码至少 6 位" }]}>
            <AntInput.Password placeholder="至少 6 位" maxLength={72} />
          </Form.Item>
          <Form.Item label="系统内昵称" name="nickname" rules={[{ required: true, max: 20, message: "昵称需为 1–20 个字符" }]}>
            <AntInput placeholder="例如：阿矚" maxLength={20} />
          </Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true, message: "请选择角色" }]}>
            <AntSelect
              placeholder="请选择"
              options={[
                { value: "dm", label: "DM（自动建档）" },
                { value: "manager", label: "店员" },
              ]}
            />
          </Form.Item>
          <div className="row" style={{ marginTop: 8 }}>
            <Button variant="primary" type="submit" loading={createBusy}>
              创建
            </Button>
            <Button variant="ghost" type="button" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title={editing ? `编辑 ${editing.nickname}` : "编辑员工"}
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        footer={null}
        destroyOnHidden
      >
        <Form<EditValues> form={editForm} layout="vertical" onFinish={(v) => void submitEdit(v)}>
          <Form.Item label="系统内昵称" name="nickname" rules={[{ required: true, max: 20, message: "昵称需为 1–20 个字符" }]}>
            <AntInput maxLength={20} />
          </Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true }]}>
            <AntSelect
              options={[
                { value: "dm", label: "DM" },
                { value: "manager", label: "店员" },
              ]}
            />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <AntSelect
              options={[
                { value: "active", label: "在职" },
                { value: "disabled", label: "禁用（立即吊销其会话）" },
              ]}
            />
          </Form.Item>
          <Form.Item label="重置密码（留空则不改）" name="new_password" rules={[{ min: 6, message: "密码至少 6 位" }]}>
            <AntInput.Password placeholder="留空则不修改" maxLength={72} />
          </Form.Item>
          <div className="row" style={{ marginTop: 8 }}>
            <Button variant="primary" type="submit" loading={editBusy}>
              保存
            </Button>
            <Button variant="ghost" type="button" onClick={() => setEditing(null)}>
              取消
            </Button>
          </div>
        </Form>
      </Modal>
    </AdminFrame>
  );
}

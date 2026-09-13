"use client";
import { Form, Input, InputNumber, Select, type FormInstance } from "antd";
import type { SessionOptionDto as ScriptOption } from "@/lib/api/contracts";
export type { SessionOptionDto as ScriptOption } from "@/lib/api/contracts";
export function SessionFields({
  form,
  options,
  locked = false,
  approval = false,
}: {
  form: FormInstance;
  options: ScriptOption[];
  locked?: boolean;
  approval?: boolean;
}) {
  const scriptId = Form.useWatch("script_id", form),
    script = options.find((s) => s.id === scriptId);
  const dms = script?.dms.map((d) => ({ label: d.name, value: d.id })) ?? [];
  return (
    <>
      <Form.Item name="script_id" label="剧本" rules={[{ required: true }]}>
        <Select
          disabled={locked || approval}
          options={options.map((s) => ({ label: s.title, value: s.id }))}
          showSearch
          optionFilterProp="label"
          onChange={(id) => {
            const s = options.find((x) => x.id === id);
            if (s)
              form.setFieldsValue({
                player_min: s.player_min,
                player_max: s.player_max,
                price: s.price,
                primary_dm_id: undefined,
                backup_dm_ids: [],
              });
          }}
        />
      </Form.Item>
      <Form.Item
        name="primary_dm_id"
        label="主 DM"
        rules={[{ required: true }]}
      >
        <Select disabled={locked} options={dms} />
      </Form.Item>
      <Form.Item name="backup_dm_ids" label="备选 DM">
        <Select disabled={locked} mode="multiple" options={dms} />
      </Form.Item>
      <Form.Item
        name="start_time"
        label="开始时间（北京时间）"
        rules={[{ required: true }]}
      >
        <Input type="datetime-local" disabled={locked || approval} />
      </Form.Item>
      <div className="form-grid">
        <Form.Item
          name="player_min"
          label="最低人数"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={100} disabled={locked} />
        </Form.Item>
        <Form.Item
          name="player_max"
          label="人数上限"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={script?.player_max ?? 100} />
        </Form.Item>
        <Form.Item
          name="price"
          label="每人价格（元）"
          rules={[{ required: true }]}
        >
          <InputNumber stringMode min="0" precision={2} disabled={locked} />
        </Form.Item>
      </div>
      {!approval && (
        <Form.Item name="remark" label="备注">
          <Input.TextArea maxLength={500} />
        </Form.Item>
      )}
    </>
  );
}

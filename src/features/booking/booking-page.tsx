"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Textarea, Field } from "@/components/ui";
import { Screen, SiteFooter } from "@/components/layout";
import { ApiClientError } from "@/lib/api/client";
import { localInputToIso } from "@/lib/booking-time";
import { CustomerHeader } from "./customer-header";
import { useBookingCommand } from "./api-state";
import "./booking.css";
type Script = {
  id: string;
  title: string;
  player_min: number;
  player_max: number;
};
export function BookingPage({
  scripts,
  contact,
  selectedId = "",
}: {
  scripts: Script[];
  contact: { name: string; phone: string };
  selectedId?: string;
}) {
  const router = useRouter(),
    command = useBookingCommand(),
    [selected, setSelected] = useState(selectedId || scripts[0]?.id || "");
  const script = scripts.find((s) => s.id === selected);
  const errors =
    command.error instanceof ApiClientError
      ? command.error.fieldErrors
      : undefined;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await command.run("/api/booking-requests", "POST", {
        script_id: selected,
        expected_time: localInputToIso(String(f.get("expected_time"))),
        player_count: Number(f.get("player_count")),
        remark: String(f.get("remark")),
      });
      router.push("/me/booking?submitted=1");
    } catch {}
  }
  return (
    <Screen name="booking">
      <CustomerHeader active="booking" />
      <main id="content">
        <section className="page-head">
          <div className="container">
            <p className="eyebrow">C 端 / 自主预约</p>
            <h1>把想玩的那一场，交给我们。</h1>
            <p className="lead">
              提交申请后等待门店审核，通过时自动为你的团队占坑。
            </p>
          </div>
        </section>
        <section className="section">
          <div className="container">
            <form
              className="surface-card c3-card c3-form"
              onSubmit={(e) => void submit(e)}
            >
              <fieldset
                className="c3-stack"
                disabled={command.pending || command.uncertain}
              >
                <Field
                  label="想玩的剧本"
                  htmlFor="request-script"
                  error={errors?.script_id?.[0]}
                >
                  <Select
                    id="request-script"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    required
                  >
                    {scripts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="期望开始时间（北京时间）"
                  htmlFor="request-time"
                  error={errors?.expected_time?.[0]}
                >
                  <Input
                    id="request-time"
                    name="expected_time"
                    type="datetime-local"
                    required
                  />
                </Field>
                <Field
                  label="团队人数"
                  htmlFor="request-count"
                  help={
                    script
                      ? `该剧本最多 ${script.player_max} 人，散客可申请等待其他人拼车。`
                      : undefined
                  }
                  error={errors?.player_count?.[0]}
                >
                  <Input
                    id="request-count"
                    name="player_count"
                    type="number"
                    min={1}
                    max={script?.player_max ?? 100}
                    defaultValue={1}
                    required
                  />
                </Field>
                <Field label="备注" htmlFor="request-remark">
                  <Textarea id="request-remark" name="remark" maxLength={500} />
                </Field>
              </fieldset>
              <p>
                联系人快照：{contact.name} · {contact.phone}
                。如有误，请先在个人资料中核对。
              </p>
              {command.error && (
                <p role="alert" className="c3-error">
                  {command.error.message}
                </p>
              )}
              <Button
                type="submit"
                disabled={command.pending || !scripts.length}
              >
                {command.pending
                  ? "提交中…"
                  : command.uncertain
                    ? "用原请求重试确认"
                    : "提交预约申请"}
              </Button>
              {!scripts.length && <p>暂无可预约的上架剧本。</p>}
            </form>
          </div>
        </section>
      </main>
      <SiteFooter>
        <span>十三雾 · 预约以门店审核结果为准</span>
      </SiteFooter>
    </Screen>
  );
}

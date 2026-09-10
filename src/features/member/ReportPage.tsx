"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { Button, Input, Select, Textarea, useToast } from "@/components/ui";
import { Screen, SiteFooter, SiteHeader } from "@/components/layout";

type ReportType = "dm_service" | "script_content";

const targets: Record<ReportType, string[]> = {
  dm_service: ["林深", "阿渡", "十三"],
  script_content: ["雾港来信", "长夜行", "金陵旧梦"],
};

export function ReportPage() {
  const [type, setType] = useState<ReportType>("dm_service");
  const [target, setTarget] = useState(targets.dm_service[0]);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function changeType(next: ReportType) {
    setType(next);
    setTarget(targets[next][0]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    setSubmitted(true);
    toast("已生成本地演示记录");
  }

  return (
    <Screen name="report">
      <SiteHeader mode="customer">
        <Button variant="secondary" href="/">
          返回首页
        </Button>
      </SiteHeader>
      <main id="content">
        <section className="page-head" data-od-id="report-head">
          <div className="container">
            <p className="eyebrow">C 端 / 举报</p>
            <h1 data-od-id="page-title">把不舒服的体验交给我们处理。</h1>
            <p className="lead">
              举报对外完全匿名，仅大 BOSS
              可查看举报人与真实信息。系统内不提供进度查询，店内会在线下处理。
            </p>
          </div>
        </section>
        <section className="section" data-od-id="report-form-section">
          <div className="container grid-2">
            <form
              className={`card form-grid${submitted ? " form-hidden" : ""}`}
              id="report-form"
              data-od-id="report-form"
              aria-hidden={submitted}
              onSubmit={submit}
            >
              <div>
                <p className="eyebrow">匿名反馈</p>
                <h2 data-od-id="report-form-heading">描述你遇到的情况。</h2>
              </div>
              <div className="field">
                <label htmlFor="report-type">举报类型</label>
                <Select
                  id="report-type"
                  data-od-id="report-type"
                  value={type}
                  onChange={(event) =>
                    changeType(event.target.value as ReportType)
                  }
                  required
                >
                  <option value="dm_service">DM 服务</option>
                  <option value="script_content">剧本内容</option>
                </Select>
              </div>
              <div className="field">
                <label htmlFor="report-target">被举报对象</label>
                <Select
                  id="report-target"
                  data-od-id="report-target"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  required
                >
                  {targets[type].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </div>
              <div className="field">
                <label htmlFor="report-content">具体描述</label>
                <Textarea
                  id="report-content"
                  data-od-id="report-content"
                  placeholder="请描述发生了什么，避免填写与事件无关的隐私信息"
                  required
                />
                <p className="field-help">
                  提交后不会在页面展示，也不会向被举报对象透露你的身份。
                </p>
              </div>
              <div className="field">
                <label htmlFor="report-image">附加截图（选填）</label>
                <Input
                  id="report-image"
                  data-od-id="report-image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
                <p className="field-help">
                  可在本页预览所选图片，文件不会上传。
                </p>
                {preview ? (
                  <Image
                    className="report-preview"
                    src={preview}
                    alt="所选投诉截图预览"
                    width={640}
                    height={360}
                    unoptimized
                    style={{
                      width: "100%",
                      height: "auto",
                      maxHeight: 220,
                      objectFit: "contain",
                    }}
                  />
                ) : null}
              </div>
              <div className="row-between">
                <span className="field-help">
                  仅大 BOSS 可查看真实举报人信息。
                </span>
                <Button
                  variant="primary"
                  type="submit"
                  data-od-id="report-submit"
                >
                  提交匿名举报
                </Button>
              </div>
            </form>

            <aside className="privacy-panel" data-od-id="report-privacy">
              <p className="eyebrow" style={{ color: "var(--bg)" }}>
                只给一个人看
              </p>
              <h2 data-od-id="privacy-heading">对外匿名，内部可追溯。</h2>
              <p>
                举报内容会记录对象、描述、时间与附加图片。只有大 BOSS
                可以在后台联表查看举报人真实信息，其他角色无权限。
              </p>
              <div className="privacy-list">
                <div className="privacy-item">
                  <strong>DM 服务</strong>
                  <span>服务态度、带本过程或现场体验问题。</span>
                </div>
                <div className="privacy-item">
                  <strong>剧本内容</strong>
                  <span>剧本展示、内容标注或非剧透信息问题。</span>
                </div>
                <div className="privacy-item">
                  <strong>处理方式</strong>
                  <span>系统只接收反馈，店内线下处理，不展示进度。</span>
                </div>
              </div>
            </aside>

            <div
              className={`success${submitted ? " is-visible" : ""}`}
              id="report-success"
              data-od-id="report-success"
              aria-hidden={!submitted}
            >
              <div className="success-mark">演示</div>
              <h2>本地演示记录已生成。</h2>
              <p>
                这条记录只存在于当前页面的临时状态，不会上传或发送给店内，也不会触发线下处理。
              </p>
              <Button
                variant="secondary"
                href="/"
                data-od-id="report-back-home"
              >
                返回首页
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter meta="举报仅由大 BOSS 查看 · 杭州" />
    </Screen>
  );
}

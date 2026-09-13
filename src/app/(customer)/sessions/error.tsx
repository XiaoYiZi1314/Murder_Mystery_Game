"use client";
import { Button } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container section">
      <h1>暂时无法加载预约资料</h1>
      <p>请检查筛选参数或稍后重试。</p>
      <Button onClick={reset}>重新加载</Button>
    </main>
  );
}

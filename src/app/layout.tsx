import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import "@/styles/globals.css";
import "@/components/ui/ui.css";

export const metadata: Metadata = {
  title: { default: "十三雾 · 一起开本", template: "%s · 十三雾" },
  description: "十三雾剧本杀体验，选一本想玩的故事，约上同频的人。",
  applicationName: "十三雾",
  appleWebApp: { capable: true, title: "十三雾", statusBarStyle: "default" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d1d1f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

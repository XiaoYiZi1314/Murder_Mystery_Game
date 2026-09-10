import type { ReactNode } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AdminProviders } from "@/features/admin/admin-providers";
import "@/features/admin/admin-enhancements.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AntdRegistry>
      <AdminProviders>{children}</AdminProviders>
    </AntdRegistry>
  );
}

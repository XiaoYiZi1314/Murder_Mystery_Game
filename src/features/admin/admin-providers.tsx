"use client";

import { useState, type ReactNode } from "react";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function AdminProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#0071e3",
            colorText: "#1d1d1f",
            colorBgLayout: "#f5f5f7",
            borderRadius: 8,
            fontFamily:
              '"SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif',
          },
          components: {
            Modal: { borderRadiusLG: 18 },
            Form: { labelColor: "#6e6e73" },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </QueryClientProvider>
  );
}

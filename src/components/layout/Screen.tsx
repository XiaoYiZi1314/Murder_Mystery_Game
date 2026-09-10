import type { HTMLAttributes } from "react";
import { ToastOutlet } from "@/components/ui/Toast";

export function Screen({
  name,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { name: string }) {
  return (
    <div {...props} data-screen={name}>
      {children}
      <ToastOutlet
        variant={
          name === "index" || name === "shisanwu-landing" ? "home" : "app"
        }
      />
    </div>
  );
}

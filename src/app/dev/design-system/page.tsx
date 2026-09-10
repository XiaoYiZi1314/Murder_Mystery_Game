import { notFound } from "next/navigation";
import { DesignSystemLoader } from "@/features/dev/design-system/DesignSystemLoader";
import "@/features/dev/design-system/preview.css";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DesignSystemLoader />;
}

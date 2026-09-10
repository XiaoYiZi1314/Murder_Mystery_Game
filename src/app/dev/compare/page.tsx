import { notFound } from "next/navigation";
import { ViewportCompare } from "@/features/dev/ViewportCompare";

export default function ComparePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ViewportCompare />;
}

export type {
  SessionDto,
  BookingDto,
  BookingRequestDto,
} from "@/lib/api/contracts";
export const stateLabels: Record<string, string> = {
  draft: "草稿",
  open: "开放报名",
  full: "满员（未锁车）",
  locked: "已锁车",
  running: "开本中",
  finished: "已完成",
  cancelled: "已取消",
  jumped: "已跳车",
  joined: "已报名",
  pending: "待审核",
  approved: "已通过并占坑",
  rejected: "未通过",
};

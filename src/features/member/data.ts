export type LedgerKind = "topup" | "spend" | "points" | "deposit" | "gift";

export type LedgerEntry = {
  id: string;
  date: string;
  kinds: LedgerKind[];
  label: string;
  subject: string;
  detail: string;
  summaryDetail: string;
  source: string;
  amount: string;
  points: string;
};

export const ledgerEntries: LedgerEntry[] = [
  {
    id: "topup-june-02",
    date: "06 月 02 日",
    kinds: ["topup"],
    label: "充值",
    subject: "储值充值",
    detail: "店内录入",
    summaryDetail: "店内录入",
    source: "店内录入",
    amount: "+¥500.00",
    points: "—",
  },
  {
    id: "spend-may-24",
    date: "05 月 24 日",
    kinds: ["spend", "points"],
    label: "消费",
    subject: "雾港来信消费",
    detail: "剧本场次结算",
    summaryDetail: "余额支付",
    source: "余额支付",
    amount: "-¥268.00",
    points: "+268",
  },
];

export type PlayedScript = {
  id: "wugang-laixin" | "changye-xing" | "jinling-jiumeng";
  name: string;
  image?: string;
  imageAlt: string;
};

export const playedScripts: Record<PlayedScript["id"], PlayedScript> = {
  "wugang-laixin": {
    id: "wugang-laixin",
    name: "雾港来信",
    image: "/assets/wugang-laixin-cover.svg",
    imageAlt: "《雾港来信》剧本封面：雾夜港口与一封旧信",
  },
  "changye-xing": {
    id: "changye-xing",
    name: "长夜行",
    imageAlt: "《长夜行》封面待上传",
  },
  "jinling-jiumeng": {
    id: "jinling-jiumeng",
    name: "金陵旧梦",
    imageAlt: "《金陵旧梦》封面待上传",
  },
};

export type ReviewKind = "script" | "dm";

export type MemberReview = {
  id: string;
  kind: ReviewKind;
  mark: string;
  subject: string;
  text: string;
  date: string;
  reply?: string;
};

export const initialReviews: MemberReview[] = [
  {
    id: "wugang-laixin",
    kind: "script",
    mark: "雾",
    subject: "雾港来信",
    text: "最后一幕结束的时候，大家都没有马上说话。喜欢这种把情绪留在桌上的本。",
    date: "06 月 10 日 · 公开展示",
  },
  {
    id: "lin-shen",
    kind: "dm",
    mark: "林",
    subject: "林深",
    text: "第一次玩情感本，DM 带得很稳，角色信息给得清楚，适合朋友一起入门。",
    date: "06 月 08 日 · 公开展示",
    reply: "林深回复：谢谢你把第一次留给雾港，希望下次还在故事里见。",
  },
];

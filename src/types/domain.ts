export type Id = string;
export type IsoDateTime = string;
export type MoneyAmount = string;

export type UserRole = "customer" | "dm" | "manager" | "boss";
export type UserStatus = "active" | "disabled";

// C2：内容三态（T1 迁移 content-media）。draft 对顾客不可见；on=上架；off=下架。
export type ScriptStatus = "draft" | "on" | "off";
export type CostumeStatus = "draft" | "on" | "off";
export type DmStatus = "active" | "inactive";
export type ScriptSort = "latest" | "price_asc" | "price_desc" | "rating";
// C2 设置键（白名单；权限见 src/server/auth/permissions.ts 的 settings.write）。
export type SettingKey = "wechat_qrcode" | "notify_push_enabled";

// C1 仅声明契约（共享协议 §5），实体表随 C3 迁移。
export type GameSessionStatus =
  | "draft"
  | "open"
  | "full"
  | "locked"
  | "running"
  | "finished"
  | "cancelled";
export type BookingStatus = "joined" | "locked" | "finished" | "cancelled" | "jumped";
export type BookingRequestStatus = "pending" | "approved" | "rejected";

export interface MemberLevel {
  id: Id;
  code: string;
  name: string;
  rank: number;
  topupThreshold: MoneyAmount;
  discountRate: string;
  benefits: string[];
}

export interface UserSummary {
  id: Id;
  phone: string;
  nickname: string;
  role: UserRole;
  status: UserStatus;
  balance: MoneyAmount;
  points: number;
  totalTopup: MoneyAmount;
  memberLevel: MemberLevel | null;
}

// ---------- C2 内容域（domain 词汇；wire 契约见 src/lib/api/contracts.ts） ----------

export interface ScriptCharacter {
  id: Id;
  name: string;
  imageUrl: string | null;
  bio: string | null;
  sort: number;
}

export interface ScriptSummary {
  id: Id;
  slug: string;
  title: string;
  coverUrl: string;
  tagline: string | null;
  durationMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  pricePerPlayer: MoneyAmount;
  status: ScriptStatus;
  featured: boolean;
  reviewCount: number;
  avgRating: string | null;
  /** 关联标签名（有序）。 */
  tags: string[];
}

export interface ScriptDetail extends ScriptSummary {
  synopsis: string;
  updatedAt: IsoDateTime;
  /** 按 sort 升序。 */
  characters: ScriptCharacter[];
  dms: DmSummary[];
  costumes: CostumeSummary[];
}

export interface DmSummary {
  id: Id;
  /** 展示名 = 用户昵称。 */
  nickname: string;
  avatarUrl: string | null;
  photoUrl: string | null;
  bio: string | null;
  rating: string | null;
  specialtyTags: string[];
  status: DmStatus;
}

export interface CostumeSummary {
  id: Id;
  name: string;
  coverUrl: string;
  /** 已审核站内 URL 数组（首张即封面）。 */
  images: string[];
  description: string | null;
  status: CostumeStatus;
}

export interface CostumeDetail extends CostumeSummary {
  /** 双向关联：引用该妆造的剧本（公开投影）。 */
  scripts: { id: Id; title: string; slug: string }[];
}

export interface DmDetail extends DmSummary {
  /** 双向关联：该 DM 带过的剧本（公开投影）。 */
  scripts: { id: Id; title: string; slug: string }[];
}

export interface Tag {
  id: Id;
  name: string;
  usageCount: number;
}

export interface PublicSettings {
  wechatQrcode: string | null;
  notifyPushEnabled: boolean;
  /** 精选推荐唯一来源：scripts.featured && status=on 的派生视图。 */
  featuredScriptIds: Id[];
}

// ---------- C1/C3 预约域（原样保留） ----------

export interface GameSession {
  id: Id;
  script: ScriptSummary;
  dm: DmSummary | null;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  roomName: string;
  capacity: number;
  bookedSeats: number;
  status: GameSessionStatus;
}

export interface Booking {
  id: Id;
  bookingNo: string;
  userId: Id;
  session: GameSession;
  playerCount: number;
  totalAmount: MoneyAmount;
  status: BookingStatus;
  note: string | null;
  createdAt: IsoDateTime;
}

export interface GiftDisplayItem {
  id: Id;
  name: string;
  imageUrl: string;
  pointsRequired: number;
  stockLabel: string;
  redemptionNotice: string;
}

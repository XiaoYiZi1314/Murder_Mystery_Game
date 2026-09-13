export type Id = string;
export type IsoDateTime = string;
export type MoneyAmount = string;

export type UserRole = "customer" | "dm" | "manager" | "boss";
export type UserStatus = "active" | "disabled";
export type ScriptDifficulty = "beginner" | "intermediate" | "advanced";
export type ScriptStatus = "draft" | "published" | "archived";
export type CostumeStatus = "available" | "maintenance" | "retired";
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

export interface ScriptSummary {
  id: Id;
  slug: string;
  title: string;
  coverUrl: string;
  tagline: string | null;
  durationMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  difficulty: ScriptDifficulty;
  pricePerPlayer: MoneyAmount;
  status: ScriptStatus;
  tags: string[];
}

export interface ScriptDetail extends ScriptSummary {
  synopsis: string;
  costumeIds: Id[];
}

export interface DmSummary {
  id: Id;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  rating: string | null;
}

export interface CostumeSummary {
  id: Id;
  name: string;
  imageUrl: string;
  description: string | null;
  stockTotal: number;
  stockAvailable: number;
  status: CostumeStatus;
}

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

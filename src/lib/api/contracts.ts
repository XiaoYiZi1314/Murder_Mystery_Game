import type { Id, IsoDateTime, MoneyAmount, UserRole, UserStatus } from "@/types/domain";

/**
 * C1 统一 API 契约：REST `/api` + `{ code, message, data }`。
 * wire 字段一律 snake_case；UI 侧用显式适配转 camelCase。
 * 旧 `/api/v1` + `{ ok, error }` 草约已删除，不保留并行服务。
 */

// ---------- 统一响应 ----------

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T | null;
  field_errors?: Record<string, string[]>;
}

export const ApiCodes = {
  OK: 0,
  INVALID_INPUT: 1001,
  CSRF_INVALID: 1002,
  ORIGIN_REJECTED: 1003,
  NOT_FOUND: 1004,
  UNAUTHENTICATED: 2001,
  FORBIDDEN: 2002,
  RATE_LIMITED: 2003,
  INVALID_CREDENTIALS: 2004,
  CONFLICT: 3001,
  PHONE_TAKEN: 3101,
  IDEMPOTENT_CONFLICT: 3201,
  INTERNAL: 5000,
} as const;

export type ApiCode = (typeof ApiCodes)[keyof typeof ApiCodes];

// ---------- wire DTO（snake_case） ----------

export interface MemberLevelDto {
  id: Id;
  code: string;
  name: string;
  rank: number;
  topup_threshold: MoneyAmount;
  discount_rate: string;
}

/** 本人资料：资金/积分均为只读展示字段，永不经 PATCH /api/me 修改。 */
export interface MeDto {
  id: Id;
  phone: string;
  nickname: string;
  role: UserRole;
  status: UserStatus;
  balance: MoneyAmount;
  points: number;
  total_topup: MoneyAmount;
  member_level: MemberLevelDto | null;
  created_at: IsoDateTime;
}

/** 员工行：绝不含 password_hash。 */
export interface StaffDto {
  id: Id;
  phone: string;
  nickname: string;
  role: UserRole;
  status: UserStatus;
  member_level_id: Id | null;
  dm_profile_id: Id | null;
  created_at: IsoDateTime;
}

export interface PageInfoDto {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PaginatedDto<T> {
  items: T[];
  page_info: PageInfoDto;
}

// ---------- C1 请求体 ----------

export interface RegisterRequest {
  phone: string;
  password: string;
  nickname: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface UpdateMeRequest {
  nickname?: string;
}

export interface CreateStaffRequest {
  phone: string;
  password: string;
  nickname: string;
  role: Extract<UserRole, "dm" | "manager">;
}

export interface UpdateStaffRequest {
  nickname?: string;
  role?: Extract<UserRole, "dm" | "manager">;
  status?: UserStatus;
  new_password?: string;
}

export interface StaffQuery {
  role?: Extract<UserRole, "dm" | "manager" | "boss">;
}

export interface ApiContracts {
  "POST /api/auth/register": {
    body: RegisterRequest;
    response: ApiResponse<MeDto>;
  };
  "POST /api/auth/login": {
    body: LoginRequest;
    response: ApiResponse<MeDto>;
  };
  "POST /api/auth/logout": {
    body: undefined;
    response: ApiResponse<{ signed_out: true }>;
  };
  "GET /api/auth/csrf": {
    query: undefined;
    response: ApiResponse<{ csrf_token: string }>;
  };
  "GET /api/me": {
    query: undefined;
    response: ApiResponse<MeDto>;
  };
  "PATCH /api/me": {
    body: UpdateMeRequest;
    response: ApiResponse<MeDto>;
  };
  "GET /api/admin/staff": {
    query: StaffQuery;
    response: ApiResponse<StaffDto[]>;
  };
  "POST /api/admin/staff": {
    body: CreateStaffRequest;
    response: ApiResponse<StaffDto>;
  };
  "PATCH /api/admin/staff/:id": {
    params: { id: Id };
    body: UpdateStaffRequest;
    response: ApiResponse<StaffDto>;
  };
}

export type ApiRoute = keyof ApiContracts;

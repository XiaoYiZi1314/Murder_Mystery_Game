import type {
  CostumeStatus,
  DmStatus,
  Id,
  IsoDateTime,
  MoneyAmount,
  ScriptSort,
  ScriptStatus,
  UserRole,
  UserStatus,
} from "@/types/domain";

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
  // C2：引用/并发冲突细分（均为 409，便于 UI 差异化提示）。
  TAG_IN_USE: 3002,
  COSTUME_IN_USE: 3003,
  SCRIPT_IN_USE: 3004,
  STALE_UPDATE: 3005,
  INTERNAL: 5000,
} as const;

export type ApiCode = (typeof ApiCodes)[keyof typeof ApiCodes];

// ---------- C1 wire DTO（snake_case） ----------

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
// ---------- C2 内容域 wire DTO（snake_case） ----------

/** 剧本公开列表项。金额固定两位小数字符串；无评价时 review_count=0、avg_rating=null（不伪造）。 */
export interface ScriptSummaryDto {
  thumbnail?: string;
  id: Id;
  slug: string;
  title: string;
  cover: string;
  tagline: string | null;
  duration_minutes: number;
  player_min: number;
  player_max: number;
  price: MoneyAmount;
  status: ScriptStatus;
  featured: boolean;
  review_count: number;
  avg_rating: string | null;
  /** 关联标签名。 */
  tags: string[];
}

export interface ScriptCharacterDto {
  id: Id;
  name: string;
  image: string | null;
  bio: string | null;
  sort: number;
}

/** DM 公开投影：绝无 phone/role/status。 */
export interface DmPublicDto {
  slug?: string | null;
  id: Id;
  /** 展示名=用户昵称。 */
  name: string;
  avatar: string | null;
  photo: string | null;
  bio: string | null;
  specialty_tags: string[];
  rating: string | null;
}

export interface CostumeSummaryDto {
  slug?: string | null;
  id: Id;
  name: string;
  cover: string;
  description: string | null;
  status: CostumeStatus;
}

export interface ScriptRefDto {
  id: Id;
  title: string;
  slug: string;
}

export interface CostumeDetailDto extends CostumeSummaryDto {
  updated_at: IsoDateTime;
  images: string[];
  /** 双向关联：引用该妆造的剧本（顾客视角仅 on 剧本）。 */
  scripts: ScriptRefDto[];
}

export interface DmDetailDto extends DmPublicDto {
  updated_at: IsoDateTime;
  tag_ids: Id[];
  /** 双向关联：该 DM 会带的剧本（不代表实际履约历史）（顾客视角仅 on 剧本）。 */
  scripts: ScriptRefDto[];
}

export interface ScriptDetailDto extends ScriptSummaryDto {
  tag_ids: Id[];
  synopsis: string;
  updated_at: IsoDateTime;
  /** 按 sort 升序。 */
  characters: ScriptCharacterDto[];
  dms: DmPublicDto[];
  costumes: CostumeSummaryDto[];
}

export interface TagDto {
  updated_at: IsoDateTime;
  id: Id;
  name: string;
  usage_count: number;
}

/** 公开设置视图：featured_script_ids 只读派生自 scripts.featured（唯一来源，无双写）。 */
export interface PublicSettingsDto {
  wechat_qrcode: string | null;
  featured_script_ids: Id[];
}

// ---------- C2 请求体 ----------

export interface ScriptQuery {
  tag?: string;
  featured?: boolean;
  q?: string;
  sort?: ScriptSort;
  page?: number;
  page_size?: number;
}

export interface ScriptCharacterInput {
  /** 缺省=新建；提供时必须属于当前剧本。 */
  id?: Id;
  name: string;
  image?: string;
  bio?: string;
  sort?: number;
}

export interface ScriptSaveRequest {
  title: string;
  slug?: string;
  cover: string;
  tagline?: string;
  synopsis: string;
  duration_minutes: number;
  player_min: number;
  player_max: number;
  price: MoneyAmount;
  status: ScriptStatus;
  featured?: boolean;
  tag_ids?: Id[];
  dm_ids?: Id[];
  costume_ids?: Id[];
  /** 提供时整体替换角色集合（含重排）。 */
  characters?: ScriptCharacterInput[];
}

/** PATCH：仅出现的键生效；关联数组出现即整体替换；updated_at 提供即启用条件更新（陈旧 409）。 */
export interface ScriptUpdateRequest {
  title?: string;
  slug?: string;
  cover?: string;
  tagline?: string;
  synopsis?: string;
  duration_minutes?: number;
  player_min?: number;
  player_max?: number;
  price?: MoneyAmount;
  status?: ScriptStatus;
  featured?: boolean;
  tag_ids?: Id[];
  dm_ids?: Id[];
  costume_ids?: Id[];
  characters?: ScriptCharacterInput[];
  updated_at: IsoDateTime;
}

export interface CostumeSaveRequest {
  slug?: string;
  script_ids?: Id[];
  name: string;
  cover: string;
  images?: string[];
  description?: string;
  status?: CostumeStatus;
}

export interface CostumeUpdateRequest {
  slug?: string;
  script_ids?: Id[];
  name?: string;
  cover?: string;
  images?: string[];
  description?: string;
  status?: CostumeStatus;
  updated_at: IsoDateTime;
}

/** DM 展示信息自改（bio/avatar/photo/tag_ids）；status 仅 manager+boss 可写。 */
export interface DmUpdateRequest {
  name?: string;
  slug?: string;
  bio?: string;
  avatar?: string;
  photo?: string;
  tag_ids?: Id[];
  status?: DmStatus;
  updated_at: IsoDateTime;
}

export interface TagCreateRequest {
  name: string;
}

export interface TagUpdateRequest {
  updated_at: IsoDateTime;
  name: string;
}

/** 逐键白名单（D11）：只接受已知设置键，未知键 422。 */
export interface UpdateSettingsRequest {
  versions: Record<"wechat_qrcode" | "notify_push_enabled", IsoDateTime | null>;
  wechat_qrcode?: string | null;
  notify_push_enabled?: boolean;
}

// ---------- 路由契约 ----------

interface C1Routes {
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

export interface AdminSettingsDto {
  wechat_qrcode: string | null;
  notify_push_enabled: boolean;
  versions: Record<string, IsoDateTime | null>;
}
export interface MediaAssetDto {
  id: Id;
  url: string;
  thumbnail_url: string | null;
  visibility: "public" | "private";
  width: number | null;
  height: number | null;
  bytes: number;
  format: string;
}
export type UploadPurpose =
  | "script_cover"
  | "script_character"
  | "costume"
  | "dm_photo"
  | "wechat_qrcode"
  | "report_evidence";
interface C2Routes {
  "POST /api/uploads": {
    body: { file: File; purpose: UploadPurpose };
    response: ApiResponse<MediaAssetDto>;
  };
  "GET /api/media/:id": { params: { id: Id }; response: ArrayBuffer };
  "GET /api/admin/scripts/:id": {
    params: { id: Id };
    response: ApiResponse<ScriptDetailDto>;
  };
  "GET /api/admin/costumes/:id": {
    params: { id: Id };
    response: ApiResponse<CostumeDetailDto>;
  };
  "GET /api/admin/dms/:id": {
    params: { id: Id };
    response: ApiResponse<DmDetailDto & { status: string }>;
  };
  "GET /api/admin/settings": { response: ApiResponse<AdminSettingsDto> };
  "GET /api/scripts": {
    query: ScriptQuery;
    response: ApiResponse<PaginatedDto<ScriptSummaryDto>>;
  };
  "GET /api/scripts/:id": {
    params: { id: string };
    response: ApiResponse<ScriptDetailDto>;
  };
  "GET /api/costumes": {
    query: ScriptQuery;
    response: ApiResponse<PaginatedDto<CostumeSummaryDto>>;
  };
  "GET /api/costumes/:id": {
    params: { id: Id };
    response: ApiResponse<CostumeDetailDto>;
  };
  "GET /api/dms": {
    query: ScriptQuery;
    response: ApiResponse<PaginatedDto<DmPublicDto>>;
  };
  "GET /api/dms/:id": {
    params: { id: Id };
    response: ApiResponse<DmDetailDto>;
  };
  "GET /api/settings/public": {
    query: undefined;
    response: ApiResponse<PublicSettingsDto>;
  };
  "GET /api/admin/scripts": {
    query: ScriptQuery;
    response: ApiResponse<PaginatedDto<ScriptSummaryDto>>;
  };
  "POST /api/admin/scripts": {
    body: ScriptSaveRequest;
    response: ApiResponse<ScriptDetailDto>;
  };
  "PATCH /api/admin/scripts/:id": {
    params: { id: Id };
    body: ScriptUpdateRequest;
    response: ApiResponse<ScriptDetailDto>;
  };
  "DELETE /api/admin/scripts/:id": {
    params: { id: Id };
    response: ApiResponse<{ deleted: Id }>;
  };
  "GET /api/admin/costumes": {
    query: ScriptQuery;
    response: ApiResponse<PaginatedDto<CostumeSummaryDto>>;
  };
  "POST /api/admin/costumes": {
    body: CostumeSaveRequest;
    response: ApiResponse<CostumeDetailDto>;
  };
  "PATCH /api/admin/costumes/:id": {
    params: { id: Id };
    body: CostumeUpdateRequest;
    response: ApiResponse<CostumeDetailDto>;
  };
  "DELETE /api/admin/costumes/:id": {
    params: { id: Id };
    response: ApiResponse<{ deleted: Id }>;
  };
  "GET /api/admin/dms": {
    query: ScriptQuery;
    response: ApiResponse<PaginatedDto<DmPublicDto>>;
  };
  "PATCH /api/admin/dms/:id": {
    params: { id: Id };
    body: DmUpdateRequest;
    response: ApiResponse<DmPublicDto>;
  };
  "GET /api/admin/tags": { query: undefined; response: ApiResponse<TagDto[]> };
  "POST /api/admin/tags": {
    body: TagCreateRequest;
    response: ApiResponse<TagDto>;
  };
  "PATCH /api/admin/tags/:id": {
    params: { id: Id };
    body: TagUpdateRequest;
    response: ApiResponse<TagDto>;
  };
  "DELETE /api/admin/tags/:id": {
    params: { id: Id };
    response: ApiResponse<{ deleted: Id }>;
  };
  "PUT /api/admin/settings": {
    body: UpdateSettingsRequest;
    response: ApiResponse<{ saved: true }>;
  };
}

export type ApiContracts = C1Routes & C2Routes & C3Routes;

export type ApiRoute = keyof ApiContracts;

// C3 executable wire projections. Public SessionDto deliberately excludes contacts/user IDs.
export interface SessionDto {
  id: string;
  script_id: string;
  script: { id: string; slug: string; title: string; cover: string };
  primary_dm_id: string | null;
  primary_dm_name: string | null;
  backup_dm_ids: string[];
  start_time: string;
  player_min: number;
  player_max: number;
  booked_count: number;
  remaining_count: number;
  needed_count: number;
  price: string;
  status: import("@/types/domain").GameSessionStatus;
  source: string;
  remark: string | null;
  updated_at: string;
}
export interface BookingDto {
  id: string;
  session_id: string;
  player_count: number;
  contact: { name: string; phone: string };
  status: import("@/types/domain").BookingStatus;
  total_amount: string;
  cancelled_at: string | null;
  remaining_count: number;
  session: SessionDto;
}
export interface BookingRequestDto {
  id: string;
  script_id: string;
  script_title: string;
  expected_time: string;
  player_count: number;
  remark: string | null;
  status: import("@/types/domain").BookingRequestStatus;
  reason: string | null;
  session_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}
export interface SessionWriteRequest {
  script_id: string;
  primary_dm_id: string;
  backup_dm_ids?: string[];
  start_time: string;
  player_min?: number;
  player_max?: number;
  price?: string;
  remark?: string;
  status?: "draft" | "open";
}
export interface JoinSessionRequest {
  player_count: number;
  contact: { name: string; phone: string };
}
export interface SubmitBookingRequest {
  script_id: string;
  expected_time: string;
  player_count: number;
  remark?: string;
}

export interface SessionQuery {
  status?: import("@/types/domain").GameSessionStatus;
  range?: "weekend" | "next";
  script_id?: Id;
  from?: IsoDateTime;
  to?: IsoDateTime;
  page?: number;
  page_size?: number;
}
export interface BookingQuery {
  session_id?: Id;
  status?: import("@/types/domain").BookingStatus;
  page?: number;
  page_size?: number;
}
export interface ApproveBookingRequest {
  primary_dm_id: Id;
  backup_dm_ids?: Id[];
  start_time: IsoDateTime;
  player_min: number;
  player_max: number;
  price: MoneyAmount;
}
export interface NotificationDto {
  id: Id;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read_at: IsoDateTime | null;
  created_at: IsoDateTime;
}
export interface NotificationListDto extends PaginatedDto<NotificationDto> {
  unread_count: number;
}
export interface SessionOptionDto {
  id: Id;
  title: string;
  player_min: number;
  player_max: number;
  price: MoneyAmount;
  dms: { id: Id; name: string }[];
}
interface C3Routes {
  "GET /api/sessions": {
    query: SessionQuery;
    response: ApiResponse<PaginatedDto<SessionDto>>;
  };
  "GET /api/admin/sessions": {
    query: SessionQuery;
    response: ApiResponse<PaginatedDto<SessionDto>>;
  };
  "GET /api/admin/sessions/:id": {
    params: { id: Id };
    response: ApiResponse<SessionDto>;
  };
  "POST /api/admin/sessions": {
    body: SessionWriteRequest;
    response: ApiResponse<SessionDto>;
  };
  "PATCH /api/admin/sessions/:id": {
    params: { id: Id };
    body: Partial<Omit<SessionWriteRequest, "status">> & {
      updated_at: IsoDateTime;
      status?: "draft" | "open" | "cancelled";
    };
    response: ApiResponse<SessionDto>;
  };
  "POST /api/sessions/:id/bookings": {
    params: { id: Id };
    body: JoinSessionRequest;
    response: ApiResponse<BookingDto>;
  };
  "DELETE /api/bookings/:id": {
    params: { id: Id };
    body: undefined;
    response: ApiResponse<BookingDto>;
  };
  "POST /api/booking-requests": {
    body: SubmitBookingRequest;
    response: ApiResponse<BookingRequestDto>;
  };
  "POST /api/admin/booking-requests/:id/approve": {
    params: { id: Id };
    body: ApproveBookingRequest;
    response: ApiResponse<BookingRequestDto & { booking_id: Id }>;
  };
  "POST /api/admin/booking-requests/:id/reject": {
    params: { id: Id };
    body: { reason: string };
    response: ApiResponse<BookingRequestDto & { booking_id: null }>;
  };
  "GET /api/me/bookings": {
    query: BookingQuery;
    response: ApiResponse<PaginatedDto<BookingDto>>;
  };
  "GET /api/admin/bookings": {
    query: BookingQuery;
    response: ApiResponse<PaginatedDto<BookingDto>>;
  };
  "GET /api/me/booking-requests": {
    query: {
      status?: import("@/types/domain").BookingRequestStatus;
      page?: number;
      page_size?: number;
    };
    response: ApiResponse<PaginatedDto<BookingRequestDto>>;
  };
  "GET /api/admin/sessions/pending": {
    query: {
      status?: import("@/types/domain").BookingRequestStatus;
      page?: number;
      page_size?: number;
    };
    response: ApiResponse<PaginatedDto<BookingRequestDto>>;
  };
  "GET /api/admin/sessions/options": {
    response: ApiResponse<SessionOptionDto[]>;
  };
  "GET /api/notifications": {
    query: { page?: number; page_size?: number };
    response: ApiResponse<NotificationListDto>;
  };
  "POST /api/notifications/read": {
    body: { ids: Id[] };
    response: ApiResponse<{ read: true }>;
  };
}

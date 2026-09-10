import type {
  Booking,
  BookingStatus,
  CostumeSummary,
  DmSummary,
  GameSession,
  GiftDisplayItem,
  Id,
  IsoDateTime,
  ScriptDetail,
  ScriptDifficulty,
  ScriptSummary,
  UserRole,
  UserStatus,
  UserSummary,
} from "@/types/domain";

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; error: ApiError };

export interface PageInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pageInfo: PageInfo;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export interface SessionQuery extends PageQuery {
  scriptId?: Id;
  from?: IsoDateTime;
  to?: IsoDateTime;
  availableOnly?: boolean;
}

export interface ScriptQuery extends PageQuery {
  search?: string;
  difficulty?: ScriptDifficulty;
  minPlayers?: number;
  maxPlayers?: number;
}

export interface SignInRequest {
  account: string;
  password: string;
}

export interface SessionResponse {
  user: UserSummary;
  expiresAt: IsoDateTime;
}

export interface CreateBookingRequest {
  sessionId: Id;
  playerCount: number;
  note?: string;
}

export interface UpdateBookingStatusRequest {
  status: Extract<BookingStatus, "confirmed" | "completed" | "cancelled">;
  reason?: string;
}

export interface AdminOverview {
  activeScripts: number;
  upcomingSessions: number;
  todayBookings: number;
  registeredCustomers: number;
}

export interface AdminUserRow extends UserSummary {
  email: string | null;
  phone: string | null;
  createdAt: IsoDateTime;
}

export interface AdminUserQuery extends PageQuery {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UpdateUserRequest {
  displayName?: string;
  role?: UserRole;
  status?: UserStatus;
  memberLevelId?: Id | null;
  points?: number;
}

export interface ApiContracts {
  "POST /api/v1/auth/sign-in": {
    body: SignInRequest;
    response: ApiResult<SessionResponse>;
  };
  "POST /api/v1/auth/sign-out": {
    body: undefined;
    response: ApiResult<{ signedOut: true }>;
  };
  "GET /api/v1/auth/session": {
    query: undefined;
    response: ApiResult<SessionResponse | null>;
  };
  "GET /api/v1/me": {
    query: undefined;
    response: ApiResult<UserSummary>;
  };
  "GET /api/v1/scripts": {
    query: ScriptQuery;
    response: ApiResult<Paginated<ScriptSummary>>;
  };
  "GET /api/v1/scripts/:slug": {
    params: { slug: string };
    response: ApiResult<ScriptDetail>;
  };
  "GET /api/v1/dms": {
    query: PageQuery;
    response: ApiResult<Paginated<DmSummary>>;
  };
  "GET /api/v1/costumes": {
    query: PageQuery;
    response: ApiResult<Paginated<CostumeSummary>>;
  };
  "GET /api/v1/sessions": {
    query: SessionQuery;
    response: ApiResult<Paginated<GameSession>>;
  };
  "GET /api/v1/bookings/me": {
    query: PageQuery & { status?: BookingStatus };
    response: ApiResult<Paginated<Booking>>;
  };
  "POST /api/v1/bookings": {
    body: CreateBookingRequest;
    response: ApiResult<Booking>;
  };
  "POST /api/v1/bookings/:id/cancel": {
    params: { id: Id };
    body: { reason?: string };
    response: ApiResult<Booking>;
  };
  "GET /api/v1/gifts": {
    query: PageQuery;
    response: ApiResult<Paginated<GiftDisplayItem>>;
  };
  "GET /api/v1/admin/overview": {
    query: undefined;
    response: ApiResult<AdminOverview>;
  };
  "GET /api/v1/admin/users": {
    query: AdminUserQuery;
    response: ApiResult<Paginated<AdminUserRow>>;
  };
  "PATCH /api/v1/admin/users/:id": {
    params: { id: Id };
    body: UpdateUserRequest;
    response: ApiResult<AdminUserRow>;
  };
  "GET /api/v1/admin/bookings": {
    query: PageQuery & { status?: BookingStatus; sessionId?: Id };
    response: ApiResult<Paginated<Booking>>;
  };
  "PATCH /api/v1/admin/bookings/:id/status": {
    params: { id: Id };
    body: UpdateBookingStatusRequest;
    response: ApiResult<Booking>;
  };
}

export type ApiRoute = keyof ApiContracts;

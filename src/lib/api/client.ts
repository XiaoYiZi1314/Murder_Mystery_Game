import type { ApiResponse } from "./contracts";

export class ApiClientError extends Error {
  readonly code: number;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(code: number, message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function errorMessage(error: unknown, fallback = "网络异常，请稍后重试"): string {
  return error instanceof ApiClientError ? error.message : fallback;
}

/** 同源 fetch：自动带 Cookie；POST 由浏览器自动带 Origin；写请求需传 csrf。 */
export async function apiFetch<T>(
  path: string,
  init?: { method?: string; body?: unknown; csrf?: string | null; idempotencyKey?: string },
): Promise<T> {
  const headers: Record<string, string> = {};
  let payload: string | undefined;
  if (init?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(init.body);
  }
  if (init?.csrf) headers["X-CSRF-Token"] = init.csrf;
  if (init?.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;
  const res = await fetch(path, { method: init?.method ?? "GET", headers, body: payload, credentials: "same-origin" });
  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(5000, `请求失败（HTTP ${res.status}）`, res.status);
  }
  if (!res.ok || !json || json.code !== 0) {
    throw new ApiClientError(
      json?.code ?? 5000,
      json?.message ?? `请求失败（HTTP ${res.status}）`,
      res.status,
      json?.field_errors,
    );
  }
  return json.data as T;
}

let csrfCache: string | null = null;

export async function getCsrfToken(refresh = false): Promise<string> {
  if (!refresh && csrfCache) return csrfCache;
  const data = await apiFetch<{ csrf_token: string }>("/api/auth/csrf");
  csrfCache = data.csrf_token;
  return csrfCache;
}

export function clearCsrfCache(): void {
  csrfCache = null;
}

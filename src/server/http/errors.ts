import { ApiCodes } from "@/lib/api/contracts";

/** 业务可预期错误：withCommand 统一映射为 {code,message,data:null}，不泄露内部细节。 */
export class ApiError extends Error {
  readonly code: number;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(code: number, message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function badRequest(message = "请求格式错误", fieldErrors?: Record<string, string[]>): ApiError {
  return new ApiError(ApiCodes.INVALID_INPUT, message, 400, fieldErrors);
}

export function unprocessable(message = "业务输入非法", fieldErrors?: Record<string, string[]>): ApiError {
  return new ApiError(ApiCodes.INVALID_INPUT, message, 422, fieldErrors);
}

export function csrfError(): ApiError {
  return new ApiError(ApiCodes.CSRF_INVALID, "CSRF 校验失败", 403);
}

export function originRejected(): ApiError {
  return new ApiError(ApiCodes.ORIGIN_REJECTED, "不可信的请求来源", 403);
}

export function unauthenticated(message = "未登录或会话已失效"): ApiError {
  return new ApiError(ApiCodes.UNAUTHENTICATED, message, 401);
}

export function forbidden(message = "无权限执行该操作"): ApiError {
  return new ApiError(ApiCodes.FORBIDDEN, message, 403);
}

export function rateLimited(message = "尝试过于频繁，请稍后再试"): ApiError {
  return new ApiError(ApiCodes.RATE_LIMITED, message, 429);
}

export function invalidCredentials(): ApiError {
  // 登录统一错误：不区分账号不存在/密码错误/被禁用，防枚举。
  return new ApiError(ApiCodes.INVALID_CREDENTIALS, "手机号或密码错误", 401);
}

export function notFound(message = "资源不存在"): ApiError {
  return new ApiError(ApiCodes.NOT_FOUND, message, 404);
}

export function conflict(code: number = ApiCodes.CONFLICT, message = "资源冲突"): ApiError {
  return new ApiError(code, message, 409);
}

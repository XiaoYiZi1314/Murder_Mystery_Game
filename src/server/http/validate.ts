import { badRequest, unprocessable } from "./errors";

const PHONE_RE = /^1[3-9]\d{9}$/;

export function assertPhone(phone: unknown, field = "phone"): asserts phone is string {
  if (typeof phone !== "string" || !PHONE_RE.test(phone.trim())) {
    throw unprocessable("手机号格式不正确", { [field]: ["请输入 11 位大陆手机号"] });
  }
}

export function assertPassword(password: unknown, field = "password"): asserts password is string {
  if (typeof password !== "string" || password.length < 6 || password.length > 72) {
    throw unprocessable("密码长度需为 6–72 位", { [field]: ["密码长度需为 6–72 位"] });
  }
}

export function assertNickname(nickname: unknown, field = "nickname"): asserts nickname is string {
  if (typeof nickname !== "string" || nickname.trim().length === 0 || nickname.trim().length > 20) {
    throw unprocessable("昵称需为 1–20 个字符", { [field]: ["昵称需为 1–20 个字符"] });
  }
}

export async function parseJsonBody(req: Request): Promise<Record<string, unknown>> {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    throw badRequest("请求体不是合法 JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("请求体必须为 JSON 对象");
  }
  return body as Record<string, unknown>;
}

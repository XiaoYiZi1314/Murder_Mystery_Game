import type { NextRequest } from "next/server";
import { toMeDto } from "@/server/auth/mappers";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { buildSessionCookie, createSession } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { invalidCredentials, rateLimited } from "@/server/http/errors";
import { clearRateLimit, hitRateLimit, isRateLimited, loginIpKey, loginPhoneKey } from "@/server/http/rate-limit";
import { withCommand } from "@/server/http/with-command";

export const dynamic = "force-dynamic";

/** POST /api/auth/login：同 IP / 同手机号双计数，先判后验（fail-closed），统一错误防枚举。 */
export async function POST(req: NextRequest) {
  return withCommand(req, { auth: "anonymous" }, async ({ body, ip }) => {
    const { phone, password } = body as { phone?: unknown; password?: unknown };
    if (typeof phone !== "string" || typeof password !== "string" || !phone || !password) {
      throw invalidCredentials();
    }
    const normalizedPhone = phone.trim();
    const phoneKey = loginPhoneKey(normalizedPhone);
    const ipKey = loginIpKey(ip);
    if ((await isRateLimited(phoneKey)) || (await isRateLimited(ipKey))) throw rateLimited();
    const user = await prisma.user.findUnique({ where: { phone: normalizedPhone }, include: { memberLevel: true } });
    let okPassword = false;
    if (user) {
      okPassword = await verifyPassword(user.passwordHash, password);
    } else {
      await hashPassword(password); // 占位耗时，防时序枚举账号存在性
    }
    if (!user || user.status !== "active" || !okPassword) {
      await hitRateLimit(phoneKey);
      await hitRateLimit(ipKey);
      throw invalidCredentials();
    }
    await clearRateLimit(phoneKey);
    const { token } = await createSession(String(user.id), user.role);
    return { message: "登录成功", data: toMeDto(user), headers: { "Set-Cookie": buildSessionCookie(token) } };
  });
}

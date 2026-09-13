import type { NextRequest } from "next/server";
import { ApiCodes } from "@/lib/api/contracts";
import { toMeDto } from "@/server/auth/mappers";
import { hashPassword } from "@/server/auth/password";
import { buildSessionCookie, createSession } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { conflict, rateLimited } from "@/server/http/errors";
import { hitRateLimit, registerIpKey } from "@/server/http/rate-limit";
import { assertNickname, assertPassword, assertPhone } from "@/server/http/validate";
import { withCommand } from "@/server/http/with-command";

export const dynamic = "force-dynamic";

/** POST /api/auth/register：仅创建 customer；body.role 直接忽略，防提权。 */
export async function POST(req: NextRequest) {
  return withCommand(req, { auth: "anonymous" }, async ({ body, ip }) => {
    const { phone, password, nickname } = body as { phone?: unknown; password?: unknown; nickname?: unknown };
    assertPhone(phone);
    assertPassword(password);
    assertNickname(nickname);
    const limited = await hitRateLimit(registerIpKey(ip));
    if (!limited.allowed) throw rateLimited("注册过于频繁，请稍后再试");
    const normalizedPhone = phone.trim();
    const existing = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (existing) throw conflict(ApiCodes.PHONE_TAKEN, "该手机号已注册");
    const level = await prisma.memberLevel.findFirst({ where: { rank: 1 } });
    if (!level) throw new Error("[register] member_levels 未初始化，请先运行 npm run prisma:seed");
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        phone: normalizedPhone,
        nickname: nickname.trim(),
        passwordHash,
        role: "customer",
        memberLevelId: level.id,
      },
      include: { memberLevel: true },
    });
    const { token } = await createSession(String(user.id), "customer");
    return { status: 201, message: "注册成功", data: toMeDto(user), headers: { "Set-Cookie": buildSessionCookie(token) } };
  });
}

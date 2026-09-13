import type { NextRequest } from "next/server";
import { toMeDto } from "@/server/auth/mappers";
import { prisma } from "@/server/db/prisma";
import { unauthenticated, unprocessable } from "@/server/http/errors";
import { assertNickname } from "@/server/http/validate";
import { withCommand } from "@/server/http/with-command";

export const dynamic = "force-dynamic";

const FORBIDDEN_ME_FIELDS = [
  "role",
  "status",
  "phone",
  "balance",
  "points",
  "total_topup",
  "totalTopup",
  "member_level_id",
  "memberLevelId",
  "password",
  "password_hash",
];

export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "required", csrf: false }, async ({ actor }) => {
    if (!actor) throw unauthenticated();
    const user = await prisma.user.findUnique({
      where: { id: BigInt(actor.userId) },
      include: { memberLevel: true },
    });
    if (!user) throw unauthenticated();
    return { data: toMeDto(user) };
  });
}

/** PATCH /api/me：仅 nickname 白名单；role/余额/积分等只读字段出现即 422。 */
export async function PATCH(req: NextRequest) {
  return withCommand(req, { auth: "required" }, async ({ actor, body }) => {
    if (!actor) throw unauthenticated();
    const present = FORBIDDEN_ME_FIELDS.filter((field) => field in body);
    if (present.length > 0) {
      throw unprocessable(
        `不允许修改字段：${present.join("、")}`,
        Object.fromEntries(present.map((field) => [field, ["该字段为只读"] ])),
      );
    }
    const { nickname } = body as { nickname?: unknown };
    if (nickname !== undefined) assertNickname(nickname);
    const user = await prisma.user.update({
      where: { id: BigInt(actor.userId) },
      data: nickname === undefined ? {} : { nickname: (nickname as string).trim() },
      include: { memberLevel: true },
    });
    return { message: "资料已更新", data: toMeDto(user) };
  });
}

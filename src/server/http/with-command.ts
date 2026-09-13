import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import type { DbTx } from "../db/prisma";
import { getSessionFromRequest, type Actor, type SessionData } from "../auth/session";
import { ApiError, badRequest, unauthenticated, unprocessable } from "./errors";
import { hashRequest, runIdempotent } from "./idempotency";
import { fail, ok } from "./response";
import { assertCsrfToken, assertJsonContentType, assertTrustedOrigin } from "./csrf";

export interface CommandContext {
  actor: Actor | null;
  session: SessionData | null;
  token: string | null;
  body: Record<string, unknown>;
  ip: string;
  tx: DbTx | null;
  idempotencyKey: string | null;
}

export interface CommandResult {
  status?: number;
  message?: string;
  data?: unknown;
  headers?: HeadersInit;
}

export interface CommandOptions {
  /** anonymous：匿名端点（同源+JSON-CT 校验）；required：必须登录；optional：actor 可空 */
  auth: "anonymous" | "required" | "optional";
  /** 已登录写请求是否校验 CSRF（默认：required + 写方法即校验） */
  csrf?: boolean;
  /** 传 operation 名即启用 actor+operation+Idempotency-Key 幂等（需已登录） */
  idempotent?: string;
  /** 是否解析 JSON body（默认：写方法解析） */
  parseBody?: boolean;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return "unknown";
}

function toResponse(result: { status: number; message: string; data: unknown; headers?: HeadersInit }): NextResponse {
  return ok(result.data, result.status, result.message, result.headers);
}

export async function withCommand(
  req: NextRequest,
  options: CommandOptions,
  work: (ctx: CommandContext) => Promise<CommandResult>,
): Promise<NextResponse> {
  try {
    const method = req.method.toUpperCase();
    const isWrite = method !== "GET" && method !== "HEAD";
    const parseBody = options.parseBody ?? isWrite;

    let actor: Actor | null = null;
    let session: SessionData | null = null;
    let token: string | null = null;
    if (options.auth !== "anonymous") {
      const found = await getSessionFromRequest(req);
      if (found) {
        actor = found.actor;
        session = found.session;
        token = found.token;
      } else if (options.auth === "required") {
        throw unauthenticated();
      }
    }

    if (options.auth === "anonymous") {
      assertTrustedOrigin(req);
      if (parseBody) assertJsonContentType(req);
    } else if ((options.csrf ?? (isWrite && options.auth === "required")) && actor && session) {
      assertCsrfToken(req, session);
    }

    let body: Record<string, unknown> = {};
    if (parseBody) {
      try {
        const parsed: unknown = await req.json();
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw badRequest("请求体必须为 JSON 对象");
        }
        body = parsed as Record<string, unknown>;
      } catch (error: unknown) {
        if (error instanceof ApiError) throw error;
        throw badRequest("请求体不是合法 JSON");
      }
    }

    const ip = getClientIp(req);
    const idempotencyKey = req.headers.get("idempotency-key");

    if (options.idempotent) {
      if (!actor) throw unauthenticated();
      const key = (idempotencyKey ?? "").trim();
      if (!key) {
        throw unprocessable("缺失 Idempotency-Key", { "Idempotency-Key": ["写操作需携带幂等键"] });
      }
      if (key.length > 100) throw unprocessable("Idempotency-Key 过长", { "Idempotency-Key": ["最长 100 字符"] });
      const operation = options.idempotent;
      const requestHash = hashRequest({ operation, body });
      const replay = await runIdempotent({
        actorId: BigInt(actor.userId),
        operation,
        key,
        requestHash,
        work: async (tx) => {
          const result = await work({ actor, session, token, body, ip, tx, idempotencyKey: key });
          return { status: result.status ?? 200, message: result.message ?? "OK", data: result.data ?? null };
        },
      });
      return toResponse({ status: replay.status, message: replay.message, data: replay.data });
    }

    const result = await work({ actor, session, token, body, ip, tx: null, idempotencyKey });
    return toResponse({ status: result.status ?? 200, message: result.message ?? "OK", data: result.data ?? null, headers: result.headers });
  } catch (error: unknown) {
    if(error instanceof Prisma.PrismaClientKnownRequestError && ["P2002","P2003","P2034"].includes(error.code))return fail(3001,"资源冲突或并发更新，请重新加载后重试",409);
    if (error instanceof ApiError) {
      return fail(error.code, error.message, error.status, error.fieldErrors);
    }
     
    console.error("[withCommand] 未预期错误：", error);
    return fail(5000, "服务端内部错误", 500);
  }
}

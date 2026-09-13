import type { NextRequest } from "next/server";
import { withCommand } from "../http/with-command";
import type { Context } from "./shared";
import { invalidateSessions } from "./cache";
export async function bookingCommand(
  req: NextRequest,
  operation: string,
  work: (c: Context, body: Record<string, unknown>) => Promise<unknown>,
  status = 200,
  parseBody = true,
) {
  const response = await withCommand(
    req,
    { auth: "required", idempotent: operation, parseBody },
    async (c) => {
      if (!c.actor || !c.tx) throw new Error("Missing command transaction");
      return {
        status,
        data: await work({ actor: c.actor, tx: c.tx, ip: c.ip }, c.body),
      };
    },
  );
  if (response.ok) await invalidateSessions();
  return response;
}

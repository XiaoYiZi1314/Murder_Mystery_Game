import { NextResponse } from "next/server";
import { ApiCodes, type ApiResponse } from "@/lib/api/contracts";

/** BigInt 防御性序列化：开发期告警，线上兜底转字符串（正常路径应经 wire mapper）。 */
function safeJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (typeof item === "bigint") {
      if (process.env.NODE_ENV !== "production") {
         
        console.warn("[response] BigInt 未经 wire mapper 直接序列化，已兜底转字符串");
      }
      return item.toString();
    }
    return item;
  });
}

function json<T>(payload: ApiResponse<T>, status: number, headers?: HeadersInit): NextResponse {
  return new NextResponse(safeJson(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(headers ?? {}) },
  });
}

export function ok<T>(data: T, status = 200, message = "OK", headers?: HeadersInit): NextResponse {
  return json<T>({ code: ApiCodes.OK, message, data }, status, headers);
}

export function created<T>(data: T, message = "创建成功", headers?: HeadersInit): NextResponse {
  return json<T>({ code: ApiCodes.OK, message, data }, 201, headers);
}

export function fail(
  code: number,
  message: string,
  status: number,
  fieldErrors?: Record<string, string[]>,
): NextResponse {
  return json<null>(
    { code, message, data: null, ...(fieldErrors ? { field_errors: fieldErrors } : {}) },
    status,
  );
}

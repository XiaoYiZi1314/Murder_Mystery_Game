"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiClientError, getCsrfToken } from "@/lib/api/client";
export function useRemote<T>(url: string, initial?: T, poll = 0) {
  const [data, setData] = useState(initial),
    [error, setError] = useState<Error | null>(null),
    [loading, setLoading] = useState(!initial);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const g = ++generation.current;
    setLoading(true);
    try {
      const value = await apiFetch<T>(url);
      if (g === generation.current) {
        setData(value);
        setError(null);
      }
      return value;
    } catch (e) {
      if (g === generation.current) {
        setError(e instanceof Error ? e : new Error("加载失败"));
        if (e instanceof ApiClientError && e.status === 401) setData(undefined);
      }
      return undefined;
    } finally {
      if (g === generation.current) setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    let alive = true;
    const initialLoad = setTimeout(() => {
      if (alive) void reload();
    }, 0);
    const timer = poll ? setInterval(() => void reload(), poll) : undefined;
    return () => {
      alive = false;
      clearTimeout(initialLoad);
      if (timer) clearInterval(timer);
    };
  }, [reload, poll]);
  return { data, error, loading, reload };
}
export function useBookingCommand() {
  const [pending, setPending] = useState(false),
    [error, setError] = useState<Error | null>(null),
    [uncertain, setUncertain] = useState(false);
  const attempt = useRef<{
    fingerprint: string;
    key: string;
    unresolved: boolean;
    url: string;
    method: string;
    body?: unknown;
  } | null>(null);
  async function run<T>(
    url: string,
    method: string,
    body?: unknown,
  ): Promise<T> {
    if (
      attempt.current?.unresolved &&
      attempt.current.url === url &&
      attempt.current.method === method
    )
      body = attempt.current.body;
    const fingerprint = JSON.stringify({ url, method, body });
    if (
      attempt.current?.unresolved &&
      attempt.current.fingerprint !== fingerprint
    ) {
      const e = new Error(
        "上次请求结果未知，请先保持原内容重试确认，避免重复报名",
      );
      setError(e);
      throw e;
    }
    if (!attempt.current || attempt.current.fingerprint !== fingerprint)
      attempt.current = {
        fingerprint,
        key: crypto.randomUUID(),
        unresolved: false,
        url,
        method,
        body,
      };
    setPending(true);
    setError(null);
    try {
      const result = await apiFetch<T>(url, {
        method,
        body,
        csrf: await getCsrfToken(true),
        idempotencyKey: attempt.current.key,
      });
      attempt.current = null;
      setUncertain(false);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error("请求失败");
      setError(err);
      const unknown = !(e instanceof ApiClientError) || e.status >= 500;
      if (attempt.current) attempt.current.unresolved = unknown;
      setUncertain(unknown);
      if (!unknown) attempt.current = null;
      throw err;
    } finally {
      setPending(false);
    }
  }
  return { run, pending, error, uncertain, clear: () => setError(null) };
}
export type PageResult<T> = {
  items: T[];
  page_info: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

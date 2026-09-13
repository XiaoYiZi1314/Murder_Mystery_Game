import { unprocessable } from "../http/errors";
import type { ScriptCharacterInput } from "@/lib/api/contracts";
import type { ScriptSort } from "@/types/domain";

export type FieldErrors = Record<string, string[]>;

function err(fe: FieldErrors, field: string, message: string): void {
  (fe[field] ??= []).push(message);
}

function throwIfInvalid(fe: FieldErrors): void {
  if (Object.keys(fe).length > 0) throw unprocessable("字段校验失败", fe);
}

function isRelUrl(v: unknown): v is string {
  return typeof v === "string" && v.length > 1 && /^\/uploads\/[a-f0-9]{32}\.webp$/.test(v);
}

const PRICE_RE = /^\d{1,6}(\.\d{1,2})?$/;
const SLUG_RE = /^[a-z0-9-]{1,191}$/;
const SCRIPT_STATUSES = ["draft", "on", "off"] as const;
const COSTUME_STATUSES = ["draft", "on", "off"] as const;
const DM_STATUSES = ["active", "inactive"] as const;
const SORTS: readonly string[] = ["latest", "price_asc", "price_desc", "rating"];

function intInRange(v: unknown, min: number, max: number): number | null {
  if (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max) return v;
  if (typeof v === "string" && /^\d+$/.test(v.trim()) && Number(v.trim()) >= min && Number(v.trim()) <= max) {
    return Number(v.trim());
  }
  return null;
}

function normalizePrice(v: unknown): string | null {
  if (typeof v === "string" && PRICE_RE.test(v.trim())) return v.trim();
  if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 999999.99) {
    return v.toFixed(2);
  }
  return null;
}

/** 关联 id 数组：去重（保持顺序）；非法即字段错误。返回 null 表示“键未提供”（PATCH 语义=保持不变）。 */
export function dedupeIds(v: unknown, fe: FieldErrors, field: string): string[] | null {
  if (v === undefined) return null;
  if (!Array.isArray(v) || v.length > 100) {
    err(fe, field, "必须是 id 数组");
    return null;
  }
  const seen = new Set<string>();
  for (const item of v) {
    if (typeof item !== "string" || !/^([1-9]\d{0,18})$/.test(item) || (typeof item === "string" && /^\d+$/.test(item) && BigInt(item)>BigInt("9223372036854775807"))) {
      err(fe, field, "包含非法 id");
      return null;
    }
    seen.add(item);
  }
  return [...seen];
}

// ---------- 剧本 ----------

export interface NormalizedScript {
  /** 条件更新：读时版本（ISO）；提供即按版本匹配，漂移 409。 */
  updatedAt?: string;
  title?: string;
  slug?: string;
  cover?: string;
  tagline?: string | null;
  synopsis?: string;
  durationMinutes?: number;
  minPlayers?: number;
  maxPlayers?: number;
  price?: string;
  status?: (typeof SCRIPT_STATUSES)[number];
  featured?: boolean;
  tagIds: string[] | null;
  dmIds: string[] | null;
  costumeIds: string[] | null;
  characters: ScriptCharacterInput[] | null;
}

function has(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function readUpdatedAt(body: Record<string, unknown>, fe: FieldErrors): string | undefined {
  if (!has(body, "updated_at")) { err(fe, "updated_at", "编辑必须携带最后读取的版本"); return undefined; }
  const s = typeof body.updated_at === "string" ? body.updated_at : "";
  if (!s || Number.isNaN(Date.parse(s))) {
    err(fe, "updated_at", "须为合法 ISO 时间");
    return undefined;
  }
  return s;
}

function validateCharacters(
  v: unknown,
  fe: FieldErrors,
): ScriptCharacterInput[] | null {
  if (v === undefined) return null;
  if (!Array.isArray(v) || v.length > 30) {
    err(fe, "characters", "角色数量 0..30");
    return null;
  }
  const out: ScriptCharacterInput[] = [];
  const names = new Set<string>();
  const ids = new Set<string>();
  v.forEach((item, i) => {
    const o = (item ?? {}) as Record<string, unknown>;
    const at = `characters[${i}]`;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!name || name.length > 80) {
      err(fe, at, "角色名必填且 ≤80 字");
      return;
    }
    if (names.has(name)) {
      err(fe, at, "角色名重复");
      return;
    }
    names.add(name);
    const image = o.image === undefined || o.image === null ? undefined : o.image;
    if (image !== undefined && !isRelUrl(image)) {
      err(fe, at, "角色图必须是站内相对 URL");
      return;
    }
    const bio = o.bio === undefined || o.bio === null ? undefined : o.bio;
    if (bio !== undefined && (typeof bio !== "string" || bio.length > 500)) {
      err(fe, at, "角色介绍 ≤500 字");
      return;
    }
    const sort = o.sort === undefined ? 0 : intInRange(o.sort, 0, 999);
    if (sort === null) {
      err(fe, at, "sort 须为 0..999 整数");
      return;
    }
    const id = o.id === undefined ? undefined : o.id;
    if (id !== undefined && (typeof id !== "string" || !/^\d+$/.test(id))) {
      err(fe, at, "id 非法");
      return;
    }
    if(id && ids.has(id)) { err(fe, at, "角色 id 重复"); return; }
    if(id) ids.add(id);
    out.push({ id, name, image, bio, sort });
  });
  return out;
}

/**
 * 剧本保存校验。partial=false（POST 全量）；partial=true（PATCH 仅校验出现的键）。
 * 关联数组/角色出现即整体替换（服务层同事务执行）。
 */
export function validateScript(body: Record<string, unknown>, partial: boolean): NormalizedScript {
  const fe: FieldErrors = {};
  const out: NormalizedScript = { tagIds: null, dmIds: null, costumeIds: null, characters: null };

  if (!partial || has(body, "title")) {
    const t = typeof body.title === "string" ? body.title.trim() : "";
    if (!t || t.length > 160) err(fe, "title", "标题必填且 ≤160 字");
    else out.title = t;
  }
  if (has(body, "slug")) {
    const s = typeof body.slug === "string" ? body.slug.trim() : "";
    if (s && !SLUG_RE.test(s)) err(fe, "slug", "slug 仅限小写字母/数字/连字符，1..191");
    else if (s) out.slug = s;
  }
  if (!partial || has(body, "cover")) {
    if (!isRelUrl(body.cover)) err(fe, "cover", "封面必须是站内相对 URL");
    else out.cover = body.cover;
  }
  if (has(body, "tagline")) {
    if (body.tagline === null || body.tagline === "") out.tagline = null;
    else if (typeof body.tagline === "string" && body.tagline.length <= 255) out.tagline = body.tagline;
    else err(fe, "tagline", "一句话简介 ≤255 字");
  }
  if (!partial || has(body, "synopsis")) {
    const s = typeof body.synopsis === "string" ? body.synopsis.trim() : "";
    if (!s || s.length > 2000) err(fe, "synopsis", "简介必填且 ≤2000 字");
    else out.synopsis = s;
  }
  if (!partial || has(body, "duration_minutes")) {
    const n = intInRange(body.duration_minutes, 1, 600);
    if (n === null) err(fe, "duration_minutes", "时长须为 1..600 分钟");
    else out.durationMinutes = n;
  }
  if (!partial || has(body, "player_min")) {
    const n = intInRange(body.player_min, 1, 30);
    if (n === null) err(fe, "player_min", "最少人数须为 1..30 整数");
    else out.minPlayers = n;
  }
  if (!partial || has(body, "player_max")) {
    const n = intInRange(body.player_max, 1, 30);
    if (n === null) err(fe, "player_max", "最多人数须为 1..30 整数");
    else out.maxPlayers = n;
  }
  if (out.minPlayers !== undefined && out.maxPlayers !== undefined && out.minPlayers > out.maxPlayers) {
    err(fe, "player_min", "最少人数不能大于最多人数");
  }
  if (!partial || has(body, "price")) {
    const p = normalizePrice(body.price);
    if (p === null) err(fe, "price", "价格须为 0..999999.99（最多两位小数）");
    else out.price = p;
  }
  if (!partial || has(body, "status")) {
    if (typeof body.status === "string" && (SCRIPT_STATUSES as readonly string[]).includes(body.status)) {
      out.status = body.status as NormalizedScript["status"];
    } else err(fe, "status", "状态仅 draft/on/off");
  }
  if (has(body, "featured")) {
    if (typeof body.featured === "boolean") out.featured = body.featured;
    else err(fe, "featured", "featured 须为布尔值");
  }
  out.tagIds = dedupeIds(body.tag_ids, fe, "tag_ids");
  out.dmIds = dedupeIds(body.dm_ids, fe, "dm_ids");
  out.costumeIds = dedupeIds(body.costume_ids, fe, "costume_ids");
  out.characters = validateCharacters(body.characters, fe);
  out.updatedAt = partial ? readUpdatedAt(body, fe) : undefined;

  throwIfInvalid(fe);
  return out;
}

// ---------- 妆造 ----------

export interface NormalizedCostume {
  scriptIds: string[] | null;
  updatedAt?: string;
  name?: string;
  cover?: string;
  images?: string[];
  description?: string | null;
  status?: (typeof COSTUME_STATUSES)[number];
}

export function validateCostume(body: Record<string, unknown>, partial: boolean): NormalizedCostume {
  const fe: FieldErrors = {};
  const out: NormalizedCostume = { scriptIds: dedupeIds(body.script_ids, fe, "script_ids") };
  if (!partial || has(body, "name")) {
    const n = typeof body.name === "string" ? body.name.trim() : "";
    if (!n || n.length > 160) err(fe, "name", "名称必填且 ≤160 字");
    else out.name = n;
  }
  if (!partial || has(body, "cover")) {
    if (!isRelUrl(body.cover)) err(fe, "cover", "封面必须是站内相对 URL");
    else out.cover = body.cover;
  }
  if (has(body, "images")) {
    if (!Array.isArray(body.images) || body.images.length > 10) {
      err(fe, "images", "图片数组 0..10");
    } else if (body.images.some((u) => !isRelUrl(u))) {
      err(fe, "images", "图片必须是站内相对 URL");
    } else {
      const seen = new Set<string>();
      for (const u of body.images as string[]) seen.add(u);
      out.images = [...seen];
    }
  }
  if (has(body, "description")) {
    if (body.description === null || body.description === "") out.description = null;
    else if (typeof body.description === "string" && body.description.length <= 1000) out.description = body.description;
    else err(fe, "description", "描述 ≤1000 字");
  }
  if (has(body, "status")) {
    if (typeof body.status === "string" && (COSTUME_STATUSES as readonly string[]).includes(body.status)) {
      out.status = body.status as NormalizedCostume["status"];
    } else err(fe, "status", "状态仅 draft/on/off");
  }
  out.updatedAt = partial ? readUpdatedAt(body, fe) : undefined;
  throwIfInvalid(fe);
  return out;
}

// ---------- DM 展示信息 ----------

export interface NormalizedDm {
  updatedAt?: string;
  bio?: string | null;
  avatar?: string | null;
  photo?: string | null;
  tagIds: string[] | null;
  status?: (typeof DM_STATUSES)[number];
}

export function validateDmUpdate(body: Record<string, unknown>): NormalizedDm {
  const fe: FieldErrors = {};
  const out: NormalizedDm = { tagIds: null };
  if (Object.keys(body).length === 0) throw unprocessable("请提供要修改的字段");
  if (has(body, "bio")) {
    if (body.bio === null || body.bio === "") out.bio = null;
    else if (typeof body.bio === "string" && body.bio.length <= 2000) out.bio = body.bio;
    else err(fe, "bio", "个人介绍 ≤2000 字");
  }
  if (has(body, "avatar")) {
    if (body.avatar === null || body.avatar === "") out.avatar = null;
    else if (isRelUrl(body.avatar)) out.avatar = body.avatar;
    else err(fe, "avatar", "头像必须是站内相对 URL");
  }
  if (has(body, "photo")) {
    if (body.photo === null || body.photo === "") out.photo = null;
    else if (isRelUrl(body.photo)) out.photo = body.photo;
    else err(fe, "photo", "照片必须是站内相对 URL");
  }
  out.tagIds = dedupeIds(body.tag_ids, fe, "tag_ids");
  if (has(body, "status")) {
    if (typeof body.status === "string" && (DM_STATUSES as readonly string[]).includes(body.status)) {
      out.status = body.status as NormalizedDm["status"];
    } else err(fe, "status", "状态仅 active/inactive");
  }
  out.updatedAt = readUpdatedAt(body, fe);
  throwIfInvalid(fe);
  return out;
}

// ---------- 标签 ----------

export function normalizeTagName(v: unknown, field = "name"): string {
  const n = typeof v === "string" ? v.trim() : "";
  if (!n || n.length > 40) throw unprocessable("标签名必填且 ≤40 字", { [field]: ["标签名必填且 ≤40 字"] });
  return n;
}

// ---------- 列表查询 ----------

export interface ParsedListQuery {
  tag?: string;
  featured?: boolean;
  q: string;
  sort: ScriptSort;
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

export function parseListQuery(p: URLSearchParams): ParsedListQuery {
  const fe: FieldErrors = {};
  const tag = (p.get("tag") ?? "").trim();
  if(tag.length>40) err(fe,"tag","标签过长");
  const q = (p.get("q") ?? "").trim();
  if (q.length > 64) err(fe, "q", "搜索词 ≤64 字");

  const sortRaw = p.get("sort") ?? "latest";
  const sort = SORTS.includes(sortRaw) ? (sortRaw as ScriptSort) : (err(fe, "sort", "非法 sort"), "latest");

  let page = 1;
  if (p.has("page")) {
    const n = Number(p.get("page"));
    if (!Number.isInteger(n) || n < 1 || n > 100000) err(fe, "page", "page 须为 ≥1 整数");
    else page = n;
  }
  let pageSize = DEFAULT_PAGE_SIZE;
  if (p.has("page_size")) {
    const n = Number(p.get("page_size"));
    if (!Number.isInteger(n) || n < 1 || n > MAX_PAGE_SIZE) err(fe, "page_size", `page_size 1..${MAX_PAGE_SIZE}`);
    else pageSize = n;
  }
  throwIfInvalid(fe);
  return { q, sort, page, pageSize, tag, featured: p.get("featured") === "true" };
}

export function dbId(value:string):bigint {
 if(!/^[1-9]\d{0,18}$/.test(value)||BigInt(value)>BigInt("9223372036854775807"))throw unprocessable('ID 须为有效十进制字符串');
 return BigInt(value);
}

import { Prisma } from "@prisma/client";
import type {
  CostumeDetailDto,
  CostumeSummaryDto,
  DmDetailDto,
  DmPublicDto,
  PaginatedDto,
  ScriptDetailDto,
  ScriptSummaryDto,
  TagDto,
} from "@/lib/api/contracts";

/** BigInt 主键一律转字符串（DB id 字符串化契约）。 */
export const id = (b: bigint): string => b.toString();

/** Decimal 金额/评分统一两位小数字符串；null 保持 null（不伪造 0 分之外的值）。 */
export function money2(d: Prisma.Decimal | number | string | null | undefined): string | null {
  if (d === null || d === undefined) return null;
  return new Prisma.Decimal(d).toFixed(2);
}

const iso = (d: Date): string => d.toISOString();

// ---------- 剧本 ----------

/** 列表用投影：剧本 + 有序标签名。 */
export type ScriptWithTags = Prisma.ScriptGetPayload<{
  include: { scriptTags: { include: { tag: true } } };
}>;

export function scriptSummaryDto(s: ScriptWithTags): ScriptSummaryDto {
  return {
    id: id(s.id),
    slug: s.slug,
    title: s.title,
    cover: s.coverUrl,
    thumbnail: s.coverUrl.startsWith("/uploads/") ? s.coverUrl.replace(".webp","-thumb.webp") : s.coverUrl,
    tagline: s.tagline,
    duration_minutes: s.durationMinutes,
    player_min: s.minPlayers,
    player_max: s.maxPlayers,
    price: money2(s.pricePerPlayer) ?? "0.00",
    status: s.status,
    featured: s.featured,
    review_count: s.reviewCount,
    avg_rating: money2(s.avgRating),
    tags: s.scriptTags.map((st) => st.tag.name),
  };
}

export const scriptDetailInclude = {
  scriptTags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
  characters: { orderBy: [{ sort: "asc" }, { id: "asc" }] },
  scriptDms: {
    include: { dm: { include: { user: { select: { nickname: true } }, dmTags: { include: { tag: true } } } } },
    orderBy: { dmId: "asc" },
  },
  scriptCostumes: { include: { costume: true }, orderBy: { costumeId: "asc" } },
} satisfies Prisma.ScriptInclude;

export type ScriptDetailPayload = Prisma.ScriptGetPayload<{ include: typeof scriptDetailInclude }>;

export function scriptDetailDto(s: ScriptDetailPayload): ScriptDetailDto {
  const summary = scriptSummaryDto(s);
  return {
    ...summary,
    synopsis: s.synopsis,
    tag_ids: s.scriptTags.map(st=>id(st.tagId)),
    updated_at: iso(s.updatedAt),
    characters: s.characters.map((c) => ({
      id: id(c.id),
      name: c.name,
      image: c.image,
      bio: c.bio,
      sort: c.sort,
    })),
    dms: s.scriptDms.map((sd) => dmPublicDto(sd.dm)),
    costumes: s.scriptCostumes.map((sc) => costumeSummaryDto(sc.costume)),
  };
}

// ---------- DM（公开投影：绝无 phone/role/status） ----------

export type DmPublicPayload = Prisma.DmGetPayload<{
  include: { user: { select: { nickname: true } }; dmTags: { include: { tag: true } } };
}>;

export function dmPublicDto(d: DmPublicPayload): DmPublicDto {
  return {
    id: id(d.id),
    slug: d.slug,
    name: d.user.nickname,
    avatar: d.avatar,
    photo: d.photo,
    bio: d.bio,
    specialty_tags: d.dmTags.map((t) => t.tag.name),
    rating: money2(d.rating),
  };
}

export interface ScriptRef {
  id: bigint;
  title: string;
  slug: string;
}

/** 调用方负责可见性过滤后传入 scripts（顾客视角仅 on 剧本）。 */
export function dmDetailDto(d: DmPublicPayload, scripts: ScriptRef[]): DmDetailDto {
  return {
    ...dmPublicDto(d),
    updated_at: iso(d.updatedAt),
    tag_ids: d.dmTags.map(t=>id(t.tagId)),
    scripts: scripts.map((s) => ({ id: id(s.id), title: s.title, slug: s.slug })),
  };
}

// ---------- 妆造 ----------

export function costumeSummaryDto(c: {
  id: bigint;
  slug?: string|null;
  name: string;
  coverUrl: string;
  description: string | null;
  status: "draft" | "on" | "off";
}): CostumeSummaryDto {
  return {
    id: id(c.id),
    slug: c.slug??null,
    name: c.name,
    cover: c.coverUrl,
    description: c.description,
    status: c.status,
  };
}

export function costumeDetailDto(
  c: { id: bigint; slug?:string|null; name: string; coverUrl: string; images: Prisma.JsonValue | null; description: string | null; status: "draft" | "on" | "off"; updatedAt: Date } & {
    scriptCostumes: { script: { id: bigint; title: string; slug: string } }[];
  },
): CostumeDetailDto {
  const images = Array.isArray(c.images) ? (c.images as string[]).filter((u): u is string => typeof u === "string") : [];
  return {
    ...costumeSummaryDto(c),
    updated_at: iso(c.updatedAt),
    images,
    scripts: c.scriptCostumes.map((sc) => ({ id: id(sc.script.id), title: sc.script.title, slug: sc.script.slug })),
  };
}

// ---------- 标签 / 分页 ----------

export function tagDto(t: { id: bigint; name: string; updatedAt:Date }, usageCount: number): TagDto {
  return { id: id(t.id), name: t.name, usage_count: usageCount, updated_at:iso(t.updatedAt) };
}

export function paginated<T>(items: T[], page: number, pageSize: number, total: number): PaginatedDto<T> {
  return {
    items,
    page_info: { page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

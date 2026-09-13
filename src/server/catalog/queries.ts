import { dbId } from "./validation";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import type { Actor } from "../auth/session";
import { notFound, unauthenticated } from "../http/errors";
import type { ParsedListQuery } from "./validation";
import {
  costumeDetailDto,
  costumeSummaryDto,
  dmDetailDto,
  dmPublicDto,
  id,
  paginated,
  scriptDetailDto,
  scriptDetailInclude,
  scriptSummaryDto,
  tagDto,
} from "./dto";

export type { ParsedListQuery } from "./validation";

const SORT_ORDERS: Record<ParsedListQuery["sort"], Prisma.ScriptOrderByWithRelationInput[]> = {
  latest: [{ createdAt: "desc" }, { id: "desc" }],
  price_asc: [{ pricePerPlayer: "asc" }, { id: "asc" }],
  price_desc: [{ pricePerPlayer: "desc" }, { id: "desc" }],
  // 无评价时 review_count=0：按“有评价优先、分高优先”，并列以 id 决出稳定顺序，绝不伪造评分。
  rating: [{ avgRating: { sort: "desc", nulls: "last" } }, { id: "desc" }],
};

export function isStaff(actor: Actor | null): boolean {
  return !!actor && (actor.role === "dm" || actor.role === "manager" || actor.role === "boss");
}

function scriptWhere(q: ParsedListQuery): Prisma.ScriptWhereInput {
  return {
    status: "on",
    ...(q.tag ? { scriptTags: { some: { tag: { name: q.tag } } } } : {}),
    ...(q.featured ? {featured:true} : {}),
    ...(q.q ? { title: { contains: q.q } } : {}),
  };
}

// ---------- 剧本 ----------

/** 公开剧本列表：任何角色（含匿名）只看到 status=on；稳定排序 + id 决并列。 */
export async function listScripts(q: ParsedListQuery, actor: Actor | null) {
  void actor;
  const where = scriptWhere(q);
  const [rows, total] = await prisma.$transaction([
    prisma.script.findMany({
      where,
      orderBy: SORT_ORDERS[q.sort],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { scriptTags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } } },
    }),
    prisma.script.count({ where }),
  ]);
  return { items: rows.map(scriptSummaryDto), total };
}

/** 后台剧本列表：manager/boss 可见全状态。 */
export async function listScriptsAdmin(q: ParsedListQuery) {
  const where: Prisma.ScriptWhereInput = q.q ? { title: { contains: q.q } } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.script.findMany({
      where,
      orderBy: SORT_ORDERS[q.sort],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { scriptTags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } } },
    }),
    prisma.script.count({ where }),
  ]);
  return { items: rows.map(scriptSummaryDto), total };
}

/** 剧本详情：id 或 slug；顾客只见 on（草稿/下架一律 404，不泄露存在），员工可见任意状态。 */
export async function getScriptDetail(idOrSlug: string, actor: Actor | null) {
  if(!actor) throw unauthenticated();
  const where: Prisma.ScriptWhereUniqueInput = /^\d+$/.test(idOrSlug)
    ? { id: dbId(idOrSlug) }
    : { slug: idOrSlug };
  const script = await prisma.script.findFirst({ where, include: scriptDetailInclude });
  if (!script) throw notFound();
  if (!isStaff(actor) && script.status !== "on") throw notFound();
  if(!isStaff(actor)){
    script.scriptDms=script.scriptDms.filter(r=>r.dm.status==="active");
    script.scriptCostumes=script.scriptCostumes.filter(r=>r.costume.status==="on");
  }
  return scriptDetailDto(script);
}

// ---------- 妆造 ----------

export async function listCostumes(q: ParsedListQuery, forAdmin: boolean) {
  const where: Prisma.CostumeWhereInput = forAdmin ? {} : { status: "on" };
  const orderBy: Prisma.CostumeOrderByWithRelationInput[] = [{ name: "asc" }, { id: "asc" }];
  const [rows, total] = await prisma.$transaction([
    prisma.costume.findMany({
      where: q.q ? { ...where, name: { contains: q.q } } : where,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.costume.count({ where: q.q ? { ...where, name: { contains: q.q } } : where }),
  ]);
  return { items: rows.map(costumeSummaryDto), total };
}

export async function getCostumeDetail(costumeId: string, actor: Actor | null, forAdmin: boolean) {
  const costume = await prisma.costume.findUnique({
    where: /^\d+$/.test(costumeId)?{id:dbId(costumeId)}:{slug:costumeId},
    include: {
      scriptCostumes: {
        include: { script: { select: { id: true, title: true, slug: true, status: true } } },
        orderBy: { scriptId: "asc" },
      },
    },
  });
  if (!costume) throw notFound();
  // 顾客/匿名仅见 on；员工可见任意状态。
  if (!forAdmin && !isStaff(actor) && costume.status !== "on") throw notFound();
  // 顾客视角：只回带上架剧本；员工视角：全部。
  const visible =
    forAdmin || isStaff(actor)
      ? costume.scriptCostumes
      : costume.scriptCostumes.filter((sc) => sc.script.status === "on");
  const dto = costumeDetailDto({
    id: costume.id,
    slug: costume.slug,
    name: costume.name,
    coverUrl: costume.coverUrl,
    images: costume.images,
    description: costume.description,
    status: costume.status,
    updatedAt: costume.updatedAt,
    scriptCostumes: visible.map((sc) => ({ script: { id: sc.script.id, title: sc.script.title, slug: sc.script.slug } })),
  });
  return dto;
}

// ---------- DM ----------

const DM_ORDER: Prisma.DmOrderByWithRelationInput[] = [
  { rating: { sort: "desc", nulls: "last" } },
  { id: "asc" },
];

export async function listDms(q: ParsedListQuery, forAdmin: boolean) {
  const base: Prisma.DmWhereInput = forAdmin ? {} : { status: "active" };
  const where: Prisma.DmWhereInput = q.q ? { ...base, user: { nickname: { contains: q.q } } } : base;
  const [rows, total] = await prisma.$transaction([
    prisma.dm.findMany({
      where,
      orderBy: DM_ORDER,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { user: { select: { nickname: true } }, dmTags: { include: { tag: true } } },
    }),
    prisma.dm.count({ where }),
  ]);
  return { items: rows.map(dmPublicDto), total };
}

export async function getDmDetail(dmId: string, actor: Actor | null, forAdmin: boolean) {
  const dm = await prisma.dm.findUnique({
    where: /^\d+$/.test(dmId)?{id:dbId(dmId)}:{slug:dmId},
    include: {
      user: { select: { nickname: true } },
      dmTags: { include: { tag: true } },
      scriptDms: {
        include: { script: { select: { id: true, title: true, slug: true, status: true } } },
        orderBy: { scriptId: "asc" },
      },
    },
  });
  if (!dm) throw notFound();
  if (!forAdmin && !isStaff(actor) && dm.status !== "active") throw notFound();
  const visible =
    forAdmin || isStaff(actor)
      ? dm.scriptDms
      : dm.scriptDms.filter((sd) => sd.script.status === "on");
  return dmDetailDto(dm, visible.map((sd) => ({ id: sd.script.id, title: sd.script.title, slug: sd.script.slug })));
}

// ---------- 标签 ----------

export async function listTags() {
  const rows = await prisma.tag.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    include: { _count: { select: { scriptTags: true, dmTags: true } } },
  });
  return rows.map((t) => tagDto(t, t._count.scriptTags + t._count.dmTags));
}

export { paginated, id };

import { dbId } from "./validation";
import { validateMedia, syncMediaReferences } from "../media/service";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { Prisma as PrismaNs } from "@prisma/client";
import type { DbTx } from "../db/prisma";
import type { Actor } from "../auth/session";
import { assertPermission } from "../auth/permissions";
import { ApiError, conflict, notFound, unprocessable } from "../http/errors";
import { ApiCodes } from "@/lib/api/contracts";
import type {
  CostumeDetailDto,
  DmPublicDto,
  ScriptDetailDto,
  TagDto,
} from "@/lib/api/contracts";
import { recordOperation } from "../audit/log";
import { enqueueOutbox } from "../events/outbox";
import {
  normalizeTagName,
  validateCostume,
  validateDmUpdate,
  validateScript,
} from "./validation";
import {
  id,
  scriptDetailDto,
  scriptDetailInclude,
  type ScriptDetailPayload,
  tagDto,
  dmPublicDto,
} from "./dto";

export interface CommandCtx {
  actor: Actor;
  ip: string;
  tx: DbTx;
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

function toBigIntArray(ids: string[]): bigint[] {
  return ids.map((s) => BigInt(s));
}

// ---------- 关联校验与替换 ----------

async function ensureRefs(
  tx: DbTx,
  field: string,
  ids: string[],
  model: "tag" | "dm" | "costume",
): Promise<void> {
  if (ids.length === 0) return;
  const where = { id: { in: toBigIntArray(ids) } };
  const found =
    model === "tag"
      ? await tx.tag.count({ where })
      : model === "dm"
        ? await tx.dm.count({ where })
        : await tx.costume.count({ where });
  if (found !== ids.length) {
    throw unprocessable(`${field} 引用了不存在的实体`, { [field]: ["存在无效 id"] });
  }
}

async function setScriptTags(tx: DbTx, scriptId: bigint, ids: string[]): Promise<void> {
  await tx.scriptTag.deleteMany({ where: { scriptId } });
  if (ids.length > 0) {
    await tx.scriptTag.createMany({ data: ids.map((tagId) => ({ scriptId, tagId: dbId(tagId) })) });
  }
}

async function setScriptCostumes(tx: DbTx, scriptId: bigint, ids: string[]): Promise<void> {
  const old=await tx.scriptCostume.findMany({where:{scriptId}});
  const affected=[...new Set([...ids.map(BigInt),...old.map(r=>r.costumeId)])];
  if(affected.length)await tx.$executeRaw`UPDATE Costume SET updatedAt=GREATEST(NOW(3),TIMESTAMPADD(MICROSECOND,1000,updatedAt)) WHERE id IN (${Prisma.join(affected)})`;
  await tx.scriptCostume.deleteMany({ where: { scriptId } });
  if (ids.length > 0) {
    await tx.scriptCostume.createMany({
      data: ids.map((costumeId) => ({ scriptId, costumeId: dbId(costumeId) })),
    });
  }
}

async function setScriptDms(tx: DbTx, scriptId: bigint, ids: string[]): Promise<void> {
  const old=await tx.scriptDm.findMany({where:{scriptId}});
  const affected=[...new Set([...ids.map(BigInt),...old.map(r=>r.dmId)])];
  if(affected.length)await tx.$executeRaw`UPDATE Dm SET updatedAt=GREATEST(NOW(3),TIMESTAMPADD(MICROSECOND,1000,updatedAt)) WHERE id IN (${Prisma.join(affected)})`;
  await tx.scriptDm.deleteMany({ where: { scriptId } });
  if (ids.length > 0) {
    await tx.scriptDm.createMany({ data: ids.map((dmId) => ({ scriptId, dmId: dbId(dmId) })) });
  }
}

async function replaceCharacters(
  tx: DbTx,
  scriptId: bigint,
  chars: { id?: string; name: string; image?: string; bio?: string; sort?: number }[],
): Promise<void> {
  const existing = await tx.scriptCharacter.findMany({ where: { scriptId } });
  const byId = new Map(existing.map((c) => [c.id.toString(), c]));
  const keep: bigint[] = [];
  for (const c of chars) {
    if (c.id) {
      const target = byId.get(c.id);
      if (!target) throw unprocessable("角色 id 不属于当前剧本", { characters: ["角色 id 不属于当前剧本"] });
      keep.push(target.id);
      await tx.scriptCharacter.update({
        where: { id: target.id },
        data: { name: c.name, image: c.image ?? null, bio: c.bio ?? null, sort: c.sort ?? 0 },
      });
    } else {
      const added = await tx.scriptCharacter.create({
        data: { scriptId, name: c.name, image: c.image ?? null, bio: c.bio ?? null, sort: c.sort ?? 0 },
      });
      keep.push(added.id);
    }
  }
  if (existing.some(c=>!keep.includes(c.id))) {
    await tx.scriptCharacter.deleteMany({ where: { scriptId, id: { in: existing.filter(c=>!keep.includes(c.id)).map(c=>c.id) } } });
  }
}

// ---------- 审计摘要（白名单字段，绝不记密码等敏感信息） ----------

function scriptSummary(s: ScriptDetailPayload): Record<string, unknown> {
 return {title:s.title,status:s.status,price:s.pricePerPlayer.toFixed(2),featured:s.featured,player_min:s.minPlayers,player_max:s.maxPlayers,duration_minutes:s.durationMinutes,slug:s.slug,tag_ids:s.scriptTags.map(r=>id(r.tagId)),dm_ids:s.scriptDms.map(r=>id(r.dmId)),costume_ids:s.scriptCostumes.map(r=>id(r.costumeId)),characters:s.characters.map(c=>({id:id(c.id),name:c.name,sort:c.sort}))};
}

function costumeSummary(c: { name: string; status: string; scriptCostumes?:{scriptId:bigint}[] }): Record<string, unknown> {
  return { name: c.name, status: c.status, script_ids:c.scriptCostumes?.map(r=>id(r.scriptId))??[] };
}


/**
 * 条件更新：data 为空时仍须尊重 updated_at（原子版本校验，count=0 ⇒ 409）。
 * Prisma 的 updateMany 对空 data 返回 count=0，不能直接据此判定版本漂移。
 */
async function versionCheckedUpdate<TData extends Record<string, unknown>>(
  apply: (data: TData) => Promise<{ count: number }>,
  data: TData,
  expectedUpdatedAt: string | undefined,
): Promise<void> {
  if(!expectedUpdatedAt) throw unprocessable("编辑必须携带 updated_at", {updated_at:["请重新加载后编辑"]});
  const updatedAt=new Date(Math.max(Date.now(), Date.parse(expectedUpdatedAt)+1));
  const res=await apply({...data,updatedAt} as TData);
  if(res.count===0) throw conflict(ApiCodes.STALE_UPDATE,"内容已被他人更新，请重新加载");
}

// ---------- 剧本命令 ----------

export async function fetchScriptDetail(tx: DbTx, scriptId: bigint): Promise<ScriptDetailPayload> {
  return tx.script.findUniqueOrThrow({ where: { id: scriptId }, include: scriptDetailInclude });
}

export async function createScript(body: Record<string, unknown>, ctx: CommandCtx): Promise<ScriptDetailDto> {
  assertPermission(ctx.actor, "content.write");
  const v = validateScript(body, false);
  await validateMedia(ctx.tx,ctx.actor,[v.cover], ["cover"]);
  await validateMedia(ctx.tx,ctx.actor,v.characters?.map(c=>c.image)??[], ["role"],undefined,v.characters?.map((_,i)=>`characters.${i}.image`));
  if (v.tagIds) await ensureRefs(ctx.tx, "tag_ids", v.tagIds, "tag");
  if (v.dmIds) await ensureRefs(ctx.tx, "dm_ids", v.dmIds, "dm");
  if (v.costumeIds) await ensureRefs(ctx.tx, "costume_ids", v.costumeIds, "costume");

  const slug = v.slug ?? `script-${randomUUID().slice(0, 12)}`;
  let script;
  try {
    script = await ctx.tx.script.create({
      data: {
        title: v.title as string,
        slug,
        coverUrl: v.cover as string,
        tagline: v.tagline ?? null,
        synopsis: v.synopsis as string,
        durationMinutes: v.durationMinutes as number,
        minPlayers: v.minPlayers as number,
        maxPlayers: v.maxPlayers as number,
        pricePerPlayer: new Prisma.Decimal(v.price as string),
        status: v.status ?? "draft",
        featured: v.featured ?? false,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict(ApiCodes.CONFLICT, "slug 已被占用");
    throw e;
  }

  if (v.tagIds) await setScriptTags(ctx.tx, script.id, v.tagIds);
  if (v.costumeIds) await setScriptCostumes(ctx.tx, script.id, v.costumeIds);
  if (v.dmIds) await setScriptDms(ctx.tx, script.id, v.dmIds);
  if (v.characters && v.characters.length > 0) {
    await ctx.tx.scriptCharacter.createMany({
      data: v.characters.map((c) => ({
        scriptId: script.id,
        name: c.name,
        image: c.image ?? null,
        bio: c.bio ?? null,
        sort: c.sort ?? 0,
      })),
    });
  }

  await recordOperation(ctx.tx, {
    actorId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    action: "script.create",
    targetType: "script",
    targetId: id(script.id),
    summaryAfter: scriptSummary(await fetchScriptDetail(ctx.tx,script.id)),
    ip: ctx.ip,
  });
  await enqueueOutbox(ctx.tx, {
    type: "catalog.changed",
    payload: { entity: "script", id: id(script.id), op: "create" },
  });
  const full=await fetchScriptDetail(ctx.tx,script.id);
  await syncMediaReferences(ctx.tx,"script",id(script.id),[full.coverUrl,...full.characters.map(c=>c.image)]);
  return scriptDetailDto(full);
}

export async function updateScript(scriptId: string, body: Record<string, unknown>, ctx: CommandCtx): Promise<ScriptDetailDto> {
  assertPermission(ctx.actor, "content.write");
  const targetId = dbId(scriptId);
  const existing = await ctx.tx.script.findUnique({ where: { id: targetId }, include:scriptDetailInclude });
  if (!existing) throw notFound();
  // An unchanged C1 cover is a no-op, not a new upload. Validate every replacement normally.
  const input={...body};if(input.cover===existing.coverUrl)delete input.cover;
  const v = validateScript(input, true);
  await validateMedia(ctx.tx,ctx.actor,[v.cover],["cover"]);
  await validateMedia(ctx.tx,ctx.actor,v.characters?.map(c=>c.image)??[], ["role"],undefined,v.characters?.map((_,i)=>`characters.${i}.image`));
  if((v.minPlayers??existing.minPlayers)>(v.maxPlayers??existing.maxPlayers)) throw unprocessable("人数区间非法",{player_min:["最少人数不能大于最多人数"]});
  if (v.tagIds) await ensureRefs(ctx.tx, "tag_ids", v.tagIds, "tag");
  if (v.dmIds) await ensureRefs(ctx.tx, "dm_ids", v.dmIds, "dm");
  if (v.costumeIds) await ensureRefs(ctx.tx, "costume_ids", v.costumeIds, "costume");

  const data: Prisma.ScriptUpdateManyMutationInput = {};
  if (v.title !== undefined) data.title = v.title;
  if (v.slug !== undefined) data.slug = v.slug;
  if (v.cover !== undefined) data.coverUrl = v.cover;
  if (v.tagline !== undefined) data.tagline = v.tagline;
  if (v.synopsis !== undefined) data.synopsis = v.synopsis;
  if (v.durationMinutes !== undefined) data.durationMinutes = v.durationMinutes;
  if (v.minPlayers !== undefined) data.minPlayers = v.minPlayers;
  if (v.maxPlayers !== undefined) data.maxPlayers = v.maxPlayers;
  if (v.price !== undefined) data.pricePerPlayer = new Prisma.Decimal(v.price);
  if (v.status !== undefined) data.status = v.status;
  if (v.featured !== undefined) data.featured = v.featured;

  // 条件更新：提供 updated_at 时按“读时版本”匹配；版本漂移 ⇒ 0 行 ⇒ 409（绝不覆盖他人修改）。
  try {
    await versionCheckedUpdate(
      (d: Prisma.ScriptUpdateManyMutationInput) =>
        ctx.tx.script.updateMany({
          where: v.updatedAt ? { id: targetId, updatedAt: new Date(v.updatedAt) } : { id: targetId },
          data: d,
        }),
      data,
      v.updatedAt,
    );
    if (v.tagIds) await setScriptTags(ctx.tx, targetId, v.tagIds);
    if (v.costumeIds) await setScriptCostumes(ctx.tx, targetId, v.costumeIds);
    if (v.dmIds) await setScriptDms(ctx.tx, targetId, v.dmIds);
    if (v.characters) await replaceCharacters(ctx.tx, targetId, v.characters);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (isUniqueViolation(e)) throw conflict(ApiCodes.CONFLICT, "slug 已被占用");
    throw e;
  }

  const updated = await ctx.tx.script.findUniqueOrThrow({ where: { id: targetId }, include:scriptDetailInclude });
  await recordOperation(ctx.tx, {
    actorId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    action: "script.update",
    targetType: "script",
    targetId: id(targetId),
    summaryBefore: scriptSummary(existing),
    summaryAfter: scriptSummary(updated),
    ip: ctx.ip,
  });
  await enqueueOutbox(ctx.tx, {
    type: "catalog.changed",
    payload: { entity: "script", id: id(targetId), op: "update" },
  });
  const full=await fetchScriptDetail(ctx.tx,targetId);
  await syncMediaReferences(ctx.tx,"script",id(targetId),[full.coverUrl,...full.characters.map(c=>c.image)]);
  return scriptDetailDto(full);
}

export async function deleteScript(scriptId: string, ctx: CommandCtx): Promise<{ deleted: string }> {
  assertPermission(ctx.actor, "content.write");
  const targetId = dbId(scriptId);
  const existing = await ctx.tx.script.findUnique({ where: { id: targetId }, include:scriptDetailInclude });
  if (!existing) throw notFound();
  // 历史场次引用：禁止物理删除（Restrict 兜底），引导走下架。
  const sessionCount = await ctx.tx.session.count({ where: { scriptId: targetId } });
  if (sessionCount > 0) throw conflict(ApiCodes.SCRIPT_IN_USE, "剧本存在场次，不能删除（可下架）");

  await recordOperation(ctx.tx, {
    actorId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    action: "script.delete",
    targetType: "script",
    targetId: id(targetId),
    summaryBefore: scriptSummary(existing),
    ip: ctx.ip,
  });
  await ctx.tx.mediaReference.deleteMany({where:{entityType:"script",entityId:scriptId}});
  await ctx.tx.script.delete({ where: { id: targetId } });
  await enqueueOutbox(ctx.tx, {
    type: "catalog.changed",
    payload: { entity: "script", id: id(targetId), op: "delete" },
  });
  return { deleted: id(targetId) };
}

// ---------- 妆造命令 ----------

async function fetchCostumeDetail(tx: DbTx, costumeId: bigint) {
  return tx.costume.findUniqueOrThrow({
    where: { id: costumeId },
    include: {
      scriptCostumes: {
        include: { script: { select: { id: true, title: true, slug: true, status: true } } },
        orderBy: { scriptId: "asc" },
      },
    },
  });
}

export async function createCostume(body: Record<string, unknown>, ctx: CommandCtx): Promise<CostumeDetailDto> {
  assertPermission(ctx.actor, "content.write");
  const v = validateCostume(body, false);
  await validateMedia(ctx.tx,ctx.actor,[v.cover,...(v.images??[])],["costume"],undefined,["cover",...(v.images??[]).map(()=>"images")]);
  const costume = await ctx.tx.costume.create({
    data: {
      name: v.name as string,
      slug: optionalSlug(body.slug)??`costume-${randomUUID().slice(0,12)}`,
      coverUrl: v.cover as string,
      images: v.images ? (v.images as unknown as PrismaNs.InputJsonValue) : Prisma.JsonNull,
      description: v.description ?? null,
      status: v.status ?? "draft",
    },
  });
  await recordOperation(ctx.tx, {
    actorId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    action: "costume.create",
    targetType: "costume",
    targetId: id(costume.id),
    summaryAfter: { ...costumeSummary(costume), script_ids:v.scriptIds??[] },
    ip: ctx.ip,
  });
  await enqueueOutbox(ctx.tx, {
    type: "catalog.changed",
    payload: { entity: "costume", id: id(costume.id), op: "create" },
  });
  if(v.scriptIds) await setCostumeScripts(ctx.tx,costume.id,v.scriptIds);
  const full = await fetchCostumeDetail(ctx.tx, costume.id);
  await syncMediaReferences(ctx.tx,"costume",id(costume.id),[full.coverUrl,...(Array.isArray(full.images)?full.images as string[]:[])]);
  return costumeDto(full);
}

export async function updateCostume(costumeId: string, body: Record<string, unknown>, ctx: CommandCtx): Promise<CostumeDetailDto> {
  assertPermission(ctx.actor, "content.write");
  const targetId = dbId(costumeId);
  const existing = await ctx.tx.costume.findUnique({ where: { id: targetId },include:{scriptCostumes:true} });
  if (!existing) throw notFound();
  const input={...body};if(input.cover===existing.coverUrl)delete input.cover;
  const v = validateCostume(input, true);
  await validateMedia(ctx.tx,ctx.actor,[v.cover,...(v.images??[])],["costume"],undefined,["cover",...(v.images??[]).map(()=>"images")]);

  const data: Prisma.CostumeUpdateManyMutationInput = {};
  if (v.name !== undefined) data.name = v.name;
  if(body.slug!==undefined)data.slug=optionalSlug(body.slug);
  if (v.cover !== undefined) data.coverUrl = v.cover;
  if (v.images !== undefined) data.images = (v.images as unknown) as PrismaNs.InputJsonValue;
  if (v.description !== undefined) data.description = v.description;
  if (v.status !== undefined) data.status = v.status;

  await versionCheckedUpdate(
    (d: Prisma.CostumeUpdateManyMutationInput) =>
      ctx.tx.costume.updateMany({
        where: v.updatedAt ? { id: targetId, updatedAt: new Date(v.updatedAt) } : { id: targetId },
        data: d,
      }),
    data,
    v.updatedAt,
  );
  if(v.scriptIds) await setCostumeScripts(ctx.tx,targetId,v.scriptIds);
  const full = await fetchCostumeDetail(ctx.tx, targetId);
  await syncMediaReferences(ctx.tx,"costume",id(targetId),[full.coverUrl,...(Array.isArray(full.images)?full.images as string[]:[])]);
  await recordOperation(ctx.tx, {
    actorId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    action: "costume.update",
    targetType: "costume",
    targetId: id(targetId),
    summaryBefore: costumeSummary(existing),
    summaryAfter: costumeSummary(full),
    ip: ctx.ip,
  });
  await enqueueOutbox(ctx.tx, {
    type: "catalog.changed",
    payload: { entity: "costume", id: id(targetId), op: "update" },
  });
  return costumeDto(full);
}

export async function deleteCostume(costumeId: string, ctx: CommandCtx): Promise<{ deleted: string }> {
  assertPermission(ctx.actor, "content.write");
  const targetId = dbId(costumeId);
  const existing = await ctx.tx.costume.findUnique({ where: { id: targetId },include:{scriptCostumes:true} });
  if (!existing) throw notFound();
  // 被剧本引用：禁止物理删除（不级联删剧本）；引导走下架。
  const refCount = await ctx.tx.scriptCostume.count({ where: { costumeId: targetId } });
  if (refCount > 0) throw conflict(ApiCodes.COSTUME_IN_USE, "妆造被剧本引用，不能删除（可下架）");

  await recordOperation(ctx.tx, {
    actorId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    action: "costume.delete",
    targetType: "costume",
    targetId: id(targetId),
    summaryBefore: costumeSummary(existing),
    ip: ctx.ip,
  });
  await ctx.tx.mediaReference.deleteMany({where:{entityType:"costume",entityId:costumeId}});
  await ctx.tx.costume.delete({ where: { id: targetId } });
  await enqueueOutbox(ctx.tx, {
    type: "catalog.changed",
    payload: { entity: "costume", id: id(targetId), op: "delete" },
  });
  return { deleted: id(targetId) };
}

function costumeDto(full: Awaited<ReturnType<typeof fetchCostumeDetail>>): CostumeDetailDto {
  const images = Array.isArray(full.images) ? (full.images as string[]).filter((u): u is string => typeof u === "string") : [];
  return {
    id: id(full.id),
    slug: full.slug,
    name: full.name,
    cover: full.coverUrl,
    updated_at: full.updatedAt.toISOString(),
    description: full.description,
    status: full.status,
    images,
    scripts: full.scriptCostumes.map((sc) => ({ id: id(sc.script.id), title: sc.script.title, slug: sc.script.slug })),
  };
}

// ---------- DM 命令 ----------

export async function updateDmProfile(dmId: string, body: Record<string, unknown>, ctx: CommandCtx): Promise<DmPublicDto> {
  const targetId = dbId(dmId);
  const existing = await ctx.tx.dm.findUnique({ where: { id: targetId },include:{user:{select:{nickname:true}},dmTags:true} });
  if (!existing) throw notFound();
  // 资源级权限：DM 仅本人；manager/boss 任意。
  assertPermission(ctx.actor, "dm.profile.write", { type: "dm_profile", dmUserId: existing.userId.toString() });

  const v = validateDmUpdate(body);
  await validateMedia(ctx.tx,ctx.actor,[v.avatar,v.photo],["dm"],existing.userId,["avatar","photo"]);
  if (ctx.actor.role === "dm" && body.status !== undefined) {
    throw unprocessable("DM 只能编辑自己的展示字段", { status: ["状态调整仅限店长"] });
  }
  if (v.tagIds) await ensureRefs(ctx.tx, "tag_ids", v.tagIds, "tag");

  const data: Prisma.DmUpdateManyMutationInput = {};
  if(body.slug!==undefined){assertPermission(ctx.actor,"content.write");data.slug=optionalSlug(body.slug);}
  if(body.name!==undefined){if(typeof body.name!=="string"||!body.name.trim()||body.name.length>40)throw unprocessable("姓名必填且最多40字",{name:["无效姓名"]});}

  if (v.bio !== undefined) data.bio = v.bio;
  if (v.avatar !== undefined) data.avatar = v.avatar;
  if (v.photo !== undefined) data.photo = v.photo;
  if (v.status !== undefined) data.status = v.status;

  await versionCheckedUpdate(
    (d: Prisma.DmUpdateManyMutationInput) =>
      ctx.tx.dm.updateMany({
        where: v.updatedAt ? { id: targetId, updatedAt: new Date(v.updatedAt) } : { id: targetId },
        data: d,
      }),
    data,
    v.updatedAt,
  );

  if(body.name!==undefined)await ctx.tx.user.update({where:{id:existing.userId},data:{nickname:(body.name as string).trim()}});
  if (v.tagIds !== null) {
    await ctx.tx.dmTag.deleteMany({ where: { dmId: targetId } });
    if (v.tagIds.length > 0) {
      await ctx.tx.dmTag.createMany({ data: v.tagIds.map((tagId) => ({ dmId: targetId, tagId: dbId(tagId) })) });
    }
  }

  const updated = await ctx.tx.dm.findUniqueOrThrow({
    where: { id: targetId },
    include: { user: { select: { nickname: true } }, dmTags: { include: { tag: true } } },
  });
  await recordOperation(ctx.tx, {
    actorId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    action: "dm.update",
    targetType: "dm",
    targetId: id(targetId),
    summaryBefore: { name:existing.user.nickname,bio: existing.bio, status: existing.status, tag_ids:existing.dmTags.map(t=>id(t.tagId)),avatar:existing.avatar,photo:existing.photo,slug:existing.slug },
    summaryAfter: { name:updated.user.nickname,bio: updated.bio, status: updated.status, tag_ids:updated.dmTags.map(t=>id(t.tagId)),avatar:updated.avatar,photo:updated.photo,slug:updated.slug },
    ip: ctx.ip,
  });
  await enqueueOutbox(ctx.tx, {
    type: "catalog.changed",
    payload: { entity: "dm", id: id(targetId), op: "update" },
  });
  await syncMediaReferences(ctx.tx,"dm",dmId,[updated.avatar,updated.photo]);
  return dmPublicDto(updated);
}

// ---------- 标签命令 ----------

async function tagWithCount(tx: DbTx, tagId: bigint): Promise<TagDto> {
  const tag = await tx.tag.findUniqueOrThrow({
    where: { id: tagId },
    include: { _count: { select: { scriptTags: true, dmTags: true } } },
  });
  return tagDto(tag, tag._count.scriptTags + tag._count.dmTags);
}

export async function createTag(body: Record<string, unknown>, ctx: CommandCtx): Promise<TagDto> {
  assertPermission(ctx.actor, "content.write");
  const name = normalizeTagName(body.name);
  let tag;
  try {
    tag = await ctx.tx.tag.create({ data: { name } });
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict(ApiCodes.CONFLICT, "同名标签已存在");
    throw e;
  }
  await recordOperation(ctx.tx, {
    actorId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    action: "tag.create",
    targetType: "tag",
    targetId: id(tag.id),
    summaryAfter: { name },
    ip: ctx.ip,
  });
  await enqueueOutbox(ctx.tx, { type: "catalog.changed", payload: { entity: "tag", id: id(tag.id), op: "create" } });
  return tagWithCount(ctx.tx, tag.id);
}

export async function renameTag(tagId: string, body: Record<string, unknown>, ctx: CommandCtx): Promise<TagDto> {
  assertPermission(ctx.actor, "content.write");
  const name = normalizeTagName(body.name);
  const targetId = dbId(tagId);
  const existing = await ctx.tx.tag.findUnique({ where: { id: targetId } });
  if (!existing) throw notFound();
  try {
    if(typeof body.updated_at!=="string"||Number.isNaN(Date.parse(body.updated_at)))throw unprocessable("缺少标签版本",{updated_at:["请刷新后重试"]});
    const result=await ctx.tx.tag.updateMany({where:{id:targetId,updatedAt:new Date(body.updated_at)},data:{name,updatedAt:new Date(Math.max(Date.now(),Date.parse(body.updated_at)+1))}});
    if(result.count!==1)throw conflict(ApiCodes.STALE_UPDATE,"标签已更新，请重新加载");
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict(ApiCodes.CONFLICT, "同名标签已存在");
    throw e;
  }
  await recordOperation(ctx.tx, {
    actorId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    action: "tag.rename",
    targetType: "tag",
    targetId: id(targetId),
    summaryBefore: { name: existing.name },
    summaryAfter: { name },
    ip: ctx.ip,
  });
  await enqueueOutbox(ctx.tx, { type: "catalog.changed", payload: { entity: "tag", id: id(targetId), op: "update" } });
  return tagWithCount(ctx.tx, targetId);
}

export async function deleteTag(tagId: string, ctx: CommandCtx): Promise<{ deleted: string }> {
  assertPermission(ctx.actor, "content.write");
  const targetId = dbId(tagId);
  const existing = await ctx.tx.tag.findUnique({ where: { id: targetId } });
  if (!existing) throw notFound();
  const usedByScript = await ctx.tx.scriptTag.count({ where: { tagId: targetId } });
  const usedByDm = await ctx.tx.dmTag.count({ where: { tagId: targetId } });
  if (usedByScript + usedByDm > 0) throw conflict(ApiCodes.TAG_IN_USE, "标签正在被引用，请先解除关联");

  await recordOperation(ctx.tx, {
    actorId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    action: "tag.delete",
    targetType: "tag",
    targetId: id(targetId),
    summaryBefore: { name: existing.name },
    ip: ctx.ip,
  });
  await ctx.tx.tag.delete({ where: { id: targetId } });
  await enqueueOutbox(ctx.tx, { type: "catalog.changed", payload: { entity: "tag", id: id(targetId), op: "delete" } });
  return { deleted: id(targetId) };
}

async function setCostumeScripts(tx:DbTx,costumeId:bigint,ids:string[]) {
 const scriptIds=ids.map(BigInt);
 if(await tx.script.count({where:{id:{in:scriptIds}}})!==ids.length)throw unprocessable("关联剧本不存在",{script_ids:["无效剧本"]});
 const old=await tx.scriptCostume.findMany({where:{costumeId}});
 const affected=[...new Set([...scriptIds,...old.map(r=>r.scriptId)])];
 // Invalidate versions of reciprocal editors, not only this costume.
 if(affected.length)await tx.$executeRaw`UPDATE Script SET updatedAt=GREATEST(NOW(3), TIMESTAMPADD(MICROSECOND,1000,updatedAt)) WHERE id IN (${Prisma.join(affected)})`;
 await tx.scriptCostume.deleteMany({where:{costumeId}});
 if(scriptIds.length)await tx.scriptCostume.createMany({data:scriptIds.map(scriptId=>({scriptId,costumeId}))});
}

function optionalSlug(value:unknown):string|undefined {
 if(value===undefined||value==='')return undefined;
 if(typeof value!=='string'||! /^(?=.*[a-z])[a-z0-9-]{1,191}$/.test(value))throw unprocessable('slug 必须包含小写字母，仅允许字母/数字/连字符',{slug:['无效分享标识']});
 return value;
}

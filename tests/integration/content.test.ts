/**
 * C2-T1 内容模型与查询服务集成测试。
 * 前置：`npm run dev:test`（.env.test）已启动，测试库已应用 C2 迁移。
 * 覆盖：匿名详情 401、公开列表无草稿、角色排序与双向关联、无效人数区间 422、
 *       重复关联不重复记录、标签管理、引用删除 409、三类排序与分页、
 *       条件更新 409、同事务审计、catalog.changed outbox。
 */
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { randomUUID, randomBytes } from "node:crypto";
import { BASE_URL, Jar, api, cleanupTestUsers, ensureSeeded, getCsrf, trackPhone, uniquePhone } from "./helpers";

const BOSS_PHONE = uniquePhone();
const BOSS_PASSWORD = "c2-boss-pw-1";
const MANAGER_PASSWORD = "c2-manager-pw-1";
const DM_PASSWORD = "c2-dm-pw-1";
const CUSTOMER_PASSWORD = "c2-customer-pw-1";
let COVER = "";
let COSTUME_COVER="";
const mediaIds:string[]=[];
const HORROR="恐怖-"+randomUUID().slice(0,8);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let ipSeq = 400;
const runIp=randomBytes(6).toString("hex").match(/.{4}/g)!.join(":");
function freshIp(): Record<string, string> {
  ipSeq += 1;
  return { "X-Forwarded-For": `fd00:${runIp}:0:0:0:${ipSeq.toString(16)}` };
}

let bossJar = new Jar();
let bossCsrf = "";
let managerJar = new Jar();
let managerCsrf = "";
let dmJar = new Jar();
let dmCsrf = "";
const customerJar = new Jar();
let dmProfileId = "";
let secondDmProfileId = "";

const createdScriptIds: string[] = [];
const createdCostumeIds: string[] = [];
const createdTagIds: string[] = [];

// 跨测试共享的实体 id
let onScriptId = "";
let draftScriptId = "";
let tagHorror = "";
let costumeId = "";
let midScriptId = "";

async function loginAs(phone: string, password: string): Promise<Jar> {
  const jar = new Jar();
  const { status, json, res } = await api("/api/auth/login", {
    method: "POST",
    headers: freshIp(),
    jar,
    body: { phone, password },
  });
  assert.equal(status, 200, `登录期望 200，实际 ${status}：${JSON.stringify(json)}`);
  jar.capture(res);
  assert.ok(jar.cookie, "登录应下发会话 Cookie");
  return jar;
}

interface CallOpts {
  method?: string;
  body?: unknown;
  key?: string;
}

function jarCall(jar: Jar, csrf: string) {
  return async (path: string, options: CallOpts = {}) => {
    let body=options.body;
    if(options.method==='PATCH' && /^\/api\/admin\/(scripts|costumes|dms)\/\d+$/.test(path) && body && typeof body==='object' && !('updated_at' in body)){
      const read=await api(path,{jar});
      if(read.status===200)body={...body,updated_at:read.json.data.updated_at};
    }
    return api(path,{method:options.method??'GET',body,jar,csrf:options.method&&options.method!=='GET'?csrf:undefined,headers:options.key?{'Idempotency-Key':options.key}:undefined});
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 测试断言需动态访问
type Call = (p: string, o?: CallOpts) => Promise<{ status: number; json: any; res: Response }>;
const notReady: Call = () => Promise.reject(new Error("会话未就绪：before() 应先初始化"));
let bossApi: Call = notReady;
let managerApi: Call = notReady;
let dmApi: Call = notReady;

function scriptBody(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: over.title ?? "雾港来信",
    cover: over.cover ?? COVER,
    tagline: over.tagline ?? "迷雾小城的一桩旧案",
    synopsis: over.synopsis ?? "一封被海浪冲上岸的信，把十年前的小城秘密重新拉回桌面。六名镇民，各藏半句真话。",
    duration_minutes: over.duration_minutes ?? 240,
    player_min: over.player_min ?? 5,
    player_max: over.player_max ?? 6,
    price: over.price ?? "168.00",
    status: over.status ?? "on",
    ...(over.tag_ids !== undefined ? { tag_ids: over.tag_ids } : {}),
    ...(over.costume_ids !== undefined ? { costume_ids: over.costume_ids } : {}),
    ...(over.dm_ids !== undefined ? { dm_ids: over.dm_ids } : {}),
    ...(over.characters !== undefined ? { characters: over.characters } : {}),
    ...(over.featured !== undefined ? { featured: over.featured } : {}),
    ...(over.updated_at !== undefined ? { updated_at: over.updated_at } : {}),
  };
}

async function createScriptOk(over: Record<string, unknown> = {}) {
  const { status, json } = await managerApi("/api/admin/scripts", {
    method: "POST",
    key: randomUUID(),
    body: scriptBody(over),
  });
  assert.equal(status, 201, `创建剧本期望 201，实际 ${status}：${JSON.stringify(json)}`);
  assert.equal(json.code, 0);
  createdScriptIds.push(json.data.id as string);
  return json.data;
}

async function createCostumeOk(over: Record<string, unknown> = {}) {
  const { status, json } = await managerApi("/api/admin/costumes", {
    method: "POST",
    key: randomUUID(),
    body: {
      name: over.name ?? "妆造·侦探大衣",
      cover: over.cover ?? COSTUME_COVER,
      images: over.images ?? [COSTUME_COVER],
      description: over.description ?? "高领深色大衣，附同色系手套，提供全套造型建议。",
      status: over.status ?? "on",
    },
  });
  assert.equal(status, 201, `创建妆造期望 201，实际 ${status}：${JSON.stringify(json)}`);
  createdCostumeIds.push(json.data.id as string);
  return json.data;
}

async function createTagOk(name: string) {
  const { status, json } = await managerApi("/api/admin/tags", {
    method: "POST",
    key: randomUUID(),
    body: { name },
  });
  assert.equal(status, 201, `创建标签期望 201，实际 ${status}：${JSON.stringify(json)}`);
  createdTagIds.push(json.data.id as string);
  return json.data;
}

before(async () => {
  await ensureSeeded();
  const { hashPassword } = await import("../../src/server/auth/password");
  const { prisma } = await import("../../src/server/db/prisma");
  const hash = await hashPassword(BOSS_PASSWORD);
  await prisma.user.upsert({
    where: { phone: BOSS_PHONE },
    update: { nickname: "C2测试店长", passwordHash: hash, role: "boss", status: "active" },
    create: { phone: BOSS_PHONE, nickname: "C2测试店长", passwordHash: hash, role: "boss", status: "active" },
  });
  trackPhone(BOSS_PHONE);
  bossJar = await loginAs(BOSS_PHONE, BOSS_PASSWORD);
  bossCsrf = await getCsrf(bossJar);
  bossApi = jarCall(bossJar, bossCsrf);

  const mPhone = trackPhone(uniquePhone());
  const mk = await bossApi("/api/admin/staff", {
    method: "POST",
    key: randomUUID(),
    body: { phone: mPhone, password: MANAGER_PASSWORD, nickname: "C2店长", role: "manager" },
  });
  assert.equal(mk.status, 201, JSON.stringify(mk.json));
  managerJar = await loginAs(mPhone, MANAGER_PASSWORD);
  managerCsrf = await getCsrf(managerJar);
  managerApi = jarCall(managerJar, managerCsrf);

  const dPhone = trackPhone(uniquePhone());
  const dk = await bossApi("/api/admin/staff", {
    method: "POST",
    key: randomUUID(),
    body: { phone: dPhone, password: DM_PASSWORD, nickname: "C2带本DM", role: "dm" },
  });
  assert.equal(dk.status, 201, JSON.stringify(dk.json));
  dmProfileId = dk.json.data.dm_profile_id as string;
  dmJar = await loginAs(dPhone, DM_PASSWORD);
  dmCsrf = await getCsrf(dmJar);

  // 第二个 DM：用于“修改他人资料 403”对照
  const d2Phone = trackPhone(uniquePhone());
  const dk2 = await bossApi("/api/admin/staff", {
    method: "POST",
    key: randomUUID(),
    body: { phone: d2Phone, password: DM_PASSWORD, nickname: "C2二号DM", role: "dm" },
  });
  assert.equal(dk2.status, 201, JSON.stringify(dk2.json));
  secondDmProfileId = dk2.json.data.dm_profile_id as string;

  const cPhone = trackPhone(uniquePhone());
  const reg = await api("/api/auth/register", {
    method: "POST",
    headers: freshIp(),
    jar: customerJar,
    body: { phone: cPhone, password: CUSTOMER_PASSWORD, nickname: "C2顾客" },
  });
  assert.equal(reg.status, 201, JSON.stringify(reg.json));
  customerJar.capture(reg.res);

  dmApi = jarCall(dmJar, dmCsrf);
  const {default:sharp}=await import('sharp');
  const bytes=await sharp({create:{width:32,height:32,channels:3,background:'#cccccc'}}).png().toBuffer();
  for(const purpose of ['script_cover','costume']){
    const form=new FormData();form.set('purpose',purpose);form.set('file',new Blob([bytes],{type:'image/png'}),'fixture.png');
    const res=await fetch(`${BASE_URL}/api/uploads`,{method:'POST',headers:{Cookie:managerJar.cookie,Origin:new URL(BASE_URL).origin,'X-CSRF-Token':managerCsrf},body:form});
    const payload=await res.json();assert.equal(res.status,201,JSON.stringify(payload));mediaIds.push(payload.data.id);
    if(purpose==='script_cover')COVER=payload.data.url;else COSTUME_COVER=payload.data.url;
  }
});

after(async () => {
  // 先清理内容（解除外键引用），再清理用户（cleanupTestUsers 会删 DM 档案）。
  const { prisma } = await import("../../src/server/db/prisma");
  const scriptIds = createdScriptIds.map((s) => BigInt(s));
  if (scriptIds.length > 0) {
    await prisma.scriptCharacter.deleteMany({ where: { scriptId: { in: scriptIds } } });
    await prisma.scriptTag.deleteMany({ where: { scriptId: { in: scriptIds } } });
    await prisma.scriptCostume.deleteMany({ where: { scriptId: { in: scriptIds } } });
    await prisma.scriptDm.deleteMany({ where: { scriptId: { in: scriptIds } } });
    await prisma.script.deleteMany({ where: { id: { in: scriptIds } } });
  }
  const costumeIds = createdCostumeIds.map((s) => BigInt(s));
  if (costumeIds.length > 0) {
    await prisma.scriptCostume.deleteMany({ where: { costumeId: { in: costumeIds } } });
    await prisma.costume.deleteMany({ where: { id: { in: costumeIds } } });
  }
  const tagIds = createdTagIds.map((s) => BigInt(s));
  if (tagIds.length > 0) {
    await prisma.scriptTag.deleteMany({ where: { tagId: { in: tagIds } } });
    await prisma.dmTag.deleteMany({ where: { tagId: { in: tagIds } } });
    await prisma.tag.deleteMany({ where: { id: { in: tagIds } } });
  }
  // 清掉本轮 catalog.changed 事件，避免 pending 队列污染 outbox 测试的批次窗口。
  for(const id of [...createdScriptIds,...createdCostumeIds])await prisma.eventOutbox.deleteMany({where:{type:'catalog.changed',payloadJson:{path:'$.id',equals:id}}});
  await prisma.mediaReference.deleteMany({where:{assetId:{in:mediaIds.map(BigInt)}}});
  const assets=await prisma.mediaAsset.findMany({where:{id:{in:mediaIds.map(BigInt)}}});
  await prisma.mediaAsset.deleteMany({where:{id:{in:mediaIds.map(BigInt)}}});
  // Test server uses isolated media roots; remove only fixture files, never user uploads.
  const {LocalStorage}=await import('../../src/server/media/local-storage');
  const storage=new LocalStorage('var/test-uploads','var/test-private-media');
  for(const a of assets){await storage.delete(a.key,a.visibility);await storage.delete(a.key.replace('.webp','-thumb.webp'),a.visibility);}
  await cleanupTestUsers();
});

test("匿名列表 200 且无草稿；匿名详情 401", async () => {
  onScriptId = (await createScriptOk({ title: "雾港来信" })).id as string;
  draftScriptId = (await createScriptOk({ title: "夜行列车", status: "draft" })).id as string;

  const anonList = await api("/api/scripts");
  assert.equal(anonList.status, 200);
  assert.equal(anonList.json.code, 0);
  const listIds = (anonList.json.data.items as { id: string }[]).map((s) => s.id);
  assert.ok(listIds.includes(onScriptId), "公开列表应包含 on 剧本");
  assert.ok(!listIds.includes(draftScriptId), "公开列表不得包含草稿");

  const anonDetail = await api(`/api/scripts/${onScriptId}`);
  assert.equal(anonDetail.status, 401, `匿名详情期望 401，实际 ${anonDetail.status}`);
  assert.equal(anonDetail.json.code, 2001);
});

test("顾客登录后可读详情；顾客看草稿详情 404；员工可读草稿", async () => {
  const detail = await api(`/api/scripts/${onScriptId}`, { jar: customerJar });
  assert.equal(detail.status, 200);
  const d = detail.json.data;
  assert.equal(d.id, onScriptId);
  assert.match(d.price, /^\d+\.\d{2}$/, "金额必须是两位小数字符串");
  assert.ok(Array.isArray(d.characters));
  assert.ok(Array.isArray(d.tags));
  assert.ok(Array.isArray(d.dms));
  assert.ok(Array.isArray(d.costumes));
  assert.equal(d.status, "on");

  const draftDetail = await api(`/api/scripts/${draftScriptId}`, { jar: customerJar });
  assert.equal(draftDetail.status, 404, "顾客不应读到草稿详情（不泄露存在）");

  const staffDetail = await api(`/api/scripts/${draftScriptId}`, { jar: managerJar });
  assert.equal(staffDetail.status, 200, "员工应可读草稿详情");
  assert.equal(staffDetail.json.data.status, "draft");
});

test("角色排序与剧本↔妆造/DM 双向关联", async () => {
  const tagCreated = await createTagOk(`  ${HORROR} `);
  tagHorror = tagCreated.id as string;
  assert.equal(tagCreated.name, HORROR, "标签名应去空白存储");

  costumeId = (await createCostumeOk()).id as string;
  midScriptId = (
    await createScriptOk({
      title: "午夜宴会",
      tag_ids: [tagHorror],
      costume_ids: [costumeId],
      dm_ids: [dmProfileId],
      characters: [
        { name: "林舟", bio: "收信人。", sort: 2 },
        { name: "阿鹤", bio: "摆渡人。", sort: 1 },
      ],
    })
  ).id as string;

  const det = await api(`/api/scripts/${midScriptId}`, { jar: customerJar });
  const chars = det.json.data.characters as { id: string; name: string }[];
  assert.deepEqual(chars.map((c) => c.name), ["阿鹤", "林舟"], "角色应按 sort 升序返回");
  assert.deepEqual((det.json.data.tags as string[]).sort(), [HORROR]);

  // 双向：妆造详情回带剧本
  const costumeDet = await api(`/api/costumes/${costumeId}`);
  assert.equal(costumeDet.status, 200);
  const costumeScripts = (costumeDet.json.data.scripts ?? []) as { id: string }[];
  assert.ok(costumeScripts.some((x) => x.id === midScriptId), "妆造详情应回带关联剧本");

  // 双向：DM 详情回带剧本；公开投影不含 phone/role
  const dmList = await api("/api/dms");
  assert.equal(dmList.status, 200);
  const dmRow = (dmList.json.data.items as Record<string, unknown>[]).find((x) => x.id === dmProfileId);
  assert.ok(dmRow, "DM 列表应包含 active DM");
  assert.ok(!("phone" in dmRow) && !("role" in dmRow), "DM 公开投影不得暴露手机号/角色");
  const dmDet = await api(`/api/dms/${dmProfileId}`);
  assert.equal(dmDet.status, 200);
  assert.ok(
    ((dmDet.json.data.scripts ?? []) as { id: string }[]).some((x) => x.id === midScriptId),
    "DM 详情应回带带过剧本",
  );

  // 角色重排（PATCH 仅提交 characters → 整体替换角色集合）
  const reordered = await managerApi(`/api/admin/scripts/${midScriptId}`, {
    method: "PATCH",
    key: randomUUID(),
    body: {
      characters: [
        { id: chars[1].id, name: "阿鹤", bio: "摆渡人。", sort: 1 },
        { id: chars[0].id, name: "林舟", bio: "收信人。", sort: 2 },
      ],
    },
  });
  assert.equal(reordered.status, 200, JSON.stringify(reordered.json));
  const det2 = await api(`/api/scripts/${midScriptId}`, { jar: customerJar });
  assert.deepEqual((det2.json.data.characters as { name: string }[]).map((c) => c.name), ["阿鹤", "林舟"]);
});

test("无效人数区间/缺失必填/非法价格 422（字段级定位）", async () => {
  const r1 = await managerApi("/api/admin/scripts", {
    method: "POST",
    key: randomUUID(),
    body: scriptBody({ player_min: 8, player_max: 6 }),
  });
  assert.equal(r1.status, 422, JSON.stringify(r1.json));
  assert.equal(r1.json.code, 1001);
  assert.ok(r1.json.field_errors?.player_min || r1.json.field_errors?.player_max, "人数区间错误应定位到字段");

  const r2 = await managerApi("/api/admin/scripts", {
    method: "POST",
    key: randomUUID(),
    body: scriptBody({ title: "   " }),
  });
  assert.equal(r2.status, 422);
  assert.ok(r2.json.field_errors?.title);

  const r3 = await managerApi("/api/admin/scripts", {
    method: "POST",
    key: randomUUID(),
    body: scriptBody({ price: "abc" }),
  });
  assert.equal(r3.status, 422);

  const r4 = await managerApi("/api/admin/scripts", {
    method: "POST",
    key: randomUUID(),
    body: scriptBody({ status: "published" }),
  });
  assert.equal(r4.status, 422, "C2 状态机仅 draft/on/off");
});

test("顾客/DM 不得写内容（CSRF 合法时 403），匿名 401", async () => {
  const anon = await api("/api/admin/scripts", { method: "POST", body: scriptBody() });
  assert.equal(anon.status, 401);

  const custCsrf = await getCsrf(customerJar);
  const cust = await api("/api/admin/scripts", {
    method: "POST",
    jar: customerJar,
    csrf: custCsrf,
    headers: { "Idempotency-Key": randomUUID() },
    body: scriptBody(),
  });
  assert.equal(cust.status, 403, JSON.stringify(cust.json));
  assert.equal(cust.json.code, 2002);

  const dm = await dmApi("/api/admin/scripts", { method: "POST", key: randomUUID(), body: scriptBody() });
  assert.equal(dm.status, 403, "DM 无内容维护权限");
  assert.equal(dm.json.code, 2002);
});

test("重复关联不重复记录（tag_ids/costume_ids/dm_ids 去重）", async () => {
  const s = await createScriptOk({
    tag_ids: [tagHorror, tagHorror],
    costume_ids: [costumeId, costumeId, costumeId],
    dm_ids: [dmProfileId, dmProfileId],
  });
  const { prisma } = await import("../../src/server/db/prisma");
  const sid = BigInt(s.id as string);
  assert.equal(await prisma.scriptTag.count({ where: { scriptId: sid } }), 1, "重复 tag_ids 不得重复建关系");
  assert.equal(await prisma.scriptCostume.count({ where: { scriptId: sid } }), 1, "重复 costume_ids 不得重复建关系");
  assert.equal(await prisma.scriptDm.count({ where: { scriptId: sid } }), 1, "重复 dm_ids 不得重复建关系");

  // 收尾解除该剧本的全部关联，避免污染后续“被引用删除”测试的引用计数。
  const clean = await managerApi(`/api/admin/scripts/${s.id}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { tag_ids: [], costume_ids: [], dm_ids: [] },
  });
  assert.equal(clean.status, 200, JSON.stringify(clean.json));
});

test("标签管理：唯一 409；被引用删除 409；解除后删除成功", async () => {
  const dup = await managerApi("/api/admin/tags", { method: "POST", key: randomUUID(), body: { name: HORROR } });
  assert.equal(dup.status, 409, "重名标签应 409");
  assert.equal(dup.json.code, 3001);

  const delUsed = await managerApi(`/api/admin/tags/${tagHorror}`, { method: "DELETE", key: randomUUID() });
  assert.equal(delUsed.status, 409, "被剧本引用的标签不能直接删除");

  const unlinked = await managerApi(`/api/admin/scripts/${midScriptId}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { tag_ids: [] },
  });
  assert.equal(unlinked.status, 200, JSON.stringify(unlinked.json));
  const delFree = await managerApi(`/api/admin/tags/${tagHorror}`, { method: "DELETE", key: randomUUID() });
  assert.equal(delFree.status, 200, `解除引用后应可删除标签：${JSON.stringify(delFree.json)}`);
});

test("引用删除 409：被剧本引用的妆造不可物理删除；允许下架", async () => {
  const del = await managerApi(`/api/admin/costumes/${costumeId}`, { method: "DELETE", key: randomUUID() });
  assert.equal(del.status, 409, "被引用妆造不得物理删除（不级联删剧本）");

  const off = await managerApi(`/api/admin/costumes/${costumeId}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { status: "off" },
  });
  assert.equal(off.status, 200, "允许下架而非删除");

  const unlink = await managerApi(`/api/admin/scripts/${midScriptId}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { costume_ids: [] },
  });
  assert.equal(unlink.status, 200);
  const del2 = await managerApi(`/api/admin/costumes/${costumeId}`, { method: "DELETE", key: randomUUID() });
  assert.equal(del2.status, 200, `解除引用后可删除：${JSON.stringify(del2.json)}`);
  createdCostumeIds.pop();
});

test("排序/分页/搜索：价格双排序、latest、rating 无评价不伪造", async () => {
  const a = (await createScriptOk({ title: "排序·低价", price: "99.00" })).id as string;
  const high = await createScriptOk({ title: "排序·高价", price: "299.00" });
  const mid = await createScriptOk({ title: "排序·中间", price: "168.00" });
  const last = (await createScriptOk({ title: "排序·中间二号", price: "168.00" })).id as string;
  void high;
  void mid;

  const asc = await api("/api/scripts?sort=price_asc&page=1&page_size=50");
  assert.equal(asc.status, 200);
  const ascPrices = (asc.json.data.items as { price: string }[]).map((x) => Number(x.price));
  for (let i = 1; i < ascPrices.length; i++) assert.ok(ascPrices[i - 1] <= ascPrices[i], "price_asc 应单调不降");
  assert.equal((asc.json.data.items as { title: string }[])[0].title, "排序·低价");

  const desc = await api("/api/scripts?sort=price_desc");
  const descPrices = (desc.json.data.items as { price: string }[]).map((x) => Number(x.price));
  for (let i = 1; i < descPrices.length; i++) assert.ok(descPrices[i - 1] >= descPrices[i], "price_desc 应单调不升");

  const latest = await api("/api/scripts?sort=latest");
  assert.equal((latest.json.data.items as { id: string }[])[0].id, last, "latest 最新创建在前（同刻按 id 决并列）");

  const rating = await api("/api/scripts?sort=rating");
  for (const x of rating.json.data.items as { review_count: number }[]) {
    assert.equal(x.review_count, 0, "无评价时 review_count 必须为 0，不伪造评分");
  }

  const p1 = await api("/api/scripts?page=1&page_size=2");
  assert.equal(p1.json.data.page_info.page_size, 2);
  assert.equal((p1.json.data.items as unknown[]).length, 2);
  const total = p1.json.data.page_info.total as number;
  const pages = p1.json.data.page_info.total_pages as number;
  assert.equal(pages, Math.ceil(total / 2));
  const p2 = await api(`/api/scripts?page=${Math.min(2, pages)}&page_size=2`);
  assert.notEqual((p1.json.data.items as { id: string }[])[0].id, (p2.json.data.items as { id: string }[])[0].id);

  const bad = await api("/api/scripts?page=0");
  assert.equal(bad.status, 422, "page=0 应 422");
  const badSort = await api("/api/scripts?sort=hack");
  assert.equal(badSort.status, 422, "非法 sort 应 422");

  const found = await api("/api/scripts?q=" + encodeURIComponent("排序·低价"));
  const foundItems = found.json.data.items as { id: string; title: string }[];
  assert.ok(foundItems.length > 0);
  assert.ok(foundItems.every((x) => x.title.includes("排序")), "搜索应只命中标题包含关键词的剧本");
  assert.ok(foundItems.some((x) => x.id === a));
});

test("DM 自改展示字段成功；改他人 403；manager 可改任意", async () => {
  const self = await dmApi(`/api/admin/dms/${dmProfileId}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { bio: "带过十本以上的本格老玩家。" },
  });
  assert.equal(self.status, 200, JSON.stringify(self.json));
  assert.equal(self.json.data.bio, "带过十本以上的本格老玩家。");

  const other = await dmApi(`/api/admin/dms/${secondDmProfileId}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { bio: "越权修改。" },
  });
  assert.equal(other.status, 403, "DM 改他人资料必须 403");
  assert.equal(other.json.code, 2002);

  const byManager = await managerApi(`/api/admin/dms/${secondDmProfileId}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { bio: "店长代维护。" },
  });
  assert.equal(byManager.status, 200, "manager 可管理任意 DM 资料");
});

test("员工内容写含同事务审计与 catalog.changed outbox", async () => {
  const { prisma } = await import("../../src/server/db/prisma");
  const s = (await createScriptOk({ title: "审计样本文本" })).id as string;

  const upd = await managerApi(`/api/admin/scripts/${s}`, { method: "PATCH", key: randomUUID(), body: { status: "off" } });
  assert.equal(upd.status, 200, JSON.stringify(upd.json));
  const logs = await prisma.operationLog.findMany({ where: { targetId: s }, orderBy: { id: "desc" } });
  assert.ok(logs.some((l) => l.action.endsWith("update")), "更新应有审计");
  const updLog = logs.find((l) => l.action.endsWith("update"))!;
  assert.equal((updLog.summaryAfter as { status?: string })?.status, "off", "审计后摘要应含新状态");
  assert.ok((updLog.summaryBefore as { status?: string })?.status, "审计前摘要应有值");

  const evts = await prisma.eventOutbox.findMany({ where: { type: "catalog.changed" } });
  assert.ok(evts.length >= 1, "内容变更应入队 catalog.changed");

  const del = await managerApi(`/api/admin/scripts/${s}`, { method: "DELETE", key: randomUUID() });
  assert.equal(del.status, 200);
  const logs2 = await prisma.operationLog.findMany({ where: { targetId: s } });
  assert.ok(logs2.some((l) => l.action.endsWith("delete")), "删除应有审计");
  createdScriptIds.pop();
});

test("条件更新：陈旧 updated_at 409，不覆盖他人修改", async () => {
  const s = (await createScriptOk({ title: "并发样本", tagline: "原标语" })).id as string;
  const read1 = await api(`/api/scripts/${s}`, { jar: managerJar });
  assert.equal(read1.status, 200);
  const staleAt = read1.json.data.updated_at as string;

  const bump = await bossApi(`/api/admin/scripts/${s}`, { method: "PATCH", key: randomUUID(), body: { tagline: "老板改过" } });
  assert.equal(bump.status, 200);
  // updated_at 为毫秒精度：若与读时版本落在同一毫秒则再次 bump，直到版本推进（最多 20 次）。
  let guard = 0;
  while (guard < 20) {
    const cur = await api(`/api/scripts/${s}`, { jar: managerJar });
    if ((cur.json.data.updated_at as string) !== staleAt) break;
    await sleep(25);
    await bossApi(`/api/admin/scripts/${s}`, { method: "PATCH", key: randomUUID(), body: { tagline: "老板改过" } });
    guard += 1;
  }

  const stale = await managerApi(`/api/admin/scripts/${s}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { tagline: "陈旧覆盖", updated_at: staleAt },
  });
  assert.equal(stale.status, 409, JSON.stringify(stale.json));

  const check = await api(`/api/scripts/${s}`, { jar: managerJar });
  assert.equal(check.json.data.tagline, "老板改过", "陈旧提交不得覆盖新值");
});


test('C2 regression: missing version, relation-only stale update, mixed role replace and partial player bounds', async()=>{
 const s=await createScriptOk({characters:[{name:'旧角色',bio:'旧背景'}]});
 const raw=await api(`/api/admin/scripts/${s.id}`,{method:'PATCH',jar:managerJar,csrf:managerCsrf,headers:{'Idempotency-Key':randomUUID()},body:{tagline:'不可无版本覆盖'}});
 assert.equal(raw.status,422);
 const first=await managerApi(`/api/admin/scripts/${s.id}`,{method:'PATCH',key:randomUUID(),body:{updated_at:s.updated_at,characters:[{name:'新角色',bio:'新背景'}]}});
 assert.equal(first.status,200,JSON.stringify(first.json));assert.equal(first.json.data.characters.length,1);assert.equal(first.json.data.characters[0].name,'新角色');
 const stale=await managerApi(`/api/admin/scripts/${s.id}`,{method:'PATCH',key:randomUUID(),body:{updated_at:s.updated_at,characters:[]}});assert.equal(stale.status,409);
 const bound=await managerApi(`/api/admin/scripts/${s.id}`,{method:'PATCH',key:randomUUID(),body:{player_min:9}});assert.equal(bound.status,422);
 const {getScriptDetail}=await import('../../src/server/catalog/queries');
 await assert.rejects(()=>getScriptDetail(s.id,null),(e:unknown)=>typeof e==='object'&&e!==null&&'status' in e&&e.status===401);
});

test('C2 page/RSC guest requests never contain restricted synopsis', async()=>{
 const marker='PRIVATE-'+randomUUID();const s=await createScriptOk({synopsis:marker});
 for(const headers of [{},{RSC:'1','Next-Router-Prefetch':'1'}] as Record<string,string>[]){
  const res=await fetch(`${BASE_URL}/scripts/${s.slug}`,{headers,redirect:'manual'});const text=await res.text();assert.ok(!text.includes(marker));
  assert.ok([200,307,303].includes(res.status));
 }
 const logged=await fetch(`${BASE_URL}/scripts/${s.slug}`,{headers:{Cookie:customerJar.cookie}});assert.equal(logged.status,200);assert.ok((await logged.text()).includes(marker));
});


test('C1 legacy covers survive ordinary edits, but arbitrary replacements remain forbidden',async()=>{
 const {prisma}=await import('../../src/server/db/prisma');
 const script=await createScriptOk({title:'旧素材兼容'});
 const legacy='/43947e6d13429e6e24ef2f82a3ac0265.jpg';
 await prisma.script.update({where:{id:BigInt(script.id)},data:{coverUrl:legacy}});
 const saved=await managerApi(`/api/admin/scripts/${script.id}`,{method:'PATCH',key:randomUUID(),body:{title:'旧素材可继续编辑',cover:legacy}});
 assert.equal(saved.status,200,JSON.stringify(saved.json));assert.equal(saved.json.data.cover,legacy);
 const rejected=await managerApi(`/api/admin/scripts/${script.id}`,{method:'PATCH',key:randomUUID(),body:{cover:'/unregistered.jpg'}});
 assert.equal(rejected.status,422);assert.ok(rejected.json.field_errors?.cover??rejected.json.data?.field_errors?.cover);
});

import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { BASE_URL, trackPhone, uniquePhone, cleanupTestUsers } from "./helpers";
import { prisma } from "../../src/server/db/prisma";
import { redis } from "../../src/server/db/redis";
import {
  createSession,
  revokeUserSessions,
} from "../../src/server/auth/session";
import { getSessionConfig } from "../../src/server/config";
import { processOutboxBatch } from "../../src/server/notifications/dispatch";
import {
  cachedSessions,
  invalidateSessions,
} from "../../src/server/sessions/cache";
const users: bigint[] = [],
  sids: string[] = [],
  rids: string[] = [];
let scriptId: string, dmId: string;
type Client = (
  path: string,
  method?: string,
  body?: unknown,
  key?: string,
) => Promise<{
  status: number;
  json: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic HTTP assertions in the test harness.
    data: Record<string, any>;
    message: string;
    field_errors?: Record<string, string[]>;
  };
}>;
let dm: Client, a: Client, b: Client, boss: Client;
let aId: bigint, bId: bigint;
const future = new Date(Date.now() + 7 * 86400000).toISOString();
const person = { name: "测试联系人", phone: "13800000001" };
async function client(
  role: "dm" | "customer" | "boss",
): Promise<[Client, bigint]> {
  const u = await prisma.user.create({
    data: {
      phone: trackPhone(uniquePhone()),
      nickname: "C3测试" + role,
      passwordHash: "test-only-not-login",
      role,
    },
  });
  users.push(u.id);
  const s = await createSession(u.id.toString(), role);
  return [
    async (path, method = "GET", body, key = randomUUID()) => {
      const r = await fetch(BASE_URL + path, {
        method,
        headers: {
          Cookie: `${getSessionConfig().cookieName}=${s.token}`,
          Origin: new URL(BASE_URL).origin,
          "X-CSRF-Token": s.csrfToken,
          "Idempotency-Key": key,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: r.status, json: await r.json() };
    },
    u.id,
  ];
}
function input(extra: Record<string, unknown> = {}) {
  return {
    script_id: scriptId,
    primary_dm_id: dmId,
    start_time: future,
    player_min: 2,
    player_max: 3,
    status: "open",
    ...extra,
  };
}
async function session(extra: Record<string, unknown> = {}) {
  const r = await dm("/api/admin/sessions", "POST", input(extra));
  assert.equal(r.status, 201, JSON.stringify(r.json));
  sids.push(r.json.data.id);
  return r.json.data;
}
before(async () => {
  let did: bigint;
  [dm, did] = await client("dm");
  [a, aId] = await client("customer");
  [b, bId] = await client("customer");
  [boss] = await client("boss");
  const d = await prisma.dm.create({ data: { userId: did, status: "active" } });
  dmId = d.id.toString();
  const script = await prisma.script.create({
    data: {
      slug: "c3-" + randomUUID(),
      title: "C3并发测试",
      coverUrl: "/43947e6d13429e6e24ef2f82a3ac0265.jpg",
      synopsis: "测试",
      durationMinutes: 180,
      minPlayers: 2,
      maxPlayers: 6,
      pricePerPlayer: "168.00",
      status: "on",
      scriptDms: { create: { dmId: d.id } },
    },
  });
  scriptId = script.id.toString();
});
after(async () => {
  const events = await prisma.eventOutbox.findMany({
    where: {
      OR: users.map((uid) => ({
        payloadJson: { path: "$.actorUserId", equals: uid.toString() },
      })),
    },
    select: { id: true },
  });
  await prisma.$transaction(async (tx) => {
    for (const e of events) {
      await tx.$queryRaw`SELECT id FROM event_outbox WHERE id=${e.id} FOR UPDATE`;
      await tx.notification.deleteMany({
        where: { eventId: `outbox:${e.id}` },
      });
      await tx.eventOutbox.deleteMany({ where: { id: e.id } });
    }
  });
  await prisma.bookingRequest.deleteMany({ where: { userId: { in: users } } });
  await prisma.booking.deleteMany({
    where: { session: { scriptId: BigInt(scriptId) } },
  });
  await prisma.session.deleteMany({ where: { scriptId: BigInt(scriptId) } });
  await prisma.script.delete({ where: { id: BigInt(scriptId) } });
  for (const uid of users) await revokeUserSessions(uid.toString());
  await cleanupTestUsers();
  await redis().quit();
  await prisma.$disconnect();
});
test("C3 permissions, one-script DM relations, defaults, validation and manual state boundaries", async () => {
  assert.equal((await a("/api/admin/sessions", "POST", input())).status, 403);
  assert.equal(
    (await dm("/api/admin/sessions", "POST", input({ backup_dm_ids: [dmId] })))
      .status,
    422,
  );
  assert.equal(
    (
      await dm(
        "/api/admin/sessions",
        "POST",
        input({ player_min: 4, player_max: 3 }),
      )
    ).status,
    422,
  );
  assert.equal(
    (await dm("/api/admin/sessions", "POST", input({ status: "locked" })))
      .status,
    422,
  );
  const s = await session();
  assert.equal(s.price, "168.00");
  const override = await session({ price: "129.50", status: "draft" });
  assert.equal(override.price, "129.50");
  const opened = await dm(`/api/admin/sessions/${override.id}`, "PATCH", {
    status: "open",
    updated_at: override.updated_at,
  });
  assert.equal(opened.status, 200);
  assert.equal(
    (
      await dm(`/api/admin/sessions/${s.id}`, "PATCH", {
        status: "finished",
        updated_at: s.updated_at,
      })
    ).status,
    409,
  );
  const publicRows = await (
    await fetch(BASE_URL + "/api/sessions?script_id=" + scriptId)
  ).json();
  assert.ok(!JSON.stringify(publicRows).includes(person.phone));
  assert.ok(!JSON.stringify(publicRows).includes("contact"));
});
test("C3 atomic capacity: two teams of 2 racing for 3 spaces, idempotency and payload mismatch", async () => {
  const s = await session();
  const keys = [randomUUID(), randomUUID()],
    clients = [a, b];
  const results = await Promise.all(
    clients.map((c, i) =>
      c(
        `/api/sessions/${s.id}/bookings`,
        "POST",
        { player_count: 2, contact: person },
        keys[i],
      ),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const win = results.findIndex((r) => r.status === 201);
  const replay = await clients[win](
    `/api/sessions/${s.id}/bookings`,
    "POST",
    { player_count: 2, contact: person },
    keys[win],
  );
  assert.equal(replay.status, 201);
  assert.equal(replay.json.data.id, results[win].json.data.id);
  assert.equal(
    (
      await clients[win](
        `/api/sessions/${s.id}/bookings`,
        "POST",
        { player_count: 1, contact: person },
        keys[win],
      )
    ).status,
    409,
  );
  const row = await prisma.session.findUniqueOrThrow({
    where: { id: BigInt(s.id) },
  });
  assert.equal(row.bookedCount, 2);
  assert.equal(
    (
      await prisma.booking.aggregate({
        where: { sessionId: row.id, status: "joined" },
        _sum: { playerCount: true },
      })
    )._sum.playerCount,
    2,
  );
});
test("C3 full never locks; cancellation releases once, privacy and C4/deposit guards", async () => {
  const s = await session();
  const joined = await a(`/api/sessions/${s.id}/bookings`, "POST", {
    player_count: 3,
    contact: person,
  });
  assert.equal(joined.status, 201);
  assert.equal(joined.json.data.session.status, "full");
  const bid = joined.json.data.id;
  assert.equal((await b("/api/bookings/" + bid, "DELETE")).status, 403);
  await prisma.booking.update({
    where: { id: BigInt(bid) },
    data: { depositRecorded: true },
  });
  assert.equal((await a("/api/bookings/" + bid, "DELETE")).status, 409);
  await prisma.booking.update({
    where: { id: BigInt(bid) },
    data: { depositRecorded: false },
  });
  const cancelled = await Promise.all([
    a("/api/bookings/" + bid, "DELETE"),
    a("/api/bookings/" + bid, "DELETE"),
  ]);
  assert.ok(cancelled.every((x) => x.status === 200));
  const row = await prisma.session.findUniqueOrThrow({
    where: { id: BigInt(s.id) },
  });
  assert.equal(row.bookedCount, 0);
  assert.equal(row.status, "open");
  const protectedS = await session();
  const j = await a(`/api/sessions/${protectedS.id}/bookings`, "POST", {
    player_count: 1,
    contact: person,
  });
  await prisma.session.update({
    where: { id: BigInt(protectedS.id) },
    data: { status: "locked" },
  });
  assert.equal(
    (await a("/api/bookings/" + j.json.data.id, "DELETE")).status,
    409,
  );
});
test("C3 committed promises, capacity edits, stale versions and merchant cancellation share the same lock", async () => {
  const s = await session();
  const j = await a(`/api/sessions/${s.id}/bookings`, "POST", {
    player_count: 2,
    contact: person,
  });
  const v = j.json.data.session.updated_at;
  assert.equal(
    (
      await dm(`/api/admin/sessions/${s.id}`, "PATCH", {
        price: "100.00",
        updated_at: v,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await dm(`/api/admin/sessions/${s.id}`, "PATCH", {
        player_max: 1,
        updated_at: v,
      })
    ).status,
    409,
  );
  const ok = await dm(`/api/admin/sessions/${s.id}`, "PATCH", {
    player_max: 2,
    remark: "备注",
    updated_at: v,
  });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.data.status, "full");
  assert.equal(
    (
      await dm(`/api/admin/sessions/${s.id}`, "PATCH", {
        remark: "旧覆盖",
        updated_at: v,
      })
    ).status,
    409,
  );
  const cancel = await dm(`/api/admin/sessions/${s.id}`, "PATCH", {
    status: "cancelled",
    updated_at: ok.json.data.updated_at,
  });
  assert.equal(cancel.status, 200, JSON.stringify(cancel.json));
  assert.equal(cancel.json.data.booked_count, 0);
  assert.equal(
    (
      await prisma.booking.findUniqueOrThrow({
        where: { id: BigInt(j.json.data.id) },
      })
    ).status,
    "cancelled",
  );
});
async function request() {
  const r = await a("/api/booking-requests", "POST", {
    script_id: scriptId,
    expected_time: future,
    player_count: 3,
    remark: "三人申请",
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  rids.push(r.json.data.id);
  return r.json.data;
}
function approval() {
  return {
    primary_dm_id: dmId,
    backup_dm_ids: [],
    start_time: future,
    player_min: 2,
    player_max: 3,
    price: "168.00",
  };
}
test("D01 auto-book approval races create exactly one session, one team, three occupied spaces", async () => {
  const r = await request();
  assert.equal(
    (await a(`/api/admin/booking-requests/${r.id}/approve`, "POST", approval()))
      .status,
    403,
  );
  const key = randomUUID();
  const results = await Promise.all([
    dm(`/api/admin/booking-requests/${r.id}/approve`, "POST", approval(), key),
    boss(`/api/admin/booking-requests/${r.id}/approve`, "POST", approval()),
  ]);
  assert.deepEqual(results.map((x) => x.status).sort(), [200, 409]);
  const winner = results.find((x) => x.status === 200)!;
  const sid = winner.json.data.session_id;
  sids.push(sid);
  const s = await prisma.session.findUniqueOrThrow({
    where: { id: BigInt(sid) },
  });
  assert.equal(s.source, "customer");
  assert.equal(s.initiatorUserId, aId);
  assert.equal(s.bookedCount, 3);
  assert.equal(s.status, "full");
  assert.equal(await prisma.booking.count({ where: { sessionId: s.id } }), 1);
  assert.equal(
    (
      await dm(`/api/admin/booking-requests/${r.id}/reject`, "POST", {
        reason: "后来的结论",
      })
    ).status,
    409,
  );
  const mine = await a("/api/me/bookings");
  assert.ok(
    mine.json.data.items.some(
      (x: { session_id: string }) => x.session_id === sid,
    ),
  );
  const other = await b("/api/me/bookings");
  assert.ok(
    !other.json.data.items.some(
      (x: { session_id: string }) => x.session_id === sid,
    ),
  );
});
test("approval/rejection race, invalid snapshots rollback, original time cannot be silently changed", async () => {
  const r = await request();
  assert.equal(
    (
      await dm(`/api/admin/booking-requests/${r.id}/approve`, "POST", {
        ...approval(),
        start_time: new Date(Date.parse(future) + 3600000).toISOString(),
      })
    ).status,
    422,
  );
  await prisma.bookingRequest.update({
    where: { id: BigInt(r.id) },
    data: { contactPhone: "" },
  });
  assert.equal(
    (
      await dm(
        `/api/admin/booking-requests/${r.id}/approve`,
        "POST",
        approval(),
      )
    ).status,
    422,
  );
  assert.equal(
    (
      await prisma.bookingRequest.findUniqueOrThrow({
        where: { id: BigInt(r.id) },
      })
    ).status,
    "pending",
  );
  await prisma.bookingRequest.update({
    where: { id: BigInt(r.id) },
    data: { contactPhone: person.phone },
  });
  const race = await Promise.all([
    dm(`/api/admin/booking-requests/${r.id}/approve`, "POST", approval()),
    boss(`/api/admin/booking-requests/${r.id}/reject`, "POST", {
      reason: "时间不合适",
    }),
  ]);
  assert.deepEqual(race.map((x) => x.status).sort(), [200, 409]);
  const r2 = await request();
  const rejected = await dm(
    `/api/admin/booking-requests/${r2.id}/reject`,
    "POST",
    { reason: "主 DM 无法出席" },
  );
  assert.equal(rejected.status, 200);
  assert.equal(rejected.json.data.session_id, null);
});
test("real running worker delivers automatically; replay deduplicates; read is owner-only and all-or-nothing", async () => {
  const r = await request();
  await dm(`/api/admin/booking-requests/${r.id}/reject`, "POST", {
    reason: "测试拒绝",
  });
  const event = await prisma.eventOutbox.findFirstOrThrow({
    where: {
      type: "booking_request.rejected",
      payloadJson: { path: "$.subjectId", equals: r.id },
    },
  });
  let notification = await prisma.notification.findFirst({
    where: { eventId: `outbox:${event.id}`, userId: aId },
  });
  for (let i = 0; i < 80 && !notification; i++) {
    await new Promise((r) => setTimeout(r, 100));
    notification = await prisma.notification.findFirst({
      where: { eventId: `outbox:${event.id}`, userId: aId },
    });
  }
  assert.ok(
    notification,
    "worker must be running; no manual dispatcher used before this assertion",
  );
  await prisma.eventOutbox.update({
    where: { id: event.id },
    data: { status: "pending" },
  });
  await processOutboxBatch(10, [event.id]);
  assert.equal(
    await prisma.notification.count({
      where: { eventId: `outbox:${event.id}`, userId: aId },
    }),
    1,
  );
  const own = await prisma.notification.create({
    data: { userId: bId, type: "test", title: "own", body: "own" },
  });
  const forbidden = await b("/api/notifications/read", "POST", {
    ids: [own.id.toString(), notification.id.toString()],
  });
  assert.equal(forbidden.status, 403);
  assert.equal(
    (await prisma.notification.findUniqueOrThrow({ where: { id: own.id } }))
      .readAt,
    null,
  );
  assert.equal(
    (
      await a("/api/notifications/read", "POST", {
        ids: [notification.id.toString()],
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await a("/api/notifications/read", "POST", {
        ids: [notification.id.toString()],
      })
    ).status,
    200,
  );
  const list = await b("/api/notifications");
  assert.ok(
    !list.json.data.items.some(
      (x: { id: string }) => x.id === notification.id.toString(),
    ),
  );
});
test("Redis cache failure falls back to DB and invalidation failure cannot undo business commit", async () => {
  const client = redis(),
    oldGet = client.get,
    oldIncr = client.incr;
  try {
    client.get = (async () => {
      throw new Error("injected cache read outage");
    }) as typeof client.get;
    client.incr = (async () => {
      throw new Error("injected invalidation outage");
    }) as typeof client.incr;
    assert.equal(await cachedSessions("fault", async () => 42), 42);
    await invalidateSessions();
  } finally {
    client.get = oldGet;
    client.incr = oldIncr;
  }
  const r = await request();
  const e = await prisma.eventOutbox.findFirstOrThrow({
    where: {
      type: "booking_request.created",
      payloadJson: { path: "$.subjectId", equals: r.id },
    },
  });
  try {
    client.incr = (async () => {
      throw new Error("injected dispatch outage");
    }) as typeof client.incr;
    await processOutboxBatch(1, [e.id]);
  } finally {
    client.incr = oldIncr;
  }
  assert.equal(
    (
      await prisma.bookingRequest.findUniqueOrThrow({
        where: { id: BigInt(r.id) },
      })
    ).status,
    "pending",
  );
  await prisma.eventOutbox.updateMany({
    where: { id: e.id, status: "pending" },
    data: { nextRetryAt: null },
  });
  await processOutboxBatch(1, [e.id]);
  assert.equal(
    (await prisma.eventOutbox.findUniqueOrThrow({ where: { id: e.id } }))
      .status,
    "delivered",
  );
});

test("capacity resize versus join, and cancel versus join, never violate the occupied-sum invariant", async () => {
  for (let i = 0; i < 5; i++) {
    const s = await session({ player_max: 4 });
    const results = await Promise.all([
      a(`/api/sessions/${s.id}/bookings`, "POST", {
        player_count: 3,
        contact: person,
      }),
      dm(`/api/admin/sessions/${s.id}`, "PATCH", {
        player_max: 2,
        updated_at: s.updated_at,
      }),
    ]);
    assert.ok(results.some((x) => x.status === 409));
    const current = await prisma.session.findUniqueOrThrow({
      where: { id: BigInt(s.id) },
    });
    assert.ok(current.bookedCount <= current.capacity);
    assert.equal(
      current.bookedCount,
      (
        await prisma.booking.aggregate({
          where: { sessionId: current.id, status: "joined" },
          _sum: { playerCount: true },
        })
      )._sum.playerCount ?? 0,
    );
  }
  const s = await session();
  const first = await a(`/api/sessions/${s.id}/bookings`, "POST", {
    player_count: 2,
    contact: person,
  });
  const race = await Promise.all([
    a("/api/bookings/" + first.json.data.id, "DELETE"),
    b(`/api/sessions/${s.id}/bookings`, "POST", {
      player_count: 2,
      contact: person,
    }),
  ]);
  assert.equal(race[0].status, 200);
  assert.ok([201, 409].includes(race[1].status));
  const current = await prisma.session.findUniqueOrThrow({
    where: { id: BigInt(s.id) },
  });
  assert.equal(
    current.bookedCount,
    (
      await prisma.booking.aggregate({
        where: { sessionId: current.id, status: "joined" },
        _sum: { playerCount: true },
      })
    )._sum.playerCount ?? 0,
  );
});

test("approval capacity failure rolls back generated session/audit; customer joins are unaudited; threshold fires on crossing only", async () => {
  const r = await request(),
    before = await prisma.session.count({
      where: { scriptId: BigInt(scriptId) },
    }),
    auditBefore = await prisma.operationLog.count({
      where: { actorId: users[0], action: "session.create" },
    });
  const fail = await dm(`/api/admin/booking-requests/${r.id}/approve`, "POST", {
    ...approval(),
    player_max: 2,
  });
  assert.equal(fail.status, 409);
  assert.equal(
    await prisma.session.count({ where: { scriptId: BigInt(scriptId) } }),
    before,
  );
  assert.equal(
    await prisma.operationLog.count({
      where: { actorId: users[0], action: "session.create" },
    }),
    auditBefore,
  );
  assert.equal(
    (
      await prisma.bookingRequest.findUniqueOrThrow({
        where: { id: BigInt(r.id) },
      })
    ).status,
    "pending",
  );
  const s = await session({ player_max: 4 });
  const customerLogs = await prisma.operationLog.count({
    where: { actorId: aId },
  });
  for (let i = 0; i < 3; i++)
    assert.equal(
      (
        await a(`/api/sessions/${s.id}/bookings`, "POST", {
          player_count: 1,
          contact: person,
        })
      ).status,
      201,
    );
  assert.equal(
    await prisma.operationLog.count({ where: { actorId: aId } }),
    customerLogs,
  );
  assert.equal(
    await prisma.eventOutbox.count({
      where: {
        type: "session.capacity_reached",
        payloadJson: { path: "$.subjectId", equals: s.id },
      },
    }),
    1,
  );
  await dm(`/api/admin/booking-requests/${r.id}/reject`, "POST", {
    reason: "审计测试",
  });
  assert.ok(
    await prisma.operationLog.findFirst({
      where: {
        targetId: r.id,
        targetType: "booking_request",
        action: "booking_request.rejected",
        actorId: users[0],
      },
    }),
  );
});

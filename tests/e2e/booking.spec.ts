import { test, expect } from "./fixtures";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import {
  BASE_URL,
  uniquePhone,
  trackPhone,
  cleanupTestUsers,
} from "../integration/helpers";
import { prisma } from "../../src/server/db/prisma";
import {
  createSession,
  revokeUserSessions,
} from "../../src/server/auth/session";
import { hashPassword } from "../../src/server/auth/password";
import { getSessionConfig } from "../../src/server/config";
import { isoToLocalInput } from "../../src/lib/booking-time";
import { invalidateSessions } from "../../src/server/sessions/cache";
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test("C3 real booking workflow, unknown-response idempotent retry, approvals, notifications and layouts", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const token = randomUUID().slice(0, 8),
    title = "C3浏览器剧本-" + token,
    name = "C3带本-" + token,
    password = "C3-browser-password";
  const users: bigint[] = [],
    errors: string[] = [],
    evidence = "test-results/c3-browser";
  let scriptId: bigint | undefined;
  const admin = await browser.newContext();
  try {
    const manager = await prisma.user.create({
      data: {
        phone: trackPhone(uniquePhone()),
        nickname: "C3浏览器店长",
        role: "manager",
        passwordHash: await hashPassword(password),
      },
    });
    users.push(manager.id);
    const customer = await prisma.user.create({
      data: {
        phone: trackPhone(uniquePhone()),
        nickname: "C3浏览器顾客",
        role: "customer",
        passwordHash: await hashPassword(password),
      },
    });
    users.push(customer.id);
    const userDm = await prisma.user.create({
      data: {
        phone: trackPhone(uniquePhone()),
        nickname: name,
        role: "dm",
        passwordHash: await hashPassword(password),
      },
    });
    users.push(userDm.id);
    const dm = await prisma.dm.create({ data: { userId: userDm.id } });
    const script = await prisma.script.create({
      data: {
        slug: "c3-browser-" + token,
        title,
        coverUrl: "/43947e6d13429e6e24ef2f82a3ac0265.jpg",
        synopsis: "浏览器测试背景",
        durationMinutes: 180,
        minPlayers: 2,
        maxPlayers: 6,
        pricePerPlayer: "168.00",
        status: "on",
        scriptDms: { create: { dmId: dm.id } },
      },
    });
    scriptId = script.id;
    const session = await createSession(manager.id.toString(), "manager");
    await admin.addCookies([
      {
        name: getSessionConfig().cookieName,
        value: session.token,
        url: BASE_URL,
      },
    ]);
    const staff = await admin.newPage();
    staff.setDefaultTimeout(15000);
    staff.on("pageerror", (e) => errors.push(e.message));
    page.on("pageerror", (e) => errors.push(e.message));
    const firstTime = isoToLocalInput(
        new Date(Date.now() + 86400000).toISOString(),
      ),
      requestTime = isoToLocalInput(
        new Date(Date.now() + 2 * 86400000).toISOString(),
      );
    await staff.goto(BASE_URL + "/admin/sessions");
    await staff.getByRole("button", { name: "新建场次", exact: true }).click();
    await staff.getByLabel("剧本", { exact: true }).click();
    await staff.getByText(title, { exact: true }).last().click();
    await staff.getByLabel("主 DM", { exact: true }).click();
    await staff.getByText(name, { exact: true }).last().click();
    await staff.getByLabel("开始时间（北京时间）").fill(firstTime);
    await staff.getByLabel("人数上限").fill("3");
    await staff.getByLabel("状态", { exact: true }).click();
    await staff.getByText("开放报名", { exact: true }).last().click();
    await staff.getByRole("button", { name: "保存场次", exact: true }).click();
    await expect(staff.getByRole("dialog")).toBeHidden();
    const scheduled = await prisma.session.findFirstOrThrow({
      where: { scriptId: script.id, source: "merchant" },
    });
    expect(scheduled.capacity).toBe(3);
    expect(scheduled.status).toBe("open");
    await page.goto(`${BASE_URL}/booking/new?script_id=${script.id}`);
    await expect(page).toHaveURL(/\/login\?next=/);
    await page
      .getByLabel("手机号", { exact: true })
      .first()
      .fill(customer.phone);
    await page.getByLabel("密码", { exact: true }).first().fill(password);
    await page.getByRole("button", { name: "登录十三雾", exact: true }).click();
    await expect(page).toHaveURL(/\/booking\/new/);
    await page.getByLabel("期望开始时间（北京时间）").fill(requestTime);
    await page.getByLabel("团队人数", { exact: true }).fill("3");
    await page
      .getByRole("button", { name: "提交预约申请", exact: true })
      .click();
    await expect(page).toHaveURL(/\/me\/booking/);
    await expect(
      page.getByText(title + " · 待审核", { exact: true }),
    ).toBeVisible();
    await staff.goto(BASE_URL + "/admin/sessions/pending");
    const row = staff.getByRole("row").filter({ hasText: title });
    await row.getByRole("button", { name: "审核通过", exact: true }).click();
    await staff.getByLabel("主 DM", { exact: true }).click();
    await staff.getByText(name, { exact: true }).last().click();
    await staff.getByRole("button", { name: "确认审核", exact: true }).click();
    await expect(staff.getByRole("dialog")).toBeHidden();
    const request = await prisma.bookingRequest.findFirstOrThrow({
      where: { scriptId: script.id },
    });
    expect(request.status).toBe("approved");
    expect(
      (
        await prisma.session.findUniqueOrThrow({
          where: { id: request.sessionId! },
        })
      ).bookedCount,
    ).toBe(3);
    await page.reload();
    await expect(
      page.getByText(title + " · 已通过并占坑", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^查看通知/ }).click();
    await expect(
      page.getByRole("heading", { name: "预约已通过并已占坑", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    const notice = page
      .getByRole("article")
      .filter({ hasText: "预约已通过并已占坑" });
    await notice.getByRole("button", { name: "标为已读", exact: true }).click();
    await expect(
      notice.getByRole("button", { name: "标为已读", exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    const keys: string[] = [];
    let dropped = false;
    await page.route("**/api/sessions/*/bookings", async (route) => {
      keys.push(route.request().headers()["idempotency-key"]);
      if (!dropped) {
        dropped = true;
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        await route.abort("failed");
      } else await route.continue();
    });
    await page.goto(`${BASE_URL}/sessions?script_id=${script.id}`);
    await page
      .locator("article.session-card")
      .first()
      .getByRole("button", { name: "团队报名", exact: true })
      .click();
    await page.getByLabel("团队人数", { exact: true }).fill("2");
    await page.getByLabel("联系人姓名").fill("浏览器联系人");
    await page.getByLabel("联系人手机号").fill(customer.phone);
    await page
      .getByRole("button", { name: "确认团队报名", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "用原请求重试确认", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "用原请求重试确认", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    expect(
      await prisma.booking.count({ where: { sessionId: scheduled.id } }),
    ).toBe(1);
    await page.unroute("**/api/sessions/*/bookings");
    await page.goto(BASE_URL + "/me/booking");
    const team = page.locator("article.c3-card").filter({ hasText: "2 人" });
    await team.getByRole("button", { name: "取消报名", exact: true }).click();
    await page
      .getByRole("button", { name: "确认取消报名", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(
      (await prisma.session.findUniqueOrThrow({ where: { id: scheduled.id } }))
        .bookedCount,
    ).toBe(0);
    await mkdir(evidence, { recursive: true });
    const checks: unknown[] = [];
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await staff.setViewportSize({ width, height: 900 });
      for (const [key, path] of [
        ["sessions", `/sessions?script_id=${script.id}`],
        ["request", `/booking/new?script_id=${script.id}`],
        ["mine", "/me/booking"],
        ["home", "/"],
      ] as const) {
        await page.goto(BASE_URL + path);
        await page.locator("h1").first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        if (key === "sessions") {
          await expect(page.locator(".session-card.data-row")).toHaveCount(2);
          await expect(
            page
              .locator(".session-card.data-row")
              .first()
              .getByText(/剩余.*位/),
          ).toBeVisible();
          await expect(
            page.locator(".session-card.data-row").first().getByText("¥168.00"),
          ).toBeVisible();
          await expect(
            page.getByText("刷新场次中…", { exact: true }),
          ).toHaveCount(0);
        }
        await page.screenshot({
          path: `${evidence}/${key}-${width}.png`,
          fullPage: true,
        });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 2,
        );
        expect(overflow, key + width).toBeFalsy();
        checks.push({ page: key, width, overflow });
      }
      for (const [key, path] of [
        ["admin", "/admin/sessions"],
        ["review", "/admin/sessions/pending"],
        ["bookings", `/admin/bookings?session_id=${scheduled.id}`],
      ] as const) {
        await staff.goto(BASE_URL + path);
        await staff.locator("h1").first().waitFor();
        await expect(staff.locator(".ant-spin-spinning")).toHaveCount(0);
        await staff.screenshot({
          path: `${evidence}/${key}-${width}.png`,
          fullPage: true,
        });
        expect(
          await staff.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 2,
          ),
          key + width,
        ).toBeFalsy();
      }
      await page.goto(BASE_URL + "/dev/reference/sessions.html");
      await page.screenshot({
        path: `${evidence}/reference-sessions-${width}.png`,
        fullPage: true,
      });
    }
    await staff.goto(BASE_URL + "/admin/ops?tab=requests");
    await staff
      .getByRole("link", { name: "查看待审核申请", exact: true })
      .click();
    await expect(staff).toHaveURL(/\/admin\/sessions\/pending$/);
    expect(errors).toEqual([]);
    await writeFile(
      `${evidence}/checks.json`,
      JSON.stringify(
        {
          checks,
          runtime_errors: errors,
          login_return: true,
          admin_create: true,
          auto_book_approval: true,
          notification_read: true,
          unknown_response_same_key_retry: true,
          cancellation: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await admin.close().catch(() => {});
    const events = await prisma.eventOutbox.findMany({
      where: {
        OR: users.map((uid) => ({
          payloadJson: { path: "$.actorUserId", equals: uid.toString() },
        })),
      },
      select: { id: true },
      orderBy: { id: "asc" },
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
    await prisma.bookingRequest.deleteMany({
      where: { userId: { in: users } },
    });
    if (scriptId) {
      await prisma.booking.deleteMany({ where: { session: { scriptId } } });
      await prisma.session.deleteMany({ where: { scriptId } });
      await prisma.script.delete({ where: { id: scriptId } });
    }
    for (const id of users) await revokeUserSessions(id.toString());
    await cleanupTestUsers();
    await invalidateSessions();
  }
});

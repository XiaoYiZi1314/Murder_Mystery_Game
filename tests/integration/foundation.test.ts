/**
 * W1/T1 集成测试：AC-C1-01（seed×2 五级精确）、手机号唯一、BIGINT/Decimal 往返、配置缺失报错。
 * 前置：测试库已 `prisma migrate deploy`；本文件只直连 DB，不依赖 dev server。
 */
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { Prisma } from "@prisma/client";
import { required } from "../../src/server/config";
import { MEMBER_LEVEL_SEED } from "../../prisma/seed";
import { cleanupTestUsers, ensureSeeded, trackPhone, uniquePhone } from "./helpers";
import { prisma } from "../../src/server/db/prisma";

before(async () => {
  await ensureSeeded();
});

after(async () => {
  await cleanupTestUsers();
});

test("AC_C1_01 seed 两次五级精确且无重复", async () => {
  await ensureSeeded();
  await ensureSeeded();
  const levels = await prisma.memberLevel.findMany({ orderBy: { rank: "asc" } });
  assert.equal(levels.length, MEMBER_LEVEL_SEED.length, `等级数量应恰为 5，实际 ${levels.length}`);
  for (let index = 0; index < MEMBER_LEVEL_SEED.length; index += 1) {
    const wanted = MEMBER_LEVEL_SEED[index];
    assert.equal(levels[index].code, wanted.code);
    assert.equal(levels[index].rank, wanted.rank);
    assert.equal(levels[index].topupThreshold.toFixed(2), new Prisma.Decimal(wanted.topupThreshold).toFixed(2));
  }
});

test("AC_C1_01b 手机号唯一约束生效", async () => {
  const phone = trackPhone(uniquePhone());
  const level = await prisma.memberLevel.findFirstOrThrow({ where: { rank: 1 } });
  await prisma.user.create({
    data: { phone, nickname: "唯一性甲", passwordHash: "not-a-real-hash", memberLevelId: level.id },
  });
  await assert.rejects(
    prisma.user.create({
      data: { phone, nickname: "唯一性乙", passwordHash: "not-a-real-hash", memberLevelId: level.id },
    }),
    (error: unknown) => (error as { code?: string }).code === "P2002",
    "重复手机号应触发 P2002",
  );
});

test("AC_C1_01c 大整数 ID 与金额无损往返", async () => {
  const phone = trackPhone(uniquePhone());
  const level = await prisma.memberLevel.findFirstOrThrow({ where: { rank: 1 } });
  const created = await prisma.user.create({
    data: {
      phone,
      nickname: "往返",
      passwordHash: "not-a-real-hash",
      balance: new Prisma.Decimal("0.10"),
      memberLevelId: level.id,
    },
  });
  const found = await prisma.user.findUniqueOrThrow({ where: { id: created.id } });
  assert.equal(found.balance.toFixed(2), "0.10");
  assert.match(String(found.id), /^\d+$/);
  assert.equal(JSON.parse(JSON.stringify({ id: String(found.id), balance: found.balance.toFixed(2) })).balance, "0.10");
});

test("AC_C1_01d 缺失配置启动即报明确错误", () => {
  assert.throws(
    () => required("SSW_DEFINITELY_MISSING_VAR_FOR_TEST"),
    /缺失必需环境变量 SSW_DEFINITELY_MISSING_VAR_FOR_TEST/,
  );
});

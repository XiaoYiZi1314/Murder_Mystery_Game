import { test as base, expect } from "@playwright/test";
import { prisma } from "../../src/server/db/prisma";
import { redis } from "../../src/server/db/redis";

// Files share a Playwright worker and module singletons. Close connections once
// at worker teardown, not after an individual test that another file follows.
export const test = base.extend<Record<never, never>, { serviceConnections: void }>({
  serviceConnections: [
    async ({}, useFixture) => {
      try {
        await useFixture();
      } finally {
        if (redis().status !== "end") await redis().quit();
        await prisma.$disconnect();
      }
    },
    { scope: "worker", auto: true },
  ],
});
export { expect };

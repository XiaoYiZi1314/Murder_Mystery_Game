import test from "node:test";
import assert from "node:assert/strict";
import {
  capacityStatus,
  assertCapacity,
  assertEditable,
} from "../../src/server/sessions/state-machine";
test("full is not locked; only joined capacity controls open/full", () => {
  assert.equal(capacityStatus(6, 6), "full");
  assert.equal(capacityStatus(5, 6), "open");
  assert.throws(() => assertCapacity(5, 2, 6));
});
test("C3 edits cannot enter C4 states or alter promises with occupants", () => {
  assert.throws(() => assertEditable("locked", 0, { remark: "x" }));
  assert.throws(() => assertEditable("open", 1, { price: "20" }));
  assert.doesNotThrow(() =>
    assertEditable("full", 6, { player_max: 7, remark: "x", updated_at: "x" }),
  );
});

import { businessRange, businessDay } from "../../src/lib/booking-time";
import { date } from "../../src/server/sessions/validation";
test("D10 Beijing day and Monday-based date filters across UTC day boundary", () => {
  const now = new Date("2026-09-13T16:30:00Z");
  assert.equal(businessDay(now), "2026-09-14");
  assert.equal(
    businessRange("weekend", now).from.toISOString(),
    "2026-09-18T16:00:00.000Z",
  );
  assert.equal(
    businessRange("next", now).from.toISOString(),
    "2026-09-20T16:00:00.000Z",
  );
});
test("reject impossible dates and timezone-less timestamps", () => {
  assert.throws(() => date("2030-02-30T12:00:00+08:00", "time"));
  assert.throws(() => date("2030-09-13T12:00", "time"));
});

import assert from "node:assert/strict";
import test from "node:test";
import { sourceHref, sourceRoutes } from "../../src/lib/routes";

test("all 23 source pages have a canonical route", () => {
  assert.equal(Object.keys(sourceRoutes).length, 23);
  for (const target of Object.values(sourceRoutes))
    assert.ok(target.startsWith("/") && !target.includes(".html"));
});
test("detail links preserve the selected entity and remaining query and fragment", () => {
  assert.equal(
    sourceHref("dm-detail.html?dm=adu&tab=reviews#reviews"),
    "/dms/adu?tab=reviews#reviews",
  );
  assert.equal(
    sourceHref("costume-detail.html?costume=letter-room"),
    "/costumes/letter-room",
  );
  assert.equal(sourceHref("sessions.html?day=sat"), "/sessions?day=sat");
  assert.equal(sourceHref("#sessions"), "#sessions");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { endOfWeek, parseDue } from "./due.js";

// A Friday.
const now = new Date(2026, 10, 20, 15, 0);

test("words for a due date become a day", () => {
  const cases: [string, string | null][] = [
    ["today", "2026-11-20"],
    ["Tomorrow", "2026-11-21"],
    ["24h", "2026-11-21"],
    ["9h", "2026-11-21"],
    ["7 days", "2026-11-27"],
    ["3d", "2026-11-23"],
    ["in 2 weeks", "2026-12-04"],
    ["1w", "2026-11-27"],
    ["mon", "2026-11-23"],
    ["friday", "2026-11-27"],
    ["Feb 9", "2027-02-09"],
    ["9 feb", "2027-02-09"],
    ["Nov 30", "2026-11-30"],
    ["December 1st", "2026-12-01"],
    ["2026-12-24", "2026-12-24"],
    ["2026-02-30", null],
    ["Feb 31", null],
    ["soon", null],
    ["", null],
    ["fr", null],
  ];
  for (const [text, want] of cases) assert.equal(parseDue(text, now), want, text);
});

test("the end of the week is its Friday", () => {
  assert.equal(endOfWeek(now), "2026-11-20");
  assert.equal(endOfWeek(new Date(2026, 10, 17)), "2026-11-20");
  assert.equal(endOfWeek(new Date(2026, 10, 21)), "2026-11-27");
});

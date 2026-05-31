import { test } from "node:test";
import assert from "node:assert/strict";
import { review, isDue, dueCards } from "./srs.mjs";

const NOW = 1_700_000_000_000; // fixed clock
const DAY = 86_400_000;
const fresh = () => ({ ease: 2.5, intervalDays: 0, reps: 0, dueAt: null });

test("first successful review schedules 1 day", () => {
  const c = review(fresh(), 4, NOW);
  assert.equal(c.reps, 1);
  assert.equal(c.intervalDays, 1);
  assert.equal(c.dueAt, new Date(NOW + DAY).toISOString());
});

test("second success schedules 6 days", () => {
  let c = review(fresh(), 4, NOW);
  c = review(c, 4, NOW);
  assert.equal(c.reps, 2);
  assert.equal(c.intervalDays, 6);
});

test("third success multiplies by ease", () => {
  let c = review(fresh(), 4, NOW); // q4 keeps ease 2.5
  c = review(c, 4, NOW);
  c = review(c, 4, NOW);
  assert.equal(c.reps, 3);
  assert.equal(c.intervalDays, 15); // round(6 * 2.5)
});

test("a lapse (quality < 3) resets reps and interval", () => {
  let c = review(fresh(), 4, NOW);
  c = review(c, 4, NOW); // interval 6, reps 2
  c = review(c, 1, NOW); // forgot
  assert.equal(c.reps, 0);
  assert.equal(c.intervalDays, 1);
});

test("ease never drops below 1.3", () => {
  let c = fresh();
  for (let i = 0; i < 10; i++) c = review(c, 3, NOW); // hard repeatedly
  assert.ok(c.ease >= 1.3, `ease was ${c.ease}`);
});

test("isDue / dueCards respect the clock", () => {
  const due = { dueAt: new Date(NOW - DAY).toISOString() };
  const later = { dueAt: new Date(NOW + DAY).toISOString() };
  const never = { dueAt: null };
  assert.equal(isDue(due, NOW), true);
  assert.equal(isDue(later, NOW), false);
  assert.equal(isDue(never, NOW), true);
  assert.deepEqual(dueCards([due, later, never], NOW), [due, never]);
});

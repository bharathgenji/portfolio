import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, newState } from "./store.mjs";

test("slugify lowercases, strips punctuation, trims hyphens", () => {
  assert.equal(slugify("Vector Databases!"), "vector-databases");
  assert.equal(slugify("  Quantum   Computing  "), "quantum-computing");
  assert.equal(slugify("C++ & Rust"), "c-rust");
});

test("newState seeds the expected shape", () => {
  const s = newState("Graph Theory");
  assert.equal(s.topic, "Graph Theory");
  assert.equal(s.slug, "graph-theory");
  assert.equal(s.targetLevel, null);
  assert.deepEqual(s.curriculum, []);
  assert.deepEqual(s.flashcards, []);
  assert.deepEqual(s.assessments, []);
  assert.ok(Array.isArray(s.log));
});

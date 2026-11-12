import test from "node:test";
import assert from "node:assert/strict";
import { conversationKey, isValidUsername, isValidPassword } from "./conversation.js";

test("conversation key is deterministic regardless of participant order", () => {
  assert.equal(conversationKey("b", "a"), "a:b");
  assert.equal(conversationKey("a", "b"), "a:b");
});

test("username validation accepts normalized safe identifiers", () => {
  assert.equal(isValidUsername("Anuj_05"), true);
  assert.equal(isValidUsername("ab"), false);
  assert.equal(isValidUsername("bad name"), false);
});

test("password validation enforces the configured length policy", () => {
  assert.equal(isValidPassword("correct-horse-battery"), true);
  assert.equal(isValidPassword("short"), false);
  assert.equal(isValidPassword("x".repeat(129)), false);
});

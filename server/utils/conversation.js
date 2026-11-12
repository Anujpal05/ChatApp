export const conversationKey = (firstId, secondId) =>
  [String(firstId), String(secondId)].sort().join(":");

export const isValidUsername = (value) =>
  typeof value === "string" && /^[a-z0-9_]{3,24}$/.test(value.trim().toLowerCase());

export const isValidPassword = (value) =>
  typeof value === "string" && value.length >= 10 && value.length <= 128;

import express from "express";
import multer from "multer";

import { verifyToken } from "../auth/auth.js";

import {
  getMessages,
  markDelivered,
  markRead,
  sendMessage,
} from "../controllers/message.controller.js";

import {
  getEncryptedHistory,
  saveEncryptedHistory,
  uploadEncryptedAttachment,
  markEncryptedMessagesDelivered,
  markEncryptedMessagesRead,
} from "../controllers/messageHistory.controller.js";

import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

const encryptedUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
  },
});

// Existing message routes
router.get("/get-messages/:id", verifyToken, getMessages);

router.post(
  "/send-message/:id",
  verifyToken,
  rateLimit({ max: 60 }),
  sendMessage,
);

router.patch("/delivered/:messageId", verifyToken, markDelivered);
router.patch("/read/:id", verifyToken, markRead);

// New encrypted history routes
router.get("/history/:peerId", verifyToken, getEncryptedHistory);

router.post(
  "/history/:peerId",
  verifyToken,
  rateLimit({ max: 120 }),
  saveEncryptedHistory,
);

// Encrypted attachment upload
router.post(
  "/upload-encrypted-attachment",
  verifyToken,
  rateLimit({ max: 20 }),
  encryptedUpload.single("file"),
  uploadEncryptedAttachment,
);

// Encrypted message delivery and read receipts
router.patch(
  "/history/:peerId/delivered",
  verifyToken,
  rateLimit({ max: 120 }),
  markEncryptedMessagesDelivered,
);

router.patch(
  "/history/:peerId/read",
  verifyToken,
  rateLimit({ max: 120 }),
  markEncryptedMessagesRead,
);

export default router;

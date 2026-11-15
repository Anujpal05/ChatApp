import express from "express";
import multer from "multer";

import { verifyToken } from "../auth/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

import {
  createStory,
  listStories,
  viewStory,
  getStoryViewers,
  deleteStory,
} from "../controllers/story.controller.js";

const router = express.Router();

const storyUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
  },
});

router.get("/", verifyToken, listStories);

router.post(
  "/",
  verifyToken,
  rateLimit({ max: 10 }),
  storyUpload.single("media"),
  createStory,
);

router.get(
  "/:id/viewers",
  verifyToken,
  rateLimit({ max: 60 }),
  getStoryViewers,
);

router.post("/:id/view", verifyToken, rateLimit({ max: 120 }), viewStory);

router.delete("/:id", verifyToken, rateLimit({ max: 30 }), deleteStory);

export default router;

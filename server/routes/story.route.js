import express from "express";
import { verifyToken } from "../auth/auth.js";
import { createStory, listStories, viewStory } from "../controllers/story.controller.js";
const router = express.Router();
router.get("/", verifyToken, listStories);
router.post("/", verifyToken, createStory);
router.post("/:id/view", verifyToken, viewStory);
export default router;

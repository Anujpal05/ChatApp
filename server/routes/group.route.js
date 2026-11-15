import express from "express";

import { verifyToken } from "../auth/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

import {
  createGroup,
  getMyGroups,
  getGroupDetails,
  updateGroup,
  addGroupMembers,
  removeGroupMember,
  updateGroupMemberRole,
} from "../controllers/group.controller.js";

import {
  getGroupEncryptedHistory,
  saveGroupEncryptedHistory,
} from "../controllers/groupMessageHistory.controller.js";


const router = express.Router();

router.use(verifyToken);

router.get("/", getMyGroups);

router.post("/", rateLimit({ max: 10 }), createGroup);

router.get("/:groupId", getGroupDetails);

router.get("/:groupId/history", getGroupEncryptedHistory);

router.post(
  "/:groupId/history",
  rateLimit({ max: 60 }),
  saveGroupEncryptedHistory,
);

router.patch("/:groupId", rateLimit({ max: 30 }), updateGroup);

router.post("/:groupId/members", rateLimit({ max: 30 }), addGroupMembers);

router.delete(
  "/:groupId/members/:userId",
  rateLimit({ max: 30 }),
  removeGroupMember,
);

router.patch(
  "/:groupId/members/:userId/role",
  rateLimit({ max: 30 }),
  updateGroupMemberRole,
);

export default router;

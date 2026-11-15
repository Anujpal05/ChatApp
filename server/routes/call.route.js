import express from "express";
import { verifyToken } from "../auth/auth.js";
import {
  addNewCall,
  updateCallStatus,
  getAllCallDetails,
  getIndividualCall,
} from "../controllers/call.controller.js";

const router = express.Router();

// Create a new call-history record.
router.post("/start", verifyToken, addNewCall);

// Update an existing call's status.
router.patch("/:callId/finish", verifyToken, updateCallStatus);

// Retrieve an individual call.
router.get("/get-call/:call_id", verifyToken, getIndividualCall);

// Retrieve the authenticated user's call history.
router.get(
  "/get-all-call/:userid",
  verifyToken,
  (req, res, next) => {
    if (String(req.params.userid) !== String(req.user.userId)) {
      return res.status(403).json({ message: "Forbidden." });
    }
    next();
  },
  getAllCallDetails,
);

export default router;

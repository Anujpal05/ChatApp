import express from "express";
import { verifyToken } from "../auth/auth.js";
import { addNewCall, getAllCallDetails, getIndividualCall } from "../controllers/call.controller.js";
const router = express.Router();
router.post("/add-new-call", verifyToken, addNewCall);
router.get("/get-call/:call_id", verifyToken, getIndividualCall);
router.get("/get-all-call/:userid", verifyToken, (req, res, next) => {
  if (String(req.params.userid) !== String(req.user.userId)) return res.status(403).json({ message: "Forbidden." });
  next();
}, getAllCallDetails);
export default router;

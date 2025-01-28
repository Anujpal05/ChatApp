import express from "express";
import {
  addNewCall,
  getAllCallDetails,
  getIndividualCall,
} from "../controllers/call.controller.js";
const router = express.Router();

router.post("/add-new-call", addNewCall);
router.get("/get-call/:call_id", getIndividualCall);
router.get("/get-all-call/:userid", getAllCallDetails);

export default router;

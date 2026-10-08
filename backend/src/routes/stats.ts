import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { stats } from "../controllers/stats.js";
export const statsRouter = Router();
statsRouter.get("/", requireAuth, stats);

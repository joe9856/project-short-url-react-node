import { Router } from "express";
import { redirect } from "../controllers/redirect.js";
export const redirectRouter = Router();
redirectRouter.head("/:code", redirect);
redirectRouter.get("/:code", redirect);

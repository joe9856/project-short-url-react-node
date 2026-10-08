import { Router } from "express";
import * as auth from "../controllers/auth.js";
import { requireAuth } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/security.js";
export const authRouter = Router();
authRouter.post("/register", rateLimit("register", 10, 900), auth.register);
authRouter.post("/login", rateLimit("login", 20, 900), auth.login);
authRouter.post("/logout", auth.logout);
authRouter.get("/me", requireAuth, auth.me);

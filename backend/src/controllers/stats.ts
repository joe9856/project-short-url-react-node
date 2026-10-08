import type { Request, Response } from "express";
import { z } from "zod";
import { idSchema } from "../lib/validation.js";
import { statistics } from "../services/stats.js";
const querySchema = z
  .object({ from: z.string().optional(), to: z.string().optional() })
  .strict();
export async function stats(req: Request, res: Response) {
  const { from, to } = querySchema.parse(req.query);
  const id = req.params.id ? idSchema.parse(req.params.id) : undefined;
  res.json(await statistics(req.user!.id, from, to, id));
}

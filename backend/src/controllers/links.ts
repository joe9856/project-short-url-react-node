import type { Request, Response } from "express";
import { z } from "zod";
import {
  createLinkSchema,
  updateLinkSchema,
  idSchema,
} from "../lib/validation.js";
import * as links from "../services/links.js";
import { linkQr } from "../services/qr.js";
export async function create(req: Request, res: Response) {
  const link = await links.createLink(
    req.user!.id,
    createLinkSchema.parse(req.body),
  );
  res.status(201).json({ link });
}
export async function list(req: Request, res: Response) {
  res.json(await links.listLinks(req.user!.id, req.query));
}
export async function details(req: Request, res: Response) {
  res.json({
    link: links.linkInfo(
      await links.ownedLink(req.user!.id, idSchema.parse(req.params.id)),
    ),
  });
}
export async function update(req: Request, res: Response) {
  const link = await links.updateLink(
    req.user!.id,
    idSchema.parse(req.params.id),
    updateLinkSchema.parse(req.body),
  );
  res.json({ link });
}
export async function qr(req: Request, res: Response) {
  const format = z.enum(["png", "svg"]).default("png").parse(req.query.format);
  const download = z.enum(["0", "1"]).default("0").parse(req.query.download);
  const result = await linkQr(
    req.user!.id,
    idSchema.parse(req.params.id),
    format,
  );
  res.type(format === "svg" ? "image/svg+xml" : "image/png");
  res.setHeader(
    "Content-Disposition",
    `${download === "1" ? "attachment" : "inline"}; filename="qr-${result.code}.${format}"`,
  );
  res.send(result.body);
}

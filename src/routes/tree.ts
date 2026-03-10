import { Router, Request, Response } from "express";
import Database from "better-sqlite3";
import { getAllNodes, getNodeById, insertNode, buildTrees } from "../db";
import { CreateNodeBody } from "../types";

export function createTreeRouter(db: Database.Database): Router {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    const rows = getAllNodes(db);
    const trees = buildTrees(rows);
    res.json(trees);
  });

  router.post("/", (req: Request, res: Response) => {
    const body = req.body as CreateNodeBody;

    if (!body || typeof body.label !== "string" || body.label.trim() === "") {
      res.status(400).json({
        error: "Validation failed",
        message: "label is required and must be a non-empty string.",
      });
      return;
    }

    const label = body.label.trim();
    const parentId: number | null = body.parent_id ?? null;

    if (parentId !== null && (typeof parentId !== "number" || !Number.isInteger(parentId))) {
      res.status(400).json({
        error: "Validation failed",
        message: "parent_id must be an integer or null.",
      });
      return;
    }

    if (parentId !== null) {
      const parent = getNodeById(db, parentId);
      if (!parent) {
        res.status(404).json({
          error: "Parent not found",
          message: `No node exists with id ${parentId}.`,
        });
        return;
      }
    }

    const node = insertNode(db, label, parentId);
    res.status(201).json(node);
  });

  return router;
}

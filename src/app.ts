import express from "express";
import Database from "better-sqlite3";
import { createTreeRouter } from "./routes/tree";

export function createApp(db: Database.Database): express.Application {
  const app = express();

  app.use(express.json());

  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });

  app.use("/api/tree", createTreeRouter(db));

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found", message: "Route not found." });
  });

  return app;
}

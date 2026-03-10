import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createDb } from "../src/db";
import { createApp } from "../src/app";
import type { Application } from "express";
import type Database from "better-sqlite3";

let app: Application;
let db: Database.Database;

beforeEach(() => {
  db = createDb(":memory:");
  app = createApp(db);
});

afterEach(() => {
  db.close();
});

describe("GET /api/tree", () => {
  it("returns an empty array when no nodes exist", async () => {
    const res = await request(app).get("/api/tree");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns a single root node with empty children", async () => {
    await request(app)
      .post("/api/tree")
      .send({ label: "root" });

    const res = await request(app).get("/api/tree");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, label: "root", children: [] },
    ]);
  });

  it("returns a nested tree structure", async () => {
    await request(app).post("/api/tree").send({ label: "root" });
    await request(app).post("/api/tree").send({ label: "child", parent_id: 1 });
    await request(app).post("/api/tree").send({ label: "grandchild", parent_id: 2 });

    const res = await request(app).get("/api/tree");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 1,
        label: "root",
        children: [
          {
            id: 2,
            label: "child",
            children: [
              { id: 3, label: "grandchild", children: [] },
            ],
          },
        ],
      },
    ]);
  });

  it("returns multiple independent trees", async () => {
    await request(app).post("/api/tree").send({ label: "tree-one" });
    await request(app).post("/api/tree").send({ label: "tree-two" });
    await request(app).post("/api/tree").send({ label: "child-of-one", parent_id: 1 });

    const res = await request(app).get("/api/tree");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].label).toBe("tree-one");
    expect(res.body[0].children).toHaveLength(1);
    expect(res.body[1].label).toBe("tree-two");
    expect(res.body[1].children).toHaveLength(0);
  });

  it("builds deep nesting correctly (4 levels)", async () => {
    await request(app).post("/api/tree").send({ label: "level-0" });
    await request(app).post("/api/tree").send({ label: "level-1", parent_id: 1 });
    await request(app).post("/api/tree").send({ label: "level-2", parent_id: 2 });
    await request(app).post("/api/tree").send({ label: "level-3", parent_id: 3 });

    const res = await request(app).get("/api/tree");
    const leaf = res.body[0].children[0].children[0].children[0];

    expect(leaf.label).toBe("level-3");
    expect(leaf.children).toEqual([]);
  });
});

describe("POST /api/tree", () => {
  it("creates a root node when parent_id is omitted", async () => {
    const res = await request(app)
      .post("/api/tree")
      .send({ label: "root" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(1);
    expect(res.body.label).toBe("root");
    expect(res.body.parent_id).toBeNull();
  });

  it("creates a child node with a valid parent_id", async () => {
    await request(app).post("/api/tree").send({ label: "root" });

    const res = await request(app)
      .post("/api/tree")
      .send({ label: "child", parent_id: 1 });

    expect(res.status).toBe(201);
    expect(res.body.label).toBe("child");
    expect(res.body.parent_id).toBe(1);
  });

  it("trims whitespace from label", async () => {
    const res = await request(app)
      .post("/api/tree")
      .send({ label: "  hello  " });

    expect(res.status).toBe(201);
    expect(res.body.label).toBe("hello");
  });

  it("strips dangerous HTML from label", async () => {
    const res = await request(app)
      .post("/api/tree")
      .send({ label: "<script>alert('xss')</script>" });

    expect(res.status).toBe(201);
    expect(res.body.label).not.toContain("<");
    expect(res.body.label).not.toContain(">");
  });

  it("returns 400 when label is missing", async () => {
    const res = await request(app)
      .post("/api/tree")
      .send({ parent_id: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 when label is an empty string", async () => {
    const res = await request(app)
      .post("/api/tree")
      .send({ label: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 when label is not a string", async () => {
    const res = await request(app)
      .post("/api/tree")
      .send({ label: 123 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 404 when parent_id does not exist", async () => {
    const res = await request(app)
      .post("/api/tree")
      .send({ label: "orphan", parent_id: 999 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Parent not found");
  });

  it("returns 400 when parent_id is not an integer", async () => {
    const res = await request(app)
      .post("/api/tree")
      .send({ label: "bad", parent_id: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 when body is empty", async () => {
    const res = await request(app)
      .post("/api/tree")
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("404 catch all", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/api/unknown");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDb, buildTrees, insertNode, getSubtree } from "../src/db";
import type Database from "better-sqlite3";
import { NodeRow } from "../src/types";

let db: Database.Database;

beforeEach(() => {
  db = createDb(":memory:");
});

afterEach(() => {
  db.close();
});

describe("buildTrees", () => {
  it("returns an empty array for empty input", () => {
    expect(buildTrees([])).toEqual([]);
  });

  it("handles a single root node", () => {
    const rows: NodeRow[] = [
      { id: 1, label: "root", parent_id: null, created_at: "" },
    ];

    expect(buildTrees(rows)).toEqual([
      { id: 1, label: "root", children: [] },
    ]);
  });

  it("builds multiple roots with children", () => {
    const rows: NodeRow[] = [
      { id: 1, label: "a", parent_id: null, created_at: "" },
      { id: 2, label: "b", parent_id: null, created_at: "" },
      { id: 3, label: "a-child", parent_id: 1, created_at: "" },
    ];

    const trees = buildTrees(rows);

    expect(trees).toHaveLength(2);
    expect(trees[0].children).toHaveLength(1);
    expect(trees[0].children[0].label).toBe("a-child");
    expect(trees[1].children).toHaveLength(0);
  });

  it("handles deep nesting", () => {
    const rows: NodeRow[] = [
      { id: 1, label: "l0", parent_id: null, created_at: "" },
      { id: 2, label: "l1", parent_id: 1, created_at: "" },
      { id: 3, label: "l2", parent_id: 2, created_at: "" },
      { id: 4, label: "l3", parent_id: 3, created_at: "" },
    ];

    const trees = buildTrees(rows);
    const leaf = trees[0].children[0].children[0].children[0];

    expect(leaf.label).toBe("l3");
    expect(leaf.children).toEqual([]);
  });
});

describe("getSubtree", () => {
  it("returns null for a nonexistent node", () => {
    expect(getSubtree(db, 999)).toBeNull();
  });

  it("returns a single node with no children", () => {
    insertNode(db, "solo", null);

    const tree = getSubtree(db, 1);

    expect(tree).toEqual({ id: 1, label: "solo", children: [] });
  });

  it("returns a full subtree using recursive CTE", () => {
    insertNode(db, "root", null);
    insertNode(db, "child", 1);
    insertNode(db, "grandchild", 2);
    insertNode(db, "other-root", null);

    const tree = getSubtree(db, 1);

    expect(tree).toEqual({
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
    });
  });

  it("returns only the requested subtree, not siblings", () => {
    insertNode(db, "root", null);
    insertNode(db, "a", 1);
    insertNode(db, "b", 1);
    insertNode(db, "a-child", 2);

    const subtree = getSubtree(db, 2);

    expect(subtree).toEqual({
      id: 2,
      label: "a",
      children: [
        { id: 4, label: "a-child", children: [] },
      ],
    });
  });
});

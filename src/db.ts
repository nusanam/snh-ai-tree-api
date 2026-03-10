import Database from "better-sqlite3";
import path from "path";
import { NodeRow, TreeNode } from "./types";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    parent_id INTEGER REFERENCES nodes(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON nodes(parent_id);
`;

export function createDb(dbPath?: string): Database.Database {
  const resolved = dbPath ?? path.join(process.cwd(), "tree.db");
  const db = new Database(resolved);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  return db;
}

export function getAllNodes(db: Database.Database): NodeRow[] {
  return db.prepare("SELECT id, label, parent_id, created_at FROM nodes").all() as NodeRow[];
}

export function getNodeById(db: Database.Database, id: number): NodeRow | undefined {
  return db
    .prepare("SELECT id, label, parent_id, created_at FROM nodes WHERE id = ?")
    .get(id) as NodeRow | undefined;
}

export function insertNode(
  db: Database.Database,
  label: string,
  parentId: number | null
): NodeRow {
  const result = db
    .prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)")
    .run(label, parentId);

  return getNodeById(db, result.lastInsertRowid as number) as NodeRow;
}

// converts flat rows into nested tree structures
// first pass creates all TreeNode objects in a Map for O(1) lookup
// second pass links each child to its parent.
export function buildTrees(rows: NodeRow[]): TreeNode[] {
  const nodes = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  for (const row of rows) {
    nodes.set(row.id, { id: row.id, label: row.label, children: [] });
  }

  for (const row of rows) {
    const node = nodes.get(row.id)!;

    if (row.parent_id === null) {
      roots.push(node);
    } else {
      nodes.get(row.parent_id)?.children.push(node);
    }
  }

  return roots;
}

// fetches a single tree using a recursive CTE, which is useful when you only need
// one subtree instead of loading every node in the database
export function getSubtree(db: Database.Database, rootId: number): TreeNode | null {
  const rows = db
    .prepare(
      `WITH RECURSIVE subtree AS (
        SELECT id, label, parent_id FROM nodes WHERE id = ?
        UNION ALL
        SELECT n.id, n.label, n.parent_id
        FROM nodes n
        JOIN subtree s ON n.parent_id = s.id
      )
      SELECT id, label, parent_id FROM subtree`
    )
    .all(rootId) as NodeRow[];

  if (rows.length === 0) return null;

  // treat queried node as the subtree root by clearing its parent_id.
  // without this, a node with a parent would not appear as a root in buildTrees
  rows[0].parent_id = null;

  const trees = buildTrees(rows);
  return trees[0] ?? null;
}

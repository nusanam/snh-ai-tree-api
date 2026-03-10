# Tree API

HTTP API for managing hierarchical tree data structures. Built with TypeScript, Express, and SQLite.

## Quick Start

```bash
npm install
npm run dev     # development with hmr (hot module reloading)
npm start       # production (requires npm run build first)
npm test        # run all tests
```

The server starts on port 3000 by default. Set the `PORT` environment variable to change it.

## API

### GET /api/tree

Returns all trees as nested JSON.

```bash
curl http://localhost:3000/api/tree
```

```json
[
  {
    "id": 1,
    "label": "root",
    "children": [
      {
        "id": 2,
        "label": "child",
        "children": []
      }
    ]
  }
]
```

Returns `[]` when the database is empty.

### POST /api/tree

Creates a new node. Omit `parent_id` to create a new root (a new tree).

```bash
# Create a root node
curl -X POST http://localhost:3000/api/tree \
  -H "Content-Type: application/json" \
  -d '{"label": "root"}'

# Create a child node
curl -X POST http://localhost:3000/api/tree \
  -H "Content-Type: application/json" \
  -d '{"label": "child", "parent_id": 1}'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| label | string | yes | Node label (whitespace is trimmed) |
| parent_id | integer | no | Parent node id. Omit to create a root node. |

**Response:** `201 Created` with the created node.

**Errors:**

| Status | When |
|--------|------|
| 400 | Missing or invalid `label`, invalid `parent_id` type |
| 404 | `parent_id` references a node that does not exist |

All errors return `{ "error": "...", "message": "..." }`.

## Architecture

### Data model

Nodes are stored in a single `nodes` table using the adjacency list pattern:

```
id | label | parent_id | created_at
```

A node with `parent_id = null` is a root, which defines an independent tree. The adjacency list model was chosen over nested sets or materialized paths because it maps directly to the problem (parent/child relationships), is simple to query and update, and performs well with proper indexing.

### Tree reconstruction

The API includes two approaches for building nested trees from flat rows:

**`buildTrees` (application level)** is used by `GET /api/tree`. It fetches all rows in a single query and builds the tree in two O(n) passes using a Map for constant time lookups. This is optimal when you need all nodes because the bottleneck is the single SELECT, not the assembly.

**`getSubtree` (recursive CTE)** fetches a single subtree using `WITH RECURSIVE`. This is useful when you only need one tree or subtree and want the database to do the filtering. The query walks from a given root node down through all descendants without loading unrelated nodes.

### Database configuration

SQLite is configured with:

- `journal_mode = WAL` for concurrent reads during writes
- `foreign_keys = ON` to enforce referential integrity at the database level
- An index on `parent_id` to speed up child lookups

### Project structure

```
src/
  index.ts          Server entry, graceful shutdown
  app.ts            Express app (separated from server for testability)
  db.ts             Connection, schema, all query functions
  routes/tree.ts    Route handlers
  types.ts          TypeScript interfaces
tests/
  tree.test.ts      Integration tests (API level)
  queries.test.ts   Unit tests (database layer)
```

The app factory (`createApp`) accepts a database connection, which lets tests pass an in-memory SQLite instance for full isolation. Adding a new endpoint means writing a query function in `db.ts` and a route handler in `routes/`.

## Testing

```bash
npm test            # single run
npm run test:watch  # watch mode
```

23 tests across two files covering:

- All happy paths for both endpoints
- Input validation (missing fields, wrong types, empty strings)
- Error cases (nonexistent parent, unknown routes)
- Tree structure correctness (nesting, multiple trees, deep hierarchies)
- Recursive CTE subtree queries

Each test uses a fresh in-memory database for full isolation.

## Scalability Considerations

For the current scope, the adjacency list with an indexed `parent_id` column handles thousands of nodes efficiently. If the dataset grew to hundreds of thousands of nodes:

- `GET /api/tree` could be paginated by root node or limited to specific trees
- Individual subtree queries (using the recursive CTE) avoid loading the entire dataset
- For very deep trees, the recursive CTE could include a depth limit
- For write heavy workloads, SQLite's WAL mode handles concurrent reads well, but a client/server database like PostgreSQL would be more appropriate at scale

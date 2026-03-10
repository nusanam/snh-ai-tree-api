# Design Decisions

Return back to [README.md](README.md).

## Why adjacency list?

Nodes are stored in a flat table with a `parent_id` column. A null `parent_id` means root node (new tree). I picked this over nested sets or materialized paths because it maps directly to parent/child relationships, is easy to update, and performs well with an index on `parent_id`.

## Two ways to build trees

**`buildTrees`** loads all rows and assembles trees in memory with two O(n) passes using a Map. This is used by `GET /api/tree` because we need all nodes anyway, so doing it in one query is faster than recursive calls.

**`getSubtree`** uses a recursive CTE (`WITH RECURSIVE`) to fetch a single subtree from the database. This is better when you only need one tree and don't want to load everything. It's not wired to an endpoint yet but is tested and ready for something like `GET /api/tree/:id`.

## Why SQLite?

Zero config, file based, no external services to run. The reviewer can clone and `npm install` without setting up a database server. SQLite is also genuinely used in production (Turso, Litestream, etc.), so it's not a toy choice.

Configured with:
- WAL mode for concurrent reads during writes
- Foreign keys on to enforce referential integrity
- Index on `parent_id` for child lookups

## Why separate app.ts from index.ts?

`app.ts` exports the Express app without starting the server. Tests import the app directly and use supertest, so they never bind to a port. This also makes it easy to swap the server setup (e.g., add HTTPS) without touching the app logic.

## Input handling

- Labels are trimmed and sanitized (HTML entities escaped) before storage
- `parent_id` is validated as an integer and checked for existence before insert
- Parameterized queries prevent SQL injection
- All errors use a consistent `{ error, message }` shape

## What I'd change at scale

- Paginate `GET /api/tree` by root node instead of returning everything
- Use the recursive CTE with a depth limit for very deep trees
- Swap SQLite for PostgreSQL once you need concurrent write throughput
- Add rate limiting and request size limits

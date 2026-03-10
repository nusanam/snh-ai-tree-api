# Tree API

HTTP API for managing hierarchical tree data structures. Built with TypeScript, Express, and SQLite.

See [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) for architecture choices and tradeoffs.

## Quick Start

```bash
npm install
npm run dev     # development with hmr (hot module reloading)
npm run build   # compile TypeScript
npm start       # production (requires build first)
npm test        # run all tests
```

Starts on port 3000 by default. Set `PORT` to change it.

## API

### GET /api/tree

Returns all trees as nested JSON. Returns `[]` when empty.

```bash
curl http://localhost:3000/api/tree
```

### POST /api/tree

Creates a node. Omit `parent_id` to create a new root.

```bash
curl -X POST http://localhost:3000/api/tree \
  -H "Content-Type: application/json" \
  -d '{"label": "root"}'

curl -X POST http://localhost:3000/api/tree \
  -H "Content-Type: application/json" \
  -d '{"label": "child", "parent_id": 1}'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| label | string | yes | Node label |
| parent_id | integer | no | Parent node id. Omit for root. |

Returns `201` on success, `400` for bad input, `404` if parent doesn't exist.

## Testing

```bash
npm test            # single run
npm run test:watch  # watch mode
```

24 tests across two files: integration tests at the API level and unit tests for the tree building logic. Each test uses a fresh in memory database.

## Project Structure

```
src/
  index.ts          Server entry, graceful shutdown
  app.ts            Express app (separate from server for testability)
  db.ts             Connection, schema, queries
  routes/tree.ts    Route handlers
  types.ts          TypeScript interfaces
tests/
  tree.test.ts      Integration tests
  queries.test.ts   Unit tests
```

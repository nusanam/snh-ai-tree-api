import { createDb } from "./db";
import { createApp } from "./app";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const db = createDb();
const app = createApp(db);

const server = app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});

function shutdown() {
  console.log("\nShutting down...");
  server.close(() => {
    db.close();
    console.log("Database closed. Goodbye.");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

import app from "./server.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { db } from "./db/index.js";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = env.PORT || 3000;

async function startServer() {
  try {
    const migrationsFolder = path.join(__dirname, "db", "migrations");
    logger.info(`Checking database migrations from ${migrationsFolder}...`);
    await migrate(db, { migrationsFolder });
    logger.info("Database migrations applied successfully.");
  } catch (err) {
    logger.warn("Database migration startup notice:", err);
  }

  app.listen(PORT, () => {
    logger.info(`Server is running in ${env.NODE_ENV} mode on port ${PORT}`);
  });
}

startServer();

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as usersSchema from "./schema/users.js";
import * as loansSchema from "./schema/loans.js";
import * as repaymentsSchema from "./schema/repayments.js";
import * as documentsSchema from "./schema/documents.js";
import * as notificationsSchema from "./schema/notifications.js";
import * as auditSchema from "./schema/audit_logs.js";
import dotenv from "dotenv";

dotenv.config();

const schema = {
  ...usersSchema,
  ...loansSchema,
  ...repaymentsSchema,
  ...documentsSchema,
  ...notificationsSchema,
  ...auditSchema,
};

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export type DbClient = typeof db;

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | undefined;

/**
 * Returns a shared Drizzle client backed by `pg` (lazy; `DATABASE_URL` required at first call).
 */
export function getDb(): Db {
  if (cached) {
    return cached;
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({ connectionString: databaseUrl });
  cached = drizzle({ client: pool, schema });
  return cached;
}

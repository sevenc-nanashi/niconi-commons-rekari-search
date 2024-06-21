import pg from "pg";
import * as env from "./env.js";
import * as cases from "@luca/cases";

export const db = new pg.Client({
  host: `localhost`,
  port: env.dbPort,
  user: env.dbUser,
  database: env.dbName,
  password: env.dbPassword,
});

await db.connect();

export const toJsRow = <T extends Record<string, unknown>>(
  row: Record<string, unknown>,
): T => {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      return [cases.camelCase(key), value];
    }),
  ) as T;
};

export const toPgRow = <T extends Record<string, unknown>>(
  row: T,
): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      return [cases.snakeCase(key), value];
    }),
  );
};

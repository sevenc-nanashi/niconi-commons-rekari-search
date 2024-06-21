import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { app } from "../app.js";
import { db, toJsRow } from "../db.js";
import { consola } from "consola";
import {
  ExternalDistribution,
  LicenseIndex,
  NonCommons,
  LicenseOnly,
} from "@workspace/common/dist/types.js";

const log = consola.withTag("search");

const limit = 50;

app.get(
  "/api/search",
  zValidator(
    "query",
    z.object({
      id: z.string().optional(),
      title: z.string().optional(),
      externalDistribution: z
        .enum(["true", "false"])
        .pipe(z.coerce.boolean())
        .optional(),
      nonCommons: z.enum(["true", "false"]).pipe(z.coerce.boolean()).optional(),
      licenseOnly: z
        .enum(["true", "false"])
        .pipe(z.coerce.boolean())
        .optional(),
      offset: z.string().pipe(z.coerce.number().int().min(0)).optional(),
    }),
  ),
  async (c) => {
    const query = c.req.valid("query");

    const conditions = [];

    if (query.id) {
      conditions.push(
        `id LIKE ${db.escapeLiteral(query.id).replace(/'$/, "%'")}`,
      );
    }
    if (query.title) {
      conditions.push(
        `title LIKE ${db.escapeLiteral(query.title).replace(/^'/, "'%").replace(/'$/, "%'")}`,
      );
    }
    if (!query.externalDistribution) {
      conditions.push(`external_distribution = false`);
    }
    if (!query.nonCommons) {
      conditions.push(`non_commons = false`);
    }
    if (!query.licenseOnly) {
      conditions.push(`license_only = false`);
    }

    if (conditions.length === 0) {
      conditions.push("true");
    }

    const countSql = `SELECT count(id) FROM licenses_index WHERE ${conditions.join(" AND ")}`;

    log.info(countSql);

    const countResult = await db.query<{ count: string }>(countSql);

    const count = parseInt(countResult.rows[0].count);

    const selectSql =
      `SELECT * FROM licenses_index ` +
      `WHERE ${conditions.join(" AND ")} ` +
      `ORDER BY children_count DESC ` +
      `LIMIT ${limit} OFFSET ${query.offset} `;

    log.info(selectSql);

    const licenseIndexes = await db
      .query(selectSql)
      .then((result) => result.rows.map(toJsRow) as LicenseIndex[]);

    const externalDistributonIds = licenseIndexes
      .filter((licenseIndex) => licenseIndex.externalDistribution)
      .map((licenseIndex) => licenseIndex.id);

    const nonCommonsIds = licenseIndexes
      .filter((licenseIndex) => licenseIndex.nonCommons)
      .map((licenseIndex) => licenseIndex.id);

    const licenseOnlyIds = licenseIndexes
      .filter((licenseIndex) => licenseIndex.licenseOnly)
      .map((licenseIndex) => licenseIndex.id);

    const getContents = async <T extends { id: string }>(
      ids: string[],
      table: string,
    ): Promise<Map<string, T>> => {
      if (ids.length === 0) {
        return new Map();
      }

      const sql = `SELECT * FROM ${table} WHERE id IN (${ids.map((id) =>
        db.escapeLiteral(id),
      )})`;

      log.info(sql);

      const rows = await db
        .query(sql)
        .then((result) => result.rows.map(toJsRow) as T[]);

      return toMap(rows);
    };

    const externalDistributions = await getContents<ExternalDistribution>(
      externalDistributonIds,
      "external_distribution",
    );
    const nonCommons = await getContents<NonCommons>(
      nonCommonsIds,
      "non_commons",
    );
    const licenseOnly = await getContents<LicenseOnly>(
      licenseOnlyIds,
      "license_only",
    );

    const results = licenseIndexes.map((licenseIndex) => {
      return {
        id: licenseIndex.id,
        title: licenseIndex.title,
        childrenCount: licenseIndex.childrenCount,
        externalDistribution:
          externalDistributions.get(licenseIndex.id) ?? null,
        nonCommons: nonCommons.get(licenseIndex.id) ?? null,
        licenseOnly: licenseOnly.get(licenseIndex.id) ?? null,
      };
    });

    return c.json({
      count,
      results,
    });
  },
);

const toMap = <T extends { id: string }>(rows: T[]): Map<string, T> => {
  return new Map(rows.map((row) => [row.id, row]));
};

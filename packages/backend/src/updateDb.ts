import { db, toPgRow } from "./db.js";
import { consola } from "consola";
import { createWriteStream, createReadStream } from "node:fs";
import { finished, pipeline } from "node:stream/promises";
import * as unzipper from "unzipper";
import * as fs from "node:fs/promises";
import iconv from "iconv-lite";
import * as csv from "csv-parse";
import {
  ExternalDistribution,
  LicenseIndex,
  LicenseOnly,
  NonCommons,
} from "@workspace/common/dist/types.js";

const log = consola.withTag("updateDb.ts");

const download = async (url: string, path: string) => {
  log.info(`Downloading ${url} to ${path}...`);
  const res = await fetch(url);
  const body = res.body;
  if (!body) {
    throw new Error(`Failed to download ${url}`);
  }
  const fsStream = createWriteStream(path);
  const reader = body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    fsStream.write(Buffer.from(value));
  }
  fsStream.end();
  await finished(fsStream);

  log.info(`Downloaded ${url} to ${path}`);
};

const dataDir = `${import.meta.dir}/../data`;

const downloadLicenses = async () => {
  log.info("Downloading licenses...");
  if (!(await fs.stat(`${dataDir}/licenses-zipped/`).catch(() => null))) {
    log.info("Creating licenses directory...");
    await fs.mkdir(`${dataDir}/licenses-zipped`, {
      recursive: true,
    });
  } else {
    log.info("Licenses directory already exists.");
  }
  if (!(await fs.stat(`${dataDir}/licenses-csv`).catch(() => null))) {
    log.info("Creating licenses directory...");
    await fs.mkdir(`${dataDir}/licenses-csv`, {
      recursive: true,
    });
  }

  if (!(await fs.stat(`${dataDir}/licenses-zipped/.done`).catch(() => null))) {
    log.info("Downloading licenses...");

    await download(
      "https://static.commons.nicovideo.jp/files/commons1.zip",
      `${dataDir}/licenses-zipped/commons1.zip`,
    );
    await download(
      "https://static.commons.nicovideo.jp/files/commons2.zip",
      `${dataDir}/licenses-zipped/commons2.zip`,
    );
    await download(
      "https://static.commons.nicovideo.jp/files/commons3.zip",
      `${dataDir}/licenses-zipped/commons3.zip`,
    );

    await fs.writeFile(`${dataDir}/licenses-zipped/.done`, "", "utf8");
  }

  if (!(await fs.stat(`${dataDir}/licenses-csv/.done`).catch(() => null))) {
    log.info("Unzipping licenses...");

    log.info("Unzipping commons1.zip...");
    await pipeline(
      createReadStream(`${dataDir}/licenses-zipped/commons1.zip`),
      unzipper.Extract({ path: `${dataDir}/licenses-csv/` }),
    );
    log.info("Unzipping commons2.zip...");
    await pipeline(
      createReadStream(`${dataDir}/licenses-zipped/commons2.zip`),
      unzipper.Extract({ path: `${dataDir}/licenses-csv/` }),
    );
    log.info("Unzipping commons3.zip...");
    await pipeline(
      createReadStream(`${dataDir}/licenses-zipped/commons3.zip`),
      unzipper.Extract({ path: `${dataDir}/licenses-csv/` }),
    );
    await fs.writeFile(`${dataDir}/licenses-csv/.done`, "", "utf8");
  }
};

const dbVersion = 3;
const isDbUpdated = async () => {
  try {
    const res = await db.query<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'dbVersion'",
    );
    return res.rows[0].value === dbVersion.toString();
  } catch (e) {
    return false;
  }
};

const parseCsv = async <T extends string>(
  path: string,
): Promise<Record<T, string>[]> => {
  const parser = csv.parse({
    skipEmptyLines: true,
    columns: true,
  });
  const rows: Record<T, string>[] = [];
  parser.on("readable", () => {
    let row: Record<T, string> | null;
    while ((row = parser.read())) {
      rows.push(row);
    }
  });
  await pipeline(
    createReadStream(path),
    iconv.decodeStream("Shift_JIS"),
    parser,
  );

  return rows;
};

const parseLicenses = async () => {
  log.info("Parsing licenses...");

  const licensesIndex = new Map<string, LicenseIndex>();
  const updateLicensesIndex = (
    licenses: Record<"作品ID" | "タイトル", string>[],
    source: "externalDistribution" | "nonCommons" | "licenseOnly",
  ) => {
    for (const row of licenses) {
      const id = row["作品ID"];
      const title = row["タイトル"];

      const license =
        licensesIndex.get(id) ??
        ({
          id,
          title,
          externalDistribution: false,
          nonCommons: false,
          licenseOnly: false,
          childrenCount: 0,
        } as LicenseIndex);

      license[source] = true;
      licensesIndex.set(id, license);
    }
  };
  const commons1 = await parseCsv<Commons1Keys>(
    `${dataDir}/licenses-csv/commons1.csv`,
  );
  updateLicensesIndex(commons1, "externalDistribution");
  const commons2 = await parseCsv<Commons2Keys>(
    `${dataDir}/licenses-csv/commons2.csv`,
  );
  updateLicensesIndex(commons2, "nonCommons");
  const commons3 = await parseCsv<Commons3Keys>(
    `${dataDir}/licenses-csv/commons3.csv`,
  );
  updateLicensesIndex(commons3, "licenseOnly");
  log.info(`Found ${licensesIndex.size} licenses.`);

  const externalDistribution = toMap(commons1.map(convertCommons1));
  const nonCommons = toMap(commons2.map(convertCommons2));
  const licenseOnly = toMap(commons3.map(convertCommons3));

  for (const id of licensesIndex.keys()) {
    const childrenCount = [externalDistribution, nonCommons, licenseOnly]
      .map((map) => map.get(id)?.childrenCount ?? 0)
      .find((count) => count > 0) ?? 0;
    licensesIndex.set(id, {
      ...licensesIndex.get(id)!,
      childrenCount,
    });
  }

  return {
    licensesIndex,
    externalDistribution,
    nonCommons,
    licenseOnly,
  };
};

const updateDbSchema = async () => {
  log.info("Updating licenses table...");
  await db.query("DROP TABLE IF EXISTS licenses_index;");
  await db.query("DROP TABLE IF EXISTS external_distribution;");
  await db.query("DROP TABLE IF EXISTS non_commons;");
  await db.query("DROP TABLE IF EXISTS license_only;");
  await db.query("DROP TABLE IF EXISTS meta;");
  await db.query(`
    CREATE TABLE meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  await db.query(`
    CREATE TABLE licenses_index (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      external_distribution BOOLEAN NOT NULL,
      non_commons BOOLEAN NOT NULL,
      license_only BOOLEAN NOT NULL,
      children_count INTEGER NOT NULL
    );
  `);

  await db.query(`
    CREATE TABLE external_distribution (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      files_in_commons TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      uploader TEXT NOT NULL,
      related_url TEXT NOT NULL,
      usage TEXT NOT NULL,
      parent_registration TEXT NOT NULL,
      rights TEXT NOT NULL,
      preferred_rights TEXT NOT NULL,
      personal_monetization TEXT NOT NULL,
      corporate_monetization TEXT NOT NULL,
      personal_commercial_use TEXT NOT NULL,
      corporate_commercial_use TEXT NOT NULL,
      custom_conditions TEXT NOT NULL,
      children_count INTEGER NOT NULL
    );
  `);

  await db.query(`
    CREATE TABLE non_commons (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      uploader TEXT NOT NULL,
      children_count INTEGER NOT NULL
    );
  `);

  await db.query(`
    CREATE TABLE license_only (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      files_in_commons TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      uploader TEXT NOT NULL,
      related_url TEXT NOT NULL,
      usage TEXT NOT NULL,
      parent_registration TEXT NOT NULL,
      rights TEXT NOT NULL,
      preferred_rights TEXT NOT NULL,
      personal_monetization TEXT NOT NULL,
      corporate_monetization TEXT NOT NULL,
      personal_commercial_use TEXT NOT NULL,
      corporate_commercial_use TEXT NOT NULL,
      custom_conditions TEXT NOT NULL,
      children_count INTEGER NOT NULL
    );
  `);
};

const insertLicenses = async (
  licensesIndex: Map<string, LicenseIndex>,
  externalDistribution: Map<string, ExternalDistribution>,
  nonCommons: Map<string, NonCommons>,
  licenseOnly: Map<string, LicenseOnly>,
) => {
  log.info("Inserting licenses...");
  const bulkInsert = async <T extends Record<string, unknown>>(
    table: string,
    rows: T[],
  ) => {
    if (rows.length === 0) {
      return;
    }
    const keys = Object.keys(toPgRow(rows[0]));
    const values = rows.map((row) => Object.values(row));
    await db.query(
      `
      INSERT INTO ${table} (${keys.join(", ")})
      VALUES ${values
        .map(
          (row) =>
            `(${row.map((value) => (typeof value === "string" ? db.escapeLiteral(value) : value)).join(", ")})`,
        )
        .join(", ")};
    `,
    );
  };

  log.info(`Inserting licenses_index (${licensesIndex.size} rows)...`);
  await bulkInsert("licenses_index", Array.from(licensesIndex.values()));

  log.info(
    `Inserting external_distribution (${externalDistribution.size} rows)...`,
  );
  await bulkInsert("external_distribution", [...externalDistribution.values()]);

  log.info(`Inserting non_commons (${nonCommons.size} rows)...`);
  await bulkInsert("non_commons", [...nonCommons.values()]);

  log.info(`Inserting license_only (${licenseOnly.size} rows)...`);
  await bulkInsert("license_only", [...licenseOnly.values()]);
};

export const updateDb = async () => {
  log.info("Checking if the database is updated...");
  if (await isDbUpdated()) {
    log.info("The database is already updated.");
    return;
  }
  log.info("The database is not updated.");

  await downloadLicenses();

  const { licensesIndex, externalDistribution, nonCommons, licenseOnly } =
    await parseLicenses();

  await updateDbSchema();

  await insertLicenses(
    licensesIndex,
    externalDistribution,
    nonCommons,
    licenseOnly,
  );

  await db.query(
    "INSERT INTO meta (key, value) VALUES ('dbVersion', $1) ON CONFLICT (key) DO UPDATE SET value = $1;",
    [dbVersion.toString()],
  );

  log.info("Done.");
};

type Commons1Keys =
  | "作品ID"
  | "ニコニ・コモンズで配布しているファイル"
  | "カテゴリ"
  | "タイトル"
  | "説明文"
  | "投稿者名"
  | "関連URL"
  | "利用許可範囲"
  | "ニコニコ投稿時の親子登録"
  | "権利表記"
  | "希望する権利表記"
  | "動画配信サイトでの収益化（個人）"
  | "動画配信サイトでの収益化（法人）"
  | "営利利用（個人）"
  | "営利利用（法人）"
  | "独自に定める条件"
  | "子作品数";

type Commons2Keys = "作品ID" | "タイトル" | "説明文" | "投稿者名" | "子作品数";

type Commons3Keys = Commons1Keys;

const parseIntStrict = (value: string): number => {
  const parsed = parseInt(value);
  if (isNaN(parsed)) {
    throw new Error(`Failed to parse integer: ${value}`);
  }
  return parsed;
};

const convertCommons1 = (
  row: Record<Commons1Keys, string>,
): ExternalDistribution => {
  return {
    id: row["作品ID"],
    title: row["タイトル"],
    filesInCommons: row["ニコニ・コモンズで配布しているファイル"],
    category: row["カテゴリ"],
    description: row["説明文"],
    uploader: row["投稿者名"],
    relatedUrl: row["関連URL"],
    usage: row["利用許可範囲"],
    parentRegistration: row["ニコニコ投稿時の親子登録"],
    rights: row["権利表記"],
    preferredRights: row["希望する権利表記"],
    personalMonetization: row["動画配信サイトでの収益化（個人）"],
    corporateMonetization: row["動画配信サイトでの収益化（法人）"],
    personalCommercialUse: row["営利利用（個人）"],
    corporateCommercialUse: row["営利利用（法人）"],
    customConditions: row["独自に定める条件"],
    childrenCount: parseIntStrict(row["子作品数"]),
  };
};

const convertCommons2 = (row: Record<Commons2Keys, string>): NonCommons => {
  return {
    id: row["作品ID"],
    title: row["タイトル"],
    description: row["説明文"],
    uploader: row["投稿者名"],
    childrenCount: parseIntStrict(row["子作品数"]),
  };
};

const convertCommons3 = (row: Record<Commons3Keys, string>): LicenseOnly => {
  return convertCommons1(row);
};

const toMap = <T extends { id: string }>(rows: T[]): Map<string, T> => {
  const unique = new Map<string, T>();
  for (const row of rows) {
    unique.set(row.id, row);
  }
  return unique;
};

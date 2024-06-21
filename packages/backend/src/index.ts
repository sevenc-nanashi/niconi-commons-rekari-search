import { updateDb } from "./updateDb.js";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import * as env from "./env.js";
import consola from "consola";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { app } from "./app.js";
import { db } from "./db.js";
import "./routes/search.js";

process.chdir(__dirname);

app.use(logger(consola.withTag("api").info));

app.use(serveStatic({ root: `./frontend` }));

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }
  consola.error(error);

  return c.json({ error: error.message }, 500);
});

(async () => {
  await db.connect();
  await updateDb();
  serve(
    {
      port: env.apiPort,
      fetch: app.fetch.bind(app),
    },
    () => {
      consola.log(`Listening on port ${env.apiPort}`);
    },
  );
})();

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

app.use(logger(consola.withTag("api").info));

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }
  consola.error(error);

  return c.json({ error: error.message }, 500);
});

app.use(serveStatic({ root: `${__dirname}/frontend` }));

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

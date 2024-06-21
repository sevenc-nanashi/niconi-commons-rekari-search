import { Hono } from "hono";
import { updateDb } from "./updateDb.js";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import * as env from "./env.js";
import consola from "consola";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { app } from "./app.js";
import "./routes/search.js";

app.use(logger(consola.withTag("api").info));

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }
  consola.error(error);

  return c.json({ error: error.message }, 500);
});

await updateDb();

app.use(serveStatic({ root: `${import.meta.dirname}/frontend` }));

serve(
  {
    port: env.apiPort,
    fetch: app.fetch.bind(app),
  },
  () => {
    consola.log(`Listening on port ${env.apiPort}`);
  },
);

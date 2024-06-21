import { Hono } from "hono";
import { updateDb } from "./updateDb.js";
import { serve } from "@hono/node-server";
import * as env from "./env.js";
import consola from "consola";

const app = new Hono();

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

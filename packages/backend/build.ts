import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  platform: "node",
  format: "esm",
  outfile: `${import.meta.dirname}/../../dist/index.mjs`,
});

console.log("Build complete");

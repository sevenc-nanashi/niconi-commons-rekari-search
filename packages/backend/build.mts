import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  platform: "node",
  format: "cjs",
  outfile: `${import.meta.dirname}/../../dist/index.cjs`,
});

console.log("Build complete");

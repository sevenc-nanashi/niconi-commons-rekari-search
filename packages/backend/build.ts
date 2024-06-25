import { rollup } from "rollup";
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

const bundle = await rollup({
  input: `${import.meta.dirname}/src/index.ts`,
  plugins: [
    typescript(),
    nodeResolve({
      preferBuiltins: true,
    }),
    commonjs(),
    json(),
  ],
});

await bundle.write({
  file: `${import.meta.dirname}/../../dist/index.js`,
  format: "es",
});

console.log("Build complete");

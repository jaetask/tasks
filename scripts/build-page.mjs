import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const at = (path) => fileURLToPath(new URL(path, import.meta.url));

await build({
  entryPoints: { app: at("../page/main.tsx"), fonts: at("../page/fonts.css") },
  outdir: at("../public"),
  assetNames: "[name]",
  bundle: true,
  splitting: true,
  chunkNames: "chunk-[hash]",
  minify: true,
  format: "esm",
  target: "es2022",
  jsx: "automatic",
  loader: { ".woff2": "file" },
  define: { "import.meta.env": '{"SSR":false,"MODE":"production","DEV":false}' },
  logLevel: "warning",
});
execFileSync(
  at("../node_modules/.bin/tailwindcss"),
  ["-i", at("../page/app.css"), "-o", at("../public/app.css"), "--minify"],
  { stdio: ["ignore", "ignore", "inherit"] },
);
console.log("built public/app.js and public/app.css");

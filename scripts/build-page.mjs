// Builds Tasks' page (page/main.tsx and its styles) into public/app.js and public/app.css.
import { build } from "esbuild";

await build({
  entryPoints: [new URL("../page/main.tsx", import.meta.url).pathname],
  outdir: new URL("../public", import.meta.url).pathname,
  entryNames: "app",
  assetNames: "[name]",
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2022",
  jsx: "automatic",
  logLevel: "warning",
});
console.log("built public/app.js and public/app.css");

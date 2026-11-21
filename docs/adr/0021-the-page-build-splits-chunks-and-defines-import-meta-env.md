# 21. The page build splits chunks and defines import.meta.env

## Context

The page is bundled with esbuild in `scripts/build-page.mjs`. The toolkit's parts are written to run under Vite.

## Decision

The build turns splitting on. The toolkit loads its icon catalogue on demand, and splitting keeps it out of app.js. The build defines import.meta.env with SSR, MODE and DEV, because the toolkit's parts read these as they do under Vite.

## Consequences

Turning splitting off puts the whole icon catalogue in app.js. Removing the define breaks the toolkit's parts at run time.

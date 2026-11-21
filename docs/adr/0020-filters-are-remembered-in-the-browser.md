# 20. Filters are remembered in the browser and work without storage

## Context

Each board and backlog can be narrowed with filters. The owner expects them to be the same after a reload.

## Decision

`page/board.tsx` keeps the filters of one screen of one project in the browser's local storage. Reading and writing storage can fail, for example in a private window. A failure is ignored: the filters still work and are forgotten on reload.

## Consequences

The empty catch around storage is deliberate. Filters are a convenience of one browser and are not data of Tasks.

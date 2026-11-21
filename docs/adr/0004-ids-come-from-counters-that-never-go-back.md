# 4. Ids are a prefix and a counter that never goes back

## Context

Undo removes rows that a change created. The record of changes and the earlier ids of tickets still name those rows by id.

## Decision

An id is a short prefix and a counter, such as c12. The counters live in their own table and only go up, so an id is never used twice, even after an undo. This lives in `src/ids.ts`.

## Consequences

Do not derive the next id from the rows that exist, such as the highest id plus one. Do not lower or reset a counter. When a project's prefix changes, its ticket counter carries on from the higher of the two counters (see the decision on ticket ids).

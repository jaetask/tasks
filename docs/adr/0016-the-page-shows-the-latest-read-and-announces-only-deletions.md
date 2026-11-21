# 16. The page shows the latest read and announces only deletions

## Context

Anyone can change the data while the page is open: the owner here, an agent, or an inbox step. The page reads again after every change.

## Decision

Reads can overlap, so `page/app.tsx` shows only the answer to the read asked for last. `page/main.tsx` announces only a deletion, in the words of its change, with the way to undo it. Any other change shows where it was made, and a notification for each would bury the ones that matter. A form that edits recorded data, such as evidence in `page/evidence.tsx`, starts from what is recorded at the moment it opens, which an agent may have changed.

## Consequences

Do not show the result of an earlier read after a later one. Do not add a notification for ordinary changes.

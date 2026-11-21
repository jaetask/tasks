# 5. A ticket that gets another id keeps its earlier id as another name

## Context

A ticket's id starts with its project's prefix. The id changes when the prefix changes or when the ticket moves to another project. Addresses, comments and agents may still hold the earlier id.

## Decision

`src/tickets/rekey.ts` gives tickets their new ids. Every table with a ticket column follows. The earlier id is kept in a table of aliases, and `src/tickets/tickets.ts` looks an unknown id up there. Earlier changes to the ticket can no longer be undone, since their rows hold the earlier id. The work runs inside the Call's transaction with foreign keys deferred, so the tables are checked against each other only when it ends. A label on a ticket is stored under an id made of the ticket's id and the label's, so that id is rewritten too. On a prefix change the project's ticket numbers go on from where they were, past any that an earlier project with that prefix left. An intake step set to run on the project's items follows the new project id. A ticket that moves to another project leaves its feature, because a feature belongs to one project.

## Consequences

A new table that names a ticket must call its column `ticket`, or rekey will not find it. A new place that stores a ticket id or a project id inside text or JSON needs its own line in rekey. Moving a ticket or changing a prefix ends undo for that ticket's earlier changes.

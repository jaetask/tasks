# 7. Only the owner, on the page, deletes a ticket for good

## Context

Deleting a ticket for good cannot be undone. Agents and inbox steps act through Connections and Calls, and an App can make Calls as the owner.

## Decision

In `src/tickets/domain.ts` the Domain's authorise rule lets only the owner restore a ticket. It lets a ticket be deleted for good only when the principal is the owner and the Call comes from the page. No Connection or step can do it, whoever it acts as. Agents archive and cancel tickets, which can be undone.

## Consequences

The check on where the Call comes from is part of the rule. Do not reduce it to a check of the actor.

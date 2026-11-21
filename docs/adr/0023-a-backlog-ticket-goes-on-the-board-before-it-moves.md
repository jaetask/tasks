# 23. A backlog ticket goes on the board before it moves to a column

## Context

A ticket in the backlog is off the board. The status picker lists the backlog and every column as choices.

## Decision

The Action that moves a ticket to a column refuses a ticket that is in the backlog (`src/tickets/tickets.ts`). When a column is picked for a backlog ticket, `page/properties.tsx` first puts the ticket on the board and then moves it to the column picked.

## Consequences

The two Calls must stay in this order. Each is its own recorded change.

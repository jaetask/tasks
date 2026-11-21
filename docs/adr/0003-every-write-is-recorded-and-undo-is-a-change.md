# 3. Every write goes through the record of changes, and undo is itself a recorded change

## Context

The owner and agents change the same tickets. The owner needs to see who changed what and to take a change back.

## Decision

Every write goes through `rows` in `src/journal.ts`, which remembers what each row was before and after. `record` stores those with the actor who made the change. Undo puts the rows back and is itself a recorded change, so undoing an undo makes the first change undoable again. Undo is refused when the rows have changed since. In `src/actions.ts` a write that changed no row, such as the same reaction twice, records no change and raises no change event. A change made by bringing data in from another app is marked as imported, so it does not count as the last time someone changed the ticket.

## Consequences

A write that goes around `rows` is not recorded and cannot be undone. The time a ticket last changed is read from the record of changes, leaving imported changes out. Changes marked final hold no rows and cannot be undone.

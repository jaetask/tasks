# 19. The ticket dialog and the labels list keep their position

## Context

A ticket's content changes while it is open: text is added, labels come and go, an agent adds comments.

## Decision

The ticket dialog has a fixed height, so it stays where it is as the ticket inside it grows or shrinks (`page/board.tsx`). The labels list opens beside the Labels heading, which does not move as labels come and go (`page/ticket.tsx`).

## Consequences

A dialog sized to its content moves under the pointer on every change. A list anchored to the add button moves when a label lands on the ticket.

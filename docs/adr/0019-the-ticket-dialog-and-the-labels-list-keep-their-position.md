# 19. The ticket dialog and the labels list keep their position

## Context

A ticket's content changes while it is open: text is added, labels come and go, an agent adds comments.

## Decision

The ticket dialog has a fixed height, so it stays where it is as the ticket inside it grows or shrinks (`page/board.tsx`). The labels list opens beside the Labels heading, which does not move as labels come and go (`page/ticket.tsx`).

The ticket dialog is centred with `inset: 0`, `margin: auto` and `translate: none`, with its open and close motion off (`page/board.tsx`). The editor's selection toolbar places itself with `position: fixed` and coordinates measured from the window. A dialog centred by a translate becomes the containing block for that toolbar, which then appears far from the selected words.

The ticket's main column and the New ticket dialog leave room on the left of the text for the editor's block handle, which is drawn 24px to the left of a block (`page/ticket.tsx`, `page/new-ticket.tsx`).

## Consequences

A dialog sized to its content moves under the pointer on every change. A list anchored to the add button moves when a label lands on the ticket. A translate, transform or filter on the ticket dialog puts the selection toolbar in the wrong place again.

# 17. A menu item that opens a dialog runs after the menu has closed

## Context

The ticket menu's items open dialogs. A menu that is closing takes the focus with it.

## Decision

In `page/ticket-menu.tsx` an item that opens a dialog runs once the menu has closed and given up the focus. Opened sooner, the dialog would have the focus taken out of its box by the closing menu.

## Consequences

Running such an item directly on select brings the fault back: the dialog opens and loses the focus. Items that open no dialog run at once.

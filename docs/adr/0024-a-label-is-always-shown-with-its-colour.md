# 24. A label is always shown with its colour

## Context

A label has a name and a colour. The colour is how a label is told apart at a glance on a card, in a list and in a menu. A label drawn as plain text in one place and with its colour in another reads as two different things.

## Decision

Wherever the page names a label, it shows the label's colour dot beside the name: on cards, on a ticket, in the labels picker, in the filter menu and its chip, in the New ticket dialog and in Settings. The page does this through three helpers in `page/pickers.tsx`: `labelChoice` for a list of choices, `LabelName` for a name in text, and `LabelDot` for the dot alone. `labelNames` gives the names as plain text for a tooltip that sits on a row of dots.

`scripts/check-labels.mjs`, part of `npm run lint`, fails when page code outside `page/pickers.tsx` reads a label's name from a list of labels without one of those helpers.

## Consequences

A new place that lists labels uses `labelChoice` or `LabelName`. Reading `label.name` straight from `catalog.labels` or `ticket.labels` fails lint and names the helpers to use.

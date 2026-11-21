# 18. A card ignores clicks from pickers drawn outside it, and an empty choice travels as a stand-in value

## Context

The page is built from the toolkit's parts. Two of their behaviours shape the page's code.

## Decision

A picker opened from a card is drawn outside the card in the document, but its clicks still reach the card's handler. `page/board.tsx` opens the ticket only when the click's target is inside the card and not on a chip. A Select item cannot have an empty value, so in `page/local.tsx` the option with the id "" travels as a stand-in value and is turned back on change.

## Consequences

Removing the target check makes a click in a picker open the ticket as well. The stand-in value must not be used as a real option id.

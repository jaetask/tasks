# 15. Return sends from the write box

## Context

Comments and replies are written in the rich editor, where Return starts a new paragraph and also picks a block from the editor's own menu.

## Decision

In `page/activity.tsx` Return sends and Shift+Return starts a new line. The key is caught in the capture phase, before the editor, which would otherwise start a paragraph. It is left alone while the editor's own menu is choosing a block, and while a word is still being composed on an input-method keyboard. A lone slash followed by a word is a block being asked for, not a message, even when no block matches. Text that is only Markdown marks with no words, such as an empty heading, quote or list item, is not sent.

## Consequences

The order of these checks matters. Removing the composing check sends half-written words for people who type with an input method. Removing the menu check sends the text of a block request as a message.

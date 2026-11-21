# 14. Ticket text is saved as Markdown and the editor loads when first needed

## Context

The owner writes descriptions and comments in a rich editor. Agents read and write the same text over MCP.

## Decision

What is written in the editor is saved as Markdown, so agents read and write plain text. The editor is loaded when a ticket first needs it (`page/editor.tsx`). The editor is built again whenever its options change identity, so the picture option is one shared object and the function that stores a picture is kept the same from one render to the next (`page/editor.tsx`, `page/activity.tsx`).

## Consequences

Stored text stays Markdown. Passing the editor a new object or function on each render rebuilds it and loses what is being typed.

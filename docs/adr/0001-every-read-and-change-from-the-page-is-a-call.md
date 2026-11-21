# 1. Every read and change from the page is a Call

## Context

The page and agents both use Tasks. Two ways in would mean two sets of rules for who may do what.

## Decision

The page reads and changes everything through Calls to Actions, sent to POST /api/calls. This is the same Call pipeline agents use over MCP. The page's side lives in `page/api.ts`; the server's side is set up in `src/app.ts`. The one exception is the bytes of a file, which have their own two paths (see the decision on file bytes).

## Consequences

The page can do nothing an Action does not offer. A new feature of the page starts as an Action. Do not add an HTTP route that reads or writes data for the page.

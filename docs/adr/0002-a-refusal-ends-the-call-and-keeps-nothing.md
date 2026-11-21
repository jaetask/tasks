# 2. A refusal ends the Call as rejected and keeps nothing the Action changed

## Context

A Domain sometimes has to say no for a reason a person or an agent can act on, such as no such ticket or a name already taken. The Action may already have written rows when it finds out.

## Decision

An Action says no by throwing a Refusal with a code and a message. The Kit ends the Call as rejected with that code and message, and keeps nothing the Action changed. The type lives in `src/refusal.ts`; `src/actions.ts` lets any Action throw one.

## Consequences

An Action can check and refuse at any point, also after writing. Code that catches errors inside an Action must let a Refusal pass, as undo does in `src/journal.ts`. Any other error is a fault, not a refusal.

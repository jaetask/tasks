# 12. Inbox steps act through the Call pipeline with only the Actions they were given

## Context

The owner sets up steps that look at each new inbox item: a script, a model, a classifier or another App. A step's answer comes from code or a model that Tasks does not control.

## Decision

`src/inbox/pipeline.ts` runs the owner's steps on an item in order. Each step's Calls go through the Call pipeline as the step's actor, limited to the Actions the step was given. `src/inbox/inbox.ts` lists the Actions a step can be given; a step may ask for these and no others. A reject, dismiss or promote ends the run. Every run is recorded. Runs take turns, one at a time. The Action that asks for another run only raises a change with the subject item-run (`src/inbox/domain.ts`); `src/app.ts` runs the steps when it sees that change or a new item.

## Consequences

A step can do nothing an agent with the same Actions could not do, and what it does is recorded as Calls. Do not let a step write to the database directly. Renaming the item-run change needs the same change in `src/app.ts`.

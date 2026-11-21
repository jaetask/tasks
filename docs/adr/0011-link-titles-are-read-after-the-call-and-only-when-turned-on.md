# 11. Link titles are read after the Call, once, and only when turned on

## Context

Reading a page's title means asking another site, which is slow and tells that site about the link.

## Decision

`src/tickets/link-titles.ts` listens for the change that adds a link. It reads the page's title once and records it with the Action tickets.ticket-link-describe, after the Call that added the link has answered. A link whose page states no title stays as its address. The reader is an option of `src/app.ts`: without one, links keep their address as their name and Tasks asks no other site anything. `src/main.ts` passes the reader only when LINK_TITLES=1.

## Consequences

Adding a link never waits on another site. The title arrives as a separate recorded change. Tasks makes no outbound request for links unless the setting is on.

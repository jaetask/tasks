# 10. Every request for a link's title is guarded

## Context

Tasks reads the title of the page a link points to. The address was typed by a person or an agent, so it can point at this machine or a private network.

## Decision

`src/tickets/page-title.ts` makes every request under guards: public addresses only, a short timeout, a small read and few redirects. Nothing in it follows what the page says. A host name is checked before it is looked up. The lookup itself hands back only public addresses, so the connection that is made is the one that was checked; public names such as localtest.me and nip.io names resolve to 127.0.0.1 and are refused there. An IPv4 address written as IPv6 is judged as the IPv4 address it is.

## Consequences

The guard on the lookup must stay on the request itself. Checking the name first and then connecting without the guarded lookup lets a name that resolves to a local address through. Each redirect is a new request and passes the same checks.

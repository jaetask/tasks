# 25. The page has no sign-in, and Tasks answers this computer only

## Context

Tasks serves one owner on their own computer. The Kit's page routes need a session cookie, which the Kit gives in exchange for a setup secret. Asking the owner for a secret on their own machine protects nothing that binding to the computer does not already protect.

## Decision

`src/app.ts` makes a setup secret of its own at each start, exchanges it with the Kit for a session, ends every older session, and puts that session's cookie on every request to `/api/` and `/events`. The Kit's sign-in routes `/api/session` and `/api/sessions` answer 404. Tasks listens on 127.0.0.1 unless `HOST` says otherwise, and `compose.yaml` publishes its port on 127.0.0.1. Every request whose Host header names anything but 127.0.0.1, localhost or [::1] is refused, so a web page that points its own name at this computer cannot reach Tasks. The Kit's guard on writes, the X-Kit-Request header and a matching origin, stays. Connections still need their key on `/mcp`. Tests in `src/app.test.ts` hold both rules.

## Consequences

Anyone who can reach the port on this computer acts as the owner. Do not listen on a wider address; reaching Tasks from another machine needs sign-in back first.

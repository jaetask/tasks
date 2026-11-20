# connections

## Input

[connections.json](connections.json)

## Output

### Steps

1. the page calls catalog.catalog-read → HTTP 401: {"error":"Sign in first."}
2. the owner signs in on the page → HTTP 401
3. the owner signs in on the page → HTTP 200
4. the page calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
5. the page calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
6. the page calls catalog.actor-create {"name":"Watcher"} → succeeded; created actor a2
7. the page calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
8. the page calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-1
9. Coding agent asks to connect, to read and write and danger → HTTP 200
10. Dashboard asks to connect, to read → HTTP 200
11. Coding agent asks for its key → HTTP 202: waiting
12. Coding agent calls tickets__work-find over MCP → no answer: Error POSTing to endpoint: {"error":"A valid Connection token is required."}
13. the page calls connections.connection-list → succeeded:

```json
[
  {
    "id": "<Coding agent>",
    "name": "Coding agent",
    "state": "pairing",
    "actor": "",
    "actorName": "",
    "may": "read and change"
  },
  {
    "id": "<Dashboard>",
    "name": "Dashboard",
    "state": "pairing",
    "actor": "",
    "actorName": "",
    "may": "read"
  }
]
```

14. POST /api/connections/$Coding agent/approve (signed in) → HTTP 404: {"error":"Approve a Connection with the Action connections.connection-approve."}
15. the page calls connections.connection-approve {"connection":"$Coding agent","actor":"owner","change":true} → rejected: owner: A Connection cannot act as the owner. Pick an agent's actor.
16. the page calls connections.connection-approve {"connection":"$Coding agent","actor":"a9","change":true} → rejected: unknown-actor: No actor has id a9.
17. the page calls connections.connection-approve {"connection":"$Coding agent","actor":"a1","change":true} → succeeded; updated connection <Coding agent>
18. the page calls connections.connection-approve {"connection":"$Coding agent","actor":"a2","change":true} → rejected: not-waiting: That Connection is already connected.
19. the page calls connections.connection-approve {"connection":"$Dashboard","actor":"a2","change":false} → succeeded; updated connection <Dashboard>
20. Coding agent asks for its key → HTTP 200: its key
21. Coding agent asks for its key → HTTP 403: refused
22. Dashboard asks for its key → HTTP 200: its key
23. Coding agent calls tickets__ticket-claim {"ticket":"TLK-1"} over MCP → succeeded; updated ticket TLK-1
24. Coding agent calls tickets__ticket-claim {"ticket":"TLK-1"} over MCP → succeeded; updated ticket TLK-1
25. Coding agent calls comments__comment-add {"ticket":"TLK-1","text":"Recording works in the app."} over MCP → succeeded; created comment m1
26. Coding agent calls tickets__ticket-archive {"ticket":"TLK-1"} over MCP → succeeded; updated ticket TLK-1
27. Coding agent calls tickets__ticket-restore {"ticket":"TLK-1"} over MCP → rejected: not-allowed: a1 may not run tickets.ticket-restore
28. Coding agent calls tickets__ticket-delete {"ticket":"TLK-1"} over MCP → rejected: not-allowed: a1 may not run tickets.ticket-delete
29. Coding agent calls history__change-undo {"change":"h5"} over MCP → rejected: not-allowed: a1 may not run history.change-undo
30. Coding agent calls catalog__project-create {"name":"Mine","prefix":"MIN"} over MCP → rejected: not-allowed: a1 may not run catalog.project-create
31. Coding agent calls connections__connection-list over MCP → rejected: not-allowed: a1 may not run connections.connection-list
32. Dashboard calls tickets__ticket-find {"state":"archived"} over MCP → succeeded:

```json
[
  {
    "id": "TLK-1",
    "project": "TLK",
    "title": "Voice notes on the phone",
    "description": "",
    "feature": null,
    "featureName": "",
    "column": {
      "id": "c2",
      "name": "Doing",
      "kind": "doing"
    },
    "assignee": "a1",
    "assigneeName": "Coder",
    "labels": [],
    "type": "task",
    "priority": "none",
    "reactions": [],
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": null,
    "state": "archived",
    "backlog": false,
    "comments": 1,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:08:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:26:00.000Z",
    "columnSince": "2026-01-01T09:23:00.000Z"
  }
]
```

33. Dashboard calls comments__comment-add {"ticket":"TLK-1","text":"Hello."} over MCP → rejected: not-in-scope: This Connection may not run write Actions.
34. the page calls tickets.ticket-restore {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
35. Tasks restarts
36. Coding agent calls tickets__ticket-review-request {"ticket":"TLK-1"} over MCP → succeeded; updated ticket TLK-1
37. the page calls connections.connection-revoke {"connection":"$Coding agent"} → succeeded; updated connection <Coding agent>
38. Coding agent calls tickets__ticket-finish {"ticket":"TLK-1"} over MCP → no answer: Error POSTing to endpoint: {"error":"A valid Connection token is required."}
39. the page calls connections.connection-revoke {"connection":"$Coding agent"} → rejected: no-change: That Connection is already revoked.
40. the page calls connections.connection-list → succeeded:

```json
[
  {
    "id": "<Coding agent>",
    "name": "Coding agent",
    "state": "revoked",
    "actor": "a1",
    "actorName": "Coder",
    "may": "read and change"
  },
  {
    "id": "<Dashboard>",
    "name": "Dashboard",
    "state": "connected",
    "actor": "a2",
    "actorName": "Watcher",
    "may": "read"
  }
]
```

41. the page calls history.change-list {"ticket":"TLK-1"} → succeeded:

```json
[
  {
    "id": "h5",
    "at": "2026-01-01T09:08:00.000Z",
    "actor": "owner",
    "action": "tickets.ticket-create",
    "summary": "created TLK-1 in To do: Voice notes on the phone",
    "ticket": "TLK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  },
  {
    "id": "h8",
    "at": "2026-01-01T09:23:00.000Z",
    "actor": "a1",
    "action": "tickets.ticket-claim",
    "summary": "claimed TLK-1 and moved it to Doing",
    "ticket": "TLK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  },
  {
    "id": "h9",
    "at": "2026-01-01T09:25:00.000Z",
    "actor": "a1",
    "action": "comments.comment-add",
    "summary": "commented on TLK-1",
    "ticket": "TLK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  },
  {
    "id": "h10",
    "at": "2026-01-01T09:26:00.000Z",
    "actor": "a1",
    "action": "tickets.ticket-archive",
    "summary": "archived TLK-1",
    "ticket": "TLK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  },
  {
    "id": "h11",
    "at": "2026-01-01T09:34:00.000Z",
    "actor": "owner",
    "action": "tickets.ticket-restore",
    "summary": "restored TLK-1 to Doing",
    "ticket": "TLK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  },
  {
    "id": "h12",
    "at": "2026-01-01T09:36:00.000Z",
    "actor": "a1",
    "action": "tickets.ticket-review-request",
    "summary": "asked for review of TLK-1; it is in Review",
    "ticket": "TLK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  }
]
```


### Change events the page saw

updated actor owner (catalog.actor-rename, caller ui)
created actor a1 (catalog.actor-create, caller ui)
created actor a2 (catalog.actor-create, caller ui)
created project TLK (catalog.project-create, caller ui)
created ticket TLK-1 (tickets.ticket-create, caller ui)
updated connection <Coding agent> (connections.connection-approve, caller ui)
updated connection <Dashboard> (connections.connection-approve, caller ui)
updated ticket TLK-1 (tickets.ticket-claim, caller plugin)
created comment m1 (comments.comment-add, caller plugin)
updated ticket TLK-1 (tickets.ticket-archive, caller plugin)
updated ticket TLK-1 (tickets.ticket-restore, caller ui)
updated ticket TLK-1 (tickets.ticket-review-request, caller plugin)
updated connection <Coding agent> (connections.connection-revoke, caller ui)

### Connections

| name | state | acts as | effects |
| --- | --- | --- | --- |
| Coding agent | revoked | a1 | read, write |
| Dashboard | connected | a2 | read |

### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner | Sam |  |  |
| a1 | Coder |  |  |
| a2 | Watcher |  |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |

### Labels

None.

### Locations

None.

### Features

None.

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | Voice notes on the phone |  | Review | Coder |  |  |  | open |

### Comments

| id | ticket | reply to | author | text | reactions |
| --- | --- | --- | --- | --- | --- |
| m1 | TLK-1 |  | Coder | Recording works in the app. |  |

### Images

None.

### Input requests

None.

### Ticket steps

None.

### Agent inboxes

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:04 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:05 | owner | catalog.actor-create | added actor Coder |  |  |
| h3 | 09:06 | owner | catalog.actor-create | added actor Watcher |  |  |
| h4 | 09:07 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h5 | 09:08 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes on the phone | TLK-1 |  |
| h6 | 09:17 | owner | connections.connection-approve | approved the connection Coding agent as Coder, to read and change |  |  |
| h7 | 09:19 | owner | connections.connection-approve | approved the connection Dashboard as Watcher, to read |  |  |
| h8 | 09:23 | a1 | tickets.ticket-claim | claimed TLK-1 and moved it to Doing | TLK-1 |  |
| h9 | 09:25 | a1 | comments.comment-add | commented on TLK-1 | TLK-1 |  |
| h10 | 09:26 | a1 | tickets.ticket-archive | archived TLK-1 | TLK-1 |  |
| h11 | 09:34 | owner | tickets.ticket-restore | restored TLK-1 to Doing | TLK-1 |  |
| h12 | 09:36 | a1 | tickets.ticket-review-request | asked for review of TLK-1; it is in Review | TLK-1 |  |
| h13 | 09:37 | owner | connections.connection-revoke | revoked the connection Coding agent |  |  |

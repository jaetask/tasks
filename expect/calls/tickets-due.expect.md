# tickets-due

## Input

[tickets-due.json](tickets-due.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
4. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-1
5. owner calls tickets.ticket-create {"project":"TLK","title":"Crash on send"} → succeeded; created ticket TLK-2
6. owner calls tickets.ticket-create {"project":"TLK","title":"Write the guide"} → succeeded; created ticket TLK-3
7. a1 calls tickets.ticket-due-set {"ticket":"TLK-1","due":"2026-01-01"} → succeeded; updated ticket TLK-1
8. owner calls tickets.ticket-due-set {"ticket":"TLK-2","due":"2025-12-20"} → succeeded; updated ticket TLK-2
9. owner calls tickets.ticket-due-set {"ticket":"TLK-3","due":"2026-01-05"} → succeeded; updated ticket TLK-3
10. owner calls tickets.ticket-due-set {"ticket":"TLK-3","due":"next friday"} → rejected: invalid-input: due: a due date is a day written as YYYY-MM-DD; due: a due date is a day written as YYYY-MM-DD
11. owner calls tickets.ticket-due-set {"ticket":"TLK-9","due":"2026-01-05"} → rejected: unknown-ticket: No ticket has id TLK-9.
12. owner calls tickets.ticket-find {"due":"overdue"} → succeeded:

```json
[
  {
    "id": "TLK-2",
    "project": "TLK",
    "title": "Crash on send",
    "description": "",
    "feature": null,
    "featureName": "",
    "column": {
      "id": "c1",
      "name": "To do",
      "kind": "todo"
    },
    "assignee": null,
    "assigneeName": "",
    "labels": [],
    "type": "task",
    "priority": "none",
    "reactions": [],
    "due": "2025-12-20",
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": null,
    "state": "open",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:05:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:08:00.000Z",
    "columnSince": "2026-01-01T09:05:00.000Z"
  }
]
```

13. owner calls tickets.ticket-due-set {"ticket":"TLK-2","due":null} → succeeded; updated ticket TLK-2
14. owner calls history.change-undo {"change":"h10"} → succeeded; updated change h10
15. owner calls tickets.ticket-find {"due":"week"} → succeeded:

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
      "id": "c1",
      "name": "To do",
      "kind": "todo"
    },
    "assignee": null,
    "assigneeName": "",
    "labels": [],
    "type": "task",
    "priority": "none",
    "reactions": [],
    "due": "2026-01-01",
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": null,
    "state": "open",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:04:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:07:00.000Z",
    "columnSince": "2026-01-01T09:04:00.000Z"
  },
  {
    "id": "TLK-3",
    "project": "TLK",
    "title": "Write the guide",
    "description": "",
    "feature": null,
    "featureName": "",
    "column": {
      "id": "c1",
      "name": "To do",
      "kind": "todo"
    },
    "assignee": null,
    "assigneeName": "",
    "labels": [],
    "type": "task",
    "priority": "none",
    "reactions": [],
    "due": "2026-01-05",
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": null,
    "state": "open",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:06:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:09:00.000Z",
    "columnSince": "2026-01-01T09:06:00.000Z"
  }
]
```


### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner | Sam |  |  |
| a1 | Coder |  |  |

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
| TLK-1 | Voice notes on the phone |  | To do |  |  |  |  | open |
| TLK-2 | Crash on send |  | To do |  |  |  |  | open |
| TLK-3 | Write the guide |  | To do |  |  |  |  | open |

### Comments

None.

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
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Coder |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h4 | 09:04 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes on the phone | TLK-1 |  |
| h5 | 09:05 | owner | tickets.ticket-create | created TLK-2 in To do: Crash on send | TLK-2 |  |
| h6 | 09:06 | owner | tickets.ticket-create | created TLK-3 in To do: Write the guide | TLK-3 |  |
| h7 | 09:07 | a1 | tickets.ticket-due-set | set TLK-1 due on 2026-01-01 | TLK-1 |  |
| h8 | 09:08 | owner | tickets.ticket-due-set | set TLK-2 due on 2025-12-20 | TLK-2 |  |
| h9 | 09:09 | owner | tickets.ticket-due-set | set TLK-3 due on 2026-01-05 | TLK-3 |  |
| h10 | 09:13 | owner | tickets.ticket-due-set | removed the due date of TLK-2 | TLK-2 | h11 |
| h11 | 09:14 | owner | history.change-undo | undid: removed the due date of TLK-2 | TLK-2 |  |

# column-archive

## Input

[column-archive.json](column-archive.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
4. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-1
5. owner calls tickets.ticket-create {"project":"TLK","title":"Crash on send"} → succeeded; created ticket TLK-2
6. a1 calls tickets.column-archive {"column":"c1"} → succeeded; updated column c1
7. owner calls tickets.ticket-find {"project":"TLK"} → succeeded:

```json
[]
```

8. owner calls tickets.column-archive {"column":"c1"} → rejected: nothing-there: To do has no tickets to archive.
9. owner calls tickets.column-archive {"column":"c99"} → rejected: unknown-column: No column has id c99.
10. owner calls history.change-undo {"change":"h6"} → succeeded; updated change h6
11. owner calls tickets.ticket-find {"project":"TLK"} → succeeded:

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
    "evidence": null,
    "due": null,
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
    "updatedAt": "2026-01-01T09:04:00.000Z",
    "columnSince": "2026-01-01T09:04:00.000Z"
  },
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
    "evidence": null,
    "due": null,
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
    "updatedAt": "2026-01-01T09:05:00.000Z",
    "columnSince": "2026-01-01T09:05:00.000Z"
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
| h6 | 09:06 | a1 | tickets.column-archive | archived 2 tickets in To do of TLK |  | h7 |
| h7 | 09:10 | owner | history.change-undo | undid: archived 2 tickets in To do of TLK |  |  |

# tickets-undo

## Input

[tickets-undo.json](tickets-undo.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
2. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
3. owner calls catalog.label-create {"name":"voice","colour":"teal"} → succeeded; created label l1
4. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes","labels":["l1"]} → succeeded; created ticket TLK-1
5. a1 calls tickets.ticket-move {"ticket":"TLK-1","column":"c4"} → succeeded; updated ticket TLK-1
6. a1 calls tickets.ticket-assign {"ticket":"TLK-1","actor":"a1"} → succeeded; updated ticket TLK-1
7. a1 calls tickets.ticket-edit {"ticket":"TLK-1","title":"Voice memos","description":"Shorter."} → succeeded; updated ticket TLK-1
8. a1 calls tickets.ticket-label-remove {"ticket":"TLK-1","label":"l1"} → succeeded; updated ticket TLK-1
9. a1 calls tickets.ticket-archive {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
10. a1 calls history.change-undo {"change":"h9"} → rejected: not-allowed: a1 may not run history.change-undo
11. owner calls history.change-undo {"change":"h9"} → succeeded; updated change h9
12. owner calls history.change-undo {"change":"h5"} → succeeded; updated change h5
13. owner calls history.change-undo {"change":"h8"} → succeeded; updated change h8
14. owner calls history.change-undo {"change":"h7"} → succeeded; updated change h7
15. owner calls history.change-undo {"change":"h4"} → rejected: changed-since: Something h4 changed has changed again since. Undo the later change first.
16. owner calls tickets.ticket-create {"project":"TLK","title":"A mistake"} → succeeded; created ticket TLK-2
17. owner calls history.change-undo {"change":"h14"} → succeeded; updated change h14
18. owner calls tickets.ticket-read {"ticket":"TLK-1"} → succeeded:

```json
{
  "id": "TLK-1",
  "project": "TLK",
  "title": "Voice notes",
  "description": "",
  "feature": null,
  "featureName": "",
  "column": {
    "id": "c1",
    "name": "To do",
    "kind": "todo"
  },
  "assignee": "a1",
  "assigneeName": "Coder",
  "labels": [
    {
      "id": "l1",
      "name": "voice",
      "colour": "teal"
    }
  ],
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
  "updatedAt": "2026-01-01T09:14:00.000Z",
  "columnSince": "2026-01-01T09:05:00.000Z"
}
```


### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner |  |  |  |
| a1 | Coder |  |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |

### Labels

| id | name | colour |
| --- | --- | --- |
| l1 | voice | teal |

### Locations

None.

### Features

None.

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | Voice notes |  | To do | Coder |  | voice |  | open |

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
| h1 | 09:01 | owner | catalog.actor-create | added actor Coder |  |  |
| h2 | 09:02 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h3 | 09:03 | owner | catalog.label-create | created label voice |  |  |
| h4 | 09:04 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes | TLK-1 |  |
| h5 | 09:05 | a1 | tickets.ticket-move | moved TLK-1 from To do to Done | TLK-1 | h11 |
| h6 | 09:06 | a1 | tickets.ticket-assign | assigned TLK-1 to Coder | TLK-1 |  |
| h7 | 09:07 | a1 | tickets.ticket-edit | edited the title and description of TLK-1 | TLK-1 | h13 |
| h8 | 09:08 | a1 | tickets.ticket-label-remove | removed the label voice from TLK-1 | TLK-1 | h12 |
| h9 | 09:09 | a1 | tickets.ticket-archive | archived TLK-1 | TLK-1 | h10 |
| h10 | 09:11 | owner | history.change-undo | undid: archived TLK-1 | TLK-1 |  |
| h11 | 09:12 | owner | history.change-undo | undid: moved TLK-1 from To do to Done | TLK-1 |  |
| h12 | 09:13 | owner | history.change-undo | undid: removed the label voice from TLK-1 | TLK-1 |  |
| h13 | 09:14 | owner | history.change-undo | undid: edited the title and description of TLK-1 | TLK-1 |  |
| h14 | 09:16 | owner | tickets.ticket-create | created TLK-2 in To do: A mistake | TLK-2 | h15 |
| h15 | 09:17 | owner | history.change-undo | undid: created TLK-2 in To do: A mistake | TLK-2 |  |

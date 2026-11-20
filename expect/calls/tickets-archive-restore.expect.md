# tickets-archive-restore

## Input

[tickets-archive-restore.json](tickets-archive-restore.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
2. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
3. owner calls tickets.ticket-create {"project":"TLK","title":"Keep"} → succeeded; created ticket TLK-1
4. owner calls tickets.ticket-create {"project":"TLK","title":"Drop"} → succeeded; created ticket TLK-2
5. owner calls tickets.ticket-create {"project":"TLK","title":"Gone for good"} → succeeded; created ticket TLK-3
6. a1 calls tickets.ticket-move {"ticket":"TLK-1","column":"c3"} → succeeded; updated ticket TLK-1
7. a1 calls tickets.ticket-archive {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
8. a1 calls tickets.ticket-cancel {"ticket":"TLK-2"} → succeeded; updated ticket TLK-2
9. a1 calls tickets.ticket-cancel {"ticket":"TLK-1"} → rejected: not-open: TLK-1 is archived. The owner can restore it.
10. a1 calls tickets.ticket-edit {"ticket":"TLK-1","title":"Changed"} → rejected: not-open: TLK-1 is archived. The owner can restore it.
11. a1 calls tickets.ticket-restore {"ticket":"TLK-1"} → rejected: not-allowed: a1 may not run tickets.ticket-restore
12. a1 calls tickets.ticket-delete {"ticket":"TLK-3"} → rejected: not-allowed: a1 may not run tickets.ticket-delete
13. a1 calls tickets.ticket-find {"state":"archived"} → succeeded:

```json
[
  {
    "id": "TLK-1",
    "project": "TLK",
    "title": "Keep",
    "description": "",
    "feature": null,
    "featureName": "",
    "column": {
      "id": "c3",
      "name": "Review",
      "kind": "waiting"
    },
    "assignee": null,
    "assigneeName": "",
    "labels": [],
    "type": "task",
    "priority": "none",
    "reactions": [],
    "due": null,
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": null,
    "state": "archived",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:03:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:07:00.000Z",
    "columnSince": "2026-01-01T09:06:00.000Z"
  }
]
```

14. owner calls tickets.ticket-restore {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
15. owner calls tickets.ticket-restore {"ticket":"TLK-1"} → rejected: no-change: TLK-1 is already open.
16. owner calls history.change-undo {"change":"h8"} → succeeded; updated change h8
17. owner calls tickets.ticket-delete {"ticket":"TLK-3"} → succeeded; deleted ticket TLK-3
18. owner calls history.change-undo {"change":"h11"} → rejected: final: h11 cannot be undone.
19. owner calls history.change-undo {"change":"h5"} → rejected: final: h5 cannot be undone.
20. owner calls tickets.ticket-read {"ticket":"TLK-3"} → rejected: unknown-ticket: No ticket has id TLK-3.
21. owner calls tickets.ticket-create {"project":"TLK","title":"Number four"} → succeeded; created ticket TLK-4

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

None.

### Locations

None.

### Features

None.

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | Keep |  | Review |  |  |  |  | open |
| TLK-2 | Drop |  | To do |  |  |  |  | open |
| TLK-4 | Number four |  | To do |  |  |  |  | open |

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
| h3 | 09:03 | owner | tickets.ticket-create | created TLK-1 in To do: Keep | TLK-1 |  |
| h4 | 09:04 | owner | tickets.ticket-create | created TLK-2 in To do: Drop | TLK-2 |  |
| h5 | 09:05 | owner | tickets.ticket-create | created TLK-3 in To do: Gone for good | TLK-3 |  |
| h6 | 09:06 | a1 | tickets.ticket-move | moved TLK-1 from To do to Review | TLK-1 |  |
| h7 | 09:07 | a1 | tickets.ticket-archive | archived TLK-1 | TLK-1 |  |
| h8 | 09:08 | a1 | tickets.ticket-cancel | canceled TLK-2 | TLK-2 | h10 |
| h9 | 09:14 | owner | tickets.ticket-restore | restored TLK-1 to Review | TLK-1 |  |
| h10 | 09:16 | owner | history.change-undo | undid: canceled TLK-2 | TLK-2 |  |
| h11 | 09:17 | owner | tickets.ticket-delete | deleted TLK-3 for good: Gone for good | TLK-3 |  |
| h12 | 09:21 | owner | tickets.ticket-create | created TLK-4 in To do: Number four | TLK-4 |  |

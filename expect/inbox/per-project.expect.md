# per-project

## Input

[per-project.json](per-project.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Sorter"} → succeeded; created actor a1
2. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
3. owner calls catalog.project-create {"name":"Money","prefix":"MNY"} → succeeded; created project MNY
4. owner calls inbox.step-add {"name":"Talk bugs to the board","kind":"script","actor":"a1","actions":["item-promote"],"config":{"file":"promote-bugs.mjs"},"condition":{"project":"TLK"}} → succeeded; created step s1
5. owner calls inbox.item-capture {"project":"TLK","text":"the board crashes when I drag a ticket"} → succeeded; created item n1
6. owner calls inbox.item-capture {"project":"MNY","text":"Need export to CSV"} → succeeded; created item n2
7. a1 calls inbox.item-capture {"project":"MNY","text":"Totals are wrong in May","source":"agent"} → succeeded; created item n3
8. owner calls inbox.item-capture {"project":"NOPE","text":"No such project"} → rejected: unknown-project: No project has id NOPE.
9. owner calls inbox.item-capture {"text":"No project given"} → rejected: invalid-input: project: Invalid input: expected string, received undefined
10. a1 calls inbox.inbox-read {"project":"MNY"} → succeeded:

```json
[
  {
    "id": "n2",
    "project": "MNY",
    "title": "Need export to CSV",
    "text": "Need export to CSV",
    "original": {
      "title": "Need export to CSV",
      "text": "Need export to CSV"
    },
    "source": "page",
    "state": "received",
    "tags": [],
    "category": null,
    "fields": {},
    "reason": null,
    "ticket": null,
    "at": "2026-01-01T09:06:00.000Z",
    "by": "owner"
  },
  {
    "id": "n3",
    "project": "MNY",
    "title": "Totals are wrong in May",
    "text": "Totals are wrong in May",
    "original": {
      "title": "Totals are wrong in May",
      "text": "Totals are wrong in May"
    },
    "source": "agent",
    "state": "received",
    "tags": [],
    "category": null,
    "fields": {},
    "reason": null,
    "ticket": null,
    "at": "2026-01-01T09:07:00.000Z",
    "by": "a1"
  }
]
```

11. a1 calls inbox.inbox-read {"project":"TLK","state":"received"} → succeeded:

```json
[]
```

12. owner calls inbox.item-promote {"item":"n2"} → succeeded; updated item n2
13. a1 calls tickets.backlog-read {"project":"MNY"} → succeeded:

```json
[
  {
    "id": "MNY-1",
    "project": "MNY",
    "title": "Need export to CSV",
    "description": "Need export to CSV",
    "feature": null,
    "featureName": "",
    "column": {
      "id": "c5",
      "name": "To do",
      "kind": "todo"
    },
    "assignee": null,
    "assigneeName": "",
    "labels": [],
    "type": "task",
    "priority": "none",
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": null,
    "state": "open",
    "backlog": true,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:12:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:12:00.000Z"
  }
]
```

14. owner calls catalog.project-archive {"project":"MNY"} → succeeded; updated project MNY
15. owner calls inbox.item-capture {"project":"MNY","text":"Too late"} → rejected: archived-project: Project MNY is archived.

### The inbox steps, in order

| id | name | kind | actor | may ask for | runs on | on |
| --- | --- | --- | --- | --- | --- | --- |
| s1 | Talk bugs to the board | script | a1 | item-promote | {"project":"TLK"} | yes |

### Inbox

| id | project | title | as captured | state | tags | category | fields | reason | ticket |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| n1 | TLK | the board crashes when I drag a ticket |  | promoted |  |  |  |  | TLK-1 |
| n2 | MNY | Need export to CSV |  | promoted |  |  |  |  | MNY-1 |
| n3 | MNY | Totals are wrong in May |  | received |  |  |  |  |  |

### Runs

r1 on n1: Talk bugs to the board ended the run: the item was promoted
- Talk bugs to the board: ran. bugs become tickets
  - item-promote {"backlog":false} → done

r2 on n2: every step had its turn: the item is received
- Talk bugs to the board: did not run. skipped: only runs on items for TLK

r3 on n3: every step had its turn: the item is received
- Talk bugs to the board: did not run. skipped: only runs on items for TLK

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | the board crashes when I drag a ticket |  | To do |  |  |  |  | open |
| MNY-1 | Need export to CSV |  | (backlog) |  |  |  |  | open |

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-create | added actor Sorter |  |  |
| h2 | 09:02 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Money (MNY) |  |  |
| h4 | 09:04 | owner | inbox.step-add | added the inbox step Talk bugs to the board |  |  |
| h5 | 09:05 | owner | inbox.item-capture | captured n1 for TLK: the board crashes when I drag a ticket |  |  |
| h6 | 09:05 | a1 | inbox.item-promote | turned n1 into TLK-1: the board crashes when I drag a ticket | TLK-1 |  |
| h7 | 09:06 | owner | inbox.item-capture | captured n2 for MNY: Need export to CSV |  |  |
| h8 | 09:07 | a1 | inbox.item-capture | captured n3 for MNY: Totals are wrong in May |  |  |
| h9 | 09:12 | owner | inbox.item-promote | turned n2 into MNY-1: Need export to CSV | MNY-1 |  |
| h10 | 09:14 | owner | catalog.project-archive | archived project Money |  |  |

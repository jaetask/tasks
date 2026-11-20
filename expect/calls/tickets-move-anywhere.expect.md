# tickets-move-anywhere

## Input

[tickets-move-anywhere.json](tickets-move-anywhere.json)

## Output

### Steps

1. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.project-create {"name":"Money","prefix":"MNY"} → succeeded; created project MNY
4. owner calls tickets.ticket-create {"project":"TLK","title":"One"} → succeeded; created ticket TLK-1
5. owner calls tickets.ticket-create {"project":"TLK","title":"Two","column":"c3"} → succeeded; created ticket TLK-2
6. a1 calls tickets.ticket-move {"ticket":"TLK-1","column":"c4"} → succeeded; updated ticket TLK-1
7. a1 calls tickets.ticket-move {"ticket":"TLK-1","column":"c1"} → succeeded; updated ticket TLK-1
8. a1 calls tickets.ticket-move {"ticket":"TLK-1","column":"c3"} → succeeded; updated ticket TLK-1
9. a1 calls tickets.ticket-move {"ticket":"TLK-1","column":"c2"} → succeeded; updated ticket TLK-1
10. a1 calls tickets.ticket-move {"ticket":"TLK-1","column":"c5"} → rejected: other-board: Column c5 is not on the board of TLK.
11. a1 calls tickets.ticket-move {"ticket":"TLK-1","column":"c99"} → rejected: unknown-column: No column has id c99.
12. owner calls catalog.column-remove {"column":"c3"} → succeeded; deleted column c3
13. owner calls tickets.board-read {"project":"TLK"} → succeeded:

```json
{
  "project": {
    "id": "TLK",
    "name": "Talk"
  },
  "columns": [
    {
      "id": "c1",
      "name": "To do",
      "kind": "todo",
      "tickets": []
    },
    {
      "id": "c2",
      "name": "Doing",
      "kind": "doing",
      "tickets": [
        {
          "id": "TLK-1",
          "project": "TLK",
          "title": "One",
          "description": "",
          "feature": null,
          "featureName": "",
          "column": {
            "id": "c2",
            "name": "Doing",
            "kind": "doing"
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
          "backlog": false,
          "comments": 0,
          "images": 0,
          "awaiting": 0,
          "createdAt": "2026-01-01T09:04:00.000Z",
          "createdBy": "owner",
          "updatedAt": "2026-01-01T09:09:00.000Z"
        },
        {
          "id": "TLK-2",
          "project": "TLK",
          "title": "Two",
          "description": "",
          "feature": null,
          "featureName": "",
          "column": {
            "id": "c2",
            "name": "Doing",
            "kind": "doing"
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
          "backlog": false,
          "comments": 0,
          "images": 0,
          "awaiting": 0,
          "createdAt": "2026-01-01T09:05:00.000Z",
          "createdBy": "owner",
          "updatedAt": "2026-01-01T09:05:00.000Z"
        }
      ]
    },
    {
      "id": "c4",
      "name": "Done",
      "kind": "done",
      "tickets": []
    }
  ]
}
```

14. owner calls history.change-undo {"change":"h10"} → succeeded; updated change h10
15. owner calls tickets.board-read {"project":"TLK"} → succeeded:

```json
{
  "project": {
    "id": "TLK",
    "name": "Talk"
  },
  "columns": [
    {
      "id": "c1",
      "name": "To do",
      "kind": "todo",
      "tickets": []
    },
    {
      "id": "c2",
      "name": "Doing",
      "kind": "doing",
      "tickets": [
        {
          "id": "TLK-1",
          "project": "TLK",
          "title": "One",
          "description": "",
          "feature": null,
          "featureName": "",
          "column": {
            "id": "c2",
            "name": "Doing",
            "kind": "doing"
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
          "backlog": false,
          "comments": 0,
          "images": 0,
          "awaiting": 0,
          "createdAt": "2026-01-01T09:04:00.000Z",
          "createdBy": "owner",
          "updatedAt": "2026-01-01T09:09:00.000Z"
        }
      ]
    },
    {
      "id": "c3",
      "name": "Review",
      "kind": "waiting",
      "tickets": [
        {
          "id": "TLK-2",
          "project": "TLK",
          "title": "Two",
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
          "updatedAt": "2026-01-01T09:05:00.000Z"
        }
      ]
    },
    {
      "id": "c4",
      "name": "Done",
      "kind": "done",
      "tickets": []
    }
  ]
}
```

16. owner calls catalog.column-remove {"column":"c2"} → succeeded; deleted column c2
17. a1 calls tickets.ticket-claim {"ticket":"TLK-1"} → rejected: no-column: The board of TLK has no doing column.
18. owner calls catalog.column-remove {"column":"c3"} → succeeded; deleted column c3
19. a1 calls tickets.ticket-review-request {"ticket":"TLK-2"} → rejected: no-column: The board of TLK has no waiting column.

### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner |  |  |  |
| a1 | Coder |  |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c4 Done (done) |
| MNY | Money | teal |  | c5 To do (todo) · c6 Doing (doing) · c7 Review (waiting) · c8 Done (done) |

### Labels

None.

### Locations

None.

### Features

None.

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | One |  | To do |  |  |  |  | open |
| TLK-2 | Two |  | To do |  |  |  |  | open |

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
| h1 | 09:01 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Coder |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Money (MNY) |  |  |
| h4 | 09:04 | owner | tickets.ticket-create | created TLK-1 in To do: One | TLK-1 |  |
| h5 | 09:05 | owner | tickets.ticket-create | created TLK-2 in Review: Two | TLK-2 |  |
| h6 | 09:06 | a1 | tickets.ticket-move | moved TLK-1 from To do to Done | TLK-1 |  |
| h7 | 09:07 | a1 | tickets.ticket-move | moved TLK-1 from Done to To do | TLK-1 |  |
| h8 | 09:08 | a1 | tickets.ticket-move | moved TLK-1 from To do to Review | TLK-1 |  |
| h9 | 09:09 | a1 | tickets.ticket-move | moved TLK-1 from Review to Doing | TLK-1 |  |
| h10 | 09:12 | owner | catalog.column-remove | removed column Review from TLK; its tickets moved to Doing |  | h11 |
| h11 | 09:14 | owner | history.change-undo | undid: removed column Review from TLK; its tickets moved to Doing |  |  |
| h12 | 09:16 | owner | catalog.column-remove | removed column Doing from TLK; its tickets moved to To do |  |  |
| h13 | 09:18 | owner | catalog.column-remove | removed column Review from TLK; its tickets moved to To do |  |  |

# backlog

## Input

[backlog.json](backlog.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
2. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
3. owner calls tickets.ticket-create {"project":"TLK","title":"On the board"} → succeeded; created ticket TLK-1
4. owner calls tickets.ticket-create {"project":"TLK","title":"Waiting one","backlog":true} → succeeded; created ticket TLK-2
5. a1 calls tickets.ticket-create {"project":"TLK","title":"Waiting two","backlog":true} → succeeded; created ticket TLK-3
6. a1 calls tickets.backlog-read {"project":"TLK"} → succeeded:

```json
[
  {
    "id": "TLK-2",
    "project": "TLK",
    "title": "Waiting one",
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
    "blocked": null,
    "state": "open",
    "backlog": true,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:04:00.000Z",
    "createdBy": "owner"
  },
  {
    "id": "TLK-3",
    "project": "TLK",
    "title": "Waiting two",
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
    "blocked": null,
    "state": "open",
    "backlog": true,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:05:00.000Z",
    "createdBy": "a1"
  }
]
```

7. a1 calls tickets.work-find → succeeded:

```json
[
  {
    "id": "TLK-1",
    "project": "TLK",
    "title": "On the board",
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
    "blocked": null,
    "state": "open",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:03:00.000Z",
    "createdBy": "owner"
  }
]
```

8. a1 calls tickets.board-read {"project":"TLK"} → succeeded:

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
      "tickets": [
        {
          "id": "TLK-1",
          "project": "TLK",
          "title": "On the board",
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
          "blocked": null,
          "state": "open",
          "backlog": false,
          "comments": 0,
          "images": 0,
          "awaiting": 0,
          "createdAt": "2026-01-01T09:03:00.000Z",
          "createdBy": "owner"
        }
      ]
    },
    {
      "id": "c2",
      "name": "Doing",
      "kind": "doing",
      "tickets": []
    },
    {
      "id": "c3",
      "name": "Review",
      "kind": "waiting",
      "tickets": []
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

9. a1 calls tickets.ticket-claim {"ticket":"TLK-2"} → refused: in-backlog: TLK-2 is in the backlog. Put it on the board first.
10. a1 calls tickets.ticket-move {"ticket":"TLK-2","column":"c3"} → refused: in-backlog: TLK-2 is in the backlog. Put it on the board first.
11. a1 calls tickets.ticket-edit {"ticket":"TLK-2","title":"Waiting one, clearer"} → succeeded; updated ticket TLK-2
12. a1 calls tickets.ticket-board-send {"ticket":"TLK-2"} → succeeded; updated ticket TLK-2
13. a1 calls tickets.ticket-board-send {"ticket":"TLK-2"} → refused: no-change: TLK-2 is already on the board.
14. a1 calls tickets.ticket-claim {"ticket":"TLK-2"} → succeeded; updated ticket TLK-2
15. a1 calls tickets.ticket-backlog-send {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
16. a1 calls tickets.ticket-find {"backlog":true} → succeeded:

```json
[
  {
    "id": "TLK-1",
    "project": "TLK",
    "title": "On the board",
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
    "blocked": null,
    "state": "open",
    "backlog": true,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:03:00.000Z",
    "createdBy": "owner"
  },
  {
    "id": "TLK-3",
    "project": "TLK",
    "title": "Waiting two",
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
    "blocked": null,
    "state": "open",
    "backlog": true,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:05:00.000Z",
    "createdBy": "a1"
  }
]
```

17. a1 calls tickets.backlog-read {"project":"TLK","text":"two"} → succeeded:

```json
[
  {
    "id": "TLK-3",
    "project": "TLK",
    "title": "Waiting two",
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
    "blocked": null,
    "state": "open",
    "backlog": true,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:05:00.000Z",
    "createdBy": "a1"
  }
]
```

18. owner calls history.change-undo {"change":"h9"} → succeeded; updated change h9
19. a1 calls tickets.ticket-archive {"ticket":"TLK-3"} → succeeded; updated ticket TLK-3
20. owner calls tickets.ticket-restore {"ticket":"TLK-3"} → succeeded; updated ticket TLK-3

### Actors

| id | name | archived |
| --- | --- | --- |
| owner |  |  |
| a1 | Coder |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |

### Labels

None.

### Features

None.

### Tickets

| id | title | feature | column | assigned | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | On the board |  | To do |  |  |  | open |
| TLK-2 | Waiting one, clearer |  | Doing | Coder |  |  | open |
| TLK-3 | Waiting two |  | (backlog) |  |  |  | open |

### Comments

None.

### Images

None.

### Input requests

None.

### Agent inboxes

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-create | added actor Coder |  |  |
| h2 | 09:02 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h3 | 09:03 | owner | tickets.ticket-create | created TLK-1 in To do: On the board | TLK-1 |  |
| h4 | 09:04 | owner | tickets.ticket-create | created TLK-2 in the backlog: Waiting one | TLK-2 |  |
| h5 | 09:05 | a1 | tickets.ticket-create | created TLK-3 in the backlog: Waiting two | TLK-3 |  |
| h6 | 09:11 | a1 | tickets.ticket-edit | edited the title of TLK-2 | TLK-2 |  |
| h7 | 09:12 | a1 | tickets.ticket-board-send | put TLK-2 on the board in To do | TLK-2 |  |
| h8 | 09:14 | a1 | tickets.ticket-claim | claimed TLK-2 and moved it to Doing | TLK-2 |  |
| h9 | 09:15 | a1 | tickets.ticket-backlog-send | sent TLK-1 to the backlog | TLK-1 | h10 |
| h10 | 09:18 | owner | history.change-undo | undid: sent TLK-1 to the backlog | TLK-1 |  |
| h11 | 09:19 | a1 | tickets.ticket-archive | archived TLK-3 | TLK-3 |  |
| h12 | 09:20 | owner | tickets.ticket-restore | restored TLK-3 to To do | TLK-3 |  |

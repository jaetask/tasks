# tickets-overview

## Input

[tickets-overview.json](tickets-overview.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
2. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
3. owner calls catalog.project-create {"name":"Money","prefix":"MNY"} → succeeded; created project MNY
4. owner calls catalog.column-add {"project":"MNY","name":"Sign-off","kind":"waiting"} → succeeded; created column c9
5. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes"} → succeeded; created ticket TLK-1
6. owner calls tickets.ticket-create {"project":"TLK","title":"Crash on send","description":"A voice note crashes the app."} → succeeded; created ticket TLK-2
7. owner calls tickets.ticket-create {"project":"MNY","title":"Export to CSV"} → succeeded; created ticket MNY-1
8. owner calls tickets.ticket-create {"project":"MNY","title":"Archived one"} → succeeded; created ticket MNY-2
9. a1 calls tickets.ticket-claim {"ticket":"TLK-2"} → succeeded; updated ticket TLK-2
10. a1 calls tickets.ticket-move {"ticket":"MNY-1","column":"c9"} → succeeded; updated ticket MNY-1
11. a1 calls tickets.ticket-archive {"ticket":"MNY-2"} → succeeded; updated ticket MNY-2
12. a1 calls tickets.overview-read → succeeded:

```json
{
  "kinds": [
    {
      "kind": "todo",
      "tickets": [
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
          "assignee": null,
          "assigneeName": "",
          "labels": [],
          "blocked": null,
          "state": "open",
          "backlog": false,
          "comments": 0,
          "images": 0,
          "createdAt": "2026-01-01T09:05:00.000Z",
          "createdBy": "owner"
        }
      ]
    },
    {
      "kind": "doing",
      "tickets": [
        {
          "id": "TLK-2",
          "project": "TLK",
          "title": "Crash on send",
          "description": "A voice note crashes the app.",
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
          "blocked": null,
          "state": "open",
          "backlog": false,
          "comments": 0,
          "images": 0,
          "createdAt": "2026-01-01T09:06:00.000Z",
          "createdBy": "owner"
        }
      ]
    },
    {
      "kind": "waiting",
      "tickets": [
        {
          "id": "MNY-1",
          "project": "MNY",
          "title": "Export to CSV",
          "description": "",
          "feature": null,
          "featureName": "",
          "column": {
            "id": "c9",
            "name": "Sign-off",
            "kind": "waiting"
          },
          "assignee": null,
          "assigneeName": "",
          "labels": [],
          "blocked": null,
          "state": "open",
          "backlog": false,
          "comments": 0,
          "images": 0,
          "createdAt": "2026-01-01T09:07:00.000Z",
          "createdBy": "owner"
        }
      ]
    },
    {
      "kind": "done",
      "tickets": []
    }
  ]
}
```

13. a1 calls tickets.overview-read {"text":"voice"} → succeeded:

```json
{
  "kinds": [
    {
      "kind": "todo",
      "tickets": [
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
          "assignee": null,
          "assigneeName": "",
          "labels": [],
          "blocked": null,
          "state": "open",
          "backlog": false,
          "comments": 0,
          "images": 0,
          "createdAt": "2026-01-01T09:05:00.000Z",
          "createdBy": "owner"
        }
      ]
    },
    {
      "kind": "doing",
      "tickets": [
        {
          "id": "TLK-2",
          "project": "TLK",
          "title": "Crash on send",
          "description": "A voice note crashes the app.",
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
          "blocked": null,
          "state": "open",
          "backlog": false,
          "comments": 0,
          "images": 0,
          "createdAt": "2026-01-01T09:06:00.000Z",
          "createdBy": "owner"
        }
      ]
    },
    {
      "kind": "waiting",
      "tickets": []
    },
    {
      "kind": "done",
      "tickets": []
    }
  ]
}
```

14. a1 calls tickets.overview-read {"assignee":"a1"} → succeeded:

```json
{
  "kinds": [
    {
      "kind": "todo",
      "tickets": []
    },
    {
      "kind": "doing",
      "tickets": [
        {
          "id": "TLK-2",
          "project": "TLK",
          "title": "Crash on send",
          "description": "A voice note crashes the app.",
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
          "blocked": null,
          "state": "open",
          "backlog": false,
          "comments": 0,
          "images": 0,
          "createdAt": "2026-01-01T09:06:00.000Z",
          "createdBy": "owner"
        }
      ]
    },
    {
      "kind": "waiting",
      "tickets": []
    },
    {
      "kind": "done",
      "tickets": []
    }
  ]
}
```

15. a1 calls tickets.board-read {"project":"TLK","assignee":null} → succeeded:

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
          "title": "Voice notes",
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
          "createdAt": "2026-01-01T09:05:00.000Z",
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

16. a1 calls tickets.board-read {"project":"TLK","text":"tlk-2"} → succeeded:

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
          "id": "TLK-2",
          "project": "TLK",
          "title": "Crash on send",
          "description": "A voice note crashes the app.",
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
          "blocked": null,
          "state": "open",
          "backlog": false,
          "comments": 0,
          "images": 0,
          "createdAt": "2026-01-01T09:06:00.000Z",
          "createdBy": "owner"
        }
      ]
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

17. owner calls catalog.project-archive {"project":"MNY"} → succeeded; updated project MNY
18. a1 calls tickets.overview-read → succeeded:

```json
{
  "kinds": [
    {
      "kind": "todo",
      "tickets": [
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
          "assignee": null,
          "assigneeName": "",
          "labels": [],
          "blocked": null,
          "state": "open",
          "backlog": false,
          "comments": 0,
          "images": 0,
          "createdAt": "2026-01-01T09:05:00.000Z",
          "createdBy": "owner"
        }
      ]
    },
    {
      "kind": "doing",
      "tickets": [
        {
          "id": "TLK-2",
          "project": "TLK",
          "title": "Crash on send",
          "description": "A voice note crashes the app.",
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
          "blocked": null,
          "state": "open",
          "backlog": false,
          "comments": 0,
          "images": 0,
          "createdAt": "2026-01-01T09:06:00.000Z",
          "createdBy": "owner"
        }
      ]
    },
    {
      "kind": "waiting",
      "tickets": []
    },
    {
      "kind": "done",
      "tickets": []
    }
  ]
}
```


### Actors

| id | name | archived |
| --- | --- | --- |
| owner |  |  |
| a1 | Coder |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |
| MNY | Money | teal | yes | c5 To do (todo) · c6 Doing (doing) · c7 Review (waiting) · c8 Done (done) · c9 Sign-off (waiting) |

### Labels

None.

### Features

None.

### Tickets

| id | title | feature | column | assigned | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | Voice notes |  | To do |  |  |  | open |
| TLK-2 | Crash on send |  | Doing | Coder |  |  | open |
| MNY-1 | Export to CSV |  | Sign-off |  |  |  | open |
| MNY-2 | Archived one |  | To do |  |  |  | archived |

### Comments

None.

### Images

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-create | added actor Coder |  |  |
| h2 | 09:02 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Money (MNY) |  |  |
| h4 | 09:04 | owner | catalog.column-add | added column Sign-off (waiting) to MNY |  |  |
| h5 | 09:05 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes | TLK-1 |  |
| h6 | 09:06 | owner | tickets.ticket-create | created TLK-2 in To do: Crash on send | TLK-2 |  |
| h7 | 09:07 | owner | tickets.ticket-create | created MNY-1 in To do: Export to CSV | MNY-1 |  |
| h8 | 09:08 | owner | tickets.ticket-create | created MNY-2 in To do: Archived one | MNY-2 |  |
| h9 | 09:09 | a1 | tickets.ticket-claim | claimed TLK-2 and moved it to Doing | TLK-2 |  |
| h10 | 09:10 | a1 | tickets.ticket-move | moved MNY-1 from To do to Sign-off | MNY-1 |  |
| h11 | 09:11 | a1 | tickets.ticket-archive | archived MNY-2 | MNY-2 |  |
| h12 | 09:17 | owner | catalog.project-archive | archived project Money |  |  |

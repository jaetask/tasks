# tickets-find

## Input

[tickets-find.json](tickets-find.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.actor-create {"name":"Reviewer"} → succeeded; created actor a2
4. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
5. owner calls catalog.label-create {"name":"voice","colour":"teal"} → succeeded; created label l1
6. owner calls catalog.label-create {"name":"bug","colour":"pink"} → succeeded; created label l2
7. owner calls catalog.project-create {"name":"Money","prefix":"MNY"} → succeeded; created project MNY
8. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes","labels":["l1"]} → succeeded; created ticket TLK-1
9. owner calls tickets.ticket-create {"project":"TLK","title":"Crash on send","description":"The app crashes when a voice note is sent.","labels":["l1","l2"],"assignee":"a1"} → succeeded; created ticket TLK-2
10. owner calls tickets.ticket-create {"project":"MNY","title":"Export to CSV","assignee":"a2"} → succeeded; created ticket MNY-1
11. a1 calls tickets.ticket-claim {"ticket":"TLK-2"} → succeeded; updated ticket TLK-2
12. a2 calls tickets.ticket-block {"ticket":"MNY-1","note":"needs a sample file"} → succeeded; updated ticket MNY-1
13. a1 calls tickets.ticket-find {"text":"voice note"} → succeeded:

```json
[
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
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": null,
    "state": "open",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:08:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:08:00.000Z",
    "columnSince": "2026-01-01T09:08:00.000Z"
  },
  {
    "id": "TLK-2",
    "project": "TLK",
    "title": "Crash on send",
    "description": "The app crashes when a voice note is sent.",
    "feature": null,
    "featureName": "",
    "column": {
      "id": "c2",
      "name": "Doing",
      "kind": "doing"
    },
    "assignee": "a1",
    "assigneeName": "Coder",
    "labels": [
      {
        "id": "l1",
        "name": "voice",
        "colour": "teal"
      },
      {
        "id": "l2",
        "name": "bug",
        "colour": "pink"
      }
    ],
    "type": "task",
    "priority": "none",
    "reactions": [],
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": null,
    "state": "open",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:09:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:11:00.000Z",
    "columnSince": "2026-01-01T09:11:00.000Z"
  }
]
```

14. a1 calls tickets.ticket-find {"kind":"doing"} → succeeded:

```json
[
  {
    "id": "TLK-2",
    "project": "TLK",
    "title": "Crash on send",
    "description": "The app crashes when a voice note is sent.",
    "feature": null,
    "featureName": "",
    "column": {
      "id": "c2",
      "name": "Doing",
      "kind": "doing"
    },
    "assignee": "a1",
    "assigneeName": "Coder",
    "labels": [
      {
        "id": "l1",
        "name": "voice",
        "colour": "teal"
      },
      {
        "id": "l2",
        "name": "bug",
        "colour": "pink"
      }
    ],
    "type": "task",
    "priority": "none",
    "reactions": [],
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": null,
    "state": "open",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:09:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:11:00.000Z",
    "columnSince": "2026-01-01T09:11:00.000Z"
  }
]
```

15. a1 calls tickets.ticket-find {"label":"l2"} → succeeded:

```json
[
  {
    "id": "TLK-2",
    "project": "TLK",
    "title": "Crash on send",
    "description": "The app crashes when a voice note is sent.",
    "feature": null,
    "featureName": "",
    "column": {
      "id": "c2",
      "name": "Doing",
      "kind": "doing"
    },
    "assignee": "a1",
    "assigneeName": "Coder",
    "labels": [
      {
        "id": "l1",
        "name": "voice",
        "colour": "teal"
      },
      {
        "id": "l2",
        "name": "bug",
        "colour": "pink"
      }
    ],
    "type": "task",
    "priority": "none",
    "reactions": [],
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": null,
    "state": "open",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:09:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:11:00.000Z",
    "columnSince": "2026-01-01T09:11:00.000Z"
  }
]
```

16. a1 calls tickets.ticket-find {"assignee":null} → succeeded:

```json
[
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
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": null,
    "state": "open",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:08:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:08:00.000Z",
    "columnSince": "2026-01-01T09:08:00.000Z"
  }
]
```

17. a1 calls tickets.ticket-find {"blocked":true} → succeeded:

```json
[
  {
    "id": "MNY-1",
    "project": "MNY",
    "title": "Export to CSV",
    "description": "",
    "feature": null,
    "featureName": "",
    "column": {
      "id": "c5",
      "name": "To do",
      "kind": "todo"
    },
    "assignee": "a2",
    "assigneeName": "Reviewer",
    "labels": [],
    "type": "task",
    "priority": "none",
    "reactions": [],
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": "needs a sample file",
    "state": "open",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:10:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:12:00.000Z",
    "columnSince": "2026-01-01T09:10:00.000Z"
  }
]
```

18. a1 calls tickets.ticket-find {"project":"MNY","assignee":"a2"} → succeeded:

```json
[
  {
    "id": "MNY-1",
    "project": "MNY",
    "title": "Export to CSV",
    "description": "",
    "feature": null,
    "featureName": "",
    "column": {
      "id": "c5",
      "name": "To do",
      "kind": "todo"
    },
    "assignee": "a2",
    "assigneeName": "Reviewer",
    "labels": [],
    "type": "task",
    "priority": "none",
    "reactions": [],
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": "needs a sample file",
    "state": "open",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:10:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:12:00.000Z",
    "columnSince": "2026-01-01T09:10:00.000Z"
  }
]
```

19. a2 calls tickets.work-find → succeeded:

```json
[
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
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": null,
    "state": "open",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:08:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:08:00.000Z",
    "columnSince": "2026-01-01T09:08:00.000Z"
  }
]
```

20. a1 calls tickets.ticket-find {"project":"NOPE"} → rejected: unknown-project: No project has id NOPE.

### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner | Sam |  |  |
| a1 | Coder |  |  |
| a2 | Reviewer |  |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |
| MNY | Money | teal |  | c5 To do (todo) · c6 Doing (doing) · c7 Review (waiting) · c8 Done (done) |

### Labels

| id | name | colour |
| --- | --- | --- |
| l1 | voice | teal |
| l2 | bug | pink |

### Locations

None.

### Features

None.

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | Voice notes |  | To do |  |  | voice |  | open |
| TLK-2 | Crash on send |  | Doing | Coder |  | voice, bug |  | open |
| MNY-1 | Export to CSV |  | To do | Reviewer |  |  | needs a sample file | open |

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
| h3 | 09:03 | owner | catalog.actor-create | added actor Reviewer |  |  |
| h4 | 09:04 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h5 | 09:05 | owner | catalog.label-create | created label voice |  |  |
| h6 | 09:06 | owner | catalog.label-create | created label bug |  |  |
| h7 | 09:07 | owner | catalog.project-create | created project Money (MNY) |  |  |
| h8 | 09:08 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes | TLK-1 |  |
| h9 | 09:09 | owner | tickets.ticket-create | created TLK-2 in To do: Crash on send | TLK-2 |  |
| h10 | 09:10 | owner | tickets.ticket-create | created MNY-1 in To do: Export to CSV | MNY-1 |  |
| h11 | 09:11 | a1 | tickets.ticket-claim | claimed TLK-2 and moved it to Doing | TLK-2 |  |
| h12 | 09:12 | a2 | tickets.ticket-block | marked MNY-1 blocked: needs a sample file | MNY-1 |  |

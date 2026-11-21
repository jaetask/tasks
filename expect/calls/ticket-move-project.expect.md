# ticket-move-project

## Input

[ticket-move-project.json](ticket-move-project.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
2. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
3. owner calls catalog.project-create {"name":"Money","prefix":"MNY"} → succeeded; created project MNY
4. owner calls catalog.label-create {"name":"bug","colour":"pink"} → succeeded; created label l1
5. owner calls tickets.feature-create {"project":"TLK","name":"Voice"} → succeeded; created feature f1
6. owner calls tickets.ticket-create {"project":"MNY","title":"Export to a file"} → succeeded; created ticket MNY-1
7. owner calls tickets.ticket-create {"project":"TLK","title":"Count the cost","labels":["l1"],"feature":"f1","assignee":"a1"} → succeeded; created ticket TLK-1
8. a1 calls tickets.ticket-claim {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
9. a1 calls comments.comment-add {"ticket":"TLK-1","text":"This is about money."} → succeeded; created comment m1
10. owner calls tickets.ticket-project-set {"ticket":"TLK-1","project":"TLK"} → rejected: no-change: TLK-1 is already in Talk.
11. owner calls tickets.ticket-project-set {"ticket":"TLK-1","project":"NOPE"} → rejected: unknown-project: No project has id NOPE.
12. a1 calls tickets.ticket-project-set {"ticket":"TLK-1","project":"MNY"} → succeeded; updated ticket MNY-2
13. owner calls tickets.ticket-read {"ticket":"TLK-1"} → succeeded:

```json
{
  "id": "MNY-2",
  "project": "MNY",
  "title": "Count the cost",
  "description": "",
  "feature": null,
  "featureName": "",
  "column": {
    "id": "c6",
    "name": "Doing",
    "kind": "doing"
  },
  "assignee": "a1",
  "assigneeName": "Coder",
  "labels": [
    {
      "id": "l1",
      "name": "bug",
      "colour": "pink"
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
  "comments": 1,
  "images": 0,
  "awaiting": 0,
  "createdAt": "2026-01-01T09:07:00.000Z",
  "createdBy": "owner",
  "updatedAt": "2026-01-01T09:12:00.000Z",
  "columnSince": "2026-01-01T09:08:00.000Z"
}
```

14. owner calls comments.conversation-read {"ticket":"MNY-2"} → succeeded:

```json
{
  "ticket": "MNY-2",
  "entries": [
    {
      "type": "change",
      "change": {
        "id": "h7",
        "at": "2026-01-01T09:07:00.000Z",
        "actor": "owner",
        "actorName": "owner",
        "summary": "created TLK-1 in To do: Count the cost",
        "undoable": false,
        "undone": false
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h8",
        "at": "2026-01-01T09:08:00.000Z",
        "actor": "a1",
        "actorName": "Coder",
        "summary": "claimed TLK-1 and moved it to Doing",
        "undoable": false,
        "undone": false
      }
    },
    {
      "type": "comment",
      "comment": {
        "id": "m1",
        "ticket": "MNY-2",
        "replyTo": null,
        "author": "a1",
        "authorName": "Coder",
        "text": "This is about money.",
        "at": "2026-01-01T09:09:00.000Z",
        "editedAt": null,
        "removed": false,
        "resolved": false,
        "reactions": [],
        "replies": []
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h10",
        "at": "2026-01-01T09:12:00.000Z",
        "actor": "a1",
        "actorName": "Coder",
        "summary": "moved TLK-1 to project MNY: it is now MNY-2",
        "undoable": false,
        "undone": false
      }
    }
  ]
}
```

15. owner calls tickets.ticket-create {"project":"TLK","title":"Next in Talk"} → succeeded; created ticket TLK-2
16. owner calls history.change-undo {"change":"h8"} → rejected: final: h8 cannot be undone.
17. owner calls tickets.ticket-project-set {"ticket":"MNY-2","project":"TLK"} → succeeded; updated ticket TLK-3
18. owner calls tickets.ticket-read {"ticket":"TLK-1"} → succeeded:

```json
{
  "id": "TLK-3",
  "project": "TLK",
  "title": "Count the cost",
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
  "labels": [
    {
      "id": "l1",
      "name": "bug",
      "colour": "pink"
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
  "comments": 1,
  "images": 0,
  "awaiting": 0,
  "createdAt": "2026-01-01T09:07:00.000Z",
  "createdBy": "owner",
  "updatedAt": "2026-01-01T09:17:00.000Z",
  "columnSince": "2026-01-01T09:08:00.000Z"
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
| MNY | Money | teal |  | c5 To do (todo) · c6 Doing (doing) · c7 Review (waiting) · c8 Done (done) |

### Labels

| id | name | colour |
| --- | --- | --- |
| l1 | bug | pink |

### Locations

None.

### Features

| id | project | name | favourite | archived | open tickets |
| --- | --- | --- | --- | --- | --- |
| f1 | TLK | Voice |  |  | 0 |

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MNY-1 | Export to a file |  | To do |  |  |  |  | open |
| TLK-3 | Count the cost |  | Doing | Coder |  | bug |  | open |
| TLK-2 | Next in Talk |  | To do |  |  |  |  | open |

### Comments

| id | ticket | reply to | author | text | reactions |
| --- | --- | --- | --- | --- | --- |
| m1 | TLK-3 |  | Coder | This is about money. |  |

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
| h3 | 09:03 | owner | catalog.project-create | created project Money (MNY) |  |  |
| h4 | 09:04 | owner | catalog.label-create | created label bug |  |  |
| h5 | 09:05 | owner | tickets.feature-create | created the feature Voice in TLK |  |  |
| h6 | 09:06 | owner | tickets.ticket-create | created MNY-1 in To do: Export to a file | MNY-1 |  |
| h7 | 09:07 | owner | tickets.ticket-create | created TLK-1 in To do: Count the cost | TLK-3 |  |
| h8 | 09:08 | a1 | tickets.ticket-claim | claimed TLK-1 and moved it to Doing | TLK-3 |  |
| h9 | 09:09 | a1 | comments.comment-add | commented on TLK-1 | TLK-3 |  |
| h10 | 09:12 | a1 | tickets.ticket-project-set | moved TLK-1 to project MNY: it is now MNY-2 | TLK-3 |  |
| h11 | 09:15 | owner | tickets.ticket-create | created TLK-2 in To do: Next in Talk | TLK-2 |  |
| h12 | 09:17 | owner | tickets.ticket-project-set | moved MNY-2 to project TLK: it is now TLK-3 | TLK-3 |  |

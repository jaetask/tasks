# project-prefix

## Input

[project-prefix.json](project-prefix.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
2. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
3. owner calls catalog.project-create {"name":"Money","prefix":"MNY"} → succeeded; created project MNY
4. owner calls catalog.label-create {"name":"bug","colour":"pink"} → succeeded; created label l1
5. owner calls tickets.feature-create {"project":"TLK","name":"Voice"} → succeeded; created feature f1
6. owner calls tickets.ticket-create {"project":"TLK","title":"Record a note","labels":["l1"],"feature":"f1","assignee":"a1"} → succeeded; created ticket TLK-1
7. owner calls tickets.ticket-create {"project":"TLK","title":"Play a note"} → succeeded; created ticket TLK-2
8. a1 calls comments.comment-add {"ticket":"TLK-1","text":"Started on it."} → succeeded; created comment m1
9. owner calls steps.ticket-step-add {"ticket":"TLK-1","title":"Try it on the phone"} → succeeded; created ticket-step t1
10. owner calls tickets.ticket-link-add {"ticket":"TLK-2","url":"https://example.com/pr/2"} → succeeded; updated ticket TLK-2
11. owner calls catalog.project-prefix-set {"project":"TLK","prefix":"MNY"} → rejected: prefix-taken: A project already has the prefix MNY.
12. owner calls catalog.project-prefix-set {"project":"TLK","prefix":"TLK"} → rejected: no-change: Talk already has the prefix TLK.
13. owner calls catalog.project-prefix-set {"project":"TLK","prefix":"talk"} → rejected: invalid-input: prefix: a prefix is 1 to 6 capital letters, like TLK
14. a1 calls catalog.project-prefix-set {"project":"TLK","prefix":"TALK"} → rejected: not-allowed: a1 may not run catalog.project-prefix-set
15. owner calls catalog.project-prefix-set {"project":"TLK","prefix":"TALK"} → succeeded; updated project TALK
16. owner calls tickets.ticket-read {"ticket":"TALK-1"} → succeeded:

```json
{
  "id": "TALK-1",
  "project": "TALK",
  "title": "Record a note",
  "description": "",
  "feature": "f1",
  "featureName": "Voice",
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
  "createdAt": "2026-01-01T09:06:00.000Z",
  "createdBy": "owner",
  "updatedAt": "2026-01-01T09:09:00.000Z",
  "columnSince": "2026-01-01T09:06:00.000Z"
}
```

17. owner calls tickets.ticket-read {"ticket":"TLK-2"} → succeeded:

```json
{
  "id": "TALK-2",
  "project": "TALK",
  "title": "Play a note",
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
  "links": [
    {
      "id": "u1",
      "url": "https://example.com/pr/2",
      "title": "",
      "description": ""
    }
  ],
  "location": null,
  "locationName": "",
  "blocked": null,
  "state": "open",
  "backlog": false,
  "comments": 0,
  "images": 0,
  "awaiting": 0,
  "createdAt": "2026-01-01T09:07:00.000Z",
  "createdBy": "owner",
  "updatedAt": "2026-01-01T09:10:00.000Z",
  "columnSince": "2026-01-01T09:07:00.000Z"
}
```

18. owner calls comments.conversation-read {"ticket":"TALK-1"} → succeeded:

```json
{
  "ticket": "TALK-1",
  "entries": [
    {
      "type": "change",
      "change": {
        "id": "h6",
        "at": "2026-01-01T09:06:00.000Z",
        "actor": "owner",
        "actorName": "owner",
        "summary": "created TLK-1 in To do: Record a note",
        "undoable": false,
        "undone": false
      }
    },
    {
      "type": "comment",
      "comment": {
        "id": "m1",
        "ticket": "TALK-1",
        "replyTo": null,
        "author": "a1",
        "authorName": "Coder",
        "text": "Started on it.",
        "at": "2026-01-01T09:08:00.000Z",
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
        "id": "h9",
        "at": "2026-01-01T09:09:00.000Z",
        "actor": "owner",
        "actorName": "owner",
        "summary": "added the step \"Try it on the phone\" to TLK-1",
        "undoable": false,
        "undone": false
      }
    }
  ]
}
```

19. owner calls steps.ticket-step-list {"ticket":"TALK-1"} → succeeded:

```json
[
  {
    "id": "t1",
    "ticket": "TALK-1",
    "title": "Try it on the phone",
    "done": false,
    "notes": []
  }
]
```

20. owner calls tickets.ticket-create {"project":"TALK","title":"Share a note"} → succeeded; created ticket TALK-3
21. a1 calls tickets.ticket-move {"ticket":"TALK-1","column":"c2"} → succeeded; updated ticket TALK-1
22. owner calls history.change-undo {"change":"h6"} → rejected: final: h6 cannot be undone.
23. owner calls history.change-undo {"change":"h12"} → succeeded; updated change h12
24. owner calls tickets.board-read {"project":"TLK"} → rejected: unknown-project: No project has id TLK.
25. owner calls history.change-list {"limit":3} → succeeded:

```json
[
  {
    "id": "h12",
    "at": "2026-01-01T09:20:00.000Z",
    "actor": "owner",
    "action": "tickets.ticket-create",
    "summary": "created TALK-3 in To do: Share a note",
    "ticket": "TALK-3",
    "undoes": null,
    "undoneBy": "h14",
    "undoable": false,
    "imported": false
  },
  {
    "id": "h13",
    "at": "2026-01-01T09:21:00.000Z",
    "actor": "a1",
    "action": "tickets.ticket-move",
    "summary": "moved TALK-1 from To do to Doing",
    "ticket": "TALK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true,
    "imported": false
  },
  {
    "id": "h14",
    "at": "2026-01-01T09:23:00.000Z",
    "actor": "owner",
    "action": "history.change-undo",
    "summary": "undid: created TALK-3 in To do: Share a note",
    "ticket": "TALK-3",
    "undoes": "h12",
    "undoneBy": null,
    "undoable": true,
    "imported": false
  }
]
```


### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner |  |  |  |
| a1 | Coder |  |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TALK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |
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
| f1 | TALK | Voice |  |  | 1 |

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TALK-1 | Record a note | Voice | Doing | Coder |  | bug |  | open |
| TALK-2 | Play a note |  | To do |  |  |  |  | open |

### Comments

| id | ticket | reply to | author | text | reactions |
| --- | --- | --- | --- | --- | --- |
| m1 | TALK-1 |  | Coder | Started on it. |  |

### Images

None.

### Input requests

None.

### Ticket steps

| id | ticket | title | done | notes |
| --- | --- | --- | --- | --- |
| t1 | TALK-1 | Try it on the phone |  |  |

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
| h6 | 09:06 | owner | tickets.ticket-create | created TLK-1 in To do: Record a note | TALK-1 |  |
| h7 | 09:07 | owner | tickets.ticket-create | created TLK-2 in To do: Play a note | TALK-2 |  |
| h8 | 09:08 | a1 | comments.comment-add | commented on TLK-1 | TALK-1 |  |
| h9 | 09:09 | owner | steps.ticket-step-add | added the step "Try it on the phone" to TLK-1 | TALK-1 |  |
| h10 | 09:10 | owner | tickets.ticket-link-add | added a link to TLK-2: https://example.com/pr/2 | TALK-2 |  |
| h11 | 09:15 | owner | catalog.project-prefix-set | changed the prefix of Talk from TLK to TALK |  |  |
| h12 | 09:20 | owner | tickets.ticket-create | created TALK-3 in To do: Share a note | TALK-3 | h14 |
| h13 | 09:21 | a1 | tickets.ticket-move | moved TALK-1 from To do to Doing | TALK-1 |  |
| h14 | 09:23 | owner | history.change-undo | undid: created TALK-3 in To do: Share a note | TALK-3 |  |

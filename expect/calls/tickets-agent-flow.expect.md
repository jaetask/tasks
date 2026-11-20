# tickets-agent-flow

## Input

[tickets-agent-flow.json](tickets-agent-flow.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.actor-create {"name":"Reviewer"} → succeeded; created actor a2
4. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
5. owner calls catalog.label-create {"name":"voice","colour":"teal"} → succeeded; created label l1
6. owner calls catalog.label-create {"name":"bug","colour":"pink"} → succeeded; created label l2
7. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone","description":"Record a voice note and attach it to a chat.","labels":["l1"]} → succeeded; created ticket TLK-1
8. owner calls tickets.ticket-create {"project":"TLK","title":"Fix the crash on send","labels":["l2"],"assignee":"a2"} → succeeded; created ticket TLK-2
9. a1 calls tickets.work-find → succeeded:

```json
[
  {
    "id": "TLK-1",
    "project": "TLK",
    "title": "Voice notes on the phone",
    "description": "Record a voice note and attach it to a chat.",
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
    "createdAt": "2026-01-01T09:07:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:07:00.000Z",
    "columnSince": "2026-01-01T09:07:00.000Z"
  }
]
```

10. a1 calls tickets.ticket-claim {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
11. a1 calls tickets.work-find → succeeded:

```json
[]
```

12. a1 calls tickets.ticket-block {"ticket":"TLK-1","note":"waiting on the API key"} → succeeded; updated ticket TLK-1
13. a1 calls tickets.ticket-unblock {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
14. a1 calls tickets.ticket-review-request {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
15. a1 calls tickets.ticket-assign {"ticket":"TLK-1","actor":"a2"} → succeeded; updated ticket TLK-1
16. a2 calls tickets.ticket-read {"ticket":"TLK-1"} → succeeded:

```json
{
  "id": "TLK-1",
  "project": "TLK",
  "title": "Voice notes on the phone",
  "description": "Record a voice note and attach it to a chat.",
  "feature": null,
  "featureName": "",
  "column": {
    "id": "c3",
    "name": "Review",
    "kind": "waiting"
  },
  "assignee": "a2",
  "assigneeName": "Reviewer",
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
  "createdAt": "2026-01-01T09:07:00.000Z",
  "createdBy": "owner",
  "updatedAt": "2026-01-01T09:15:00.000Z",
  "columnSince": "2026-01-01T09:14:00.000Z"
}
```

17. a2 calls tickets.ticket-finish {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
18. a2 calls tickets.ticket-claim {"ticket":"TLK-2"} → succeeded; updated ticket TLK-2
19. a2 calls tickets.ticket-claim {"ticket":"TLK-2"} → succeeded; updated ticket TLK-2
20. owner calls history.change-list {"ticket":"TLK-1"} → succeeded:

```json
[
  {
    "id": "h7",
    "at": "2026-01-01T09:07:00.000Z",
    "actor": "owner",
    "action": "tickets.ticket-create",
    "summary": "created TLK-1 in To do: Voice notes on the phone",
    "ticket": "TLK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  },
  {
    "id": "h9",
    "at": "2026-01-01T09:10:00.000Z",
    "actor": "a1",
    "action": "tickets.ticket-claim",
    "summary": "claimed TLK-1 and moved it to Doing",
    "ticket": "TLK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  },
  {
    "id": "h10",
    "at": "2026-01-01T09:12:00.000Z",
    "actor": "a1",
    "action": "tickets.ticket-block",
    "summary": "marked TLK-1 blocked: waiting on the API key",
    "ticket": "TLK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  },
  {
    "id": "h11",
    "at": "2026-01-01T09:13:00.000Z",
    "actor": "a1",
    "action": "tickets.ticket-unblock",
    "summary": "unblocked TLK-1",
    "ticket": "TLK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  },
  {
    "id": "h12",
    "at": "2026-01-01T09:14:00.000Z",
    "actor": "a1",
    "action": "tickets.ticket-review-request",
    "summary": "asked for review of TLK-1; it is in Review",
    "ticket": "TLK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  },
  {
    "id": "h13",
    "at": "2026-01-01T09:15:00.000Z",
    "actor": "a1",
    "action": "tickets.ticket-assign",
    "summary": "assigned TLK-1 to Reviewer",
    "ticket": "TLK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  },
  {
    "id": "h14",
    "at": "2026-01-01T09:17:00.000Z",
    "actor": "a2",
    "action": "tickets.ticket-finish",
    "summary": "finished TLK-1; it is in Done",
    "ticket": "TLK-1",
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  }
]
```


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
| TLK-1 | Voice notes on the phone |  | Done | Reviewer |  | voice |  | open |
| TLK-2 | Fix the crash on send |  | Doing | Reviewer |  | bug |  | open |

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
| h7 | 09:07 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes on the phone | TLK-1 |  |
| h8 | 09:08 | owner | tickets.ticket-create | created TLK-2 in To do: Fix the crash on send | TLK-2 |  |
| h9 | 09:10 | a1 | tickets.ticket-claim | claimed TLK-1 and moved it to Doing | TLK-1 |  |
| h10 | 09:12 | a1 | tickets.ticket-block | marked TLK-1 blocked: waiting on the API key | TLK-1 |  |
| h11 | 09:13 | a1 | tickets.ticket-unblock | unblocked TLK-1 | TLK-1 |  |
| h12 | 09:14 | a1 | tickets.ticket-review-request | asked for review of TLK-1; it is in Review | TLK-1 |  |
| h13 | 09:15 | a1 | tickets.ticket-assign | assigned TLK-1 to Reviewer | TLK-1 |  |
| h14 | 09:17 | a2 | tickets.ticket-finish | finished TLK-1; it is in Done | TLK-1 |  |
| h15 | 09:18 | a2 | tickets.ticket-claim | claimed TLK-2 and moved it to Doing | TLK-2 |  |

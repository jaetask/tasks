# human-input

## Input

[human-input.json](human-input.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.actor-create {"name":"Reviewer"} → succeeded; created actor a2
4. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
5. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-1
6. a1 calls tickets.ticket-claim {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
7. a1 calls input.input-request {"ticket":"TLK-1","question":"Should recordings be kept after they are sent?","context":"Keeping them uses about 1 MB a minute."} → succeeded; created input-request q1
8. a1 calls input.input-request {"ticket":"TLK-1","question":"Which file format?"} → succeeded; created input-request q2
9. a1 calls tickets.ticket-read {"ticket":"TLK-1"} → succeeded:

```json
{
  "id": "TLK-1",
  "project": "TLK",
  "title": "Voice notes on the phone",
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
  "labels": [],
  "blocked": null,
  "state": "open",
  "backlog": false,
  "comments": 0,
  "images": 0,
  "awaiting": 2,
  "createdAt": "2026-01-01T09:05:00.000Z",
  "createdBy": "owner"
}
```

10. a1 calls input.input-list {"state":"awaiting"} → succeeded:

```json
[
  {
    "id": "q1",
    "ticket": "TLK-1",
    "project": "TLK",
    "question": "Should recordings be kept after they are sent?",
    "context": "Keeping them uses about 1 MB a minute.",
    "askedBy": "a1",
    "askedByName": "Coder",
    "at": "2026-01-01T09:07:00.000Z",
    "state": "awaiting",
    "answer": null,
    "answeredAt": null
  },
  {
    "id": "q2",
    "ticket": "TLK-1",
    "project": "TLK",
    "question": "Which file format?",
    "context": "",
    "askedBy": "a1",
    "askedByName": "Coder",
    "at": "2026-01-01T09:08:00.000Z",
    "state": "awaiting",
    "answer": null,
    "answeredAt": null
  }
]
```

11. a1 calls input.input-resolve {"request":"q1","answer":"I say yes."} → rejected: not-allowed: a1 may not run input.input-resolve
12. a2 calls input.input-withdraw {"request":"q2"} → refused: not-yours: Only whoever asked or the owner can take back a request.
13. a1 calls input.input-withdraw {"request":"q2"} → succeeded; updated input-request q2
14. owner calls input.input-resolve {"request":"q1","answer":"Keep them for 30 days."} → succeeded; updated input-request q1
15. owner calls input.input-resolve {"request":"q1","answer":"Changed my mind."} → refused: not-awaiting: q1 is already resolved.
16. owner calls input.input-resolve {"request":"q2","answer":"Too late."} → refused: not-awaiting: q2 is already withdrawn.
17. a1 calls input.input-read {"request":"q1"} → succeeded:

```json
{
  "id": "q1",
  "ticket": "TLK-1",
  "project": "TLK",
  "question": "Should recordings be kept after they are sent?",
  "context": "Keeping them uses about 1 MB a minute.",
  "askedBy": "a1",
  "askedByName": "Coder",
  "at": "2026-01-01T09:07:00.000Z",
  "state": "resolved",
  "answer": "Keep them for 30 days.",
  "answeredAt": "2026-01-01T09:14:00.000Z"
}
```

18. a1 calls input.input-list {"project":"TLK","state":"awaiting"} → succeeded:

```json
[]
```

19. a1 calls input.input-request {"ticket":"TLK-9","question":"Anyone?"} → refused: unknown-ticket: No ticket has id TLK-9.
20. a1 calls tickets.ticket-archive {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
21. a1 calls input.input-request {"ticket":"TLK-1","question":"Still there?"} → refused: not-open: TLK-1 is archived. The owner can restore it.
22. owner calls comments.conversation-read {"ticket":"TLK-1"} → succeeded:

```json
{
  "ticket": "TLK-1",
  "entries": [
    {
      "type": "change",
      "change": {
        "id": "h5",
        "at": "2026-01-01T09:05:00.000Z",
        "actor": "owner",
        "actorName": "Sam",
        "summary": "created TLK-1 in To do: Voice notes on the phone",
        "undoable": true
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h6",
        "at": "2026-01-01T09:06:00.000Z",
        "actor": "a1",
        "actorName": "Coder",
        "summary": "claimed TLK-1 and moved it to Doing",
        "undoable": true
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h7",
        "at": "2026-01-01T09:07:00.000Z",
        "actor": "a1",
        "actorName": "Coder",
        "summary": "asked the owner on TLK-1: Should recordings be kept after they are sent?",
        "undoable": true
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h8",
        "at": "2026-01-01T09:08:00.000Z",
        "actor": "a1",
        "actorName": "Coder",
        "summary": "asked the owner on TLK-1: Which file format?",
        "undoable": true
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h9",
        "at": "2026-01-01T09:13:00.000Z",
        "actor": "a1",
        "actorName": "Coder",
        "summary": "took back the question q2 on TLK-1",
        "undoable": true
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h10",
        "at": "2026-01-01T09:14:00.000Z",
        "actor": "owner",
        "actorName": "Sam",
        "summary": "answered q1 on TLK-1: Keep them for 30 days.",
        "undoable": true
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h11",
        "at": "2026-01-01T09:20:00.000Z",
        "actor": "a1",
        "actorName": "Coder",
        "summary": "archived TLK-1",
        "undoable": true
      }
    }
  ]
}
```

23. owner calls history.change-undo {"change":"h10"} → succeeded; updated change h10

### Actors

| id | name | archived |
| --- | --- | --- |
| owner | Sam |  |
| a1 | Coder |  |
| a2 | Reviewer |  |

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
| TLK-1 | Voice notes on the phone |  | Doing | Coder |  |  | archived |

### Comments

None.

### Images

None.

### Input requests

| id | ticket | asked by | question | state | answer |
| --- | --- | --- | --- | --- | --- |
| q1 | TLK-1 | Coder | Should recordings be kept after they are sent? | awaiting |  |
| q2 | TLK-1 | Coder | Which file format? | withdrawn |  |

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Coder |  |  |
| h3 | 09:03 | owner | catalog.actor-create | added actor Reviewer |  |  |
| h4 | 09:04 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h5 | 09:05 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes on the phone | TLK-1 |  |
| h6 | 09:06 | a1 | tickets.ticket-claim | claimed TLK-1 and moved it to Doing | TLK-1 |  |
| h7 | 09:07 | a1 | input.input-request | asked the owner on TLK-1: Should recordings be kept after they are sent? | TLK-1 |  |
| h8 | 09:08 | a1 | input.input-request | asked the owner on TLK-1: Which file format? | TLK-1 |  |
| h9 | 09:13 | a1 | input.input-withdraw | took back the question q2 on TLK-1 | TLK-1 |  |
| h10 | 09:14 | owner | input.input-resolve | answered q1 on TLK-1: Keep them for 30 days. | TLK-1 | h12 |
| h11 | 09:20 | a1 | tickets.ticket-archive | archived TLK-1 | TLK-1 |  |
| h12 | 09:23 | owner | history.change-undo | undid: answered q1 on TLK-1: Keep them for 30 days. | TLK-1 |  |

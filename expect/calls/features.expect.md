# features

## Input

[features.json](features.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
2. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
3. owner calls catalog.project-create {"name":"Money","prefix":"MNY"} → succeeded; created project MNY
4. a1 calls tickets.feature-create {"project":"TLK","name":"Voice","description":"Recording and playing voice notes."} → succeeded; created feature f1
5. owner calls tickets.feature-create {"project":"TLK","name":"Search"} → succeeded; created feature f2
6. owner calls tickets.feature-create {"project":"MNY","name":"Export"} → succeeded; created feature f3
7. owner calls tickets.feature-create {"project":"TLK","name":"voice"} → rejected: name-taken: This project already has a feature named voice.
8. owner calls tickets.feature-create {"project":"NOPE","name":"x"} → rejected: unknown-project: No project has id NOPE.
9. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone","feature":"f1"} → succeeded; created ticket TLK-1
10. owner calls tickets.ticket-create {"project":"TLK","title":"Fix the crash on send"} → succeeded; created ticket TLK-2
11. owner calls tickets.ticket-create {"project":"TLK","title":"Wrong project","feature":"f3"} → rejected: other-project: Feature f3 is not in project TLK.
12. a1 calls tickets.ticket-feature-set {"ticket":"TLK-2","feature":"f1"} → succeeded; updated ticket TLK-2
13. a1 calls tickets.ticket-feature-set {"ticket":"TLK-2","feature":"f2"} → succeeded; updated ticket TLK-2
14. a1 calls tickets.ticket-feature-set {"ticket":"TLK-2","feature":"f3"} → rejected: other-project: Feature f3 is not in project TLK.
15. a1 calls tickets.ticket-feature-set {"ticket":"TLK-2","feature":"f9"} → rejected: unknown-feature: No feature has id f9.
16. owner calls tickets.feature-edit {"feature":"f1","name":"Voice notes","favourite":true} → succeeded; updated feature f1
17. owner calls tickets.feature-edit {"feature":"f2","name":"Voice notes"} → rejected: name-taken: This project already has a feature named Voice notes.
18. a1 calls tickets.feature-find {"project":"TLK"} → succeeded:

```json
[
  {
    "id": "f1",
    "project": "TLK",
    "name": "Voice notes",
    "description": "Recording and playing voice notes.",
    "favourite": true,
    "archived": false,
    "tickets": 1
  },
  {
    "id": "f2",
    "project": "TLK",
    "name": "Search",
    "description": "",
    "favourite": false,
    "archived": false,
    "tickets": 1
  }
]
```

19. a1 calls tickets.board-read {"project":"TLK","feature":"f1"} → succeeded:

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
          "title": "Voice notes on the phone",
          "description": "",
          "feature": "f1",
          "featureName": "Voice notes",
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
          "due": null,
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
          "updatedAt": "2026-01-01T09:09:00.000Z",
          "columnSince": "2026-01-01T09:09:00.000Z"
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

20. a1 calls tickets.ticket-find {"feature":null} → succeeded:

```json
[]
```

21. owner calls tickets.feature-archive {"feature":"f2"} → succeeded; updated feature f2
22. a1 calls tickets.ticket-create {"project":"TLK","title":"Too late","feature":"f2"} → rejected: archived-feature: Search is archived.
23. a1 calls tickets.feature-find {"project":"TLK"} → succeeded:

```json
[
  {
    "id": "f1",
    "project": "TLK",
    "name": "Voice notes",
    "description": "Recording and playing voice notes.",
    "favourite": true,
    "archived": false,
    "tickets": 1
  }
]
```

24. a1 calls tickets.feature-find {"project":"TLK","archived":true} → succeeded:

```json
[
  {
    "id": "f1",
    "project": "TLK",
    "name": "Voice notes",
    "description": "Recording and playing voice notes.",
    "favourite": true,
    "archived": false,
    "tickets": 1
  },
  {
    "id": "f2",
    "project": "TLK",
    "name": "Search",
    "description": "",
    "favourite": false,
    "archived": true,
    "tickets": 1
  }
]
```

25. owner calls tickets.feature-restore {"feature":"f2"} → succeeded; updated feature f2
26. a1 calls tickets.ticket-feature-set {"ticket":"TLK-2","feature":null} → succeeded; updated ticket TLK-2

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

None.

### Locations

None.

### Features

| id | project | name | favourite | archived | open tickets |
| --- | --- | --- | --- | --- | --- |
| f1 | TLK | Voice notes | yes |  | 1 |
| f2 | TLK | Search |  |  | 0 |
| f3 | MNY | Export |  |  | 0 |

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | Voice notes on the phone | Voice notes | To do |  |  |  |  | open |
| TLK-2 | Fix the crash on send |  | To do |  |  |  |  | open |

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
| h3 | 09:03 | owner | catalog.project-create | created project Money (MNY) |  |  |
| h4 | 09:04 | a1 | tickets.feature-create | created the feature Voice in TLK |  |  |
| h5 | 09:05 | owner | tickets.feature-create | created the feature Search in TLK |  |  |
| h6 | 09:06 | owner | tickets.feature-create | created the feature Export in MNY |  |  |
| h7 | 09:09 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes on the phone | TLK-1 |  |
| h8 | 09:10 | owner | tickets.ticket-create | created TLK-2 in To do: Fix the crash on send | TLK-2 |  |
| h9 | 09:12 | a1 | tickets.ticket-feature-set | put TLK-2 in the feature Voice | TLK-2 |  |
| h10 | 09:13 | a1 | tickets.ticket-feature-set | put TLK-2 in the feature Search | TLK-2 |  |
| h11 | 09:16 | owner | tickets.feature-edit | changed the feature Voice notes |  |  |
| h12 | 09:21 | owner | tickets.feature-archive | archived the feature Search |  |  |
| h13 | 09:25 | owner | tickets.feature-restore | restored the feature Search |  |  |
| h14 | 09:26 | a1 | tickets.ticket-feature-set | took TLK-2 out of its feature | TLK-2 |  |

# catalog-delete

## Input

[catalog-delete.json](catalog-delete.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
2. owner calls catalog.actor-create {"name":"Spare"} → succeeded; created actor a2
3. owner calls catalog.location-create {"name":"Laptop"} → succeeded; created location p1
4. owner calls catalog.location-create {"name":"Shed"} → succeeded; created location p2
5. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
6. owner calls catalog.project-create {"name":"Empty","prefix":"EMP"} → succeeded; created project EMP
7. owner calls catalog.project-create {"name":"Planned","prefix":"PLN"} → succeeded; created project PLN
8. owner calls tickets.feature-create {"project":"PLN","name":"Voice"} → succeeded; created feature f1
9. owner calls tickets.feature-create {"project":"TLK","name":"Search"} → succeeded; created feature f2
10. owner calls tickets.feature-create {"project":"TLK","name":"Unused"} → succeeded; created feature f3
11. owner calls tickets.ticket-create {"project":"TLK","title":"Find by word","assignee":"a1","location":"p1","feature":"f2"} → succeeded; created ticket TLK-1
12. owner calls catalog.actor-delete {"actor":"a1"} → rejected: in-use: Coder cannot be deleted: 1 ticket is or was its. Archive it instead.
13. owner calls catalog.actor-delete {"actor":"owner"} → rejected: owner: The owner cannot be deleted.
14. owner calls catalog.actor-delete {"actor":"a2"} → succeeded; deleted actor a2
15. owner calls catalog.location-delete {"location":"p1"} → rejected: in-use: Laptop cannot be deleted: 1 ticket has it. Archive it instead.
16. owner calls catalog.location-delete {"location":"p2"} → succeeded; deleted location p2
17. owner calls catalog.project-delete {"project":"TLK"} → rejected: in-use: Talk cannot be deleted: 1 ticket is in it. Archive it instead.
18. owner calls catalog.project-delete {"project":"PLN"} → rejected: in-use: Planned cannot be deleted: 1 feature is in it. Archive it instead.
19. owner calls catalog.project-delete {"project":"EMP"} → succeeded; deleted project EMP
20. owner calls tickets.feature-delete {"feature":"f2"} → rejected: in-use: Search cannot be deleted: 1 ticket is in it. Archive it instead.
21. owner calls tickets.feature-delete {"feature":"f3"} → succeeded; deleted feature f3
22. a1 calls tickets.feature-delete {"feature":"f3"} → rejected: not-allowed: a1 may not run tickets.feature-delete
23. owner calls catalog.actor-delete {"actor":"a9"} → rejected: unknown-actor: No actor has id a9.
24. owner calls history.change-list {"limit":4} → succeeded:

```json
[
  {
    "id": "h12",
    "at": "2026-01-01T09:14:00.000Z",
    "actor": "owner",
    "action": "catalog.actor-delete",
    "summary": "deleted actor Spare",
    "ticket": null,
    "undoes": null,
    "undoneBy": null,
    "undoable": true,
    "imported": false
  },
  {
    "id": "h13",
    "at": "2026-01-01T09:16:00.000Z",
    "actor": "owner",
    "action": "catalog.location-delete",
    "summary": "deleted location Shed",
    "ticket": null,
    "undoes": null,
    "undoneBy": null,
    "undoable": true,
    "imported": false
  },
  {
    "id": "h14",
    "at": "2026-01-01T09:19:00.000Z",
    "actor": "owner",
    "action": "catalog.project-delete",
    "summary": "deleted project Empty",
    "ticket": null,
    "undoes": null,
    "undoneBy": null,
    "undoable": true,
    "imported": false
  },
  {
    "id": "h15",
    "at": "2026-01-01T09:21:00.000Z",
    "actor": "owner",
    "action": "tickets.feature-delete",
    "summary": "deleted the feature Unused",
    "ticket": null,
    "undoes": null,
    "undoneBy": null,
    "undoable": true,
    "imported": false
  }
]
```

25. owner calls history.change-undo {"change":"h12"} → succeeded; updated change h12
26. owner calls catalog.catalog-read → succeeded:

```json
{
  "actors": [
    {
      "id": "owner",
      "name": "",
      "icon": "",
      "colour": "",
      "archived": false
    },
    {
      "id": "a1",
      "name": "Coder",
      "icon": "",
      "colour": "",
      "archived": false
    },
    {
      "id": "a2",
      "name": "Spare",
      "icon": "",
      "colour": "",
      "archived": false
    }
  ],
  "locations": [
    {
      "id": "p1",
      "name": "Laptop",
      "archived": false
    }
  ],
  "projects": [
    {
      "id": "TLK",
      "name": "Talk",
      "icon": "",
      "colour": "teal",
      "archived": false,
      "columns": [
        {
          "id": "c1",
          "name": "To do",
          "kind": "todo"
        },
        {
          "id": "c2",
          "name": "Doing",
          "kind": "doing"
        },
        {
          "id": "c3",
          "name": "Review",
          "kind": "waiting"
        },
        {
          "id": "c4",
          "name": "Done",
          "kind": "done"
        }
      ],
      "card": [
        "id",
        "type",
        "priority",
        "status",
        "actor",
        "feature",
        "updated"
      ],
      "ordering": "created"
    },
    {
      "id": "PLN",
      "name": "Planned",
      "icon": "",
      "colour": "teal",
      "archived": false,
      "columns": [
        {
          "id": "c9",
          "name": "To do",
          "kind": "todo"
        },
        {
          "id": "c10",
          "name": "Doing",
          "kind": "doing"
        },
        {
          "id": "c11",
          "name": "Review",
          "kind": "waiting"
        },
        {
          "id": "c12",
          "name": "Done",
          "kind": "done"
        }
      ],
      "card": [
        "id",
        "type",
        "priority",
        "status",
        "actor",
        "feature",
        "updated"
      ],
      "ordering": "created"
    }
  ],
  "labels": []
}
```


### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner |  |  |  |
| a1 | Coder |  |  |
| a2 | Spare |  |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |
| PLN | Planned | teal |  | c9 To do (todo) · c10 Doing (doing) · c11 Review (waiting) · c12 Done (done) |

### Labels

None.

### Locations

| id | name | archived |
| --- | --- | --- |
| p1 | Laptop |  |

### Features

| id | project | name | favourite | archived | open tickets |
| --- | --- | --- | --- | --- | --- |
| f2 | TLK | Search |  |  | 1 |
| f1 | PLN | Voice |  |  | 0 |

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | Find by word | Search | To do | Coder | Laptop |  |  | open |

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
| h2 | 09:02 | owner | catalog.actor-create | added actor Spare |  |  |
| h3 | 09:03 | owner | catalog.location-create | added location Laptop |  |  |
| h4 | 09:04 | owner | catalog.location-create | added location Shed |  |  |
| h5 | 09:05 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h6 | 09:06 | owner | catalog.project-create | created project Empty (EMP) |  |  |
| h7 | 09:07 | owner | catalog.project-create | created project Planned (PLN) |  |  |
| h8 | 09:08 | owner | tickets.feature-create | created the feature Voice in PLN |  |  |
| h9 | 09:09 | owner | tickets.feature-create | created the feature Search in TLK |  |  |
| h10 | 09:10 | owner | tickets.feature-create | created the feature Unused in TLK |  |  |
| h11 | 09:11 | owner | tickets.ticket-create | created TLK-1 in To do: Find by word | TLK-1 |  |
| h12 | 09:14 | owner | catalog.actor-delete | deleted actor Spare |  | h16 |
| h13 | 09:16 | owner | catalog.location-delete | deleted location Shed |  |  |
| h14 | 09:19 | owner | catalog.project-delete | deleted project Empty |  |  |
| h15 | 09:21 | owner | tickets.feature-delete | deleted the feature Unused |  |  |
| h16 | 09:25 | owner | history.change-undo | undid: deleted actor Spare |  |  |

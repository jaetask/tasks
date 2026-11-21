# labels-merge-usage

## Input

[labels-merge-usage.json](labels-merge-usage.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
2. owner calls catalog.location-create {"name":"Laptop"} → succeeded; created location p1
3. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
4. owner calls catalog.label-create {"name":"migration","colour":"blue"} → succeeded; created label l1
5. owner calls catalog.label-create {"name":"migration-fidelity","colour":"teal"} → succeeded; created label l2
6. owner calls catalog.label-create {"name":"bug","colour":"pink"} → succeeded; created label l3
7. owner calls tickets.ticket-create {"project":"TLK","title":"Bring the notes over","labels":["l1","l2"],"assignee":"a1","location":"p1"} → succeeded; created ticket TLK-1
8. owner calls tickets.ticket-create {"project":"TLK","title":"Check the notes","labels":["l2"]} → succeeded; created ticket TLK-2
9. owner calls tickets.ticket-create {"project":"TLK","title":"Fix the crash","labels":["l3"]} → succeeded; created ticket TLK-3
10. a1 calls tickets.ticket-finish {"ticket":"TLK-3"} → succeeded; updated ticket TLK-3
11. owner calls tickets.usage-read → succeeded:

```json
{
  "labels": {
    "l1": 1,
    "l2": 2,
    "l3": 1
  },
  "projects": {
    "TLK": 2
  },
  "actors": {
    "a1": 1
  },
  "locations": {
    "p1": 1
  }
}
```

12. owner calls tickets.label-merge {"label":"l2","into":"l2"} → rejected: no-change: A label cannot be merged into itself.
13. owner calls tickets.label-merge {"label":"l2","into":"l9"} → rejected: unknown-label: No label has id l9.
14. a1 calls tickets.label-merge {"label":"l2","into":"l1"} → rejected: not-allowed: a1 may not run tickets.label-merge
15. owner calls tickets.label-merge {"label":"l2","into":"l1"} → succeeded; deleted label l2
16. owner calls tickets.usage-read → succeeded:

```json
{
  "labels": {
    "l1": 2,
    "l3": 1
  },
  "projects": {
    "TLK": 2
  },
  "actors": {
    "a1": 1
  },
  "locations": {
    "p1": 1
  }
}
```

17. owner calls history.change-list {"limit":1} → succeeded:

```json
[
  {
    "id": "h11",
    "at": "2026-01-01T09:15:00.000Z",
    "actor": "owner",
    "action": "tickets.label-merge",
    "summary": "merged label migration-fidelity into migration",
    "ticket": null,
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  }
]
```

18. owner calls history.change-undo {"change":"h11"} → succeeded; updated change h11
19. owner calls tickets.usage-read → succeeded:

```json
{
  "labels": {
    "l1": 1,
    "l2": 2,
    "l3": 1
  },
  "projects": {
    "TLK": 2
  },
  "actors": {
    "a1": 1
  },
  "locations": {
    "p1": 1
  }
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

### Labels

| id | name | colour |
| --- | --- | --- |
| l1 | migration | blue |
| l2 | migration-fidelity | teal |
| l3 | bug | pink |

### Locations

| id | name | archived |
| --- | --- | --- |
| p1 | Laptop |  |

### Features

None.

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | Bring the notes over |  | To do | Coder | Laptop | migration, migration-fidelity |  | open |
| TLK-2 | Check the notes |  | To do |  |  | migration-fidelity |  | open |
| TLK-3 | Fix the crash |  | Done |  |  | bug |  | open |

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
| h2 | 09:02 | owner | catalog.location-create | added location Laptop |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h4 | 09:04 | owner | catalog.label-create | created label migration |  |  |
| h5 | 09:05 | owner | catalog.label-create | created label migration-fidelity |  |  |
| h6 | 09:06 | owner | catalog.label-create | created label bug |  |  |
| h7 | 09:07 | owner | tickets.ticket-create | created TLK-1 in To do: Bring the notes over | TLK-1 |  |
| h8 | 09:08 | owner | tickets.ticket-create | created TLK-2 in To do: Check the notes | TLK-2 |  |
| h9 | 09:09 | owner | tickets.ticket-create | created TLK-3 in To do: Fix the crash | TLK-3 |  |
| h10 | 09:10 | a1 | tickets.ticket-finish | finished TLK-3; it is in Done | TLK-3 |  |
| h11 | 09:15 | owner | tickets.label-merge | merged label migration-fidelity into migration |  | h12 |
| h12 | 09:18 | owner | history.change-undo | undid: merged label migration-fidelity into migration |  |  |

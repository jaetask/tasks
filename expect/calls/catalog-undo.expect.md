# catalog-undo

## Input

[catalog-undo.json](catalog-undo.json)

## Output

### Steps

1. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
2. owner calls catalog.project-edit {"project":"TLK","name":"Talk app"} → succeeded; updated project TLK
3. owner calls catalog.column-remove {"column":"c3"} → succeeded; deleted column c3
4. owner calls catalog.label-create {"name":"bug","colour":"pink"} → succeeded; created label l1
5. owner calls catalog.label-remove {"label":"l1"} → succeeded; deleted label l1
6. owner calls history.change-undo {"change":"h5"} → succeeded; updated change h5
7. owner calls history.change-undo {"change":"h3"} → succeeded; updated change h3
8. owner calls history.change-undo {"change":"h3"} → rejected: already-undone: h3 was already undone by h7.
9. owner calls history.change-undo {"change":"h2"} → succeeded; updated change h2
10. owner calls history.change-undo {"change":"h8"} → succeeded; updated change h8
11. owner calls catalog.column-rename {"column":"c2","name":"In progress"} → succeeded; updated column c2
12. owner calls catalog.column-rename {"column":"c2","name":"Working"} → succeeded; updated column c2
13. owner calls history.change-undo {"change":"h10"} → rejected: changed-since: Something h10 changed has changed again since. Undo the later change first.
14. owner calls history.change-undo {"change":"h1"} → rejected: changed-since: Something h1 changed has changed again since. Undo the later change first.
15. owner calls history.change-undo {"change":"h404"} → rejected: unknown-change: No change has id h404.
16. owner calls history.change-list {"limit":3} → succeeded:

```json
[
  {
    "id": "h9",
    "at": "2026-01-01T09:10:00.000Z",
    "actor": "owner",
    "action": "history.change-undo",
    "summary": "redid: renamed project Talk to Talk app",
    "ticket": null,
    "undoes": "h8",
    "undoneBy": null,
    "undoable": true,
    "imported": false
  },
  {
    "id": "h10",
    "at": "2026-01-01T09:11:00.000Z",
    "actor": "owner",
    "action": "catalog.column-rename",
    "summary": "renamed column Doing to In progress in TLK",
    "ticket": null,
    "undoes": null,
    "undoneBy": null,
    "undoable": true,
    "imported": false
  },
  {
    "id": "h11",
    "at": "2026-01-01T09:12:00.000Z",
    "actor": "owner",
    "action": "catalog.column-rename",
    "summary": "renamed column In progress to Working in TLK",
    "ticket": null,
    "undoes": null,
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

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk app | teal |  | c1 To do (todo) · c2 Working (doing) · c3 Review (waiting) · c4 Done (done) |

### Labels

| id | name | colour |
| --- | --- | --- |
| l1 | bug | pink |

### Locations

None.

### Features

None.

### Tickets

None.

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
| h1 | 09:01 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h2 | 09:02 | owner | catalog.project-edit | renamed project Talk to Talk app |  |  |
| h3 | 09:03 | owner | catalog.column-remove | removed column Review from TLK; its tickets moved to Doing |  | h7 |
| h4 | 09:04 | owner | catalog.label-create | created label bug |  |  |
| h5 | 09:05 | owner | catalog.label-remove | removed label bug |  | h6 |
| h6 | 09:06 | owner | history.change-undo | undid: removed label bug |  |  |
| h7 | 09:07 | owner | history.change-undo | undid: removed column Review from TLK; its tickets moved to Doing |  |  |
| h8 | 09:09 | owner | history.change-undo | undid: renamed project Talk to Talk app |  | h9 |
| h9 | 09:10 | owner | history.change-undo | redid: renamed project Talk to Talk app |  |  |
| h10 | 09:11 | owner | catalog.column-rename | renamed column Doing to In progress in TLK |  |  |
| h11 | 09:12 | owner | catalog.column-rename | renamed column In progress to Working in TLK |  |  |

# catalog-owner-only

## Input

[catalog-owner-only.json](catalog-owner-only.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
2. a1 calls catalog.catalog-read → succeeded:

```json
{
  "actors": [
    {
      "id": "owner",
      "name": "",
      "archived": false
    },
    {
      "id": "a1",
      "name": "Coder",
      "archived": false
    }
  ],
  "projects": [],
  "labels": []
}
```

3. a1 calls catalog.project-create {"name":"Mine","prefix":"MIN"} → rejected: not-allowed: a1 may not run catalog.project-create
4. a1 calls catalog.actor-rename {"actor":"a1","name":"Boss"} → rejected: not-allowed: a1 may not run catalog.actor-rename
5. a1 calls history.change-undo {"change":"h1"} → rejected: not-allowed: a1 may not run history.change-undo
6. a1 calls history.change-list → succeeded:

```json
[
  {
    "id": "h1",
    "at": "2026-01-01T09:01:00.000Z",
    "actor": "owner",
    "action": "catalog.actor-create",
    "summary": "added actor Coder",
    "ticket": null,
    "undoes": null,
    "undoneBy": null,
    "undoable": true
  }
]
```


### Actors

| id | name | archived |
| --- | --- | --- |
| owner |  |  |
| a1 | Coder |  |

### Projects

None.

### Labels

None.

### Tickets

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-create | added actor Coder |  |  |

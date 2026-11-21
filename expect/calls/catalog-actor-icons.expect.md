# catalog-actor-icons

## Input

[catalog-actor-icons.json](catalog-actor-icons.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-icon-set {"actor":"owner","icon":"🧑"} → succeeded; updated actor owner
3. owner calls catalog.actor-create {"name":"Coder","icon":"🤖"} → succeeded; created actor a1
4. owner calls catalog.actor-create {"name":"Reviewer"} → succeeded; created actor a2
5. owner calls catalog.actor-icon-set {"actor":"a2","icon":"🔎"} → succeeded; updated actor a2
6. owner calls catalog.actor-icon-set {"actor":"a1","icon":""} → succeeded; updated actor a1
7. owner calls catalog.actor-icon-set {"actor":"a9","icon":"🙂"} → rejected: unknown-actor: No actor has id a9.
8. a2 calls catalog.actor-icon-set {"actor":"a2","icon":"🙂"} → rejected: not-allowed: a2 may not run catalog.actor-icon-set
9. owner calls catalog.catalog-read → succeeded:

```json
{
  "actors": [
    {
      "id": "owner",
      "name": "Sam",
      "icon": "🧑",
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
      "name": "Reviewer",
      "icon": "🔎",
      "colour": "",
      "archived": false
    }
  ],
  "locations": [],
  "projects": [],
  "labels": []
}
```


### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner | Sam | 🧑 |  |
| a1 | Coder |  |  |
| a2 | Reviewer | 🔎 |  |

### Projects

None.

### Labels

None.

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
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-icon-set | set the icon of actor Sam to 🧑 |  |  |
| h3 | 09:03 | owner | catalog.actor-create | added actor Coder |  |  |
| h4 | 09:04 | owner | catalog.actor-create | added actor Reviewer |  |  |
| h5 | 09:05 | owner | catalog.actor-icon-set | set the icon of actor Reviewer to 🔎 |  |  |
| h6 | 09:06 | owner | catalog.actor-icon-set | removed the icon of actor Coder |  |  |

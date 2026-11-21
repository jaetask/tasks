# catalog-actor-colour

## Input

[catalog-actor-colour.json](catalog-actor-colour.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Coder","icon":"robot","colour":"#48B685"} → succeeded; created actor a1
2. owner calls catalog.actor-create {"name":"Reviewer"} → succeeded; created actor a2
3. owner calls catalog.actor-icon-set {"actor":"a2","icon":"bug","colour":"#6366f1"} → succeeded; updated actor a2
4. owner calls catalog.actor-icon-set {"actor":"a2","icon":"star"} → succeeded; updated actor a2
5. owner calls catalog.actor-icon-set {"actor":"owner","icon":"person","colour":""} → succeeded; updated actor owner
6. owner calls catalog.actor-icon-set {"actor":"a1","icon":"nonsense"} → rejected: invalid-input: icon: an icon is one of: folder, robot, code, checklist, layout, rocket, bolt, flame, star, heart, bulb, target, flag, chart, wallet, dollar, person, table, brand-x, globe, cloud, database, terminal, tool, bug, palette, book, coffee
7. owner calls catalog.actor-icon-set {"actor":"a1","icon":"robot","colour":"green"} → rejected: invalid-input: colour: a colour is six-digit hex such as #48b685, or empty
8. owner calls catalog.catalog-read → succeeded:

```json
{
  "actors": [
    {
      "id": "owner",
      "name": "",
      "icon": "person",
      "colour": "",
      "archived": false
    },
    {
      "id": "a1",
      "name": "Coder",
      "icon": "robot",
      "colour": "#48b685",
      "archived": false
    },
    {
      "id": "a2",
      "name": "Reviewer",
      "icon": "star",
      "colour": "#6366f1",
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
| owner |  | person |  |
| a1 | Coder | robot #48b685 |  |
| a2 | Reviewer | star #6366f1 |  |

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
| h1 | 09:01 | owner | catalog.actor-create | added actor Coder |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Reviewer |  |  |
| h3 | 09:03 | owner | catalog.actor-icon-set | set the icon of actor Reviewer to bug |  |  |
| h4 | 09:04 | owner | catalog.actor-icon-set | set the icon of actor Reviewer to star |  |  |
| h5 | 09:05 | owner | catalog.actor-icon-set | set the icon of actor  to person |  |  |

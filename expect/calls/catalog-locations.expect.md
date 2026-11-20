# catalog-locations

## Input

[catalog-locations.json](catalog-locations.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.location-create {"name":"Studio"} → succeeded; created location p1
4. owner calls catalog.location-create {"name":"Laptop"} → succeeded; created location p2
5. owner calls catalog.location-create {"name":"studio"} → rejected: name-taken: A location is already named studio.
6. owner calls catalog.location-rename {"location":"p2","name":"Travel laptop"} → succeeded; updated location p2
7. owner calls catalog.location-rename {"location":"p2","name":"Studio"} → rejected: name-taken: A location is already named Studio.
8. owner calls catalog.location-archive {"location":"p1"} → succeeded; updated location p1
9. owner calls catalog.location-restore {"location":"p1"} → succeeded; updated location p1
10. owner calls catalog.location-rename {"location":"p9","name":"Nowhere"} → rejected: unknown-location: No location has id p9.
11. a1 calls catalog.location-create {"name":"Server"} → rejected: not-allowed: a1 may not run catalog.location-create
12. owner calls catalog.project-create {"name":"Notes","prefix":"N"} → succeeded; created project N
13. owner calls catalog.project-create {"name":"Too long","prefix":"TOOLONG"} → rejected: invalid-input: prefix: a prefix is 1 to 6 capital letters, like TLK
14. owner calls catalog.catalog-read → succeeded:

```json
{
  "actors": [
    {
      "id": "owner",
      "name": "Sam",
      "icon": "",
      "archived": false
    },
    {
      "id": "a1",
      "name": "Coder",
      "icon": "",
      "archived": false
    }
  ],
  "locations": [
    {
      "id": "p1",
      "name": "Studio",
      "archived": false
    },
    {
      "id": "p2",
      "name": "Travel laptop",
      "archived": false
    }
  ],
  "projects": [
    {
      "id": "N",
      "name": "Notes",
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
      ]
    }
  ],
  "labels": []
}
```


### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner | Sam |  |  |
| a1 | Coder |  |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| N | Notes | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |

### Labels

None.

### Locations

| id | name | archived |
| --- | --- | --- |
| p1 | Studio |  |
| p2 | Travel laptop |  |

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
| h2 | 09:02 | owner | catalog.actor-create | added actor Coder |  |  |
| h3 | 09:03 | owner | catalog.location-create | added location Studio |  |  |
| h4 | 09:04 | owner | catalog.location-create | added location Laptop |  |  |
| h5 | 09:06 | owner | catalog.location-rename | renamed location Laptop to Travel laptop |  |  |
| h6 | 09:08 | owner | catalog.location-archive | archived location Studio |  |  |
| h7 | 09:09 | owner | catalog.location-restore | restored location Studio |  |  |
| h8 | 09:12 | owner | catalog.project-create | created project Notes (N) |  |  |

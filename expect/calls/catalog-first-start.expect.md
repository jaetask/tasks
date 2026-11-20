# catalog-first-start

## Input

[catalog-first-start.json](catalog-first-start.json)

## Output

### Steps

1. owner calls catalog.catalog-read → succeeded:

```json
{
  "actors": [
    {
      "id": "owner",
      "name": "",
      "archived": false
    }
  ],
  "projects": [],
  "labels": []
}
```

2. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
3. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
4. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
5. owner calls catalog.label-create {"name":"bug","colour":"red"} → succeeded; created label l1
6. owner calls catalog.catalog-read → succeeded:

```json
{
  "actors": [
    {
      "id": "owner",
      "name": "Sam",
      "archived": false
    },
    {
      "id": "a1",
      "name": "Coder",
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
      ]
    }
  ],
  "labels": [
    {
      "id": "l1",
      "name": "bug",
      "colour": "red"
    }
  ]
}
```


### Actors

| id | name | archived |
| --- | --- | --- |
| owner | Sam |  |
| a1 | Coder |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |

### Labels

| id | name | colour |
| --- | --- | --- |
| l1 | bug | red |

### Features

None.

### Tickets

None.

### Comments

None.

### Images

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:02 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:03 | owner | catalog.actor-create | added actor Coder |  |  |
| h3 | 09:04 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h4 | 09:05 | owner | catalog.label-create | created label bug |  |  |

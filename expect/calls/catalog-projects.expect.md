# catalog-projects

## Input

[catalog-projects.json](catalog-projects.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
2. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
3. owner calls catalog.project-create {"name":"Money","prefix":"MNY"} → succeeded; created project MNY
4. owner calls catalog.project-create {"name":"Notes","prefix":"NTS"} → succeeded; created project NTS
5. owner calls catalog.project-edit {"project":"TLK","icon":"💬"} → succeeded; updated project TLK
6. owner calls catalog.project-move {"project":"NTS","before":"TLK"} → succeeded; updated project NTS
7. owner calls catalog.project-move {"project":"NTS"} → succeeded; updated project NTS
8. owner calls catalog.project-move {"project":"MNY","before":"TLK"} → succeeded; updated project MNY
9. owner calls catalog.project-move {"project":"MNY","before":"NOPE"} → rejected: unknown-project: No project has id NOPE.
10. owner calls catalog.project-edit {"project":"TLK","icon":""} → succeeded; updated project TLK
11. owner calls history.change-undo {"change":"h9"} → succeeded; updated change h9
12. a1 calls catalog.project-move {"project":"TLK"} → rejected: not-allowed: a1 may not run catalog.project-move
13. owner calls catalog.project-edit {"project":"MNY","icon":"dollar","colour":"#48B685"} → succeeded; updated project MNY
14. owner calls catalog.project-edit {"project":"NTS","icon":"notebook"} → rejected: invalid-input: icon: an icon is one of: folder, robot, code, checklist, layout, rocket, bolt, flame, star, heart, bulb, target, flag, chart, wallet, dollar, person, table, brand-x, globe, cloud, database, terminal, tool, bug, palette, book, coffee
15. owner calls catalog.project-edit {"project":"NTS","colour":"#48b"} → rejected: invalid-input: colour: a colour is one of blue, teal, green, amber, purple, pink, or six-digit hex such as #48b685
16. owner calls catalog.project-edit {"project":"NTS","colour":"lime"} → rejected: invalid-input: colour: a colour is one of blue, teal, green, amber, purple, pink, or six-digit hex such as #48b685
17. owner calls catalog.catalog-read → succeeded:

```json
{
  "actors": [
    {
      "id": "owner",
      "name": "",
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
  "locations": [],
  "projects": [
    {
      "id": "MNY",
      "name": "Money",
      "icon": "dollar",
      "colour": "#48b685",
      "archived": false,
      "columns": [
        {
          "id": "c5",
          "name": "To do",
          "kind": "todo"
        },
        {
          "id": "c6",
          "name": "Doing",
          "kind": "doing"
        },
        {
          "id": "c7",
          "name": "Review",
          "kind": "waiting"
        },
        {
          "id": "c8",
          "name": "Done",
          "kind": "done"
        }
      ]
    },
    {
      "id": "TLK",
      "name": "Talk",
      "icon": "💬",
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
    },
    {
      "id": "NTS",
      "name": "Notes",
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
      ]
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

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| MNY | Money | dollar #48b685 |  | c5 To do (todo) · c6 Doing (doing) · c7 Review (waiting) · c8 Done (done) |
| TLK | Talk | 💬 teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |
| NTS | Notes | teal |  | c9 To do (todo) · c10 Doing (doing) · c11 Review (waiting) · c12 Done (done) |

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
| h2 | 09:02 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Money (MNY) |  |  |
| h4 | 09:04 | owner | catalog.project-create | created project Notes (NTS) |  |  |
| h5 | 09:05 | owner | catalog.project-edit | changed how project Talk looks |  |  |
| h6 | 09:06 | owner | catalog.project-move | moved project Notes in the list |  |  |
| h7 | 09:07 | owner | catalog.project-move | moved project Notes in the list |  |  |
| h8 | 09:08 | owner | catalog.project-move | moved project Money in the list |  |  |
| h9 | 09:10 | owner | catalog.project-edit | changed how project Talk looks |  | h10 |
| h10 | 09:11 | owner | history.change-undo | undid: changed how project Talk looks |  |  |
| h11 | 09:13 | owner | catalog.project-edit | changed how project Money looks |  |  |

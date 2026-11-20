# tickets-location

## Input

[tickets-location.json](tickets-location.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
4. owner calls catalog.location-create {"name":"Studio"} → succeeded; created location p1
5. owner calls catalog.location-create {"name":"Laptop"} → succeeded; created location p2
6. owner calls tickets.ticket-create {"project":"TLK","title":"Run the voice model","location":"p1"} → succeeded; created ticket TLK-1
7. owner calls tickets.ticket-create {"project":"TLK","title":"Write the guide"} → succeeded; created ticket TLK-2
8. a1 calls tickets.ticket-location-set {"ticket":"TLK-2","location":"p2"} → succeeded; updated ticket TLK-2
9. owner calls tickets.ticket-location-set {"ticket":"TLK-2","location":"p9"} → rejected: unknown-location: No location has id p9.
10. owner calls catalog.location-archive {"location":"p2"} → succeeded; updated location p2
11. owner calls tickets.ticket-location-set {"ticket":"TLK-1","location":"p2"} → rejected: archived-location: Laptop is archived.
12. owner calls tickets.ticket-create {"project":"TLK","title":"Try the laptop","location":"p2"} → rejected: archived-location: Laptop is archived.
13. owner calls tickets.ticket-read {"ticket":"TLK-2"} → succeeded:

```json
{
  "id": "TLK-2",
  "project": "TLK",
  "title": "Write the guide",
  "description": "",
  "feature": null,
  "featureName": "",
  "column": {
    "id": "c1",
    "name": "To do",
    "kind": "todo"
  },
  "assignee": null,
  "assigneeName": "",
  "labels": [],
  "location": "p2",
  "locationName": "Laptop",
  "blocked": null,
  "state": "open",
  "backlog": false,
  "comments": 0,
  "images": 0,
  "awaiting": 0,
  "createdAt": "2026-01-01T09:07:00.000Z",
  "createdBy": "owner",
  "updatedAt": "2026-01-01T09:08:00.000Z"
}
```

14. owner calls tickets.ticket-location-set {"ticket":"TLK-1","location":null} → succeeded; updated ticket TLK-1
15. owner calls history.change-undo {"change":"h8"} → succeeded; updated change h8

### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner | Sam |  |  |
| a1 | Coder |  |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |

### Labels

None.

### Locations

| id | name | archived |
| --- | --- | --- |
| p1 | Studio |  |
| p2 | Laptop | yes |

### Features

None.

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | Run the voice model |  | To do |  |  |  |  | open |
| TLK-2 | Write the guide |  | To do |  |  |  |  | open |

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
| h3 | 09:03 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h4 | 09:04 | owner | catalog.location-create | added location Studio |  |  |
| h5 | 09:05 | owner | catalog.location-create | added location Laptop |  |  |
| h6 | 09:06 | owner | tickets.ticket-create | created TLK-1 in To do: Run the voice model | TLK-1 |  |
| h7 | 09:07 | owner | tickets.ticket-create | created TLK-2 in To do: Write the guide | TLK-2 |  |
| h8 | 09:08 | a1 | tickets.ticket-location-set | set the location of TLK-2 to Laptop | TLK-2 | h11 |
| h9 | 09:10 | owner | catalog.location-archive | archived location Laptop |  |  |
| h10 | 09:14 | owner | tickets.ticket-location-set | removed the location of TLK-1 | TLK-1 |  |
| h11 | 09:15 | owner | history.change-undo | undid: set the location of TLK-2 to Laptop | TLK-2 |  |

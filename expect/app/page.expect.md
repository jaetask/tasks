# page

## Input

[page.json](page.json)

## Output

### Steps

1. GET / → HTTP 200: text/html; charset=utf-8; not empty; scripts from this App only
2. GET /app.js → HTTP 200: text/javascript; charset=utf-8; not empty; scripts from this App only
3. GET /app.css → HTTP 200: text/css; charset=utf-8; not empty; scripts from this App only
4. GET /index.html → HTTP 200: text/html; charset=utf-8; not empty; scripts from this App only
5. GET /../package.json → HTTP 404: Not found
6. GET /nothing.js → HTTP 404: Not found
7. GET /api/session (not signed in) → HTTP 200: {"signedIn":false}
8. the page calls tickets.board-read {"project":"TLK"} → HTTP 401: {"error":"Sign in first."}
9. GET /events (not signed in) → HTTP 401: Sign in first.
10. the owner signs in on the page → HTTP 200
11. GET /api/session (signed in) → HTTP 200: {"signedIn":true}
12. the page calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
13. the page calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
14. the page calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-1
15. the page calls comments.comment-add {"ticket":"TLK-1","text":"First."} → succeeded; created comment m1
16. the page calls tickets.board-read {"project":"TLK"} → succeeded:

```json
{
  "project": {
    "id": "TLK",
    "name": "Talk"
  },
  "columns": [
    {
      "id": "c1",
      "name": "To do",
      "kind": "todo",
      "tickets": [
        {
          "id": "TLK-1",
          "project": "TLK",
          "title": "Voice notes on the phone",
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
          "type": "task",
          "priority": "none",
          "reactions": [],
          "evidence": null,
          "due": null,
          "links": [],
          "location": null,
          "locationName": "",
          "blocked": null,
          "state": "open",
          "backlog": false,
          "comments": 1,
          "images": 0,
          "awaiting": 0,
          "createdAt": "2026-01-01T09:14:00.000Z",
          "createdBy": "owner",
          "updatedAt": "2026-01-01T09:15:00.000Z",
          "columnSince": "2026-01-01T09:14:00.000Z"
        }
      ]
    },
    {
      "id": "c2",
      "name": "Doing",
      "kind": "doing",
      "tickets": []
    },
    {
      "id": "c3",
      "name": "Review",
      "kind": "waiting",
      "tickets": []
    },
    {
      "id": "c4",
      "name": "Done",
      "kind": "done",
      "tickets": []
    }
  ]
}
```


### Change events the page saw

updated actor owner (catalog.actor-rename, caller ui)
created project TLK (catalog.project-create, caller ui)
created ticket TLK-1 (tickets.ticket-create, caller ui)
created comment m1 (comments.comment-add, caller ui)

### Connections

None.

### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner | Sam |  |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |

### Labels

None.

### Locations

None.

### Features

None.

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | Voice notes on the phone |  | To do |  |  |  |  | open |

### Comments

| id | ticket | reply to | author | text | reactions |
| --- | --- | --- | --- | --- | --- |
| m1 | TLK-1 |  | Sam | First. |  |

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
| h1 | 09:12 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:13 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h3 | 09:14 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes on the phone | TLK-1 |  |
| h4 | 09:15 | owner | comments.comment-add | commented on TLK-1 | TLK-1 |  |

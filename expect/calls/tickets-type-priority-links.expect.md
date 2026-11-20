# tickets-type-priority-links

## Input

[tickets-type-priority-links.json](tickets-type-priority-links.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
4. owner calls tickets.ticket-create {"project":"TLK","title":"Crash on send","type":"bug","priority":"high","links":["https://example.com/reports/41"]} → succeeded; created ticket TLK-1
5. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-2
6. a1 calls tickets.ticket-type-set {"ticket":"TLK-2","type":"improvement"} → succeeded; updated ticket TLK-2
7. a1 calls tickets.ticket-priority-set {"ticket":"TLK-2","priority":"medium"} → succeeded; updated ticket TLK-2
8. a1 calls tickets.ticket-link-add {"ticket":"TLK-2","url":"https://example.com/pull/7"} → succeeded; updated ticket TLK-2
9. a1 calls tickets.ticket-link-add {"ticket":"TLK-2","url":"https://example.com/pull/7"} → rejected: link-there: TLK-2 already has this link.
10. owner calls tickets.ticket-link-add {"ticket":"TLK-2","url":"notes.txt"} → rejected: invalid-input: url: a link is a web address that starts with http:// or https://
11. owner calls tickets.ticket-type-set {"ticket":"TLK-2","type":"chore"} → rejected: invalid-input: type: Invalid option: expected one of "task"|"bug"|"improvement"|"specification"
12. owner calls tickets.ticket-link-remove {"ticket":"TLK-1","link":"u2"} → rejected: unknown-link: TLK-1 has no link with id u2.
13. owner calls tickets.ticket-link-remove {"ticket":"TLK-1","link":"u1"} → succeeded; updated ticket TLK-1
14. owner calls history.change-undo {"change":"h8"} → succeeded; updated change h8
15. owner calls tickets.ticket-reaction-add {"ticket":"TLK-1","emoji":"👍"} → succeeded; updated ticket TLK-1
16. owner calls tickets.ticket-reaction-add {"ticket":"TLK-1","emoji":"🚀"} → succeeded; updated ticket TLK-1
17. owner calls tickets.ticket-reaction-add {"ticket":"TLK-1","emoji":"👍"} → succeeded
18. a1 calls tickets.ticket-reaction-add {"ticket":"TLK-1","emoji":"👍"} → succeeded; updated ticket TLK-1
19. owner calls tickets.ticket-reaction-remove {"ticket":"TLK-1","emoji":"🚀"} → succeeded; updated ticket TLK-1
20. owner calls tickets.ticket-find {"priority":"high"} → succeeded:

```json
[
  {
    "id": "TLK-1",
    "project": "TLK",
    "title": "Crash on send",
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
    "type": "bug",
    "priority": "high",
    "reactions": [
      {
        "emoji": "👍",
        "actors": [
          "owner",
          "a1"
        ]
      }
    ],
    "links": [],
    "location": null,
    "locationName": "",
    "blocked": null,
    "state": "open",
    "backlog": false,
    "comments": 0,
    "images": 0,
    "awaiting": 0,
    "createdAt": "2026-01-01T09:04:00.000Z",
    "createdBy": "owner",
    "updatedAt": "2026-01-01T09:19:00.000Z"
  }
]
```


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

None.

### Features

None.

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | Crash on send |  | To do |  |  |  |  | open |
| TLK-2 | Voice notes on the phone |  | To do |  |  |  |  | open |

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
| h4 | 09:04 | owner | tickets.ticket-create | created TLK-1 in To do: Crash on send | TLK-1 |  |
| h5 | 09:05 | owner | tickets.ticket-create | created TLK-2 in To do: Voice notes on the phone | TLK-2 |  |
| h6 | 09:06 | a1 | tickets.ticket-type-set | set the type of TLK-2 to improvement | TLK-2 |  |
| h7 | 09:07 | a1 | tickets.ticket-priority-set | set the priority of TLK-2 to medium | TLK-2 |  |
| h8 | 09:08 | a1 | tickets.ticket-link-add | added a link to TLK-2: https://example.com/pull/7 | TLK-2 | h10 |
| h9 | 09:13 | owner | tickets.ticket-link-remove | removed a link from TLK-1 | TLK-1 |  |
| h10 | 09:14 | owner | history.change-undo | undid: added a link to TLK-2: https://example.com/pull/7 | TLK-2 |  |
| h11 | 09:15 | owner | tickets.ticket-reaction-add | reacted 👍 to TLK-1 | TLK-1 |  |
| h12 | 09:16 | owner | tickets.ticket-reaction-add | reacted 🚀 to TLK-1 | TLK-1 |  |
| h13 | 09:18 | a1 | tickets.ticket-reaction-add | reacted 👍 to TLK-1 | TLK-1 |  |
| h14 | 09:19 | owner | tickets.ticket-reaction-remove | took back 🚀 from TLK-1 | TLK-1 |  |

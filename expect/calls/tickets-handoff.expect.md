# tickets-handoff

## Input

[tickets-handoff.json](tickets-handoff.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.actor-create {"name":"Reviewer"} → succeeded; created actor a2
4. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
5. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-1
6. owner calls tickets.ticket-assign {"ticket":"TLK-1","actor":"a1","note":"Start with the lock screen; the design is in the description."} → succeeded; updated ticket TLK-1
7. a1 calls tickets.ticket-assign {"ticket":"TLK-1","actor":"a2","note":"Recording works. Please review the upload path."} → succeeded; updated ticket TLK-1
8. a2 calls replies.reply-list {"state":"unread"} → succeeded:

```json
[
  {
    "id": "r2",
    "to": "a2",
    "toName": "Reviewer",
    "from": "a1",
    "fromName": "Coder",
    "kind": "comment",
    "ticket": "TLK-1",
    "about": "m2",
    "text": "Recording works. Please review the upload path.",
    "at": "2026-01-01T09:07:00.000Z",
    "state": "unread"
  }
]
```

9. owner calls comments.conversation-read {"ticket":"TLK-1"} → succeeded:

```json
{
  "ticket": "TLK-1",
  "entries": [
    {
      "type": "change",
      "change": {
        "id": "h5",
        "at": "2026-01-01T09:05:00.000Z",
        "actor": "owner",
        "actorName": "Sam",
        "summary": "created TLK-1 in To do: Voice notes on the phone",
        "undoable": true
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h6",
        "at": "2026-01-01T09:06:00.000Z",
        "actor": "owner",
        "actorName": "Sam",
        "summary": "assigned TLK-1 to Coder",
        "undoable": true
      }
    },
    {
      "type": "comment",
      "comment": {
        "id": "m1",
        "ticket": "TLK-1",
        "replyTo": null,
        "author": "owner",
        "authorName": "Sam",
        "text": "Start with the lock screen; the design is in the description.",
        "at": "2026-01-01T09:06:00.000Z",
        "editedAt": null,
        "removed": false,
        "reactions": [],
        "replies": []
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h7",
        "at": "2026-01-01T09:07:00.000Z",
        "actor": "a1",
        "actorName": "Coder",
        "summary": "assigned TLK-1 to Reviewer",
        "undoable": true
      }
    },
    {
      "type": "comment",
      "comment": {
        "id": "m2",
        "ticket": "TLK-1",
        "replyTo": null,
        "author": "a1",
        "authorName": "Coder",
        "text": "Recording works. Please review the upload path.",
        "at": "2026-01-01T09:07:00.000Z",
        "editedAt": null,
        "removed": false,
        "reactions": [],
        "replies": []
      }
    }
  ]
}
```


### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner | Sam |  |  |
| a1 | Coder |  |  |
| a2 | Reviewer |  |  |

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
| TLK-1 | Voice notes on the phone |  | To do | Reviewer |  |  |  | open |

### Comments

| id | ticket | reply to | author | text | reactions |
| --- | --- | --- | --- | --- | --- |
| m1 | TLK-1 |  | Sam | Start with the lock screen; the design is in the description. |  |
| m2 | TLK-1 |  | Coder | Recording works. Please review the upload path. |  |

### Images

None.

### Input requests

None.

### Ticket steps

None.

### Agent inboxes

| id | for | from | kind | ticket | about | text | state |
| --- | --- | --- | --- | --- | --- | --- | --- |
| r1 | Coder | Sam | comment | TLK-1 | m1 | Start with the lock screen; the design is in the description. | unread |
| r2 | Reviewer | Coder | comment | TLK-1 | m2 | Recording works. Please review the upload path. | unread |

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Coder |  |  |
| h3 | 09:03 | owner | catalog.actor-create | added actor Reviewer |  |  |
| h4 | 09:04 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h5 | 09:05 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes on the phone | TLK-1 |  |
| h6 | 09:06 | owner | tickets.ticket-assign | assigned TLK-1 to Coder | TLK-1 |  |
| h7 | 09:07 | a1 | tickets.ticket-assign | assigned TLK-1 to Reviewer | TLK-1 |  |

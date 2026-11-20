# comments-threads

## Input

[comments-threads.json](comments-threads.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
4. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-1
5. a1 calls comments.comment-add {"ticket":"TLK-1","text":"Trim silence from recordings\nLong pauses make notes twice as long as they need to be."} → succeeded; created comment m1
6. owner calls comments.comment-add {"ticket":"TLK-1","text":"Good idea, separate ticket.","reply_to":"m1"} → succeeded; created comment m2
7. owner calls comments.reaction-add {"comment":"m1","emoji":"👍"} → succeeded; updated comment m1
8. owner calls comments.reaction-add {"comment":"m1","emoji":"🎉"} → succeeded; updated comment m1
9. owner calls comments.reaction-add {"comment":"m1","emoji":"👍"} → succeeded
10. a1 calls comments.reaction-add {"comment":"m1","emoji":"👍"} → succeeded; updated comment m1
11. a1 calls comments.reaction-add {"comment":"m2","emoji":"🫡"} → succeeded; updated comment m2
12. owner calls comments.comment-ticket-create {"comment":"m1"} → succeeded; created ticket TLK-2
13. owner calls comments.thread-resolve {"comment":"m1"} → succeeded; updated comment m1
14. owner calls comments.thread-resolve {"comment":"m1"} → rejected: no-change: The thread of m1 is already resolved.
15. owner calls comments.thread-resolve {"comment":"m2"} → rejected: a-reply: m2 is a reply. Resolve the comment it replies to.
16. a1 calls comments.thread-reopen {"comment":"m1"} → succeeded; updated comment m1
17. a1 calls comments.comment-edit {"comment":"m2","text":"Not mine to edit."} → rejected: not-yours: Only its author can edit a comment.
18. owner calls comments.comment-edit {"comment":"m2","text":"Good idea, made a separate ticket."} → succeeded; updated comment m2
19. owner calls comments.conversation-read {"ticket":"TLK-1"} → succeeded:

```json
{
  "ticket": "TLK-1",
  "entries": [
    {
      "type": "change",
      "change": {
        "id": "h4",
        "at": "2026-01-01T09:04:00.000Z",
        "actor": "owner",
        "actorName": "Sam",
        "summary": "created TLK-1 in To do: Voice notes on the phone",
        "undoable": true
      }
    },
    {
      "type": "comment",
      "comment": {
        "id": "m1",
        "ticket": "TLK-1",
        "replyTo": null,
        "author": "a1",
        "authorName": "Coder",
        "text": "Trim silence from recordings\nLong pauses make notes twice as long as they need to be.",
        "at": "2026-01-01T09:05:00.000Z",
        "editedAt": null,
        "removed": false,
        "resolved": false,
        "reactions": [
          {
            "emoji": "👍",
            "actors": [
              "owner",
              "a1"
            ]
          },
          {
            "emoji": "🎉",
            "actors": [
              "owner"
            ]
          }
        ],
        "replies": [
          {
            "id": "m2",
            "ticket": "TLK-1",
            "replyTo": "m1",
            "author": "owner",
            "authorName": "Sam",
            "text": "Good idea, made a separate ticket.",
            "at": "2026-01-01T09:06:00.000Z",
            "editedAt": "2026-01-01T09:18:00.000Z",
            "removed": false,
            "resolved": false,
            "reactions": [
              {
                "emoji": "🫡",
                "actors": [
                  "a1"
                ]
              }
            ]
          }
        ]
      }
    }
  ]
}
```

20. owner calls tickets.ticket-read {"ticket":"TLK-2"} → succeeded:

```json
{
  "id": "TLK-2",
  "project": "TLK",
  "title": "Trim silence from recordings",
  "description": "Trim silence from recordings\nLong pauses make notes twice as long as they need to be.\n\nFrom a comment by Coder on TLK-1 (m1).",
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
  "due": null,
  "links": [],
  "location": null,
  "locationName": "",
  "blocked": null,
  "state": "open",
  "backlog": true,
  "comments": 0,
  "images": 0,
  "awaiting": 0,
  "createdAt": "2026-01-01T09:12:00.000Z",
  "createdBy": "owner",
  "updatedAt": "2026-01-01T09:12:00.000Z",
  "columnSince": "2026-01-01T09:12:00.000Z"
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
| TLK-2 | Trim silence from recordings |  | (backlog) |  |  |  |  | open |

### Comments

| id | ticket | reply to | author | text | reactions |
| --- | --- | --- | --- | --- | --- |
| m1 | TLK-1 |  | Coder | Trim silence from recordings
Long pauses make notes twice as long as they need to be. | 👍 owner a1, 🎉 owner |
| m2 | TLK-1 | m1 | Sam | Good idea, made a separate ticket. (edited) | 🫡 a1 |

### Images

None.

### Input requests

None.

### Ticket steps

None.

### Agent inboxes

| id | for | from | kind | ticket | about | text | state |
| --- | --- | --- | --- | --- | --- | --- | --- |
| r1 | Coder | Sam | reply | TLK-1 | m2 | Good idea, separate ticket. | unread |

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Coder |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h4 | 09:04 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes on the phone | TLK-1 |  |
| h5 | 09:05 | a1 | comments.comment-add | commented on TLK-1 | TLK-1 |  |
| h6 | 09:06 | owner | comments.comment-add | replied to m1 on TLK-1 | TLK-1 |  |
| h7 | 09:07 | owner | comments.reaction-add | reacted 👍 to m1 on TLK-1 | TLK-1 |  |
| h8 | 09:08 | owner | comments.reaction-add | reacted 🎉 to m1 on TLK-1 | TLK-1 |  |
| h9 | 09:10 | a1 | comments.reaction-add | reacted 👍 to m1 on TLK-1 | TLK-1 |  |
| h10 | 09:11 | a1 | comments.reaction-add | reacted 🫡 to m2 on TLK-1 | TLK-1 |  |
| h11 | 09:12 | owner | comments.comment-ticket-create | made TLK-2 from the comment m1 on TLK-1 | TLK-2 |  |
| h12 | 09:13 | owner | comments.thread-resolve | resolved the thread of m1 on TLK-1 | TLK-1 |  |
| h13 | 09:16 | a1 | comments.thread-reopen | reopened the thread of m1 on TLK-1 | TLK-1 |  |
| h14 | 09:18 | owner | comments.comment-edit | edited m2 on TLK-1 | TLK-1 |  |

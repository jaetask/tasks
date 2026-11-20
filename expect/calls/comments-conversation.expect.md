# comments-conversation

## Input

[comments-conversation.json](comments-conversation.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.actor-create {"name":"Reviewer"} → succeeded; created actor a2
4. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
5. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-1
6. a1 calls tickets.ticket-claim {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
7. a1 calls comments.comment-add {"ticket":"TLK-1","text":"Recording works in the app. Next: recording with the screen locked."} → succeeded; created comment m1
8. owner calls comments.reaction-add {"comment":"m1","emoji":"👍"} → succeeded; updated comment m1
9. owner calls comments.comment-add {"ticket":"TLK-1","text":"Nice. Keep the record button big on the lock screen.","reply_to":"m1"} → succeeded; created comment m2
10. a1 calls comments.reaction-add {"comment":"m2","emoji":"👀"} → succeeded; updated comment m2
11. a1 calls comments.comment-add {"ticket":"TLK-1","text":"Will do.","reply_to":"m2"} → succeeded; created comment m3
12. a1 calls tickets.ticket-review-request {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
13. a1 calls comments.comment-add {"ticket":"TLK-1","text":"Ready for review. Works on the lock screan."} → succeeded; created comment m4
14. a1 calls comments.comment-edit {"comment":"m4","text":"Ready for review. Works on the lock screen."} → succeeded; updated comment m4
15. a2 calls comments.reaction-add {"comment":"m4","emoji":"👍"} → succeeded; updated comment m4
16. a2 calls comments.reaction-add {"comment":"m4","emoji":"👍"} → succeeded
17. owner calls comments.reaction-add {"comment":"m4","emoji":"👍"} → succeeded; updated comment m4
18. owner calls comments.reaction-remove {"comment":"m1","emoji":"👍"} → succeeded; updated comment m1
19. a2 calls comments.conversation-read {"ticket":"TLK-1"} → succeeded:

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
        "actor": "a1",
        "actorName": "Coder",
        "summary": "claimed TLK-1 and moved it to Doing",
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
        "text": "Recording works in the app. Next: recording with the screen locked.",
        "at": "2026-01-01T09:07:00.000Z",
        "editedAt": null,
        "removed": false,
        "reactions": [],
        "replies": [
          {
            "id": "m2",
            "ticket": "TLK-1",
            "replyTo": "m1",
            "author": "owner",
            "authorName": "Sam",
            "text": "Nice. Keep the record button big on the lock screen.",
            "at": "2026-01-01T09:09:00.000Z",
            "editedAt": null,
            "removed": false,
            "reactions": [
              {
                "emoji": "👀",
                "actors": [
                  "a1"
                ]
              }
            ]
          },
          {
            "id": "m3",
            "ticket": "TLK-1",
            "replyTo": "m1",
            "author": "a1",
            "authorName": "Coder",
            "text": "Will do.",
            "at": "2026-01-01T09:11:00.000Z",
            "editedAt": null,
            "removed": false,
            "reactions": []
          }
        ]
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h12",
        "at": "2026-01-01T09:12:00.000Z",
        "actor": "a1",
        "actorName": "Coder",
        "summary": "asked for review of TLK-1; it is in Review",
        "undoable": true
      }
    },
    {
      "type": "comment",
      "comment": {
        "id": "m4",
        "ticket": "TLK-1",
        "replyTo": null,
        "author": "a1",
        "authorName": "Coder",
        "text": "Ready for review. Works on the lock screen.",
        "at": "2026-01-01T09:13:00.000Z",
        "editedAt": "2026-01-01T09:14:00.000Z",
        "removed": false,
        "reactions": [
          {
            "emoji": "👍",
            "actors": [
              "a2",
              "owner"
            ]
          }
        ],
        "replies": []
      }
    }
  ]
}
```


### Actors

| id | name | archived |
| --- | --- | --- |
| owner | Sam |  |
| a1 | Coder |  |
| a2 | Reviewer |  |

### Projects

| id | name | archived | columns |
| --- | --- | --- | --- |
| TLK | Talk |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |

### Labels

None.

### Tickets

| id | title | column | assigned | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | Voice notes on the phone | Review | Coder |  |  | open |

### Comments

| id | ticket | reply to | author | text | reactions |
| --- | --- | --- | --- | --- | --- |
| m1 | TLK-1 |  | Coder | Recording works in the app. Next: recording with the screen locked. |  |
| m2 | TLK-1 | m1 | Sam | Nice. Keep the record button big on the lock screen. | 👀 a1 |
| m3 | TLK-1 | m1 | Coder | Will do. |  |
| m4 | TLK-1 |  | Coder | Ready for review. Works on the lock screen. (edited) | 👍 a2 owner |

### Images

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Coder |  |  |
| h3 | 09:03 | owner | catalog.actor-create | added actor Reviewer |  |  |
| h4 | 09:04 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h5 | 09:05 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes on the phone | TLK-1 |  |
| h6 | 09:06 | a1 | tickets.ticket-claim | claimed TLK-1 and moved it to Doing | TLK-1 |  |
| h7 | 09:07 | a1 | comments.comment-add | commented on TLK-1 | TLK-1 |  |
| h8 | 09:08 | owner | comments.reaction-add | reacted 👍 to m1 on TLK-1 | TLK-1 |  |
| h9 | 09:09 | owner | comments.comment-add | replied to m1 on TLK-1 | TLK-1 |  |
| h10 | 09:10 | a1 | comments.reaction-add | reacted 👀 to m2 on TLK-1 | TLK-1 |  |
| h11 | 09:11 | a1 | comments.comment-add | replied to m1 on TLK-1 | TLK-1 |  |
| h12 | 09:12 | a1 | tickets.ticket-review-request | asked for review of TLK-1; it is in Review | TLK-1 |  |
| h13 | 09:13 | a1 | comments.comment-add | commented on TLK-1 | TLK-1 |  |
| h14 | 09:14 | a1 | comments.comment-edit | edited m4 on TLK-1 | TLK-1 |  |
| h15 | 09:15 | a2 | comments.reaction-add | reacted 👍 to m4 on TLK-1 | TLK-1 |  |
| h16 | 09:17 | owner | comments.reaction-add | reacted 👍 to m4 on TLK-1 | TLK-1 |  |
| h17 | 09:18 | owner | comments.reaction-remove | took back 👍 from m1 on TLK-1 | TLK-1 |  |

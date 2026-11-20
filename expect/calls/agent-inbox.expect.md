# agent-inbox

## Input

[agent-inbox.json](agent-inbox.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.actor-create {"name":"Reviewer"} → succeeded; created actor a2
4. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
5. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-1
6. a1 calls tickets.ticket-claim {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
7. a1 calls comments.comment-add {"ticket":"TLK-1","text":"Recording works in the app."} → succeeded; created comment m1
8. owner calls comments.comment-add {"ticket":"TLK-1","text":"Keep the record button big.","reply_to":"m1"} → succeeded; created comment m2
9. owner calls comments.comment-add {"ticket":"TLK-1","text":"Also check it on a small phone."} → succeeded; created comment m3
10. a2 calls comments.comment-add {"ticket":"TLK-1","text":"I can review this when it is ready.","reply_to":"m1"} → succeeded; created comment m4
11. a1 calls comments.comment-add {"ticket":"TLK-1","text":"Thanks, will ask.","reply_to":"m4"} → succeeded; created comment m5
12. a1 calls input.input-request {"ticket":"TLK-1","question":"Keep recordings after sending?"} → succeeded; created input-request q1
13. owner calls input.input-resolve {"request":"q1","answer":"For 30 days."} → succeeded; updated input-request q1
14. a1 calls replies.reply-list {"state":"unread"} → succeeded:

```json
[
  {
    "id": "r1",
    "to": "a1",
    "toName": "Coder",
    "from": "owner",
    "fromName": "Sam",
    "kind": "reply",
    "ticket": "TLK-1",
    "about": "m2",
    "text": "Keep the record button big.",
    "at": "2026-01-01T09:08:00.000Z",
    "state": "unread"
  },
  {
    "id": "r2",
    "to": "a1",
    "toName": "Coder",
    "from": "owner",
    "fromName": "Sam",
    "kind": "comment",
    "ticket": "TLK-1",
    "about": "m3",
    "text": "Also check it on a small phone.",
    "at": "2026-01-01T09:09:00.000Z",
    "state": "unread"
  },
  {
    "id": "r3",
    "to": "a1",
    "toName": "Coder",
    "from": "a2",
    "fromName": "Reviewer",
    "kind": "reply",
    "ticket": "TLK-1",
    "about": "m4",
    "text": "I can review this when it is ready.",
    "at": "2026-01-01T09:10:00.000Z",
    "state": "unread"
  },
  {
    "id": "r5",
    "to": "a1",
    "toName": "Coder",
    "from": "owner",
    "fromName": "Sam",
    "kind": "answer",
    "ticket": "TLK-1",
    "about": "q1",
    "text": "For 30 days.",
    "at": "2026-01-01T09:13:00.000Z",
    "state": "unread"
  }
]
```

15. a2 calls replies.reply-list → succeeded:

```json
[
  {
    "id": "r4",
    "to": "a2",
    "toName": "Reviewer",
    "from": "a1",
    "fromName": "Coder",
    "kind": "reply",
    "ticket": "TLK-1",
    "about": "m5",
    "text": "Thanks, will ask.",
    "at": "2026-01-01T09:11:00.000Z",
    "state": "unread"
  }
]
```

16. a2 calls replies.reply-list {"actor":"a1"} → rejected: not-yours: You can read only your own agent inbox.
17. a2 calls replies.reply-acknowledge {"reply":"r1"} → rejected: not-yours: Only the actor it is for, or the owner, can acknowledge it.
18. a1 calls replies.reply-acknowledge {"reply":"r1"} → succeeded; updated reply r1
19. a1 calls replies.reply-acknowledge {"reply":"r1"} → rejected: no-change: r1 is already acknowledged.
20. owner calls replies.reply-acknowledge {"reply":"r2"} → succeeded; updated reply r2
21. owner calls replies.reply-list {"actor":"a1","state":"unread"} → succeeded:

```json
[
  {
    "id": "r3",
    "to": "a1",
    "toName": "Coder",
    "from": "a2",
    "fromName": "Reviewer",
    "kind": "reply",
    "ticket": "TLK-1",
    "about": "m4",
    "text": "I can review this when it is ready.",
    "at": "2026-01-01T09:10:00.000Z",
    "state": "unread"
  },
  {
    "id": "r5",
    "to": "a1",
    "toName": "Coder",
    "from": "owner",
    "fromName": "Sam",
    "kind": "answer",
    "ticket": "TLK-1",
    "about": "q1",
    "text": "For 30 days.",
    "at": "2026-01-01T09:13:00.000Z",
    "state": "unread"
  }
]
```

22. owner calls replies.reply-list → succeeded:

```json
[
  {
    "id": "r1",
    "to": "a1",
    "toName": "Coder",
    "from": "owner",
    "fromName": "Sam",
    "kind": "reply",
    "ticket": "TLK-1",
    "about": "m2",
    "text": "Keep the record button big.",
    "at": "2026-01-01T09:08:00.000Z",
    "state": "acknowledged"
  },
  {
    "id": "r2",
    "to": "a1",
    "toName": "Coder",
    "from": "owner",
    "fromName": "Sam",
    "kind": "comment",
    "ticket": "TLK-1",
    "about": "m3",
    "text": "Also check it on a small phone.",
    "at": "2026-01-01T09:09:00.000Z",
    "state": "acknowledged"
  },
  {
    "id": "r3",
    "to": "a1",
    "toName": "Coder",
    "from": "a2",
    "fromName": "Reviewer",
    "kind": "reply",
    "ticket": "TLK-1",
    "about": "m4",
    "text": "I can review this when it is ready.",
    "at": "2026-01-01T09:10:00.000Z",
    "state": "unread"
  },
  {
    "id": "r4",
    "to": "a2",
    "toName": "Reviewer",
    "from": "a1",
    "fromName": "Coder",
    "kind": "reply",
    "ticket": "TLK-1",
    "about": "m5",
    "text": "Thanks, will ask.",
    "at": "2026-01-01T09:11:00.000Z",
    "state": "unread"
  },
  {
    "id": "r5",
    "to": "a1",
    "toName": "Coder",
    "from": "owner",
    "fromName": "Sam",
    "kind": "answer",
    "ticket": "TLK-1",
    "about": "q1",
    "text": "For 30 days.",
    "at": "2026-01-01T09:13:00.000Z",
    "state": "unread"
  }
]
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
| TLK-1 | Voice notes on the phone |  | Doing | Coder |  |  |  | open |

### Comments

| id | ticket | reply to | author | text | reactions |
| --- | --- | --- | --- | --- | --- |
| m1 | TLK-1 |  | Coder | Recording works in the app. |  |
| m2 | TLK-1 | m1 | Sam | Keep the record button big. |  |
| m4 | TLK-1 | m1 | Reviewer | I can review this when it is ready. |  |
| m5 | TLK-1 | m1 | Coder | Thanks, will ask. |  |
| m3 | TLK-1 |  | Sam | Also check it on a small phone. |  |

### Images

None.

### Input requests

| id | ticket | asked by | question | state | answer |
| --- | --- | --- | --- | --- | --- |
| q1 | TLK-1 | Coder | Keep recordings after sending? | resolved | For 30 days. |

### Ticket steps

None.

### Agent inboxes

| id | for | from | kind | ticket | about | text | state |
| --- | --- | --- | --- | --- | --- | --- | --- |
| r1 | Coder | Sam | reply | TLK-1 | m2 | Keep the record button big. | acknowledged |
| r2 | Coder | Sam | comment | TLK-1 | m3 | Also check it on a small phone. | acknowledged |
| r3 | Coder | Reviewer | reply | TLK-1 | m4 | I can review this when it is ready. | unread |
| r4 | Reviewer | Coder | reply | TLK-1 | m5 | Thanks, will ask. | unread |
| r5 | Coder | Sam | answer | TLK-1 | q1 | For 30 days. | unread |

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
| h8 | 09:08 | owner | comments.comment-add | replied to m1 on TLK-1 | TLK-1 |  |
| h9 | 09:09 | owner | comments.comment-add | commented on TLK-1 | TLK-1 |  |
| h10 | 09:10 | a2 | comments.comment-add | replied to m1 on TLK-1 | TLK-1 |  |
| h11 | 09:11 | a1 | comments.comment-add | replied to m1 on TLK-1 | TLK-1 |  |
| h12 | 09:12 | a1 | input.input-request | asked the owner on TLK-1: Keep recordings after sending? | TLK-1 |  |
| h13 | 09:13 | owner | input.input-resolve | answered q1 on TLK-1: For 30 days. | TLK-1 |  |
| h14 | 09:18 | a1 | replies.reply-acknowledge | acknowledged r1 on TLK-1 |  |  |
| h15 | 09:20 | owner | replies.reply-acknowledge | acknowledged r2 on TLK-1 |  |  |

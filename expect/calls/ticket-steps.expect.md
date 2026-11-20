# ticket-steps

## Input

[ticket-steps.json](ticket-steps.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
4. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-1
5. owner calls steps.ticket-step-add {"ticket":"TLK-1","title":"Record from the lock screen"} → succeeded; created ticket-step t1
6. a1 calls steps.ticket-step-add {"ticket":"TLK-1","title":"Attach the note to a chat"} → succeeded; created ticket-step t2
7. a1 calls steps.ticket-step-add {"ticket":"TLK-1","title":"Test on a slow network"} → succeeded; created ticket-step t3
8. a1 calls steps.ticket-step-check {"step":"t1","note":"Recorded 30 seconds with the screen locked; the file plays back."} → succeeded; updated ticket-step t1
9. a1 calls steps.ticket-step-check {"step":"t1"} → rejected: no-change: Record from the lock screen is already done.
10. a1 calls steps.ticket-step-note {"step":"t2","text":"Blocked on the upload size limit."} → succeeded; updated ticket-step t2
11. owner calls steps.ticket-step-rename {"step":"t3","title":"Test on a slow connection"} → succeeded; updated ticket-step t3
12. owner calls steps.ticket-step-move {"step":"t3","before":"t1"} → succeeded; updated ticket-step t3
13. owner calls steps.ticket-step-uncheck {"step":"t1"} → succeeded; updated ticket-step t1
14. owner calls steps.ticket-step-remove {"step":"t2"} → succeeded; deleted ticket-step t2
15. owner calls history.change-undo {"change":"h11"} → rejected: changed-since: Something h11 changed has changed again since. Undo the later change first.
16. owner calls steps.ticket-step-check {"step":"t9"} → rejected: unknown-step: No ticket step has id t9.
17. owner calls steps.ticket-step-add {"ticket":"TLK-9","title":"Nowhere"} → rejected: unknown-ticket: No ticket has id TLK-9.
18. owner calls tickets.ticket-archive {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
19. owner calls steps.ticket-step-add {"ticket":"TLK-1","title":"Too late"} → rejected: not-open: TLK-1 is archived. The owner can restore it.
20. owner calls steps.ticket-step-list {"ticket":"TLK-1"} → succeeded:

```json
[
  {
    "id": "t3",
    "ticket": "TLK-1",
    "title": "Test on a slow connection",
    "done": false,
    "notes": []
  },
  {
    "id": "t1",
    "ticket": "TLK-1",
    "title": "Record from the lock screen",
    "done": false,
    "notes": [
      {
        "id": "v1",
        "text": "Recorded 30 seconds with the screen locked; the file plays back.",
        "at": "2026-01-01T09:08:00.000Z",
        "by": "a1",
        "byName": "Coder"
      }
    ]
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
| TLK-1 | Voice notes on the phone |  | To do |  |  |  |  | archived |

### Comments

None.

### Images

None.

### Input requests

None.

### Ticket steps

| id | ticket | title | done | notes |
| --- | --- | --- | --- | --- |
| t3 | TLK-1 | Test on a slow connection |  |  |
| t1 | TLK-1 | Record from the lock screen |  | Coder: Recorded 30 seconds with the screen locked; the file plays back. |

### Agent inboxes

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Coder |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h4 | 09:04 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes on the phone | TLK-1 |  |
| h5 | 09:05 | owner | steps.ticket-step-add | added the step "Record from the lock screen" to TLK-1 | TLK-1 |  |
| h6 | 09:06 | a1 | steps.ticket-step-add | added the step "Attach the note to a chat" to TLK-1 | TLK-1 |  |
| h7 | 09:07 | a1 | steps.ticket-step-add | added the step "Test on a slow network" to TLK-1 | TLK-1 |  |
| h8 | 09:08 | a1 | steps.ticket-step-check | ticked the step "Record from the lock screen" on TLK-1 | TLK-1 |  |
| h9 | 09:10 | a1 | steps.ticket-step-note | left a note on the step "Attach the note to a chat" on TLK-1 | TLK-1 |  |
| h10 | 09:11 | owner | steps.ticket-step-rename | renamed the step "Test on a slow network" to "Test on a slow connection" on TLK-1 | TLK-1 |  |
| h11 | 09:12 | owner | steps.ticket-step-move | moved the step "Test on a slow connection" on TLK-1 | TLK-1 |  |
| h12 | 09:13 | owner | steps.ticket-step-uncheck | unticked the step "Record from the lock screen" on TLK-1 | TLK-1 |  |
| h13 | 09:14 | owner | steps.ticket-step-remove | removed the step "Attach the note to a chat" from TLK-1 | TLK-1 |  |
| h14 | 09:18 | owner | tickets.ticket-archive | archived TLK-1 | TLK-1 |  |

# comments-remove-and-refusals

## Input

[comments-remove-and-refusals.json](comments-remove-and-refusals.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.actor-create {"name":"Reviewer"} → succeeded; created actor a2
4. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
5. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-1
6. owner calls tickets.ticket-create {"project":"TLK","title":"Second"} → succeeded; created ticket TLK-2
7. a1 calls comments.comment-add {"ticket":"TLK-1","text":"First thought."} → succeeded; created comment m1
8. a2 calls comments.comment-add {"ticket":"TLK-1","text":"A reply.","reply_to":"m1"} → succeeded; created comment m2
9. a2 calls comments.comment-edit {"comment":"m1","text":"Not mine."} → refused: not-yours: Only its author can edit a comment.
10. a2 calls comments.comment-remove {"comment":"m1"} → refused: not-yours: Only its author or the owner can remove a comment.
11. owner calls comments.comment-remove {"comment":"m1"} → succeeded; deleted comment m1
12. a1 calls comments.comment-edit {"comment":"m1","text":"Too late."} → refused: removed: Comment m1 was removed.
13. a1 calls comments.reaction-add {"comment":"m1","emoji":"👍"} → refused: removed: Comment m1 was removed.
14. owner calls history.change-undo {"change":"h9"} → succeeded; updated change h9
15. a1 calls comments.comment-add {"ticket":"TLK-2","text":"Wrong thread.","reply_to":"m1"} → refused: other-ticket: Comment m1 is not on TLK-2.
16. a1 calls comments.comment-add {"ticket":"TLK-9","text":"No such ticket."} → refused: unknown-ticket: No ticket has id TLK-9.
17. a1 calls comments.comment-add {"ticket":"TLK-1","text":"  "} → rejected: invalid-input: text: Too small: expected string to have >=1 characters
18. a1 calls tickets.ticket-archive {"ticket":"TLK-1"} → succeeded; updated ticket TLK-1
19. a1 calls comments.comment-add {"ticket":"TLK-1","text":"Archived: the work moved to TLK-2."} → succeeded; created comment m3
20. owner calls tickets.ticket-delete {"ticket":"TLK-1"} → succeeded; deleted ticket TLK-1
21. owner calls comments.conversation-read {"ticket":"TLK-1"} → refused: unknown-ticket: No ticket has id TLK-1.
22. a1 calls comments.comment-add {"ticket":"TLK-2","text":"Picking this up next."} → succeeded; created comment m4

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
| TLK-2 | Second | To do |  |  |  | open |

### Comments

| id | ticket | reply to | author | text | reactions |
| --- | --- | --- | --- | --- | --- |
| m4 | TLK-2 |  | Coder | Picking this up next. |  |

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
| h6 | 09:06 | owner | tickets.ticket-create | created TLK-2 in To do: Second | TLK-2 |  |
| h7 | 09:07 | a1 | comments.comment-add | commented on TLK-1 | TLK-1 |  |
| h8 | 09:08 | a2 | comments.comment-add | replied to m1 on TLK-1 | TLK-1 |  |
| h9 | 09:11 | owner | comments.comment-remove | removed m1 on TLK-1 | TLK-1 | h10 |
| h10 | 09:14 | owner | history.change-undo | undid: removed m1 on TLK-1 | TLK-1 |  |
| h11 | 09:18 | a1 | tickets.ticket-archive | archived TLK-1 | TLK-1 |  |
| h12 | 09:19 | a1 | comments.comment-add | commented on TLK-1 | TLK-1 |  |
| h13 | 09:20 | owner | tickets.ticket-delete | deleted TLK-1 for good: Voice notes on the phone | TLK-1 |  |
| h14 | 09:22 | a1 | comments.comment-add | commented on TLK-2 | TLK-2 |  |

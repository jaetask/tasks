# tickets-refusals

## Input

[tickets-refusals.json](tickets-refusals.json)

## Output

### Steps

1. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
2. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
3. owner calls tickets.ticket-create {"project":"TLK","title":"One"} → succeeded; created ticket TLK-1
4. ghost calls tickets.ticket-claim {"ticket":"TLK-1"} → rejected: unknown-actor: ghost is not an actor that may act.
5. owner calls catalog.actor-archive {"actor":"a1"} → succeeded; updated actor a1
6. a1 calls tickets.ticket-claim {"ticket":"TLK-1"} → rejected: unknown-actor: a1 is not an actor that may act.
7. owner calls tickets.ticket-assign {"ticket":"TLK-1","actor":"a1"} → rejected: archived-actor: a1 is archived.
8. owner calls tickets.ticket-assign {"ticket":"TLK-1","actor":"a9"} → rejected: unknown-actor: No actor has id a9.
9. owner calls tickets.ticket-move {"ticket":"TLK-9","column":"c1"} → rejected: unknown-ticket: No ticket has id TLK-9.
10. owner calls tickets.ticket-create {"project":"TLK","title":""} → rejected: invalid-input: title: Too small: expected string to have >=1 characters
11. owner calls tickets.ticket-create {"project":"TLK","title":"Bad label","labels":["l9"]} → rejected: unknown-label: No label has id l9.
12. owner calls tickets.ticket-create {"project":"NOPE","title":"x"} → rejected: unknown-project: No project has id NOPE.
13. owner calls tickets.ticket-label-add {"ticket":"TLK-1","label":"l9"} → rejected: unknown-label: No label has id l9.
14. owner calls tickets.ticket-block {"ticket":"TLK-1","note":""} → rejected: invalid-input: note: Too small: expected string to have >=1 characters
15. owner calls catalog.project-archive {"project":"TLK"} → succeeded; updated project TLK
16. owner calls tickets.ticket-create {"project":"TLK","title":"Late"} → rejected: archived-project: Project TLK is archived.

### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner |  |  |  |
| a1 | Coder |  | yes |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal | yes | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |

### Labels

None.

### Locations

None.

### Features

None.

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | One |  | To do |  |  |  |  | open |

### Comments

None.

### Images

None.

### Input requests

None.

### Agent inboxes

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-create | added actor Coder |  |  |
| h2 | 09:02 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h3 | 09:03 | owner | tickets.ticket-create | created TLK-1 in To do: One | TLK-1 |  |
| h4 | 09:05 | owner | catalog.actor-archive | archived actor Coder |  |  |
| h5 | 09:15 | owner | catalog.project-archive | archived project Talk |  |  |

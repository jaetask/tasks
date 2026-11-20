# catalog-refusals

## Input

[catalog-refusals.json](catalog-refusals.json)

## Output

### Steps

1. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
2. owner calls catalog.project-create {"name":"Talk two","prefix":"TLK"} → refused: prefix-taken: A project already has the prefix TLK.
3. owner calls catalog.project-create {"name":"Lower","prefix":"tlk"} → rejected: invalid-input: prefix: a prefix is 2 to 6 capital letters, like TLK
4. owner calls catalog.project-create {"name":"  ","prefix":"EMP"} → rejected: invalid-input: name: Too small: expected string to have >=1 characters
5. owner calls catalog.project-edit {"project":"NOPE","name":"x"} → refused: unknown-project: No project has id NOPE.
6. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
7. owner calls catalog.actor-create {"name":"coder"} → refused: name-taken: An actor is already named coder.
8. owner calls catalog.actor-archive {"actor":"owner"} → refused: owner: The owner cannot be archived.
9. owner calls catalog.label-create {"name":"bug","colour":"pink"} → rejected: invalid-input: colour: Invalid option: expected one of "teal"|"plum"|"red"|"amber"|"green"|"grey"
10. owner calls catalog.label-create {"name":"bug","colour":"red"} → succeeded; created label l1
11. owner calls catalog.label-create {"name":"Bug","colour":"red"} → refused: name-taken: A label is already named Bug.
12. owner calls catalog.column-add {"project":"TLK","name":"Doing","kind":"doing"} → refused: name-taken: This board already has a column named Doing.
13. owner calls catalog.column-add {"project":"TLK","name":"Later","kind":"someday"} → rejected: invalid-input: kind: Invalid option: expected one of "todo"|"doing"|"waiting"|"done"
14. owner calls catalog.project-edit {"project":"TLK","name":"Changed"} → succeeded; created project TLK

### Actors

| id | name | archived |
| --- | --- | --- |
| owner |  |  |
| a1 | Coder |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |

### Labels

| id | name | colour |
| --- | --- | --- |
| l1 | bug | red |

### Features

None.

### Tickets

None.

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
| h1 | 09:01 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h2 | 09:06 | owner | catalog.actor-create | added actor Coder |  |  |
| h3 | 09:10 | owner | catalog.label-create | created label bug |  |  |

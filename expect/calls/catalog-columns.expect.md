# catalog-columns

## Input

[catalog-columns.json](catalog-columns.json)

## Output

### Steps

1. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
2. owner calls catalog.column-add {"project":"TLK","name":"Triage","kind":"todo","before":"c1"} → succeeded; created column c5
3. owner calls catalog.column-add {"project":"TLK","name":"Sign-off","kind":"waiting"} → succeeded; created column c6
4. owner calls catalog.column-rename {"column":"c3","name":"Code review"} → succeeded; updated column c3
5. owner calls catalog.column-kind-set {"column":"c6","kind":"done"} → succeeded; updated column c6
6. owner calls catalog.column-move {"column":"c6","before":"c4"} → succeeded; updated column c6
7. owner calls catalog.column-remove {"column":"c5"} → succeeded; deleted column c5
8. owner calls catalog.column-add {"project":"TLK","name":"doing","kind":"doing"} → refused: name-taken: This board already has a column named doing.
9. owner calls catalog.column-move {"column":"c1","before":"c99"} → refused: unknown-column: No column c99 is on this board.
10. owner calls catalog.column-remove {"column":"c99"} → refused: unknown-column: No column has id c99.
11. owner calls catalog.project-create {"name":"Money","prefix":"MNY"} → succeeded; created project MNY
12. owner calls catalog.column-remove {"column":"c7"} → succeeded; deleted column c7
13. owner calls catalog.column-remove {"column":"c8"} → succeeded; deleted column c8
14. owner calls catalog.column-remove {"column":"c9"} → succeeded; deleted column c9
15. owner calls catalog.column-remove {"column":"c10"} → refused: last-column: A board needs at least one column.

### Actors

| id | name | archived |
| --- | --- | --- |
| owner |  |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Code review (waiting) · c6 Sign-off (done) · c4 Done (done) |
| MNY | Money | teal |  | c10 Done (done) |

### Labels

None.

### Tickets

None.

### Comments

None.

### Images

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h2 | 09:02 | owner | catalog.column-add | added column Triage (todo) to TLK |  |  |
| h3 | 09:03 | owner | catalog.column-add | added column Sign-off (waiting) to TLK |  |  |
| h4 | 09:04 | owner | catalog.column-rename | renamed column Review to Code review in TLK |  |  |
| h5 | 09:05 | owner | catalog.column-kind-set | set column Sign-off in TLK to done |  |  |
| h6 | 09:06 | owner | catalog.column-move | moved column Sign-off in TLK |  |  |
| h7 | 09:07 | owner | catalog.column-remove | removed column Triage from TLK; its tickets moved to To do |  |  |
| h8 | 09:11 | owner | catalog.project-create | created project Money (MNY) |  |  |
| h9 | 09:12 | owner | catalog.column-remove | removed column To do from MNY; its tickets moved to Doing |  |  |
| h10 | 09:13 | owner | catalog.column-remove | removed column Doing from MNY; its tickets moved to Review |  |  |
| h11 | 09:14 | owner | catalog.column-remove | removed column Review from MNY; its tickets moved to Done |  |  |

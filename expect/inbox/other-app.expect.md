# other-app

## Input

[other-app.json](other-app.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Sorter"} → succeeded; created actor a1
3. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
4. owner calls inbox.step-add {"name":"Ask the sorter","kind":"app","actor":"a1","actions":["item-category-set"],"config":{"action":"sorter.sort"}} → succeeded; created step s1
5. owner calls inbox.step-add {"name":"Ask nobody","kind":"app","actor":"a1","actions":["item-category-set"],"config":{"action":"nobody.sort"}} → succeeded; created step s2
6. owner calls inbox.item-capture {"text":"Need export to CSV for the Money app pls!!","source":"email"} → succeeded; created item n1
7. owner calls inbox.item-capture {"text":"Short one."} → succeeded; created item n2

### The inbox steps, in order

| id | name | kind | actor | may ask for | runs on | on |
| --- | --- | --- | --- | --- | --- | --- |
| s1 | Ask the sorter | app | a1 | item-category-set | every item | yes |
| s2 | Ask nobody | app | a1 | item-category-set | every item | yes |

### Inbox

| id | title | as captured | state | tags | category | fields | reason | ticket |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| n1 | Need export to CSV for the Money app pls!! |  | received |  | long |  |  |  |
| n2 | Short one. |  | received |  | short |  |  |  |

### Runs

r1 on n1: every step had its turn: the item is received
- Ask the sorter: ran. 42 characters
  - item-category-set {"category":"long"} → done
- Ask nobody: ran. failed: the other App's Action was rejected: No Action is named nobody.sort

r2 on n2: every step had its turn: the item is received
- Ask the sorter: ran. 10 characters
  - item-category-set {"category":"short"} → done
- Ask nobody: ran. failed: the other App's Action was rejected: No Action is named nobody.sort

### Tickets

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Sorter |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h4 | 09:04 | owner | inbox.step-add | added the inbox step Ask the sorter |  |  |
| h5 | 09:05 | owner | inbox.step-add | added the inbox step Ask nobody |  |  |
| h6 | 09:06 | owner | inbox.item-capture | captured n1: Need export to CSV for the Money app pls!! |  |  |
| h7 | 09:06 | a1 | inbox.item-category-set | sorted n1 into long |  |  |
| h8 | 09:07 | owner | inbox.item-capture | captured n2: Short one. |  |  |
| h9 | 09:07 | a1 | inbox.item-category-set | sorted n2 into short |  |  |

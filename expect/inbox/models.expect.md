# models

## Input

[models.json](models.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Sorter"} → succeeded; created actor a1
3. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
4. owner calls inbox.step-add {"name":"Spam classifier","kind":"classifier","actor":"a1","actions":["item-reject","item-tag"],"config":{"url":"$MODEL","model":"tiny-classifier","labels":{"spam":[{"action":"item-reject","input":{"reason":"classified as spam"}}],"ok":[{"action":"item-tag","input":{"tags":["checked"]}}]}}} → succeeded; created step s1
5. owner calls inbox.step-add {"name":"Local sorter","kind":"local-model","actor":"a1","actions":["item-tag","item-category-set"],"config":{"url":"$MODEL","model":"local-llm","instructions":"Tag crash reports as bug."}} → succeeded; created step s2
6. owner calls inbox.step-add {"name":"Hosted sorter","kind":"hosted-model","actor":"a1","actions":["item-tag"],"config":{"url":"$MODEL","model":"hosted-llm","key_env":"EXPECT_MODEL_KEY"}} → succeeded; created step s3
7. owner calls inbox.step-add {"name":"Hosted, no key","kind":"hosted-model","actor":"a1","actions":["item-tag"],"config":{"url":"$MODEL","model":"hosted-llm","key_env":"NOT_SET"}} → succeeded; created step s4
8. owner calls inbox.step-add {"name":"No address","kind":"local-model","actor":"a1","actions":["item-tag"],"config":{"model":"local-llm"}} → succeeded; created step s5
9. owner calls inbox.item-capture {"text":"the board crashes when I drag a ticket to review"} → succeeded; created item n1
10. owner calls inbox.item-capture {"text":"CHEAP WATCHES click here now","source":"email"} → succeeded; created item n2

### The inbox steps, in order

| id | name | kind | actor | may ask for | runs on | on |
| --- | --- | --- | --- | --- | --- | --- |
| s1 | Spam classifier | classifier | a1 | item-reject, item-tag | every item | yes |
| s2 | Local sorter | local-model | a1 | item-tag, item-category-set | every item | yes |
| s3 | Hosted sorter | hosted-model | a1 | item-tag | every item | yes |
| s4 | Hosted, no key | hosted-model | a1 | item-tag | every item | yes |
| s5 | No address | local-model | a1 | item-tag | every item | yes |

### Inbox

| id | title | as captured | state | tags | category | fields | reason | ticket |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| n1 | the board crashes when I drag a ticket to review |  | received | checked, bug |  |  |  |  |
| n2 | CHEAP WATCHES click here now |  | rejected |  |  |  | classified as spam |  |

### Runs

r1 on n1: every step had its turn: the item is received
- Spam classifier: ran. classified as ok
  - item-tag {"tags":["checked"]} → done
- Local sorter: ran. local-llm, with no key, offered item-tag, item-category-set
  - item-tag {"tags":["bug"]} → done
- Hosted sorter: ran. hosted-llm, with a key, offered item-tag
  - item-tag {"tags":["bug"]} → done
- Hosted, no key: ran. failed: the step's key_env does not name an environment variable with a key
- No address: ran. failed: the step's url is not set

r2 on n2: Spam classifier ended the run: the item was rejected
- Spam classifier: ran. classified as spam
  - item-reject {"reason":"classified as spam"} → done

### Tickets

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Sorter |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h4 | 09:04 | owner | inbox.step-add | added the inbox step Spam classifier |  |  |
| h5 | 09:05 | owner | inbox.step-add | added the inbox step Local sorter |  |  |
| h6 | 09:06 | owner | inbox.step-add | added the inbox step Hosted sorter |  |  |
| h7 | 09:07 | owner | inbox.step-add | added the inbox step Hosted, no key |  |  |
| h8 | 09:08 | owner | inbox.step-add | added the inbox step No address |  |  |
| h9 | 09:09 | owner | inbox.item-capture | captured n1: the board crashes when I drag a ticket to review |  |  |
| h10 | 09:09 | a1 | inbox.item-tag | tagged n1 checked |  |  |
| h11 | 09:09 | a1 | inbox.item-tag | tagged n1 bug |  |  |
| h12 | 09:10 | owner | inbox.item-capture | captured n2: CHEAP WATCHES click here now |  |  |
| h13 | 09:10 | a1 | inbox.item-reject | rejected n2: classified as spam |  |  |

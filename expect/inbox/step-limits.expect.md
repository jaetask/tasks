# step-limits

## Input

[step-limits.json](step-limits.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Sorter"} → succeeded; created actor a1
3. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
4. owner calls inbox.step-add {"name":"Greedy","kind":"script","actor":"a1","actions":["item-tag"],"config":{"file":"greedy.mjs"}} → succeeded; created step s1
5. owner calls inbox.step-add {"name":"Broken","kind":"script","actor":"a1","actions":["item-tag"],"config":{"file":"broken.mjs"}} → succeeded; created step s2
6. owner calls inbox.step-add {"name":"Outside","kind":"script","actor":"a1","actions":["item-tag"],"config":{"file":"../../calls.ts"}} → succeeded; created step s3
7. owner calls inbox.step-add {"name":"Switched off","kind":"script","actor":"a1","actions":["item-reject"],"config":{"file":"spam-check.mjs"},"on":false} → succeeded; created step s4
8. owner calls inbox.step-add {"name":"Bugs to tickets","kind":"script","actor":"a1","actions":["item-promote"],"config":{"file":"promote-bugs.mjs"},"condition":{"word":"crash"}} → succeeded; created step s5
9. owner calls inbox.step-add {"name":"Never reached","kind":"script","actor":"a1","actions":["item-tag"],"config":{"file":"greedy.mjs"}} → succeeded; created step s6
10. owner calls inbox.item-capture {"project":"TLK","text":"A calm first item."} → succeeded; created item n1
11. owner calls inbox.item-capture {"project":"TLK","text":"the board crashes when I drag a ticket to review"} → succeeded; created item n2
12. owner calls inbox.step-add {"name":"As the owner","kind":"script","actor":"owner","actions":["item-tag"],"config":{"file":"sort.mjs"}} → refused: owner: A step cannot act as the owner. Pick another actor.
13. owner calls inbox.step-add {"name":"Board access","kind":"script","actor":"a1","actions":["ticket-delete"],"config":{}} → rejected: invalid-input: actions.0: Invalid option: expected one of "item-tag"|"item-untag"|"item-category-set"|"item-fields-set"|"item-fields-clear"|"item-edit"|"item-accept"|"item-reject"|"item-dismiss"|"item-promote"|"item-link"
14. a1 calls inbox.step-add {"name":"Mine","kind":"script","actor":"a1","actions":["item-tag"],"config":{"file":"sort.mjs"}} → rejected: not-allowed: a1 may not run inbox.step-add
15. a1 calls inbox.step-remove {"step":"s1"} → rejected: not-allowed: a1 may not run inbox.step-remove
16. owner calls inbox.step-remove {"step":"s2"} → succeeded; deleted step s2
17. owner calls inbox.step-remove {"step":"s3"} → succeeded; deleted step s3
18. owner calls inbox.step-edit {"step":"s4","on":true,"name":"Spam check","actions":["item-reject","item-tag"]} → succeeded; updated step s4
19. owner calls inbox.step-move {"step":"s4","before":"s1"} → succeeded; updated step s4
20. owner calls inbox.item-run {"item":"n1"} → succeeded; updated item-run n1
21. owner calls inbox.pipeline-read → succeeded:

```json
[
  {
    "id": "s4",
    "name": "Spam check",
    "kind": "script",
    "actor": "a1",
    "actions": [
      "item-reject",
      "item-tag"
    ],
    "condition": null,
    "config": {
      "file": "spam-check.mjs"
    },
    "on": true
  },
  {
    "id": "s1",
    "name": "Greedy",
    "kind": "script",
    "actor": "a1",
    "actions": [
      "item-tag"
    ],
    "condition": null,
    "config": {
      "file": "greedy.mjs"
    },
    "on": true
  },
  {
    "id": "s5",
    "name": "Bugs to tickets",
    "kind": "script",
    "actor": "a1",
    "actions": [
      "item-promote"
    ],
    "condition": {
      "word": "crash"
    },
    "config": {
      "file": "promote-bugs.mjs"
    },
    "on": true
  },
  {
    "id": "s6",
    "name": "Never reached",
    "kind": "script",
    "actor": "a1",
    "actions": [
      "item-tag"
    ],
    "condition": null,
    "config": {
      "file": "greedy.mjs"
    },
    "on": true
  }
]
```


### The inbox steps, in order

| id | name | kind | actor | may ask for | runs on | on |
| --- | --- | --- | --- | --- | --- | --- |
| s4 | Spam check | script | a1 | item-reject, item-tag | every item | yes |
| s1 | Greedy | script | a1 | item-tag | every item | yes |
| s5 | Bugs to tickets | script | a1 | item-promote | {"word":"crash"} | yes |
| s6 | Never reached | script | a1 | item-tag | every item | yes |

### Inbox

| id | project | title | as captured | state | tags | category | fields | reason | ticket |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| n1 | TLK | A calm first item. |  | received | seen, reached another item, request, unsorted |  |  |  |  |
| n2 | TLK | the board crashes when I drag a ticket to review |  | promoted | seen, reached another item |  |  |  | TLK-1 |

### Runs

r1 on n1: every step had its turn: the item is received
- Greedy: ran. was given item-tag
  - item-tag {"tags":["seen"]} → done
  - item-reject {"reason":"I would rather not"} → refused: the step was not given this Action
  - ticket-delete {"ticket":"TLK-1"} → refused: the step was not given this Action
  - item-tag {"item":"n1","tags":["reached another item"]} → done
- Broken: ran. failed: the script has a bug
- Outside: ran. failed: the step's file is outside the steps folder
- Switched off: did not run. skipped: switched off
- Bugs to tickets: did not run. skipped: only runs on items with the word crash
- Never reached: ran. was given item-tag
  - item-tag {"tags":["seen"]} → done
  - item-reject {"reason":"I would rather not"} → refused: the step was not given this Action
  - ticket-delete {"ticket":"TLK-1"} → refused: the step was not given this Action
  - item-tag {"item":"n1","tags":["reached another item"]} → done

r3 on n1: every step had its turn: the item is received
- Spam check: ran. not spam; a request
  - item-tag {"tags":["request","unsorted"]} → done
- Greedy: ran. was given item-tag
  - item-tag {"tags":["seen"]} → done
  - item-reject {"reason":"I would rather not"} → refused: the step was not given this Action
  - ticket-delete {"ticket":"TLK-1"} → refused: the step was not given this Action
  - item-tag {"item":"n1","tags":["reached another item"]} → done
- Bugs to tickets: did not run. skipped: only runs on items with the word crash
- Never reached: ran. was given item-tag
  - item-tag {"tags":["seen"]} → done
  - item-reject {"reason":"I would rather not"} → refused: the step was not given this Action
  - ticket-delete {"ticket":"TLK-1"} → refused: the step was not given this Action
  - item-tag {"item":"n1","tags":["reached another item"]} → done

r2 on n2: Bugs to tickets ended the run: the item was promoted
- Greedy: ran. was given item-tag
  - item-tag {"tags":["seen"]} → done
  - item-reject {"reason":"I would rather not"} → refused: the step was not given this Action
  - ticket-delete {"ticket":"TLK-1"} → refused: the step was not given this Action
  - item-tag {"item":"n1","tags":["reached another item"]} → done
- Broken: ran. failed: the script has a bug
- Outside: ran. failed: the step's file is outside the steps folder
- Switched off: did not run. skipped: switched off
- Bugs to tickets: ran. bugs become tickets
  - item-promote {"backlog":false} → done

### Tickets

| id | title | feature | column | assigned | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | the board crashes when I drag a ticket to review |  | To do |  |  |  | open |

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Sorter |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h4 | 09:04 | owner | inbox.step-add | added the inbox step Greedy |  |  |
| h5 | 09:05 | owner | inbox.step-add | added the inbox step Broken |  |  |
| h6 | 09:06 | owner | inbox.step-add | added the inbox step Outside |  |  |
| h7 | 09:07 | owner | inbox.step-add | added the inbox step Switched off |  |  |
| h8 | 09:08 | owner | inbox.step-add | added the inbox step Bugs to tickets |  |  |
| h9 | 09:09 | owner | inbox.step-add | added the inbox step Never reached |  |  |
| h10 | 09:10 | owner | inbox.item-capture | captured n1 for TLK: A calm first item. |  |  |
| h11 | 09:10 | a1 | inbox.item-tag | tagged n1 seen |  |  |
| h12 | 09:10 | a1 | inbox.item-tag | tagged n1 reached another item |  |  |
| h13 | 09:11 | owner | inbox.item-capture | captured n2 for TLK: the board crashes when I drag a ticket to review |  |  |
| h14 | 09:11 | a1 | inbox.item-tag | tagged n2 seen |  |  |
| h15 | 09:11 | a1 | inbox.item-tag | tagged n2 reached another item |  |  |
| h16 | 09:11 | a1 | inbox.item-promote | turned n2 into TLK-1: the board crashes when I drag a ticket to review | TLK-1 |  |
| h17 | 09:16 | owner | inbox.step-remove | removed the inbox step Broken |  |  |
| h18 | 09:17 | owner | inbox.step-remove | removed the inbox step Outside |  |  |
| h19 | 09:18 | owner | inbox.step-edit | changed the inbox step Spam check |  |  |
| h20 | 09:19 | owner | inbox.step-move | moved the inbox step Spam check |  |  |
| h21 | 09:20 | a1 | inbox.item-tag | tagged n1 request, unsorted |  |  |

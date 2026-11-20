# three-steps

## Input

[three-steps.json](three-steps.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Sorter"} → succeeded; created actor a1
3. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
4. owner calls inbox.step-add {"name":"Spam check","kind":"script","actor":"a1","actions":["item-reject","item-tag"],"config":{"file":"spam-check.mjs"}} → succeeded; created step s1
5. owner calls inbox.step-add {"name":"Pull out details","kind":"script","actor":"a1","actions":["item-untag","item-edit","item-fields-set"],"config":{"file":"details.mjs"}} → succeeded; created step s2
6. owner calls inbox.step-add {"name":"Sort it","kind":"script","actor":"a1","actions":["item-category-set"],"config":{"file":"sort.mjs"},"condition":{"tag":"request"}} → succeeded; created step s3
7. owner calls inbox.item-capture {"text":"Need export to CSV for the Money app pls!!","source":"email"} → succeeded; created item n1
8. owner calls inbox.item-capture {"text":"the board crashes when I drag a ticket to review"} → succeeded; created item n2
9. owner calls inbox.item-capture {"text":"CHEAP WATCHES click here now","source":"email"} → succeeded; created item n3
10. owner calls inbox.item-read {"item":"n1"} → succeeded:

```json
{
  "item": {
    "id": "n1",
    "title": "Export to CSV in Money",
    "text": "Need export to CSV for the Money app pls!!",
    "original": {
      "title": "Need export to CSV for the Money app pls!!",
      "text": "Need export to CSV for the Money app pls!!"
    },
    "source": "email",
    "state": "received",
    "tags": [
      "request"
    ],
    "category": "export",
    "fields": {
      "app": "Money",
      "format": "CSV"
    },
    "reason": null,
    "ticket": null,
    "at": "2026-01-01T09:07:00.000Z",
    "by": "owner"
  },
  "runs": [
    {
      "id": "r1",
      "item": "n1",
      "at": "2026-01-01T09:07:00.000Z",
      "steps": [
        {
          "step": "s1",
          "name": "Spam check",
          "ran": true,
          "reason": "not spam; a request",
          "calls": [
            {
              "action": "item-tag",
              "input": {
                "tags": [
                  "request",
                  "unsorted"
                ]
              },
              "outcome": "done"
            }
          ]
        },
        {
          "step": "s2",
          "name": "Pull out details",
          "ran": true,
          "reason": "saw 1 earlier step; tags were request, unsorted",
          "calls": [
            {
              "action": "item-untag",
              "input": {
                "tags": [
                  "unsorted"
                ]
              },
              "outcome": "done"
            },
            {
              "action": "item-edit",
              "input": {
                "title": "Export to CSV in Money"
              },
              "outcome": "done"
            },
            {
              "action": "item-fields-set",
              "input": {
                "fields": {
                  "app": "Money",
                  "format": "CSV"
                }
              },
              "outcome": "done"
            }
          ]
        },
        {
          "step": "s3",
          "name": "Sort it",
          "ran": true,
          "reason": "fields: app, format",
          "calls": [
            {
              "action": "item-category-set",
              "input": {
                "category": "export"
              },
              "outcome": "done"
            }
          ]
        }
      ],
      "ended": "every step had its turn: the item is received"
    }
  ]
}
```


### The inbox steps, in order

| id | name | kind | actor | may ask for | runs on | on |
| --- | --- | --- | --- | --- | --- | --- |
| s1 | Spam check | script | a1 | item-reject, item-tag | every item | yes |
| s2 | Pull out details | script | a1 | item-untag, item-edit, item-fields-set | every item | yes |
| s3 | Sort it | script | a1 | item-category-set | {"tag":"request"} | yes |

### Inbox

| id | title | as captured | state | tags | category | fields | reason | ticket |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| n1 | Export to CSV in Money | Need export to CSV for the Money app pls!! | received | request | export | app: Money, format: CSV |  |  |
| n2 | the board crashes when I drag a ticket to review |  | received | bug |  |  |  |  |
| n3 | CHEAP WATCHES click here now |  | rejected |  |  |  | looks like spam |  |

### Runs

r1 on n1: every step had its turn: the item is received
- Spam check: ran. not spam; a request
  - item-tag {"tags":["request","unsorted"]} → done
- Pull out details: ran. saw 1 earlier step; tags were request, unsorted
  - item-untag {"tags":["unsorted"]} → done
  - item-edit {"title":"Export to CSV in Money"} → done
  - item-fields-set {"fields":{"app":"Money","format":"CSV"}} → done
- Sort it: ran. fields: app, format
  - item-category-set {"category":"export"} → done

r2 on n2: every step had its turn: the item is received
- Spam check: ran. not spam; a bug
  - item-tag {"tags":["bug","unsorted"]} → done
- Pull out details: ran. saw 1 earlier step; tags were bug, unsorted
  - item-untag {"tags":["unsorted"]} → done
- Sort it: did not run. skipped: only runs on items tagged request

r3 on n3: Spam check ended the run: the item was rejected
- Spam check: ran. spam words
  - item-reject {"reason":"looks like spam"} → done

### Tickets

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Sorter |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h4 | 09:04 | owner | inbox.step-add | added the inbox step Spam check |  |  |
| h5 | 09:05 | owner | inbox.step-add | added the inbox step Pull out details |  |  |
| h6 | 09:06 | owner | inbox.step-add | added the inbox step Sort it |  |  |
| h7 | 09:07 | owner | inbox.item-capture | captured n1: Need export to CSV for the Money app pls!! |  |  |
| h8 | 09:07 | a1 | inbox.item-tag | tagged n1 request, unsorted |  |  |
| h9 | 09:07 | a1 | inbox.item-untag | removed the tags unsorted from n1 |  |  |
| h10 | 09:07 | a1 | inbox.item-edit | edited n1 |  |  |
| h11 | 09:07 | a1 | inbox.item-fields-set | set app, format on n1 |  |  |
| h12 | 09:07 | a1 | inbox.item-category-set | sorted n1 into export |  |  |
| h13 | 09:08 | owner | inbox.item-capture | captured n2: the board crashes when I drag a ticket to review |  |  |
| h14 | 09:08 | a1 | inbox.item-tag | tagged n2 bug, unsorted |  |  |
| h15 | 09:08 | a1 | inbox.item-untag | removed the tags unsorted from n2 |  |  |
| h16 | 09:09 | owner | inbox.item-capture | captured n3: CHEAP WATCHES click here now |  |  |
| h17 | 09:09 | a1 | inbox.item-reject | rejected n3: looks like spam |  |  |

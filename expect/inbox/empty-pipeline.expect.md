# empty-pipeline

## Input

[empty-pipeline.json](empty-pipeline.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Sorter"} → succeeded; created actor a1
3. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
4. owner calls inbox.pipeline-read → succeeded:

```json
[]
```

5. owner calls inbox.item-capture {"project":"TLK","text":"Need export to CSV for the Money app pls!!","source":"email"} → succeeded; created item n1
6. owner calls inbox.item-capture {"project":"TLK","text":"the board crashes when I drag a ticket to review"} → succeeded; created item n2
7. owner calls inbox.item-capture {"project":"TLK","text":"CHEAP WATCHES click here now","source":"email"} → succeeded; created item n3
8. a1 calls inbox.item-capture {"project":"TLK","title":"Dark mode","text":"People keep asking for a dark theme.","source":"agent"} → succeeded; created item n4
9. owner calls inbox.item-tag {"item":"n1","tags":["request","export"]} → succeeded; updated item n1
10. owner calls inbox.item-accept {"item":"n1"} → succeeded; updated item n1
11. owner calls inbox.item-promote {"item":"n2"} → succeeded; updated item n2
12. owner calls inbox.item-reject {"item":"n3","reason":"spam"} → succeeded; updated item n3
13. a1 calls inbox.item-link {"item":"n4","ticket":"TLK-1"} → succeeded; updated item n4
14. owner calls inbox.item-tag {"item":"n3","tags":["late"]} → rejected: ended: n3 was rejected. It is no longer in the inbox.
15. owner calls inbox.item-link {"item":"n1","ticket":"TLK-9"} → rejected: unknown-ticket: No ticket has id TLK-9.
16. owner calls inbox.item-promote {"item":"n1","backlog":false} → succeeded; updated item n1
17. owner calls history.change-undo {"change":"h11"} → succeeded; updated change h11
18. owner calls inbox.item-dismiss {"item":"n3","reason":"nothing to do"} → succeeded; updated item n3
19. owner calls inbox.item-read {"item":"n1"} → succeeded:

```json
{
  "item": {
    "id": "n1",
    "project": "TLK",
    "title": "Need export to CSV for the Money app pls!!",
    "text": "Need export to CSV for the Money app pls!!",
    "original": {
      "title": "Need export to CSV for the Money app pls!!",
      "text": "Need export to CSV for the Money app pls!!"
    },
    "source": "email",
    "state": "promoted",
    "tags": [
      "request",
      "export"
    ],
    "category": null,
    "fields": {},
    "reason": null,
    "ticket": "TLK-2",
    "at": "2026-01-01T09:05:00.000Z",
    "by": "owner"
  },
  "runs": [
    {
      "id": "r1",
      "item": "n1",
      "at": "2026-01-01T09:05:00.000Z",
      "steps": [],
      "ended": "there are no steps: the item is received"
    }
  ]
}
```

20. owner calls inbox.inbox-read {"state":"accepted"} → succeeded:

```json
[]
```


### The inbox steps, in order

None.

### Inbox

| id | project | title | as captured | state | tags | category | fields | reason | ticket |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| n1 | TLK | Need export to CSV for the Money app pls!! |  | promoted | request, export |  |  |  | TLK-2 |
| n2 | TLK | the board crashes when I drag a ticket to review |  | promoted |  |  |  |  | TLK-1 |
| n3 | TLK | CHEAP WATCHES click here now |  | dismissed |  |  |  | nothing to do |  |
| n4 | TLK | Dark mode |  | linked |  |  |  |  | TLK-1 |

### Runs

r1 on n1: there are no steps: the item is received

r2 on n2: there are no steps: the item is received

r3 on n3: there are no steps: the item is received

r4 on n4: there are no steps: the item is received

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | the board crashes when I drag a ticket to review |  | (backlog) |  |  |  |  | open |
| TLK-2 | Need export to CSV for the Money app pls!! |  | To do |  |  |  |  | open |

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Sorter |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h4 | 09:05 | owner | inbox.item-capture | captured n1 for TLK: Need export to CSV for the Money app pls!! |  |  |
| h5 | 09:06 | owner | inbox.item-capture | captured n2 for TLK: the board crashes when I drag a ticket to review |  |  |
| h6 | 09:07 | owner | inbox.item-capture | captured n3 for TLK: CHEAP WATCHES click here now |  |  |
| h7 | 09:08 | a1 | inbox.item-capture | captured n4 for TLK: Dark mode |  |  |
| h8 | 09:09 | owner | inbox.item-tag | tagged n1 request, export |  |  |
| h9 | 09:10 | owner | inbox.item-accept | accepted n1 |  |  |
| h10 | 09:11 | owner | inbox.item-promote | turned n2 into TLK-1: the board crashes when I drag a ticket to review | TLK-1 |  |
| h11 | 09:12 | owner | inbox.item-reject | rejected n3: spam |  | h14 |
| h12 | 09:13 | a1 | inbox.item-link | linked n4 to TLK-1 | TLK-1 |  |
| h13 | 09:16 | owner | inbox.item-promote | turned n1 into TLK-2: Need export to CSV for the Money app pls!! | TLK-2 |  |
| h14 | 09:17 | owner | history.change-undo | undid: rejected n3: spam |  |  |
| h15 | 09:18 | owner | inbox.item-dismiss | dismissed n3: nothing to do |  |  |

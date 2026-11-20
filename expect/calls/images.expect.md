# images

## Input

[images.json](images.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.actor-create {"name":"Reviewer"} → succeeded; created actor a2
4. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
5. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-1
6. a1 calls images.image-add {"ticket":"TLK-1","name":"record-button.png","type":"image/png","data":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="} → succeeded; created image i1
7. a1 calls images.image-add {"ticket":"TLK-1","name":"lock-screen.png","type":"image/png","data":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="} → succeeded; created image i2
8. a2 calls images.image-list {"ticket":"TLK-1"} → succeeded:

```json
[
  {
    "id": "i1",
    "ticket": "TLK-1",
    "name": "record-button.png",
    "type": "image/png",
    "size": 70,
    "by": "a1",
    "at": "2026-01-01T09:06:00.000Z"
  },
  {
    "id": "i2",
    "ticket": "TLK-1",
    "name": "lock-screen.png",
    "type": "image/png",
    "size": 70,
    "by": "a1",
    "at": "2026-01-01T09:07:00.000Z"
  }
]
```

9. a2 calls images.image-read {"image":"i1"} → succeeded:

```json
{
  "id": "i1",
  "ticket": "TLK-1",
  "name": "record-button.png",
  "type": "image/png",
  "size": 70,
  "by": "a1",
  "at": "2026-01-01T09:06:00.000Z",
  "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
}
```

10. a2 calls images.image-remove {"image":"i1"} → refused: not-yours: Only whoever attached it or the owner can remove an image.
11. a1 calls images.image-remove {"image":"i1"} → succeeded; deleted image i1
12. a2 calls images.image-read {"image":"i1"} → refused: unknown-image: No image has id i1.
13. owner calls history.change-undo {"change":"h8"} → succeeded; updated change h8
14. owner calls images.image-remove {"image":"i2"} → succeeded; deleted image i2
15. a1 calls images.image-add {"ticket":"TLK-1","name":"notes.txt","type":"text/plain","data":"aGVsbG8="} → rejected: invalid-input: type: Invalid option: expected one of "image/png"|"image/jpeg"|"image/gif"|"image/webp"
16. a1 calls images.image-add {"ticket":"TLK-1","name":"bad.png","type":"image/png","data":"not base64!"} → rejected: invalid-input: data: data is base64
17. a1 calls images.image-add {"ticket":"TLK-9","name":"x.png","type":"image/png","data":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="} → refused: unknown-ticket: No ticket has id TLK-9.
18. owner calls comments.conversation-read {"ticket":"TLK-1"} → succeeded:

```json
{
  "ticket": "TLK-1",
  "entries": [
    {
      "type": "change",
      "change": {
        "id": "h5",
        "at": "2026-01-01T09:05:00.000Z",
        "actor": "owner",
        "actorName": "Sam",
        "summary": "created TLK-1 in To do: Voice notes on the phone",
        "undoable": true
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h6",
        "at": "2026-01-01T09:06:00.000Z",
        "actor": "a1",
        "actorName": "Coder",
        "summary": "attached the image record-button.png to TLK-1",
        "undoable": true
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h7",
        "at": "2026-01-01T09:07:00.000Z",
        "actor": "a1",
        "actorName": "Coder",
        "summary": "attached the image lock-screen.png to TLK-1",
        "undoable": true
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h8",
        "at": "2026-01-01T09:11:00.000Z",
        "actor": "a1",
        "actorName": "Coder",
        "summary": "removed the image record-button.png from TLK-1",
        "undoable": false
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h9",
        "at": "2026-01-01T09:13:00.000Z",
        "actor": "owner",
        "actorName": "Sam",
        "summary": "undid: removed the image record-button.png from TLK-1",
        "undoable": true
      }
    },
    {
      "type": "change",
      "change": {
        "id": "h10",
        "at": "2026-01-01T09:14:00.000Z",
        "actor": "owner",
        "actorName": "Sam",
        "summary": "removed the image lock-screen.png from TLK-1",
        "undoable": true
      }
    }
  ]
}
```

19. owner calls tickets.ticket-create {"project":"TLK","title":"Second"} → succeeded; created ticket TLK-2
20. a2 calls images.image-add {"ticket":"TLK-2","name":"kept.png","type":"image/png","data":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="} → succeeded; created image i3
21. owner calls tickets.ticket-delete {"ticket":"TLK-1"} → succeeded; deleted ticket TLK-1
22. owner calls images.image-read {"image":"i1"} → refused: unknown-image: No image has id i1.

### Actors

| id | name | archived |
| --- | --- | --- |
| owner | Sam |  |
| a1 | Coder |  |
| a2 | Reviewer |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |

### Labels

None.

### Features

None.

### Tickets

| id | title | feature | column | assigned | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-2 | Second |  | To do |  |  |  | open |

### Comments

None.

### Images

| id | ticket | name | type | bytes | by |
| --- | --- | --- | --- | --- | --- |
| i3 | TLK-2 | kept.png | image/png | 70 | a2 |

### Input requests

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Coder |  |  |
| h3 | 09:03 | owner | catalog.actor-create | added actor Reviewer |  |  |
| h4 | 09:04 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h5 | 09:05 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes on the phone | TLK-1 |  |
| h6 | 09:06 | a1 | images.image-add | attached the image record-button.png to TLK-1 | TLK-1 |  |
| h7 | 09:07 | a1 | images.image-add | attached the image lock-screen.png to TLK-1 | TLK-1 |  |
| h8 | 09:11 | a1 | images.image-remove | removed the image record-button.png from TLK-1 | TLK-1 | h9 |
| h9 | 09:13 | owner | history.change-undo | undid: removed the image record-button.png from TLK-1 | TLK-1 |  |
| h10 | 09:14 | owner | images.image-remove | removed the image lock-screen.png from TLK-1 | TLK-1 |  |
| h11 | 09:19 | owner | tickets.ticket-create | created TLK-2 in To do: Second | TLK-2 |  |
| h12 | 09:20 | a2 | images.image-add | attached the image kept.png to TLK-2 | TLK-2 |  |
| h13 | 09:21 | owner | tickets.ticket-delete | deleted TLK-1 for good: Voice notes on the phone | TLK-1 |  |

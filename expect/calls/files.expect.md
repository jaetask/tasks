# files

## Input

[files.json](files.json)

## Output

### Steps

1. owner calls catalog.actor-rename {"actor":"owner","name":"Sam"} → succeeded; updated actor owner
2. owner calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. owner calls catalog.project-create {"name":"Talk","prefix":"TLK"} → succeeded; created project TLK
4. owner calls tickets.ticket-create {"project":"TLK","title":"Voice notes on the phone"} → succeeded; created ticket TLK-1
5. owner calls tickets.ticket-create {"project":"TLK","title":"Crash on send"} → succeeded; created ticket TLK-2
6. owner calls files.file-list {"ticket":"TLK-1"} → succeeded:

```json
[]
```

7. a1 calls files.file-add-path {"ticket":"TLK-1","path":"/no/such/folder/notes.log"} → rejected: no-file: There is no file at /no/such/folder/notes.log.
8. owner calls files.file-add {"ticket":"TLK-1","name":"notes.log","type":"text/plain","upload":"00000000000000000000000000000000"} → rejected: no-file: There is no file there to attach.
9. owner calls files.file-add {"ticket":"TLK-1","name":"notes.log","type":"text/plain","upload":"../app.db"} → rejected: invalid-input: upload: an upload is named by 32 hex characters
10. owner calls files.file-add {"ticket":"TLK-9","name":"notes.log","type":"text/plain","upload":"00000000000000000000000000000000"} → rejected: unknown-ticket: No ticket has id TLK-9.
11. owner calls files.file-remove {"file":"fl1"} → rejected: unknown-file: No file has id fl1.
12. owner calls files.file-locate {"file":"fl1"} → rejected: unknown-file: No file has id fl1.

### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner | Sam |  |  |
| a1 | Coder |  |  |

### Projects

| id | name | icon | archived | columns |
| --- | --- | --- | --- | --- |
| TLK | Talk | teal |  | c1 To do (todo) · c2 Doing (doing) · c3 Review (waiting) · c4 Done (done) |

### Labels

None.

### Locations

None.

### Features

None.

### Tickets

| id | title | feature | column | assigned | location | labels | blocked | state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TLK-1 | Voice notes on the phone |  | To do |  |  |  |  | open |
| TLK-2 | Crash on send |  | To do |  |  |  |  | open |

### Comments

None.

### Images

None.

### Input requests

None.

### Ticket steps

None.

### Agent inboxes

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:01 | owner | catalog.actor-rename | named the owner Sam |  |  |
| h2 | 09:02 | owner | catalog.actor-create | added actor Coder |  |  |
| h3 | 09:03 | owner | catalog.project-create | created project Talk (TLK) |  |  |
| h4 | 09:04 | owner | tickets.ticket-create | created TLK-1 in To do: Voice notes on the phone | TLK-1 |  |
| h5 | 09:05 | owner | tickets.ticket-create | created TLK-2 in To do: Crash on send | TLK-2 |  |

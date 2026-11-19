# history

## Input

[history.json](history.json)

## Output

### Domain

| domain | version | card catalogue | about |
| --- | --- | --- | --- |
| history | 1.0.0 | 1 | Every change, with who made it. The owner can undo a change. |

### Actions

| action | effect | card | description |
| --- | --- | --- | --- |
| history.change-list | read | changes | List recorded changes, oldest first: all of them, or those about one ticket. |
| history.change-undo | write | change-undone | Undo a recorded change. Refused if what it changed has changed again since. An undo can itself be undone. |

### Cards

| card | version | view | about |
| --- | --- | --- | --- |
| changes | 1 | list | A list of recorded changes: who made each one, and what it was. |
| change-undone | 1 | record | The change that an undo recorded. |

#### Card changes

```json
{
  "kind": "list",
  "title": "Changes",
  "fields": [
    {
      "label": "Id",
      "path": "id"
    },
    {
      "label": "Actor",
      "path": "actor"
    },
    {
      "label": "Change",
      "path": "summary"
    },
    {
      "label": "At",
      "path": "at"
    }
  ]
}
```

#### Card change-undone

```json
{
  "kind": "record",
  "title": "Undone",
  "fields": [
    {
      "label": "Change",
      "path": "summary"
    },
    {
      "label": "Id",
      "path": "id"
    },
    {
      "label": "Refused",
      "path": "refused.message"
    }
  ]
}
```

### Agent context

```text
history: Every change, with who made it. The owner can undo a change.
Tools:
- history__change-list (reads): List recorded changes, oldest first: all of them, or those about one ticket.
- history__change-undo (changes): Undo a recorded change. Refused if what it changed has changed again since. An undo can itself be undone.
A tool that changes something after the person says yes waits for them; tell them what you asked for.
```

### Inputs

#### history.change-list

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string"
    },
    "limit": {
      "description": "The newest this many. 100 if left out.",
      "type": "integer",
      "minimum": 1,
      "maximum": 500
    }
  }
}
```

#### history.change-undo

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "change": {
      "type": "string",
      "description": "The id of the change, like h12."
    }
  },
  "required": [
    "change"
  ]
}
```

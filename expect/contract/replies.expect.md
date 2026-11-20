# replies

## Input

[replies.json](replies.json)

## Output

### Domain

| domain | version | card catalogue | about |
| --- | --- | --- | --- |
| replies | 1.0.0 | 1 | The agent inbox: what was said to each agent, for it to read and acknowledge. |

### Actions

| action | effect | card | description |
| --- | --- | --- | --- |
| replies.reply-list | read | agent-replies | Read your agent inbox, oldest first: replies to your comments, comments on tickets assigned to you, and the owner's answers to your questions. The owner can read any agent's, or everyone's. |
| replies.reply-acknowledge | write | agent-reply-changed | Mark a reply in your agent inbox as read and dealt with. |

### Cards

| card | version | view | about |
| --- | --- | --- | --- |
| agent-replies | 1 | list | What was said to an agent: replies, comments on its tickets, and answers. |
| agent-reply-changed | 1 | change | What a Call changed in an agent inbox. |

#### Card agent-replies

```json
{
  "kind": "list",
  "title": "Agent inbox",
  "fields": [
    {
      "label": "Id",
      "path": "id"
    },
    {
      "label": "For",
      "path": "toName"
    },
    {
      "label": "From",
      "path": "fromName"
    },
    {
      "label": "Ticket",
      "path": "ticket"
    },
    {
      "label": "Text",
      "path": "text"
    },
    {
      "label": "State",
      "path": "state"
    }
  ]
}
```

#### Card agent-reply-changed

```json
{
  "kind": "change",
  "title": "Agent inbox changed"
}
```

### Agent context

```text
replies: The agent inbox: what was said to each agent, for it to read and acknowledge.
Tools:
- replies__reply-list (reads): Read your agent inbox, oldest first: replies to your comments, comments on tickets assigned to you, and the owner's answers to your questions. The owner can read any agent's, or everyone's.
- replies__reply-acknowledge (changes): Mark a reply in your agent inbox as read and dealt with.
A tool that changes something after the person says yes waits for them; tell them what you asked for.
```

### Inputs

#### replies.reply-list

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "state": {
      "description": "unread or acknowledged. Both if left out.",
      "type": "string",
      "enum": [
        "unread",
        "acknowledged"
      ]
    },
    "actor": {
      "description": "Whose inbox. Only the owner may name another actor.",
      "type": "string"
    }
  }
}
```

#### replies.reply-acknowledge

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "reply": {
      "type": "string",
      "description": "A reply id, like r4."
    }
  },
  "required": [
    "reply"
  ]
}
```

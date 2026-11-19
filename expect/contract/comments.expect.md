# comments

## Input

[comments.json](comments.json)

## Output

### Domain

| domain | version | card catalogue | about |
| --- | --- | --- | --- |
| comments | 1.0.0 | 1 | The conversation on a ticket: comments, replies and reactions, with a line for each change to the ticket. |

### Actions

| action | effect | card | description |
| --- | --- | --- | --- |
| comments.conversation-read | read |  | Read a ticket's conversation: its comments with replies and reactions, and a line for each change to the ticket, oldest first. |
| comments.comment-add | write | comment-changed | Comment on a ticket: say what you did or found, or ask. With reply_to, it is a reply to that comment. |
| comments.comment-edit | write | comment-changed | Change the text of a comment you wrote. |
| comments.comment-remove | write | comment-changed | Remove a comment. Its author or the owner can. Its replies stay. |
| comments.reaction-add | write | comment-changed | React to a comment with an emoji. |
| comments.reaction-remove | write | comment-changed | Take back your reaction to a comment. |

### Cards

| card | version | view | about |
| --- | --- | --- | --- |
| comment-changed | 1 | change | What a Call changed in a ticket's conversation. |

#### Card comment-changed

```json
{
  "kind": "change",
  "title": "Conversation changed"
}
```

### Agent context

```text
comments: The conversation on a ticket: comments, replies and reactions, with a line for each change to the ticket.
Tools:
- comments__conversation-read (reads): Read a ticket's conversation: its comments with replies and reactions, and a line for each change to the ticket, oldest first.
- comments__comment-add (changes): Comment on a ticket: say what you did or found, or ask. With reply_to, it is a reply to that comment.
- comments__comment-edit (changes): Change the text of a comment you wrote.
- comments__comment-remove (changes): Remove a comment. Its author or the owner can. Its replies stay.
- comments__reaction-add (changes): React to a comment with an emoji.
- comments__reaction-remove (changes): Take back your reaction to a comment.
A tool that changes something after the person says yes waits for them; tell them what you asked for.
```

### Inputs

#### comments.conversation-read

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string"
    }
  },
  "required": [
    "ticket"
  ]
}
```

#### comments.comment-add

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string"
    },
    "text": {
      "type": "string",
      "minLength": 1,
      "maxLength": 10000
    },
    "reply_to": {
      "description": "The id of the comment to reply to.",
      "type": "string"
    }
  },
  "required": [
    "ticket",
    "text"
  ]
}
```

#### comments.comment-edit

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "comment": {
      "type": "string"
    },
    "text": {
      "type": "string",
      "minLength": 1,
      "maxLength": 10000
    }
  },
  "required": [
    "comment",
    "text"
  ]
}
```

#### comments.comment-remove

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "comment": {
      "type": "string"
    }
  },
  "required": [
    "comment"
  ]
}
```

#### comments.reaction-add

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "comment": {
      "type": "string"
    },
    "emoji": {
      "type": "string",
      "minLength": 1,
      "maxLength": 16,
      "description": "One emoji, such as 👍."
    }
  },
  "required": [
    "comment",
    "emoji"
  ]
}
```

#### comments.reaction-remove

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "comment": {
      "type": "string"
    },
    "emoji": {
      "type": "string",
      "minLength": 1,
      "maxLength": 16,
      "description": "One emoji, such as 👍."
    }
  },
  "required": [
    "comment",
    "emoji"
  ]
}
```

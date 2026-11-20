# tickets

## Input

[tickets.json](tickets.json)

## Output

### Domain

| domain | version | card catalogue | about |
| --- | --- | --- | --- |
| tickets | 1.0.0 | 1 | Tickets on project boards: find work, claim it, move it on, hand it on. Every change is recorded with its actor. |

### Actions

| action | effect | card | description |
| --- | --- | --- | --- |
| tickets.work-find | read | tickets | Find work to do: open tickets on a board, in to-do columns, that are not blocked and are assigned to you or to nobody, oldest first. |
| tickets.ticket-find | read | tickets | Find tickets, oldest first. Every filter is optional; a column's kind says what the column means. |
| tickets.ticket-read | read | ticket | Read one ticket. |
| tickets.board-read | read |  | Read a project's board: its columns in order, each with its open tickets. Can be narrowed by words or by who a ticket is assigned to. |
| tickets.overview-read | read |  | Read the open tickets of every project, lined up by column kind: to do, doing, waiting, done. Can be narrowed like a board. |
| tickets.backlog-read | read | tickets | Read a project's backlog: open tickets that wait off the board, oldest first. Can be narrowed like a board. |
| tickets.ticket-create | write | ticket-changed | Create a ticket. It starts in the project's first to-do column unless you name a column. |
| tickets.ticket-claim | write | ticket-changed | Claim a ticket: assign it to yourself and move it to the first doing column. |
| tickets.ticket-move | write | ticket-changed | Move a ticket to any column of its board. |
| tickets.ticket-review-request | write | ticket-changed | Ask for review: move a ticket to the first waiting column. |
| tickets.ticket-finish | write | ticket-changed | Finish a ticket: move it to the first done column. |
| tickets.ticket-assign | write | ticket-changed | Assign a ticket to an actor, to hand it on, or to nobody with null. A note says what the next actor needs to know; it is left as a comment on the ticket. |
| tickets.ticket-edit | write | ticket-changed | Change a ticket's title, its description, or both. |
| tickets.ticket-backlog-send | write | ticket-changed | Send a ticket to its project's backlog, off the board. |
| tickets.ticket-board-send | write | ticket-changed | Put a backlog ticket on the board, in the first to-do column. |
| tickets.ticket-feature-set | write | ticket-changed | Put a ticket in a feature of its project, or in no feature with null. |
| tickets.ticket-location-set | write | ticket-changed | Set the location a ticket's work is done at, such as a machine, or none with null. |
| tickets.ticket-type-set | write | ticket-changed | Set what kind of work a ticket is: task, bug, improvement or specification. |
| tickets.ticket-priority-set | write | ticket-changed | Set a ticket's priority: none, urgent, high, medium or low. |
| tickets.ticket-link-add | write | ticket-changed | Add a link to a ticket: a web address that belongs to it, such as a pull request. |
| tickets.ticket-link-remove | write | ticket-changed | Remove a link from a ticket. |
| tickets.ticket-reaction-add | write | ticket-changed | React to a ticket with an emoji. An actor can add several different emoji to one ticket, each one once. |
| tickets.ticket-reaction-remove | write | ticket-changed | Take back your reaction to a ticket. |
| tickets.ticket-label-add | write | ticket-changed | Add a label to a ticket. |
| tickets.ticket-label-remove | write | ticket-changed | Remove a label from a ticket. |
| tickets.ticket-block | write | ticket-changed | Mark a ticket blocked, with a note saying why. It stays in its column; agents looking for work skip it. |
| tickets.ticket-unblock | write | ticket-changed | Mark a ticket no longer blocked. |
| tickets.ticket-archive | write | ticket-changed | Archive a ticket. It leaves the board and keeps its column; the owner can restore it. |
| tickets.ticket-cancel | write | ticket-changed | Cancel a ticket. It goes to the Archive as canceled; the owner can restore it. |
| tickets.ticket-restore | write | ticket-changed | Restore an archived or canceled ticket to the column it was in. Only the owner can. |
| tickets.ticket-delete | write | ticket-changed | Delete a ticket for good, with its comments and images. It cannot be undone. Only the owner can. |
| tickets.feature-find | read | features | List a project's features, each with how many open tickets belong to it. |
| tickets.feature-create | write | feature-changed | Create a feature: one part of a project, which groups the tickets for that part. |
| tickets.feature-edit | write | feature-changed | Change a feature's name or description, or mark it as a favourite. |
| tickets.feature-archive | write | feature-changed | Archive a feature. Its tickets keep it; no new ticket can be put in it. |
| tickets.feature-restore | write | feature-changed | Restore an archived feature. |

### Cards

| card | version | view | about |
| --- | --- | --- | --- |
| tickets | 1 | list | A list of tickets. |
| ticket | 1 | record | One ticket. |
| ticket-changed | 1 | change | What a Call changed on a ticket. |
| features | 1 | list | A list of a project's features. |
| feature-changed | 1 | change | What a Call changed in a project's features. |

#### Card tickets

```json
{
  "kind": "list",
  "title": "Tickets",
  "fields": [
    {
      "label": "Id",
      "path": "id"
    },
    {
      "label": "Title",
      "path": "title"
    },
    {
      "label": "Column",
      "path": "column.name"
    },
    {
      "label": "Assigned",
      "path": "assigneeName"
    }
  ]
}
```

#### Card ticket

```json
{
  "kind": "record",
  "title": "Ticket",
  "fields": [
    {
      "label": "Id",
      "path": "id"
    },
    {
      "label": "Title",
      "path": "title"
    },
    {
      "label": "Column",
      "path": "column.name"
    },
    {
      "label": "Assigned",
      "path": "assigneeName"
    },
    {
      "label": "Blocked",
      "path": "blocked"
    }
  ]
}
```

#### Card ticket-changed

```json
{
  "kind": "change",
  "title": "Ticket changed"
}
```

#### Card features

```json
{
  "kind": "list",
  "title": "Features",
  "fields": [
    {
      "label": "Id",
      "path": "id"
    },
    {
      "label": "Feature",
      "path": "name"
    },
    {
      "label": "Open tickets",
      "path": "tickets"
    }
  ]
}
```

#### Card feature-changed

```json
{
  "kind": "change",
  "title": "Features changed"
}
```

### Agent context

```text
tickets: Tickets on project boards: find work, claim it, move it on, hand it on. Every change is recorded with its actor.
Tools:
- tickets__work-find (reads): Find work to do: open tickets on a board, in to-do columns, that are not blocked and are assigned to you or to nobody, oldest first.
- tickets__ticket-find (reads): Find tickets, oldest first. Every filter is optional; a column's kind says what the column means.
- tickets__ticket-read (reads): Read one ticket.
- tickets__board-read (reads): Read a project's board: its columns in order, each with its open tickets. Can be narrowed by words or by who a ticket is assigned to.
- tickets__overview-read (reads): Read the open tickets of every project, lined up by column kind: to do, doing, waiting, done. Can be narrowed like a board.
- tickets__backlog-read (reads): Read a project's backlog: open tickets that wait off the board, oldest first. Can be narrowed like a board.
- tickets__ticket-create (changes): Create a ticket. It starts in the project's first to-do column unless you name a column.
- tickets__ticket-claim (changes): Claim a ticket: assign it to yourself and move it to the first doing column.
- tickets__ticket-move (changes): Move a ticket to any column of its board.
- tickets__ticket-review-request (changes): Ask for review: move a ticket to the first waiting column.
- tickets__ticket-finish (changes): Finish a ticket: move it to the first done column.
- tickets__ticket-assign (changes): Assign a ticket to an actor, to hand it on, or to nobody with null. A note says what the next actor needs to know; it is left as a comment on the ticket.
- tickets__ticket-edit (changes): Change a ticket's title, its description, or both.
- tickets__ticket-backlog-send (changes): Send a ticket to its project's backlog, off the board.
- tickets__ticket-board-send (changes): Put a backlog ticket on the board, in the first to-do column.
- tickets__ticket-feature-set (changes): Put a ticket in a feature of its project, or in no feature with null.
- tickets__ticket-location-set (changes): Set the location a ticket's work is done at, such as a machine, or none with null.
- tickets__ticket-type-set (changes): Set what kind of work a ticket is: task, bug, improvement or specification.
- tickets__ticket-priority-set (changes): Set a ticket's priority: none, urgent, high, medium or low.
- tickets__ticket-link-add (changes): Add a link to a ticket: a web address that belongs to it, such as a pull request.
- tickets__ticket-link-remove (changes): Remove a link from a ticket.
- tickets__ticket-reaction-add (changes): React to a ticket with an emoji. An actor can add several different emoji to one ticket, each one once.
- tickets__ticket-reaction-remove (changes): Take back your reaction to a ticket.
- tickets__ticket-label-add (changes): Add a label to a ticket.
- tickets__ticket-label-remove (changes): Remove a label from a ticket.
- tickets__ticket-block (changes): Mark a ticket blocked, with a note saying why. It stays in its column; agents looking for work skip it.
- tickets__ticket-unblock (changes): Mark a ticket no longer blocked.
- tickets__ticket-archive (changes): Archive a ticket. It leaves the board and keeps its column; the owner can restore it.
- tickets__ticket-cancel (changes): Cancel a ticket. It goes to the Archive as canceled; the owner can restore it.
- tickets__ticket-restore (changes): Restore an archived or canceled ticket to the column it was in. Only the owner can.
- tickets__ticket-delete (changes): Delete a ticket for good, with its comments and images. It cannot be undone. Only the owner can.
- tickets__feature-find (reads): List a project's features, each with how many open tickets belong to it.
- tickets__feature-create (changes): Create a feature: one part of a project, which groups the tickets for that part.
- tickets__feature-edit (changes): Change a feature's name or description, or mark it as a favourite.
- tickets__feature-archive (changes): Archive a feature. Its tickets keep it; no new ticket can be put in it.
- tickets__feature-restore (changes): Restore an archived feature.
A tool that changes something after the person says yes waits for them; tell them what you asked for.
```

### Inputs

#### tickets.work-find

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "project": {
      "type": "string"
    }
  }
}
```

#### tickets.ticket-find

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "project": {
      "type": "string"
    },
    "kind": {
      "type": "string",
      "enum": [
        "todo",
        "doing",
        "waiting",
        "done"
      ],
      "description": "What a column means: todo, doing, waiting or done."
    },
    "assignee": {
      "description": "An actor id, or null for tickets assigned to nobody.",
      "type": [
        "string",
        "null"
      ]
    },
    "label": {
      "description": "A label id.",
      "type": "string"
    },
    "feature": {
      "description": "A feature id, or null for tickets in no feature.",
      "type": [
        "string",
        "null"
      ]
    },
    "text": {
      "description": "Words to look for in the title and description.",
      "type": "string"
    },
    "blocked": {
      "type": "boolean"
    },
    "type": {
      "type": "string",
      "enum": [
        "task",
        "bug",
        "improvement",
        "specification"
      ],
      "description": "What kind of work it is."
    },
    "priority": {
      "type": "string",
      "enum": [
        "none",
        "urgent",
        "high",
        "medium",
        "low"
      ]
    },
    "backlog": {
      "description": "True for the backlog only, false for the board only.",
      "type": "boolean"
    },
    "state": {
      "description": "open if left out.",
      "type": "string",
      "enum": [
        "open",
        "archived",
        "canceled"
      ]
    }
  }
}
```

#### tickets.ticket-read

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    }
  },
  "required": [
    "ticket"
  ]
}
```

#### tickets.board-read

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "text": {
      "description": "Words to look for in the id, title and description.",
      "type": "string"
    },
    "assignee": {
      "description": "An actor id, or null for tickets assigned to nobody.",
      "type": [
        "string",
        "null"
      ]
    },
    "feature": {
      "description": "A feature id, or null for tickets in no feature.",
      "type": [
        "string",
        "null"
      ]
    },
    "project": {
      "type": "string",
      "description": "A project id, like TLK."
    }
  },
  "required": [
    "project"
  ]
}
```

#### tickets.overview-read

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "text": {
      "description": "Words to look for in the id, title and description.",
      "type": "string"
    },
    "assignee": {
      "description": "An actor id, or null for tickets assigned to nobody.",
      "type": [
        "string",
        "null"
      ]
    },
    "feature": {
      "description": "A feature id, or null for tickets in no feature.",
      "type": [
        "string",
        "null"
      ]
    }
  }
}
```

#### tickets.backlog-read

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "text": {
      "description": "Words to look for in the id, title and description.",
      "type": "string"
    },
    "assignee": {
      "description": "An actor id, or null for tickets assigned to nobody.",
      "type": [
        "string",
        "null"
      ]
    },
    "feature": {
      "description": "A feature id, or null for tickets in no feature.",
      "type": [
        "string",
        "null"
      ]
    },
    "project": {
      "type": "string"
    }
  },
  "required": [
    "project"
  ]
}
```

#### tickets.ticket-create

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "project": {
      "type": "string"
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "description": {
      "default": "",
      "type": "string",
      "maxLength": 20000
    },
    "column": {
      "description": "A column id on the project's board.",
      "type": "string"
    },
    "labels": {
      "default": [],
      "description": "Label ids.",
      "maxItems": 20,
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "assignee": {
      "description": "An actor id.",
      "type": "string"
    },
    "feature": {
      "description": "The id of a feature of the project.",
      "type": "string"
    },
    "location": {
      "description": "The id of the location its work is done at.",
      "type": "string"
    },
    "type": {
      "description": "task if left out.",
      "type": "string",
      "enum": [
        "task",
        "bug",
        "improvement",
        "specification"
      ]
    },
    "priority": {
      "description": "none if left out.",
      "type": "string",
      "enum": [
        "none",
        "urgent",
        "high",
        "medium",
        "low"
      ]
    },
    "links": {
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string",
        "maxLength": 2000,
        "pattern": "^https?:\\/\\/\\S+$"
      }
    },
    "backlog": {
      "default": false,
      "description": "True to put it in the backlog, to wait there until it is put on the board.",
      "type": "boolean"
    }
  },
  "required": [
    "project",
    "title"
  ]
}
```

#### tickets.ticket-claim

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    }
  },
  "required": [
    "ticket"
  ]
}
```

#### tickets.ticket-move

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "column": {
      "type": "string",
      "description": "A column id."
    }
  },
  "required": [
    "ticket",
    "column"
  ]
}
```

#### tickets.ticket-review-request

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    }
  },
  "required": [
    "ticket"
  ]
}
```

#### tickets.ticket-finish

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    }
  },
  "required": [
    "ticket"
  ]
}
```

#### tickets.ticket-assign

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "actor": {
      "type": [
        "string",
        "null"
      ]
    },
    "note": {
      "description": "A handoff note.",
      "type": "string",
      "minLength": 1,
      "maxLength": 5000
    }
  },
  "required": [
    "ticket",
    "actor"
  ]
}
```

#### tickets.ticket-edit

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "description": {
      "type": "string",
      "maxLength": 20000
    }
  },
  "required": [
    "ticket"
  ]
}
```

#### tickets.ticket-backlog-send

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    }
  },
  "required": [
    "ticket"
  ]
}
```

#### tickets.ticket-board-send

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    }
  },
  "required": [
    "ticket"
  ]
}
```

#### tickets.ticket-feature-set

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "feature": {
      "type": [
        "string",
        "null"
      ]
    }
  },
  "required": [
    "ticket",
    "feature"
  ]
}
```

#### tickets.ticket-location-set

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "location": {
      "type": [
        "string",
        "null"
      ]
    }
  },
  "required": [
    "ticket",
    "location"
  ]
}
```

#### tickets.ticket-type-set

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "type": {
      "type": "string",
      "enum": [
        "task",
        "bug",
        "improvement",
        "specification"
      ],
      "description": "What kind of work it is."
    }
  },
  "required": [
    "ticket",
    "type"
  ]
}
```

#### tickets.ticket-priority-set

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "priority": {
      "type": "string",
      "enum": [
        "none",
        "urgent",
        "high",
        "medium",
        "low"
      ]
    }
  },
  "required": [
    "ticket",
    "priority"
  ]
}
```

#### tickets.ticket-link-add

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "url": {
      "type": "string",
      "maxLength": 2000,
      "pattern": "^https?:\\/\\/\\S+$"
    }
  },
  "required": [
    "ticket",
    "url"
  ]
}
```

#### tickets.ticket-link-remove

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "link": {
      "type": "string",
      "description": "The id of the link."
    }
  },
  "required": [
    "ticket",
    "link"
  ]
}
```

#### tickets.ticket-reaction-add

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "emoji": {
      "type": "string",
      "minLength": 1,
      "maxLength": 16,
      "description": "One emoji, such as 👍."
    }
  },
  "required": [
    "ticket",
    "emoji"
  ]
}
```

#### tickets.ticket-reaction-remove

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "emoji": {
      "type": "string",
      "minLength": 1,
      "maxLength": 16,
      "description": "One emoji, such as 👍."
    }
  },
  "required": [
    "ticket",
    "emoji"
  ]
}
```

#### tickets.ticket-label-add

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "label": {
      "type": "string",
      "description": "A label id."
    }
  },
  "required": [
    "ticket",
    "label"
  ]
}
```

#### tickets.ticket-label-remove

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "label": {
      "type": "string",
      "description": "A label id."
    }
  },
  "required": [
    "ticket",
    "label"
  ]
}
```

#### tickets.ticket-block

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    },
    "note": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    }
  },
  "required": [
    "ticket",
    "note"
  ]
}
```

#### tickets.ticket-unblock

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    }
  },
  "required": [
    "ticket"
  ]
}
```

#### tickets.ticket-archive

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    }
  },
  "required": [
    "ticket"
  ]
}
```

#### tickets.ticket-cancel

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    }
  },
  "required": [
    "ticket"
  ]
}
```

#### tickets.ticket-restore

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    }
  },
  "required": [
    "ticket"
  ]
}
```

#### tickets.ticket-delete

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string",
      "description": "A ticket id, like TLK-529."
    }
  },
  "required": [
    "ticket"
  ]
}
```

#### tickets.feature-find

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "project": {
      "type": "string"
    },
    "archived": {
      "default": false,
      "description": "True to include archived features.",
      "type": "boolean"
    }
  },
  "required": [
    "project"
  ]
}
```

#### tickets.feature-create

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "project": {
      "type": "string"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80
    },
    "description": {
      "default": "",
      "type": "string",
      "maxLength": 2000
    }
  },
  "required": [
    "project",
    "name"
  ]
}
```

#### tickets.feature-edit

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "feature": {
      "type": "string"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80
    },
    "description": {
      "type": "string",
      "maxLength": 2000
    },
    "favourite": {
      "type": "boolean"
    }
  },
  "required": [
    "feature"
  ]
}
```

#### tickets.feature-archive

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "feature": {
      "type": "string"
    }
  },
  "required": [
    "feature"
  ]
}
```

#### tickets.feature-restore

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "feature": {
      "type": "string"
    }
  },
  "required": [
    "feature"
  ]
}
```

# inbox

## Input

[inbox.json](inbox.json)

## Output

### Domain

| domain | version | card catalogue | about |
| --- | --- | --- | --- |
| inbox | 1.0.0 | 1 | The inbox: new ideas and requests before they become tickets, and the owner's steps that look at each one. |

### Actions

| action | effect | card | description |
| --- | --- | --- | --- |
| inbox.inbox-read | read | inbox-items | List inbox items, oldest first: all of them, or those in one state. |
| inbox.item-read | read |  | Read one inbox item, with the record of each run of the steps on it. |
| inbox.item-capture | write | inbox-changed | Put a new idea or request in the inbox. The owner's steps look at it before it lands there. |
| inbox.item-tag | write | inbox-changed | Add tags to an inbox item. |
| inbox.item-untag | write | inbox-changed | Remove tags from an inbox item. |
| inbox.item-category-set | write | inbox-changed | Sort an inbox item into a category, or out of its category with null. |
| inbox.item-fields-set | write | inbox-changed | Keep details pulled out of an inbox item, as named fields. |
| inbox.item-fields-clear | write | inbox-changed | Remove fields from an inbox item: the ones named, or all of them. |
| inbox.item-edit | write | inbox-changed | Change an inbox item's title, its text, or both, such as to tidy it. The item as captured is kept beside it. |
| inbox.item-accept | write | inbox-changed | Accept an inbox item: it is worth keeping, and stays in the inbox as accepted. |
| inbox.item-reject | write | inbox-changed | Reject an inbox item, such as spam, with the reason. |
| inbox.item-dismiss | write | inbox-changed | Dismiss an inbox item that needs nothing done, with the reason. |
| inbox.item-promote | write | inbox-changed | Turn an inbox item into a ticket in a project's first to-do column. |
| inbox.item-link | write | inbox-changed | Link an inbox item to a ticket that already covers it. |
| inbox.item-run | write |  | Run the steps on an inbox item again, such as after changing the steps. |
| inbox.pipeline-read | read |  | List the inbox steps, in the order they run. |
| inbox.step-add | write | inbox-changed | Add a step that looks at each new inbox item. It may ask only for the Actions you give it. |
| inbox.step-edit | write | inbox-changed | Change an inbox step: its name, kind, actor, Actions, condition, settings, or whether it is on. |
| inbox.step-move | write | inbox-changed | Move an inbox step to another place in the order. |
| inbox.step-remove | write | inbox-changed | Remove an inbox step. |

### Cards

| card | version | view | about |
| --- | --- | --- | --- |
| inbox-items | 1 | list | A list of inbox items. |
| inbox-changed | 1 | change | What a Call changed in the inbox or its steps. |

#### Card inbox-items

```json
{
  "kind": "list",
  "title": "Inbox",
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
      "label": "State",
      "path": "state"
    },
    {
      "label": "Category",
      "path": "category"
    }
  ]
}
```

#### Card inbox-changed

```json
{
  "kind": "change",
  "title": "Inbox changed"
}
```

### Agent context

```text
inbox: The inbox: new ideas and requests before they become tickets, and the owner's steps that look at each one.
Tools:
- inbox__inbox-read (reads): List inbox items, oldest first: all of them, or those in one state.
- inbox__item-read (reads): Read one inbox item, with the record of each run of the steps on it.
- inbox__item-capture (changes): Put a new idea or request in the inbox. The owner's steps look at it before it lands there.
- inbox__item-tag (changes): Add tags to an inbox item.
- inbox__item-untag (changes): Remove tags from an inbox item.
- inbox__item-category-set (changes): Sort an inbox item into a category, or out of its category with null.
- inbox__item-fields-set (changes): Keep details pulled out of an inbox item, as named fields.
- inbox__item-fields-clear (changes): Remove fields from an inbox item: the ones named, or all of them.
- inbox__item-edit (changes): Change an inbox item's title, its text, or both, such as to tidy it. The item as captured is kept beside it.
- inbox__item-accept (changes): Accept an inbox item: it is worth keeping, and stays in the inbox as accepted.
- inbox__item-reject (changes): Reject an inbox item, such as spam, with the reason.
- inbox__item-dismiss (changes): Dismiss an inbox item that needs nothing done, with the reason.
- inbox__item-promote (changes): Turn an inbox item into a ticket in a project's first to-do column.
- inbox__item-link (changes): Link an inbox item to a ticket that already covers it.
- inbox__item-run (changes): Run the steps on an inbox item again, such as after changing the steps.
- inbox__pipeline-read (reads): List the inbox steps, in the order they run.
- inbox__step-add (changes): Add a step that looks at each new inbox item. It may ask only for the Actions you give it.
- inbox__step-edit (changes): Change an inbox step: its name, kind, actor, Actions, condition, settings, or whether it is on.
- inbox__step-move (changes): Move an inbox step to another place in the order.
- inbox__step-remove (changes): Remove an inbox step.
A tool that changes something after the person says yes waits for them; tell them what you asked for.
```

### Inputs

#### inbox.inbox-read

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "state": {
      "type": "string",
      "enum": [
        "received",
        "accepted",
        "rejected",
        "dismissed",
        "promoted",
        "linked"
      ]
    }
  }
}
```

#### inbox.item-read

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "An inbox item id, like n12."
    }
  },
  "required": [
    "item"
  ]
}
```

#### inbox.item-capture

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "text": {
      "type": "string",
      "minLength": 1,
      "maxLength": 20000
    },
    "title": {
      "description": "The first line of the text if left out.",
      "type": "string",
      "maxLength": 200
    },
    "source": {
      "default": "page",
      "description": "Where it came from.",
      "type": "string",
      "minLength": 1,
      "maxLength": 40
    }
  },
  "required": [
    "text"
  ]
}
```

#### inbox.item-tag

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "An inbox item id, like n12."
    },
    "tags": {
      "minItems": 1,
      "maxItems": 20,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 40
      }
    }
  },
  "required": [
    "item",
    "tags"
  ]
}
```

#### inbox.item-untag

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "An inbox item id, like n12."
    },
    "tags": {
      "minItems": 1,
      "maxItems": 20,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 40
      }
    }
  },
  "required": [
    "item",
    "tags"
  ]
}
```

#### inbox.item-category-set

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "An inbox item id, like n12."
    },
    "category": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 40
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "item",
    "category"
  ]
}
```

#### inbox.item-fields-set

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "An inbox item id, like n12."
    },
    "fields": {
      "type": "object",
      "propertyNames": {
        "type": "string",
        "minLength": 1,
        "maxLength": 40
      },
      "additionalProperties": {
        "type": "string",
        "maxLength": 500
      }
    }
  },
  "required": [
    "item",
    "fields"
  ]
}
```

#### inbox.item-fields-clear

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "An inbox item id, like n12."
    },
    "fields": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "item"
  ]
}
```

#### inbox.item-edit

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "An inbox item id, like n12."
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "text": {
      "type": "string",
      "minLength": 1,
      "maxLength": 20000
    }
  },
  "required": [
    "item"
  ]
}
```

#### inbox.item-accept

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "An inbox item id, like n12."
    },
    "reason": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    }
  },
  "required": [
    "item"
  ]
}
```

#### inbox.item-reject

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "An inbox item id, like n12."
    },
    "reason": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    }
  },
  "required": [
    "item",
    "reason"
  ]
}
```

#### inbox.item-dismiss

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "An inbox item id, like n12."
    },
    "reason": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    }
  },
  "required": [
    "item",
    "reason"
  ]
}
```

#### inbox.item-promote

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "An inbox item id, like n12."
    },
    "project": {
      "type": "string"
    }
  },
  "required": [
    "item",
    "project"
  ]
}
```

#### inbox.item-link

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "An inbox item id, like n12."
    },
    "ticket": {
      "type": "string"
    }
  },
  "required": [
    "item",
    "ticket"
  ]
}
```

#### inbox.item-run

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "An inbox item id, like n12."
    }
  },
  "required": [
    "item"
  ]
}
```

#### inbox.pipeline-read

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {}
}
```

#### inbox.step-add

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60
    },
    "kind": {
      "type": "string",
      "enum": [
        "classifier",
        "local-model",
        "hosted-model",
        "script",
        "app"
      ]
    },
    "actor": {
      "type": "string",
      "description": "The id of the actor the step's changes show under. Never the owner."
    },
    "actions": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "item-tag",
          "item-untag",
          "item-category-set",
          "item-fields-set",
          "item-fields-clear",
          "item-edit",
          "item-accept",
          "item-reject",
          "item-dismiss",
          "item-promote",
          "item-link"
        ]
      },
      "description": "The Actions the step may ask for."
    },
    "condition": {
      "default": null,
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "tag": {
              "description": "The item has this tag.",
              "type": "string"
            },
            "category": {
              "description": "The item is in this category.",
              "type": "string"
            },
            "source": {
              "description": "The item came from this source.",
              "type": "string"
            },
            "word": {
              "description": "The item's title or text has this word.",
              "type": "string"
            }
          },
          "additionalProperties": false
        },
        {
          "type": "null"
        }
      ],
      "description": "Which items it runs on. Null for every item."
    },
    "config": {
      "default": {},
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {},
      "description": "What its kind needs. script: file. local-model and hosted-model: url, model, instructions, and key_env for hosted. classifier: url, model, labels. app: action."
    },
    "on": {
      "default": true,
      "type": "boolean"
    },
    "before": {
      "description": "The id of the step to put it before. Last if left out.",
      "type": "string"
    }
  },
  "required": [
    "name",
    "kind",
    "actor",
    "actions"
  ]
}
```

#### inbox.step-edit

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60
    },
    "kind": {
      "type": "string",
      "enum": [
        "classifier",
        "local-model",
        "hosted-model",
        "script",
        "app"
      ]
    },
    "actor": {
      "type": "string",
      "description": "The id of the actor the step's changes show under. Never the owner."
    },
    "actions": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "item-tag",
          "item-untag",
          "item-category-set",
          "item-fields-set",
          "item-fields-clear",
          "item-edit",
          "item-accept",
          "item-reject",
          "item-dismiss",
          "item-promote",
          "item-link"
        ]
      },
      "description": "The Actions the step may ask for."
    },
    "condition": {
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "tag": {
              "description": "The item has this tag.",
              "type": "string"
            },
            "category": {
              "description": "The item is in this category.",
              "type": "string"
            },
            "source": {
              "description": "The item came from this source.",
              "type": "string"
            },
            "word": {
              "description": "The item's title or text has this word.",
              "type": "string"
            }
          },
          "additionalProperties": false
        },
        {
          "type": "null"
        }
      ],
      "description": "Which items it runs on. Null for every item."
    },
    "config": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {},
      "description": "What its kind needs. script: file. local-model and hosted-model: url, model, instructions, and key_env for hosted. classifier: url, model, labels. app: action."
    },
    "on": {
      "type": "boolean"
    },
    "step": {
      "type": "string"
    }
  },
  "required": [
    "step"
  ]
}
```

#### inbox.step-move

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "step": {
      "type": "string"
    },
    "before": {
      "description": "The id of the step to put it before. Last if left out.",
      "type": "string"
    }
  },
  "required": [
    "step"
  ]
}
```

#### inbox.step-remove

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "step": {
      "type": "string"
    }
  },
  "required": [
    "step"
  ]
}
```

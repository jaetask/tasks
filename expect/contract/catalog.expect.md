# catalog

## Input

[catalog.json](catalog.json)

## Output

### Domain

| domain | version | card catalogue | about |
| --- | --- | --- | --- |
| catalog | 1.0.0 | 1 | The actors, the projects with their columns, and the labels. Only the owner changes them. |

### Actions

| action | effect | card | description |
| --- | --- | --- | --- |
| catalog.catalog-read | read |  | List the actors, the projects with their columns, and the labels. |
| catalog.actor-create | write | catalog-changed | Add an actor for an agent. A Connection acts as an actor. |
| catalog.actor-rename | write | catalog-changed | Rename an actor. The owner's actor id is owner. |
| catalog.actor-archive | write | catalog-changed | Archive an actor. It can no longer act; what it did stays visible. |
| catalog.actor-restore | write | catalog-changed | Restore an archived actor. |
| catalog.project-create | write | catalog-changed | Create a project. Its board starts with the columns To do, Doing, Review and Done. |
| catalog.project-edit | write | catalog-changed | Change a project's name, its icon (an emoji, or empty for none) or its colour. Its prefix and ticket ids stay the same. |
| catalog.project-move | write | catalog-changed | Move a project to another place in the list of projects. |
| catalog.project-archive | write | catalog-changed | Archive a project. Its tickets are kept and it can be restored. |
| catalog.project-restore | write | catalog-changed | Restore an archived project. |
| catalog.column-add | write | catalog-changed | Add a column to a project's board. |
| catalog.column-rename | write | catalog-changed | Rename a column. |
| catalog.column-kind-set | write | catalog-changed | Set what a column means: todo, doing, waiting or done. |
| catalog.column-move | write | catalog-changed | Move a column to another place on its board. |
| catalog.column-remove | write | catalog-changed | Remove a column. Its tickets move to the column before it, or after it for the first column. |
| catalog.label-create | write | catalog-changed | Create a label. |
| catalog.label-rename | write | catalog-changed | Rename a label. |
| catalog.label-colour-set | write | catalog-changed | Set a label's colour. |
| catalog.label-remove | write | catalog-changed | Remove a label. Tickets no longer show it. |

### Cards

| card | version | view | about |
| --- | --- | --- | --- |
| catalog-changed | 1 | change | What a Call changed in the actors, projects, columns or labels. |

#### Card catalog-changed

```json
{
  "kind": "change",
  "title": "Catalog changed"
}
```

### Agent context

```text
catalog: The actors, the projects with their columns, and the labels. Only the owner changes them.
Tools:
- catalog__catalog-read (reads): List the actors, the projects with their columns, and the labels.
- catalog__actor-create (changes): Add an actor for an agent. A Connection acts as an actor.
- catalog__actor-rename (changes): Rename an actor. The owner's actor id is owner.
- catalog__actor-archive (changes): Archive an actor. It can no longer act; what it did stays visible.
- catalog__actor-restore (changes): Restore an archived actor.
- catalog__project-create (changes): Create a project. Its board starts with the columns To do, Doing, Review and Done.
- catalog__project-edit (changes): Change a project's name, its icon (an emoji, or empty for none) or its colour. Its prefix and ticket ids stay the same.
- catalog__project-move (changes): Move a project to another place in the list of projects.
- catalog__project-archive (changes): Archive a project. Its tickets are kept and it can be restored.
- catalog__project-restore (changes): Restore an archived project.
- catalog__column-add (changes): Add a column to a project's board.
- catalog__column-rename (changes): Rename a column.
- catalog__column-kind-set (changes): Set what a column means: todo, doing, waiting or done.
- catalog__column-move (changes): Move a column to another place on its board.
- catalog__column-remove (changes): Remove a column. Its tickets move to the column before it, or after it for the first column.
- catalog__label-create (changes): Create a label.
- catalog__label-rename (changes): Rename a label.
- catalog__label-colour-set (changes): Set a label's colour.
- catalog__label-remove (changes): Remove a label. Tickets no longer show it.
A tool that changes something after the person says yes waits for them; tell them what you asked for.
```

### Inputs

#### catalog.catalog-read

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {}
}
```

#### catalog.actor-create

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60
    }
  },
  "required": [
    "name"
  ]
}
```

#### catalog.actor-rename

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "actor": {
      "type": "string"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60
    }
  },
  "required": [
    "actor",
    "name"
  ]
}
```

#### catalog.actor-archive

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "actor": {
      "type": "string"
    }
  },
  "required": [
    "actor"
  ]
}
```

#### catalog.actor-restore

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "actor": {
      "type": "string"
    }
  },
  "required": [
    "actor"
  ]
}
```

#### catalog.project-create

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
    "prefix": {
      "type": "string",
      "pattern": "^[A-Z]{2,6}$",
      "description": "The project's id and the start of its ticket ids, like TLK."
    }
  },
  "required": [
    "name",
    "prefix"
  ]
}
```

#### catalog.project-edit

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
      "maxLength": 60
    },
    "icon": {
      "type": "string",
      "maxLength": 16
    },
    "colour": {
      "type": "string",
      "enum": [
        "teal",
        "plum",
        "red",
        "amber",
        "green",
        "grey"
      ]
    }
  },
  "required": [
    "project"
  ]
}
```

#### catalog.project-move

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "project": {
      "type": "string"
    },
    "before": {
      "description": "The id of the project to put it before. Last if left out.",
      "type": "string"
    }
  },
  "required": [
    "project"
  ]
}
```

#### catalog.project-archive

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "project": {
      "type": "string"
    }
  },
  "required": [
    "project"
  ]
}
```

#### catalog.project-restore

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "project": {
      "type": "string"
    }
  },
  "required": [
    "project"
  ]
}
```

#### catalog.column-add

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
      "maxLength": 60
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
    "before": {
      "description": "The id of the column to put it before. Left out, it goes last.",
      "type": "string"
    }
  },
  "required": [
    "project",
    "name",
    "kind"
  ]
}
```

#### catalog.column-rename

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "column": {
      "type": "string"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60
    }
  },
  "required": [
    "column",
    "name"
  ]
}
```

#### catalog.column-kind-set

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "column": {
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
    }
  },
  "required": [
    "column",
    "kind"
  ]
}
```

#### catalog.column-move

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "column": {
      "type": "string"
    },
    "before": {
      "description": "The id of the column to put it before. Left out, it goes last.",
      "type": "string"
    }
  },
  "required": [
    "column"
  ]
}
```

#### catalog.column-remove

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "column": {
      "type": "string"
    }
  },
  "required": [
    "column"
  ]
}
```

#### catalog.label-create

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
    "colour": {
      "type": "string",
      "enum": [
        "teal",
        "plum",
        "red",
        "amber",
        "green",
        "grey"
      ]
    }
  },
  "required": [
    "name",
    "colour"
  ]
}
```

#### catalog.label-rename

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "label": {
      "type": "string"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60
    }
  },
  "required": [
    "label",
    "name"
  ]
}
```

#### catalog.label-colour-set

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "label": {
      "type": "string"
    },
    "colour": {
      "type": "string",
      "enum": [
        "teal",
        "plum",
        "red",
        "amber",
        "green",
        "grey"
      ]
    }
  },
  "required": [
    "label",
    "colour"
  ]
}
```

#### catalog.label-remove

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "label": {
      "type": "string"
    }
  },
  "required": [
    "label"
  ]
}
```

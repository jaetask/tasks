# connections

## Input

[connections.json](connections.json)

## Output

### Domain

| domain | version | card catalogue | about |
| --- | --- | --- | --- |
| connections | 1.0.0 | 1 | The agents and Apps connected to Tasks. Only the owner sees and changes them. |

### Actions

| action | effect | card | description |
| --- | --- | --- | --- |
| connections.connection-list | read | connections | List the Connections: those waiting for approval, connected and revoked. |
| connections.connection-approve | write | connection-changed | Approve a Connection that asked to connect: pick the actor it acts as, and whether it may change things or only read. |
| connections.connection-revoke | write | connection-changed | Revoke a Connection, or turn down one that is waiting. It is cut off at once; what it did stays visible. |

### Cards

| card | version | view | about |
| --- | --- | --- | --- |
| connections | 1 | list | The agents and Apps that asked to connect. |
| connection-changed | 1 | record | A Connection after it was approved or revoked. |

#### Card connections

```json
{
  "kind": "list",
  "title": "Connections",
  "fields": [
    {
      "label": "Name",
      "path": "name"
    },
    {
      "label": "State",
      "path": "state"
    },
    {
      "label": "Actor",
      "path": "actorName"
    },
    {
      "label": "May",
      "path": "may"
    }
  ]
}
```

#### Card connection-changed

```json
{
  "kind": "record",
  "title": "Connection",
  "fields": [
    {
      "label": "Name",
      "path": "name"
    },
    {
      "label": "State",
      "path": "state"
    },
    {
      "label": "Actor",
      "path": "actorName"
    },
    {
      "label": "May",
      "path": "may"
    }
  ]
}
```

### Agent context

```text
connections: The agents and Apps connected to Tasks. Only the owner sees and changes them.
Tools:
- connections__connection-list (reads): List the Connections: those waiting for approval, connected and revoked.
- connections__connection-approve (changes): Approve a Connection that asked to connect: pick the actor it acts as, and whether it may change things or only read.
- connections__connection-revoke (changes): Revoke a Connection, or turn down one that is waiting. It is cut off at once; what it did stays visible.
A tool that changes something after the person says yes waits for them; tell them what you asked for.
```

### Inputs

#### connections.connection-list

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {}
}
```

#### connections.connection-approve

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "connection": {
      "type": "string"
    },
    "actor": {
      "type": "string",
      "description": "The id of an agent's actor. Never the owner."
    },
    "change": {
      "type": "boolean",
      "description": "True if it may change things; false if it may only read."
    }
  },
  "required": [
    "connection",
    "actor",
    "change"
  ]
}
```

#### connections.connection-revoke

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "connection": {
      "type": "string"
    }
  },
  "required": [
    "connection"
  ]
}
```

# input

## Input

[input.json](input.json)

## Output

### Domain

| domain | version | card catalogue | about |
| --- | --- | --- | --- |
| input | 1.0.0 | 1 | Human input: an agent asks the owner a question on a ticket and waits for the answer. |

### Actions

| action | effect | card | description |
| --- | --- | --- | --- |
| input.input-list | read | input-requests | List the questions asked of the owner, oldest first: all of them, or by state, project or ticket. |
| input.input-read | read | input-request | Read one input request, to see whether the owner has answered it. |
| input.input-request | write | input-request | Ask the owner a question on a ticket when you cannot go on without a person's answer. Then wait: read the request again later, or look in your agent inbox. |
| input.input-resolve | write | input-request | Answer an input request. Only the owner can. |
| input.input-withdraw | write | input-request | Take back an input request that no longer needs an answer. Whoever asked or the owner can. |

### Cards

| card | version | view | about |
| --- | --- | --- | --- |
| input-requests | 1 | list | A list of questions asked of the owner. |
| input-request | 1 | record | One question asked of the owner, and its answer. |

#### Card input-requests

```json
{
  "kind": "list",
  "title": "Human input",
  "fields": [
    {
      "label": "Id",
      "path": "id"
    },
    {
      "label": "Ticket",
      "path": "ticket"
    },
    {
      "label": "Asked by",
      "path": "askedByName"
    },
    {
      "label": "Question",
      "path": "question"
    },
    {
      "label": "State",
      "path": "state"
    }
  ]
}
```

#### Card input-request

```json
{
  "kind": "record",
  "title": "Input request",
  "fields": [
    {
      "label": "Ticket",
      "path": "ticket"
    },
    {
      "label": "Question",
      "path": "question"
    },
    {
      "label": "State",
      "path": "state"
    },
    {
      "label": "Answer",
      "path": "answer"
    }
  ]
}
```

### Agent context

```text
input: Human input: an agent asks the owner a question on a ticket and waits for the answer.
Tools:
- input__input-list (reads): List the questions asked of the owner, oldest first: all of them, or by state, project or ticket.
- input__input-read (reads): Read one input request, to see whether the owner has answered it.
- input__input-request (changes): Ask the owner a question on a ticket when you cannot go on without a person's answer. Then wait: read the request again later, or look in your agent inbox.
- input__input-resolve (changes): Answer an input request. Only the owner can.
- input__input-withdraw (changes): Take back an input request that no longer needs an answer. Whoever asked or the owner can.
A tool that changes something after the person says yes waits for them; tell them what you asked for.
```

### Inputs

#### input.input-list

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "state": {
      "type": "string",
      "enum": [
        "awaiting",
        "resolved",
        "withdrawn"
      ]
    },
    "project": {
      "type": "string"
    },
    "ticket": {
      "type": "string"
    }
  }
}
```

#### input.input-read

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "request": {
      "type": "string",
      "description": "An input request id, like q3."
    }
  },
  "required": [
    "request"
  ]
}
```

#### input.input-request

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string"
    },
    "question": {
      "type": "string",
      "minLength": 1,
      "maxLength": 2000
    },
    "context": {
      "default": "",
      "description": "What the owner needs to know to answer.",
      "type": "string",
      "maxLength": 5000
    }
  },
  "required": [
    "ticket",
    "question"
  ]
}
```

#### input.input-resolve

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "request": {
      "type": "string",
      "description": "An input request id, like q3."
    },
    "answer": {
      "type": "string",
      "minLength": 1,
      "maxLength": 5000
    }
  },
  "required": [
    "request",
    "answer"
  ]
}
```

#### input.input-withdraw

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "request": {
      "type": "string",
      "description": "An input request id, like q3."
    }
  },
  "required": [
    "request"
  ]
}
```

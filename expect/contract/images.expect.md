# images

## Input

[images.json](images.json)

## Output

### Domain

| domain | version | card catalogue | about |
| --- | --- | --- | --- |
| images | 1.0.0 | 1 | Images attached to tickets, such as screenshots. |

### Actions

| action | effect | card | description |
| --- | --- | --- | --- |
| images.image-list | read | images | List a ticket's images. |
| images.image-read | read |  | Read one image, with its data as base64. |
| images.image-add | write | image-changed | Attach an image to a ticket, such as a screenshot of the result. |
| images.image-remove | write | image-changed | Remove an image from a ticket. Whoever attached it or the owner can. |

### Cards

| card | version | view | about |
| --- | --- | --- | --- |
| images | 1 | list | A list of a ticket's images. |
| image-changed | 1 | change | What a Call changed in a ticket's images. |

#### Card images

```json
{
  "kind": "list",
  "title": "Images",
  "fields": [
    {
      "label": "Id",
      "path": "id"
    },
    {
      "label": "Name",
      "path": "name"
    },
    {
      "label": "Bytes",
      "path": "size"
    }
  ]
}
```

#### Card image-changed

```json
{
  "kind": "change",
  "title": "Images changed"
}
```

### Agent context

```text
images: Images attached to tickets, such as screenshots.
Tools:
- images__image-list (reads): List a ticket's images.
- images__image-read (reads): Read one image, with its data as base64.
- images__image-add (changes): Attach an image to a ticket, such as a screenshot of the result.
- images__image-remove (changes): Remove an image from a ticket. Whoever attached it or the owner can.
A tool that changes something after the person says yes waits for them; tell them what you asked for.
```

### Inputs

#### images.image-list

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

#### images.image-read

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "image": {
      "type": "string"
    }
  },
  "required": [
    "image"
  ]
}
```

#### images.image-add

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "type": {
      "type": "string",
      "enum": [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp"
      ]
    },
    "data": {
      "type": "string",
      "minLength": 1,
      "maxLength": 2796204,
      "pattern": "^[A-Za-z0-9+/]*={0,2}$",
      "description": "The image as base64, at most 2097152 bytes once decoded."
    }
  },
  "required": [
    "ticket",
    "name",
    "type",
    "data"
  ]
}
```

#### images.image-remove

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "image": {
      "type": "string"
    }
  },
  "required": [
    "image"
  ]
}
```

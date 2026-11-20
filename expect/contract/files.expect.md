# files

## Input

[files.json](files.json)

## Output

### Domain

| domain | version | card catalogue | about |
| --- | --- | --- | --- |
| files | 1.0.0 | 1 | Files attached to tickets, such as logs, documents and videos. |

### Actions

| action | effect | card | description |
| --- | --- | --- | --- |
| files.file-list | read | files | List a ticket's files: their names, types and sizes. The bytes are not included. |
| files.file-locate | read |  | Say where one file's bytes are on this machine, for an agent that runs here and wants to read it. |
| files.file-add | write | file-changed | Attach an uploaded file to a ticket. The page uploads the bytes first and names the upload here; an agent on this machine uses file-add-path. |
| files.file-add-path | write | file-changed | Attach a file that is on this machine to a ticket, by its path, from any folder Tasks can read. The file is copied; the original stays. At most 26214400 bytes, or 209715200 for mp4, webm and mov video. |
| files.file-remove | write | file-changed | Remove a file from a ticket. Whoever attached it or the owner can. |

### Cards

| card | version | view | about |
| --- | --- | --- | --- |
| files | 1 | list | A list of a ticket's files. |
| file-changed | 1 | change | What a Call changed in a ticket's files. |

#### Card files

```json
{
  "kind": "list",
  "title": "Files",
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
      "label": "Type",
      "path": "type"
    },
    {
      "label": "Bytes",
      "path": "size"
    }
  ]
}
```

#### Card file-changed

```json
{
  "kind": "change",
  "title": "Files changed"
}
```

### Agent context

```text
files: Files attached to tickets, such as logs, documents and videos.
Tools:
- files__file-list (reads): List a ticket's files: their names, types and sizes. The bytes are not included.
- files__file-locate (reads): Say where one file's bytes are on this machine, for an agent that runs here and wants to read it.
- files__file-add (changes): Attach an uploaded file to a ticket. The page uploads the bytes first and names the upload here; an agent on this machine uses file-add-path.
- files__file-add-path (changes): Attach a file that is on this machine to a ticket, by its path, from any folder Tasks can read. The file is copied; the original stays. At most 26214400 bytes, or 209715200 for mp4, webm and mov video.
- files__file-remove (changes): Remove a file from a ticket. Whoever attached it or the owner can.
A tool that changes something after the person says yes waits for them; tell them what you asked for.
```

### Inputs

#### files.file-list

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

#### files.file-locate

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "file": {
      "type": "string"
    }
  },
  "required": [
    "file"
  ]
}
```

#### files.file-add

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
      "maxLength": 200
    },
    "type": {
      "type": "string",
      "maxLength": 130,
      "description": "Its media type, such as application/pdf."
    },
    "upload": {
      "type": "string",
      "pattern": "^[a-f0-9]{32}$",
      "description": "The name the upload route gave the uploaded bytes."
    }
  },
  "required": [
    "ticket",
    "name",
    "type",
    "upload"
  ]
}
```

#### files.file-add-path

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ticket": {
      "type": "string"
    },
    "path": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4000,
      "description": "The file's full path on this machine."
    },
    "name": {
      "description": "What to call it. The file's own name if left out.",
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    }
  },
  "required": [
    "ticket",
    "path"
  ]
}
```

#### files.file-remove

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "file": {
      "type": "string"
    }
  },
  "required": [
    "file"
  ]
}
```

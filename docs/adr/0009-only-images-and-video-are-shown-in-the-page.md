# 9. Only images and video are shown in the page; any other file is a download

## Context

A file attached to a ticket is served from the same origin as the page. A file a browser could run, such as HTML or SVG, would run with the signed-in owner's session.

## Decision

`src/files/http.ts` keeps a list of types a browser may show in the page: the video types and PNG, JPEG, GIF and WebP. A file of any other type is sent as application/octet-stream with an attachment disposition, so it is only ever downloaded. A test in `src/files/http.test.ts` holds this for an HTML file.

## Consequences

Adding a type to the list lets the browser show it on the page's origin. Add only types that cannot carry script.

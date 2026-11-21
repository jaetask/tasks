# 8. A file's bytes travel outside Calls

## Context

Tickets carry logs, PDFs and videos. A Call's input is JSON, and a video should play in the page with seeking.

## Decision

The bytes of a file never travel inside a Call. The page uploads them first to a waiting folder, then the Action files.file-add attaches the upload; an agent on the same machine names a path with files.file-add-path. `src/files/http.ts` holds the two HTTP paths: the upload, and a download that answers range requests so a browser can seek in a video. Both ask the App, with the request's cookie, whether someone is signed in before they touch a byte, because the App owns sign-in. The upload applies the same guard the App puts on its own writes: the X-Kit-Request header and a matching origin. When the Call that attaches an upload is refused, the uploaded bytes are removed. Video types a browser plays may be larger than other files; the limits are in `src/files/files.ts`. The page sends a small image as one of the ticket's images, which `src/images/images.ts` keeps beside the image's row and the page shows as thumbnails; anything else becomes a file (`page/activity.tsx`).

## Consequences

Everything about a file other than its bytes is a Call, so it is recorded like any change. The two paths must keep their sign-in check and the upload its header and origin check. Do not add file bytes to an Action's input.

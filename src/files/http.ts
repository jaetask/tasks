import { randomBytes } from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { Readable } from "node:stream";
import type { App } from "@jaetask/open-agent-kit/app";
import { OWNER } from "../catalog/catalog.js";
import { type File, limitFor, mediaType, VIDEO_TYPES } from "./files.js";

const SHOWN = new Set<string>([
  ...VIDEO_TYPES,
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const json = (body: unknown, status = 200) => Response.json(body, { status });

export function filesRoutes(options: {
  app: Pick<App, "calls">;
  db: DatabaseSync;
  dir: string;
  stagedDir: string;
}) {
  const { app, db, dir, stagedDir } = options;

  const upload = async (request: Request): Promise<Response> => {
    if (request.headers.get("x-kit-request") !== "1") {
      return json({ error: "missing X-Kit-Request header" }, 403);
    }
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return json({ error: "cross-origin request" }, 403);
    }
    const query = new URL(request.url).searchParams;
    const ticket = query.get("ticket") ?? "";
    const name = (query.get("name") ?? "").trim().slice(0, 200);
    if (!ticket || !name) return json({ error: "ticket and name are needed" }, 400);
    if (!request.body) return json({ error: "The upload has no data." }, 400);
    const type = mediaType(request.headers.get("content-type"));
    const limit = limitFor(type);
    const stated = Number(request.headers.get("content-length") ?? 0);
    const tooLarge = () =>
      json({ error: `A file of type ${type} can be at most ${limit} bytes.` }, 413);
    if (stated > limit) return tooLarge();

    mkdirSync(stagedDir, { recursive: true });
    const staged = randomBytes(16).toString("hex");
    const path = join(stagedDir, staged);
    const out = createWriteStream(path, { flags: "wx" });
    let size = 0;
    try {
      for await (const piece of request.body as unknown as AsyncIterable<Uint8Array>) {
        size += piece.length;
        if (size > limit) break;
        if (!out.write(piece))
          await new Promise<void>((resolve) => out.once("drain", () => resolve()));
      }
    } finally {
      await new Promise<void>((resolve) => out.end(() => resolve()));
    }
    if (size > limit) {
      rmSync(path, { force: true });
      return tooLarge();
    }
    const outcome = await app.calls.invoke({
      id: `upload:${staged}`,
      action: "files.file-add",
      input: { ticket, name, type, upload: staged },
      principal: { id: OWNER },
      caller: "ui",
    });
    rmSync(path, { force: true });
    return json(outcome);
  };

  const download = (request: Request, id: string): Response => {
    const file = db.prepare("SELECT * FROM files WHERE id = ? AND removed = 0").get(id) as
      | File
      | undefined;
    const path = join(dir, id);
    const size = file ? statSync(path, { throwIfNoEntry: false })?.size : undefined;
    if (!file || size === undefined) return json({ error: "No such file." }, 404);
    const shown = SHOWN.has(file.type);
    const headers: Record<string, string> = {
      "content-type": shown ? file.type : "application/octet-stream",
      "content-disposition": `${shown ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "accept-ranges": "bytes",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "cache-control": "private, max-age=3600",
    };
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
    let start = 0;
    let end = size - 1;
    let status = 200;
    if (range && (range[1] || range[2])) {
      if (range[1]) {
        start = Number(range[1]);
        if (range[2]) end = Math.min(Number(range[2]), size - 1);
      } else {
        start = Math.max(0, size - Number(range[2]));
      }
      if (start > end || start >= size) {
        return new Response(null, {
          status: 416,
          headers: { "content-range": `bytes */${size}` },
        });
      }
      status = 206;
      headers["content-range"] = `bytes ${start}-${end}/${size}`;
    }
    headers["content-length"] = String(end - start + 1);
    if (request.method === "HEAD") return new Response(null, { status, headers });
    const body = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream;
    return new Response(body, { status, headers });
  };

  return async (request: Request): Promise<Response | null> => {
    const { pathname } = new URL(request.url);
    if (pathname !== "/api/files" && !pathname.startsWith("/api/files/")) return null;
    if (pathname === "/api/files" && request.method === "POST") return upload(request);
    const id = decodeURIComponent(pathname.slice("/api/files/".length));
    if (/^fl\d+$/.test(id) && (request.method === "GET" || request.method === "HEAD")) {
      return download(request, id);
    }
    return json({ error: "No such file." }, 404);
  };
}

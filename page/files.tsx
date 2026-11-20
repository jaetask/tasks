// A ticket's files: a video plays in place; any other file is a chip that downloads it.
import { Button } from "@jaetask/toolkit/ui/button";
import { IconDownload, IconFile, IconX } from "@tabler/icons-react";
import type { TicketFile } from "./api.js";
import { useApp, useRead } from "./app.js";

const VIDEO = ["video/mp4", "video/webm", "video/quicktime"];

/** A size as a person reads it: 812 B, 34 KB, 1.2 MB. */
export const sizeOf = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export function FilesSection({ ticket, open }: { ticket: string; open: boolean }) {
  const { act } = useApp();
  const files = useRead<TicketFile[]>("files.file-list", { ticket }) ?? [];
  if (files.length === 0) return null;
  const remove = (file: TicketFile) => (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={`Remove the file ${file.name}`}
      className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
      onClick={() => void act("files.file-remove", { file: file.id })}
    >
      <IconX aria-hidden />
    </Button>
  );
  const videos = files.filter((f) => VIDEO.includes(f.type));
  const others = files.filter((f) => !VIDEO.includes(f.type));
  return (
    <section id="files" aria-label="Files" className="grid gap-3">
      {videos.map((file) => (
        <figure key={file.id} className="file group m-0 grid gap-1">
          {/* biome-ignore lint/a11y/useMediaCaption: a video someone attached has no captions */}
          <video
            controls
            preload="metadata"
            src={`/api/files/${file.id}`}
            className="max-h-[28rem] w-full rounded-lg border bg-black"
          />
          <figcaption className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">{file.name}</span>
            <span className="shrink-0">{sizeOf(file.size)}</span>
            {open && remove(file)}
          </figcaption>
        </figure>
      ))}
      {others.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {others.map((file) => (
            <span
              key={file.id}
              className="file group inline-flex max-w-full items-center gap-2 rounded-lg border bg-card py-1 pr-1 pl-2 text-sm"
            >
              <IconFile size={16} aria-hidden className="shrink-0 text-muted-foreground" />
              <a
                href={`/api/files/${file.id}`}
                download={file.name}
                className="min-w-0 truncate hover:underline"
              >
                {file.name}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">{sizeOf(file.size)}</span>
              <IconDownload size={14} aria-hidden className="shrink-0 text-muted-foreground" />
              {open && remove(file)}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

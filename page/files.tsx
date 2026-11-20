// A ticket's files: a video plays in place; any other file is a chip that downloads it.
import { Button } from "@jaetask/toolkit/ui/button";
import { FileChip, VideoFigure } from "@jaetask/toolkit/suite";
import { IconX } from "@tabler/icons-react";
import type { TicketFile } from "./api.js";
import { useApp, useRead } from "./app.js";

const VIDEO = ["video/mp4", "video/webm", "video/quicktime"];

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
        <VideoFigure
          key={file.id}
          name={file.name}
          size={file.size}
          src={`/api/files/${file.id}`}
          action={open && remove(file)}
        />
      ))}
      {others.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {others.map((file) => (
            <FileChip
              key={file.id}
              name={file.name}
              size={file.size}
              href={`/api/files/${file.id}`}
              action={open && remove(file)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

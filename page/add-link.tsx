// The dialog that adds a link to a ticket: its address and, if wanted, what to call it.
import { Button } from "@jaetask/toolkit/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@jaetask/toolkit/ui/dialog";
import { Input } from "@jaetask/toolkit/ui/input";
import { Label } from "@jaetask/toolkit/ui/label";
import { useState } from "react";
import { useApp } from "./app.js";
import { knownService, ServiceIcon } from "./links.js";

export function AddLinkDialog({
  ticket,
  open,
  onOpenChange,
}: {
  ticket: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { act } = useApp();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setUrl("");
      setTitle("");
    }
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      {open && (
        <DialogContent className="max-w-md">
          {/* A form, so Enter in either box adds the link with what the boxes hold. */}
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const address = String(data.get("url") ?? "").trim();
              const name = String(data.get("title") ?? "").trim();
              if (!address) return;
              void act("tickets.ticket-link-add", {
                ticket,
                url: address,
                ...(name ? { title: name } : {}),
              }).then((done) => done && close(false));
            }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ServiceIcon url={url.trim()} size={18} />
                {`Add link to ${ticket}`}
              </DialogTitle>
              <DialogDescription>
                A web address that belongs to this ticket, such as a pull request.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="link-url">{`${knownService(url.trim()) || "Link"} URL`}</Label>
              <Input
                autoFocus
                id="link-url"
                name="url"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="link-title">
                Title <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="link-title"
                name="title"
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!url.trim()}>
                Add link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}

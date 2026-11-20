// When a link is added to a ticket, Tasks reads the page's title once and records it with the
// Action tickets.ticket-link-describe. A link whose page states no title stays as its address.
import type { App } from "@jaetask/open-agent-kit/app";
import { OWNER } from "../catalog/catalog.js";
import type { ReadTitle } from "./page-title.js";
import type { Ticket } from "./tickets.js";

type LinkTitles = {
  /** Resolves when every title being read has been recorded. */
  idle(): Promise<void>;
};

export function createLinkTitles(options: {
  app: Pick<App, "calls" | "onChange">;
  read: ReadTitle;
  log(line: string): void;
}): LinkTitles {
  const { app, read, log } = options;
  const working = new Set<Promise<void>>();
  let n = 0;
  const name = async (ticket: string, url: string, from: string) => {
    const found = await read(url);
    if (!found?.title) return;
    const current = await app.calls.invoke({
      id: `link-title:${from}:${++n}:read`,
      action: "tickets.ticket-read",
      input: { ticket },
      principal: { id: OWNER },
      caller: "app",
    });
    if (current.state !== "succeeded") return;
    const link = (current.output as Ticket).links.find((l) => l.url === url && l.title === "");
    if (!link) return;
    await app.calls.invoke({
      id: `link-title:${from}:${n}`,
      action: "tickets.ticket-link-describe",
      input: { link: link.id, ...found },
      principal: { id: OWNER },
      caller: "app",
    });
  };
  app.onChange(({ call, changes }) => {
    const input = call.input as { ticket?: string; url?: string; links?: string[] } | undefined;
    let wanted: [string, string][] = [];
    if (call.action === "tickets.ticket-link-add" && input?.ticket && input.url) {
      wanted = [[input.ticket, input.url]];
    } else if (call.action === "tickets.ticket-create" && input?.links?.length) {
      const made = changes.find((c) => c.subject === "ticket" && c.kind === "created")?.id ?? "";
      wanted = input.links.map((url) => [made, url]);
    }
    for (const [ticket, url] of wanted) {
      if (!ticket) continue;
      const work: Promise<void> = name(ticket, url, call.id)
        .catch((error: Error) => log(`Link titles: ${error.message}`))
        .finally(() => working.delete(work));
      working.add(work);
    }
  });
  return {
    idle: async () => {
      while (working.size > 0) await Promise.all(working);
    },
  };
}

import { toast } from "@jaetask/toolkit/hooks";
import { AppShell, CenteredPage, type LinkComponent, LinkProvider } from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Input } from "@jaetask/toolkit/ui/input";
import { ToastAction } from "@jaetask/toolkit/ui/toast";
import { Toaster } from "@jaetask/toolkit/ui/toaster";
import {
  IconArchive,
  IconArrowLeft,
  IconFilter,
  IconFolder,
  IconHelpCircle,
  IconHistory,
  IconLayoutGrid,
  IconMapPin,
  IconMessage,
  IconPlug,
  IconTag,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  type Catalog,
  type Change,
  type Connection,
  call,
  type InputRequest,
  type Outcome,
  type TicketFile,
  OWNER,
  refusal,
  uploadFile,
} from "./api.js";
import { type App, AppContext, useApp, useRead } from "./app.js";
import { OverviewPage } from "./overview.js";
import { BacklogPage, BoardPage } from "./board.js";
import { FeaturePage, FeaturesPage } from "./features.js";
import { NewTicketDialog } from "./new-ticket.js";
import { IntakePage } from "./inbox.js";
import { ArchivePage, ChangesPage, ConnectionsPage, InputPage, RepliesPage } from "./pages.js";
import { SECTIONS, type Section, SettingsPage } from "./settings.js";
import { ProjectsNav } from "./projects-nav.js";
import { SearchDialog, useSearchKey } from "./search.js";
import { TicketPage } from "./ticket.js";

const hashPath = () => window.location.hash.replace(/^#/, "") || "/overview";
function useHashPath() {
  const [path, setPath] = useState(hashPath);
  useEffect(() => {
    const on = () => setPath(hashPath());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return path;
}
const go = (path: string) => {
  window.location.hash = path;
};
const HashLink: LinkComponent = ({ href, children, ...rest }) => (
  <a href={href.startsWith("/") ? `#${href}` : href} {...rest}>
    {children}
  </a>
);

const ICONS = {
  overview: <IconLayoutGrid size={16} aria-hidden />,
  input: <IconHelpCircle size={16} aria-hidden />,
  replies: <IconMessage size={16} aria-hidden />,
  archive: <IconArchive size={16} aria-hidden />,
  connections: <IconPlug size={16} aria-hidden />,
  changes: <IconHistory size={16} aria-hidden />,
};

const SETTINGS_ICONS: Record<Section, React.ReactNode> = {
  you: <IconUser size={16} aria-hidden />,
  actors: <IconUsers size={16} aria-hidden />,
  projects: <IconFolder size={16} aria-hidden />,
  labels: <IconTag size={16} aria-hidden />,
  locations: <IconMapPin size={16} aria-hidden />,
  steps: <IconFilter size={16} aria-hidden />,
};

function Setup({ onNamed }: { onNamed: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <CenteredPage
      title="What is your name?"
      line="Your changes show under this name. Your agents get their own names when they connect."
    >
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onNamed(name.trim());
        }}
      >
        <Input
          aria-label="Your name"
          placeholder="Your name"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Button type="submit">Start</Button>
      </form>
    </CenteredPage>
  );
}

function Page({ path }: { path: string }) {
  const { catalog } = useApp();
  const parts = path.split("/").filter(Boolean);
  const [a, b, c, d] = parts;
  if (a === "p") {
    const project = catalog.projects.find((p) => p.id === b);
    if (!project) return <OverviewPage />;
    if (c === "intake") return <IntakePage project={project} />;
    if (c === "backlog") return <BacklogPage project={project} />;
    if (c === "features" && d) return <FeaturePage key={d} project={project} id={d} />;
    if (c === "features") return <FeaturesPage project={project} />;
    return <BoardPage project={project} />;
  }
  if (a === "t" && b) {
    return <TicketPage key={b} id={b} />;
  }
  if (a === "settings") {
    const section = SECTIONS.find(([id]) => id === b)?.[0] ?? "you";
    return <SettingsPage section={section as Section} />;
  }
  if (a === "input") return <InputPage />;
  if (a === "replies") return <RepliesPage />;
  if (a === "archive") return <ArchivePage />;
  if (a === "changes") return <ChangesPage />;
  if (a === "connections") return <ConnectionsPage />;
  return <OverviewPage />;
}

function Shell({ path }: { path: string }) {
  const [searching, setSearching] = useSearchKey();
  const awaiting = useRead<InputRequest[]>("input.input-list", { state: "awaiting" }) ?? [];
  const asking = (useRead<Connection[]>("connections.connection-list") ?? []).filter(
    (c) => c.state === "pairing",
  );
  const parts = path.split("/").filter(Boolean);
  const top = parts[0] ?? "overview";
  const nav = [
    { href: "/overview", label: "Overview", icon: ICONS.overview, current: top === "overview" },
    {
      href: "/input",
      label: "Human input",
      icon: ICONS.input,
      current: top === "input",
      ...(awaiting.length > 0 ? { count: awaiting.length } : {}),
    },
    { href: "/replies", label: "Agent inbox", icon: ICONS.replies, current: top === "replies" },
  ];
  const bottom = [
    { href: "/archive", label: "Archive", icon: ICONS.archive, current: top === "archive" },
    {
      href: "/connections",
      label: "Connections",
      icon: ICONS.connections,
      current: top === "connections",
      ...(asking.length > 0 ? { count: asking.length } : {}),
    },
    { href: "/changes", label: "Changes", icon: ICONS.changes, current: top === "changes" },
  ];
  if (top === "settings") {
    const section = SECTIONS.find(([id]) => id === parts[1])?.[0] ?? "you";
    return (
      <AppShell
        app={{ name: "Tasks", href: "/overview" }}
        bar={false}
        nav={[
          {
            href: "/overview",
            label: "Back to Tasks",
            icon: <IconArrowLeft size={16} aria-hidden />,
          },
          ...SECTIONS.map(([id, label]) => ({
            href: `/settings/${id}`,
            label,
            icon: SETTINGS_ICONS[id],
            current: section === id,
          })),
        ]}
      >
        <Page path={path} />
      </AppShell>
    );
  }
  return (
    <AppShell
      app={{ name: "Tasks", href: "/overview" }}
      bar={false}
      nav={nav}
      bottom={bottom}
      side={(collapsed) => <ProjectsNav collapsed={collapsed} />}
      settingsHref="/settings"
      onSearch={() => setSearching(true)}
    >
      <Page path={path} />
      <NewTicketDialog />
      <SearchDialog open={searching} onOpenChange={setSearching} />
    </AppShell>
  );
}

function TasksApp({ path }: { path: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: read again whenever anything changed
  useEffect(() => {
    void call("catalog.catalog-read").then((outcome) => {
      if (outcome.state === "succeeded") setCatalog(outcome.output as Catalog);
    });
  }, [version]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `path` is what is watched
  useEffect(() => bump(), [path, bump]);

  useEffect(() => {
    const events = new EventSource("/events");
    events.addEventListener("change", bump);
    return () => events.close();
  }, [bump]);

  const act = useCallback(
    async <T,>(action: string, input: unknown): Promise<T | null> => {
      const outcome: Outcome = await call(action, input);
      const refused = refusal(outcome);
      if (refused !== null) toast({ variant: "destructive", description: refused, duration: 6000 });
      else if (outcome.changes?.some((c) => c.kind === "deleted")) {
        void call("history.change-list", { limit: 1 }).then((listed) => {
          const last = (listed.output as Change[] | undefined)?.[0];
          if (!last) return;
          const said = toast({
            description: last.summary.charAt(0).toUpperCase() + last.summary.slice(1),
            duration: 6000,
            ...(last.undoable
              ? {
                  action: (
                    <ToastAction
                      altText="Undo"
                      onClick={() => {
                        said.dismiss();
                        void call("history.change-undo", { change: last.id }).then(bump);
                      }}
                    >
                      Undo
                    </ToastAction>
                  ),
                }
              : {}),
          });
        });
      }
      bump();
      return refused === null ? (outcome.output as T) : null;
    },
    [bump],
  );

  const upload = useCallback(
    async (ticket: string, file: File): Promise<TicketFile | null> => {
      const answer = await uploadFile(ticket, file).catch(() => ({ error: "The upload failed." }));
      const refused = "error" in answer ? answer.error : refusal(answer);
      if (refused !== null)
        toast({ variant: "destructive", description: `${file.name}: ${refused}`, duration: 6000 });
      bump();
      return refused === null ? ((answer as Outcome).output as TicketFile) : null;
    },
    [bump],
  );

  if (!catalog) return null;
  const [page = "", search = ""] = path.split("?");
  const app: App = {
    catalog,
    version,
    act,
    go,
    upload,
    path: page,
    query: new URLSearchParams(search),
  };
  const named = catalog.actors.find((a) => a.id === OWNER)?.name !== "";
  return (
    <AppContext.Provider value={app}>
      {named ? (
        <Shell path={page} />
      ) : (
        <Setup onNamed={(name) => void act("catalog.actor-rename", { actor: OWNER, name })} />
      )}
      <Toaster />
    </AppContext.Provider>
  );
}

function Root() {
  const path = useHashPath();
  return (
    <LinkProvider link={HashLink} location={path}>
      <TasksApp path={path} />
    </LinkProvider>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Root />);

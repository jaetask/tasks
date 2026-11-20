// Tasks' page, built from @jaetask/toolkit: the app shell, panels, lists and
// edit pages. Pages are routed on the hash. Everything the page reads or
// changes goes through POST /api/calls, the same Call pipeline agents use.

import { toast } from "@jaetask/toolkit/hooks";
import { AppShell, CenteredPage, type LinkComponent, LinkProvider } from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Input } from "@jaetask/toolkit/ui/input";
import { Toaster } from "@jaetask/toolkit/ui/toaster";
import {
  IconArchive,
  IconHelpCircle,
  IconHistory,
  IconLayoutGrid,
  IconMessage,
  IconPlug,
} from "@tabler/icons-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  api,
  type Catalog,
  type Connection,
  call,
  type InputRequest,
  type Outcome,
  OWNER,
  refusal,
  whenSignedOut,
} from "./api.js";
import { type App, AppContext, type Narrow, useApp, useRead } from "./app.js";
import { BacklogPage, BoardPage } from "./board.js";
import {
  ActorEdit,
  ColumnsEdit,
  ConnectionApprove,
  FeatureEdit,
  LabelEdit,
  LocationEdit,
  OwnerEdit,
  ProjectEdit,
  StepEdit,
  TicketEdit,
  TicketNew,
} from "./edits.js";
import { IntakePage } from "./inbox.js";
import {
  ArchivePage,
  ChangesPage,
  ConnectionsPage,
  FeaturesPage,
  InputPage,
  OverviewPage,
  RepliesPage,
  SettingsPage,
} from "./pages.js";
import { ProjectsNav } from "./projects-nav.js";
import { TicketPage } from "./ticket.js";

// ---------- Routing on the hash ----------

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

// ---------- Signing in, and the first start ----------

function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const answer = await api<{ signedIn?: boolean; error?: string }>("/api/session", {
      method: "POST",
      body: { secret },
    });
    setSecret("");
    setError(answer.signedIn ? "" : (answer.error ?? "Could not sign in."));
    if (answer.signedIn) onSignedIn();
  };
  return (
    <CenteredPage
      title="Sign in to Tasks"
      line="Enter the setup secret Tasks printed when it first started."
    >
      <form className="flex gap-2" onSubmit={submit}>
        <Input
          type="password"
          aria-label="Setup secret"
          autoComplete="current-password"
          placeholder="Setup secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          required
        />
        <Button type="submit">Sign in</Button>
      </form>
      {error && (
        <p className="m-0 text-destructive" role="alert">
          {error}
        </p>
      )}
    </CenteredPage>
  );
}

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

// ---------- The pages ----------

function Page({ path, onSignOut }: { path: string; onSignOut: () => void }) {
  const { catalog } = useApp();
  const parts = path.split("/").filter(Boolean);
  const [a, b, c, d] = parts;
  if (a === "p") {
    const project = catalog.projects.find((p) => p.id === b);
    if (!project) return <OverviewPage />;
    if (c === "intake") return <IntakePage project={project} />;
    if (c === "backlog") return <BacklogPage project={project} />;
    if (c === "features" && d) {
      return <FeatureEdit project={project} id={d === "new" ? null : d} />;
    }
    if (c === "features") return <FeaturesPage project={project} />;
    if (c === "new") return <TicketNew project={project} />;
    if (c === "columns") return <ColumnsEdit project={project} />;
    if (c === "edit") return <ProjectEdit key={project.id} project={project} />;
    return <BoardPage project={project} />;
  }
  if (a === "t" && b) {
    if (c === "edit" || c === "place") return <TicketEdit id={b} part={c} />;
    return <TicketPage key={b} id={b} />;
  }
  if (a === "steps" && b) return <StepEdit id={b === "new" ? null : b} />;
  if (a === "connections" && b) return <ConnectionApprove id={b} />;
  if (a === "settings") {
    if (b === "owner") return <OwnerEdit />;
    if (b === "actors" && c) return <ActorEdit key={c} id={c === "new" ? null : c} />;
    if (b === "labels" && c) return <LabelEdit key={c} id={c === "new" ? null : c} />;
    if (b === "locations" && c) return <LocationEdit key={c} id={c === "new" ? null : c} />;
    if (b === "projects" && c === "new") return <ProjectEdit project={null} />;
    return <SettingsPage onSignOut={onSignOut} />;
  }
  if (a === "input") return <InputPage />;
  if (a === "replies") return <RepliesPage />;
  if (a === "archive") return <ArchivePage />;
  if (a === "changes") return <ChangesPage />;
  if (a === "connections") return <ConnectionsPage />;
  return <OverviewPage />;
}

function Shell({ path, onSignOut }: { path: string; onSignOut: () => void }) {
  const { catalog } = useApp();
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
  const here = top === "p" ? parts[1] : undefined;
  const project = catalog.projects.find((p) => p.id === here);
  const title = project
    ? project.name
    : top === "t"
      ? (parts[1] ?? "Ticket")
      : ([...nav, ...bottom].find((n) => n.current)?.label ??
        (top === "settings" ? "Settings" : "Tasks"));
  return (
    <AppShell
      app={{ name: "Tasks", href: "/overview" }}
      title={title}
      nav={nav}
      bottom={bottom}
      side={(collapsed) => <ProjectsNav collapsed={collapsed} />}
      settingsHref="/settings"
    >
      <Page path={path} onSignOut={onSignOut} />
    </AppShell>
  );
}

function Signed({ path, onSignOut }: { path: string; onSignOut: () => void }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [version, setVersion] = useState(0);
  const [narrow, setNarrow] = useState<Narrow>({ text: "", actor: "", feature: "" });
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: read again whenever anything changed
  useEffect(() => {
    void call("catalog.catalog-read").then((outcome) => {
      if (outcome.state === "succeeded") setCatalog(outcome.output as Catalog);
    });
  }, [version]);

  // Going to another page reads again too: a request to connect is not a change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `path` is what is watched
  useEffect(() => bump(), [path, bump]);

  // A change from anyone, such as an agent, shows as it happens.
  useEffect(() => {
    const events = new EventSource("/events");
    events.addEventListener("change", bump);
    return () => events.close();
  }, [bump]);

  const act = useCallback(
    async <T,>(action: string, input: unknown): Promise<T | null> => {
      const outcome: Outcome = await call(action, input);
      const refused = refusal(outcome);
      if (refused !== null) toast({ variant: "destructive", description: refused });
      else if (outcome.card?.html) {
        // The Card arrives as HTML already escaped by the App's cardHtml.
        // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped by the App
        toast({ description: <span dangerouslySetInnerHTML={{ __html: outcome.card.html }} /> });
      }
      bump();
      return refused === null ? (outcome.output as T) : null;
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
    narrow,
    setNarrow,
    path: page,
    query: new URLSearchParams(search),
  };
  const named = catalog.actors.find((a) => a.id === OWNER)?.name !== "";
  return (
    <AppContext.Provider value={app}>
      {named ? (
        <Shell path={page} onSignOut={onSignOut} />
      ) : (
        <Setup onNamed={(name) => void act("catalog.actor-rename", { actor: OWNER, name })} />
      )}
      <Toaster />
    </AppContext.Provider>
  );
}

function Root() {
  const path = useHashPath();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  whenSignedOut(() => setSignedIn(false));
  useEffect(() => {
    void api<{ signedIn: boolean }>("/api/session").then((s) => setSignedIn(s.signedIn));
  }, []);
  const signOut = async () => {
    await api("/api/session", { method: "DELETE" });
    setSignedIn(false);
  };
  return (
    <LinkProvider link={HashLink} location={path}>
      {signedIn === null ? null : signedIn ? (
        <Signed path={path} onSignOut={signOut} />
      ) : (
        <SignIn onSignedIn={() => setSignedIn(true)} />
      )}
    </LinkProvider>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Root />);

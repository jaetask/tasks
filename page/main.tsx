// Tasks' page, built from @jaetask/toolkit: the app shell, panels, lists and
// edit pages. Pages are routed on the hash. Everything the page reads or
// changes goes through POST /api/calls, the same Call pipeline agents use.
import "@jaetask/toolkit/styles.css";
import "./page.css";
import {
  AppShell,
  Avatar,
  Button,
  CenteredPage,
  type Group,
  Input,
  type LinkComponent,
  Notice,
  SideLink,
  SideSection,
  ToolkitProvider,
} from "@jaetask/toolkit";
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  api,
  type Catalog,
  type Connection,
  call,
  type InputRequest,
  OWNER,
  type Outcome,
  refusal,
  whenSignedOut,
} from "./api.js";
import { type App, AppContext, type Narrow, useApp, useRead } from "./app.js";
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
  BacklogPage,
  BoardPage,
  ChangesPage,
  ConnectionsPage,
  FeaturesPage,
  InputPage,
  OverviewPage,
  RepliesPage,
  SettingsPage,
} from "./pages.js";
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

const icon = (d: string): ReactNode => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ICONS = {
  overview: icon("M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z"),
  input: icon(
    "M12 17v.01M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18",
  ),
  replies: icon("M4 5h16v11H9l-5 4z"),
  archive: icon("M4 5h16v4H4zM6 9v10h12V9M10 13h4"),
  connections: icon("M9 7V3M15 7V3M7 7h10v5a5 5 0 0 1-10 0zM12 17v4"),
  changes: icon("M12 7v5l3 2M4 12a8 8 0 1 0 3-6.2M4 4v4h4"),
};

// The projects this browser has been to, so that each stays open in the
// sidebar beside the others. Remembered in this browser only.
const VISITED = "tasks.projects.visited";
function useVisited(here: string | undefined): string[] {
  const [visited, setVisited] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(VISITED) ?? "[]");
      return Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (!here || visited.includes(here)) return;
    const next = [...visited, here];
    setVisited(next);
    try {
      localStorage.setItem(VISITED, JSON.stringify(next));
    } catch {
      // Without storage the sidebar still works; it forgets on reload.
    }
  }, [here, visited]);
  return here && !visited.includes(here) ? [...visited, here] : visited;
}

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
      <form className="composer" onSubmit={submit}>
        <Input
          type="password"
          aria-label="Setup secret"
          autoComplete="current-password"
          placeholder="Setup secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          required
        />
        <Button type="submit" variant="primary">
          Sign in
        </Button>
      </form>
      {error && (
        <p className="problem" role="alert">
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
        className="composer"
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
        <Button type="submit" variant="primary">
          Start
        </Button>
      </form>
    </CenteredPage>
  );
}

// ---------- The result of the last change ----------

type Result = { html?: string; text?: string; refused?: boolean };

function ResultCard({ result, onDismiss }: { result: Result | null; onDismiss: () => void }) {
  if (!result) return null;
  return (
    <Notice tone={result.refused ? "refused" : "done"} floating onDismiss={onDismiss}>
      {result.html ? (
        // The Card arrives as HTML already escaped by the App's cardHtml.
        // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped by the App
        <span dangerouslySetInnerHTML={{ __html: result.html }} />
      ) : (
        result.text
      )}
    </Notice>
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
  const { catalog, act } = useApp();
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
  const screen = parts[2] ?? "board";
  const active = catalog.projects.filter((p) => !p.archived);
  const visited = useVisited(here);
  const groups: Group[] = [
    {
      label: "Projects",
      href: "/settings",
      empty: "No projects yet. Create one in Settings.",
      // The new order is saved one move at a time, from the end.
      onReorder: (ids) => {
        void (async () => {
          for (let i = ids.length - 1; i >= 0; i--) {
            const next = ids[i + 1];
            await act("catalog.project-move", {
              project: ids[i],
              ...(next ? { before: next } : {}),
            });
          }
        })();
      },
      items: active.map((p) => ({
        id: p.id,
        href: `/p/${p.id}/board`,
        label: p.name,
        avatar: <Avatar name={p.name} colour={p.colour} {...(p.icon ? { emoji: p.icon } : {})} />,
        current: here === p.id,
        // A project you have been to stays open until you close it.
        defaultOpen: visited.includes(p.id),
        children: (
          <SideSection label={p.id}>
            {(
              [
                ["intake", "Intake", "New ideas and requests"],
                ["backlog", "Backlog", "Waiting, off the board"],
                ["board", "Board", "Tickets being worked on"],
                ["features", "Features", "The parts of the project"],
              ] as const
            ).map(([id, label, line]) => (
              <SideLink
                key={id}
                href={`/p/${p.id}/${id}`}
                label={label}
                line={line}
                current={
                  here === p.id && (screen === id || (id === "board" && screen === "columns"))
                }
              />
            ))}
          </SideSection>
        ),
      })),
    },
  ];
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
      groups={groups}
      settingsHref="/settings"
    >
      <Page path={path} onSignOut={onSignOut} />
    </AppShell>
  );
}

function Signed({ path, onSignOut }: { path: string; onSignOut: () => void }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
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

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), 6000);
    return () => clearTimeout(timer);
  }, [result]);

  const act = useCallback(
    async <T,>(action: string, input: unknown): Promise<T | null> => {
      const outcome: Outcome = await call(action, input);
      const refused = refusal(outcome);
      if (refused !== null) setResult({ text: refused, refused: true });
      else if (outcome.card?.html) setResult({ html: outcome.card.html });
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
      <ResultCard result={result} onDismiss={() => setResult(null)} />
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
    <ToolkitProvider link={HashLink} location={path}>
      {signedIn === null ? null : signedIn ? (
        <Signed path={path} onSignOut={signOut} />
      ) : (
        <SignIn onSignedIn={() => setSignedIn(true)} />
      )}
    </ToolkitProvider>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Root />);

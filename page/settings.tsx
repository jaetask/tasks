import {
  ColourSwatches,
  DEFAULT_PROJECT_COLOUR,
  EmptyLine,
  Field,
  FormDialog,
  IconAction,
  IconAvatar,
  InlineText,
  ListCard,
  type MenuEntry,
  Panel,
  ProjectIcon,
  ProjectIconPicker,
  RowMenu,
  WorkPage,
} from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Input } from "@jaetask/toolkit/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@jaetask/toolkit/ui/popover";
import { IconGripVertical, IconPlus } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import {
  type Actor,
  COLOURS,
  type Colour,
  type Label,
  type Location,
  OWNER,
  type Project,
  type Step,
  type Usage,
} from "./api.js";
import { actorName, useApp, useRead } from "./app.js";
import { CONDITIONS } from "./inbox.js";
import { namedColour, projectLook, Tick } from "./local.js";
import { LabelDot } from "./pickers.js";
import { KIND_NAMES, StepDialog } from "./step-form.js";

export const SECTIONS = [
  ["you", "You"],
  ["actors", "Actors"],
  ["projects", "Projects"],
  ["labels", "Labels"],
  ["locations", "Locations"],
  ["steps", "Intake steps"],
  ["browser", "This browser"],
] as const;
export type Section = (typeof SECTIONS)[number][0];

const count = (n: number | undefined, one: string, many: string) =>
  n ? `${n} ${n === 1 ? one : many}` : "";

function SettingRow({
  mark,
  children,
  line,
  menu,
  archived,
  ...rest
}: {
  mark?: ReactNode;
  children: ReactNode;
  line?: ReactNode;
  menu?: ReactNode;
  archived?: boolean;
} & React.ComponentProps<"li">) {
  return (
    <li className="tk-list-row group" data-archived={archived ? "true" : undefined} {...rest}>
      {mark}
      <span className={`flex min-w-0 flex-1 items-center gap-3 ${archived ? "opacity-60" : ""}`}>
        <span className="flex min-w-0 font-medium">{children}</span>
        {archived && <span className="text-xs text-muted-foreground">Archived</span>}
      </span>
      {line && <span className="shrink-0 text-xs text-muted-foreground">{line}</span>}
      {menu}
    </li>
  );
}

function ActorMark({ actor }: { actor: Actor }) {
  const { act } = useApp();
  const set = (icon: string, colour: string) =>
    void act("catalog.actor-icon-set", { actor: actor.id, icon, colour });
  const colour = actor.colour || DEFAULT_PROJECT_COLOUR;
  return (
    <ProjectIconPicker
      title="Icon and colour"
      icon={actor.icon}
      colour={colour}
      onIcon={(icon) => set(icon, colour)}
      onColour={(next) => set(/^[a-z-]+$/.test(actor.icon) ? actor.icon : "person", next)}
    >
      <Button
        variant="ghost"
        aria-label={`Icon and colour of ${actor.name}`}
        className="size-8 shrink-0 rounded-full p-0"
      >
        <IconAvatar name={actor.name} icon={actor.icon} colour={actor.colour} size={28} />
      </Button>
    </ProjectIconPicker>
  );
}

function YouSection() {
  const { catalog, act } = useApp();
  const owner = catalog.actors.find((a) => a.id === OWNER);
  if (!owner) return null;
  return (
    <WorkPage title="You" help="Your changes show under this name and mark.">
      <ListCard>
        <SettingRow mark={<ActorMark actor={owner} />}>
          <InlineText
            value={owner.name}
            label="Your name"
            onSave={(name) => void act("catalog.actor-rename", { actor: OWNER, name })}
          />
        </SettingRow>
      </ListCard>
    </WorkPage>
  );
}

function ActorsSection({ usage }: { usage: Usage | undefined }) {
  const { catalog, act } = useApp();
  const [archived, setArchived] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("robot");
  const [colour, setColour] = useState(DEFAULT_PROJECT_COLOUR);
  const actors = catalog.actors.filter((a) => a.id !== OWNER && (archived || !a.archived));
  return (
    <WorkPage
      title="Actors"
      help="An actor is the name an agent's work shows under. A Connection acts as an actor."
      action={
        <IconAction
          primary
          label="New actor"
          icon={<IconPlus aria-hidden />}
          onClick={() => setAdding(true)}
        />
      }
    >
      <Tick label="Show archived" checked={archived} onChange={setArchived} />
      {actors.length > 0 ? (
        <ListCard>
          {actors.map((a) => (
            <SettingRow
              key={a.id}
              archived={a.archived}
              mark={<ActorMark actor={a} />}
              line={count(usage?.actors[a.id], "open ticket", "open tickets")}
              menu={
                <RowMenu
                  label={`Actor ${a.name}`}
                  items={[
                    { label: "Rename", onSelect: () => setRenaming(a.id) },
                    {
                      label: a.archived ? "Restore" : "Archive",
                      onSelect: () =>
                        void act(a.archived ? "catalog.actor-restore" : "catalog.actor-archive", {
                          actor: a.id,
                        }),
                    },
                    "line",
                    {
                      label: "Delete",
                      onSelect: () => void act("catalog.actor-delete", { actor: a.id }),
                    },
                  ]}
                />
              }
            >
              <InlineText
                value={a.name}
                label={`Rename ${a.name}`}
                editing={renaming === a.id}
                onEditingChange={(on) => setRenaming(on ? a.id : null)}
                onSave={(next) => void act("catalog.actor-rename", { actor: a.id, name: next })}
              />
            </SettingRow>
          ))}
        </ListCard>
      ) : (
        <EmptyLine>No actors yet. Add one for each agent, such as Coder.</EmptyLine>
      )}
      <FormDialog
        open={adding}
        onOpenChange={setAdding}
        title="New actor"
        line="The name an agent's work shows under."
        saveLabel="Add actor"
        onSave={async () => {
          const made = await act("catalog.actor-create", { name, icon, colour });
          if (made) setName("");
          return made !== null;
        }}
      >
        <Field label="Name" htmlFor="actor-name">
          <Input
            id="actor-name"
            autoFocus
            required
            placeholder="Such as Coder"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Icon and colour">
          <ProjectIconPicker
            title="Icon and colour"
            icon={icon}
            colour={colour}
            onIcon={setIcon}
            onColour={setColour}
          />
        </Field>
      </FormDialog>
    </WorkPage>
  );
}

const suggested = (name: string) =>
  name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);

function PrefixDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const { act } = useApp();
  const [prefix, setPrefix] = useState(project.id);
  const wanted = prefix.trim().toUpperCase();
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Change the prefix of ${project.name}`}
      line={`The prefix starts every ticket id of the project. Each ticket keeps its number: ${project.id}-12 becomes ${wanted && wanted !== project.id ? wanted : "NEW"}-12. An earlier id still opens its ticket. This cannot be undone, and changes made before it can no longer be undone.`}
      saveLabel="Change prefix"
      onSave={async () =>
        wanted === project.id ||
        (await act("catalog.project-prefix-set", { project: project.id, prefix: wanted })) !== null
      }
    >
      <Field label="Prefix" hint="1 to 6 letters, such as TLK." htmlFor="prefix">
        <Input
          id="prefix"
          autoFocus
          required
          className="font-mono uppercase"
          value={prefix}
          maxLength={6}
          onChange={(e) => setPrefix(e.target.value.replace(/[^a-zA-Z]/g, ""))}
        />
      </Field>
    </FormDialog>
  );
}

export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { act, go } = useApp();
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState<string | null>(null);
  const [icon, setIcon] = useState("folder");
  const [colour, setColour] = useState(DEFAULT_PROJECT_COLOUR);
  const id = (prefix ?? suggested(name)).toUpperCase();
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New project"
      line="A body of work, such as an app. It has its own board, backlog, features and intake."
      saveLabel="Create project"
      onSave={async () => {
        if ((await act("catalog.project-create", { name, prefix: id })) === null) return false;
        await act("catalog.project-edit", { project: id, icon, colour });
        setName("");
        setPrefix(null);
        go(`/p/${id}/board`);
        return true;
      }}
    >
      <Field label="Name" htmlFor="project-name">
        <Input
          id="project-name"
          autoFocus
          required
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field
        label="Prefix"
        hint={`Starts every ticket id, like ${id || "TLK"}-1. 1 to 6 letters. It can be changed later.`}
        htmlFor="project-prefix"
      >
        <Input
          id="project-prefix"
          required
          className="font-mono uppercase"
          value={id}
          maxLength={6}
          onChange={(e) => setPrefix(e.target.value.replace(/[^a-zA-Z]/g, ""))}
        />
      </Field>
      <Field label="Icon and colour">
        <ProjectIconPicker icon={icon} colour={colour} onIcon={setIcon} onColour={setColour} />
      </Field>
    </FormDialog>
  );
}

function ProjectsSection({ usage }: { usage: Usage | undefined }) {
  const { catalog, act, go } = useApp();
  const [archived, setArchived] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [prefixOf, setPrefixOf] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const projects = catalog.projects.filter((p) => archived || !p.archived);
  const prefixed = catalog.projects.find((p) => p.id === prefixOf);
  return (
    <WorkPage
      title="Projects"
      help="Each project has its own board, backlog, features and intake. Drag a row to reorder the list; the sidebar follows."
      action={
        <IconAction
          primary
          label="New project"
          icon={<IconPlus aria-hidden />}
          onClick={() => setAdding(true)}
        />
      }
    >
      <Tick label="Show archived" checked={archived} onChange={setArchived} />
      {projects.length > 0 ? (
        <ListCard>
          {projects.map((p) => {
            const look = projectLook(p);
            const edit = (icon: string, colour: string) =>
              void act("catalog.project-edit", { project: p.id, icon, colour });
            return (
              <SettingRow
                key={p.id}
                archived={p.archived}
                draggable
                onDragStart={(e) => {
                  setDragged(p.id);
                  e.dataTransfer.setData("text/plain", p.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setDragged(null)}
                onDragOver={(e) => {
                  if (dragged && dragged !== p.id) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragged && dragged !== p.id) {
                    void act("catalog.project-move", { project: dragged, before: p.id });
                  }
                  setDragged(null);
                }}
                mark={
                  <>
                    <IconGripVertical
                      size={14}
                      aria-hidden
                      className="shrink-0 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100"
                    />
                    <ProjectIconPicker
                      icon={look.projectIcon}
                      colour={look.iconColour}
                      onIcon={(icon) => edit(icon, look.iconColour)}
                      onColour={(colour) => edit(look.projectIcon, colour)}
                    >
                      <Button
                        variant="ghost"
                        aria-label={`Icon and colour of ${p.name}`}
                        className="size-8 shrink-0 p-0"
                      >
                        <ProjectIcon {...look} size={20} />
                      </Button>
                    </ProjectIconPicker>
                  </>
                }
                line={
                  <span className="flex items-center gap-3">
                    {count(usage?.projects[p.id], "open ticket", "open tickets")}
                    <Button
                      variant="ghost"
                      title="Change prefix"
                      aria-label={`Prefix ${p.id}. Change it`}
                      className="h-6 px-1.5 font-mono text-xs text-muted-foreground"
                      onClick={() => setPrefixOf(p.id)}
                    >
                      {p.id}
                    </Button>
                  </span>
                }
                menu={
                  <RowMenu
                    label={`Project ${p.name}`}
                    items={[
                      { label: "Open the board", onSelect: () => go(`/p/${p.id}/board`) },
                      { label: "Rename", onSelect: () => setRenaming(p.id) },
                      { label: "Change prefix...", onSelect: () => setPrefixOf(p.id) },
                      {
                        label: p.archived ? "Restore" : "Archive",
                        onSelect: () =>
                          void act(
                            p.archived ? "catalog.project-restore" : "catalog.project-archive",
                            { project: p.id },
                          ),
                      },
                      "line",
                      {
                        label: "Delete",
                        onSelect: () => void act("catalog.project-delete", { project: p.id }),
                      },
                    ]}
                  />
                }
              >
                <InlineText
                  value={p.name}
                  label={`Rename ${p.name}`}
                  editing={renaming === p.id}
                  onEditingChange={(on) => setRenaming(on ? p.id : null)}
                  onSave={(name) => void act("catalog.project-edit", { project: p.id, name })}
                />
              </SettingRow>
            );
          })}
        </ListCard>
      ) : (
        <EmptyLine>No projects yet.</EmptyLine>
      )}
      <NewProjectDialog open={adding} onOpenChange={setAdding} />
      {prefixed && (
        <PrefixDialog key={prefixed.id} project={prefixed} onClose={() => setPrefixOf(null)} />
      )}
    </WorkPage>
  );
}

const SWATCHES = COLOURS.map((c) => ({ name: c, value: namedColour(c) }));
const colourOf = (hex: string, fallback: Colour) =>
  COLOURS.find((c) => namedColour(c) === hex) ?? fallback;

function LabelColour({ label }: { label: Label }) {
  const { act } = useApp();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`Colour of ${label.name}`}
          className="size-8 shrink-0 rounded-full p-0"
        >
          <LabelDot colour={label.colour} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <ColourSwatches
          label="Label colour"
          value={namedColour(label.colour)}
          colours={SWATCHES}
          custom={false}
          onChange={(hex) =>
            void act("catalog.label-colour-set", {
              label: label.id,
              colour: colourOf(hex, label.colour),
            })
          }
        />
      </PopoverContent>
    </Popover>
  );
}

function LabelsSection({ usage }: { usage: Usage | undefined }) {
  const { catalog, act } = useApp();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [colour, setColour] = useState<Colour>("blue");
  return (
    <WorkPage
      title="Labels"
      help="Coloured tags for tickets, shared by every project."
      action={
        <IconAction
          primary
          label="New label"
          icon={<IconPlus aria-hidden />}
          onClick={() => setAdding(true)}
        />
      }
    >
      {catalog.labels.length > 0 ? (
        <ListCard>
          {catalog.labels.map((l) => {
            const others: MenuEntry[] = catalog.labels
              .filter((o) => o.id !== l.id)
              .map((o) => ({
                label: o.name,
                onSelect: () => void act("tickets.label-merge", { label: l.id, into: o.id }),
              }));
            return (
              <SettingRow
                key={l.id}
                mark={<LabelColour label={l} />}
                line={count(usage?.labels[l.id], "ticket", "tickets")}
                menu={
                  <RowMenu
                    label={`Label ${l.name}`}
                    items={[
                      { label: "Rename", onSelect: () => setRenaming(l.id) },
                      {
                        label: "Change colour",
                        content: (
                          <div className="grid gap-2">
                            <ColourSwatches
                              label="Label colour"
                              value={namedColour(l.colour)}
                              colours={SWATCHES}
                              custom={false}
                              onChange={(hex) =>
                                void act("catalog.label-colour-set", {
                                  label: l.id,
                                  colour: colourOf(hex, l.colour),
                                })
                              }
                            />
                          </div>
                        ),
                      },
                      { label: "Merge into", items: others, disabled: others.length === 0 },
                      "line",
                      {
                        label: "Remove",
                        onSelect: () => void act("catalog.label-remove", { label: l.id }),
                      },
                    ]}
                  />
                }
              >
                <InlineText
                  value={l.name}
                  label={`Rename ${l.name}`}
                  editing={renaming === l.id}
                  onEditingChange={(on) => setRenaming(on ? l.id : null)}
                  onSave={(next) => void act("catalog.label-rename", { label: l.id, name: next })}
                />
              </SettingRow>
            );
          })}
        </ListCard>
      ) : (
        <EmptyLine>No labels yet. Add one, such as bug.</EmptyLine>
      )}
      <FormDialog
        open={adding}
        onOpenChange={setAdding}
        title="New label"
        saveLabel="Add label"
        onSave={async () => {
          const made = await act("catalog.label-create", { name, colour });
          if (made) setName("");
          return made !== null;
        }}
      >
        <Field label="Name" htmlFor="label-name">
          <Input
            id="label-name"
            autoFocus
            required
            placeholder="Such as bug"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Colour">
          <ColourSwatches
            label="Label colour"
            value={namedColour(colour)}
            colours={SWATCHES}
            custom={false}
            onChange={(hex) => setColour(colourOf(hex, colour))}
          />
        </Field>
      </FormDialog>
    </WorkPage>
  );
}

function LocationsSection({ usage }: { usage: Usage | undefined }) {
  const { catalog, act } = useApp();
  const [archived, setArchived] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const locations = catalog.locations.filter((l: Location) => archived || !l.archived);
  return (
    <WorkPage
      title="Locations"
      help="A place where a ticket's work is done, such as a machine. A ticket has one or none."
      action={
        <IconAction
          primary
          label="New location"
          icon={<IconPlus aria-hidden />}
          onClick={() => setAdding(true)}
        />
      }
    >
      <Tick label="Show archived" checked={archived} onChange={setArchived} />
      {locations.length > 0 ? (
        <ListCard>
          {locations.map((l) => (
            <SettingRow
              key={l.id}
              archived={l.archived}
              line={count(usage?.locations[l.id], "open ticket", "open tickets")}
              menu={
                <RowMenu
                  label={`Location ${l.name}`}
                  items={[
                    { label: "Rename", onSelect: () => setRenaming(l.id) },
                    {
                      label: l.archived ? "Restore" : "Archive",
                      onSelect: () =>
                        void act(
                          l.archived ? "catalog.location-restore" : "catalog.location-archive",
                          { location: l.id },
                        ),
                    },
                    "line",
                    {
                      label: "Delete",
                      onSelect: () => void act("catalog.location-delete", { location: l.id }),
                    },
                  ]}
                />
              }
            >
              <InlineText
                value={l.name}
                label={`Rename ${l.name}`}
                editing={renaming === l.id}
                onEditingChange={(on) => setRenaming(on ? l.id : null)}
                onSave={(next) =>
                  void act("catalog.location-rename", { location: l.id, name: next })
                }
              />
            </SettingRow>
          ))}
        </ListCard>
      ) : (
        <EmptyLine>No locations yet. Add one for each place your agents work.</EmptyLine>
      )}
      <FormDialog
        open={adding}
        onOpenChange={setAdding}
        title="New location"
        saveLabel="Add location"
        onSave={async () => {
          const made = await act("catalog.location-create", { name });
          if (made) setName("");
          return made !== null;
        }}
      >
        <Field label="Name" htmlFor="location-name">
          <Input
            id="location-name"
            autoFocus
            required
            placeholder="Such as Laptop"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
      </FormDialog>
    </WorkPage>
  );
}

function StepsSection() {
  const { catalog, act } = useApp();
  const steps = useRead<Step[]>("inbox.pipeline-read") ?? [];
  const [open, setOpen] = useState<string | null>(null);
  const shown = steps.find((s) => s.id === open);
  return (
    <WorkPage
      title="Intake steps"
      help="Steps look at each new intake item, one after another, before it lands in a project's inbox. They are the same for every project; a step can be set to run on one project's items only."
      action={
        <IconAction
          primary
          label="New step"
          icon={<IconPlus aria-hidden />}
          onClick={() => setOpen("new")}
        />
      }
    >
      {steps.length > 0 ? (
        <ListCard>
          {steps.map((s, i) => (
            <SettingRow
              key={s.id}
              archived={false}
              mark={<span className="w-5 shrink-0 text-xs text-muted-foreground">{i + 1}</span>}
              line={`${KIND_NAMES[s.kind]} · as ${actorName(catalog, s.actor)} · ${
                s.condition
                  ? Object.entries(s.condition)
                      .map(([k, v]) => `${CONDITIONS[k]} ${v}`)
                      .join(", ")
                  : "every item"
              }${s.on ? "" : " · off"}`}
              menu={
                <RowMenu
                  label={`Step ${s.name}`}
                  items={[
                    { label: "Edit", onSelect: () => setOpen(s.id) },
                    {
                      label: s.on ? "Turn off" : "Turn on",
                      onSelect: () => void act("inbox.step-edit", { step: s.id, on: !s.on }),
                    },
                    {
                      label: "Move up",
                      disabled: i === 0,
                      onSelect: () =>
                        void act("inbox.step-move", { step: s.id, before: steps[i - 1]?.id }),
                    },
                    {
                      label: "Move down",
                      disabled: i === steps.length - 1,
                      onSelect: () =>
                        void act("inbox.step-move", {
                          step: s.id,
                          ...(steps[i + 2] ? { before: steps[i + 2]?.id } : {}),
                        }),
                    },
                    "line",
                    {
                      label: "Remove",
                      onSelect: () => void act("inbox.step-remove", { step: s.id }),
                    },
                  ]}
                />
              }
            >
              <Button
                variant="ghost"
                className="h-auto p-0 font-medium hover:bg-transparent"
                onClick={() => setOpen(s.id)}
              >
                {s.name}
              </Button>
            </SettingRow>
          ))}
        </ListCard>
      ) : (
        <EmptyLine>No steps yet. New items go straight to the inbox.</EmptyLine>
      )}
      {(open === "new" || shown) && (
        <StepDialog key={open} step={shown ?? null} onClose={() => setOpen(null)} />
      )}
    </WorkPage>
  );
}

export function SettingsPage({ section, onSignOut }: { section: Section; onSignOut: () => void }) {
  const usage = useRead<Usage>("tickets.usage-read");
  if (section === "actors") return <ActorsSection usage={usage} />;
  if (section === "projects") return <ProjectsSection usage={usage} />;
  if (section === "labels") return <LabelsSection usage={usage} />;
  if (section === "locations") return <LocationsSection usage={usage} />;
  if (section === "steps") return <StepsSection />;
  if (section === "browser") {
    return (
      <WorkPage title="This browser">
        <Panel id="session" title="This browser" line="Signing out ends this session only.">
          <Button variant="secondary" onClick={onSignOut}>
            Sign out
          </Button>
        </Panel>
      </WorkPage>
    );
  }
  return <YouSection />;
}

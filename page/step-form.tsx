// The form of an intake step, in a dialog: what looks at each new item, and what it may do.
import { Field, FormDialog } from "@jaetask/toolkit/suite";
import { Input } from "@jaetask/toolkit/ui/input";
import { Textarea } from "@jaetask/toolkit/ui/textarea";
import { useState } from "react";
import { OWNER, type Step } from "./api.js";
import { useApp } from "./app.js";
import { CONDITIONS } from "./inbox.js";
import { Choice, Choices, Picker } from "./local.js";

export const KIND_NAMES: Record<Step["kind"], string> = {
  script: "A script",
  "local-model": "A model on this machine",
  "hosted-model": "A hosted model",
  classifier: "A classifier",
  app: "Another App",
};

// What a step may ask for, in the words of what happens to the item.
const SORT: [string, string][] = [
  ["item-tag", "Add tags"],
  ["item-untag", "Remove tags"],
  ["item-category-set", "Set its category"],
  ["item-fields-set", "Fill in fields"],
  ["item-fields-clear", "Clear fields"],
  ["item-edit", "Rewrite its text"],
];
const DECIDE: [string, string][] = [
  ["item-accept", "Accept it"],
  ["item-reject", "Reject it"],
  ["item-dismiss", "Dismiss it"],
  ["item-promote", "Turn it into a ticket"],
  ["item-link", "Link it to a ticket"],
];
const options = (list: [string, string][]) => list.map(([id, name]) => ({ id, name }));
const within = (list: [string, string][], chosen: string[]) =>
  chosen.filter((a) => list.some(([id]) => id === a));

// What each kind of step needs, as [setting, label, what it is].
const SETTINGS: Record<Step["kind"], [string, string, string][]> = {
  script: [["file", "File", "A module in the steps folder, such as spam-check.mjs."]],
  "local-model": [
    ["url", "Address", "Such as http://127.0.0.1:11434/v1."],
    ["model", "Model", "The model's name."],
    ["instructions", "Instructions", "What it should do with an item."],
  ],
  "hosted-model": [
    ["url", "Address", "Such as https://api.example.com/v1."],
    ["model", "Model", "The model's name."],
    ["key_env", "Key", "The name of the environment variable that holds the key."],
    ["instructions", "Instructions", "What it should do with an item."],
  ],
  classifier: [
    ["url", "Address", "The address of the model."],
    ["model", "Model", "The model's name."],
    ["key_env", "Key", "The name of the environment variable with the key, if it needs one."],
    ["labels", "Labels", "JSON: each label and the Calls it leads to."],
  ],
  app: [["action", "Action", "The other App's Action, such as sorter.sort."]],
};

const RUNS_ON: Record<string, string> = {
  "": "Every item",
  project: "Items for the project",
  tag: "Items tagged",
  category: "Items in the category",
  source: "Items from",
  word: "Items with the word",
};

export function StepDialog({ step, onClose }: { step: Step | null; onClose: () => void }) {
  const { catalog, act } = useApp();
  const agents = catalog.actors.filter((a) => a.id !== OWNER && !a.archived);
  const [name, setName] = useState(step?.name ?? "");
  const [kind, setKind] = useState<Step["kind"]>(step?.kind ?? "script");
  const [actor, setActor] = useState(step?.actor ?? agents[0]?.id ?? "");
  const [actions, setActions] = useState(step?.actions ?? ["item-tag"]);
  const [on, setOn] = useState<"on" | "off">(step?.on === false ? "off" : "on");
  const [config, setConfig] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(step?.config ?? {}).map(([k, v]) => [
        k,
        typeof v === "string" ? v : JSON.stringify(v),
      ]),
    ),
  );
  const [runsOn, setRunsOn] = useState(Object.keys(step?.condition ?? {})[0] ?? "");
  const [value, setValue] = useState(Object.values(step?.condition ?? {})[0] ?? "");
  const [problem, setProblem] = useState("");
  return (
    <FormDialog
      open
      wide
      onOpenChange={(open) => !open && onClose()}
      title={step ? `Edit the step ${step.name}` : "New intake step"}
      line="A step looks at each new item and answers with what to do. It can only do what you allow here."
      saveLabel={step ? "Save" : "Add step"}
      onSave={async () => {
        const settings: Record<string, unknown> = {};
        for (const [key] of SETTINGS[kind]) {
          const text = (config[key] ?? "").trim();
          if (!text) continue;
          try {
            settings[key] = key === "labels" ? JSON.parse(text) : text;
          } catch {
            setProblem("The labels are not valid JSON.");
            return false;
          }
        }
        setProblem("");
        const input = {
          name,
          kind,
          actor,
          actions,
          condition: runsOn && value.trim() ? { [runsOn]: value.trim() } : null,
          config: settings,
          on: on === "on",
        };
        return (
          (await (step
            ? act("inbox.step-edit", { step: step.id, ...input })
            : act("inbox.step-add", input))) !== null
        );
      }}
    >
      <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1">
        <Field label="Name" htmlFor="step-name">
          <Input
            id="step-name"
            autoFocus
            required
            placeholder="Such as Spam check"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What looks at the item" htmlFor="step-kind">
            <Picker
              id="step-kind"
              className="w-full"
              value={kind}
              onChange={(v) => setKind(v as Step["kind"])}
              options={Object.entries(KIND_NAMES).map(([id, text]) => ({ id, name: text }))}
            />
          </Field>
          <Field
            label="Its changes show as"
            htmlFor="step-actor"
            {...(agents.length === 0 ? { hint: "Add an actor in Settings first." } : {})}
          >
            <Picker
              id="step-actor"
              className="w-full"
              value={actor}
              onChange={setActor}
              options={agents.map((a) => ({ id: a.id, name: a.name }))}
            />
          </Field>
        </div>
        {SETTINGS[kind].map(([key, label, line]) => (
          <Field key={key} label={label} hint={line} htmlFor={`setting-${key}`}>
            {key === "instructions" || key === "labels" ? (
              <Textarea
                id={`setting-${key}`}
                value={config[key] ?? ""}
                onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              />
            ) : (
              <Input
                id={`setting-${key}`}
                value={config[key] ?? ""}
                onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              />
            )}
          </Field>
        ))}
        <Field label="It may sort the item">
          <Choices
            label="It may sort the item"
            value={within(SORT, actions)}
            options={options(SORT)}
            onChange={(next) => setActions([...next, ...within(DECIDE, actions)])}
          />
        </Field>
        <Field label="It may decide what happens to it">
          <Choices
            label="It may decide what happens to it"
            value={within(DECIDE, actions)}
            options={options(DECIDE)}
            onChange={(next) => setActions([...within(SORT, actions), ...next])}
          />
        </Field>
        <Field label="It looks at" htmlFor="step-runs-on">
          <div className="flex flex-wrap items-center gap-2">
            <Picker
              id="step-runs-on"
              value={runsOn}
              onChange={setRunsOn}
              options={Object.keys(CONDITIONS).map((k) => ({ id: k, name: RUNS_ON[k] ?? k }))}
            />
            {runsOn !== "" && (
              <Input
                aria-label="Which"
                className="w-48"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            )}
          </div>
        </Field>
        <Field label="State" hint="A step that is off is skipped.">
          <Choice
            label="State"
            value={on}
            options={[
              { id: "on", name: "On" },
              { id: "off", name: "Off" },
            ]}
            onChange={setOn}
          />
        </Field>
        {problem && (
          <p className="m-0 text-destructive" role="alert">
            {problem}
          </p>
        )}
      </div>
    </FormDialog>
  );
}

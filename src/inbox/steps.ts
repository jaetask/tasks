import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ActionName, Calls, contract } from "@jaetask/open-agent-kit";
import { z } from "zod";
import type { IntakeAction, Item, Step } from "./inbox.js";
import type { StepRun } from "./runs.js";

export type StepInput = { item: Item; earlier: StepRun[]; actions: IntakeAction[] };

export const StepAnswer = z.object({
  calls: z
    .array(z.object({ action: z.string(), input: z.record(z.string(), z.unknown()).default({}) }))
    .default([]),
  reason: z.string().default(""),
});
export type StepAnswer = z.infer<typeof StepAnswer>;

export type StepContext = {
  stepsDir: string;
  calls: Calls;
  env: Record<string, string | undefined>;
  actions: ReturnType<typeof contract>["actions"];
};

const text = (config: Step["config"], key: string): string => {
  const value = config[key];
  if (typeof value !== "string" || value === "") throw new Error(`the step's ${key} is not set`);
  return value;
};

async function chat(step: Step, env: StepContext["env"], body: Record<string, unknown>) {
  const keyName = step.config.key_env;
  const key = typeof keyName === "string" && keyName ? env[keyName] : undefined;
  if (step.kind === "hosted-model" && !key) {
    throw new Error("the step's key_env does not name an environment variable with a key");
  }
  const response = await fetch(`${text(step.config, "url").replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ model: text(step.config, "model"), ...body }),
  });
  if (!response.ok) throw new Error(`the model answered HTTP ${response.status}`);
  const answer = (await response.json()) as {
    choices?: {
      message?: {
        content?: string | null;
        tool_calls?: { function: { name: string; arguments: string } }[];
      };
    }[];
  };
  return answer.choices?.[0]?.message ?? {};
}

const described = ({ item, earlier }: StepInput) =>
  JSON.stringify({
    item: {
      title: item.title,
      text: item.text,
      source: item.source,
      tags: item.tags,
      category: item.category,
      fields: item.fields,
    },
    earlier_steps: earlier.map((s) => ({ step: s.name, reason: s.reason, calls: s.calls })),
  });

async function model(step: Step, input: StepInput, context: StepContext): Promise<StepAnswer> {
  const tools = input.actions.map((name) => {
    const action = context.actions.find((a) => a.name === `inbox.${name}`);
    const { $schema: _, ...parameters } = (action?.input ?? {}) as Record<string, unknown>;
    const properties = { ...(parameters.properties as Record<string, unknown>) };
    delete properties.item;
    const required = ((parameters.required as string[]) ?? []).filter((r) => r !== "item");
    return {
      type: "function",
      function: {
        name,
        description: action?.description ?? name,
        parameters: { ...parameters, properties, required },
      },
    };
  });
  const instructions = typeof step.config.instructions === "string" ? step.config.instructions : "";
  const message = await chat(step, context.env, {
    messages: [
      {
        role: "system",
        content: `You look at one new inbox item and decide what to do with it, using only the tools you are given. Use no tool if nothing should be done. ${instructions}`,
      },
      { role: "user", content: described(input) },
    ],
    tools,
  });
  return {
    calls: (message.tool_calls ?? []).map((call) => ({
      action: call.function.name,
      input: JSON.parse(call.function.arguments || "{}") as Record<string, unknown>,
    })),
    reason: message.content ?? "",
  };
}

async function classifier(step: Step, input: StepInput, context: StepContext): Promise<StepAnswer> {
  const labels = z.record(z.string(), StepAnswer.shape.calls).parse(step.config.labels ?? {});
  const names = Object.keys(labels);
  if (names.length === 0) throw new Error("the step's labels are not set");
  const message = await chat(step, context.env, {
    messages: [
      {
        role: "system",
        content: `Classify the inbox item. Answer with exactly one of these labels and nothing else: ${names.join(", ")}.`,
      },
      { role: "user", content: described(input) },
    ],
  });
  const label = (message.content ?? "").trim();
  const calls = labels[label];
  return calls
    ? { calls, reason: `classified as ${label}` }
    : { calls: [], reason: `answered ${JSON.stringify(label)}, which is not one of the labels` };
}

async function script(step: Step, input: StepInput, context: StepContext): Promise<StepAnswer> {
  const file = resolve(context.stepsDir, text(step.config, "file"));
  const inside = relative(context.stepsDir, file);
  if (inside.startsWith("..") || isAbsolute(inside)) {
    throw new Error("the step's file is outside the steps folder");
  }
  const loaded = (await import(pathToFileURL(file).href)) as { default?: unknown };
  if (typeof loaded.default !== "function") {
    throw new Error("the step's file has no default function");
  }
  return StepAnswer.parse(await loaded.default(input));
}

async function app(step: Step, input: StepInput, context: StepContext): Promise<StepAnswer> {
  const outcome = await context.calls.invoke({
    id: crypto.randomUUID(),
    action: text(step.config, "action") as ActionName,
    input,
    principal: { id: step.actor },
    caller: "app",
  });
  if (outcome.state !== "succeeded") {
    throw new Error(
      `the other App's Action was ${outcome.state}${"reason" in outcome ? `: ${outcome.reason.message}` : ""}`,
    );
  }
  return StepAnswer.parse(outcome.output);
}

const KINDS = {
  classifier,
  "local-model": model,
  "hosted-model": model,
  script,
  app,
} satisfies Record<Step["kind"], unknown>;

export const ask = (step: Step, input: StepInput, context: StepContext): Promise<StepAnswer> =>
  KINDS[step.kind](step, input, context);

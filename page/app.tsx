// What every screen shares: the catalog, a way to make a change, and a way
// to read that follows changes made by anyone.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { type Catalog, call, type Outcome, refusal } from "./api.js";

export type App = {
  catalog: Catalog;
  /** Goes up whenever anything changed, here or elsewhere. */
  version: number;
  /** Makes a change, shows its Card or why it was refused, and returns its output or null. */
  act<T = unknown>(action: string, input: unknown): Promise<T | null>;
  go(path: string): void;
  /** What boards, the Overview and backlogs are narrowed to. */
  narrow: Narrow;
  setNarrow(narrow: Narrow): void;
  /** The page's path, and what follows its question mark. */
  path: string;
  query: URLSearchParams;
};

/** "" means every actor or feature; "none" means tickets with none. */
export type Narrow = { text: string; actor: string; feature: string };

/** A Narrow as the read Actions take it. */
export const narrowInput = (narrow: Narrow, withFeature: boolean) => ({
  ...(narrow.text ? { text: narrow.text } : {}),
  ...(narrow.actor === "" ? {} : { assignee: narrow.actor === "none" ? null : narrow.actor }),
  ...(withFeature && narrow.feature !== ""
    ? { feature: narrow.feature === "none" ? null : narrow.feature }
    : {}),
});

export const AppContext = createContext<App | null>(null);
export function useApp(): App {
  const app = useContext(AppContext);
  if (!app) throw new Error("no App");
  return app;
}

/** The output of a read Action, read again whenever something changes. Undefined until it arrives. */
export function useRead<T>(action: string | null, input: unknown = {}): T | undefined {
  const { version } = useApp();
  const [data, setData] = useState<T | undefined>(undefined);
  const key = `${action} ${JSON.stringify(input)}`;
  const latest = useRef(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for the action and its input
  useEffect(() => {
    if (!action) return;
    latest.current += 1;
    const mine = latest.current;
    void call(action, input).then((outcome: Outcome) => {
      // Reads can overlap; only the one asked for last is shown.
      if (mine === latest.current && refusal(outcome) === null) setData(outcome.output as T);
    });
  }, [key, version]);
  return action ? data : undefined;
}

export const actorName = (catalog: Catalog, id: string) =>
  catalog.actors.find((a) => a.id === id)?.name || id;

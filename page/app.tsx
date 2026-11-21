import { createContext, useContext, useEffect, useRef, useState } from "react";
import { type TicketFile, type Catalog, call, type Outcome, refusal } from "./api.js";

export type App = {
  catalog: Catalog;
  version: number;
  act<T = unknown>(action: string, input: unknown): Promise<T | null>;
  go(path: string): void;
  upload(ticket: string, file: File): Promise<TicketFile | null>;
  path: string;
  query: URLSearchParams;
};

export const AppContext = createContext<App | null>(null);
export function useApp(): App {
  const app = useContext(AppContext);
  if (!app) throw new Error("no App");
  return app;
}

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
      if (mine === latest.current && refusal(outcome) === null) setData(outcome.output as T);
    });
  }, [key, version]);
  return action ? data : undefined;
}

export const actorName = (catalog: Catalog, id: string) =>
  catalog.actors.find((a) => a.id === id)?.name || id;

export const actorLabel = (catalog: Catalog, id: string) => actorName(catalog, id);

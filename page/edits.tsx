// The edit pages. Every one is the toolkit's EditFrame: Back at the top,
// labelled rows, then Cancel and Save, which both return to where you were.
import { EditFrame, Row, useBackTo } from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Input } from "@jaetask/toolkit/ui/input";
import { useState } from "react";
import { type Actor, type Connection, OWNER } from "./api.js";
import { useApp, useRead } from "./app.js";
import { Choice, Picker } from "./local.js";

/** Runs the changes of a Save; goes back only if none was refused. */
function useSave(back: string) {
  const { go } = useApp();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    save: async (work: () => Promise<boolean>) => {
      setBusy(true);
      const done = await work();
      setBusy(false);
      if (done) go(back);
    },
  };
}

export function ConnectionApprove({ id }: { id: string }) {
  const { catalog, act, go } = useApp();
  const back = useBackTo("/connections");
  const { busy, save } = useSave(back);
  const connection = (useRead<Connection[]>("connections.connection-list") ?? []).find(
    (c) => c.id === id,
  );
  const agents = catalog.actors.filter((a) => a.id !== OWNER && !a.archived);
  const [actor, setActor] = useState(agents[0]?.id ?? "");
  const [name, setName] = useState("");
  const [may, setMay] = useState<"change" | "read">("change");
  if (!connection) return null;
  return (
    <EditFrame
      title={`Approve ${connection.name}`}
      line={`It asks to ${connection.may}. You choose what it may do and which actor it is.`}
      backTo={back}
      busy={busy}
      saveLabel="Approve"
      onSave={() =>
        save(async () => {
          let as = actor;
          if (!as) {
            const made = await act<Actor>("catalog.actor-create", {
              name: name.trim() || connection.name,
            });
            if (!made) return false;
            as = made.id;
          }
          return (
            (await act("connections.connection-approve", {
              connection: id,
              actor: as,
              change: may === "change",
            })) !== null
          );
        })
      }
      extra={
        <Button
          variant="destructive"
          onClick={() =>
            void act("connections.connection-revoke", { connection: id }).then(
              (done) => done && go(back),
            )
          }
        >
          Turn down
        </Button>
      }
    >
      <Row title="Acts as" line="Its work shows under this actor." htmlFor="actor">
        <Picker
          id="actor"
          value={actor}
          onChange={(v) => setActor(v)}
          options={[
            ...agents.map((a) => ({ id: a.id, name: a.name })),
            { id: "", name: "A new actor…" },
          ]}
        />
      </Row>
      {actor === "" && (
        <Row
          title="New actor's name"
          line="Left empty, it takes the connection's name."
          htmlFor="new"
        >
          <Input id="new" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </Row>
      )}
      <Row title="It may" line="Read only, or read and change.">
        <Choice
          label="It may"
          value={may}
          options={[
            { id: "change", name: "Read and change" },
            { id: "read", name: "Only read" },
          ]}
          onChange={setMay}
        />
      </Row>
    </EditFrame>
  );
}

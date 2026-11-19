// Renders a Contract as Markdown for expect files.
import { agentContext, type Contract } from "@jaetask/open-agent-kit";
import { table } from "@jaetask/snap";

const json = (value: unknown) => `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;

export function renderContract(c: Contract): string {
  return [
    "### Domain",
    table(
      ["domain", "version", "card catalogue", "about"],
      [[c.domain, c.version, c.catalogue, c.about]],
    ),
    "### Actions",
    table(
      ["action", "effect", "card", "description"],
      c.actions.map((a) => [a.name, a.effect, a.card ?? "", a.description]),
    ),
    "### Cards",
    c.cards.length === 0
      ? "None."
      : table(
          ["card", "version", "view", "about"],
          c.cards.map((card) => [card.name, card.version, card.view.kind, card.about]),
        ),
    ...c.cards.flatMap((card) => [`#### Card ${card.name}`, json(card.view)]),
    "### Agent context",
    `\`\`\`text\n${agentContext(c)}\n\`\`\``,
    "### Inputs",
    ...c.actions.flatMap((a) => [`#### ${a.name}`, json(a.input)]),
  ].join("\n\n");
}

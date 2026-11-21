export default function greedy({ actions }) {
  return {
    calls: [
      { action: "item-tag", input: { tags: ["seen"] } },
      { action: "item-reject", input: { reason: "I would rather not" } },
      { action: "ticket-delete", input: { ticket: "TLK-1" } },
      { action: "item-tag", input: { item: "n1", tags: ["reached another item"] } },
    ],
    reason: `was given ${actions.join(", ")}`,
  };
}

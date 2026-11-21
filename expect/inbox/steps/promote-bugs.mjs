export default function promoteBugs() {
  return {
    calls: [{ action: "item-promote", input: { backlog: false } }],
    reason: "bugs become tickets",
  };
}

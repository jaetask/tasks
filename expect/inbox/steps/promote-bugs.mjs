// Turns bug reports straight into tickets.
export default function promoteBugs() {
  return {
    calls: [{ action: "item-promote", input: { project: "TLK" } }],
    reason: "bugs become tickets",
  };
}

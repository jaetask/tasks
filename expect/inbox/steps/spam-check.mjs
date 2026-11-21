export default function spamCheck({ item }) {
  if (/cheap|click here/i.test(item.text)) {
    return {
      calls: [{ action: "item-reject", input: { reason: "looks like spam" } }],
      reason: "spam words",
    };
  }
  const kind = /crash|broken|error/i.test(item.text) ? "bug" : "request";
  return {
    calls: [{ action: "item-tag", input: { tags: [kind, "unsorted"] } }],
    reason: `not spam; a ${kind}`,
  };
}

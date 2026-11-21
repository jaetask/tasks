export default function sort({ item }) {
  const category = item.fields.format ? "export" : "other";
  return {
    calls: [{ action: "item-category-set", input: { category } }],
    reason: `fields: ${Object.keys(item.fields).join(", ") || "none"}`,
  };
}

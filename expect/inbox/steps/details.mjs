export default function details({ item, earlier }) {
  const calls = [{ action: "item-untag", input: { tags: ["unsorted"] } }];
  const app = item.text.match(/for the (\w+) app/i)?.[1];
  const format = item.text.match(/export to (\w+)/i)?.[1];
  if (app && format) {
    calls.push({ action: "item-edit", input: { title: `Export to ${format} in ${app}` } });
    calls.push({ action: "item-fields-set", input: { fields: { app, format } } });
  }
  return { calls, reason: `saw ${earlier.length} earlier step; tags were ${item.tags.join(", ")}` };
}

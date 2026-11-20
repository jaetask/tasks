// The page's small building blocks: elements, buttons, selects and one-line
// forms. Screens build what they show with these; the shell lays it out.
export const $ = (id) => document.getElementById(id);

export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

// Replaces an element's children, leaving out the empty ones.
export const fill = (id, ...children) =>
  $(id).replaceChildren(
    ...children.flat().filter((c) => c !== null && c !== undefined && c !== false && c !== ""),
  );

export const button = (text, onclick, className = "") =>
  h("button", { type: "button", class: className, text, onclick });

export function select(options, value, onchange, label) {
  return h(
    "select",
    { onchange: (e) => onchange(e.target.value), "aria-label": label },
    options.map(([v, text]) => h("option", { value: v, text, selected: v === value })),
  );
}

// A one-line form: a text input and a button.
export function lineForm(placeholder, label, onsubmit, value = "") {
  const input = h("input", {
    type: "text",
    placeholder,
    value,
    maxLength: 200,
    "aria-label": placeholder,
  });
  return h(
    "form",
    {
      class: "row grow",
      onsubmit: (e) => {
        e.preventDefault();
        const text = input.value.trim();
        // Emptied at once, so the page knows the owner is done typing here.
        input.value = "";
        if (text) onsubmit(text);
      },
    },
    input,
    h("button", { type: "submit", text: label }),
  );
}

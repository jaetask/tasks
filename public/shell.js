// The shell: the sidebar that every screen sits beside. It knows the list of
// screens and how to lay them out, and nothing about what a screen shows.
import { $, h } from "./kit.js";

// A project's own screens, in the order they show under it.
const PROJECT_SCREENS = [
  ["intake", "Intake"],
  ["backlog", "Backlog"],
  ["board", "Board"],
  ["features", "Features"],
];
const TOP = [["overview", "Overview"]];
const BOTTOM = [
  ["archive", "Archive"],
  ["connections", "Connections"],
  ["changes", "Changes"],
  ["settings", "Settings"],
];

// Which projects are open in the sidebar is remembered in this browser only.
const KEY = "tasks.sidebar.open";
function opened() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function remember(open) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...open]));
  } catch {
    // Without storage the sidebar still works; it forgets on reload.
  }
}

const link = (view, text, current, count) =>
  h(
    "a",
    { href: `#/${view}`, class: current ? "on" : "", "aria-current": current ? "page" : undefined },
    text,
    count > 0 && h("span", { class: "count", text: String(count) }),
  );

/**
 * Draws the sidebar. `projects` are the projects to list, `view` and
 * `project` say where the person is, `counts` are the numbers to show beside
 * entries, and `moveProject(id, before)` is called when a project is dragged
 * onto another.
 */
export function drawSidebar({ projects, view, project, counts, moveProject }) {
  const open = opened();
  if (project) open.add(project);
  const side = $("side");
  side.classList.remove("open");
  side.replaceChildren(
    h("span", { class: "brand", text: "Tasks" }),
    h(
      "nav",
      { "aria-label": "Screens" },
      TOP.map(([v, text]) => link(v, text, view === v, counts[v])),
      h("h2", { class: "side-heading", text: "Projects" }),
      projects.length === 0 && h("span", { class: "caption", text: "No projects yet." }),
      projects.map((p) => {
        const isOpen = open.has(p.id);
        return h(
          "div",
          {
            class: "side-project",
            draggable: true,
            ondragstart: (e) => e.dataTransfer.setData("application/x-project", p.id),
            ondragover: (e) => {
              if (e.dataTransfer.types.includes("application/x-project")) e.preventDefault();
            },
            ondrop: (e) => {
              const moved = e.dataTransfer.getData("application/x-project");
              if (moved && moved !== p.id) moveProject(moved, p.id);
            },
          },
          h(
            "div",
            { class: "side-row" },
            h("button", {
              type: "button",
              class: "link",
              text: isOpen ? "▾" : "▸",
              "aria-expanded": String(isOpen),
              "aria-label": `Show or hide the screens of ${p.name}`,
              onclick: () => {
                if (isOpen) open.delete(p.id);
                else open.add(p.id);
                remember(open);
                drawSidebar({ projects, view, project, counts, moveProject });
              },
            }),
            h(
              "a",
              { href: `#/board/${p.id}`, class: `grow${project === p.id ? " on" : ""}` },
              h("span", { class: `project-icon ${p.colour}`, text: p.icon || p.name.slice(0, 1) }),
              p.name,
            ),
          ),
          isOpen &&
            h(
              "div",
              { class: "side-sub" },
              PROJECT_SCREENS.map(([v, text]) =>
                h(
                  "a",
                  {
                    href: `#/${v}/${p.id}`,
                    class: view === v && project === p.id ? "on" : "",
                  },
                  text,
                ),
              ),
            ),
        );
      }),
    ),
    h(
      "nav",
      { class: "side-bottom", "aria-label": "More screens" },
      BOTTOM.map(([v, text]) => link(v, text, view === v, counts[v])),
    ),
  );
}

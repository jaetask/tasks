// Tasks' page. Plain script, no framework, no build step. Everything the
// page reads or changes goes through POST /api/calls: the same Call pipeline
// agents use. Text from the App is set as text; Cards arrive as escaped HTML.
import { $, button, fill, h, lineForm, select } from "./kit.js";
import { drawSidebar } from "./shell.js";

const OWNER = "owner";
const KINDS = { todo: "to do", doing: "doing", waiting: "waiting", done: "done" };
const COLOURS = ["teal", "plum", "red", "amber", "green", "grey"];
const REACTIONS = ["👍", "👀", "✅"];

const state = {
  view: "overview",
  catalog: null,
  project: null,
  text: "",
  actor: "",
  feature: "",
  archivedFeatures: false,
  editingColumns: false,
  ticket: null,
  editingTicket: false,
  replyTo: null,
  archive: "all",
  inbox: "received",
  openRuns: new Set(),
  editingStep: null,
};
const imageData = new Map();

const when = (at) => new Date(at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
const actorName = (id) => state.catalog.actors.find((a) => a.id === id)?.name || id;
const avatar = (id, name) =>
  h("span", {
    class: `avatar${id === OWNER ? " owner" : ""}`,
    title: name,
    text: (name || "?").slice(0, 1).toUpperCase(),
  });

let resultTimer;
function showResult(content, refused = false) {
  const box = $("result");
  box.className = `result${refused ? " refused" : ""}`;
  if (typeof content === "string") box.textContent = content;
  else box.replaceChildren(content);
  // Shown as a popover, so that it is above an open ticket too.
  if (box.matches(":popover-open")) box.hidePopover();
  box.showPopover();
  clearTimeout(resultTimer);
  resultTimer = setTimeout(() => {
    if (box.matches(":popover-open")) box.hidePopover();
  }, 6000);
}

// ---- the App ----

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: { "x-kit-request": "1", "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 401 && path !== "/api/session") showSignIn();
  return response.json();
}

const call = (action, input = {}) =>
  api("/api/calls", { method: "POST", body: { id: crypto.randomUUID?.(), action, input } });

// A succeeded Outcome's output; otherwise null, with the reason shown.
function output(outcome, showCard) {
  if (outcome.state !== "succeeded") {
    showResult(outcome.reason?.message ?? outcome.error ?? `The Call was ${outcome.state}.`, true);
    return null;
  }
  if (outcome.output?.refused) {
    showResult(outcome.output.refused.message, true);
    return null;
  }
  if (showCard && outcome.card?.html) {
    const card = h("div");
    card.innerHTML = outcome.card.html; // escaped by the App's cardHtml
    showResult(card);
  }
  return outcome.output;
}

const read = async (action, input) => output(await call(action, input), false);

// Makes a change, shows its Card or why it was refused, and draws the page again.
async function act(action, input) {
  const result = output(await call(action, input), true);
  // Gentle, in case the owner has already started typing somewhere else.
  await refresh({ gentle: true });
  return result;
}

// ---- board ----

function ticketCard(ticket) {
  return h(
    "button",
    {
      type: "button",
      class: `card${ticket.blocked ? " blocked" : ""}`,
      draggable: true,
      onclick: () => openTicket(ticket.id),
      ondragstart: (e) => e.dataTransfer.setData("text/plain", ticket.id),
    },
    ticket.labels.length > 0 &&
      h(
        "span",
        { class: "bars" },
        ticket.labels.map((l) => h("span", { class: `bar-label ${l.colour}`, title: l.name })),
      ),
    h("b", { text: ticket.title }),
    ticket.blocked && h("span", { class: "blocked-note", text: `Blocked: ${ticket.blocked}` }),
    h(
      "span",
      { class: "card-meta" },
      h("span", { class: "mono", text: ticket.id }),
      ticket.featureName && h("span", { text: ticket.featureName }),
      ticket.comments > 0 && h("span", { text: `💬 ${ticket.comments}` }),
      ticket.images > 0 && h("span", { text: `🖼 ${ticket.images}` }),
      ticket.assignee && avatar(ticket.assignee, ticket.assigneeName),
    ),
  );
}

function columnView(column, index, columns) {
  const node = h("section", {
    class: "column",
    "aria-label": column.name,
    ondragover: (e) => {
      e.preventDefault();
      node.classList.add("over");
    },
    ondragleave: () => node.classList.remove("over"),
    ondrop: (e) => {
      e.preventDefault();
      node.classList.remove("over");
      const ticket = e.dataTransfer.getData("text/plain");
      if (ticket) act("tickets.ticket-move", { ticket, column: column.id });
    },
  });
  if (state.editingColumns) {
    const name = h("input", {
      type: "text",
      value: column.name,
      maxLength: 60,
      "aria-label": "Column name",
    });
    name.addEventListener("change", () => {
      if (name.value.trim())
        act("catalog.column-rename", { column: column.id, name: name.value.trim() });
    });
    node.append(
      h(
        "div",
        { class: "column-edit" },
        name,
        select(
          Object.entries(KINDS),
          column.kind,
          (kind) => act("catalog.column-kind-set", { column: column.id, kind }),
          "Column kind",
        ),
        h(
          "div",
          { class: "row" },
          h("button", {
            type: "button",
            class: "small",
            text: "←",
            "aria-label": "Move column left",
            disabled: index === 0,
            onclick: () =>
              act("catalog.column-move", { column: column.id, before: columns[index - 1].id }),
          }),
          h("button", {
            type: "button",
            class: "small",
            text: "→",
            "aria-label": "Move column right",
            disabled: index === columns.length - 1,
            onclick: () =>
              act("catalog.column-move", { column: column.id, before: columns[index + 2]?.id }),
          }),
          h("button", {
            type: "button",
            class: "small danger",
            text: "Remove",
            disabled: columns.length === 1,
            onclick: () => act("catalog.column-remove", { column: column.id }),
          }),
        ),
      ),
    );
  } else {
    node.append(
      h(
        "div",
        { class: "column-head" },
        h("h3", { text: column.name }),
        h("span", { class: `kind ${column.kind}`, text: KINDS[column.kind] }),
      ),
    );
  }
  node.append(...column.tickets.map(ticketCard));
  if (column.tickets.length === 0 && !state.editingColumns)
    node.append(h("span", { class: "caption", text: "No tickets." }));
  return node;
}

// What the board and the overview are narrowed to, as the Actions take it.
const narrow = () => ({
  ...(state.view === "board" && state.feature !== ""
    ? { feature: state.feature === "none" ? null : state.feature }
    : {}),
  ...(state.text ? { text: state.text } : {}),
  ...(state.actor === "" ? {} : { assignee: state.actor === "nobody" ? null : state.actor }),
});

// A search box and an actor filter, shared by the board and the overview.
function narrowControls() {
  const search = h("input", {
    type: "text",
    placeholder: "Search tickets",
    value: state.text,
    "aria-label": "Search tickets",
  });
  search.addEventListener("change", () => {
    state.text = search.value.trim();
    refresh();
  });
  const actors = state.catalog.actors.filter((a) => !a.archived);
  return [
    search,
    select(
      [["", "Anyone"], ["nobody", "Nobody"], ...actors.map((a) => [a.id, a.name])],
      state.actor,
      (actor) => {
        state.actor = actor;
        refresh();
      },
      "Assigned to",
    ),
  ];
}

async function overviewView() {
  const projects = state.catalog.projects.filter((p) => !p.archived);
  if (projects.length === 0) {
    return [h("div", { class: "stack" }, newProjectPanel("Create your first project"))];
  }
  const overview = await read("tickets.overview-read", narrow());
  if (!overview) return [];
  // Dropping a ticket on a kind moves it to its own board's first column of that kind.
  const drop = (kind) => (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const project = projects.find((p) => id.startsWith(`${p.id}-`));
    const column = project?.columns.find((c) => c.kind === kind);
    if (!id) return;
    if (column) act("tickets.ticket-move", { ticket: id, column: column.id });
    else showResult(`That ticket's board has no ${KINDS[kind]} column.`, true);
  };
  return [
    h(
      "div",
      { class: "board-head" },
      h("h2", { class: "grow", text: "Overview" }),
      narrowControls(),
    ),
    h(
      "div",
      { class: "board" },
      overview.kinds.map(({ kind, tickets }) =>
        h(
          "section",
          {
            class: "column",
            "aria-label": KINDS[kind],
            ondragover: (e) => e.preventDefault(),
            ondrop: drop(kind),
          },
          h(
            "div",
            { class: "column-head" },
            h("h3", { text: KINDS[kind] }),
            h("span", { class: `kind ${kind}`, text: String(tickets.length) }),
          ),
          tickets.map(ticketCard),
          tickets.length === 0 && h("span", { class: "caption", text: "No tickets." }),
        ),
      ),
    ),
  ];
}

async function boardView() {
  const projects = state.catalog.projects.filter((p) => !p.archived);
  if (!state.project)
    return [h("div", { class: "stack" }, newProjectPanel("Create your first project"))];
  const project = projects.find((p) => p.id === state.project);
  const features = (await read("tickets.feature-find", { project: state.project })) ?? [];
  if (!["", "none"].includes(state.feature) && !features.some((f) => f.id === state.feature)) {
    state.feature = "";
  }
  const board = await read("tickets.board-read", { project: state.project, ...narrow() });
  if (!board) return [];
  const missing = Object.keys(KINDS).filter((k) => !board.columns.some((c) => c.kind === k));
  const warn = {
    todo: "no to-do column, so new tickets have nowhere to start",
    doing: "no doing column, so agents cannot claim tickets",
    waiting: "no waiting column, so asking for review moves nothing",
    done: "no done column, so nothing counts as finished",
  };
  let kind = "waiting";
  return [
    h(
      "div",
      { class: "board-head" },
      h("h2", { class: "grow", text: `${project.icon} ${project.name} · Board`.trim() }),
      features.length > 0 &&
        select(
          [["", "Every feature"], ["none", "No feature"], ...features.map((f) => [f.id, f.name])],
          state.feature,
          (feature) => {
            state.feature = feature;
            refresh();
          },
          "Feature",
        ),
      narrowControls(),
      lineForm("New ticket", "Add", (title) =>
        act("tickets.ticket-create", { project: state.project, title }),
      ),
      h("button", {
        type: "button",
        text: state.editingColumns ? "Done editing" : "Edit columns",
        "aria-pressed": String(state.editingColumns),
        onclick: () => {
          state.editingColumns = !state.editingColumns;
          refresh();
        },
      }),
    ),
    missing.length > 0 &&
      h("p", {
        class: "caption",
        text: `This board has ${missing.map((k) => warn[k]).join("; ")}.`,
      }),
    h(
      "div",
      { class: "board" },
      board.columns.map(columnView),
      state.editingColumns &&
        h(
          "section",
          { class: "column" },
          h("h3", { text: "Add a column" }),
          select(
            Object.entries(KINDS),
            kind,
            (v) => {
              kind = v;
            },
            "Kind of the new column",
          ),
          lineForm("Column name", "Add", (name) =>
            act("catalog.column-add", { project: state.project, name, kind }),
          ),
        ),
    ),
  ];
}

// ---- backlog ----

async function backlogView() {
  if (!state.project)
    return [h("div", { class: "stack" }, newProjectPanel("Create your first project"))];
  const project = state.catalog.projects.find((p) => p.id === state.project);
  const tickets =
    (await read("tickets.backlog-read", { project: state.project, ...narrow() })) ?? [];
  return [
    h(
      "div",
      { class: "board-head" },
      h("h2", { class: "grow", text: `${project.icon} ${project.name} · Backlog`.trim() }),
      narrowControls(),
      lineForm("New ticket for the backlog", "Add", (title) =>
        act("tickets.ticket-create", { project: state.project, title, backlog: true }),
      ),
    ),
    h("p", {
      class: "caption",
      text: "Tickets wait here until you put them on the board. Agents looking for work do not see them.",
    }),
    tickets.length > 0
      ? h(
          "ul",
          { class: "list backlog" },
          tickets.map((t) =>
            h(
              "li",
              {},
              h("div", { class: "grow" }, ticketCard(t)),
              button("To the board", () => act("tickets.ticket-board-send", { ticket: t.id })),
            ),
          ),
        )
      : h("p", { class: "muted", text: "The backlog is empty." }),
  ];
}

// ---- features ----

async function featuresView() {
  if (!state.project)
    return [h("div", { class: "stack" }, newProjectPanel("Create your first project"))];
  const project = state.catalog.projects.find((p) => p.id === state.project);
  const features =
    (await read("tickets.feature-find", {
      project: state.project,
      archived: state.archivedFeatures,
    })) ?? [];
  return [
    h(
      "div",
      { class: "stack" },
      h(
        "section",
        { class: "panel" },
        h(
          "div",
          { class: "row spread wrap" },
          h("h2", { text: `${project.icon} ${project.name} · Features`.trim() }),
          h("button", {
            type: "button",
            text: "Show archived",
            "aria-pressed": String(state.archivedFeatures),
            onclick: () => {
              state.archivedFeatures = !state.archivedFeatures;
              refresh();
            },
          }),
        ),
        h("p", {
          class: "muted",
          text: "A feature is one part of the project. It groups the tickets for that part.",
        }),
        features.length > 0
          ? h(
              "ul",
              { class: "list" },
              features.map((f) =>
                h(
                  "li",
                  {},
                  h("button", {
                    type: "button",
                    class: "small",
                    text: f.favourite ? "★" : "☆",
                    "aria-pressed": String(f.favourite),
                    "aria-label": `Favourite ${f.name}`,
                    onclick: () =>
                      act("tickets.feature-edit", { feature: f.id, favourite: !f.favourite }),
                  }),
                  lineForm(
                    "Name",
                    "Rename",
                    (name) => act("tickets.feature-edit", { feature: f.id, name }),
                    f.name,
                  ),
                  h("span", { class: "caption", text: `${f.tickets} open` }),
                  button(
                    "Open on the board",
                    () => {
                      state.feature = f.id;
                      location.hash = `#/board/${f.project}`;
                    },
                    "small",
                  ),
                  f.archived
                    ? button(
                        "Restore",
                        () => act("tickets.feature-restore", { feature: f.id }),
                        "small",
                      )
                    : button(
                        "Archive",
                        () => act("tickets.feature-archive", { feature: f.id }),
                        "small",
                      ),
                ),
              ),
            )
          : h("p", { class: "muted", text: "No features yet." }),
        lineForm("New feature, such as Voice", "Add feature", (name) =>
          act("tickets.feature-create", { project: state.project, name }),
        ),
      ),
    ),
  ];
}

// ---- a ticket ----

async function openTicket(id) {
  state.ticket = id;
  state.editingTicket = false;
  state.replyTo = null;
  $("tk-text").value = "";
  if (!$("ticket").open) $("ticket").showModal();
  await renderTicket();
}

function commentView(comment, isReply) {
  const mine = (r) => r.actors.includes(OWNER);
  const react = (emoji, on) =>
    act(on ? "comments.reaction-remove" : "comments.reaction-add", { comment: comment.id, emoji });
  return h(
    "div",
    { class: `comment${isReply ? " reply" : ""}` },
    h(
      "div",
      { class: "comment-head" },
      avatar(comment.author, comment.authorName),
      h("b", { text: comment.authorName }),
      comment.author !== OWNER && h("span", { class: "agent", text: "agent" }),
      h("span", {
        class: "caption",
        text: when(comment.at) + (comment.editedAt ? " · edited" : ""),
      }),
    ),
    h("p", {
      class: comment.removed ? "muted" : "",
      text: comment.removed ? "This comment was removed." : comment.text,
    }),
    !comment.removed &&
      h(
        "div",
        { class: "reactions" },
        comment.reactions.map((r) =>
          h("button", {
            type: "button",
            text: `${r.emoji} ${r.actors.length}`,
            title: r.actors.map(actorName).join(", "),
            "aria-pressed": String(mine(r)),
            onclick: () => react(r.emoji, mine(r)),
          }),
        ),
        REACTIONS.filter((e) => !comment.reactions.some((r) => r.emoji === e)).map((e) =>
          h("button", {
            type: "button",
            class: "add",
            text: `+${e}`,
            "aria-label": `React with ${e}`,
            onclick: () => react(e, false),
          }),
        ),
        !isReply &&
          h("button", {
            type: "button",
            text: state.replyTo === comment.id ? "Replying…" : "Reply",
            "aria-pressed": String(state.replyTo === comment.id),
            onclick: () => {
              state.replyTo = state.replyTo === comment.id ? null : comment.id;
              renderTicket();
              $("tk-text").focus();
            },
          }),
        button("Remove", () => act("comments.comment-remove", { comment: comment.id })),
      ),
    !isReply && comment.replies.map((r) => commentView(r, true)),
  );
}

async function imageThumb(image) {
  if (!imageData.has(image.id)) {
    const full = await read("images.image-read", { image: image.id });
    if (full) imageData.set(image.id, `data:${full.type};base64,${full.data}`);
  }
  return h(
    "div",
    { class: "thumb" },
    h("img", { src: imageData.get(image.id) ?? "", alt: image.name }),
    h("span", { class: "caption", text: image.name }),
    button("Remove", () => act("images.image-remove", { image: image.id }), "small"),
  );
}

function addImage(ticket) {
  const input = h("input", {
    type: "file",
    accept: "image/png,image/jpeg,image/gif,image/webp",
    "aria-label": "Add an image",
  });
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result).split(",")[1] ?? "";
      act("images.image-add", { ticket, name: file.name, type: file.type, data });
    };
    reader.readAsDataURL(file);
  });
  return input;
}

async function renderTicket() {
  const id = state.ticket;
  const [ticket, conversation, images] = await Promise.all([
    read("tickets.ticket-read", { ticket: id }),
    read("comments.conversation-read", { ticket: id }),
    read("images.image-list", { ticket: id }),
  ]);
  if (!ticket || !conversation || !images || state.ticket !== id) {
    if (!ticket) closeTicket();
    return;
  }
  const open = ticket.state === "open";
  $("tk-where").textContent = [
    ticket.id,
    ticket.backlog ? "in the backlog" : `in ${ticket.column.name}`,
    ticket.assignee ? `assigned to ${ticket.assigneeName}` : "assigned to nobody",
    open ? "" : ticket.state,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!state.editingTicket) {
    fill(
      "tk-head",
      h(
        "div",
        { class: "row spread" },
        h("h2", { text: ticket.title }),
        open &&
          button("Edit", () => {
            state.editingTicket = true;
            const title = h("input", {
              type: "text",
              value: ticket.title,
              maxLength: 200,
              "aria-label": "Title",
            });
            const description = h("textarea", {
              value: ticket.description,
              maxLength: 20000,
              "aria-label": "Description",
            });
            const done = () => {
              state.editingTicket = false;
              renderTicket();
            };
            fill("tk-head", h("div", { class: "row" }, title));
            fill(
              "tk-body",
              description,
              h(
                "div",
                { class: "row" },
                button(
                  "Save",
                  async () => {
                    state.editingTicket = false;
                    const changed = {
                      ...(title.value.trim() === ticket.title ? {} : { title: title.value }),
                      ...(description.value === ticket.description
                        ? {}
                        : { description: description.value }),
                    };
                    if (Object.keys(changed).length === 0) return renderTicket();
                    await act("tickets.ticket-edit", { ticket: id, ...changed });
                  },
                  "primary",
                ),
                button("Cancel", done),
              ),
            );
          }),
      ),
    );
    fill(
      "tk-body",
      ticket.blocked && h("p", { class: "blocked-box", text: `Blocked: ${ticket.blocked}` }),
      h("p", {
        class: `description${ticket.description ? "" : " muted"}`,
        text: ticket.description || "No description.",
      }),
    );
  }

  const free = state.catalog.labels.filter((l) => !ticket.labels.some((t) => t.id === l.id));
  fill(
    "tk-labels",
    ...ticket.labels.map((l) =>
      h("button", {
        type: "button",
        class: `label ${l.colour}`,
        text: open ? `${l.name} ×` : l.name,
        title: open ? `Remove the label ${l.name}` : l.name,
        disabled: !open,
        onclick: () => act("tickets.ticket-label-remove", { ticket: id, label: l.id }),
      }),
    ),
    ...(open && free.length > 0
      ? [
          select(
            [["", "Add a label…"], ...free.map((l) => [l.id, l.name])],
            "",
            (label) => label && act("tickets.ticket-label-add", { ticket: id, label }),
            "Add a label",
          ),
        ]
      : []),
  );

  fill("tk-images", ...(await Promise.all(images.map(imageThumb))), addImage(id));

  const project = state.catalog.projects.find((p) => p.id === ticket.project);
  const features = (await read("tickets.feature-find", { project: ticket.project })) ?? [];
  const actors = state.catalog.actors.filter((a) => !a.archived);
  fill(
    "tk-actions",
    ...(open
      ? [
          select(
            project.columns.map((c) => [c.id, `In ${c.name}`]),
            ticket.column.id,
            (column) => act("tickets.ticket-move", { ticket: id, column }),
            "Move to a column",
          ),
          select(
            [["", "Assigned to nobody"], ...actors.map((a) => [a.id, `Assigned to ${a.name}`])],
            ticket.assignee ?? "",
            (actor) => act("tickets.ticket-assign", { ticket: id, actor: actor || null }),
            "Assign",
          ),
          features.length > 0 &&
            select(
              [["", "In no feature"], ...features.map((f) => [f.id, `In ${f.name}`])],
              ticket.feature ?? "",
              (feature) =>
                act("tickets.ticket-feature-set", { ticket: id, feature: feature || null }),
              "Feature",
            ),
          ticket.blocked
            ? button("Unblock", () => act("tickets.ticket-unblock", { ticket: id }))
            : button("Mark blocked", () => {
                const note = window.prompt("Why is it blocked?");
                if (note?.trim()) act("tickets.ticket-block", { ticket: id, note: note.trim() });
              }),
          ticket.backlog
            ? button("Put on the board", () => act("tickets.ticket-board-send", { ticket: id }))
            : button("Send to the backlog", () =>
                act("tickets.ticket-backlog-send", { ticket: id }),
              ),
          button("Archive", () => act("tickets.ticket-archive", { ticket: id })),
          button("Cancel ticket", () => act("tickets.ticket-cancel", { ticket: id })),
        ]
      : [
          button("Restore", () => act("tickets.ticket-restore", { ticket: id }), "primary"),
          button(
            "Delete forever",
            async () => {
              if (
                !window.confirm(
                  `Delete ${id} forever, with its comments and images? This cannot be undone.`,
                )
              )
                return;
              closeTicket();
              await act("tickets.ticket-delete", { ticket: id });
            },
            "danger",
          ),
        ]),
  );

  fill(
    "tk-thread",
    ...conversation.entries.map((entry) =>
      entry.type === "comment"
        ? commentView(entry.comment, false)
        : h(
            "div",
            { class: "line" },
            h("span", {
              class: entry.change.undoable ? "" : "undone",
              text: `${entry.change.actorName} ${entry.change.summary}`,
            }),
            entry.change.undoable &&
              button(
                "Undo",
                () => act("history.change-undo", { change: entry.change.id }),
                "small",
              ),
          ),
    ),
  );
  const replying = conversation.entries.find(
    (e) => e.type === "comment" && e.comment.id === state.replyTo,
  );
  $("tk-text").placeholder = replying
    ? `Reply to ${replying.comment.authorName}`
    : "Write a comment";
}

function closeTicket() {
  state.ticket = null;
  if ($("ticket").open) $("ticket").close();
}

// ---- archive ----

async function archiveView() {
  const [archived, canceled] = await Promise.all([
    read("tickets.ticket-find", { state: "archived" }),
    read("tickets.ticket-find", { state: "canceled" }),
  ]);
  const all = [...(archived ?? []), ...(canceled ?? [])].filter(
    (t) => state.archive === "all" || t.state === state.archive,
  );
  const filter = (value, text) =>
    h("button", {
      type: "button",
      text,
      "aria-pressed": String(state.archive === value),
      onclick: () => {
        state.archive = value;
        refresh();
      },
    });
  return [
    h(
      "div",
      { class: "stack" },
      h(
        "section",
        { class: "panel" },
        h(
          "div",
          { class: "row spread wrap" },
          h("h2", { text: "Archive" }),
          h(
            "div",
            { class: "row" },
            filter("all", "All"),
            filter("archived", "Archived"),
            filter("canceled", "Canceled"),
          ),
        ),
        all.length === 0
          ? h("p", {
              class: "muted",
              text: "Nothing here. Archived and canceled tickets are kept here until you restore them.",
            })
          : h(
              "div",
              { class: "scroll" },
              h(
                "table",
                {},
                h(
                  "thead",
                  {},
                  h(
                    "tr",
                    {},
                    ["Id", "Title", "Column", "State", ""].map((t) => h("th", { text: t })),
                  ),
                ),
                h(
                  "tbody",
                  {},
                  all.map((t) =>
                    h(
                      "tr",
                      {},
                      h("td", { class: "mono", text: t.id }),
                      h(
                        "td",
                        {},
                        button(t.title, () => openTicket(t.id), "link"),
                      ),
                      h("td", { text: t.column.name }),
                      h("td", { text: t.state }),
                      h(
                        "td",
                        {},
                        button(
                          "Restore",
                          () => act("tickets.ticket-restore", { ticket: t.id }),
                          "small",
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
      ),
    ),
  ];
}

// ---- changes ----

async function changesView() {
  const changes = ((await read("history.change-list", { limit: 200 })) ?? []).reverse();
  return [
    h(
      "div",
      { class: "stack" },
      h(
        "section",
        { class: "panel" },
        h("h2", { text: "Changes" }),
        h("p", {
          class: "muted",
          text: "Every change, newest first, with who made it. Undo puts back what a change changed.",
        }),
        h(
          "div",
          { class: "scroll" },
          h(
            "table",
            {},
            h(
              "thead",
              {},
              h(
                "tr",
                {},
                ["When", "Who", "What", ""].map((t) => h("th", { text: t })),
              ),
            ),
            h(
              "tbody",
              {},
              changes.map((c) =>
                h(
                  "tr",
                  {},
                  h("td", { class: "caption", text: when(c.at) }),
                  h("td", { text: actorName(c.actor) }),
                  h("td", { class: c.undoneBy ? "undone" : "", text: c.summary }),
                  h(
                    "td",
                    {},
                    c.undoable &&
                      button("Undo", () => act("history.change-undo", { change: c.id }), "small"),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  ];
}

// ---- connections ----

async function connectionsView() {
  const connections = (await read("connections.connection-list")) ?? [];
  const agents = state.catalog.actors.filter((a) => a.id !== OWNER && !a.archived);
  const waiting = connections
    .filter((c) => c.state === "pairing")
    .map((c) => {
      let actor = agents[0]?.id ?? "";
      let may = c.may === "read" ? "read" : "change";
      const name = h("input", {
        type: "text",
        placeholder: "New actor's name",
        value: c.name,
        maxLength: 60,
        "aria-label": "New actor's name",
        hidden: actor !== "",
      });
      return h(
        "li",
        {},
        h("b", { text: c.name }),
        h("span", { class: "caption", text: `asks to ${c.may}` }),
        select(
          [...agents.map((a) => [a.id, `as ${a.name}`]), ["", "as a new actor…"]],
          actor,
          (v) => {
            actor = v;
            name.hidden = v !== "";
          },
          "The actor it acts as",
        ),
        name,
        select(
          [
            ["change", "may read and change"],
            ["read", "may only read"],
          ],
          may,
          (v) => {
            may = v;
          },
          "What it may do",
        ),
        button(
          "Approve",
          async () => {
            let id = actor;
            if (!id) {
              const made = await act("catalog.actor-create", { name: name.value.trim() || c.name });
              if (!made) return;
              id = made.id;
            }
            await act("connections.connection-approve", {
              connection: c.id,
              actor: id,
              change: may === "change",
            });
          },
          "primary",
        ),
        button("Turn down", () => act("connections.connection-revoke", { connection: c.id })),
      );
    });
  const row = (c) =>
    h(
      "tr",
      {},
      h("td", { text: c.name }),
      h("td", { text: c.actorName }),
      h("td", { text: c.may }),
      h(
        "td",
        {},
        c.state === "connected"
          ? button(
              "Revoke",
              () => act("connections.connection-revoke", { connection: c.id }),
              "small danger",
            )
          : h("span", { class: "caption", text: "revoked" }),
      ),
    );
  const rest = connections.filter((c) => c.state !== "pairing");
  return [
    h(
      "div",
      { class: "stack" },
      h(
        "section",
        { class: "panel" },
        h("h2", { text: "Waiting for you" }),
        waiting.length > 0
          ? h("ul", { class: "list" }, waiting)
          : h("p", {
              class: "muted",
              text: "No agent is asking to connect. A request you do not approve expires after 10 minutes.",
            }),
      ),
      h(
        "section",
        { class: "panel" },
        h("h2", { text: "Connections" }),
        rest.length > 0
          ? h(
              "div",
              { class: "scroll" },
              h(
                "table",
                {},
                h(
                  "thead",
                  {},
                  h(
                    "tr",
                    {},
                    ["Name", "Acts as", "May", ""].map((t) => h("th", { text: t })),
                  ),
                ),
                h("tbody", {}, rest.map(row)),
              ),
            )
          : h("p", { class: "muted", text: "Nothing is connected yet." }),
        h("p", {
          class: "caption",
          text: `An agent asks to connect at ${location.origin}/pair and then uses ${location.origin}/mcp with the key it collects.`,
        }),
      ),
    ),
  ];
}

// ---- inbox ----

const INTAKE = [
  "item-tag",
  "item-untag",
  "item-category-set",
  "item-fields-set",
  "item-fields-clear",
  "item-edit",
  "item-accept",
  "item-reject",
  "item-dismiss",
  "item-promote",
  "item-link",
];
// What each kind of step needs, as [setting, what to type].
const STEP_KINDS = {
  script: [["file", "File in the steps folder, such as spam-check.mjs"]],
  "local-model": [
    ["url", "Address, such as http://127.0.0.1:11434/v1"],
    ["model", "Model"],
    ["instructions", "What it should do"],
  ],
  "hosted-model": [
    ["url", "Address, such as https://api.example.com/v1"],
    ["model", "Model"],
    ["key_env", "Name of the environment variable with the key"],
    ["instructions", "What it should do"],
  ],
  classifier: [
    ["url", "Address of the model"],
    ["model", "Model"],
    ["key_env", "Name of the environment variable with the key, if it needs one"],
    [
      "labels",
      'Labels as JSON, such as {"spam":[{"action":"item-reject","input":{"reason":"spam"}}]}',
    ],
  ],
  app: [["action", "The other App's Action, such as sorter.sort"]],
};
const CONDITIONS = {
  "": "every item",
  project: "items for the project",
  tag: "items tagged",
  category: "items in the category",
  source: "items from",
  word: "items with the word",
};

function itemView(item) {
  const live = item.state === "received" || item.state === "accepted";
  const why = (verb, action) =>
    button(verb, () => {
      const reason = window.prompt(`Why ${verb.toLowerCase()} it?`);
      if (reason?.trim()) act(action, { item: item.id, reason: reason.trim() });
    });
  const runs = h("div", { class: "runs" });
  const details = h(
    "details",
    {
      // Which items are opened is kept, so that drawing the page again leaves them open.
      open: state.openRuns.has(item.id),
      ontoggle: async () => {
        if (details.open) state.openRuns.add(item.id);
        else state.openRuns.delete(item.id);
        if (!details.open) return;
        const found = await read("inbox.item-read", { item: item.id });
        runs.replaceChildren(
          ...(found?.runs ?? []).map((run) =>
            h(
              "div",
              {},
              h("p", { class: "caption", text: `${when(run.at)} · ${run.ended}` }),
              h(
                "ul",
                {},
                run.steps.map((s) =>
                  h(
                    "li",
                    {},
                    h("b", { text: s.name }),
                    ` ${s.ran ? "" : "did not run. "}${s.reason}`,
                    s.calls.length > 0 &&
                      h(
                        "ul",
                        {},
                        s.calls.map((c) =>
                          h("li", {
                            class: "mono",
                            text: `${c.action} ${JSON.stringify(c.input)} → ${c.outcome}`,
                          }),
                        ),
                      ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    },
    h("summary", { text: "What the steps did" }),
    runs,
  );
  return h(
    "li",
    { class: "item" },
    h(
      "div",
      { class: "row wrap" },
      h("b", { text: item.title }),
      h("span", {
        class: "mono caption",
        text: `${item.id} · from ${item.source} · ${when(item.at)}`,
      }),
      item.tags.map((t) => h("span", { class: "label grey", text: t })),
      item.category && h("span", { class: "label plum", text: item.category }),
    ),
    item.text !== item.title && h("p", { class: "description", text: item.text }),
    (item.original.title !== item.title || item.original.text !== item.text) &&
      h("p", { class: "caption", text: `As captured: ${item.original.text}` }),
    Object.keys(item.fields).length > 0 &&
      h("p", {
        class: "caption mono",
        text: Object.entries(item.fields)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · "),
      }),
    item.reason && h("p", { class: "caption", text: `Reason: ${item.reason}` }),
    h(
      "div",
      { class: "row wrap" },
      item.ticket && button(`Open ${item.ticket}`, () => openTicket(item.ticket), "small"),
      live &&
        item.state !== "accepted" &&
        button("Accept", () => act("inbox.item-accept", { item: item.id }), "small"),
      live &&
        button("Add to the backlog", () => act("inbox.item-promote", { item: item.id }), "small"),
      live &&
        button(
          "Put on the board",
          () => act("inbox.item-promote", { item: item.id, backlog: false }),
          "small",
        ),
      live && why("Reject", "inbox.item-reject"),
      live && why("Dismiss", "inbox.item-dismiss"),
      live &&
        button("Run the steps again", () => act("inbox.item-run", { item: item.id }), "small"),
    ),
    details,
  );
}

function stepForm(steps) {
  const editing = steps.find((s) => s.id === state.editingStep);
  const agents = state.catalog.actors.filter((a) => a.id !== OWNER && !a.archived);
  const draft = editing
    ? structuredClone(editing)
    : {
        name: "",
        kind: "script",
        actor: agents[0]?.id ?? "",
        actions: ["item-tag"],
        condition: null,
        config: {},
      };
  const name = h("input", {
    type: "text",
    placeholder: "Step name, such as Spam check",
    value: draft.name,
    maxLength: 60,
    required: true,
    "aria-label": "Step name",
  });
  const settings = h("div", { class: "stack-small" });
  const inputs = new Map();
  const drawSettings = () => {
    inputs.clear();
    settings.replaceChildren(
      ...STEP_KINDS[draft.kind].map(([key, hint]) => {
        const current = draft.config[key];
        const input = h("input", {
          type: "text",
          placeholder: hint,
          "aria-label": hint,
          value:
            current === undefined
              ? ""
              : typeof current === "string"
                ? current
                : JSON.stringify(current),
        });
        inputs.set(key, input);
        return input;
      }),
    );
  };
  drawSettings();
  const [conditionKey, conditionValue] = Object.entries(draft.condition ?? {})[0] ?? ["", ""];
  let on = conditionKey;
  const value = h("input", {
    type: "text",
    placeholder: "such as request",
    value: conditionValue,
    "aria-label": "Condition value",
    hidden: on === "",
  });
  const boxes = INTAKE.map((action) => {
    const box = h("input", { type: "checkbox", checked: draft.actions.includes(action) });
    return [action, box, h("label", { class: "check" }, box, action.replace("item-", ""))];
  });
  return h(
    "form",
    {
      class: "stack-small",
      onsubmit: async (e) => {
        e.preventDefault();
        const config = {};
        for (const [key, input] of inputs) {
          if (!input.value.trim()) continue;
          try {
            config[key] = key === "labels" ? JSON.parse(input.value) : input.value.trim();
          } catch {
            return showResult("The labels are not valid JSON.", true);
          }
        }
        const step = {
          name: name.value.trim(),
          kind: draft.kind,
          actor: draft.actor,
          actions: boxes.filter(([, box]) => box.checked).map(([action]) => action),
          condition: on && value.value.trim() ? { [on]: value.value.trim() } : null,
          config,
        };
        const done = editing
          ? await act("inbox.step-edit", { step: editing.id, ...step })
          : await act("inbox.step-add", step);
        if (done) {
          state.editingStep = null;
          refresh();
        }
      },
    },
    h("h3", { text: editing ? `Change ${editing.name}` : "Add a step" }),
    agents.length === 0 &&
      h("p", {
        class: "caption",
        text: "A step's changes show under an actor. Add one in Settings first.",
      }),
    h(
      "div",
      { class: "row wrap" },
      name,
      select(
        Object.keys(STEP_KINDS).map((k) => [k, k.replace("-", " ")]),
        draft.kind,
        (k) => {
          draft.kind = k;
          drawSettings();
        },
        "Kind of step",
      ),
      select(
        agents.map((a) => [a.id, `as ${a.name}`]),
        draft.actor,
        (a) => {
          draft.actor = a;
        },
        "The actor it acts as",
      ),
    ),
    settings,
    h(
      "div",
      { class: "row wrap" },
      h("span", { class: "caption", text: "It may:" }),
      boxes.map(([, , label]) => label),
    ),
    h(
      "div",
      { class: "row wrap" },
      h("span", { class: "caption", text: "It runs on" }),
      select(
        Object.entries(CONDITIONS),
        on,
        (k) => {
          on = k;
          value.hidden = k === "";
        },
        "Which items it runs on",
      ),
      value,
    ),
    h(
      "div",
      { class: "row" },
      h("button", {
        type: "submit",
        class: "primary",
        text: editing ? "Save step" : "Add step",
        disabled: agents.length === 0,
      }),
      editing &&
        button("Cancel", () => {
          state.editingStep = null;
          refresh();
        }),
    ),
  );
}

async function inboxView() {
  if (!state.project)
    return [h("div", { class: "stack" }, newProjectPanel("Create your first project"))];
  const project = state.catalog.projects.find((p) => p.id === state.project);
  const [items, steps] = await Promise.all([
    read("inbox.inbox-read", { project: state.project, state: state.inbox }),
    read("inbox.pipeline-read"),
  ]);
  const tab = (value) =>
    h("button", {
      type: "button",
      text: value,
      "aria-pressed": String(state.inbox === value),
      onclick: () => {
        state.inbox = value;
        refresh();
      },
    });
  return [
    h(
      "div",
      { class: "stack" },
      h(
        "section",
        { class: "panel" },
        h("h2", { text: `${project.icon} ${project.name} · Intake`.trim() }),
        lineForm("A new idea or request", "Capture", (text) =>
          act("inbox.item-capture", { project: state.project, text }),
        ),
        h(
          "div",
          { class: "row wrap" },
          ["received", "accepted", "promoted", "linked", "rejected", "dismissed"].map(tab),
        ),
        (items ?? []).length > 0
          ? h("ul", { class: "list items" }, (items ?? []).map(itemView))
          : h("p", { class: "muted", text: `Nothing is ${state.inbox}.` }),
      ),
      h(
        "section",
        { class: "panel" },
        h("h2", { text: "Steps" }),
        h("p", {
          class: "muted",
          text: "Steps look at each new item, one after another. Each one may only do what you allow, and every run is recorded on the item. The steps are the same for every project; a step can be set to run on one project's items only.",
        }),
        (steps ?? []).length > 0
          ? h(
              "ol",
              { class: "list" },
              (steps ?? []).map((s, i) =>
                h(
                  "li",
                  {},
                  h("b", { text: s.name }),
                  h("span", {
                    class: "caption",
                    text: `${s.kind.replace("-", " ")} · as ${actorName(s.actor)} · may ${s.actions.map((a) => a.replace("item-", "")).join(", ")} · runs on ${
                      s.condition
                        ? Object.entries(s.condition)
                            .map(([k, v]) => `${CONDITIONS[k]} ${v}`)
                            .join(", ")
                        : "every item"
                    }`,
                  }),
                  h("button", {
                    type: "button",
                    class: "small",
                    text: s.on ? "On" : "Off",
                    "aria-pressed": String(s.on),
                    title: "Switch this step on or off",
                    onclick: () => act("inbox.step-edit", { step: s.id, on: !s.on }),
                  }),
                  h("button", {
                    type: "button",
                    class: "small",
                    text: "↑",
                    "aria-label": "Move step up",
                    disabled: i === 0,
                    onclick: () => act("inbox.step-move", { step: s.id, before: steps[i - 1].id }),
                  }),
                  h("button", {
                    type: "button",
                    class: "small",
                    text: "↓",
                    "aria-label": "Move step down",
                    disabled: i === steps.length - 1,
                    onclick: () => act("inbox.step-move", { step: s.id, before: steps[i + 2]?.id }),
                  }),
                  button(
                    "Change",
                    () => {
                      state.editingStep = s.id;
                      refresh();
                    },
                    "small",
                  ),
                  button("Remove", () => act("inbox.step-remove", { step: s.id }), "small danger"),
                ),
              ),
            )
          : h("p", { class: "muted", text: "No steps yet. New items go straight to your inbox." }),
        stepForm(steps ?? []),
      ),
    ),
  ];
}

// ---- settings ----

function newProjectPanel(title) {
  const name = h("input", {
    type: "text",
    placeholder: "Project name, such as Talk",
    maxLength: 60,
    required: true,
    "aria-label": "Project name",
  });
  const prefix = h("input", {
    type: "text",
    placeholder: "Prefix, such as TLK",
    maxLength: 6,
    required: true,
    "aria-label": "Prefix",
  });
  return h(
    "section",
    { class: "panel" },
    h("h2", { text: title }),
    h("p", {
      class: "muted",
      text: "The prefix starts every ticket id, like TLK-1. It is 2 to 6 letters and stays the same.",
    }),
    h(
      "form",
      {
        class: "row wrap",
        onsubmit: (e) => {
          e.preventDefault();
          act("catalog.project-create", {
            name: name.value.trim(),
            prefix: prefix.value.trim().toUpperCase(),
          });
        },
      },
      name,
      prefix,
      h("button", { type: "submit", class: "primary", text: "Create project" }),
    ),
  );
}

async function settingsView() {
  const { actors, projects, labels } = state.catalog;
  const rename = (label, value, onsave) => lineForm(label, "Rename", onsave, value);
  let colour = "teal";
  return [
    h(
      "div",
      { class: "stack" },
      h(
        "section",
        { class: "panel" },
        h("h2", { text: "Actors" }),
        h("p", {
          class: "muted",
          text: "You, and one actor for each of your agents. Every change shows its actor.",
        }),
        h(
          "ul",
          { class: "list" },
          actors.map((a) =>
            h(
              "li",
              {},
              avatar(a.id, a.name),
              rename("Name", a.name, (name) => act("catalog.actor-rename", { actor: a.id, name })),
              a.id === OWNER
                ? h("span", { class: "caption", text: "you" })
                : a.archived
                  ? button("Restore", () => act("catalog.actor-restore", { actor: a.id }))
                  : button("Archive", () => act("catalog.actor-archive", { actor: a.id })),
            ),
          ),
        ),
        lineForm("New actor's name, such as Coder", "Add actor", (name) =>
          act("catalog.actor-create", { name }),
        ),
      ),
      h(
        "section",
        { class: "panel" },
        h("h2", { text: "Projects" }),
        h(
          "ul",
          { class: "list" },
          projects.map((p) =>
            h(
              "li",
              {},
              h("span", { class: "mono", text: p.id }),
              rename("Name", p.name, (name) =>
                act("catalog.project-edit", { project: p.id, name }),
              ),
              lineForm(
                "Icon, an emoji",
                "Set icon",
                (icon) => act("catalog.project-edit", { project: p.id, icon }),
                p.icon,
              ),
              select(
                COLOURS.map((c) => [c, c]),
                p.colour,
                (colour) => act("catalog.project-edit", { project: p.id, colour }),
                "Colour",
              ),
              p.archived
                ? button("Restore", () => act("catalog.project-restore", { project: p.id }))
                : button("Archive", () => act("catalog.project-archive", { project: p.id })),
            ),
          ),
        ),
      ),
      newProjectPanel("New project"),
      h(
        "section",
        { class: "panel" },
        h("h2", { text: "Labels" }),
        h(
          "ul",
          { class: "list" },
          labels.map((l) =>
            h(
              "li",
              {},
              h("span", { class: `label ${l.colour}`, text: l.name }),
              rename("Name", l.name, (name) => act("catalog.label-rename", { label: l.id, name })),
              select(
                COLOURS.map((c) => [c, c]),
                l.colour,
                (c) => act("catalog.label-colour-set", { label: l.id, colour: c }),
                "Colour",
              ),
              button("Remove", () => act("catalog.label-remove", { label: l.id })),
            ),
          ),
        ),
        h(
          "div",
          { class: "row" },
          select(
            COLOURS.map((c) => [c, c]),
            colour,
            (c) => {
              colour = c;
            },
            "Colour of the new label",
          ),
          lineForm("New label, such as bug", "Add label", (name) =>
            act("catalog.label-create", { name, colour }),
          ),
        ),
      ),
    ),
  ];
}

// ---- the page ----

const VIEWS = {
  overview: overviewView,
  board: boardView,
  backlog: backlogView,
  features: featuresView,
  archive: archiveView,
  intake: inboxView,
  changes: changesView,
  connections: connectionsView,
  settings: settingsView,
};

// The screens that show one project; their address ends in the project's id.
const PROJECT_VIEWS = ["intake", "backlog", "board", "features"];

function showSignIn() {
  for (const id of ["view", "setup", "side", "menu", "sign-out"]) $(id).hidden = true;
  closeTicket();
  $("sign-in").hidden = false;
}

// True while the owner is in the middle of typing something on the screen.
function typing() {
  const at = document.activeElement;
  return (
    state.editingTicket ||
    (at !== null &&
      $("view").contains(at) &&
      /^(INPUT|TEXTAREA)$/.test(at.tagName) &&
      at.value !== "" &&
      at.defaultValue !== at.value)
  );
}

// Draws the page again. A gentle refresh, after someone else's change,
// never replaces what the owner is typing: it waits until they are done.
let waitingToRefresh = false;
let drawing = 0;
async function refresh({ gentle = false } = {}) {
  // Two refreshes can overlap; only the one that started last may draw.
  drawing += 1;
  const mine = drawing;
  const catalog = await read("catalog.catalog-read");
  if (!catalog) return;
  state.catalog = catalog;
  $("sign-in").hidden = true;
  $("sign-out").hidden = false;
  const named = catalog.actors.find((a) => a.id === OWNER)?.name !== "";
  $("setup").hidden = named;
  $("side").hidden = !named;
  $("menu").hidden = !named;
  $("view").hidden = !named;
  if (!named) return;
  // The address says which screen, and for a project's screens which project.
  const [view, project] = location.hash.replace("#/", "").split("/");
  const active = catalog.projects.filter((p) => !p.archived);
  state.view = view in VIEWS ? view : "overview";
  if (PROJECT_VIEWS.includes(state.view)) {
    state.project = active.some((p) => p.id === project) ? project : (active[0]?.id ?? null);
  }
  const nodes = await VIEWS[state.view]();
  const connections = (await read("connections.connection-list")) ?? [];
  drawSidebar({
    projects: active,
    view: state.view,
    project: PROJECT_VIEWS.includes(state.view) ? state.project : null,
    counts: { connections: connections.filter((c) => c.state === "pairing").length },
    moveProject: (id, before) => act("catalog.project-move", { project: id, before }),
  });
  if (mine !== drawing) return;
  if (gentle && typing()) {
    waitingToRefresh = true;
    return;
  }
  $("view").replaceChildren(...nodes.filter(Boolean));
  if (state.ticket) await renderTicket();
}

let later;
function refreshSoon() {
  clearTimeout(later);
  later = setTimeout(() => refresh({ gentle: true }), 150);
}
document.addEventListener("focusout", () => {
  if (!waitingToRefresh) return;
  waitingToRefresh = false;
  refreshSoon();
});

let events;
function listen() {
  events?.close();
  events = new EventSource("/events");
  events.addEventListener("change", refreshSoon);
}

$("sign-in-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const answer = await api("/api/session", { method: "POST", body: { secret: $("secret").value } });
  $("sign-in-error").hidden = Boolean(answer.signedIn);
  $("sign-in-error").textContent = answer.error ?? "";
  if (!answer.signedIn) return;
  $("secret").value = "";
  listen();
  await refresh();
});

$("setup-form").addEventListener("submit", (e) => {
  e.preventDefault();
  act("catalog.actor-rename", { actor: OWNER, name: $("owner-name").value.trim() });
});

$("sign-out").addEventListener("click", async () => {
  await api("/api/session", { method: "DELETE" });
  events?.close();
  showSignIn();
});

$("tk-close").addEventListener("click", closeTicket);
$("ticket").addEventListener("close", () => {
  state.ticket = null;
});
$("tk-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = $("tk-text").value.trim();
  if (!text || !state.ticket) return;
  $("tk-text").value = "";
  const input = {
    ticket: state.ticket,
    text,
    ...(state.replyTo ? { reply_to: state.replyTo } : {}),
  };
  state.replyTo = null;
  await act("comments.comment-add", input);
});

window.addEventListener("hashchange", () => refresh());

const session = await api("/api/session");
if (session.signedIn) {
  listen();
  await refresh();
} else {
  showSignIn();
}

// At phone width the sidebar is a drawer: Menu opens it, and going anywhere closes it.
$("menu").addEventListener("click", () => $("side").classList.toggle("open"));

# mcp-contract

## Input

[mcp-contract.json](mcp-contract.json)

## Output

### Steps

1. the owner signs in on the page → HTTP 200
2. the page calls catalog.actor-create {"name":"Coder"} → succeeded; created actor a1
3. Coding agent asks to connect, to read and write → HTTP 200
4. the page calls connections.connection-approve {"connection":"$Coding agent","actor":"a1","change":true} → succeeded; updated connection <Coding agent>
5. Coding agent asks for its key → HTTP 200: its key
6. Coding agent lists the Contracts over MCP

| uri | name |
| --- | --- |
| open-agent-kit://contract/catalog | catalog Contract |
| open-agent-kit://contract/tickets | tickets Contract |
| open-agent-kit://contract/comments | comments Contract |
| open-agent-kit://contract/images | images Contract |
| open-agent-kit://contract/connections | connections Contract |
| open-agent-kit://contract/history | history Contract |

7. Coding agent lists its tools over MCP

| tool | reads only | description |
| --- | --- | --- |
| catalog__catalog-read | yes | List the actors, the projects with their columns, and the labels. |
| catalog__actor-create |  | Add an actor for an agent. A Connection acts as an actor. |
| catalog__actor-rename |  | Rename an actor. The owner's actor id is owner. |
| catalog__actor-archive |  | Archive an actor. It can no longer act; what it did stays visible. |
| catalog__actor-restore |  | Restore an archived actor. |
| catalog__project-create |  | Create a project. Its board starts with the columns To do, Doing, Review and Done. |
| catalog__project-rename |  | Rename a project. Its prefix and ticket ids stay the same. |
| catalog__project-archive |  | Archive a project. Its tickets are kept and it can be restored. |
| catalog__project-restore |  | Restore an archived project. |
| catalog__column-add |  | Add a column to a project's board. |
| catalog__column-rename |  | Rename a column. |
| catalog__column-kind-set |  | Set what a column means: todo, doing, waiting or done. |
| catalog__column-move |  | Move a column to another place on its board. |
| catalog__column-remove |  | Remove a column. Its tickets move to the column before it, or after it for the first column. |
| catalog__label-create |  | Create a label. |
| catalog__label-rename |  | Rename a label. |
| catalog__label-colour-set |  | Set a label's colour. |
| catalog__label-remove |  | Remove a label. Tickets no longer show it. |
| tickets__work-find | yes | Find work to do: open tickets in to-do columns that are not blocked and are assigned to you or to nobody, oldest first. |
| tickets__ticket-find | yes | Find tickets, oldest first. Every filter is optional; a column's kind says what the column means. |
| tickets__ticket-read | yes | Read one ticket. |
| tickets__board-read | yes | Read a project's board: its columns in order, each with its open tickets. |
| tickets__ticket-create |  | Create a ticket. It starts in the project's first to-do column unless you name a column. |
| tickets__ticket-claim |  | Claim a ticket: assign it to yourself and move it to the first doing column. |
| tickets__ticket-move |  | Move a ticket to any column of its board. |
| tickets__ticket-review-request |  | Ask for review: move a ticket to the first waiting column. |
| tickets__ticket-finish |  | Finish a ticket: move it to the first done column. |
| tickets__ticket-assign |  | Assign a ticket to an actor, to hand it on, or to nobody with null. |
| tickets__ticket-edit |  | Change a ticket's title, its description, or both. |
| tickets__ticket-label-add |  | Add a label to a ticket. |
| tickets__ticket-label-remove |  | Remove a label from a ticket. |
| tickets__ticket-block |  | Mark a ticket blocked, with a note saying why. It stays in its column; agents looking for work skip it. |
| tickets__ticket-unblock |  | Mark a ticket no longer blocked. |
| tickets__ticket-archive |  | Archive a ticket. It leaves the board and keeps its column; the owner can restore it. |
| tickets__ticket-cancel |  | Cancel a ticket. It goes to the Archive as canceled; the owner can restore it. |
| tickets__ticket-restore |  | Restore an archived or canceled ticket to the column it was in. Only the owner can. |
| tickets__ticket-delete |  | Delete a ticket for good, with its comments and images. It cannot be undone. Only the owner can. |
| comments__conversation-read | yes | Read a ticket's conversation: its comments with replies and reactions, and a line for each change to the ticket, oldest first. |
| comments__comment-add |  | Comment on a ticket: say what you did or found, or ask. With reply_to, it is a reply to that comment. |
| comments__comment-edit |  | Change the text of a comment you wrote. |
| comments__comment-remove |  | Remove a comment. Its author or the owner can. Its replies stay. |
| comments__reaction-add |  | React to a comment with an emoji. |
| comments__reaction-remove |  | Take back your reaction to a comment. |
| images__image-list | yes | List a ticket's images. |
| images__image-read | yes | Read one image, with its data as base64. |
| images__image-add |  | Attach an image to a ticket, such as a screenshot of the result. |
| images__image-remove |  | Remove an image from a ticket. Whoever attached it or the owner can. |
| connections__connection-list | yes | List the Connections: those waiting for approval, connected and revoked. |
| connections__connection-approve |  | Approve a Connection that asked to connect: pick the actor it acts as, and whether it may change things or only read. |
| connections__connection-revoke |  | Revoke a Connection, or turn down one that is waiting. It is cut off at once; what it did stays visible. |
| history__change-list | yes | List recorded changes, oldest first: all of them, or those about one ticket. |
| history__change-undo |  | Undo a recorded change. Refused if what it changed has changed again since. An undo can itself be undone. |


### Change events the page saw

created actor a1 (catalog.actor-create, caller ui)
updated connection <Coding agent> (connections.connection-approve, caller ui)

### Connections

| name | state | acts as | effects |
| --- | --- | --- | --- |
| Coding agent | connected | a1 | read, write |

### Actors

| id | name | archived |
| --- | --- | --- |
| owner |  |  |
| a1 | Coder |  |

### Projects

None.

### Labels

None.

### Tickets

None.

### Comments

None.

### Images

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:02 | owner | catalog.actor-create | added actor Coder |  |  |
| h2 | 09:04 | owner | connections.connection-approve | approved the connection Coding agent as Coder, to read and change |  |  |

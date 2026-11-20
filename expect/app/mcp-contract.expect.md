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
| open-agent-kit://contract/steps | steps Contract |
| open-agent-kit://contract/images | images Contract |
| open-agent-kit://contract/inbox | inbox Contract |
| open-agent-kit://contract/input | input Contract |
| open-agent-kit://contract/replies | replies Contract |
| open-agent-kit://contract/connections | connections Contract |
| open-agent-kit://contract/history | history Contract |

7. Coding agent lists its tools over MCP

| tool | reads only | description |
| --- | --- | --- |
| catalog__catalog-read | yes | List the actors, the projects with their columns, the labels and the locations. |
| tickets__work-find | yes | Find work to do: open tickets on a board, in to-do columns, that are not blocked and are assigned to you or to nobody, oldest first. |
| tickets__ticket-find | yes | Find tickets, oldest first. Every filter is optional; a column's kind says what the column means. |
| tickets__ticket-read | yes | Read one ticket. |
| tickets__board-read | yes | Read a project's board: its columns in order, each with its open tickets. Can be narrowed by words or by who a ticket is assigned to. |
| tickets__overview-read | yes | Read the open tickets of every project, lined up by column kind: to do, doing, waiting, done. Can be narrowed like a board. |
| tickets__backlog-read | yes | Read a project's backlog: open tickets that wait off the board, oldest first. Can be narrowed like a board. |
| tickets__ticket-create |  | Create a ticket. It starts in the project's first to-do column unless you name a column. |
| tickets__ticket-claim |  | Claim a ticket: assign it to yourself and move it to the first doing column. |
| tickets__ticket-move |  | Move a ticket to any column of its board. |
| tickets__ticket-review-request |  | Ask for review: move a ticket to the first waiting column. |
| tickets__ticket-finish |  | Finish a ticket: move it to the first done column. |
| tickets__ticket-assign |  | Assign a ticket to an actor, to hand it on, or to nobody with null. A note says what the next actor needs to know; it is left as a comment on the ticket. |
| tickets__ticket-edit |  | Change a ticket's title, its description, or both. |
| tickets__ticket-backlog-send |  | Send a ticket to its project's backlog, off the board. |
| tickets__ticket-board-send |  | Put a backlog ticket on the board, in the first to-do column. |
| tickets__ticket-feature-set |  | Put a ticket in a feature of its project, or in no feature with null. |
| tickets__ticket-location-set |  | Set the location a ticket's work is done at, such as a machine, or none with null. |
| tickets__ticket-type-set |  | Set what kind of work a ticket is: task, bug, improvement or specification. |
| tickets__ticket-priority-set |  | Set a ticket's priority: none, urgent, high, medium or low. |
| tickets__ticket-link-add |  | Add a link to a ticket: a web address that belongs to it, such as a pull request. |
| tickets__ticket-link-remove |  | Remove a link from a ticket. |
| tickets__ticket-label-add |  | Add a label to a ticket. |
| tickets__ticket-label-remove |  | Remove a label from a ticket. |
| tickets__ticket-block |  | Mark a ticket blocked, with a note saying why. It stays in its column; agents looking for work skip it. |
| tickets__ticket-unblock |  | Mark a ticket no longer blocked. |
| tickets__ticket-archive |  | Archive a ticket. It leaves the board and keeps its column; the owner can restore it. |
| tickets__ticket-cancel |  | Cancel a ticket. It goes to the Archive as canceled; the owner can restore it. |
| tickets__feature-find | yes | List a project's features, each with how many open tickets belong to it. |
| tickets__feature-create |  | Create a feature: one part of a project, which groups the tickets for that part. |
| tickets__feature-edit |  | Change a feature's name or description, or mark it as a favourite. |
| tickets__feature-archive |  | Archive a feature. Its tickets keep it; no new ticket can be put in it. |
| tickets__feature-restore |  | Restore an archived feature. |
| comments__conversation-read | yes | Read a ticket's conversation: its comments with replies and reactions, and a line for each change to the ticket, oldest first. |
| comments__comment-add |  | Comment on a ticket: say what you did or found, or ask. With reply_to, it is a reply to that comment. |
| comments__comment-edit |  | Change the text of a comment you wrote. |
| comments__comment-remove |  | Remove a comment. Its author or the owner can. Its replies stay. |
| comments__reaction-add |  | React to a comment with an emoji. |
| comments__reaction-remove |  | Take back your reaction to a comment. |
| steps__ticket-step-list | yes | List a ticket's steps in order, each with whether it is done and its notes. |
| steps__ticket-step-add |  | Add a step to the end of a ticket's checklist. |
| steps__ticket-step-check |  | Tick a step as done. With a note, say what was checked or found, or link to a result. |
| steps__ticket-step-uncheck |  | Untick a step that was done. |
| steps__ticket-step-note |  | Leave a note on a step: what was checked or found, or a link to a result. |
| steps__ticket-step-rename |  | Change a step's title. |
| steps__ticket-step-move |  | Move a step to another place in its ticket's checklist. |
| steps__ticket-step-remove |  | Remove a step and its notes from a ticket's checklist. |
| images__image-list | yes | List a ticket's images. |
| images__image-read | yes | Read one image, with its data as base64. |
| images__image-add |  | Attach an image to a ticket, such as a screenshot of the result. |
| images__image-remove |  | Remove an image from a ticket. Whoever attached it or the owner can. |
| inbox__inbox-read | yes | List inbox items, oldest first: all of them, those sent to one project, those in one state, or both. |
| inbox__item-read | yes | Read one inbox item, with the record of each run of the steps on it. |
| inbox__item-capture |  | Put a new idea or request in a project's inbox. The owner's steps look at it before it lands there. |
| inbox__item-tag |  | Add tags to an inbox item. |
| inbox__item-untag |  | Remove tags from an inbox item. |
| inbox__item-category-set |  | Sort an inbox item into a category, or out of its category with null. |
| inbox__item-fields-set |  | Keep details pulled out of an inbox item, as named fields. |
| inbox__item-fields-clear |  | Remove fields from an inbox item: the ones named, or all of them. |
| inbox__item-edit |  | Change an inbox item's title, its text, or both, such as to tidy it. The item as captured is kept beside it. |
| inbox__item-accept |  | Accept an inbox item: it is worth keeping, and stays in the inbox as accepted. |
| inbox__item-reject |  | Reject an inbox item, such as spam, with the reason. |
| inbox__item-dismiss |  | Dismiss an inbox item that needs nothing done, with the reason. |
| inbox__item-promote |  | Turn an inbox item into a ticket in its project's backlog, or on the board in the first to-do column. |
| inbox__item-link |  | Link an inbox item to a ticket that already covers it. |
| inbox__pipeline-read | yes | List the inbox steps, in the order they run. |
| input__input-list | yes | List the questions asked of the owner, oldest first: all of them, or by state, project or ticket. |
| input__input-read | yes | Read one input request, to see whether the owner has answered it. |
| input__input-request |  | Ask the owner a question on a ticket when you cannot go on without a person's answer. Then wait: read the request again later, or look in your agent inbox. |
| input__input-withdraw |  | Take back an input request that no longer needs an answer. Whoever asked or the owner can. |
| replies__reply-list | yes | Read your agent inbox, oldest first: replies to your comments, comments on tickets assigned to you, and the owner's answers to your questions. The owner can read any agent's, or everyone's. |
| replies__reply-acknowledge |  | Mark a reply in your agent inbox as read and dealt with. |
| history__change-list | yes | List recorded changes, oldest first: all of them, or those about one ticket. |


### Change events the page saw

created actor a1 (catalog.actor-create, caller ui)
updated connection <Coding agent> (connections.connection-approve, caller ui)

### Connections

| name | state | acts as | effects |
| --- | --- | --- | --- |
| Coding agent | connected | a1 | read, write |

### Actors

| id | name | icon | archived |
| --- | --- | --- | --- |
| owner |  |  |  |
| a1 | Coder |  |  |

### Projects

None.

### Labels

None.

### Locations

None.

### Features

None.

### Tickets

None.

### Comments

None.

### Images

None.

### Input requests

None.

### Ticket steps

None.

### Agent inboxes

None.

### Changes

| id | at | actor | action | summary | ticket | undone by |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 09:02 | owner | catalog.actor-create | added actor Coder |  |  |
| h2 | 09:04 | owner | connections.connection-approve | approved the connection Coding agent as Coder, to read and change |  |  |

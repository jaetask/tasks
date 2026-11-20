# Glossary

The words Tasks uses. Code, tests, docs and conversation use these words and no synonyms.
Tasks is built on [open-agent-kit](https://github.com/jaetask/open-agent-kit); the Kit's words (App, Domain, Action, Effect, Call, Outcome, Card, Contract, Connection) keep the meaning its glossary gives them.

## Language

**Project**: A body of work, such as an app. Holds tickets and gives them their prefix, like `TLK`.
_Avoid_: workspace, team, space

**Feature**: One part of a project, such as Voice. Groups the tickets for that part; a ticket belongs to one feature or to none.
_Avoid_: epic, component, module

**Ticket**: One piece of work: a title, a description, labels, images and comments. Has an id like `TLK-529`.
_Avoid_: task, issue, item, card

**Label**: A coloured tag on a ticket, such as `bug`. The owner makes them.
_Avoid_: tag, category

**Backlog**: Where a project's tickets wait, off the board, until someone puts them on it. Agents looking for work do not see them.
_Avoid_: icebox, later list

**Board**: Where a project's tickets move through its columns.
_Avoid_: kanban, workflow

**Column**: One step on a project's board, such as Review. Each project sets its own.
_Avoid_: status, state, lane, list

**Kind**: What a column means: to do, doing, waiting or done. Tasks and agents go by the kind, whatever the column is called.
_Avoid_: status, category, type

**Blocked**: A state on a ticket, in any column, with a note saying why. Agents looking for work skip blocked tickets.
_Avoid_: stuck, on hold

**Actor**: Who did something: the owner, or one of the owner's agents. Every change shows its actor.
_Avoid_: user, member, assignee, account

**Owner**: The one person an install of Tasks serves. The first actor, named at setup.
_Avoid_: admin, user

**Change**: One recorded change to Tasks' data: who made it, when, and what it was. A change can be undone.
_Avoid_: event, activity, audit entry

**Archive**: Where archived and canceled tickets are kept. The owner restores them from it.
_Avoid_: trash, bin

**Human input**: A question an agent asks the owner on a ticket. It awaits an answer, is resolved by the owner's answer, or is taken back.
_Avoid_: approval, prompt, blocker

**Agent inbox**: What was said to an agent: a reply to its comment, a comment on a ticket assigned to it, or the owner's answer to its question. Each one is unread until the agent acknowledges it.
_Avoid_: notifications, mentions

**Inbox**: Where new ideas and requests arrive before they become tickets.
_Avoid_: intake queue, triage

**Step**: Something the owner adds to the inbox that looks at each new item and answers with what to do.
_Avoid_: processor, stage, rule

## Relationships

- A **Project** has one **Board**. A **Board** is an ordered list of **Columns**. Each **Column** has one **Kind**.
- A **Ticket** belongs to one **Project** and sits in one of its **Columns**. It can move from any **Column** to any other.
- A **Ticket** may be assigned to one **Actor**, may carry **Labels**, and may be **Blocked**.
- A Connection acts as one **Actor**, chosen by the **Owner** when approving it.
- Every **Change** names its **Actor**. The **Owner** can undo a **Change**.

## Flagged ambiguities

- "Inbox" alone is a project's inbox of new ideas and requests, shown as Intake in the sidebar. The "agent inbox" is a different thing: what was said to an agent.
- "Card" is the Kit's word for how an Outcome is shown. A ticket on the board is a ticket, never a card.
- "Step" is an inbox step. A column is a step on the board only in plain speech; in code and docs it is a column.
- "Change" here is a recorded change with its actor. The Kit's Change (created, updated or deleted, on an Outcome) is what a page uses to fetch things again.

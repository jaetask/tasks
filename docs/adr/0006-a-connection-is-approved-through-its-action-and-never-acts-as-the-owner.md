# 6. A Connection is approved only through its Action and never acts as the owner

## Context

Agents and other Apps ask to connect. Some Actions are for the owner alone, so what a Connection acts as decides what it can do.

## Decision

The owner approves each Connection with the Action connections.connection-approve, where the owner picks the actor it acts as and whether it may only read or also change things. `src/app.ts` answers the HTTP approve path with a 404 that names the Action, so there is no approval without those choices. `src/connections/domain.ts` refuses the owner's actor as the actor of a Connection.

## Consequences

No Connection holds the owner's rights. Do not open the HTTP approve path again, and do not let the owner's actor be picked for a Connection.

---
name: pave
description: Make the right way the easy way. Use when the user corrects you, repeats a rule, a mistake recurs, or to pave the worst friction.
---

# Pave

![Before: the wrong path is easier, so you correct each new agent again and again. After pave: a type, lint rule or test blocks the wrong path, its message points to the right one, and the agent bounces onto it without you.](pave.svg)

Turn the lesson into a **paved road**: the path the next agent takes without being told.

The lesson is the user's correction or, with none, the top tag from `guardrails.py friction`; its rows hold the evidence and fix.

1. State the outcome in one positive sentence.
2. Find why the wrong path was easier: a missing type, check, tool, pointer, or a bad example in the code.
3. Read `.agents/guardrails/`. Extend a rule that already covers the lesson. No such folder: say to run guardrails first.
4. Pave the strongest rung that holds exactly the lesson, no wider:
   - **Type**: the wrong state won't compile.
   - **Lint**: an ast-grep rule in `.agents/guardrails/rules/`, tested in `rule-tests/`; its quoted message says what to do instead.
   - **Test**: pin the behaviour. No tautological tests.
   - **Tool**: one small CLI for the job you keep retyping.
   - **Helper**: the right way, ready to copy.
   - **Guardrail**: a hook or CI that runs the checks.
   - **Rule**: one line, for judgement only, with the failure it prevents.
5. Delete the prose the road replaces.
6. Walk the wrong path once. It fails, or the road was never laid.

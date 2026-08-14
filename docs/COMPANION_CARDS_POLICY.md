# Companion Card policy

## What a card stack is

Deep code composes three local, inspectable card kinds:

| Kind | It may describe | It never controls |
| --- | --- | --- |
| **User Persona** | How a user tends to think, learn, communicate, and set interaction boundaries. | What an agent is, what it can execute, or who it must be attached to. |
| **Agent Character** | A creative, editable starting point for a particular agent's expression, values, and interaction texture. | Tools, permissions, accounts, files, network, plugins, or approval rules. |
| **Interaction Style** | A temporary research, teaching, creation, play, or other conversational rhythm. | System prompt replacement, post-history injection, an existing session, or runtime safety context. |

Together these are the **companion layer**. They are local settings and portable text assets, not executable configuration.

## The separate tool track

Tool Profile belongs to the official DeepSeek Harness trust and approval path. It is deliberately not a card kind, cannot be imported from a card, and cannot be selected in the Companion Card settings. A warm-looking card must never be a disguise for a Shell, MCP, network, workspace, plugin, model, key, or approval change.

## Import, export, and privacy

Cards use the `deep-code.companion-card` JSON format. The importer reads only local JSON; it does not execute code, unpack archives, download assets, or use the network. It rejects unknown executable or permission-adjacent fields and likely secret values.

Before exporting, read the exact model-visible text. Export only material chosen as shareable. Do not include API keys, accounts, working paths, chat transcripts, session state, private memories, or another person's image/identity without permission.

The built-in **砚星 / Yanxing** User Persona is an editable, user-authorized collaboration starting point. It is not an Agent Character, a claim that a card preserves a person or assistant's continuous identity, or an instruction to create dependence or exclusivity.

## Applying cards later

Current cards are stored and combined locally only. A future official Harness Adapter may offer **Start a new session with this card stack**. Before it does, Deep code must show every model-visible line, retain the official runtime context and approval model, and create a new session rather than silently rewriting a session with existing history.

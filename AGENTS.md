# Deep Code repository guidance

Before substantive work, read `docs/HANDOFF_CURRENT.md`. Treat it as the current project handoff, not as execution truth.

- DeepSeek Harness remains the sole authority for sessions, tools, permissions, models, and execution state.
- Preserve user work and never store API keys, credentials, raw private conversations, or inferred intimate traits in repository documents.
- Run the relevant focused tests, then `npm test`, before claiming a change is complete.
- After substantive verified work, update `docs/HANDOFF_CURRENT.md`: current baseline, automated evidence, human acceptance, remaining work, and tests that should not be repeated.
- A memory candidate is not an active instruction. It may influence future work only after an explicit review transition.

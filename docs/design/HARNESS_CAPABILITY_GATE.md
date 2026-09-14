# Harness Capability Gate

Deep Code may expose an Engine feature only when three independent facts agree:

1. the exact, trusted Harness runtime profile says the wire capability exists;
2. Deep Code has a reviewed Adapter for that capability;
3. when the capability is Session-scoped, the current trusted Session satisfies its admission conditions.

This is a read-only admission projection. It is not a second plugin registry, Agent Loop, Session state machine, or runtime discovery protocol. Harness remains the sole authority for execution and Session state.

## Public seam

`src/harness-capability-gate.cjs` owns one versioned capability snapshot. A shipping Runtime may publish usable Engine capability only after the existing trust checks have reached `ready`. An audited future protocol may publish a visibly separate `candidate-ready` snapshot, but every capability remains `candidate-disabled`; Main's existing `ready` admission therefore cannot send a task through it. Main binds only a usable snapshot to the exact Session before sending a task. Renderer translates the same snapshot into beginner-facing availability and reasons.

The states are intentionally not collapsed into one optimistic boolean:

- `supported`: the exact Runtime and Adapter are compatible, but no Session has been bound;
- `available`: all Engine, Adapter, trust, and Session conditions are satisfied;
- `candidate-disabled`: an exact future Runtime completed its bounded protocol checks, but product admission is deliberately still closed;
- `engine-untrusted`, `runtime-unverified`, `runtime-unsupported`, `adapter-missing`, `session-required`, and `session-unavailable`: fail-closed reasons.

Only `available` can pass `assertCapabilityAvailable()`. “Supported” is useful UI evidence, not permission to send a Session operation.

## Current verified profile

The shipping profile remains:

- tag: `dsh-v0.1.1-rc.2`
- version: `0.1.1-rc.2`
- Git revision: `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`
- `host.describe` build marker: `0.0.1`

Verified and adapted: task prompt admission, live Session events, decision responses, model selection, durable image transport, and read-only Plan projection.

Not available: remote Plan control. This pinned API Proxy does not expose the command plane to Deep Code. `/plan` must never be sent through `session.prompt`, because that path creates an ordinary user message.

Image transport is deliberately not named “vision support.” It proves that the attachment reaches Harness; a particular model's image capability still comes from the Harness model directory and a real model validation task.

## Audited 0.1.5 candidate, not shipping compatibility

The exact official tag `dsh-v0.1.5-rc.2` at `fb2c4b9e698e30edb738bca4cf0618587db7d203` now has an isolated candidate profile. Its child launch, temporary authentication, model catalog, empty Session, follow stream, structured Plan command, and Session-bound Decision Gate have passed zero-token live checks. Runtime Supervisor can identify and authenticate that exact checkout twice in succession, bind an exact empty Session in each connection generation, and invalidate the prior Session observation on stop while keeping every projected capability disabled and rejecting `waitUntilReady()`.

`CandidateSessionLab` is the intentionally internal seam for this proof. Its Session projection contains only `{connectionGeneration, sessionId, follow cursor, Decision Gate state/count/kinds}` plus an optional sanitized Prompt-evidence projection. The observer is prepared with one client-minted `requestId` **before** any future Prompt RPC, so early live events cannot win a race; a later exact RPC receipt separately confirms or rejects admission. The projection becomes durable only when the same id appears in `user/message.source.rpcId`. It then accepts route, Assistant usage settlement, and terminal evidence only from the Turn that contains that durable message. It never projects Prompt or answer text, the authenticated URL, cookie, launch token, `$events` client ID, Host home, Remote event IDs, question bodies, approval bodies, or raw frames. Main IPC, Preload, and Renderer have no route to attach, prepare, confirm, reject, or inspect it.

This still does not make `0.1.5-rc.2` a supported Deep Code runtime. The candidate has no product task admission, no shared-Engine path, and no public Renderer transport. The Prompt mapping and same-Turn correlation rules have behavior-fixture evidence only; no real Prompt has been sent through this seam. Control-stream usage agreement, one bounded model call, receipt agreement, and human acceptance remain separate gates. Candidate evidence may expand; it cannot silently mutate the shipping `legacy-0.1.1` profile.

Primary-source snapshots:

- [official Remote assembly at the inspected revision](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/api/remotes/src/client/index.ts)
- [official Remote capability boundary](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/api/remotes/README.md)
- [official client command service](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/client/ui-commands/src/client/service.ts)

## Update rule

A new runtime version gets a new immutable profile. Existing profiles are not edited to resemble newer upstream behavior. Each capability must name its runtime evidence and Adapter status, and absent or ambiguous facts remain unavailable.

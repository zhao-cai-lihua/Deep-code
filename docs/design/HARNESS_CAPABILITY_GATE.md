# Harness Capability Gate

Deep Code may expose an Engine feature only when three independent facts agree:

1. the exact, trusted Harness runtime profile says the wire capability exists;
2. Deep Code has a reviewed Adapter for that capability;
3. when the capability is Session-scoped, the current trusted Session satisfies its admission conditions.

This is a read-only admission projection. It is not a second plugin registry, Agent Loop, Session state machine, or runtime discovery protocol. Harness remains the sole authority for execution and Session state.

## Public seam

`src/harness-capability-gate.cjs` owns one versioned capability snapshot. The Runtime Supervisor publishes an Engine-scoped snapshot only after the existing trust checks have reached `ready`. Main binds that snapshot to the exact Session before sending a task. Renderer translates the same snapshot into beginner-facing availability and reasons.

The states are intentionally not collapsed into one optimistic boolean:

- `supported`: the exact Runtime and Adapter are compatible, but no Session has been bound;
- `available`: all Engine, Adapter, trust, and Session conditions are satisfied;
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

## Upstream observation, not compatibility

On 2026-09-13, the official `master` ref was inspected at `c291e7961a515f6d7af9304e7fd1d257929aef26` (`0.1.5-rc.2`). Its new application Remote assembly explicitly mounts the Commands contribution, and the client command layer uses structured command remotes. This makes a future non-prompt Plan Adapter plausible.

It does not make `0.1.5-rc.2` compatible with Deep Code. The upstream Remote documentation says the capability set is selected at build time and is not discovered by clients from active Host services. A future profile therefore needs pinned protocol fixtures, a reviewed Adapter, real startup tests, and human smoke acceptance before it can enter the compatibility list.

Primary-source snapshots:

- [official Remote assembly at the inspected revision](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/api/remotes/src/client/index.ts)
- [official Remote capability boundary](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/api/remotes/README.md)
- [official client command service](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/client/ui-commands/src/client/service.ts)

## Update rule

A new runtime version gets a new immutable profile. Existing profiles are not edited to resemble newer upstream behavior. Each capability must name its runtime evidence and Adapter status, and absent or ambiguous facts remain unavailable.

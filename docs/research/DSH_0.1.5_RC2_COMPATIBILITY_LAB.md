# DSH 0.1.5-rc.2 compatibility lab

Status: compatibility Gates A, B, the zero-token portion of Gate C, and the internal product-facing Session seam are complete. Commands/Plan and a Session-bound Decision Gate have real runtime proof. Runtime Supervisor now recognizes and authenticates the exact checkout, binds an empty exact Session, and observes only sanitized Decision Gate state as a disabled candidate, but Main cannot admit product tasks through it. No Provider or model call was made.

Reviewed: 2026-09-14

## Fixed source

- Repository: `https://github.com/deepseek-ai/deepseek-harness`
- Tag: `dsh-v0.1.5-rc.2`
- Commit: `fb2c4b9e698e30edb738bca4cf0618587db7d203`
- Root package: `@deepseek-ai/dsh-root@0.1.5-rc.2`
- License declared by the root package: MIT
- Runtime floor declared by the root package: Node `^22.19.0 || >=24.0.0`, pnpm `11.7.0`

All links in this report are pinned to that tag. The local checkout's moving `master` branch was not used as compatibility evidence.

## Verdict

`0.1.5-rc.2` is **not** a drop-in upgrade for Deep Code's current `0.1.1-rc.2` Adapter. The process still supports an OS-assigned port and `--no-open`, but four boundaries changed together:

1. every browser RPC and WebSocket now requires a browser session cookie obtained by exchanging a per-process launch token;
2. unary RPC endpoints use slash names and Typert's `{ args: ... }` envelope;
3. live Session and Host traffic uses logical streams over `/api/remote.mux`;
4. approval and user-question responses use correlated Remote Events rather than Deep Code's legacy response route.

The same release also adds the feature Deep Code actually needs: a structured Commands Remote that can execute `/plan` without turning the command itself into a model prompt. This makes `0.1.5-rc.2` a worthwhile compatibility target, but only behind a separate protocol profile and evidence gate.

## What stayed compatible in principle

- The Web profile still accepts `--no-open` and documents `--port 0`, so a managed child can keep using an OS-assigned loopback port. [Web startup options](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/bundle/web-app/src/startup.ts#L45-L60)
- The process prints its authenticated URL only after the composed loader settles. That line can be treated as a readiness candidate emitted by the child Deep Code owns, not as a general port-discovery mechanism. [Web readiness announcement](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/bundle/web-app/src/index.ts#L252-L277)
- Session creation, model selection, prompt admission, cancellation, history, follow, and control remain structured Host operations. Their wire names and shapes have changed, so the product semantics can be preserved through a new Adapter instead of a second Agent Loop. [Session controller remotes](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/api/session-controller/src/index.ts#L238-L264), [prompt and stream remotes](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/api/session-controller/src/index.ts#L339-L411)

## Protocol delta

| Boundary | Current Deep Code / 0.1.1 profile | 0.1.5-rc.2 | Required Deep Code response |
| --- | --- | --- | --- |
| Engine admission | owned PID, random port, checkout identity, `host.describe` marker | owned PID and checkout identity remain useful; no `host.describe` Remote was found; authenticated child URL and Remote-ready generation become the live proof | keep the old profile unchanged; define a new managed-only trust handshake |
| Browser authentication | direct loopback RPC | launch token is accepted only by `GET /`; it becomes an authority-bound signed cookie; query and Authorization tokens are rejected elsewhere | exchange once in Main, keep the cookie and token ephemeral, redact both from logs |
| Unary RPC | `/api/session.create` with legacy payload | `/api/session/create` with a `client-request` envelope and Typert `{ args: ... }` payload | implement `DshAdapterV2`; do not branch ad hoc inside each old method |
| History | `session.history` | `session/page` with a durable address | translate page cursors in V2 only |
| Live events | legacy `/api/events.mux` | logical `open/cancel` streams over `/api/remote.mux`, returning `item/error/end` | implement a V2 mux owner with generation cancellation |
| Prompt admission | legacy request/response plus durable correlation | client supplies `requestId`; response is only `{ accepted: true }`; durable queue/log echoes carry correlation | keep admission distinct from completion and wait for durable same-request evidence |
| Questions and approvals | legacy response route | `$events` waterfall frames, answered through `$events/result` with `clientId + eventId` | add a correlated Decision Gate transport; stale or cancelled event IDs fail closed |
| Model catalog | legacy Session model metadata | structured default, routable Providers, Provider groups, failures, models, and reasoning efforts | project the official catalog; do not infer capabilities from names or credentials |
| Plan | read-only projection; remote control disabled | Commands Remote can list and execute `/plan`; Plan mode is committed as `plan/mode` | enable only after command lifecycle and projection evidence pass fixtures |

### Authentication is a secret-handling boundary

Official documentation says every Host RPC and WebSocket requires one browser session. A random launch token is accepted only on root `GET`, which writes a signed, host-and-port-bound, `HttpOnly`, `SameSite=Strict` cookie and redirects to the clean root. It explicitly rejects use of that query token on other routes and rejects Authorization-header tokens. [Browser authentication contract](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/client/connection/README.md#L32-L39)

Therefore:

- the authenticated URL printed by the managed child contains a secret and must be redacted before any line enters Runtime Supervisor logs;
- neither the launch token nor the cookie may be persisted in tasks, settings, diagnostics, crash metadata, Renderer state, or release evidence;
- Main should exchange the token, retain only an in-memory cookie jar bound to the connection generation, and expose typed operations rather than raw credentials to Renderer;
- changing the child process, port, authority, or connection generation invalidates the authentication state;
- Deep Code must not accept a naked `127.0.0.1` service as this profile.

The official Client constructs correlated `client-request` envelopes and validates matching response `rpcId` values. [Browser RPC client](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/client/connection/src/client/rpc.ts#L31-L59) Typert then wraps prepared arguments as `{ args: ... }`. [Gateway client invocation](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/api/gateway/src/client/index.ts#L429-L446)

### Session shapes are different, not merely renamed

The official fixture maps the legacy idea of history to `session/page`, calls `session/modelCatalog` with empty args, and opens `session/follow` and `session/control` as streams. [Official fixture Adapter](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/client/connection/tests/fixture.client.spec.ts#L384-L450)

Prompt admission now requires a client-minted `requestId`, exact `sessionId`, delivery mode, and structured content; the immediate response proves only `{ accepted: true }`. [Prompt request and receipt](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/api/session-controller/src/types.ts#L309-L323) This fits the existing Evidence Gate rule: admission is not terminal success. Queue and durable history correlation, not a guessed current Session, must establish which request entered which Session.

The opening follow frame contains a Session header, cursor, records, projections, and optional assistant-stream baseline. The control stream begins with a complete baseline and then supplies queue, job, and projection replacements. [Follow and control frames](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/api/session-controller/src/types.ts#L506-L570)

### Streams and Decision Gate require a new transport

The new mux path is `/api/remote.mux`. A Client opens logical streams with `streamId`, endpoint, and payload; the Host returns correlated `item`, `error`, or `end` frames. [Remote stream protocol](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/api/gateway/src/stream-protocol.ts#L242-L311)

The internal `$events` stream first publishes `ready` with a generation-specific `clientId`. Question and approval requests arrive as `waterfall` frames with an `eventId` and Agent identity, and results must carry both `clientId` and `eventId`. [Remote Event protocol](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/api/gateway/src/stream-protocol.ts#L5-L94) The shipped application explicitly forwards `approval/request` and `user-questions/request` in waterfall mode. [Forwarded event allowlist](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/api/remotes/src/remote-events.ts#L16-L36)

The official fixture proves that a handled question is cancelled from the active delivery and that replaying its old `eventId` fails with `gateway/invocation-unavailable`. [Question response fixture](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/client/connection/tests/fixture.client.spec.ts#L1039-L1096) Deep Code must preserve this lifecycle rather than treating a visible form as independent local state.

## Real Plan control, without hijacking the user's words

The Commands Remote lists commands for an exact Agent and executes a known command without sending the command to the model. It records paired `command/run` and `command/done` events, and invalid or unknown commands never enter a handler. [Commands Remote implementation](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/interaction/commands/src/index.ts#L304-L382) The Commands documentation makes the same product boundary explicit. [Commands contract](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/interaction/commands/README.md#L25-L66)

The official Plan UI itself invokes `ctx.remote.commands.execute(sessionId, '/plan off', [])`. [Official Plan client](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.5-rc.2/packages/client/ui-plan/src/client/index.ts#L45-L67)

Deep Code should use this sequence:

1. the user explicitly selects Plan;
2. Deep Code calls `commands.list` for the exact Session/Agent and requires the `plan` descriptor;
3. Deep Code executes the bare `/plan` command with no attachments;
4. it waits for the same command's successful `command/done` and a same-Session `plan/mode { active: true }` projection;
5. only then does it send the user's unchanged natural-language request through `session/prompt`;
6. leaving Plan executes `/plan off` and waits for the corresponding structured evidence.

It must **not** rewrite the user's text as `/plan <message>`. The official command framework permits a command producer to make optional text model-visible, so that form has different semantics. Deep Code's earlier beta showed why conflating mode selection and user speech feels broken: the user's natural-language request disappeared behind a control instruction.

## Proposed compatibility seam

```text
RuntimeSupervisor
  -> HarnessProtocolProfile
       legacy-0.1.1
       typert-0.1.5
  -> ManagedHarnessConnection
       child identity
       redacted readiness parser
       ephemeral authenticated cookie
       connection generation
  -> DshAdapterV2
       slash Remote endpoints
       exact Typert args
       request/response correlation
  -> RemoteMuxV2
       $events
       session/follow
       session/control
  -> existing TaskRunSnapshot / GuidedWorkbench projections
```

The profile should be selected only after exact checkout identity is proven. Existing `DshAdapter` and `DshLiveSession` behavior for `0.1.1-rc.2` should remain byte-for-byte stable until the V2 profile passes all gates.

`ManagedHarnessConnection` should remain in Main. It owns secrets and transports; Renderer receives only sanitized connection state and projected capability facts. `DshAdapterV2` should return the same Deep Code domain results consumed by the Evidence Gate, so task, receipt, outcome, and recovery UI do not fork by upstream version.

## Staged implementation gates

### Gate A — source and parser fixtures, zero Provider tokens

Completed in `typert-managed-connection.cjs`, but intentionally not wired into runtime selection:

- recognizes only exact tag/version/SHA `dsh-v0.1.5-rc.2` / `0.1.5-rc.2` / `fb2c4b9e...` and retains candidate status;
- parses the child-owned `dsh web:` URL while immediately redacting its token from diagnostics;
- rejects non-loopback authorities, stale generations, malformed URLs, missing tokens, and candidate creation without exact Runtime identity;
- exchanges the launch token for a cookie in an isolated fake transport;
- performs correlated slash-endpoint RPCs, including the official internal `$events/result`, with Typert `{ args: ... }` envelopes while rejecting legacy dot endpoints;
- keeps token and cookie out of snapshots and irreversibly clears them on disposal or generation invalidation;
- applies the launch-token redactor to existing Runtime Supervisor logs before storage.

Focused behavior evidence: **21/21** across the new connection module and Runtime Supervisor. Full regression: **325/325**. Syntax checks and `git diff --check` passed. `npm run package:test:win` produced a portable artifact containing both the connection module and updated Runtime Supervisor; its unpacked application kept four isolated-profile Electron processes alive for eight seconds. These checks use fake HTTP transport and consume no Provider tokens.

### Gate B — read-only live handshake, zero Provider tokens

Completed on 2026-09-13 against a detached, clean exact-tag worktree:

- installed with the declared `pnpm@11.7.0` lockfile and built the official profile successfully on Windows;
- launched the built CLI with `--no-open --host 127.0.0.1 --port 0` under isolated `DSH_HOME` and `DSH_AGENTS_HOME` roots;
- exchanged the child-only launch token for an in-memory cookie, then received a valid `$events` `ready` carrying `clientId` and Host home;
- read the structured `session/modelCatalog` (one Provider group, one routable Provider, zero catalog failures in this isolated profile), created one empty Session, and required the first `session/follow` item to be a snapshot whose header named that exact Session;
- stopped the owned child, advanced the local generation, disposed the Adapter, and proved both streams and later RPC use rejected;
- packaged Deep Code as a Windows portable, extracted its `app.asar`, verified the packaged connection and V2 Adapter hashes exactly matched source, and repeated the same live handshake through those extracted packaged modules.

The reusable probe is `scripts/dsh-015-gate-b-smoke.cjs`. It captures the launch URL only in process memory, prints only token-redacted diagnostics on failure, creates no prompt, and reported `providerRequests: 0` and `promptRequests: 0` in both source and packaged runs.

`ManagedTypertConnection.open()` now owns authenticated mux streams, correlated `streamId` frames, cancellation, bounded errors, disposal, and generation invalidation. `DshAdapterV2` is a separate candidate Adapter for the exact slash endpoints. Runtime Supervisor integration is described below; product task admission remains closed.

### Gate C — Commands and Decision Gate, zero Provider tokens

Completed on 2026-09-14:

- the V2 Adapter lists commands for the exact Session, refuses to simulate Plan when the official catalog omits it, and executes only bare `/plan` or `/plan off` with an empty attachment list;
- a successful RPC is not enough: the Adapter requires same-command `command/run`, successful `command/done`, and the requested `plan/mode` event from the same Session follow stream before reporting the switch;
- real isolated runtime checks entered and exited Plan with all three evidence records each, without sending or altering any natural-language task text;
- the real Typert descriptor rejected the fixture-derived field name `images` and required `submittedAttachments`. The Adapter and behavior fixture now follow the real Host descriptor; this is recorded as a concrete example of why in-memory fixtures are not live compatibility evidence;
- an event-generation-local Decision Gate records only waterfall `eventId` values actually observed on its own `$events` stream **and** whose `agentId` equals the exact Session bound to that generation. Invented, other-Session, cancelled, answered, replayed, foreign-Adapter, and stale-generation correlations are rejected before `$events/result` is called. Successful answers carry the exact `clientId + eventId` and are one-shot;
- the reusable runtime smoke now creates a temporary Cordis patch and synthetic question-source plugin inside its isolated test root. After the authenticated `$events` generation is attached to the newly created Session, the source resolves that exact live Agent and calls the official `ctx.userQuestions.ask()` seam;
- the real Host emitted a Session-bound `user-questions/request`, Deep Code returned one structured `AskUserQuestionAnswer` through `$events/result`, and the synthetic source received the exact selected option. A second answer attempt was rejected locally before another Remote call;
- the temporary patch, plugin, trigger, result, DSH home, Agent home, and workspace are deleted at the end. The official detached runtime checkout stays clean, and the user's configured Harness is not modified.

### Product integration gate — Runtime Supervisor, zero Provider tokens

Completed on 2026-09-14 without enabling the candidate for ordinary tasks:

- `inspectAuditedRuntime()` recognizes either the unchanged shipping `legacy-0.1.1` identity or the exact `typert-0.1.5` candidate identity. The older `inspectCompatibleRuntime()` deliberately still rejects 0.1.5, so existing callers cannot silently broaden their compatibility claim;
- Runtime Supervisor selects the protocol only after package identity, version, and exact Git HEAD have been checked. For the candidate it parses only the owned child's launch line, performs the temporary token-to-cookie exchange in Main memory, and constructs the V2 Adapter without exposing the token, cookie, WebSocket, or Remote endpoint to Renderer;
- authenticated 0.1.5 enters `candidate-ready`, never `ready`. `waitUntilReady()` rejects it, Main's existing `ready` checks remain false, and the Capability Gate marks every feature `candidate-disabled` even where Runtime and Adapter evidence exist;
- stopping advances the connection generation and disposes authentication before signalling the child. An intentional stop while authentication is pending stays a stop rather than being rewritten as a verification failure;
- `scripts/dsh-015-runtime-supervisor-smoke.cjs` started and stopped the exact official checkout twice under an isolated DSH home. Both generations authenticated, retained `managed-process` trust, kept product admission closed, removed the child, and reported zero Provider and Prompt requests.
- `CandidateSessionLab` is owned and invalidated by Runtime Supervisor. It creates or reattaches one exact empty Session, requires the first follow snapshot to name that Session, opens the Session-bound `$events` generation, and exposes only a sanitized read-only projection of Session identity, follow cursor, and Decision Gate state/count/kinds.
- same-Session question and approval waterfalls affect only the private pending projection; other-Session frames are ignored, cancellation removes only a previously observed event, and no event ID or request body crosses the seam;
- stopping the candidate clears the Lab synchronously before disposing the managed connection. Reconnect receives a new connection generation, and a late event or late `session/create` result from the old generation cannot resurrect or alter the new projection;
- Main IPC, Preload, Renderer, `snapshot()`, and `waitUntilReady()` do not expose the Lab. Ordinary task prompt, Provider credential, and ecosystem execution routes remain closed.

### Gate D — bounded model acceptance

- make one low-cost text request after explicit model selection;
- prove request admission, durable request correlation, same-Session route, Turn terminal, usage projection, and receipt all agree;
- if available, perform one image request only to test transport; do not infer vision support from the model name;
- ask 砚星 for a small manual acceptance only after every zero-token gate passes.

## Tests that must fail before implementation

- readiness output containing a token reaches a diagnostic string;
- a 2xx loopback service without the owned child is admitted;
- an old cookie or `$events` `clientId` survives a connection generation change;
- a dot-style endpoint or unwrapped payload is accidentally sent through V2;
- a prompt's immediate `{ accepted: true }` marks the Turn completed;
- a `follow` frame for another Session enters the current TaskRunSnapshot;
- a question answer uses the wrong or expired event ID;
- Plan selection sends `/plan` through `session/prompt`;
- Plan is shown active after command success without `plan/mode` evidence;
- the natural-language request is altered while entering Plan;
- old and new Adapter events are mixed in one live-session generation.

## Explicit non-goals

- no automatic migration of the user's current runtime;
- no silent replacement of `0.1.1-rc.2`;
- no shared-Engine support for the V2 profile in the first implementation;
- no raw Remote or cookie bridge to Renderer;
- no Provider call merely to test authentication, catalog, Session creation, commands, or streams;
- no claim that `0.1.5-rc.2` is supported until isolated startup, protocol fixtures, packaging, and bounded human acceptance all pass;
- no resurrection of local Task Journey, hidden prompt suffixes, automatic model routing, memory injection, character-card injection, or ecosystem code execution as part of this upgrade.

## Current automated and packaging evidence

- focused candidate Session Lab and Runtime Supervisor suite: **19/19**;
- full Deep Code regression after the internal candidate Session seam: **348/348**;
- JavaScript syntax checks and `git diff --check`: passed;
- live source-module smoke: exact `0.1.5-rc.2@fb2c4b9e698e`, authenticated, same-Session question answered once, replay rejected, Plan entered/exited, process-stop invalidation passed, `providerRequests: 0`, `promptRequests: 0`;
- current local test portable: `dist\Deep-code-Test-0.8.1-beta.1.exe`, 368,891,975 bytes, SHA-256 `0882df8e53a3b9452d9696ea1dd467c81bf078dd767a6e746b1d19a687c4fd4e`;
- source and packaged SHA-256 matched before the packaged live run: `typert-managed-connection.cjs` `bb22451a8f194c59166bbc75d3b566a2adc16199df4a42f392991e654add09f4`; `dsh-adapter-v2.cjs` `293e3c27a581abd1c15cb040a8b101a7247726372ce6a50f05aa6ed9a425130d`;
- the packaged modules repeated the authenticated Session-bound question, one-shot answer, replay rejection, Plan, teardown, and post-stop invalidation path with `providerRequests: 0` and `promptRequests: 0`.
- Runtime Supervisor live smoke: two exact candidate starts and stops, `managed-process` trust, all seven capabilities `candidate-disabled`, product admission rejected, `providerRequests: 0`, `promptRequests: 0`.
- The updated source and packaged Runtime Supervisor each attached two exact empty Sessions across two connection generations (`sessionsAttached: 2`), cleared the Lab on every stop, and kept Provider/Prompt requests at zero. Packaged hashes matched source for Runtime Supervisor (`227f30...1ecf`), Candidate Session Lab (`ee95cc...49a9`), DSH Adapter V2 (`5eab1a...8238`), and the managed connection (`bb2245...09f4`).
- extracted packaged Runtime Supervisor, Capability Gate, and candidate-aware capability view hashes matched source exactly (`c0013d...4834`, `dcb859...0394`, `18f8ef...7544`), and the same two-generation live Supervisor smoke passed through the packaged modules.

This is compatibility-lab evidence, not a public release or a supported runtime declaration.

## Source-audit method and remaining uncertainty

The source audit used `git show dsh-v0.1.5-rc.2:<path>` and `git ls-tree -r dsh-v0.1.5-rc.2`, not the checkout's moving working tree. A tag-wide search found no `host.describe` declaration in this revision. That is an absence finding, not a guarantee that future tags will never expose equivalent host metadata.

Gates B and C now have exact-tag Windows runtime evidence, including the real synthetic question waterfall, and the candidate can cross the product's Runtime Supervisor boundary, attach an internal empty Session, survive packaged-module verification, and stop without becoming usable. Prompt admission and durable request correlation, the bounded model call, and human acceptance remain unverified. `0.1.5-rc.2` therefore stays outside the usable compatibility list; the existing `0.1.1-rc.2` task path and Adapter remain unchanged.

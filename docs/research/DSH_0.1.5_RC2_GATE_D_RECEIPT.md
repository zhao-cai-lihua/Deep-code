# DSH 0.1.5-rc.2 Gate D acceptance receipt

Date: 2026-09-14

Runtime: official tag `dsh-v0.1.5-rc.2`, version `0.1.5-rc.2`, Git revision `fb2c4b9e698e30edb738bca4cf0618587db7d203`

Status: **Harness request accepted and completed; Deep Code end-to-end receipt revalidation still pending**

## Authorized cost boundary

砚星 explicitly authorized one low-cost text-model request with no automatic retry. Before that request, the isolated preflight proved:

- route: `deepseek-official / deepseek-v4-flash / low`;
- input modality: text;
- output cap: 32 tokens;
- retry configuration: `normal`, `maxRetries: 0`;
- title-model plugin disabled;
- isolated complete persona with no tools;
- zero Prompt requests during preflight.

The execution command was invoked once. It was not retried.

## Durable Harness facts

After the observer process did not print its receipt within the bounded wait, the isolated Session artifact was inspected only for event type, sequence, route, terminal, and usage metadata. Prompt and answer text were not read or recorded.

The durable Session contained:

- one exact `user/message` carrying the client-minted `rpcId`;
- one `request/header` at sequence 10 with `deepseek-official / deepseek-v4-flash / low` and `maxTokens: 32`;
- no `llm/retry` or `llm/retry-started` event;
- one `assistant/message` settlement at sequence 13;
- one matching `turn/end` at sequence 15 with reason `completed`;
- Assistant usage: 63 uncached input tokens, 20 output tokens, 0 cache-read tokens, and 0 cache-write tokens;
- Session `tokenUsage` projection with the same four-bucket delta;
- 83 total Provider tokens. The reported 17 reasoning tokens are part of the 20 output tokens and are not added a second time;
- no tool calls and no auxiliary title-model request.

The deleted Session artifact had SHA-256 `92e9e5a3d7991593f803f4f180209fe5c0f543599cfdcbd85d5c94fdea802d7a`. The hash is retained only as provenance; the temporary DSH home, copied credential file, Session content, preset, and workspace were removed. The user's original Harness credential file was not modified.

## Why this is not a full Gate D pass yet

Harness proved admission, exact route, terminal completion, and matching usage. The smoke process itself did not return a Deep Code receipt before it was stopped after roughly 135 seconds. The available evidence does not distinguish with certainty between a missed live projection and a shutdown/stream-settlement delay, so this report does not claim a proven root cause.

Deep Code now closes both exposed gaps without sending another Prompt:

- the one-shot runner applies its deadline to model selection and Prompt admission, passes an abort signal through the Adapter, and remains permanently non-retryable after the attempt begins;
- `CandidateSessionLab` owns one abort controller for all three attached streams and aborts it before closing;
- if live evidence is terminal-but-incomplete, or reaches its wait limit, the Lab performs one read-only reconciliation from the same Session's complete snapshot and current `tokenUsage` baseline;
- reconciliation rebuilds the projector from its original usage baseline, so a late snapshot cannot be blocked by a previously observed higher sequence;
- a stale live usage sample cannot regress the reconciled control watermark;
- retry events and more than one same-Turn `request/header` fail closed;
- interrupted smoke scripts remove their isolated credential copy before exit.

The exact persisted event shapes are covered by a sanitized behavior fixture, and a separate fixture proves missed live evidence can be rebuilt without another Prompt. This validates the code path offline, not its next live end-to-end behavior.

## Verification after the repair

- focused Gate D, Prompt evidence, Candidate Session Lab, and V2 Adapter tests: **38/38 passed**;
- packaged-candidate boundary behavior: **5/5 passed**; `npm run verify:package:candidate` proved byte-exact parity for the eight reviewed candidate/trust modules, rejected product-entry reachability, and confirmed the paid smoke script is absent from `app.asar`;
- full `npm test`: **378/378 passed**;
- exact-runtime Supervisor smoke: two authenticated candidate generations, two Session attachments, two usage-control attachments, clean stop, product admission closed, **0 Provider requests and 0 Prompt requests**;
- the same Supervisor smoke passed from the final packaged module. Local test portable: `Deep-code-Test-0.8.1-beta.1.exe`, 368,929,274 bytes, SHA-256 `a447d0b9117a3112ee93f5f3299ec462d5b20922b537c9b52b008c823b05c69e`. It is a local test artifact, not a release asset;
- syntax checks and `git diff --check`: passed on the final staged tree before commit.

## Remaining gate

Do not issue another Provider call automatically. A future live revalidation requires a new explicit authorization. It should repeat only the same small text case and must print the complete sanitized Deep Code receipt before `0.1.5-rc.2` can enter the product's usable compatibility list.

No image-model call is authorized or needed for this gate. Image transport and model vision capability remain separate future questions.

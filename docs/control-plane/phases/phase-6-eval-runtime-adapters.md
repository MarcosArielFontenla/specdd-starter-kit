# Phase 6 — Eval Runtime Adapters

Date: 2026-09-04 (local; live result timestamp is September 5 UTC)
Status: implementation and local acceptance complete; no live Warp validation claimed

## Delivered

- `@specdd/eval-adapters`: TypeScript adapter interface, canonical definition/result
  contracts and published JSON Schemas; recursive structural validation plus label
  and threshold checks. Existing canonical models and Harness rubrics remain unchanged.
- Local mechanical adapter maps observed completed exit status through explicit
  canonical labels. Timeout, signal, absent exit and launch failure are unscored errors.
- Normalization to 0–1 from declared scales, rejecting invalid/out-of-range numbers.
- Result identity includes eval ID/version/fingerprint, run/input references and
  observation time. Evidence capture retains SHA-256 and byte count, not raw logs.
- Gate helper binds a result to the expected definition/run/input; required gates
  need a consistent pass, advisory gates remain nonblocking.
- Optional Warp classification compiler and explicit observation importer; generated
  scorer example, deterministic snapshot, no configuration application or external runs.
- Explicit Node test host wrapper, real passing/failing subprocess tests, CI workspace
  job and [ADR-0009](../adrs/0009-canonical-eval-runtime-boundary.md).

## Verified local execution

The host wrapper re-executed the actual Phase 5 pilot test at reviewed commit
`c48f8736c796736bdb7442f89f917186669b87d8`; the isolated worktree was clean.
The observed canonical result is retained at
`packages/eval-adapters/examples/local-run.result.json`:

- evalRef `implementation-quality`, version `1.0.0`;
- run `phase6-local-001`, adapter `local-exit-v1`;
- outcome `pass`, score `1`, declared label `passed`;
- evidence fingerprint/bytes captured from the actual child-process observation.

This measures documentation conformance only. It is not a synthetic skill-quality
score and does not initialize or mutate the existing drift baseline.

The subprocess regression initially exposed inherited `NODE_TEST_CONTEXT` suppressing
nested Node test execution. The wrapper now removes that internal variable before
starting its child runner; an intentionally failing real test must return failure.
Both passing and failing child-process cases now pass their adapter acceptance checks.

## Verification results

- `npm run test:unit --workspaces --if-present`: **199 passed**, exit 0
  (185 existing + 14 eval-adapter tests).
- `npm run build --workspaces --if-present`: all builds passed, exit 0.
- `npm run test:phase5`: preparation regression passed, exit 0.
- `npm run test -w specdd-platform`: **4 browser smoke tests passed**, exit 0.
- Real local pilot execution: pass with recorded canonical result.
- `git diff --check`: passed; line-ending notices only.

CI configuration was added but hosted CI was not run for these uncommitted changes.

## Fidelity and safety limits

The [official Warp scorer contract](https://docs.warp.dev/factories/factory-as-code/#scorersnamescorermd)
describes an LLM classification resource. The compiler preserves canonical labels,
scores, threshold and rubric, with target agents/model/sampling explicit and
`selfImprovement: false`. It rejects mechanical definitions. Referenced agents must
exist in the target Factory; no provider authentication/API-response shape is guessed.
Generated files are illustrative until independently applied and validated in Warp.

The local host runs only the explicitly supplied approved Node test, with shell
disabled, timeout and output cap. It is not a sandbox. Result normalization does
not prove evidence authenticity, artifact freshness or process isolation: those
remain host responsibilities. The inputRef is asserted by the caller; this pilot
separately checked its Git identity. Hash-only evidence is not a raw-log archive.

The Phase 4 Factory compiler still stops at required evals. Merely generating a scorer
does not wire or enforce that gate. No observability service, automatic self-improvement,
secret, deployment, merge or new PR was introduced. PR #2 remains untouched.

## Dependency audit follow-up

`npm audit` reported 8 vulnerabilities (7 high, 1 low) in the existing platform tree:
Astro, Browserslist, esbuild, js-yaml, nanoid, PostCSS, sharp and SVGO. Neither the new
eval package nor its Node type dependency was listed. An Astro major upgrade is among
the proposed fixes, so no automatic `audit fix` was applied within this phase.
This historical finding was subsequently resolved in the approved
[dependency security remediation](../audits/2026-09-04-dependency-security.md):
Astro 7.3.1, compatible patches, Node 22.12+ workspace requirement, clean install,
zero npm audit findings, all builds/unit tests and 11 browser tests passing.
It is no longer an open item; zero advisories is not a claim of a vulnerability-free application.

## Next boundary

Phase 7 can now be specified using these result contracts. History persistence,
normalized lifecycle events, retention and an observability UI are not implemented here.

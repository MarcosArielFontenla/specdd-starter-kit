# Phase 10 A2 — optional SpecDeploy delivery export

Date: 2026-09-05. Scope: wizard/export integration only, no execution or deployment.

## Implementation

- CI/CD has an off-by-default delivery export checkbox and explicit project,
  repository, revision and staging/production destination inputs. Revision must
  be a full 40/64 lowercase hex hash; logical IDs are bounded and destinations differ.
- Async wrapper keeps the synchronous legacy generator unchanged. Disabled output
  matches it byte for byte. Enabled output adds exactly five `delivery/` files,
  with collision rejection instead of overwriting provider artifacts.
- Browser Web Crypto hashes the exact UTF-8 provider snapshot bytes. That snapshot
  is versioned independently because existing providers do not declare versions.
- Input/provider snapshots prevent async mutation races. UI cancels stale preview
  results, blocks download while generating/on error, resets removed preview paths,
  and downloads the same file map that was previewed.
- Delivery definition and projection pass canonical validation. Every provider's
  export warns that its controlled-delivery runtime is unsupported. API limitations
  remain visible; adapter operations are requirements, not claims of implementation.
- Legacy environment/approval/security flags do not grant approval or populate
  the new explicit destination IDs. `merged-source` remains a future required check.
- Wizard and portal prebuild/predev paths build the new internal library, supporting
  fresh installs as well as the standalone wizard and embedded portal route.

## Validation scope

16 focused tests cover all six providers and their ten supported CI combinations,
disabled/absent byte compatibility, exact graph/snapshot hashes, deterministic
generation, async mutation, API warnings, input errors and collision safety.
Browser tests inspect actual downloaded ZIP contents, draft preview equality,
validation failures, and return to legacy-only mode after disabling the feature.

Final local results:

- Whole workspace: **313 unit tests passed**, including 58 SpecDeploy tests.
- All workspace builds passed; no Node-only dependency leaked into the browser build.
- **7 browser tests passed**: 3 SpecDeploy (including downloaded ZIP inspection)
  and 4 portal. Other browser suites were not rerun in this increment.
- `npm audit --audit-level=low`: zero findings; no new third-party dependency.
- `git -c core.safecrlf=false diff --check`: passed.
- CI wiring uses the existing SpecDeploy unit/browser jobs and the A1 delivery
  job; these are local validations, not a new hosted CI result.

Existing non-blocking Vite deprecation and chunk-size warnings persist.

## Remaining work

No actual provider adapter, eval definition, merged-source evidence, credential,
environment or deployment is created. Legacy pipelines are not rewritten or made
safer by adding the graph. Next is increment B: bounded local rehearsal with real
observations and a specific human approval before local promotion. Full Phase 10
remains in progress; real staging/production acceptance requires separate scope.
No commit, push, PR update, merge or deployment was requested or performed here.

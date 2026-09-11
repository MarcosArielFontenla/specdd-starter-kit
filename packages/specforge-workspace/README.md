# SpecForge Workspace — Role Workspaces locales

Phases 4–7 are **accepted and published**. Phase 7 adds a local QA Workspace MVP;
its observed human gate completed on 2026-09-10. Phase 8 adds an accepted local read-only PM
aggregation with evidence links and explicit unknown/partial/blocked semantics; it
does not author PM artifacts or declare a release ready. The browser regression uses an explicitly
simulated runtime, and a separate bounded real-agent pilot plus an observed human
approval flow completed on 2026-09-08. Phase 5 adds an accepted governed local
SpecDD projection, including observed exact review and persistence after reload.
No deploy.

See the [operator and BA guide](../../docs/specforge-workspace/usage.md),
[spec](../../docs/specforge-workspace/specs/phase-4.md),
[architecture decision](../../docs/specforge-workspace/adrs/0004-local-ba-workspace.md)
and [phase evidence](../../docs/specforge-workspace/phases/phase-4.md).

From the monorepo root, with existing locked dependencies and Node 22.12+:

```powershell
npm run specforge:build
npm run specforge:test
npm run specforge:test:ui
```

The UI test requires an already installed Playwright Chromium. No real model,
business repository, external API, install or network fallback is used by that test.
Its runtime is labeled `SIMULADO`; synthetic states remain in OS temporary folders,
screenshots in `.specforge-workspace/evidence` when run through the root script.

## Boundaries

- `WorkspaceStore`: SQLite schema 1, one process lease, full-state journal/hash chain,
  optimistic CAS, atomic adoption and approval, interrupted-run reconciliation.
- `BAWorkspace`: human-owned create/edit/resolve/review/approve; consent-bound
  runtime analysis; proposals stored separately, selective adoption or discard.
- QA view: approved/assigned specs, typed scenarios/cases/risks/defects, selective
  QA proposals, deterministic declared-design coverage and exact human QA approval.
  It does not execute tests or claim outcomes; defect evidence is human supplied.
- Governed SpecDD projection: approved BA graph to deterministic
  `specs/<slug>/spec.md` proposal, explicit mapping gaps, exact diff/subject,
  discard or human canonicalization in SQLite. No filesystem/Git writer.
- `createWorkspaceServer`: loopback HTTP, one-use bootstrap, session/CSRF/Origin,
  bounded JSON, CSP and no raw provider diagnostics in browser errors.
- `CodexBARuntime`: opt-in structured transport, explicit executable/model/Windows
  sandbox, empty dedicated working directory, restricted read-only/text mode.
  Effective installed runtime configuration must be checked before a real pilot.
  The [offline permissions fix](../../docs/specforge-workspace/phases/phase-4-permissions-fix.md)
  now selects a named profile and fails before the model turn if effective settings
  or active-profile confirmation are missing or broader than expected.
- No auto-install, repository import/scanning, arbitrary command endpoint, retry,
  multi-user identity, SSO, shared deployment, encryption or remote publishing.

`{project, capability, qaCapability}` registration enables both role workspaces and
accepts a prepared canonical Project Definition
and an exact enabled BA Capability Pack with all required content/dependencies.
It does not derive missing project facts. `--demo true` explicitly creates a synthetic
fixture, not an acceptance result or a substitute for production context.

Provider consent is a per-action browser decision; the portable Phase 3 request
still carries `executionAuthorized: false` because a domain object cannot authorize
execution. The host checks the registered binding, session, consent and CAS before
persisting and starting that action. Runtime receipts and proposal provenance are
host attestations, not cryptographic signatures or independent proof of truth.

## State and recovery

Keep the dedicated state directory outside source repositories, under private OS
permissions. SQLite content is plaintext. For backup, stop the service cleanly and
copy the complete directory; do not copy just the DB while WAL writes are active.
Never delete a lease/journal to bypass an error. Live ownership, corruption, unknown
schema and conflicting registration fail closed. Restart issues a new session URL;
running actions become `needs-attention`, without automatic retry.

Full snapshots favor auditability over scale. Canonical JSON is bounded to 2,000,000
bytes per value; history is never silently truncated, and growth can eventually reject
a write. This is a small local pilot, not a scalable production store. History
hashes detect accidental drift, not an attacker who can rewrite the entire database.

Real BA startup also requires `--isolation-inventory <absolute-json-path>` alongside
the explicitly authorized executable/model/sandbox flags. See
[BA process isolation](../../docs/specforge-workspace/phases/phase-4-config-isolation.md).
Offline tests are not live runtime acceptance by themselves. The distinct real
pilot and observed human acceptance are recorded in the phase evidence.

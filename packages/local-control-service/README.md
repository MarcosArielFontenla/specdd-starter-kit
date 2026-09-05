# SpecControl Local

O2/O3 form a deliberately narrow local control plane: one operator-registered project,
one active run, a read-only Planner, a persistent spec/plan pause, and an approval
bound to the exact SHA-256 of that artifact. With an explicit execution binding, O3
can continue in an isolated copy through Developer, independent read-only Reviewer,
and structured checks. O4-A can then prepare and approve an exact draft-PR subject,
without exposing a remote action. O4-B optionally exercises the approved flow by
pushing to an explicitly bound local bare Git remote. O4-C1 adds a GitHub draft-PR
adapter and reconciliation behind injected boundaries; O4-C2 adds a bounded `gh`
transport and private-clone preparer. They remain disabled by default. The accepted
O5 Bloom pilot used the complete opt-in path to create one exact branch, commit and
draft PR after separate approval. It did not merge, deploy, modify the original
working tree, or turn browser input into arbitrary commands.

## Start

Requires Node 22.12+ and an authenticated Codex CLI with App Server support. Resolve
the executable explicitly. The private state directory must be outside, and must
not contain, the registered project root. On Windows O3 also requires an explicit
native sandbox mode:

```powershell
$codexPath = (Get-Command codex).Source
$statePath = Join-Path $env:LOCALAPPDATA 'SpecDD\speccontrol-sample'
npm run speccontrol:start -- `
  --project-id sample `
  --project-root D:\projects\sample `
  --state-dir $statePath `
  --codex $codexPath `
  --execution-binding D:\trusted\execution-binding.json `
  --windows-sandbox unelevated `
  --port 4310
```

`unelevated` is the validated fallback on this host. Prefer `elevated` after its
setup and an allowed/denied boundary probe both pass. The service refuses O3 on
Windows without one of these modes; it never falls back to unrestricted execution.

Open the one-time bootstrap URL printed by the process. The service removes the
token from the visible URL through a redirect and establishes an `HttpOnly`,
`SameSite=Strict` local session. Keep the terminal running while using the UI.

### Optional O4-A publication gate

Start from the same command and add a reviewed publication binding plus an absolute
Git executable:

```powershell
$gitPath = (Get-Command git).Source
$publicationBinding = 'D:\trusted\publication-binding.json'
# Add: --publication-binding $publicationBinding --git $gitPath
```

The binding shape is illustrated by
[`fixtures/o4-publication-binding.example.json`](fixtures/o4-publication-binding.example.json).
Preparation requires the registered project to be the exact Git top-level, clean,
checked out on the configured base branch, and connected through the configured
remote to the exact GitHub owner/repository. The deterministic head branch is
`<headPrefix><runId>-a<executionAttempt>`.

At approval time O4-A repeats that inspection and compares HEAD, remote and branch
with the persisted subject. The subject also binds the O3 plan, execution binding,
baseline, diff and evidence hashes. Replay, target mismatch and source drift fail
closed. Without a publisher, the service exposes no publish endpoint.

O4-B accepts a separate `local-git` binding whose `localRemotePath` is an absolute,
non-UNC path to a trusted bare repository. Adding
`--local-publication-root D:\private-state\publication-workspaces` enables the local
button. The adapter clones the exact base, checks that the head does not exist,
applies only the O3 diff, creates one commit with hooks/signing disabled, pushes one
new branch and writes a private receipt. It never treats this as a GitHub PR.

O4-C1 provides `GitHubDraftPublisher` and `GitHubCliGateway` as an offline-tested
adapter boundary. It pins the prepared head before a possible external effect,
reuses one exact open draft PR, and reconciles an uncertain operation as published,
absent or conflicting. The gateway only builds structured requests for an injected
transport. O4-C2-A adds the bounded process transport and exact local branch
preparer. They are wired only when a GitHub binding is started with both
`--github-cli ABSOLUTE_GH_PATH` and `--github-publication-root PRIVATE_PATH`.
This mode is capable of real effects. O4-C2-B1 verified GitHub access and target
metadata read-only. The O5 Bloom pilot later completed an explicitly authorized
create-only push and reconciled draft PR without merge or deployment.

The GitHub runtime executes only the adapter's exact structured CLI requests, with
no shell, a minimal environment, cancellation, timeout and bounded stdin/output.
The preparer rechecks the source and builds the commit in a private clone. Push uses
a create-only empty lease, so a concurrently created head branch makes it fail.
Each private clone enables `core.longpaths=true` locally before checkout; no global
Git configuration is changed. Reconciliation also handles failures before a head
was prepared: only an exactly absent branch and empty exact PR set can restore the
approved state, while any observed remote artifact becomes a conflict.

The external state directory contains `state.sqlite`, its SQLite journal files,
isolated execution copies, and an exclusive `service.lock`. Keeping it outside the
project prevents App Server from inferring the whole repository as writable. A
surviving lock is not deleted automatically: first
prove that the recorded process is no longer the owner, then remove that exact
lock file manually. A restart converts any interrupted `planning` run to
`needs-attention`; it never retries an ambiguous Planner turn silently.

## Security boundary

- HTTP binds only to `127.0.0.1`, checks the exact `Host` and `Origin`, requires a
  CSRF header for writes, exposes no CORS policy, and applies a restrictive CSP.
- The project root and runtime executable come only from startup arguments. The UI
  cannot choose a path, command, model, permission profile, or provider.
- Codex runs over private stdio with MCP disabled, a minimal environment,
  `approvalPolicy: never`, `read-only` for Planner/Reviewer and `workspace-write`
  for Developer over a copied worktree. On Windows the selected native sandbox
  mode is passed locally to every App Server process and recorded in its receipt.
- Agent output is schema/size/path validated, stored canonically, and rendered with
  DOM `textContent`. Approval accepts only the persisted artifact hash once.
- The Developer never receives the original project root. The host snapshots a
  `baseline/`, creates `worktree/`, calculates the actual diff independently, and
  rejects mismatch with the Developer receipt. Generated `bin` directories are
  excluded; .NET `obj` restore metadata remains eligible for explicitly configured
  `--no-restore` checks. Reviewer runs in a distinct App Server thread and can read
  both copies without writing.
- Checks come from the startup binding, use an absolute executable, argument arrays,
  `shell: false`, bounded output and timeout. `$NODE` is the sole portable executable
  placeholder and resolves to the Node process running the service. The child
  environment contains only process-launch basics plus `HOME` on Unix or the
  standard Windows profile-location family required by SDK/package-cache discovery;
  unrelated and credential-bearing variables are not inherited.
- Publication configuration is startup-only. Git inspection uses argument arrays,
  no shell and bounded output/time; GitHub credentials are neither inherited by
  agents nor required by O4-A/O4-B. Local remotes, workspaces, project and
  publication roots may not overlap; `.git` paths, links and UNC remotes are blocked.
- The O4-C1/C2-A GitHub boundary accepts only exact `github.com` subjects and exact open
  draft-PR observations. Closed/non-draft/additional PRs, mismatched revisions,
  malformed responses and ambiguous remote state stop publication.

These controls are not a general multi-tenant sandbox. The execution binding is
trusted operator configuration, and its checks execute project code on the host.
Use only reviewed checks and data appropriate for that project. Containerized check
adapters, multi-project scheduling, authenticated multi-user approvals, automatic
repair loops, merge and deployment remain outside the accepted boundary. The
external-project pilot is complete; its overall GitHub CI is not green because
Bloom's pre-existing integration-test baseline fails independently of the accepted
domain-only change.

## Verify

```powershell
npm run speccontrol:test
```

The 46-test suite covers authentication/CSRF, cancellation, deterministic validation,
persistent pauses, exact-hash approvals, replay rejection, crash reconciliation,
the web publication gate, a real offline Git publication fixture, and simulated
GitHub publication/reconciliation plus bounded fake-process and local Git runtime
tests, without invoking `gh` or using network.

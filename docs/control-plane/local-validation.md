# Local validation without Warp

No Warp account or credits are required. Use Node.js 20+ and install this
repository's dependencies with `npm ci`. Run commands from the repository root.

This guide targets the evolved Control Plane workspace. The isolated documentation
pilot does not include the pending architecture/preparation implementation. Before
running the preparation check, confirm that `scripts/phase5/prepare.test.mjs` exists
in your checkout; if it is missing, that check is unavailable, not passing.

## Local checks

Run these in order; stop and investigate any nonzero exit code.

| Command | Purpose | Expected result |
|---|---|---|
| `npm run test:unit --workspaces --if-present` | Check the unit suites defined by the workspace packages. Packages without this script are skipped. | Exit 0 and passing tests in the reported suites; inspect which suites actually ran. |
| `npm run build --workspaces --if-present` | Compile packages, bundle source templates and build the portal/wizards. This also prepares inputs for the next check. | Exit 0 and successful build output for each participating workspace. |
| `node --test scripts/phase5/prepare.test.mjs` | Check real Harness/Capability Pack preparation and refusal to overwrite an existing sandbox. Requires the Phase 5 preparation implementation. | Exit 0 and a passing preparation test; this is not a live agent run. |

Build and test commands can generate local build artifacts. The preparation test uses
a temporary directory. None of these commands require a Warp service connection.
The optional Warp adapter may still be compiled/tested by the all-workspace commands;
it is not a dependency of the portal's own build.

## The separate live-run gate

Green local tests do not prove a completed live Phase 5 run. A prepared sandbox,
valid graph or mock result is not evidence of execution. Missing or failed checks
must never be treated as a pass.

A live run needs an actual issue and generated Harness/skills consumed by its agents,
followed by these checkpoints:

1. **Human approval:** approve the exact specification before implementation. Missing
   approval, rejection or changed scope stops development until a new decision.
2. **Independent review:** another reviewer checks the actual implementation and
   acceptance criteria; the implementing agent cannot impersonate that reviewer.
3. **Canonical eval:** execute the approved criteria against the reviewed output and
   capture the command, result and implementation identity. Missing or failed eval
   evidence stops PR creation. A drift evaluator reporting insufficient history is
   not a quality pass.
4. **Actual draft PR:** create and verify a real GitHub draft PR, with issue/spec links
   and the reviewed head SHA. A local PR record alone does not satisfy this step.

Keep traceable telemetry and evidence for the same run and graph. The pilot permits
**no merge and no deployment**. Only accept Phase 5 after reviewing the complete
live evidence chain; local checks alone do not open Phase 6.

## This guide's mechanical conformance check

Run `node --test scripts/phase5/local-validation.test.mjs` to check this document's
required commands and safety statements. It also tests intentionally incomplete
in-memory documents without network access or product writes. It measures document
conformance, not runtime enforcement, agent quality, or live-run completion.

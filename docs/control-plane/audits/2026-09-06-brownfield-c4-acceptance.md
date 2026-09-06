# Brownfield C4 — exact-byte fidelity and convergence acceptance

Date: 2026-09-06. Scope: generate a fresh Level 2 Brownfield scaffold from the
published SpecDD Kit, install it in a private clone of a real project, converge nine
entity contracts through exact human approvals, rebaseline two explicitly approved
source changes, and require the consolidated validator to finish `VERIFIED`.

This is bounded operational evidence. It does not certify arbitrary repositories,
infer missing business rules, authenticate the human identity recorded in local
receipts, publish the private changes, merge them, or deploy the application.

## Revisions and protected workspaces

| Item | Value |
|---|---|
| SpecDD generator revision | `02366cb32a15774b13e795ecc3deb891897f5f8b` |
| Bloom source revision | `d5d1560e482bc79cbbbf034a93c01fab0946ab10` |
| Private acceptance workspace | `%LOCALAPPDATA%\SpecDD\bloom-brownfield-c4-c1` |
| Generation audit SHA-256 | `36b327d4909ea8ec8191d6bf9d8ca4800f32194a1ca46fa5dec29a43086068da` |
| Final manifest SHA-256 | `317587cf766d3db794f522e236abe3782689878a650ffdf3ee20d07c31af36e3` |
| Final validation report SHA-256 | `38b0dbf2811da33f2950ac0fbde4b4f0593bdaa0b673ff217e0f7664937d7acd` |

The source checkout, earlier C4 workspaces and SPECDDSTARTERKIT were treated as
protected inputs. The acceptance workspace was a clean local clone at the source
revision, so the source checkout's modified `docker-compose.yml` and untracked
Harness files were not ingested or overwritten.

## C4-A — clean regeneration exposed the fidelity defect

The semantic analyzer reproduced 186 tracked input paths, 176 visible source paths,
158 content-fingerprinted semantic files and nine entities. The generated scaffold
skipped only the existing `README.md`. The first acceptance workspace reported
identical source path counts but false content drift in CRLF/BOM-sensitive `.csproj`
and migration files. JavaScript fingerprinted browser bytes while PowerShell had
read text through `Get-Content -Raw`, which normalized line endings.

## C4-B — exact-byte parity correction

The analyzer now accepts raw bytes from browser files, and both
`validate-project.ps1` and `rebaseline-source.ps1` fingerprint files with
`[IO.File]::ReadAllBytes`. Regressions distinguish LF, CRLF and UTF-8 BOM content and
exercise a generated Brownfield round trip. The change was published as commit
`02366cb32a15774b13e795ecc3deb891897f5f8b`; hosted
[CI run 34036000749](https://github.com/MarcosArielFontenla/specdd-starter-kit/actions/runs/34036000749)
passed all 16 jobs. The local SpecDD Kit regression had 102 unit tests, four browser
tests and its production build passing.

## C4-C — governed convergence on a fresh scaffold

The fresh C4-C1 scaffold immediately produced:

- `extractionStatus: VERIFIED`;
- 176 expected and current source paths with fingerprint `45a81fb8`;
- 158/176 content-fingerprinted files with no false CRLF/BOM drift;
- `projectReadinessStatus: FAILED` only because nine contracts were placeholders and
  two real integration tests failed.

Nine evidence-backed candidates were proposed and applied only after approval of
subject `655104c9abc3cc490593b1e61e44115c56d800296a4967f509d1a7b1bd52420e`.
The application receipt SHA-256 is
`40d4db8086ebbe9a97376be089de5216d47c49dcc740577392f6c8375f637043`.
It records nine contract writes, nine canonical status alignments and reviewer
`Marcos Ariel Fontenla (human approval via Codex)`.

An initial `pwsh -File ... -CandidatePaths $array` command was rejected by
PowerShell's native argument binding before the script ran, so it produced neither a
proposal nor a receipt. Calling the `.ps1` directly from PowerShell 7 with the array
variable preserved the intended parameter and produced the approved proposal. The
usage documentation records that supported form.

The two failing tests were aligned with the repository's existing behavior in the
private workspace only:

- the admin seed test now verifies idempotence for the configured identity plus the
  existing repair/recreation behavior;
- the concurrent exclusion test accepts only PostgreSQL `23P01` or `40P01` for the
  losing transaction while still requiring exactly one winner.

A forced non-incremental build was necessary because the first `--no-restore` test
run reused a stale binary whose timestamp was newer than the copied sources. A direct
`dotnet test --no-incremental` attempt was rejected by the SDK before execution; the
supported `dotnet build --no-incremental --no-restore` followed by
`dotnet test --no-build --no-restore` passed all eight directed tests. These two
source paths were then proposed and applied only after approval of subject
`688b8a7bdee6311159e56b43073a2644f9cffa872851258ae8c43074436dd8ba`.
Its receipt SHA-256 is
`b208e5715cf9098bd08fca7f30e76e41b114e3f873fab7cb2098d629c132560b`.

## Final validation

The final consolidated `validate-project.ps1` run used existing caches, an empty
local NuGet source and disabled NuGet audit network lookup. It exited 0 with:

| Stage | Result |
|---|---|
| Harness structure and references | PASS |
| Nine executable entity-contract checks | PASS |
| Context budget | PASS |
| Immutable generated-file integrity | PASS |
| Brownfield source baseline | PASS |
| Context and contract readiness | PASS |
| Frontend build and .NET project checks | PASS |

Final state: `status: VERIFIED`, `extractionStatus: VERIFIED`, and
`projectReadinessStatus: VERIFIED`. The final acceptance run constrained dependency
resolution to existing caches and an empty local source. No dependency version,
commit, push, PR, merge or deploy operation was part of C4-C.

## Accepted boundary

C4 proves one complete Windows-hosted Level 2 adoption on a real Angular/.NET/
PostgreSQL repository. It proves collision safety, exact-byte fidelity across
JavaScript and PowerShell, explicit contract approval, TOCTOU/replay protection,
content-only source reapproval and one truthful final validator result.

It does not prove semantic completeness for every stack or repository. Level 2 is
bounded evidence collection, not business understanding. Fingerprints detect local
copy/content drift; they are not cryptographic authenticity or identity proof.
Added/deleted paths require fresh ingestion, and source changes remain project work
that must be reviewed and published separately.

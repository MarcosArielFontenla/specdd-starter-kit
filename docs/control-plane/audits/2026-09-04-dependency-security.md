# Dependency security remediation after Phase 6

Date: 2026-09-04 (America/Argentina/Buenos_Aires)

## Scope and changes

The approved maintenance task addresses the eight npm audit findings recorded at
the end of Phase 6. This does not start Phase 7, change canonical contracts, activate
Warp, or modify the isolated Phase 5 pilot / draft PR #2.

All four Astro applications now declare Astro `^7.3.1` and `@astrojs/react` `^6.0.5`.
React remains on the existing 18.x line. Compatible transitive patches were applied
with `npm audit fix`, without `--force` or dependency overrides. The lockfile was
then verified with a clean `npm ci`.

The workspace and application minimum is now Node **22.12.0**. CI uses Node 22;
setup guides, root README and launch prompts match this requirement. Standalone
canonical packages retain their own engine contracts. SpecDeploy's downstream
provider templates and the historical pilot evidence were not rewritten.

Migration references: [Astro 6 guide](https://docs.astro.build/en/guides/upgrade-to/v6/)
and [Astro 7 guide](https://docs.astro.build/en/guides/upgrade-to/v7/).

## Resolved dependency tree

| Reported package | Installed remediation |
|---|---|
| astro | 7.3.1 in all four apps |
| browserslist | 4.28.9 |
| esbuild | 0.28.2; separate 0.25.12 instance is outside the reported vulnerable range |
| js-yaml | 4.3.2 |
| nanoid | 3.3.18 |
| postcss | 8.5.28 |
| sharp | 0.35.4 |
| svgo | 4.1.0 |

Before: **8 findings (7 high, 1 low)**. After clean install: **0 findings** across
all severities, including development dependencies, from `npm audit --json`.
This is a dated registry-advisory result, not proof that the application has no
security defects or that future advisories will remain at zero.

## Compatibility adjustment

Astro 7's CLI detects agent environments and automatically detaches `astro dev`.
The initial Playwright run therefore failed during server startup. The four test
configs now use `scripts/testing/astro-dev.mjs` after their existing predev hooks.
It resolves Astro from the current workspace and uses its exported `dev()` API to
keep the server in the foreground under Playwright ownership, with a strict port.
The programmatic API is experimental; keep this adapter covered when upgrading Astro.
Normal interactive development commands remain unchanged.

The four background servers created by the failed startup attempt were stopped
using Astro's own per-workspace stop command. No unrelated development server was stopped.

## Verification

Local environment: Windows, Node 24.16.0, npm 11.0.0.

- `npm ci`: passed; zero audit findings.
- `npm audit --json`: passed; empty vulnerabilities map, total zero.
- `npm ls astro @astrojs/react browserslist esbuild js-yaml nanoid postcss sharp svgo`: passed.
- `npm run test:unit --workspaces --if-present`: complete suite passed, exit 0.
- `npm run test:phase5`: one regression passed, exit 0.
- `npm run build --workspaces --if-present`: all library/application builds passed.
- With `CI=true`, `npm run test -w specdd-platform -w sdd-kit-wizard -w specforge-wizard -w specdeploy-wizard`:
  **11 passed** (4 + 3 + 2 + 2), exit 0, using fresh foreground servers.
  The restricted Windows run hung during process cleanup and was interrupted;
  the final full run used elevated execution permissions and completed normally.
- `git diff --check`: passed.
- CI YAML parsed successfully; hosted CI has not been run for these local changes.

Builds still report upstream React/Vite deprecated-option warnings and a large-chunk
warning in the SpecDD wizard. These are recorded, not hidden or treated as security
findings. No application-source or generated Harness compatibility change was needed.

CI now includes `npm audit --audit-level=low` and the four browser suites, and its
path filters include shared testing scripts. Future newly published advisories can
fail this gate and require review; the audit is not suppressed with an allowlist.

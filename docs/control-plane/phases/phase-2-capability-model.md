# Phase 2 — SpecForge Capability Model

Status: complete  
Date: 2026-09-04

## Outcome

SpecForge now generates one validated, runtime-neutral Capability Pack per selected
role. Capability manifests coexist with every legacy Role Pack artifact and describe
routing and project-binding intent without mutating the target Harness.

## Delivered

- `@specdd/capability-model` workspace package;
- Capability Pack schema `1.0.0` using JSON Schema draft 2020-12;
- strict TypeScript types and semantic validation;
- stable diagnostics for IDs, paths, uniqueness, references, subagent activation, and
  dependency errors;
- role-descriptor factory and explicit legacy migration with
  `INFERRED_LEGACY_ROLE_PACK` warning;
- minimal and representative QA examples;
- one generated manifest at `.agents/capabilities/<role-id>/capability.json` per role;
- routing, registry, budget, and conditional Project Definition binding instructions
  sourced from each manifest;
- collision-safe generation and backward-compatible Role Pack output;
- CI and clean-build prerequisites for the capability model.

## Public package surface

| API | Purpose |
|---|---|
| `validateCapabilityPack` | Return structural and semantic diagnostics without throwing for invalid user data |
| `isCapabilityPack` | Type guard over full validation |
| `createCapabilityPack` | Construct a versioned manifest from canonical source fields |
| `createCapabilityPackFromRoleDescriptor` | Normalize current SpecForge role metadata |
| `migrateLegacyRolePack` | Reconstruct a human-reviewable draft from an explicit legacy descriptor |

## Compatibility behavior

- Existing skills, assets, rubrics, workflows, subagent seeds, optional prompts, MCP
  projection, install-task path, report path, and ZIP filename remain unchanged.
- Each selected role is independent; generated manifests contain no cross-role references.
- Capability manifest collisions use the existing skip-and-report rule.
- Installation remains draft and human-gated. SpecForge never edits ROUTING, REGISTRY,
  budget, or Project Definition directly.
- Harnesses with a Project Definition gain a capability binding instruction; older
  Harnesses retain the existing installation path.
- Subagents remain inactive in both canonical metadata and generated Markdown.

## Verification evidence

| Check | Result |
|---|---|
| Project-model tests | 11 passed |
| Capability-model tests | 7 passed, including strict TypeScript build |
| SpecDD unit tests | 71 passed |
| SpecForge unit tests | 27 passed |
| SpecDeploy unit tests | 42 passed |
| Total unit tests | 158 passed |
| Platform E2E | 4 passed |
| SpecDD E2E | 3 passed |
| SpecForge E2E | 2 passed, including generated Capability Pack preview |
| SpecDeploy E2E | 2 passed |
| Workspace builds | Both model packages, platform, and all three standalone wizards passed |
| Diff whitespace check | Passed |

## Accepted ADR

- [ADR-0004 — One Role per Capability Pack](../adrs/0004-one-role-one-capability-pack.md)

## Deferred to Phase 3 and later

- graph nodes and execution edges;
- run lifecycle and runtime permissions;
- adapter or model-specific fields;
- cross-pack version resolution and distribution;
- eval result normalization and run evidence;
- Warp projection or API calls;
- deployment integration.

## Known risks

- JSON Schema and semantic TypeScript validation must remain synchronized.
- Legacy migration requires an explicit descriptor because historical Role Packs have no
  canonical manifest or reliable activation state.
- Capability binding remains an installation task, so target-project validation occurs
  when the human-approved task executes rather than during ZIP generation.

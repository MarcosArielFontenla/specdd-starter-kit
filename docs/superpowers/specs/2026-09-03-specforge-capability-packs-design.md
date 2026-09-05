# SpecForge Capability Packs — Phase 2 Design

**Date:** 2026-09-03  
**Status:** Approved for Phase 2 implementation  
**Scope:** Capability contract, Role Pack migration, generated manifests, and routing installation intent

## Goal

Evolve SpecForge Role Packs into independently composable, versioned Capability Packs while preserving every existing generated skill, playbook, workflow, rubric, prompt projection, collision rule, and human installation gate.

## Decisions

| Concern | Decision |
|---|---|
| Granularity | One selected role produces one Capability Pack manifest |
| Canonical path | `.agents/capabilities/<capability-id>/capability.json` |
| Serialization | JSON Schema draft 2020-12 plus strict TypeScript types and semantic validation |
| Version | Capability schema and newly generated packs start at `1.0.0`; referenced role skills retain their existing `0.1.0` version |
| Content ownership | The manifest references existing artifacts; it does not copy their prose |
| Composition | Cross-references use stable IDs; dependencies declare Harness compatibility |
| Routing | Routing intent is declarative in the manifest and installed only through the existing human-approved tasks file |
| Project binding | Install tasks add a lightweight binding to `context/project-definition.json` when present; pre-Phase-1 Harnesses remain supported |
| Subagents | Metadata is represented, but generated subagents remain `inactive` |
| Runtime neutrality | No vendor prompt format, runtime ID, model ID, graph edge, or execution lifecycle enters the contract |

## Capability Pack contract

Each document contains:

- `metadata`: stable ID, name, description, and pack version;
- `role`: role identity, title, and scope;
- `skills`: canonical skill paths and versions;
- `playbooks`: assets bound to a skill;
- `workflows`: workflow paths, triggers, and skill/context dependencies;
- `policies`: normalized `require`/`forbid`/`verify` statements derived from current Must, Never, and Verification rules;
- `evals`: rubric path, mode, and target skills;
- `context`: required project/spec context references;
- `subagents`: canonical seed metadata and activation state;
- `routing`: task match, priority, skill reference, and workflow root;
- `dependencies`: Harness and optional capability dependencies;
- namespaced `extensions` only at explicit extension points.

The manifest describes a portable capability. The referenced Markdown/YAML files remain the human-readable operational content.

## Identity and reference rules

- IDs follow the Project Definition component-ID rule.
- IDs are unique within each collection.
- Every playbook, workflow, eval, subagent, and route reference resolves inside the pack.
- Capability dependencies cannot self-reference.
- Paths are safe repository-relative paths.
- A pack contains exactly one role and at least one skill, policy, eval, context requirement, and route.

## Routing integration

The generated install task remains `status: draft` and human-gated. For each capability it instructs the agent to:

1. validate/read the capability manifest;
2. add its declarative route to `.agents/orchestration/ROUTING.md`;
3. register the manifest and referenced artifacts in `.agents/REGISTRY.md`;
4. add the matching budget class;
5. add a `CapabilityBinding` to `context/project-definition.json` when that file exists;
6. keep the Multi-Agent system inactive;
7. run existing Harness validators.

SpecForge still does not overwrite ROUTING, REGISTRY, budget, or Project Definition directly.

## Migration strategy

Three states are supported:

1. **New generation:** emit the Capability Pack manifest alongside unchanged Role Pack artifacts.
2. **Existing Role Pack without a manifest:** reconstruct a draft manifest from explicit role metadata plus the known artifact inventory. Emit an `INFERRED_LEGACY_ROLE_PACK` warning and require human review before installation.
3. **Existing project binding:** install the manifest path into the Project Definition through the draft tasks file; if no Project Definition exists, keep the original ROUTING/REGISTRY/budget installation path.

Migration never overwrites an existing capability manifest and never infers successful activation from file presence.

## Backward compatibility

- All pre-Phase-2 paths remain generated.
- Copilot prompts remain optional pointer projections.
- MCP behavior remains unchanged.
- Collisions remain skip-and-report only.
- Existing consumers may ignore `.agents/capabilities/`.
- The report and tasks retain Role Pack terminology where needed, while introducing the Capability Pack identity.

## Acceptance criteria

- Minimal and representative examples validate.
- Every selected SpecForge role produces one valid manifest.
- Multi-role generation produces independent manifests with no cross-pack references.
- Manifest references resolve to files in the generated pack or explicit Harness dependencies.
- Install tasks source routing and Project Definition binding from each manifest.
- Existing artifact paths and conditional workflows remain unchanged.
- Collision handling includes capability manifests.
- Legacy descriptor migration emits an explicit warning and produces a valid draft pack.
- Invalid IDs, paths, duplicate IDs, missing references, active subagents, and self-dependencies produce stable diagnostics.
- Schema, types, examples, generators, all unit tests, E2E tests, and builds pass.

## Deferred

- graph nodes and edges;
- execution activation and runtime permissions;
- Capability Pack registry/distribution;
- automated merge into Project Definition or routing files;
- version-range resolution across installed packs;
- eval result normalization;
- Warp projection.

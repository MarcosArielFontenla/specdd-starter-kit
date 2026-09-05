# `@specdd/capability-model`

Portable Capability Pack contract shared by SpecDD and SpecForge.

A Capability Pack describes a durable role capability through references to its skills, playbooks, workflows, policies, evals, context requirements, inactive subagent seeds, routing intents, and dependencies. It does not execute work or modify a target Harness.

## API

- `createCapabilityPack` builds a canonical pack from typed sections.
- `createCapabilityPackFromRoleDescriptor` maps the current SpecForge role model.
- `validateCapabilityPack` returns stable structural and reference diagnostics.
- `migrateLegacyRolePack` reconstructs a draft pack from explicit legacy Role Pack metadata and emits an inference warning.

The schema is exported at `@specdd/capability-model/schema`.

## Installation boundary

Generated manifests live at `.agents/capabilities/<id>/capability.json`. Their routing and Project Definition bindings are applied only through the human-approved `role-pack-install.tasks.md`; a manifest's presence never means it is installed or active.

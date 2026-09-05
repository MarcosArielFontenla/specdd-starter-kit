# `@specdd/control-plane-model`

Portable SpecControl contracts for describing who performs project work, in which
order, and behind which policies and human gates.

## Contract

`SpecDDControlPlane` version `1.0.0` references a Project Definition, Harnesses, and
Capability Packs. It owns agent roles, workflows, DAGs, typed nodes, edges, approvals,
policies, failure routes, bounded retries, eval gates, artifact contracts, and portable
runtime hints.

The package exports:

- `createControlPlaneDefinition`, `createControlGraph`, and `createPolicyRule`;
- `validateControlPlaneDefinition` and `isControlPlaneDefinition`;
- strict TypeScript types and constants;
- aggregate, graph, and policy JSON Schemas.

## Safety boundary

This model is declarative. It does not execute graphs, grant permissions, approve a
transition, select a vendor/model, call a runtime, or claim that an artifact or eval
exists. Phase 3 approvals are human-only, retries are finite, and graphs are acyclic.

Runtime adapters consume this contract in later phases. Adapter-specific configuration
must remain outside the canonical document.


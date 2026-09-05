import {
  CONTROL_PLANE_KIND,
  CONTROL_PLANE_SCHEMA_VERSION,
  type ControlGraph,
  type ControlPlaneDefinition,
  type ControlPlaneSource,
  type PolicyRule,
} from './types.js';

export function createControlPlaneDefinition(source: ControlPlaneSource): ControlPlaneDefinition {
  return {
    schemaVersion: CONTROL_PLANE_SCHEMA_VERSION,
    kind: CONTROL_PLANE_KIND,
    ...source,
  };
}

export function createControlGraph(graph: ControlGraph): ControlGraph {
  return structuredClone(graph);
}

export function createPolicyRule(policy: PolicyRule): PolicyRule {
  return structuredClone(policy);
}


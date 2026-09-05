import type { ComponentId, Extensions } from '@specdd/project-model';

export const CONTROL_PLANE_KIND = 'SpecDDControlPlane' as const;
export const CONTROL_PLANE_SCHEMA_VERSION = '1.0.0' as const;

export type ControlPlaneLifecycle = 'draft' | 'active' | 'deprecated';

export interface ControlPlaneMetadata {
  id: ComponentId;
  name: string;
  description: string;
  version: string;
  extensions?: Extensions;
}

export interface ProjectReference {
  id: ComponentId;
  source: string;
  version: string;
  extensions?: Extensions;
}

export interface HarnessBinding {
  id: ComponentId;
  source: string;
  contractVersion: string;
  enabled: boolean;
  extensions?: Extensions;
}

export interface ControlCapabilityBinding {
  id: ComponentId;
  source: string;
  version: string;
  enabled: boolean;
  extensions?: Extensions;
}

export interface AgentRole {
  id: ComponentId;
  title: string;
  purpose: string;
  harnessRef: ComponentId;
  capabilityBindingRefs: ComponentId[];
  policyRefs: ComponentId[];
  runtimeHintRef?: ComponentId;
  extensions?: Extensions;
}

export interface WorkflowTrigger {
  kind: 'manual' | 'event';
  event?: string;
  extensions?: Extensions;
}

export interface ControlWorkflow {
  id: ComponentId;
  name: string;
  purpose: string;
  graphRef: ComponentId;
  triggers: WorkflowTrigger[];
  inputArtifactRefs: ComponentId[];
  outputArtifactRefs: ComponentId[];
  policyRefs: ComponentId[];
  extensions?: Extensions;
}

export interface GraphNodeBase {
  id: ComponentId;
  name: string;
  inputArtifactRefs: ComponentId[];
  outputArtifactRefs: ComponentId[];
  policyRefs: ComponentId[];
  retryRef?: ComponentId;
  failureRouteRef?: ComponentId;
  runtimeHintRef?: ComponentId;
  extensions?: Extensions;
}

export interface AgentNode extends GraphNodeBase {
  kind: 'agent';
  agentRoleRef: ComponentId;
}

export interface ApprovalNode extends GraphNodeBase {
  kind: 'approval';
  approvalRef: ComponentId;
}

export interface EvalNode extends GraphNodeBase {
  kind: 'eval';
  evalGateRef: ComponentId;
}

export interface ArtifactNode extends GraphNodeBase {
  kind: 'artifact';
  artifactContractRef: ComponentId;
}

export type GraphNode = AgentNode | ApprovalNode | EvalNode | ArtifactNode;

export type EdgeOutcome = 'success' | 'approved' | 'rejected' | 'pass' | 'fail' | 'always';

export interface GraphEdge {
  id: ComponentId;
  from: ComponentId;
  to: ComponentId;
  on: EdgeOutcome;
  extensions?: Extensions;
}

export interface ControlGraph {
  id: ComponentId;
  name: string;
  description: string;
  entryNodeId: ComponentId;
  terminalNodeIds: ComponentId[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  extensions?: Extensions;
}

export interface ApprovalContract {
  id: ComponentId;
  name: string;
  mode: 'human';
  required: boolean;
  instructions: string;
  artifactRefs: ComponentId[];
  extensions?: Extensions;
}

export interface PolicyRule {
  id: ComponentId;
  category: 'permission' | 'risk' | 'transition';
  effect: 'allow' | 'deny' | 'require';
  subjectRefs: ComponentId[];
  action: string;
  resource: string;
  enforcement: 'instruction' | 'validator' | 'runtime' | 'human';
  condition?: string;
  extensions?: Extensions;
}

export interface FailureRoute {
  id: ComponentId;
  graphRef: ComponentId;
  strategy: 'stop' | 'route';
  targetNodeRef?: ComponentId;
  reason: string;
  extensions?: Extensions;
}

export interface RetryBackoff {
  strategy: 'none' | 'fixed' | 'exponential';
  initialDelaySeconds: number;
  maxDelaySeconds: number;
  extensions?: Extensions;
}

export interface RetryRule {
  id: ComponentId;
  maxAttempts: number;
  backoff: RetryBackoff;
  extensions?: Extensions;
}

export interface EvalGate {
  id: ComponentId;
  evalRef: ComponentId;
  mode: 'advisory' | 'required';
  requiredOutcome: 'pass';
  extensions?: Extensions;
}

export interface ArtifactContract {
  id: ComponentId;
  name: string;
  kind: 'input' | 'output' | 'evidence';
  path: string;
  required: boolean;
  schemaRef?: string;
  extensions?: Extensions;
}

export interface RuntimeHint {
  id: ComponentId;
  execution: 'local' | 'remote' | 'either';
  isolation: 'none' | 'process' | 'worktree' | 'container';
  network: 'denied' | 'restricted' | 'allowed';
  interactive: boolean;
  extensions?: Extensions;
}

export interface ControlPlaneDefinition {
  schemaVersion: typeof CONTROL_PLANE_SCHEMA_VERSION;
  kind: typeof CONTROL_PLANE_KIND;
  lifecycle: ControlPlaneLifecycle;
  metadata: ControlPlaneMetadata;
  project: ProjectReference;
  harnesses: HarnessBinding[];
  capabilityBindings: ControlCapabilityBinding[];
  agentRoles: AgentRole[];
  workflows: ControlWorkflow[];
  graphs: ControlGraph[];
  approvals: ApprovalContract[];
  policies: PolicyRule[];
  failureRoutes: FailureRoute[];
  retries: RetryRule[];
  evalGates: EvalGate[];
  artifactContracts: ArtifactContract[];
  runtimeHints: RuntimeHint[];
  extensions?: Extensions;
}

export type ControlPlaneSource = Omit<ControlPlaneDefinition, 'schemaVersion' | 'kind'>;


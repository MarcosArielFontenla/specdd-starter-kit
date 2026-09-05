import {
  validateControlPlaneDefinition,
  type AgentRole,
  type ControlGraph,
  type ControlPlaneDefinition,
  type ControlWorkflow,
  type GraphNode,
} from '@specdd/control-plane-model';
import type { Diagnostic } from '@specdd/project-model';
import {
  WARP_ADAPTER_VERSION,
  WARP_FACTORY_SCHEMA_VERSION,
  WARP_FOREMAN_ID,
  type WarpAdapterConfig,
  type WarpAgentBinding,
  type WarpAutomationBinding,
  type WarpCompilationResult,
  type WarpExecution,
  type WarpMappingItem,
  type WarpProjectionReport,
  type WarpUnsupportedFeature,
} from './types.js';
import { validateWarpAdapterConfig } from './validate.js';

const byId = <T extends { id: string }>(left: T, right: T): number => left.id.localeCompare(right.id);
const yamlString = (value: string): string => JSON.stringify(value);
const inline = (value: string): string => `\`${value.replaceAll('`', '\\`')}\``;

export function compileWarpFactory(source: unknown, target: unknown): WarpCompilationResult {
  const sourceValidation = validateControlPlaneDefinition(source);
  const targetValidation = validateWarpAdapterConfig(target);
  const diagnostics = [...sourceValidation.diagnostics, ...targetValidation.diagnostics];
  if (!sourceValidation.valid || !targetValidation.valid) return emptyResult(diagnostics);

  const definition = source as ControlPlaneDefinition;
  const config = target as WarpAdapterConfig;
  validateBindings(definition, config, diagnostics);
  if (diagnostics.some(({ severity }) => severity === 'error')) return emptyResult(diagnostics);

  const mappings: WarpMappingItem[] = [];
  const unsupported: WarpUnsupportedFeature[] = [];
  const addUnsupported = (feature: WarpUnsupportedFeature): void => {
    unsupported.push(feature);
    diagnostics.push({
      code: feature.code,
      severity: 'warning',
      path: feature.sourcePath,
      message: `${feature.feature}: ${feature.impact}`,
    });
  };

  const files: Record<string, string> = {};
  files['factory.yaml'] = renderFactory(config);
  mappings.push(mapping('control-plane', definition.metadata.id, 'factory.yaml', 'exact', 'Identity is projected; the canonical definition remains authoritative.'));
  mappings.push(mapping('adapter repositories', config.factoryName, 'factory.yaml#repositories', 'exact', 'Repository coordinates exist only in adapter configuration.'));
  mappings.push(mapping('adapter execution defaults', config.factoryName, 'factory.yaml#agentDefaults', 'exact', 'Warp model or harness selection exists only in adapter configuration.'));

  files[`agents/${WARP_FOREMAN_ID}/agent.md`] = renderForeman(definition);
  mappings.push(mapping('adapter infrastructure', WARP_FOREMAN_ID, `agents/${WARP_FOREMAN_ID}/agent.md`, 'exact', 'Warp requires exactly one foreman; this agent is not a canonical role.'));

  const agentBindings = new Map(config.agentBindings.map((binding) => [binding.roleRef, binding]));
  for (const role of [...definition.agentRoles].sort(byId)) {
    const binding = agentBindings.get(role.id);
    const path = `agents/${role.id}/agent.md`;
    files[path] = renderRole(role, definition, binding);
    mappings.push(mapping('agent role', role.id, path, 'instruction-only', 'Role identity maps directly; Harness, capability, and policy behavior remains referenced canonical content.'));
  }

  const automationBindings = new Map(config.automations.map((binding) => [binding.workflowRef, binding]));
  for (const workflow of [...definition.workflows].sort(byId)) {
    const binding = automationBindings.get(workflow.id);
    if (binding) {
      const path = `automations/${workflow.id}/automation.md`;
      files[path] = renderAutomation(workflow, binding);
      mappings.push(mapping('workflow event trigger', workflow.id, path, 'exact', 'Explicit event bindings map to a disabled Warp automation.'));
    }
    for (const [index, trigger] of workflow.triggers.entries()) {
      if (trigger.kind === 'manual') {
        addUnsupported({
          code: 'WARP_MANUAL_TRIGGER_NOT_AUTOMATED',
          sourcePath: `/workflows/${definition.workflows.indexOf(workflow)}/triggers/${index}`,
          feature: `Manual trigger for '${workflow.id}'`,
          impact: 'No automation file is generated; a human must start the Factory work item.',
          deferredTo: 'Phase 5 runtime operation',
        });
      } else if (!binding?.triggers.some(({ sourceEvent }) => sourceEvent === trigger.event)) {
        addUnsupported({
          code: 'WARP_EVENT_TRIGGER_UNBOUND',
          sourcePath: `/workflows/${definition.workflows.indexOf(workflow)}/triggers/${index}`,
          feature: `Event trigger '${trigger.event}'`,
          impact: 'No provider event was guessed, so no Warp automation represents this trigger.',
          deferredTo: 'Adapter configuration',
        });
      }
    }
  }

  reportGraphSemantics(definition, mappings, addUnsupported);
  const generatedFiles = Object.keys(files).sort();
  const report: WarpProjectionReport = {
    adapterVersion: WARP_ADAPTER_VERSION,
    targetSchemaVersion: WARP_FACTORY_SCHEMA_VERSION,
    source: { id: definition.metadata.id, version: definition.metadata.version },
    generatedFiles,
    mappings: mappings.sort((a, b) => `${a.sourceKind}:${a.sourceRef}`.localeCompare(`${b.sourceKind}:${b.sourceRef}`)),
    unsupportedFeatures: unsupported.sort((a, b) => `${a.sourcePath}:${a.code}`.localeCompare(`${b.sourcePath}:${b.code}`)),
    externalWritesPerformed: false,
    automationsEnabled: false,
  };

  return {
    valid: true,
    files: Object.fromEntries(generatedFiles.map((path) => [path, files[path]!])),
    diagnostics,
    report,
    reportMarkdown: renderWarpUnsupportedReport(report),
  };
}

export function renderWarpUnsupportedReport(report: WarpProjectionReport): string {
  const lines = [
    '# Warp Adapter Projection Report',
    '',
    `Source: ${inline(report.source.id)} ${inline(report.source.version)}  `,
    `Adapter: ${inline(report.adapterVersion)}  `,
    `Warp target: ${inline(report.targetSchemaVersion)}  `,
    'External writes performed: **no**  ',
    'Automations enabled: **no**',
    '',
    '## Generated files',
    '',
    ...report.generatedFiles.map((path) => `- ${inline(path)}`),
    '',
    '## Mapping',
    '',
    '| Source | Target | Status | Note |',
    '|---|---|---|---|',
    ...report.mappings.map((item) => `| ${escapeTable(`${item.sourceKind}: ${item.sourceRef}`)} | ${escapeTable(item.target ?? '—')} | ${item.status} | ${escapeTable(item.note)} |`),
    '',
    '## Unsupported or non-equivalent semantics',
    '',
  ];
  if (report.unsupportedFeatures.length === 0) lines.push('None.');
  else {
    lines.push('| Code | Canonical source | Impact | Deferred to |', '|---|---|---|---|');
    lines.push(...report.unsupportedFeatures.map((item) => `| ${item.code} | ${escapeTable(item.sourcePath)} | ${escapeTable(item.impact)} | ${escapeTable(item.deferredTo)} |`));
  }
  lines.push('', 'This report describes compilation fidelity only. It is not evidence of a Warp run, approval, eval result, or pull request.', '');
  return lines.join('\n');
}

function validateBindings(definition: ControlPlaneDefinition, config: WarpAdapterConfig, diagnostics: Diagnostic[]): void {
  definition.agentRoles.forEach((role, index) => {
    const harness = definition.harnesses.find(item => item.id === role.harnessRef);
    const disabledCapabilities = role.capabilityBindingRefs.filter(ref => definition.capabilityBindings.find(item => item.id === ref)?.enabled === false);
    if (harness?.enabled === false || disabledCapabilities.length > 0) {
      diagnostics.push({ code: 'WARP_DISABLED_BINDING', severity: 'error', path: `/agentRoles/${index}`, message: 'A projected role cannot consume a disabled Harness or capability binding.' });
    }
  });
  const roles = new Set(definition.agentRoles.map(({ id }) => id));
  const workflows = new Map(definition.workflows.map((workflow) => [workflow.id, workflow]));
  if (roles.has(WARP_FOREMAN_ID)) {
    diagnostics.push({ code: 'WARP_RESERVED_ROLE_COLLISION', severity: 'error', path: '/agentRoles', message: `Canonical role '${WARP_FOREMAN_ID}' collides with adapter infrastructure.` });
  }
  config.agentBindings.forEach((binding, index) => {
    if (!roles.has(binding.roleRef)) diagnostics.push({ code: 'WARP_UNKNOWN_ROLE_BINDING', severity: 'error', path: `/agentBindings/${index}/roleRef`, message: `Unknown canonical agent role '${binding.roleRef}'.` });
  });
  config.automations.forEach((binding, index) => {
    const workflow = workflows.get(binding.workflowRef);
    if (!workflow) {
      diagnostics.push({ code: 'WARP_UNKNOWN_WORKFLOW_BINDING', severity: 'error', path: `/automations/${index}/workflowRef`, message: `Unknown canonical workflow '${binding.workflowRef}'.` });
      return;
    }
    const events = new Set(workflow.triggers.filter(({ kind }) => kind === 'event').map(({ event }) => event));
    binding.triggers.forEach((trigger, triggerIndex) => {
      if (!events.has(trigger.sourceEvent)) diagnostics.push({
        code: 'WARP_UNKNOWN_SOURCE_EVENT', severity: 'error',
        path: `/automations/${index}/triggers/${triggerIndex}/sourceEvent`,
        message: `Workflow '${workflow.id}' has no canonical event '${trigger.sourceEvent}'.`,
      });
    });
  });
}

function reportGraphSemantics(
  definition: ControlPlaneDefinition,
  mappings: WarpMappingItem[],
  addUnsupported: (feature: WarpUnsupportedFeature) => void,
): void {
  definition.graphs.forEach((graph, graphIndex) => {
    mappings.push(mapping('control graph', graph.id, `agents/${WARP_FOREMAN_ID}/agent.md`, 'instruction-only', 'Nodes and edges are rendered as foreman instructions, not as a first-class static Warp graph.'));
    addUnsupported({
      code: 'WARP_GRAPH_INSTRUCTIONS_ONLY', sourcePath: `/graphs/${graphIndex}`,
      feature: `Control graph '${graph.id}'`,
      impact: 'Ordering and outcomes are prompt instructions; Phase 4 cannot prove runtime graph enforcement.',
      deferredTo: 'Phase 5 execution validation',
    });
  });
  definition.approvals.forEach((approval, index) => addUnsupported({
    code: 'WARP_APPROVAL_INSTRUCTIONS_ONLY', sourcePath: `/approvals/${index}`,
    feature: `Human approval '${approval.id}'`,
    impact: 'The foreman is instructed to stop and wait, but this compiler does not provision or verify a runtime approval gate.',
    deferredTo: 'Phase 5 human-gate validation',
  }));
  definition.evalGates.forEach((gate, index) => addUnsupported({
    code: 'WARP_EVAL_GATE_UNSUPPORTED', sourcePath: `/evalGates/${index}`,
    feature: `Canonical eval gate '${gate.id}'`,
    impact: 'No Warp scorer is generated; required eval nodes instruct the foreman to stop for an external canonical evaluator.',
    deferredTo: 'Phase 6 eval runtime adapters',
  }));
  definition.retries.forEach((retry, index) => addUnsupported({
    code: 'WARP_RETRY_UNSUPPORTED', sourcePath: `/retries/${index}`,
    feature: `Bounded retry '${retry.id}'`,
    impact: 'Attempt limits and backoff are documented in instructions but not configured as enforceable Factory resources.',
    deferredTo: 'Future runtime capability after Phase 5',
  }));
  definition.failureRoutes.forEach((route, index) => addUnsupported({
    code: 'WARP_FAILURE_ROUTE_INSTRUCTIONS_ONLY', sourcePath: `/failureRoutes/${index}`,
    feature: `Failure route '${route.id}'`,
    impact: 'The route is visible to the foreman but has no equivalent static Factory configuration resource.',
    deferredTo: 'Phase 5 execution validation',
  }));
  definition.policies.forEach((policy, index) => addUnsupported({
    code: policy.enforcement === 'runtime' ? 'WARP_RUNTIME_POLICY_UNSUPPORTED' : 'WARP_POLICY_INSTRUCTIONS_ONLY',
    sourcePath: `/policies/${index}`,
    feature: `Policy '${policy.id}' (${policy.enforcement})`,
    impact: policy.enforcement === 'runtime'
      ? 'The adapter cannot claim target-runtime enforcement and only exposes the constraint to agents.'
      : 'The policy remains canonical and is referenced in agent instructions; the adapter does not execute its enforcement mechanism.',
    deferredTo: policy.enforcement === 'human' ? 'Phase 5 human-gate validation' : 'Future policy runtime adapter',
  }));
  definition.artifactContracts.forEach((artifact, index) => addUnsupported({
    code: 'WARP_ARTIFACT_VALIDATION_UNSUPPORTED', sourcePath: `/artifactContracts/${index}`,
    feature: `Artifact contract '${artifact.id}'`,
    impact: 'Paths and requirements appear in instructions, but the compiler does not validate runtime artifact creation or schemas.',
    deferredTo: 'Phase 5 artifact evidence',
  }));
  definition.runtimeHints.forEach((hint, index) => addUnsupported({
    code: 'WARP_RUNTIME_HINT_NOT_ENFORCED', sourcePath: `/runtimeHints/${index}`,
    feature: `Runtime hint '${hint.id}'`,
    impact: 'Portable execution, isolation, network, and interactivity hints do not select Warp environment IDs or runners automatically.',
    deferredTo: 'Explicit adapter/runtime configuration',
  }));
}

function renderFactory(config: WarpAdapterConfig): string {
  return [
    `schemaVersion: ${WARP_FACTORY_SCHEMA_VERSION}`,
    `name: ${yamlString(config.factoryName)}`,
    'repositories:',
    ...config.repositories.flatMap(({ owner, name }) => [`  - owner: ${yamlString(owner)}`, `    name: ${yamlString(name)}`]),
    'agentDefaults:',
    ...renderExecution(config.agentDefaults, 2),
    '',
  ].join('\n');
}

function renderRole(role: AgentRole, definition: ControlPlaneDefinition, binding?: WarpAgentBinding): string {
  const assignedNodes = definition.graphs.flatMap((graph) => graph.nodes.filter((node) => node.kind === 'agent' && node.agentRoleRef === role.id).map((node) => ({ graph, node })));
  const policies = definition.policies.filter(({ id }) => role.policyRefs.includes(id));
  const lines = [
    '---',
    `description: ${yamlString(role.purpose)}`,
    `agentType: ${binding?.agentType ?? 'CUSTOM'}`,
  ];
  if (binding?.execution) lines.push(...renderExecution(binding.execution, 0));
  if (binding?.environmentId) lines.push(`environmentId: ${yamlString(binding.environmentId)}`);
  lines.push(
    '---',
    '',
    `# ${role.title}`,
    '',
    `Canonical role: ${inline(role.id)}. ${role.purpose}`,
    '',
    'Before acting, read and follow:',
    '',
    `- Harness ${inline(role.harnessRef)} at ${inline(definition.harnesses.find(({ id }) => id === role.harnessRef)?.source ?? role.harnessRef)}.`,
    ...role.capabilityBindingRefs.map((ref) => {
      const bindingRef = definition.capabilityBindings.find(({ id }) => id === ref);
      return `- Capability ${inline(ref)} at ${inline(bindingRef?.source ?? ref)}.`;
    }),
    '',
    'Assigned canonical nodes:',
    '',
    ...(assignedNodes.length === 0 ? ['- None. Wait for explicit foreman delegation.'] : assignedNodes.map(({ graph, node }) => `- ${inline(node.id)} in graph ${inline(graph.id)}: inputs ${refs(node.inputArtifactRefs)}, outputs ${refs(node.outputArtifactRefs)}.`)),
    '',
    'Canonical policies:',
    '',
    ...(policies.length === 0 ? ['- No role-scoped policy references.'] : policies.map((policy) => `- ${inline(policy.id)}: ${policy.effect} ${inline(policy.action)} on ${inline(policy.resource)}; enforcement remains ${inline(policy.enforcement)}.`)),
    '',
    'Do not merge, deploy, change architecture, modify the Harness, bypass an approval, or claim eval evidence unless the canonical definition and a human explicitly authorize it.',
    '',
  );
  return lines.join('\n');
}

function renderForeman(definition: ControlPlaneDefinition): string {
  const lines = [
    '---',
    `description: ${yamlString(`Coordinate ${definition.metadata.name} without weakening canonical SpecControl gates.`)}`,
    'agentType: FOREMAN',
    '---',
    '',
    '# SpecDD Foreman',
    '',
    'This is Warp adapter infrastructure, not a canonical SpecDD agent role.',
    '',
    `Treat ${inline(definition.project.source)} and the SpecControl definition ${inline(definition.metadata.id)} ${inline(definition.metadata.version)} as the source of truth. Delegate agent nodes to the named role agents. Follow only declared edges and outcomes. Never invent a missing transition.`,
    '',
    'Hard boundaries:',
    '',
    '- Do not merge pull requests or deploy.',
    '- Do not modify Specs, architecture, Harness, graph, policies, or eval thresholds without explicit human authorization.',
    '- Stop at every required approval until a human gives an explicit decision.',
    '- Stop at every canonical eval node; Phase 4 does not generate Warp scorers.',
    '- Never report an artifact, approval, eval, or pull request as complete without evidence.',
    '',
  ];
  for (const workflow of [...definition.workflows].sort(byId)) {
    const graph = definition.graphs.find(({ id }) => id === workflow.graphRef)!;
    lines.push(`## Workflow: ${workflow.name}`, '', `${workflow.purpose}`, '', `Canonical ID: ${inline(workflow.id)}; graph: ${inline(graph.id)}; entry: ${inline(graph.entryNodeId)}; terminals: ${refs(graph.terminalNodeIds)}.`, '', 'Nodes:', '');
    graph.nodes.forEach((node) => lines.push(`- ${renderNode(node, definition)}`));
    lines.push('', 'Edges:', '');
    graph.edges.forEach((edge) => lines.push(`- ${inline(edge.from)} --${inline(edge.on)}--> ${inline(edge.to)}.`));
    lines.push('', 'Workflow policies:', '', ...workflow.policyRefs.map((ref) => `- ${renderPolicy(ref, definition)}`), '');
  }
  lines.push('', '## Canonical contracts (declarative; not runtime enforcement)', '',
    '```json', JSON.stringify({
      retries: definition.retries, failureRoutes: definition.failureRoutes,
      artifactContracts: definition.artifactContracts, policies: definition.policies,
      approvals: definition.approvals, evalGates: definition.evalGates,
      runtimeHints: definition.runtimeHints,
    }, null, 2), '```', '');
  return lines.join('\n');
}

function renderNode(node: GraphNode, definition: ControlPlaneDefinition): string {
  const base = `${inline(node.id)} [${node.kind}] inputs ${refs(node.inputArtifactRefs)}, outputs ${refs(node.outputArtifactRefs)}, policies ${refs(node.policyRefs)}`;
  if (node.kind === 'agent') return `${base}; delegate to agent ${inline(node.agentRoleRef)}.${renderControls(node)}`;
  if (node.kind === 'approval') {
    const approval = definition.approvals.find(({ id }) => id === node.approvalRef)!;
    return `${base}; request human approval ${inline(approval.id)} (required: ${approval.required}): ${approval.instructions} Follow the edge matching the explicit human decision; never treat rejection as approval.${renderControls(node)}`;
  }
  if (node.kind === 'eval') {
    const gate = definition.evalGates.find(({ id }) => id === node.evalGateRef)!;
    return `${base}; STOP for canonical eval ${inline(gate.evalRef)} (${gate.mode}). No Warp scorer exists in Phase 4; obtain external evidence and follow the declared outcome edge and gate mode. Never invent pass evidence.${renderControls(node)}`;
  }
  const artifact = definition.artifactContracts.find(({ id }) => id === node.artifactContractRef)!;
  return `${base}; require artifact ${inline(artifact.id)} at ${inline(artifact.path)}. Do not infer its existence.${renderControls(node)}`;
}

function renderControls(node: GraphNode): string {
  return [
    node.retryRef ? ` Retry intent: ${inline(node.retryRef)}.` : '',
    node.failureRouteRef ? ` Failure route: ${inline(node.failureRouteRef)}.` : '',
    node.runtimeHintRef ? ` Runtime hint: ${inline(node.runtimeHintRef)}.` : '',
  ].join('');
}

function renderPolicy(ref: string, definition: ControlPlaneDefinition): string {
  const policy = definition.policies.find(({ id }) => id === ref)!;
  return `${inline(policy.id)}: ${policy.effect} ${inline(policy.action)} on ${inline(policy.resource)}; canonical enforcement ${inline(policy.enforcement)}.`;
}

function renderAutomation(workflow: ControlWorkflow, binding: WarpAutomationBinding): string {
  return [
    '---',
    `agent: ${WARP_FOREMAN_ID}`,
    'enabled: false',
    'triggers:',
    ...binding.triggers.flatMap((trigger) => [
      `  - provider: ${trigger.provider}`,
      `    event: ${yamlString(trigger.event)}`,
    ]),
    '---',
    '',
    `# ${workflow.name}`,
    '',
    `${workflow.purpose}`,
    '',
    `Start canonical workflow ${inline(workflow.id)} and follow its generated foreman instructions. This automation is intentionally disabled in Phase 4.`,
    '',
  ].join('\n');
}

function renderExecution(execution: WarpExecution, indent: number): string[] {
  const prefix = ' '.repeat(indent);
  if ('model' in execution && execution.model !== undefined) return [`${prefix}model: ${yamlString(execution.model)}`];
  const lines = [`${prefix}harness:`, `${prefix}  type: ${execution.harness.type}`];
  if (execution.harness.model) lines.push(`${prefix}  model: ${yamlString(execution.harness.model)}`);
  if (execution.harness.reasoningLevel) lines.push(`${prefix}  reasoningLevel: ${yamlString(execution.harness.reasoningLevel)}`);
  return lines;
}

function refs(values: string[]): string { return values.length === 0 ? 'none' : values.map(inline).join(', '); }
function mapping(sourceKind: string, sourceRef: string, target: string | null, status: WarpMappingItem['status'], note: string): WarpMappingItem { return { sourceKind, sourceRef, target, status, note }; }
function escapeTable(value: string): string { return value.replaceAll('|', '\\|').replaceAll('\n', ' '); }
function emptyResult(diagnostics: Diagnostic[]): WarpCompilationResult { return { valid: false, files: {}, diagnostics, report: null, reportMarkdown: '' }; }

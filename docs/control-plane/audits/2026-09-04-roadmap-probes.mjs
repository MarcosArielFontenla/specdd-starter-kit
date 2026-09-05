// Read-only audit probes. Build the architecture packages before running.
// This is not an acceptance suite: observed defects are printed, not endorsed.
import { readFileSync } from 'node:fs';
import { validateProjectDefinition } from '../../../packages/project-model/dist/index.js';
import { validateCapabilityPack } from '../../../packages/capability-model/dist/index.js';
import { validateControlPlaneDefinition } from '../../../packages/control-plane-model/dist/index.js';
import { validateWarpAdapterConfig, compileWarpFactory } from '../../../packages/warp-adapter/dist/index.js';

const root = new URL('../../../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const emit = (id, expected, actual) => console.log(JSON.stringify({ id, expected, actual }));
const project = read('packages/project-model/examples/minimal.project.json');
project.metadata.vendor = 'warp';
project.metadata.labels = 42;
emit('F02-project', 'Reject unknown metadata property and non-array labels', validateProjectDefinition(project));
const capability = read('packages/capability-model/examples/minimal.capability.json');
capability.role.vendor = 'warp';
emit('F02-capability', 'Reject unknown role property', validateCapabilityPack(capability));
const source = read('packages/warp-adapter/examples/issue-to-draft-pr.control-plane.json');
const target = read('packages/warp-adapter/examples/warp-adapter.config.json');
const badKind = structuredClone(source);
badKind.graphs[0].nodes[0].kind = 'constructor';
try {
  emit('F03', 'Return invalid diagnostics without throwing', validateControlPlaneDefinition(badKind));
} catch (error) {
  emit('F03', 'Return invalid diagnostics without throwing', { threw: error.message });
}
const badConfig = structuredClone(target);
badConfig.agentDefaults = { model: 42, harness: { type: 'codex' } };
emit('F04', 'Reject malformed and mutually exclusive execution fields', {
  validation: validateWarpAdapterConfig(badConfig),
  factory: compileWarpFactory(source, badConfig).files['factory.yaml'],
});
const baseline = compileWarpFactory(source, target);
const disabled = structuredClone(source);
disabled.harnesses[0].enabled = false;
disabled.capabilityBindings[0].enabled = false;
const disabledResult = compileWarpFactory(disabled, target);
emit('F05', 'Reject or explicitly account for disabled referenced bindings', {
  valid: disabledResult.valid,
  filesIdentical: JSON.stringify(baseline.files) === JSON.stringify(disabledResult.files),
  reportIdentical: baseline.reportMarkdown === disabledResult.reportMarkdown,
});
const retry = structuredClone(source);
retry.retries[0].maxAttempts += 1;
const retryResult = compileWarpFactory(retry, target);
emit('F06', 'Preserve retry parameters in instructions or accurately report their omission', {
  valid: retryResult.valid,
  filesIdentical: JSON.stringify(baseline.files) === JSON.stringify(retryResult.files),
  reportIdentical: baseline.reportMarkdown === retryResult.reportMarkdown,
  retryDiagnostic: retryResult.diagnostics.find(item => item.code === 'WARP_RETRY_UNSUPPORTED'),
});

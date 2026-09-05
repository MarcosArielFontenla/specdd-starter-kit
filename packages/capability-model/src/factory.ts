import { componentId } from '@specdd/project-model';
import {
  CAPABILITY_PACK_KIND,
  CAPABILITY_PACK_SCHEMA_VERSION,
  type CapabilityMigrationResult,
  type CapabilityPack,
  type CapabilityPackSource,
  type LegacyRoleDescriptor,
} from './types.js';
import { validateCapabilityPack } from './validate.js';

const sequenceId = (prefix: string, index: number) => `${prefix}-${String(index + 1).padStart(3, '0')}`;

export function createCapabilityPack(source: CapabilityPackSource): CapabilityPack {
  return {
    schemaVersion: CAPABILITY_PACK_SCHEMA_VERSION,
    kind: CAPABILITY_PACK_KIND,
    ...source,
  };
}

export function createCapabilityPackFromRoleDescriptor(descriptor: LegacyRoleDescriptor, lifecycle: CapabilityPack['lifecycle'] = 'active'): CapabilityPack {
  const capabilityId = `role-${descriptor.role.id}`;
  const skillId = capabilityId;
  const context = [
    { id: 'project-context', path: 'context/project.md', required: true },
    { id: 'project-constitution', path: 'context/constitution.md', required: true },
    { id: 'entity-specs', path: '.agents/specs', required: false },
  ];
  const contextRefs = context.map((entry) => entry.id);
  const workflows = descriptor.commands.map((command) => ({
    id: componentId(command),
    path: `.agents/workflows/${capabilityId}/${command}.md`,
    triggers: [command.replace(/^specforge-/, '')],
    skillRefs: [skillId],
    contextRefs,
  }));
  return createCapabilityPack({
    lifecycle,
    metadata: {
      id: capabilityId,
      name: `${descriptor.role.title} Capability`,
      description: descriptor.role.scope,
      version: '1.0.0',
    },
    role: {
      id: descriptor.role.id,
      title: descriptor.role.title,
      scope: descriptor.role.scope,
    },
    skills: [{ id: skillId, path: `.agents/skills/${capabilityId}/SKILL.md`, version: '0.1.0' }],
    playbooks: descriptor.selectedPlaybooks.map((playbook) => ({
      id: componentId(playbook),
      path: `.agents/skills/${capabilityId}/assets/${playbook}.md`,
      skillRef: skillId,
    })),
    workflows,
    policies: [
      ...descriptor.role.must.map((statement, index) => ({ id: sequenceId('must', index), effect: 'require' as const, statement })),
      ...descriptor.role.never.map((statement, index) => ({ id: sequenceId('never', index), effect: 'forbid' as const, statement })),
      { id: 'verification', effect: 'verify', statement: descriptor.role.verification },
    ],
    evals: [{ id: `${capabilityId}-adherence`, path: `.agents/evals/rubrics/${capabilityId}.yaml`, mode: 'log_only', targetRefs: [skillId] }],
    context,
    subagents: [{
      id: capabilityId,
      path: `.agents/subagents/${capabilityId}.agent.md`,
      status: 'inactive',
      roleRef: descriptor.role.id,
      skillRefs: [skillId],
      workflowRefs: workflows.map((workflow) => workflow.id),
    }],
    routing: [{
      id: `${capabilityId}-work`,
      match: `${descriptor.role.title} work`,
      priority: 100,
      skillRef: skillId,
      workflowRoot: `.agents/workflows/${capabilityId}/`,
    }],
    dependencies: [{ id: 'specdd-harness', kind: 'harness', versionRange: '^1.0.0', required: true }],
  });
}

export function migrateLegacyRolePack(descriptor: LegacyRoleDescriptor): CapabilityMigrationResult {
  const pack = createCapabilityPackFromRoleDescriptor(descriptor, 'draft');
  const validation = validateCapabilityPack(pack);
  return {
    pack: validation.valid ? pack : null,
    diagnostics: [
      {
        code: 'INFERRED_LEGACY_ROLE_PACK',
        severity: 'warning',
        path: '/',
        message: 'Capability metadata was reconstructed from an explicit legacy Role Pack descriptor and requires human review before activation.',
      },
      ...validation.diagnostics,
    ],
  };
}

// Preparation only: generate a real Harness/Role Pack sandbox. Never execute agents,
// approve a specification, score an implementation, or write to GitHub.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { generateScaffold } from '../../specdd-kit/website/src/components/generators.js';
import { generatePack } from '../../specforge-kit/website/src/components/generators.js';
import { validateProjectDefinition } from '../../packages/project-model/dist/index.js';
import { validateCapabilityPack } from '../../packages/capability-model/dist/index.js';
import { validateControlPlaneDefinition } from '../../packages/control-plane-model/dist/index.js';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const json = async path => JSON.parse(await readFile(resolve(repo, path), 'utf8'));

export async function prepare(destination) {
  const base = await json('specdd-kit/website/src/data/kit-files.json');
  const skills = await json('specforge-kit/website/src/data/skills.json');
  const input = {
    scenario: 'greenfield', project: { name: 'SpecDD Phase 5 Pilot', description: 'Human-gated documentation pilot', problem: 'Prove a traceable development flow without requiring Warp' },
    domains: ['Documentation'], entities: [], features: [], personas: ['Maintainer'],
    tools: ['Codex'], mcp: [], architecture: [], principles: ['Spec before code', 'No merge or deployment'],
    stack: { languages: ['JavaScript'], testing: 'node:test' },
  };
  const scaffold = generateScaffold(base, input);
  const pack = generatePack(skills, {
    roles: ['BA', 'Dev', 'QA'], tools: ['Codex'],
    skillsByRole: { BA: ['acceptance-criteria'], Dev: ['story-to-code'], QA: ['ac-validation'] },
    qa: { approach: 'manual' }, targetPaths: Object.keys(scaffold.files),
  });
  const files = { ...scaffold.files, ...pack.files };
  const project = JSON.parse(files['context/project-definition.json']);
  if (!validateProjectDefinition(project).valid) throw new Error('Invalid generated Project Definition');
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith('/capability.json') && !validateCapabilityPack(JSON.parse(content)).valid) throw new Error(`Invalid capability: ${path}`);
  }
  const control = await json('packages/warp-adapter/examples/issue-to-draft-pr.control-plane.json');
  control.metadata.id = 'phase5-pilot-control';
  control.project.id = project.metadata.id;
  if (!validateControlPlaneDefinition(control).valid) throw new Error('Invalid pilot control definition');
  files['control/definition.json'] = JSON.stringify(control, null, 2) + '\n';
  // A fresh directory is mandatory; reruns cannot overwrite evidence or user work.
  await mkdir(destination);
  const inventory = [];
  for (const [path, content] of Object.entries(files)) {
    const target = resolve(destination, path);
    const rel = relative(resolve(destination), target);
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Unsafe generated path: ${path}`);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { flag: 'wx' });
    inventory.push({ path, sha256: createHash('sha256').update(content).digest('hex') });
  }
  const result = { kind: 'SpecDDPhase5Preparation', status: 'prepared-not-executed', generatedAt: new Date().toISOString(), files: inventory, skippedPackFiles: pack.skipped };
  await writeFile(resolve(destination, 'preparation.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const runId = process.argv[2];
  if (!runId || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(runId)) throw new Error('Usage: node scripts/phase5/prepare.mjs <new-run-id>');
  const parent = resolve(repo, '.phase5');
  await mkdir(parent, { recursive: true });
  const destination = resolve(parent, runId);
  const result = await prepare(destination);
  console.log(JSON.stringify({ destination, status: result.status, files: result.files.length }));
}

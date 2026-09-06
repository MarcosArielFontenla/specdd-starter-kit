import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { generateScaffold } from './generators.js';
import { fingerprintText } from './fingerprints.js';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, '..', '..', '..', '.agents', 'scripts', 'converge-contracts.ps1');
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

function invoke(root, mode, { candidates = [], subject = '', reviewedBy = '', proposal = '' } = {}) {
  const candidateArgument = candidates.length ? ` -CandidatePaths @(${candidates.map(quote).join(',')})` : '';
  const subjectArgument = subject ? ` -SubjectSha256 ${quote(subject)}` : '';
  const reviewerArgument = reviewedBy ? ` -ReviewedBy ${quote(reviewedBy)}` : '';
  const proposalArgument = proposal ? ` -ProposalPath ${quote(proposal)}` : '';
  const command = `& ${quote(script)} -Mode ${mode} -Root ${quote(root)}${candidateArgument}${subjectArgument}${reviewerArgument}${proposalArgument}`;
  return spawnSync('pwsh', ['-NoProfile', '-Command', command], { encoding: 'utf8' });
}

function fixture(t, count = 1) {
  const root = mkdtempSync(join(tmpdir(), 'specdd-contracts-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.agents', 'specs'), { recursive: true });
  mkdirSync(join(root, '.agents', 'evidence', 'entity-contracts', 'candidates'), { recursive: true });
  mkdirSync(join(root, 'context'), { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'customer.cs'), 'public sealed class Customer {}\n');
  writeFileSync(join(root, 'src', 'appointment.cs'), 'public sealed class Appointment {}\n');

  const entities = [
    { id: 'customer', name: 'Customer', file: 'customer', evidence: 'src/customer.cs' },
    { id: 'appointment', name: 'Appointment', file: 'appointment', evidence: 'src/appointment.cs' },
  ].slice(0, count);
  const definition = {
    schemaVersion: '1.0.0',
    kind: 'SpecDDProject',
    metadata: { id: 'fixture', name: 'Fixture' },
    project: {
      scenario: 'brownfield',
      contextReview: { status: 'approved', findings: [] },
      entities: entities.map(({ id, name }) => ({ id, name, domainRefs: ['core'] })),
    },
    specs: entities.map(({ id, file }) => ({
      id: `entity-${id}`, kind: 'entity', path: `.agents/specs/${file}.spec.yaml`, status: 'placeholder', targetRefs: [id],
    })),
    sentinel: { preserve: ['exactly', 42] },
  };
  writeFileSync(join(root, 'context', 'project-definition.json'), `${JSON.stringify(definition, null, 2)}\n`);

  const candidates = [];
  for (const entity of entities) {
    const target = `.agents/specs/${entity.file}.spec.yaml`;
    writeFileSync(join(root, ...target.split('/')), `entity: ${entity.name}\nversion: 0.1.0\ndescription: "placeholder"\nrequirements: []\ndesignContract:\n  status: placeholder\n  reviewedBy: null\n  approvedAt: null\n  acceptanceChecks:\n    - id: ac-001\n      description: "placeholder"\n      command: placeholder\n      expectedExitCode: 0\n  checksWaiver: null\nclarifications: []\n`);
    const relative = `.agents/evidence/entity-contracts/candidates/${entity.file}.json`;
    writeFileSync(join(root, ...relative.split('/')), `${JSON.stringify({
      schemaVersion: 1,
      kind: 'specdd.entity-contract-candidate',
      entity: entity.name,
      targetPath: target,
      description: `${entity.name} behavior recovered from repository evidence.`,
      evidence: [entity.evidence],
      requirements: [{ id: `${entity.id.toUpperCase()}-001`, text: `${entity.name} preserves its invariant.` }],
      acceptanceChecks: [{
        id: `ac-${entity.id}`,
        description: `Run the ${entity.name} contract check`,
        command: "pwsh -NoProfile -Command 'exit 0'",
        expectedExitCode: 0,
      }],
    }, null, 2)}\n`);
    candidates.push(relative);
  }
  return { root, candidates };
}

function subjectFrom(result) {
  return result.stdout.match(/\[SUBJECT\]\s+([a-f0-9]{64})/)?.[1];
}

test('propose and apply bind candidates, approve only authorized targets, and emit an auditable receipt', (t) => {
  const { root, candidates } = fixture(t, 2);
  const definitionPath = join(root, 'context', 'project-definition.json');
  const extendedDefinition = JSON.parse(readFileSync(definitionPath, 'utf8'));
  extendedDefinition.project.entities.push({ id: 'untouched', name: 'Untouched', domainRefs: ['core'] });
  extendedDefinition.specs.push({ id: 'entity-untouched', kind: 'entity', path: '.agents/specs/untouched.spec.yaml', status: 'placeholder', targetRefs: ['untouched'] });
  writeFileSync(definitionPath, `${JSON.stringify(extendedDefinition, null, 2)}\n`);
  const untouchedPath = join(root, '.agents', 'specs', 'untouched.spec.yaml');
  const untouched = 'entity: Untouched\ndesignContract:\n  status: placeholder\n  acceptanceChecks:\n    - command: placeholder\n';
  writeFileSync(untouchedPath, untouched);
  const beforeDefinition = JSON.parse(readFileSync(join(root, 'context', 'project-definition.json'), 'utf8'));
  const proposal = invoke(root, 'propose', { candidates });
  assert.equal(proposal.status, 0, proposal.stderr);
  assert.match(proposal.stdout, /\[STATUS\] AWAITING_APPROVAL/);
  const subject = subjectFrom(proposal);
  assert.match(subject, /^[a-f0-9]{64}$/);

  const apply = invoke(root, 'apply', { subject, reviewedBy: 'Human Reviewer' });
  assert.equal(apply.status, 0, apply.stderr);
  assert.match(apply.stdout, /\[STATUS\] APPLIED/);
  for (const file of ['customer', 'appointment']) {
    const contract = readFileSync(join(root, '.agents', 'specs', `${file}.spec.yaml`), 'utf8');
    assert.match(contract, /status: approved/);
    assert.match(contract, /reviewedBy: "Human Reviewer"/);
    assert.doesNotMatch(contract, /placeholder/);
  }
  const afterDefinition = JSON.parse(readFileSync(join(root, 'context', 'project-definition.json'), 'utf8'));
  assert.deepEqual(afterDefinition.sentinel, beforeDefinition.sentinel);
  assert.deepEqual(afterDefinition.specs.map(({ status }) => status), ['approved', 'approved', 'placeholder']);
  assert.equal(readFileSync(untouchedPath, 'utf8'), untouched);
  const receiptPath = join(root, '.agents', 'evidence', 'entity-contracts', 'receipts', `${subject}.json`);
  assert.ok(existsSync(receiptPath));
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  assert.equal(receipt.reviewedBy, 'Human Reviewer');
  assert.equal(receipt.subjectSha256, subject);
  assert.equal(receipt.contracts.length, 2);
  assert.deepEqual(receipt.projectDefinition.approvedSpecIds, ['entity-appointment', 'entity-customer']);

  const replay = invoke(root, 'apply', { subject, reviewedBy: 'Human Reviewer' });
  assert.notEqual(replay.status, 0);
  assert.match(replay.stderr, /CONTRACT_REPLAY/);
});

test('apply fails closed when the candidate changes after proposal', (t) => {
  const { root, candidates } = fixture(t);
  const proposal = invoke(root, 'propose', { candidates });
  const subject = subjectFrom(proposal);
  const candidatePath = join(root, ...candidates[0].split('/'));
  const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
  candidate.description = 'tampered';
  writeFileSync(candidatePath, JSON.stringify(candidate));
  const targetPath = join(root, '.agents', 'specs', 'customer.spec.yaml');
  const before = readFileSync(targetPath, 'utf8');
  const apply = invoke(root, 'apply', { subject, reviewedBy: 'Reviewer' });
  assert.notEqual(apply.status, 0);
  assert.match(apply.stderr, /CONTRACT_CANDIDATE_DRIFT/);
  assert.equal(readFileSync(targetPath, 'utf8'), before);
});

test('apply fails closed when a target or the canonical definition changes after proposal', (t) => {
  const first = fixture(t);
  let proposal = invoke(first.root, 'propose', { candidates: first.candidates });
  let subject = subjectFrom(proposal);
  const targetPath = join(first.root, '.agents', 'specs', 'customer.spec.yaml');
  writeFileSync(targetPath, `${readFileSync(targetPath, 'utf8')}# drift\n`);
  let apply = invoke(first.root, 'apply', { subject, reviewedBy: 'Reviewer' });
  assert.notEqual(apply.status, 0);
  assert.match(apply.stderr, /CONTRACT_TARGET_DRIFT/);

  const second = fixture(t);
  proposal = invoke(second.root, 'propose', { candidates: second.candidates });
  subject = subjectFrom(proposal);
  const definitionPath = join(second.root, 'context', 'project-definition.json');
  const definition = JSON.parse(readFileSync(definitionPath, 'utf8'));
  definition.sentinel.preserve[1] = 43;
  writeFileSync(definitionPath, JSON.stringify(definition));
  apply = invoke(second.root, 'apply', { subject, reviewedBy: 'Reviewer' });
  assert.notEqual(apply.status, 0);
  assert.match(apply.stderr, /CONTRACT_DEFINITION_DRIFT/);
});

test('wrong subject and missing reviewer cannot mutate the proposal targets', (t) => {
  const { root, candidates } = fixture(t);
  const proposal = invoke(root, 'propose', { candidates });
  const subject = subjectFrom(proposal);
  const targetPath = join(root, '.agents', 'specs', 'customer.spec.yaml');
  const before = readFileSync(targetPath, 'utf8');

  let apply = invoke(root, 'apply', { subject: '0'.repeat(64), reviewedBy: 'Reviewer' });
  assert.notEqual(apply.status, 0);
  assert.match(apply.stderr, /CONTRACT_SUBJECT_MISMATCH/);
  assert.equal(readFileSync(targetPath, 'utf8'), before);

  apply = invoke(root, 'apply', { subject });
  assert.notEqual(apply.status, 0);
  assert.match(apply.stderr, /CONTRACT_REVIEWER_REQUIRED/);
  assert.equal(readFileSync(targetPath, 'utf8'), before);
});

test('receipt replay protection is global across alternate proposal paths', (t) => {
  const { root, candidates } = fixture(t);
  const proposal = invoke(root, 'propose', { candidates });
  const subject = subjectFrom(proposal);
  const apply = invoke(root, 'apply', { subject, reviewedBy: 'Reviewer' });
  assert.equal(apply.status, 0, apply.stderr);
  const alternate = '.agents/evidence/entity-contracts/archive/copied-proposal.json';
  const alternateFull = join(root, ...alternate.split('/'));
  mkdirSync(dirname(alternateFull), { recursive: true });
  writeFileSync(alternateFull, readFileSync(join(root, '.agents', 'evidence', 'entity-contracts', 'proposal.json')));
  const replay = invoke(root, 'apply', { subject, reviewedBy: 'Reviewer', proposal: alternate });
  assert.notEqual(replay.status, 0);
  assert.match(replay.stderr, /CONTRACT_REPLAY/);
});

test('propose rejects paths outside the candidate and entity-spec allowlists', (t) => {
  const { root, candidates } = fixture(t);
  const candidatePath = join(root, ...candidates[0].split('/'));
  const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
  candidate.targetPath = 'context/project.md';
  writeFileSync(candidatePath, JSON.stringify(candidate));
  let result = invoke(root, 'propose', { candidates });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CONTRACT_TARGET_PATH/);

  const second = fixture(t);
  const outside = 'candidate.json';
  writeFileSync(join(second.root, outside), readFileSync(join(second.root, ...second.candidates[0].split('/'))));
  result = invoke(second.root, 'propose', { candidates: [outside] });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CONTRACT_CANDIDATE_PATH/);
});

test('propose rejects unresolved template and draft markers', (t) => {
  const { root, candidates } = fixture(t);
  const candidatePath = join(root, ...candidates[0].split('/'));
  const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
  candidate.acceptanceChecks[0].command = 'REPLACE_WITH_REVIEWED_NON_INTERACTIVE_COMMAND';
  writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
  const result = invoke(root, 'propose', { candidates });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CONTRACT_DRAFT_MARKER/);
});

test('a reasoned waiver receives approval identity and date only during exact apply', (t) => {
  const { root, candidates } = fixture(t);
  const candidatePath = join(root, ...candidates[0].split('/'));
  const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
  delete candidate.acceptanceChecks;
  candidate.checksWaiver = { reason: 'No safe executable check exists for this documentary invariant.' };
  writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
  const proposal = invoke(root, 'propose', { candidates });
  assert.equal(proposal.status, 0, proposal.stderr);
  const before = readFileSync(join(root, '.agents', 'specs', 'customer.spec.yaml'), 'utf8');
  assert.doesNotMatch(before, /Waiver Reviewer/);
  const apply = invoke(root, 'apply', { subject: subjectFrom(proposal), reviewedBy: 'Waiver Reviewer' });
  assert.equal(apply.status, 0, apply.stderr);
  const contract = readFileSync(join(root, '.agents', 'specs', 'customer.spec.yaml'), 'utf8');
  assert.match(contract, /acceptanceChecks: \[\]/);
  assert.match(contract, /approvedBy: "Waiver Reviewer"/);
  assert.match(contract, /date: "\d{4}-\d{2}-\d{2}"/);
});

test('approved output satisfies the contract inputs required for project readiness VERIFIED', (t) => {
  const { root, candidates } = fixture(t, 2);
  const proposal = invoke(root, 'propose', { candidates });
  const subject = subjectFrom(proposal);
  const apply = invoke(root, 'apply', { subject, reviewedBy: 'Acceptance Reviewer' });
  assert.equal(apply.status, 0, apply.stderr);

  const definition = JSON.parse(readFileSync(join(root, 'context', 'project-definition.json'), 'utf8'));
  assert.ok(definition.specs.every((spec) => spec.status === 'approved'));
  for (const spec of definition.specs) {
    const contents = readFileSync(join(root, ...spec.path.split('/')), 'utf8');
    assert.doesNotMatch(contents, /^\s*status:\s*placeholder\s*$|command:\s*placeholder/im);
    assert.match(contents, /status: approved/);
    assert.match(contents, /approvedAt: "\d{4}-\d{2}-\d{2}T/);
  }
});

test('a generated Brownfield scaffold converges through the real validator with prerequisite-aware readiness', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'specdd-contracts-roundtrip-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const sourceText = '\ufeffpublic sealed class Customer {}\r\n';
  const sourcePath = 'src/customer.cs';
  const input = {
    scenario: 'brownfield',
    project: { name: 'Contract fixture', description: 'Round-trip fixture', problem: 'Placeholder contract' },
    personas: ['Operator'],
    outcomes: { user: 'A verified contract', business: 'Auditable convergence' },
    constraints: { business: 'Human approval', technical: 'Offline' },
    stack: { languages: ['C#'], frontend: '', backend: '.NET', testing: 'PowerShell', database: '', infra: '', swagger: false, a11y: false },
    architecture: ['Layered'],
    principles: ['Specifications are the source of truth'],
    security: { classification: 'internal', owaspControls: [] },
    domains: ['Core'],
    entities: ['Customer'],
    features: [],
    tools: [],
    mcp: [],
    model: 'default',
    existingPaths: [sourcePath],
    projectChecks: [{ id: 'fixture', command: "pwsh -NoProfile -Command 'exit 0'", source: sourcePath }],
    analysis: {
      analysisDepth: 'semantic', projectName: 'Contract fixture', fileCount: 1, truncated: false,
      stack: { languages: ['C#'], backend: '.NET', testing: 'PowerShell' },
      domains: ['Core'], entities: ['Customer'], features: [], manifestsFound: [],
      manifestFingerprints: {},
      semantic: {
        filesRead: [sourcePath], filesSkipped: [], totalChars: sourceText.length, confidence: 'high',
        architecture: [{ value: 'Layered', source: sourcePath, confidence: 'high' }],
        evidence: [], fileFingerprints: { [sourcePath]: fingerprintText(sourceText) },
      },
    },
    contextReview: {
      approved: true,
      stack: [{ field: 'backend', label: 'Backend', value: '.NET', selected: true, status: 'implemented', source: sourcePath, confidence: 'high' }],
      domains: [{ value: 'Core', selected: true, status: 'implemented', source: sourcePath, confidence: 'high' }],
      entities: [{ value: 'Customer', selected: true, status: 'implemented', source: sourcePath, confidence: 'high' }],
      features: [],
      architecture: [{ value: 'Layered', selected: true, status: 'architectural', source: sourcePath, confidence: 'high' }],
      projectChecks: [{ id: 'fixture', label: 'Fixture', command: "pwsh -NoProfile -Command 'exit 0'", source: sourcePath, selected: true }],
    },
  };
  const kitFilesPath = join(here, '..', 'data', 'kit-files.json');
  const baseFiles = JSON.parse(readFileSync(kitFilesPath, 'utf8'));
  const { files } = generateScaffold(baseFiles, input, '2026-09-06');
  const sourceFull = join(root, ...sourcePath.split('/'));
  mkdirSync(dirname(sourceFull), { recursive: true });
  writeFileSync(sourceFull, sourceText);
  for (const [relative, contents] of Object.entries(files)) {
    const full = join(root, ...relative.split('/'));
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, contents);
  }
  const candidateRelative = '.agents/evidence/entity-contracts/candidates/customer.json';
  const candidateFull = join(root, ...candidateRelative.split('/'));
  mkdirSync(dirname(candidateFull), { recursive: true });
  writeFileSync(candidateFull, `${JSON.stringify({
    schemaVersion: 1,
    kind: 'specdd.entity-contract-candidate',
    entity: 'Customer',
    targetPath: '.agents/specs/customer.spec.yaml',
    description: 'Customer behavior recovered from repository evidence.',
    evidence: [sourcePath],
    requirements: [{ id: 'CUS-001', text: 'Customer preserves its invariant.' }],
    acceptanceChecks: [{ id: 'ac-customer', description: 'Fixture check', command: "pwsh -NoProfile -Command 'exit 0'", expectedExitCode: 0 }],
  }, null, 2)}\n`);

  const proposal = invoke(root, 'propose', { candidates: [candidateRelative] });
  assert.equal(proposal.status, 0, proposal.stderr);
  const apply = invoke(root, 'apply', { subject: subjectFrom(proposal), reviewedBy: 'Round-trip Reviewer' });
  assert.equal(apply.status, 0, apply.stderr);
  const yamlProbe = spawnSync('pwsh', ['-NoProfile', '-Command', "if (Get-Module -ListAvailable -Name powershell-yaml) { exit 0 } else { exit 3 }"], { encoding: 'utf8' });
  const hasYamlModule = yamlProbe.status === 0;
  const validation = spawnSync('pwsh', ['-NoProfile', '-File', join(root, '.agents', 'scripts', 'validate-project.ps1'), '-Root', root], { encoding: 'utf8' });
  const report = JSON.parse(readFileSync(join(root, 'context', 'harness-validation-report.json'), 'utf8'));
  assert.equal(validation.status, hasYamlModule ? 0 : 2, `${validation.stdout}\n${validation.stderr}\n${JSON.stringify(report, null, 2)}`);
  assert.equal(report.extractionStatus, 'VERIFIED');
  if (hasYamlModule) {
    assert.equal(report.projectReadinessStatus, 'VERIFIED');
  } else {
    assert.equal(report.projectReadinessStatus, 'PARTIAL');
    assert.deepEqual(report.results.filter(({ status }) => status === 'PARTIAL').map(({ id }) => id).sort(), ['budget', 'spec']);
    assert.ok(report.results.filter(({ status }) => status === 'PARTIAL').every(({ details }) => /powershell-yaml is not installed/.test(details)));
    assert.equal(report.results.some(({ status }) => status === 'FAIL'), false);
  }
});

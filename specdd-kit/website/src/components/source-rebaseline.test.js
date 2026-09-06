import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { fingerprintBytes, fingerprintPaths, fingerprintText } from './fingerprints.js';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, '..', '..', '..', '.agents', 'scripts', 'rebaseline-source.ps1');

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

function invoke(root, mode, { paths = [], subject = '' } = {}) {
  const pathArgument = paths.length ? ` -Paths @(${paths.map(quote).join(',')})` : '';
  const subjectArgument = subject ? ` -SubjectSha256 ${quote(subject)}` : '';
  const command = `& ${quote(script)} -Mode ${mode} -Root ${quote(root)}${pathArgument}${subjectArgument}`;
  return spawnSync('pwsh', ['-NoProfile', '-Command', command], { encoding: 'utf8' });
}

function fixture(t, contents = { a: 'alpha\n', b: 'bravo\n' }, { existingGenerated = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'specdd-rebaseline-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'context'), { recursive: true });
  writeFileSync(join(root, 'src', 'a.txt'), contents.a);
  writeFileSync(join(root, 'src', 'b.txt'), contents.b);
  const generatedPath = 'context/brownfield-analysis.md';
  if (existingGenerated) writeFileSync(join(root, 'context', 'brownfield-analysis.md'), 'ingested generated report\n');
  const paths = existingGenerated ? ['src/a.txt', 'src/b.txt', generatedPath] : ['src/a.txt', 'src/b.txt'];
  const pathReceipt = fingerprintPaths(paths);
  const manifest = {
    schemaVersion: 2,
    scenario: 'brownfield',
    generatedFiles: existingGenerated
      ? ['context/scaffold-manifest.json', generatedPath]
      : ['context/scaffold-manifest.json'],
    fidelity: {
      fingerprintAlgorithm: 'fnv1a32-utf8',
      source: {
        pathCount: pathReceipt.count,
        pathFingerprint: pathReceipt.fingerprint,
        contentFingerprints: {
          'src/a.txt': fingerprintBytes(readFileSync(join(root, 'src', 'a.txt'))),
          'src/b.txt': fingerprintBytes(readFileSync(join(root, 'src', 'b.txt'))),
          ...(existingGenerated
            ? { [generatedPath]: fingerprintBytes(readFileSync(join(root, 'context', 'brownfield-analysis.md'))) }
            : {}),
        },
        ...(existingGenerated ? { existingGeneratedPaths: [generatedPath] } : {}),
      },
    },
  };
  writeFileSync(join(root, 'context', 'scaffold-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return root;
}

test('rebaseline sees unchanged LF, CRLF and UTF-8 BOM bytes as unchanged', (t) => {
  const root = fixture(t, { a: '\ufeffalpha\r\n', b: 'bravo\n' });
  const result = invoke(root, 'propose', { paths: ['src/a.txt'] });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /REBASELINE_PATH_UNCHANGED/);
});

test('rebaseline proposes an exact subject, applies it once and writes an audit receipt', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'src', 'a.txt'), 'alpha approved\n');

  const proposed = invoke(root, 'propose', { paths: ['src/a.txt'] });
  assert.equal(proposed.status, 0, proposed.stderr || proposed.stdout);
  assert.match(proposed.stdout, /\[STATUS\] AWAITING_APPROVAL/);
  const proposal = JSON.parse(readFileSync(join(root, '.agents', 'evidence', 'source-baseline', 'proposal.json')));
  assert.match(proposal.subjectSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(proposal.subject.changes.map(({ path }) => path), ['src/a.txt']);

  const applied = invoke(root, 'apply', { subject: proposal.subjectSha256 });
  assert.equal(applied.status, 0, applied.stderr || applied.stdout);
  assert.match(applied.stdout, /\[STATUS\] APPLIED/);
  const manifest = JSON.parse(readFileSync(join(root, 'context', 'scaffold-manifest.json')));
  assert.equal(manifest.fidelity.source.contentFingerprints['src/a.txt'], fingerprintText('alpha approved\n'));
  assert.equal(manifest.fidelity.source.contentFingerprints['src/b.txt'], fingerprintText('bravo\n'));
  assert.equal(existsSync(join(root, '.agents', 'evidence', 'source-baseline', 'receipts', `${proposal.subjectSha256}.json`)), true);

  const replay = invoke(root, 'apply', { subject: proposal.subjectSha256 });
  assert.notEqual(replay.status, 0);
  assert.match(replay.stderr, /REBASELINE_REPLAY/);
});

test('rebaseline ignores content drift in regenerated Harness files that existed at ingestion', (t) => {
  const root = fixture(t, undefined, { existingGenerated: true });
  writeFileSync(join(root, 'src', 'a.txt'), 'alpha approved\n');
  writeFileSync(join(root, 'context', 'brownfield-analysis.md'), 'regenerated Harness report\n');

  const proposed = invoke(root, 'propose', { paths: ['src/a.txt'] });
  assert.equal(proposed.status, 0, proposed.stderr || proposed.stdout);
  const proposal = JSON.parse(readFileSync(join(root, '.agents', 'evidence', 'source-baseline', 'proposal.json')));
  assert.deepEqual(proposal.subject.changes.map(({ path }) => path), ['src/a.txt']);

  const applied = invoke(root, 'apply', { subject: proposal.subjectSha256 });
  assert.equal(applied.status, 0, applied.stderr || applied.stdout);
  const manifest = JSON.parse(readFileSync(join(root, 'context', 'scaffold-manifest.json')));
  assert.equal(manifest.fidelity.source.contentFingerprints['src/a.txt'], fingerprintText('alpha approved\n'));
  assert.equal(
    manifest.fidelity.source.contentFingerprints['context/brownfield-analysis.md'],
    fingerprintText('ingested generated report\n'),
  );
});

test('rebaseline proposal rejects drift outside the explicit allowlist', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'src', 'a.txt'), 'alpha changed\n');
  writeFileSync(join(root, 'src', 'b.txt'), 'bravo changed\n');
  const result = invoke(root, 'propose', { paths: ['src/a.txt'] });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /REBASELINE_UNAPPROVED_DRIFT/);
});

test('content-only rebaseline rejects added paths', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'src', 'a.txt'), 'alpha changed\n');
  writeFileSync(join(root, 'src', 'new.txt'), 'not approved\n');
  const result = invoke(root, 'propose', { paths: ['src/a.txt'] });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /REBASELINE_PATH_DRIFT/);
});

test('content-only rebaseline rejects removed paths', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'src', 'a.txt'), 'alpha changed\n');
  rmSync(join(root, 'src', 'b.txt'));
  const result = invoke(root, 'propose', { paths: ['src/a.txt'] });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /REBASELINE_PATH_DRIFT/);
});

test('apply fails closed when source changes after proposal creation', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'src', 'a.txt'), 'alpha approved\n');
  const proposed = invoke(root, 'propose', { paths: ['src/a.txt'] });
  assert.equal(proposed.status, 0, proposed.stderr || proposed.stdout);
  const proposal = JSON.parse(readFileSync(join(root, '.agents', 'evidence', 'source-baseline', 'proposal.json')));
  writeFileSync(join(root, 'src', 'b.txt'), 'late drift\n');

  const applied = invoke(root, 'apply', { subject: proposal.subjectSha256 });
  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr, /REBASELINE_UNAPPROVED_DRIFT/);
  const manifest = JSON.parse(readFileSync(join(root, 'context', 'scaffold-manifest.json')));
  assert.equal(manifest.fidelity.source.contentFingerprints['src/a.txt'], fingerprintText('alpha\n'));
});

test('apply rejects the wrong subject hash without changing the manifest', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'src', 'a.txt'), 'alpha approved\n');
  const proposed = invoke(root, 'propose', { paths: ['src/a.txt'] });
  assert.equal(proposed.status, 0, proposed.stderr || proposed.stdout);
  const manifestPath = join(root, 'context', 'scaffold-manifest.json');
  const before = readFileSync(manifestPath, 'utf8');
  const applied = invoke(root, 'apply', { subject: '0'.repeat(64) });
  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr, /REBASELINE_SUBJECT_MISMATCH/);
  assert.equal(readFileSync(manifestPath, 'utf8'), before);
});

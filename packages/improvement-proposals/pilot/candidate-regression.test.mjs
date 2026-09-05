import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fingerprint } from '@specdd/benchmarks';
import { assertProposal, analyzeHistory, assessProposal, reviewState, preparePullRequest } from './candidate/index.js';

const read = path => JSON.parse(readFileSync(new URL(path, new URL('../test/proposals.test.mjs', import.meta.url)), 'utf8'));
const sourcePlan = read('../../benchmarks/examples/local/plan.json');
const sourceDataset = read('../../benchmarks/examples/local/dataset.json');
function fixture() {
  const plan = structuredClone(sourcePlan), dataset = structuredClone(sourceDataset);
  // Explicitly synthetic candidate timing; never a real performance claim.
  for (const sample of dataset.samples.filter(s => s.configurationRef === 'serial')) {
    const start = sample.events.find(e => e.event === 'eval.started');
    const end = sample.events.find(e => e.event === 'eval.completed');
    end.timestamp = new Date(Date.parse(start.timestamp) + 1).toISOString();
    end.data.result.observedAt = end.timestamp;
  }
  const proposal = { kind: 'SpecDDImprovementProposal', schemaVersion: '1.0.0', id: 'synthetic-review', title: 'Synthetic test only',
    target: { path: 'scripts/example.mjs', beforeSha256: 'a'.repeat(64) }, hypothesis: 'Bounded latency improvement', change: 'Review runner profile', risks: 'Unknown generalization', rollback: 'Restore previous profile',
    source: { planSha256: fingerprint(sourcePlan), datasetSha256: fingerprint(sourceDataset) },
    benchmark: { planSha256: fingerprint(plan), candidateRef: 'serial' }, acceptance: [{ metric: 'latencyMs', direction: 'decrease', minimumDelta: 1 }] };
  return { proposal, sourcePlan: structuredClone(sourcePlan), sourceDataset: structuredClone(sourceDataset), plan, dataset };
}
function append(b, journal, action, extra = {}) {
  return [...journal, { kind: 'SpecDDImprovementReviewEvent', schemaVersion: '1.0.0', id: 'event-' + journal.length,
    timestamp: '2026-09-06T22:00:00.000Z', previousSha256: journal.length ? fingerprint(journal.at(-1)) : null,
    proposalSha256: fingerprint(b.proposal), assessmentSha256: fingerprint(assessProposal(b)), action,
    actorRef: 'synthetic-human', reason: 'Synthetic lifecycle test, not real approval', prUrl: null, mergedCommit: null, ...extra }];
}
const approved = b => append(b, append(b, [], 'requested'), 'approved');
test('actual source analysis preserves six passing observations and unknowns', () => {
  const a = analyzeHistory(sourcePlan, sourceDataset);
  assert.equal(a.expected, 6); assert.equal(a.observed, 6); assert.deepEqual(a.failedFinalEvals, []); assert.deepEqual(a.executionErrors, []);
});
test('actual serial profile does not meet latency improvement acceptance', () => {
  const b = fixture(); b.dataset = structuredClone(sourceDataset);
  assert.equal(assessProposal(b).eligibleForReview, false);
  assert.throws(() => reviewState(b, append(b, [], 'requested')), /Unqualified/);
});
test('synthetic passing candidate is reviewable but starts unapproved', () => {
  const b = fixture(); assert.equal(assessProposal(b).eligibleForReview, true); assert.equal(reviewState(b, []).state, 'draft');
  assert.throws(() => preparePullRequest(b, [], b.proposal.target.beforeSha256), /approval/);
});
test('synthetic approval prepares metadata without applying or creating PR', () => {
  const b = fixture(), original = fingerprint(b); const result = preparePullRequest(b, approved(b), b.proposal.target.beforeSha256);
  assert.equal(result.applied, false); assert.equal(result.createdPR, false); assert.equal(fingerprint(b), original);
});
test('synthetic adoption requires distinct PR and merge receipt', () => {
  const b = fixture(), j = approved(b), prUrl = 'https://example.org/org/repo/pull/12';
  assert.throws(() => reviewState(b, append(b, j, 'adopted', { prUrl, mergedCommit: 'b'.repeat(40) })), /transition/);
  const pr = append(b, j, 'pr-recorded', { prUrl });
  assert.throws(() => reviewState(b, append(b, pr, 'adopted', { prUrl })), /receipt/);
  assert.equal(reviewState(b, append(b, pr, 'adopted', { prUrl, mergedCommit: 'b'.repeat(40) })).state, 'adopted');
});
test('rejection is terminal and blocks handoff', () => {
  const b = fixture(), j = append(b, append(b, [], 'requested'), 'rejected');
  assert.equal(reviewState(b, j).state, 'rejected'); assert.throws(() => preparePullRequest(b, j, b.proposal.target.beforeSha256));
  assert.throws(() => reviewState(b, append(b, j, 'approved')), /transition/);
});
test('no approval without review request', () => { const b = fixture(); assert.throws(() => reviewState(b, append(b, [], 'approved')), /transition/); });
test('changed proposal invalidates prior approvals', () => { const b = fixture(), j = approved(b); b.proposal.change += ' modified'; assert.throws(() => reviewState(b, j), /stale/); });
test('changed candidate evidence invalidates prior approvals', () => {
  const b = fixture(), j = approved(b); b.dataset.samples[0].cost = { amount: 1, currency: 'USD', evidence: { sha256: 'c'.repeat(64), bytes: 1 } };
  assert.throws(() => reviewState(b, j), /stale/);
});
test('broken hash chain and duplicate IDs rejected', () => {
  const b = fixture(), j = approved(b); j[1].previousSha256 = 'c'.repeat(64); assert.throws(() => reviewState(b, j), /chain/);
  const k = approved(b); k[1].id = k[0].id; assert.throws(() => reviewState(b, k), /Duplicate/);
});
test('chronology and impossible dates rejected', () => {
  const b = fixture(), j = approved(b); j[1].timestamp = '2026-02-30T22:00:00.000Z'; assert.throws(() => reviewState(b, j), /chronology/);
});
test('target drift blocks handoff', () => { const b = fixture(); assert.throws(() => preparePullRequest(b, approved(b), 'b'.repeat(64)), /preimage/); });
test('unknown costs cannot satisfy acceptance', () => { const b = fixture(); b.proposal.acceptance = [{ metric: 'cost', direction: 'decrease', minimumDelta: 1 }]; assert.equal(assessProposal(b).eligibleForReview, false); });
test('missing repetitions block review', () => { const b = fixture(); b.dataset.samples.pop(); assert.equal(assessProposal(b).eligibleForReview, false); });
test('source fingerprints cannot be substituted', () => { const b = fixture(); b.proposal.source.datasetSha256 = 'c'.repeat(64); assert.throws(() => assessProposal(b), /Stale/); });
test('candidate baseline cannot masquerade as an improvement', () => { const b = fixture(); b.proposal.benchmark.candidateRef = b.plan.baselineRef; assert.throws(() => assessProposal(b), /non-baseline/); });
test('schema rejects extensions, duplicate metrics and unsafe target paths', () => {
  const b = fixture(); assert.throws(() => assertProposal({ ...b.proposal, approved: true }));
  for (const path of ['../x', '/x', 'C:/x', 'a\\b', '.git/config', 'aux.txt', 'a./b', 'a//b']) assert.throws(() => assertProposal({ ...b.proposal, target: { ...b.proposal.target, path } }));
  b.proposal.acceptance.push(b.proposal.acceptance[0]); assert.throws(() => assertProposal(b.proposal), /Duplicate/);
});
test('metric directions cannot reward worse latency', () => { const b = fixture(); b.proposal.acceptance[0].direction = 'increase'; assert.throws(() => assertProposal(b.proposal), /direction/); });
test('PR URLs are inert HTTPS references, receipts cannot appear early', () => {
  const b = fixture(); assert.throws(() => reviewState(b, append(b, approved(b), 'pr-recorded', { prUrl: 'http://example.org/pull/1' })), /PR reference/);
  assert.throws(() => reviewState(b, append(b, [], 'requested', { mergedCommit: 'a'.repeat(40) })), /merge receipt/);
});
test('candidate failed evals fail quality guard and analysis identifies failure', () => {
  const b = fixture(), s = b.dataset.samples.find(s => s.configurationRef === 'serial');
  const result = s.events.find(e => e.event === 'eval.completed').data.result;
  result.outcome = 'fail'; result.score = 0; result.label = 'failed';
  assert.equal(assessProposal(b).eligibleForReview, false);
  assert.equal(analyzeHistory(b.plan, b.dataset).failedFinalEvals.length, 1);
});
test('real CLI replay is read-only and exits 2 for unqualified evidence', () => {
  const files = ['../examples/serial-profile.proposal.json', '../../benchmarks/examples/local/plan.json', '../../benchmarks/examples/local/dataset.json', '../../benchmarks/examples/local/plan.json', '../../benchmarks/examples/local/dataset.json', '../examples/journal.json'].map(p => new URL(p, new URL('../test/proposals.test.mjs', import.meta.url)));
  const before = files.map(p => readFileSync(p));
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/inspect.mjs', new URL('../test/proposals.test.mjs', import.meta.url))), ...files.map(p => fileURLToPath(p))], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  assert.equal(result.status, 2, result.stderr);
  const output = JSON.parse(result.stdout); assert.equal(output.assessment.eligibleForReview, false); assert.equal(output.review.state, 'draft');
  files.forEach((p, i) => assert.deepEqual(readFileSync(p), before[i]));
});
test('changed baseline fails even with updated plan pins', () => {
  const b = fixture(); b.plan.baselineRef = 'serial'; b.dataset.planSha256 = fingerprint(b.plan); b.proposal.benchmark.planSha256 = fingerprint(b.plan);
  assert.throws(() => assessProposal(b), /baseline changed/);
});
test('execution errors remain unknown scores and block review', () => {
  const b = fixture(), s = b.dataset.samples.find(s => s.configurationRef === 'serial');
  const result = s.events.find(e => e.event === 'eval.completed').data.result;
  result.outcome = 'error'; result.score = null; result.label = null; result.error = 'Synthetic timeout';
  assert.equal(assessProposal(b).eligibleForReview, false); assert.equal(analyzeHistory(b.plan, b.dataset).executionErrors.length, 1);
});
test('strict review schema rejects fabricated authority and excessive journal', () => {
  const b = fixture(), j = approved(b); j[1].authenticated = true;
  assert.throws(() => reviewState(b, j), /Invalid review event/);
  assert.throws(() => reviewState(b, Array(1001).fill({})), /journal/);
});
test('adoption cannot point to a different PR', () => {
  const b = fixture(), j = append(b, approved(b), 'pr-recorded', { prUrl: 'https://example.org/a/b/pull/1' });
  assert.throws(() => reviewState(b, append(b, j, 'adopted', { prUrl: 'https://example.org/a/b/pull/2', mergedCommit: 'a'.repeat(40) })), /recorded PR/);
});
test('unqualified drafts can be explicitly rejected, never approved', () => {
  const b = fixture(); b.dataset = structuredClone(sourceDataset);
  assert.equal(reviewState(b, append(b, [], 'rejected')).state, 'rejected');
});
test('review cannot predate the evidence it claims to review', () => {
  const b = fixture(), j = append(b, [], 'requested', { timestamp: '2026-09-04T22:00:00.000Z' });
  assert.throws(() => reviewState(b, j), /chronology/);
});

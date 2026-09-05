import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessProposal as reference } from './baseline/index.js';

const profile = process.env.PILOT_PROFILE;
if (!['baseline', 'candidate'].includes(profile)) throw Error('Unknown fixed pilot profile');
const { assessProposal } = await import('./' + profile + '/index.js');
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const plan = read('../../benchmarks/examples/local/plan.json');
const dataset = read('../../benchmarks/examples/local/dataset.json');
const proposal = read('../examples/serial-profile.proposal.json');
const bundle = { proposal, sourcePlan: plan, sourceDataset: dataset, plan, dataset };
const expected = reference(bundle);
test('30 assessments exactly preserve actual baseline outputs and input content', () => {
  const before = JSON.stringify(bundle);
  for (let i = 0; i < 30; i++) assert.deepEqual(assessProposal(bundle), expected);
  assert.equal(JSON.stringify(bundle), before);
});

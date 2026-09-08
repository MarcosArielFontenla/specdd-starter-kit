// Local synthetic example. Reads checked-in fixtures; writes nothing and calls no agent.
import {readFile} from 'node:fs/promises';
import {createBAImpactAnalysis, assertBAImpactBasis} from '../dist/ba.js';
const load = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const graph = await load('./graph.json');
const context = {
  project: await load('../../project-model/examples/minimal.project.json'),
  artifacts: await Promise.all(['requirement', 'question', 'decision'].map(n => load(`./${n}.json`))),
};
const impact = await createBAImpactAnalysis({targetId: 'question-deadline', graph, context},
  {id: 'impact-example', title: 'Synthetic impact of the unresolved question', at: '2026-09-07T12:00:30.000Z'});
await assertBAImpactBasis(impact, graph, context);
console.log(JSON.stringify(impact, null, 2));

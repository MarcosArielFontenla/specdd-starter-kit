import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepsFor, errorFor, TOOLS, OWASP_CONTROLS, MAX_DOMAINS } from './steps.js';

const valid = {
  project: { name: 'Acme', description: 'desc', problem: '' },
  stack: { frontend: 'React' },
  domains: ['auth'], entities: [], features: [],
  tools: ['GitHub Copilot'],
};

test('greenfield step list', () => {
  assert.deepEqual(stepsFor('greenfield'), [
    'Welcome', 'Scenario', 'Project', 'Tech Stack', 'Domains & Entities', 'Features',
    'Principles', 'MCP Tools', 'Agents & Tools', 'Security', 'Preview / Download',
  ]);
});

test('validation by step name', () => {
  assert.equal(errorFor('Project', valid), '');
  assert.match(errorFor('Project', { ...valid, project: { name: '', description: 'd' } }), /name/i);
  assert.match(errorFor('Tech Stack', { ...valid, stack: { frontend: '' } }), /Frontend/);
  assert.match(errorFor('Domains & Entities', { ...valid, domains: [] }), /at least one domain/i);
  assert.match(errorFor('Domains & Entities', { ...valid, domains: Array.from({ length: MAX_DOMAINS + 1 }, (_, i) => `d${i}`) }), /at most/i);
  assert.match(errorFor('Agents & Tools', { ...valid, tools: [] }), /at least one tool/i);
  assert.equal(errorFor('Welcome', valid), '');
});

test('constants', () => {
  assert.equal(TOOLS.length, 5);
  assert.equal(OWASP_CONTROLS.length, 10);
});

test('brownfield step list inserts Ingest & Analyze after Scenario', () => {
  assert.deepEqual(stepsFor('brownfield'), [
    'Welcome', 'Scenario', 'Ingest & Analyze', 'Project', 'Tech Stack',
    'Domains & Entities', 'Features', 'Principles', 'MCP Tools', 'Agents & Tools',
    'Security', 'Preview / Download',
  ]);
  assert.equal(stepsFor('greenfield').length, 11); // unchanged
});

test('ingest step requires a completed analysis', () => {
  assert.match(errorFor('Ingest & Analyze', { ...valid, analysis: null }), /folder/i);
  assert.equal(errorFor('Ingest & Analyze', { ...valid, analysis: { fileCount: 3 } }), '');
});

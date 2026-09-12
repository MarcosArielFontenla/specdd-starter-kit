import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const requirements = [
  ['unit command', /`npm run test:unit --workspaces --if-present`/],
  ['build command', /`npm run build --workspaces --if-present`/],
  ['preparation command', /`node --test scripts\/phase5\/prepare\.test\.mjs`/],
  ['purposes and expected outcomes', /\| Command \| Purpose \| Expected result \|/],
  ['no Warp requirement', /No Warp account or credits are required\./],
  ['live completion distinction', /Green local tests do not prove a completed live Phase 5 run\./],
  ['human checkpoint', /Human approval/],
  ['rejection stops development', /rejection[\s\S]*?stops development/],
  ['independent reviewer', /Independent review/],
  ['canonical evaluator', /Canonical eval/],
  ['failed evaluation stops publication', /Missing or failed eval\s+evidence stops PR creation\./],
  ['actual draft pull request', /Actual draft PR/],
  ['no merge or deployment', /no merge and no deployment/],
  ['missing preparation prerequisite', /if it is missing, that check is unavailable, not passing\./],
];

function missingRequirements(document) {
  return requirements.filter(([, pattern]) => !pattern.test(document)).map(([name]) => name);
}

const guide = await readFile(new URL('../../docs/control-plane/local-validation.md', import.meta.url), 'utf8');

test('guide satisfies the approved mechanical documentation criteria', () => {
  assert.deepEqual(missingRequirements(guide), []);
  const rows = guide.split('\n').filter(line => line.startsWith('| `'));
  assert.equal(rows.length, 3);
  for (const row of rows) {
    const [, command, purpose, expected] = row.split('|');
    assert.ok(command.trim());
    assert.ok(purpose.trim().length > 20);
    assert.match(expected, /Exit 0/);
  }
});

test('intentionally incomplete in-memory guide is rejected', () => {
  assert.ok(missingRequirements('# Local checks\nEverything passed.').length > 0);
});

for (const [name, pattern] of requirements) {
  test(`removing ${name} is detected`, () => {
    assert.ok(missingRequirements(guide.replace(pattern, '')).includes(name));
  });
}

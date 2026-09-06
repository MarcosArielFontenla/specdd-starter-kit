import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const validatorPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.agents', 'scripts', 'validate-project.ps1');
const harnessValidatorPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.agents', 'scripts', 'validate-harness.ps1');

test('project validator uses the canonical definition and separates extraction from readiness', async () => {
  const source = await readFile(validatorPath, 'utf8');
  assert.match(source, /ProjectDefinitionPath = "context\/project-definition\.json"/);
  assert.match(source, /Definition\.project\.contextReview\.findings/);
  assert.match(source, /extractionStatus/);
  assert.match(source, /projectReadinessStatus/);
  assert.match(source, /"out-tsc"/);
  const harnessSource = await readFile(harnessValidatorPath, 'utf8');
  assert.match(harnessSource, /converge-contracts\.ps1/);
});

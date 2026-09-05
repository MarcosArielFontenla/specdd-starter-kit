// Explicit host wrapper; execute only a human-approved Node test file. Not a sandbox.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertEval, localResult } from '../dist/index.js';
const [definitionPath, testPath, inputRef, runId, passLabel, failLabel] = process.argv.slice(2);
if (![definitionPath, testPath, inputRef, runId, passLabel, failLabel].every(Boolean)) throw new Error('Usage: run-local.mjs definition.json approved-test.mjs input-ref run-id pass-label fail-label');
const definition = JSON.parse(readFileSync(definitionPath, 'utf8'));
assertEval(definition);
// Validate bindings/context before executing anything.
const context = { runId, inputRef, observedAt: new Date().toISOString() };
const binding = { passLabel, failLabel };
localResult(definition, context, { exitCode: null, signal: null, timedOut: false, launchError: 'preflight', stdout: '', stderr: '' }, binding);
// A wrapper invoked inside node:test must start a new test runner, not inherit
// the parent's internal child-test context (which can silently skip nested tests).
const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;
const child = spawnSync(process.execPath, ['--test', resolve(testPath)], { shell: false, env: childEnv, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true });
const result = localResult(definition, { ...context, observedAt: new Date().toISOString() }, {
  exitCode: child.status, signal: child.signal, timedOut: child.error?.code === 'ETIMEDOUT',
  launchError: child.error?.message ?? null, stdout: child.stdout ?? '', stderr: child.stderr ?? '',
}, binding);
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.outcome === 'pass' ? 0 : 1;

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { startRehearsal, inspectRehearsal } from './rehearsal.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const [command, runId, ...extra] = process.argv.slice(2);
try {
  if (!['start', 'status'].includes(command) || !runId || extra.length) {
    throw new Error('Usage: rehearse <start|status> <run-id>. No promotion command is enabled.');
  }
  const parent = resolve(root, '.specdd-delivery');
  console.log(JSON.stringify(await (command === 'start' ? startRehearsal(parent, runId) : inspectRehearsal(parent, runId)), null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readBoundedFile } from '@specdd/run-history/store';
import { promoteRehearsal, inspectPromotion } from './promotion.mjs';

const parent = fileURLToPath(new URL('../../../.specdd-delivery/', import.meta.url));
const [command, runId, ...extra] = process.argv.slice(2);
try {
  if (!['start', 'status'].includes(command) || !runId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(runId) || runId.length > 60 || extra.length) throw new Error('Usage: node packages/delivery-model/scripts/promote.mjs <start|status> <run-id>');
  const result = command === 'status' ? await inspectPromotion(parent, runId)
    : await promoteRehearsal(parent, runId, JSON.parse(await readBoundedFile(join(parent, runId, 'approval.json'))));
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'success') process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }

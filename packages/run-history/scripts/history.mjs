import { readRun, listRuns } from '../dist/store.js';
import { summarizeRun } from '../dist/index.js';

const [command, directory, runId, ...extra] = process.argv.slice(2);
if (!directory || extra.length || !['list', 'show'].includes(command) || (command === 'show' ? !runId : runId !== undefined)) {
  throw new Error('Usage: history.mjs list directory | show directory run-id');
}
// Read-only: never imports, prunes or executes artifact paths.
const result = command === 'list' ? await listRuns(directory) : { summary: summarizeRun(await readRun(directory, runId)), events: await readRun(directory, runId) };
console.log(JSON.stringify(result, null, 2));

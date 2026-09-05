import { readBoundedFile } from '@specdd/run-history/store';
import { compareBenchmark } from '../dist/index.js';
const [planPath, datasetPath, ...extra] = process.argv.slice(2);
if (!planPath || !datasetPath || extra.length) throw new Error('Usage: compare.mjs plan.json dataset.json');
// Reads data only. No command, URL, artifact path or template in the plan is executed.
const report = compareBenchmark(JSON.parse(await readBoundedFile(planPath)), JSON.parse(await readBoundedFile(datasetPath)));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.status === 'complete' ? 0 : 2;

import { readBoundedFile } from '@specdd/run-history/store';
import { assessProposal, reviewState } from '../dist/index.js';

try {
  if (process.argv.length !== 7 && process.argv.length !== 8) throw new Error('Usage: node inspect.mjs proposal.json source-plan.json source-dataset.json candidate-plan.json candidate-dataset.json [journal.json]');
  const values = await Promise.all(process.argv.slice(2).map(async path => JSON.parse(await readBoundedFile(path))));
  const [proposal, sourcePlan, sourceDataset, plan, dataset, journal = []] = values;
  const bundle = { proposal, sourcePlan, sourceDataset, plan, dataset };
  const assessment = assessProposal(bundle);
  console.log(JSON.stringify({ assessment, review: reviewState(bundle, journal) }, null, 2));
  process.exitCode = assessment.eligibleForReview ? 0 : 2;
} catch (error) {
  console.error(error.message); process.exitCode = 1;
}

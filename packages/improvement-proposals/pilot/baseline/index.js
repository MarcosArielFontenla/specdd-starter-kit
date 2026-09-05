import { structuralValidator } from '@specdd/project-model';
import { compareBenchmark, fingerprint } from '@specdd/benchmarks';
import schema from '../../schema/proposal.schema.json' with { type: 'json' };
const structure = structuralValidator(schema);
function bounded(value) {
    if (Buffer.byteLength(JSON.stringify(value)) > 24 * 1024 * 1024)
        throw new Error('Artifact exceeds 24 MiB');
}
export function assertProposal(value) {
    bounded(value);
    if (structure(value).length)
        throw new Error('Invalid proposal schema');
    const p = value;
    // Portable repository paths only; no shell, absolute, traversal or Windows aliases.
    if (!p.target.path.split('/').every(s => /^[a-zA-Z0-9_.-]+$/.test(s) && s !== '.' && s !== '..' && !s.endsWith('.') && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s)) || p.target.path.split('/').some(s => ['.git', '.codex'].includes(s.toLowerCase())))
        throw new Error('Unsafe target path');
    if (new Set(p.acceptance.map(a => a.metric)).size !== p.acceptance.length)
        throw new Error('Duplicate acceptance metric');
    for (const a of p.acceptance) {
        if (!Number.isFinite(a.minimumDelta) || a.direction !== (['score', 'passed'].includes(a.metric) ? 'increase' : 'decrease'))
            throw new Error('Invalid metric direction or threshold');
    }
}
/** Observations only: failed final evals are not root-cause diagnoses. */
export function analyzeHistory(plan, dataset) {
    const report = compareBenchmark(plan, dataset);
    return { planSha256: report.planSha256, datasetSha256: report.datasetSha256,
        expected: report.groups.reduce((n, g) => n + g.metrics.passed.expected, 0),
        observed: report.samples.length,
        failedFinalEvals: report.samples.filter(s => s.passed === 0 && s.executionError === 0).map(s => s.runId),
        executionErrors: report.samples.filter(s => s.executionError === 1).map(s => s.runId),
        incompleteRuns: report.samples.filter(s => s.status === 'incomplete').map(s => s.runId),
        retriedRuns: report.samples.filter(s => s.retries !== null && s.retries > 0).map(s => s.runId),
        missing: report.groups.map(g => ({ configurationRef: g.configurationRef, repetitions: g.missingRepetitions })),
        limits: report.limits };
}
/** Always recomputes evidence; a supplied report or approval flag is never trusted. */
export function assessProposal(bundle) {
    bounded(bundle);
    assertProposal(bundle.proposal);
    const p = bundle.proposal;
    const source = compareBenchmark(bundle.sourcePlan, bundle.sourceDataset);
    const report = compareBenchmark(bundle.plan, bundle.dataset);
    if (p.source.planSha256 !== source.planSha256 || p.source.datasetSha256 !== source.datasetSha256 || p.benchmark.planSha256 !== report.planSha256)
        throw new Error('Stale or unrelated proposal evidence');
    const before = bundle.sourcePlan, after = bundle.plan;
    const baseline = (plan) => plan.configurations.find(c => c.id === plan.baselineRef);
    if (fingerprint(before.task) !== fingerprint(after.task) || fingerprint(before.eval) !== fingerprint(after.eval) || before.workflowRef !== after.workflowRef || fingerprint(baseline(before)) !== fingerprint(baseline(after)))
        throw new Error('Task, evaluator or baseline changed');
    const comparison = report.comparisons.find(c => c.candidateRef === p.benchmark.candidateRef);
    if (!comparison)
        throw new Error('Candidate must be a non-baseline configuration');
    const candidate = report.groups.find(g => g.configurationRef === p.benchmark.candidateRef);
    const reasons = [];
    if (source.status !== 'complete' || report.status !== 'complete')
        reasons.push('Incomplete source or candidate measurements');
    for (const metric of ['score', 'passed', 'executionError']) {
        const m = comparison.metrics[metric];
        if (!m.comparable || m.deltaMean === null || (metric === 'executionError' ? m.deltaMean > 0 : m.deltaMean < 0))
            reasons.push('Unknown or regressed quality: ' + metric);
    }
    if (candidate.metrics.passed.mean !== 1 || candidate.metrics.executionError.mean !== 0)
        reasons.push('Candidate has failed or errored evals');
    for (const rule of p.acceptance) {
        const m = comparison.metrics[rule.metric];
        const gain = m.deltaMean === null ? null : m.deltaMean * (rule.direction === 'increase' ? 1 : -1);
        if (!m.comparable || gain === null || gain < rule.minimumDelta)
            reasons.push('Acceptance not met: ' + rule.metric);
    }
    return { kind: 'SpecDDImprovementAssessment', schemaVersion: '1.0.0',
        proposalSha256: fingerprint(p), source: analyzeHistory(bundle.sourcePlan, bundle.sourceDataset),
        planSha256: report.planSha256, datasetSha256: report.datasetSha256,
        reportSha256: fingerprint(report), eligibleForReview: !reasons.length, reasons,
        comparison, limits: [...report.limits, 'Target/change relevance requires human review; hashes do not prove that a described patch produced these runs'] };
}
const textField = { type: 'string', minLength: 1, maxLength: 4000 };
const hashField = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const fields = { kind: { const: 'SpecDDImprovementReviewEvent' }, schemaVersion: { const: '1.0.0' },
    id: textField, timestamp: textField, previousSha256: { anyOf: [hashField, { type: 'null' }] },
    proposalSha256: hashField, assessmentSha256: hashField,
    action: { enum: ['requested', 'approved', 'rejected', 'pr-recorded', 'adopted'] },
    actorRef: textField, reason: textField, prUrl: { anyOf: [textField, { type: 'null' }] },
    mergedCommit: { anyOf: [{ type: 'string', pattern: '^(?:[a-f0-9]{40}|[a-f0-9]{64})$' }, { type: 'null' }] } };
export const reviewEventSchema = { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', additionalProperties: false, required: Object.keys(fields), properties: fields };
const eventStructure = structuralValidator(reviewEventSchema);
/** Hash linkage is local audit integrity, not authenticated human authorization. */
export function reviewState(bundle, journal) {
    const assessment = assessProposal(bundle);
    bounded(journal);
    if (!Array.isArray(journal) || journal.length > 1000)
        throw new Error('Invalid review journal');
    let state = 'draft';
    let previous = null;
    let time = -Infinity;
    let prUrl = null;
    for (const dataset of [bundle.sourceDataset, bundle.dataset]) {
        for (const sample of dataset.samples)
            for (const event of sample.events)
                time = Math.max(time, Date.parse(event.timestamp));
    }
    const ids = new Set();
    for (const raw of journal) {
        if (eventStructure(raw).length)
            throw new Error('Invalid review event');
        const e = raw;
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(e.timestamp) || !Number.isFinite(Date.parse(e.timestamp)) || new Date(e.timestamp).toISOString() !== e.timestamp || Date.parse(e.timestamp) < time)
            throw new Error('Invalid review chronology');
        if (ids.has(e.id) || e.previousSha256 !== previous || e.proposalSha256 !== assessment.proposalSha256 || e.assessmentSha256 !== fingerprint(assessment))
            throw new Error('Duplicate, stale or broken review chain');
        const next = { draft: ['requested', 'rejected'], requested: ['approved', 'rejected'], approved: ['pr-recorded', 'rejected'], 'pr-recorded': ['adopted', 'rejected'], rejected: [], adopted: [] };
        if (!next[state].includes(e.action))
            throw new Error('Invalid review transition');
        if (e.action !== 'rejected' && !assessment.eligibleForReview)
            throw new Error('Unqualified evidence cannot enter review');
        if (e.action === 'pr-recorded' || e.action === 'adopted') {
            const url = new URL(e.prUrl ?? '');
            if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search || !url.pathname.split('/').includes('pull') || !/\/pull\/[1-9]\d*$/.test(url.pathname))
                throw new Error('Invalid PR reference');
            if (e.action === 'adopted' && (e.prUrl !== prUrl || !e.mergedCommit))
                throw new Error('Adoption requires recorded PR and merge receipt');
            prUrl = e.prUrl;
        }
        else if (e.prUrl !== null)
            throw new Error('Unexpected PR reference');
        if (e.action !== 'adopted' && e.mergedCommit !== null)
            throw new Error('Unexpected merge receipt');
        ids.add(e.id);
        previous = fingerprint(e);
        time = Date.parse(e.timestamp);
        state = e.action;
    }
    return { state, headSha256: previous, prUrl, assessmentSha256: fingerprint(assessment), actorAuthentication: 'unverified-local-attestation' };
}
export function preparePullRequest(bundle, journal, observedTargetSha256) {
    const state = reviewState(bundle, journal);
    assertProposal(bundle.proposal);
    const p = bundle.proposal;
    if (state.state !== 'approved')
        throw new Error('Matching human approval required');
    if (observedTargetSha256 !== p.target.beforeSha256)
        throw new Error('Target preimage changed');
    return { kind: 'SpecDDImprovementPRHandoff', schemaVersion: '1.0.0', draft: true,
        title: p.title, proposalSha256: fingerprint(p), reviewHeadSha256: state.headSha256,
        assessmentSha256: state.assessmentSha256, target: structuredClone(p.target),
        body: [p.hypothesis, p.change, 'Risks: ' + p.risks, 'Rollback: ' + p.rollback].join('\n\n'),
        applied: false, createdPR: false,
        requirements: ['Authenticate reviewer outside this local library', 'Review target/change relevance and actual diff', 'Recheck target preimage before applying', 'Create PR only with explicit user authority; no merge or deployment implied'] };
}

export const REVIEW_STATUSES = Object.freeze([
  Object.freeze({ id: 'implemented', label: 'Implemented' }),
  Object.freeze({ id: 'architectural', label: 'Architectural base' }),
  Object.freeze({ id: 'planned', label: 'Planned' }),
  Object.freeze({ id: 'unknown', label: 'Unknown / verify' }),
]);

export const REVIEW_GROUPS = Object.freeze(['stack', 'domains', 'entities', 'features', 'architecture']);

const DEFAULT_REVIEW_STATUS = Object.freeze({
  stack: 'implemented',
  domains: 'implemented',
  entities: 'implemented',
  features: 'implemented',
  architecture: 'architectural',
});

const STACK_FIELDS = [
  ['languages', 'Languages'],
  ['frontend', 'Frontend'],
  ['backend', 'Backend'],
  ['testing', 'Testing'],
  ['database', 'Database'],
  ['infra', 'Infrastructure'],
];

const evidenceFor = (analysis, category, value) => {
  const match = analysis.semantic?.evidence?.find((item) => item.category === category && item.value === value);
  return match
    ? { source: match.source, confidence: match.confidence }
    : { source: category === 'stack' ? 'Structural manifest detection' : 'Folder structure detection', confidence: 'medium' };
};

const reviewItem = (analysis, category, value) => ({
  value,
  selected: true,
  status: 'unknown',
  ...evidenceFor(analysis, category, value),
});

export function createContextReview(analysis) {
  const stack = STACK_FIELDS.flatMap(([field, label]) => {
    const values = field === 'languages' ? (analysis.stack?.languages || []) : [analysis.stack?.[field] || ''];
    return values.filter(Boolean).map((value) => ({ field, label, value, selected: true, status: 'unknown', ...evidenceFor(analysis, 'stack', value) }));
  });
  return {
    approved: false,
    stack,
    domains: (analysis.domains || []).map((value) => reviewItem(analysis, 'domain', value)),
    entities: (analysis.entities || []).map((value) => reviewItem(analysis, 'entity', value)),
    features: (analysis.features || []).map((value) => reviewItem(analysis, 'feature', value)),
    architecture: (analysis.semantic?.architecture || []).map((item) => ({
      ...reviewItem(analysis, 'architecture', item.value),
      source: item.source,
      confidence: item.confidence,
    })),
    projectChecks: (analysis.projectChecks || []).map((check) => ({ ...check, selected: false })),
  };
}

export function selectedUnknownCount(review) {
  return REVIEW_GROUPS.reduce((count, group) => count + (review?.[group] || [])
    .filter((item) => item.selected && item.status === 'unknown').length, 0);
}

export function classifySelectedContext(review) {
  return {
    ...review,
    approved: false,
    ...Object.fromEntries(REVIEW_GROUPS.map((group) => [group, (review[group] || []).map((item) => (
      item.selected && item.status === 'unknown' ? { ...item, status: DEFAULT_REVIEW_STATUS[group] } : item
    ))])),
  };
}

const selectedValues = (items) => (items || [])
  .filter((item) => item.selected && item.value.trim())
  .map((item) => item.value.trim());

export function applyReviewedContext(data, review) {
  const reviewedStack = { ...data.stack };
  const reviewedLanguages = (review.stack || []).filter((item) => item.field === 'languages');
  for (const item of review.stack || []) {
    if (item.field && item.field !== 'languages') reviewedStack[item.field] = item.selected ? item.value.trim() : '';
  }
  if (reviewedLanguages.length) reviewedStack.languages = selectedValues(reviewedLanguages);
  return {
    ...data,
    contextReview: { ...review, approved: true },
    stack: { ...data.stack, ...reviewedStack },
    domains: selectedValues(review.domains),
    entities: selectedValues(review.entities),
    features: selectedValues(review.features),
    architecture: selectedValues(review.architecture),
    projectChecks: (review.projectChecks || []).filter((check) => check.selected),
  };
}

export function reviewStatusLabel(status) {
  return REVIEW_STATUSES.find((item) => item.id === status)?.label || 'Unknown / verify';
}

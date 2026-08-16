// Brownfield analysis depth is explicit so the product can evolve without
// overstating what the current local analyzer actually does.

export const ANALYSIS_DEPTHS = Object.freeze({
  STRUCTURAL: 'structural',
  SEMANTIC: 'semantic',
});

export const DEFAULT_ANALYSIS_DEPTH = ANALYSIS_DEPTHS.STRUCTURAL;

export const ANALYSIS_LEVELS = Object.freeze([
  Object.freeze({
    id: ANALYSIS_DEPTHS.STRUCTURAL,
    number: 1,
    title: 'Structural bootstrap',
    description: 'Reads known manifests and file paths only; source code is not inspected.',
    available: true,
  }),
  Object.freeze({
    id: ANALYSIS_DEPTHS.SEMANTIC,
    number: 2,
    title: 'Assisted semantic analysis',
    description: 'Opt-in local analysis of safe docs, manifests, models, routes and tests with evidence.',
    available: true,
  }),
]);

export function getAnalysisLevel(depth = DEFAULT_ANALYSIS_DEPTH) {
  return ANALYSIS_LEVELS.find((level) => level.id === depth) || ANALYSIS_LEVELS[0];
}

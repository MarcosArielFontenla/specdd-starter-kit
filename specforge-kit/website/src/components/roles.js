// Role model for SpecForge Role Packs. Pure — no React imports.

export const ROLES = ['BA', 'QA', 'Dev', 'UX'];

export const TOOLS = ['GitHub Copilot', 'Claude Code', 'Cursor', 'Codex', 'Gemini'];

// Every kit skill belongs to exactly one role (enforced by test against skills/).
export const ROLE_SKILLS = {
  BA: ['specforge-ba', 'story-writing', 'acceptance-criteria', 'story-splitting',
    'requirements-traceability', 'context-analysis', 'miro-collaboration', 'documentation'],
  QA: ['specforge-qa', 'test-case-generation', 'ac-validation', 'gherkin-automation',
    'playwright-testing', 'regression-testing', 'bug-reporting', 'qa-evals',
    'qa-guardrails', 'testing'],
  Dev: ['specforge-dev', 'story-to-code', 'component-creation', 'api-endpoint',
    'state-management', 'error-handling', 'refactoring', 'performance-optimization',
    'code-review', 'pr-creation', 'accessibility'],
  UX: ['specforge-ux', 'ux-flow-designer', 'ux-copywriter', 'ux-design-system-enforcer',
    'ux-prototype', 'ux-stage-generator', 'figma-design-context'],
};

export const ROLE_META = {
  BA: {
    title: 'Business Analyst',
    scope: 'Requirements discovery, user stories, acceptance criteria and traceability for this project.',
    must: [
      'Write stories with testable acceptance criteria',
      'Keep every requirement traceable to a spec in .agents/specs/',
      'Ask the human when intent is ambiguous — never assume',
    ],
    never: [
      'Invent requirements or scope not confirmed by the human',
      'Produce implementation code or visual designs',
    ],
    verification: 'Stories reviewed through the spec-first pipeline (specify -> clarify) before implementation starts.',
  },
  QA: {
    title: 'Quality Analyst',
    scope: 'Test design, validation, defect reporting and regression coverage.',
    must: [
      'Derive test cases from acceptance criteria, not from the implementation',
      'Report defects with reproduction steps and expected vs actual behavior',
      'Keep executable checks aligned with each spec acceptance check',
    ],
    never: [
      'Mark work done without running its acceptance checks',
      'Fabricate test results or coverage claims',
    ],
    verification: 'Test suites pass and map one-to-one to spec acceptance checks.',
  },
  Dev: {
    title: 'Developer',
    scope: 'Implementation of specified features, code review and pull requests.',
    must: [
      'Implement only what an approved spec or tasks file covers',
      'Write tests before or alongside the code they verify',
      'Keep every change traceable to its tasks file',
    ],
    never: [
      'Start a spec-first feature without a human-approved tasks file',
      'Commit secrets or credentials',
    ],
    verification: 'Done-gate: the entity spec validator passes for every touched entity.',
  },
  UX: {
    title: 'UX Designer',
    scope: 'User flows, screen specifications, product copy and design-system adherence.',
    must: [
      'Follow the project design system tokens and components',
      'Specify flows and screens traceably to their stories',
      'Check accessibility basics on every screen spec',
    ],
    never: [
      'Introduce off-system styles or components',
      'Finalize copy that contradicts an approved spec',
    ],
    verification: 'Screen specs reviewed against the design system and the feature spec.',
  },
};

const ROLE_COMMANDS = {
  BA: ['specforge-requirements', 'specforge-stories', 'specforge-new-feature', 'specforge-reset-feature'],
  QA: ['specforge-testcases', 'specforge-validate'],
  Dev: ['specforge-implement', 'specforge-review', 'specforge-createpr'],
  UX: ['specforge-uxflow', 'specforge-screenspec', 'specforge-copy'],
};

export const roleSlug = (role) => `role-${role.toLowerCase()}`;

export function commandsFor(role, input) {
  const base = [...(ROLE_COMMANDS[role] || [])];
  if (role === 'QA' && input?.qa?.approach && input.qa.approach !== 'manual') base.push('specforge-playwright');
  if (role === 'UX' && input?.ux?.figmaEnabled) base.push('specforge-setupfigmamcp');
  return base;
}

export function stepsFor(data) {
  const steps = ['Welcome', 'Target Project', 'Roles'];
  if ((data.roles || []).some((r) => r === 'QA' || r === 'UX')) steps.push('Role Options');
  steps.push('Skills', 'Tools', 'Preview / Download');
  return steps;
}

export function errorFor(stepName, data) {
  if (stepName === 'Roles' && (data.roles || []).length === 0) {
    return 'Select at least one role — the pack is built from them.';
  }
  if (stepName === 'Tools' && (data.tools || []).length === 0) {
    return 'Select at least one tool your team uses.';
  }
  return '';
}

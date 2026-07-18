// Pure generators — no imports of kit-files.json (passed in as `baseFiles`).

const MCP_SERVERS = {
  github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], env: { GITHUB_PERSONAL_ACCESS_TOKEN: '${input:github_pat}' } },
  sonarqube: { command: 'npx', args: ['-y', 'sonarqube-mcp-server'], env: { SONAR_TOKEN: '${input:sonar_token}', SONAR_HOST_URL: '${input:sonar_host}' } },
  context7: { command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
  postgresql: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres', '${input:pg_connection_string}'] },
  playwright: { command: 'npx', args: ['-y', '@playwright/mcp'] },
  figma: { command: 'npx', args: ['-y', 'figma-developer-mcp', '--stdio'], env: { FIGMA_API_KEY: '${input:figma_key}' } },
};

export function renderMcpJson(mcp) {
  const servers = {};
  for (const key of mcp) if (MCP_SERVERS[key]) servers[key] = MCP_SERVERS[key];
  return JSON.stringify({ servers }, null, 2);
}

export function renderProject(input) {
  const p = input.project;
  return `# Project: ${p.name}

## Description
${p.description}

## Problem statement
${p.problem}

## Personas
${(input.personas || []).map((x) => `- ${x}`).join('\n')}

## Outcomes
- **User:** ${input.outcomes?.user || ''}
- **Business:** ${input.outcomes?.business || ''}

## Constraints
- **Business:** ${input.constraints?.business || ''}
- **Technical:** ${input.constraints?.technical || ''}
`;
}

export function renderTechStack(input) {
  const s = input.stack || {};
  return `# Tech Stack

- **Languages:** ${(s.languages || []).join(', ')}
- **Frontend:** ${s.frontend || ''}
- **Backend:** ${s.backend || ''}
- **Testing:** ${s.testing || ''}
- **Database:** ${s.database || ''}
- **Infrastructure:** ${s.infra || ''}
- **Swagger/OpenAPI:** ${s.swagger ? 'yes' : 'no'}
- **WCAG/a11y:** ${s.a11y ? 'yes' : 'no'}
`;
}

export function renderConstitution(input) {
  return `# Project Constitution

> Specifications are the source of truth. Code is the output.

## SDD flow
constitution → specify → plan → tasks → implement

## Principles
${(input.principles || []).map((x, i) => `${i + 1}. ${x}`).join('\n')}

## Data classification
${input.security?.classification || 'internal'}

## Security
OWASP focus: ${(input.security?.owaspControls || []).join(', ') || 'baseline'}
`;
}

export function generateFiles(baseFiles, input, today = new Date().toISOString().slice(0, 10)) {
  const tools = input.tools || [];
  const hasCopilot = tools.includes('GitHub Copilot');

  const out = {};
  for (const [path, contents] of Object.entries(baseFiles)) {
    if (!hasCopilot && path.startsWith('.github/')) continue; // Copilot projection is opt-in
    if (input.scenario !== 'brownfield' && path === '.agents/workflows/spec-converge.md') continue; // converge is brownfield-only
    out[path] = contents;
  }

  out['context/project.md'] = renderProject(input);
  out['context/tech-stack.md'] = renderTechStack(input);
  out['context/constitution.md'] = renderConstitution(input);

  out['AGENTS.md'] = renderPrimer(input, today);
  out['.agents/REGISTRY.md'] = renderRegistry(input, today);
  out['.agents/orchestration/ROUTING.md'] = renderRouting(input);
  out['.agents/cold-start/budget-manifest.yaml'] = renderBudgetManifest(input);
  for (const domain of input.domains || []) {
    out[`.agents/skills/${slugify(domain)}/SKILL.md`] = renderSkillSkeleton(domain);
    out[`.agents/evals/rubrics/${slugify(domain)}.yaml`] = renderRubric(domain);
  }
  for (const entity of input.entities || []) {
    out[`.agents/specs/${slugify(entity)}.spec.yaml`] = renderSpecYaml(entity);
  }
  for (const tool of tools) {
    const adapter = renderAdapter(tool);
    if (adapter) out[adapter.path] = adapter.content;
  }

  if ((input.mcp || []).length > 0) out['.vscode/mcp.json'] = renderMcpJson(input.mcp);
  if ((input.features || []).length > 0) out['specs/features-spec.md'] = renderFeaturesSpec(input);
  return out;
}

export const slugify = (s) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const ADAPTER_CONTENT = `<!-- Adapter file — do not add rules here. All rules live in the vendor-neutral core. -->
Read the \`AGENTS.md\` file at the repository root and follow it completely before starting any task.
`;

const ADAPTER_PATHS = {
  'GitHub Copilot': '.github/copilot-instructions.md',
  'Claude Code': 'CLAUDE.md',
  Gemini: 'GEMINI.md',
  // Cursor and Codex read the root AGENTS.md natively — no adapter needed.
};

export function renderAdapter(tool) {
  const path = ADAPTER_PATHS[tool];
  return path ? { path, content: ADAPTER_CONTENT } : null;
}

export function renderPrimer(input, today) {
  const name = input.project?.name || 'Project';
  const desc = (input.project?.description || '').split(/\.\s|\n/)[0];
  const stack = [input.stack?.frontend, input.stack?.backend].filter(Boolean).join(' + ') || 'n/a';
  const rows = (input.domains || [])
    .map((d) => `| ${d} work | .agents/skills/${slugify(d)}/SKILL.md |`)
    .join('\n');
  return `---
version: 1.0.0
lastUpdated: ${today}
role: session-primer
registry: .agents/REGISTRY.md
---

# ${name} — Agent Session Primer

## What this is
${desc}. Stack: ${stack}.
Full artifact registry: \`.agents/REGISTRY.md\` (load only when modifying the harness itself).

## Load order (always)
1. \`.agents/orchestration/ROUTING.md\` — classify the task
2. The skill ROUTING points to — its always-load sections only
3. The spec for that domain — only if the task touches a primary entity

## Never load at session start
- Skills not selected by ROUTING for this task
- Workflow files unless executing a named workflow
- Telemetry events or decision logs

## Fast task classification
| Task pattern | Load |
|--------------|------|
${rows}
| update .agents/ | .agents/REGISTRY.md |
## Context budget
<=500 injected lines per session. Exceeded? Stop, decompose the task, re-classify.
## Session end (telemetry — best effort)
Append one session_summary line to .agents/telemetry/events/[YYYY-MM].jsonl per .agents/telemetry/EVENTS.md.
`;
}

export function renderRouting(input) {
  const rows = (input.domains || [])
    .map((d) => `| ${d} work | .agents/skills/${slugify(d)}/SKILL.md | .agents/specs/[entity].spec.yaml if a primary entity is touched |`)
    .join('\n');
  return `# ROUTING — Task Classification

Classify every task BEFORE loading anything else. Load ONLY what the matching row
points to.

| Task pattern | Skill | Also load |
|--------------|-------|-----------|
${rows}
| update .agents/ | .agents/REGISTRY.md | — |

No match? Load the closest domain skill and record the gap in the session summary —
that gap is a signal a new skill or routing row is needed.
`;
}

export function renderRegistry(input, today) {
  const name = input.project?.name || 'Project';
  const skillRows = (input.domains || [])
    .map((d) => `| Skill: ${d} | .agents/skills/${slugify(d)}/SKILL.md | Domain rules (skeleton — fill as the domain takes shape) |`)
    .join('\n');
  const rubricRows = (input.domains || [])
    .map((d) => `| Rubric: ${d} | .agents/evals/rubrics/${slugify(d)}.yaml | Eval criteria + drift policy (log_only) |`)
    .join('\n');
  const specRows = (input.entities || [])
    .map((e) => `| Spec: ${e} | .agents/specs/${slugify(e)}.spec.yaml | Entity contract (designContract: placeholder) |`)
    .join('\n');
  const adapters = (input.tools || []).map((t) => renderAdapter(t)).filter(Boolean).map((a) => a.path).join(', ') || 'none';
  return `---
version: 1.0.0
lastUpdated: ${today}
role: registry
---

# ${name} — Harness Registry

Load this file only when working ON the harness (adding skills, specs, or systems).
Every agent session starts from the root \`AGENTS.md\` primer instead.

## Artifacts
| Artifact | Path | Purpose |
|----------|------|---------|
| Session primer | AGENTS.md | Entry point for every session (<=40 lines) |
| Adapters | ${adapters} | <=5-line pointers to the primer — zero rules |
| Routing | .agents/orchestration/ROUTING.md | Task classification table |
${skillRows}
${specRows}
${rubricRows}
| Budget manifest | .agents/cold-start/budget-manifest.yaml | Task class -> injected artifacts map |
| Workflows | .agents/workflows/spec-first-feature.md, .agents/workflows/skill-review.md | Spec pipeline + drift review |
| Telemetry contract | .agents/telemetry/EVENTS.md | Vendor-neutral JSONL event schema |
| Scripts | .agents/scripts/*.ps1, .agents/evals/run-eval.ps1 | Mechanical gates (pwsh 7+, powershell-yaml) |

## Harness Systems Status
| System | Status | Notes |
|--------|--------|-------|
| Portability | active | Root primer + adapters for the team's tools |
| Cold-Start | scaffolded | Snapshots empty until skills gain real content; then generate-snapshots.ps1 -Scaffold / -Check |
| Evals Loop | log_only | Baselines freeze after >=10 real runs — never fabricated |
| Spec-First | active | validate-spec.ps1 gates approval; done-gate runs acceptance checks |
| Multi-Agent | inactive | Activate only when a real multi-agent workflow with named sub-agents exists |
| Telemetry | fallback | session_summary appended at session end per EVENTS.md |
`;
}

export function renderSkillSkeleton(domain) {
  const slug = slugify(domain);
  return `---
name: ${slug}
version: 0.1.0
snapshotPath: .agents/cold-start/snapshots/${slug}.snapshot.md
snapshotVersion: 0.1.0
driftPolicyPath: .agents/evals/rubrics/${slug}.yaml
---

# ${domain} — Skill

> Skeleton generated at scaffold time. Fill each section with the domain's REAL rules
> as they emerge — then bump \`version\` and regenerate the snapshot
> (\`.agents/scripts/generate-snapshots.ps1 -Scaffold\` -> compress -> \`-Check\`).

## Scope
What ${domain} covers in this project, and what it explicitly does not.

## Must rules
<!-- Rules the agent must always follow in this domain. One imperative sentence each. -->

## Never do
<!-- Hard prohibitions. One sentence each. -->

## Verification
<!-- The command(s) that prove ${domain} work is correct (test runner filtered to this domain). -->
`;
}

export function renderRubric(domain) {
  const slug = slugify(domain);
  return `skill: ${slug}
criteria:
  - id: rule-adherence
    description: "Output follows the skill's Must rules and violates no Never rules"
    weight: 1.0
driftPolicy:
  windowDays: 7
  minRunsForTrend: 5
  criterionDriftThreshold: 0.15
  skillDriftThreshold: 0.10
  baselineStrategy: first_N_runs
  baselineRuns: 10
  aggregation: median
  ciFailConsecutiveWindows: 2
  reviewTriggerAction: log_only
  reviewWorkflow: skill-review
`;
}

export function renderSpecYaml(entity) {
  return `entity: ${entity}
version: 0.1.0
description: "Primary entity captured at scaffold time. Specify via the spec-first workflow."
requirements: []
designContract:
  status: placeholder
  reviewedBy: null
  approvedAt: null
  acceptanceChecks:
    - id: ac-001
      description: "Define the first acceptance criterion for ${entity} from its requirements"
      command: placeholder
      expectedExitCode: 0
  checksWaiver: null
clarifications: []
`;
}

export function renderBudgetManifest(input) {
  const classes = (input.domains || [])
    .map((d) => `  - name: ${d} work
    artifacts:
      - .agents/orchestration/ROUTING.md
      - .agents/skills/${slugify(d)}/SKILL.md`)
    .join('\n');
  return `# One entry per task pattern in the primer's fast-classification table.
# The primer itself is always counted by validate-budget.ps1.
budgetLines: 500
taskClasses:
${classes}
`;
}

export function renderFeaturesSpec(input) {
  const items = (input.features || []).map((f) => `- [ ] ${f}`).join('\n');
  return `# Features Spec — ${input.project?.name || 'Project'}

Initial feature list captured at scaffold time. Refine each into a full spec via
\`.agents/workflows/spec-first-feature.md\` before implementation.

${items}
`;
}

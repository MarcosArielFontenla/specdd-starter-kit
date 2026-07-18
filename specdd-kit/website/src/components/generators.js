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
`;
}

export function renderCopilotInstructions(input) {
  const s = input.stack || {};
  return `# Copilot Instructions — ${input.project?.name || 'Project'}

Primary agent: **${input.agent?.primary || 'GitHub Copilot'}** (model: ${input.agent?.model || 'default'}).

Follow Spec-Driven Development: read \`context/\` and \`specs/\` before writing code.
Specifications are the source of truth.

## Stack
Frontend: ${s.frontend || 'n/a'} · Backend: ${s.backend || 'n/a'} · Testing: ${s.testing || 'n/a'}.

## Security
Data classification: ${input.security?.classification || 'internal'}.
OWASP focus: ${(input.security?.owaspControls || []).join(', ') || 'baseline'}.
Never commit secrets. Use environment variables and placeholders.
`;
}

export function generateFiles(baseFiles, input) {
  const out = { ...baseFiles };
  out['context/project.md'] = renderProject(input);
  out['context/tech-stack.md'] = renderTechStack(input);
  out['context/constitution.md'] = renderConstitution(input);
  out['.github/copilot-instructions.md'] = renderCopilotInstructions(input);
  if ((input.mcp || []).length > 0) out['.vscode/mcp.json'] = renderMcpJson(input.mcp);
  if (typeof input.featuresSpec === 'string' && input.featuresSpec.trim()) {
    out['specs/features-spec.md'] = `# Features Spec\n\n${input.featuresSpec}\n`;
  }
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

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

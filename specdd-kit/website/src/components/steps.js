// Step model for the SpecDD wizard. Pure — no React imports.
// stepsFor(scenario) is the seam where the Brownfield branch will plug in.

export const TOOLS = ['GitHub Copilot', 'Claude Code', 'Cursor', 'Codex', 'Gemini'];

export const OWASP_CONTROLS = [
  'A01 Broken Access Control',
  'A02 Cryptographic Failures',
  'A03 Injection',
  'A04 Insecure Design',
  'A05 Security Misconfiguration',
  'A06 Vulnerable and Outdated Components',
  'A07 Identification and Authentication Failures',
  'A08 Software and Data Integrity Failures',
  'A09 Security Logging and Monitoring Failures',
  'A10 Server-Side Request Forgery',
];

// Primer stays <=40 lines only if the classification table stays bounded.
export const MAX_DOMAINS = 8;

const GREENFIELD_STEPS = [
  'Welcome', 'Scenario', 'Project', 'Tech Stack', 'Domains & Entities', 'Features',
  'Principles', 'MCP Tools', 'Agents & Tools', 'Security', 'Preview / Download',
];

export function stepsFor(scenario) {
  // Brownfield gets its own branch (folder ingestion + analysis) in a later phase.
  return GREENFIELD_STEPS;
}

export function errorFor(stepName, data) {
  if (stepName === 'Project') {
    if (!data.project.name.trim()) return 'Project name is required.';
    if (!data.project.description.trim()) return 'Description is required.';
  }
  if (stepName === 'Tech Stack' && !data.stack.frontend.trim()) return 'Frontend is required.';
  if (stepName === 'Domains & Entities') {
    if ((data.domains || []).length === 0) return 'Add at least one domain — the harness routing is built from them.';
    if (data.domains.length > MAX_DOMAINS) return `Keep at most ${MAX_DOMAINS} domains — decompose broader areas later.`;
  }
  if (stepName === 'Agents & Tools' && (data.tools || []).length === 0) return 'Select at least one tool your team uses.';
  return '';
}

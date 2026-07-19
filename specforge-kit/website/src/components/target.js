// Target-project harness detection for Role Packs. Pure — runs on the RAW ingested
// path list (root prefix already stripped by the caller).

const HARNESS_ROOT_FILES = new Set([
  'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'SYSTEM_PROMPT.md',
  '.github/copilot-instructions.md',
]);
const HARNESS_DIR_PREFIXES = ['.agents/', '.claude/', '.cursor/rules/'];

export function detectTargetHarness(paths) {
  const set = new Set(paths);
  const specdd = set.has('.agents/REGISTRY.md')
    || (set.has('AGENTS.md') && set.has('.agents/orchestration/ROUTING.md'));
  const anySignal = paths.some(
    (p) => HARNESS_ROOT_FILES.has(p) || HARNESS_DIR_PREFIXES.some((d) => p.startsWith(d)),
  );
  return { specdd, legacy: anySignal && !specdd };
}

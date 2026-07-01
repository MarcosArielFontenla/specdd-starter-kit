import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, extname, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_DIRS = new Set(['website', 'node_modules', '.git', '.astro', '.idea', 'dist']);
const ALLOW_EXT = new Set(['.md', '.json', '.yml', '.yaml', '.txt', '.sh']);
const ALLOW_NAMES = new Set(['.gitignore', '.gitkeep']);
const EXCLUDE_DEFAULTS = new Set([
  'context/project.md',
  'context/tech-stack.md',
  'context/constitution.md',
  '.github/copilot-instructions.md',
]);

function isAllowed(name) {
  return ALLOW_NAMES.has(name) || ALLOW_EXT.has(extname(name));
}

function walk(dir, root, acc) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(full, root, acc);
    } else if (isAllowed(basename(full))) {
      const rel = relative(root, full).split('\\').join('/');
      if (EXCLUDE_DEFAULTS.has(rel)) continue;
      acc[rel] = readFileSync(full, 'utf8');
    }
  }
  return acc;
}

export function bundleKit(kitRoot, outPath) {
  const files = walk(kitRoot, kitRoot, {});
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(files, null, 2));
  return files;
}

// CLI: bundle the parent specdd-kit/ into src/data/kit-files.json
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));           // .../website/scripts
  const kitRoot = join(here, '..', '..');                          // .../specdd-kit
  const outPath = join(here, '..', 'src', 'data', 'kit-files.json');
  const files = bundleKit(kitRoot, outPath);
  console.log(`bundle-kit: wrote ${Object.keys(files).length} files to ${outPath}`);
}

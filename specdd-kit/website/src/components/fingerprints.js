// Small deterministic fingerprints used to detect accidental scaffold drift.
// This is an integrity aid, not a cryptographic signature.

export const FINGERPRINT_ALGORITHM = 'fnv1a32-utf8';

export const FIDELITY_IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'out-tsc', 'coverage', 'vendor',
  'venv', '.venv', '__pycache__', 'bin', 'obj', 'target',
]);

export const FIDELITY_IGNORED_PATHS = new Set([
  'context/harness-validation-report.md',
  'context/harness-validation-report.json',
]);

const utf8Bytes = (value) => {
  const text = String(value ?? '');
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);

  // TextEncoder is available in every supported browser and Node runtime. This
  // fallback keeps the pure helpers usable in older test runners as well.
  const encoded = unescape(encodeURIComponent(text));
  return Uint8Array.from(encoded, (character) => character.charCodeAt(0));
};

export function fingerprintBytes(value) {
  const bytes = value instanceof Uint8Array
    ? value
    : value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : ArrayBuffer.isView(value)
        ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
        : Uint8Array.from(value || []);
  let hash = 0x811c9dc5;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, '0');
}

export function fingerprintText(value) {
  return fingerprintBytes(utf8Bytes(value));
}

export function normalizeFidelityPath(path) {
  return String(path ?? '')
    .replaceAll('\\', '/')
    .replace(/^\.\//, '')
    .toLowerCase();
}

export function isFidelityIgnoredPath(path) {
  const normalized = String(path ?? '').replaceAll('\\', '/');
  if (FIDELITY_IGNORED_PATHS.has(normalized.toLowerCase())) return true;
  return normalized.split('/').some((segment) => {
    const lower = segment.toLowerCase();
    return FIDELITY_IGNORED_DIRS.has(lower) || (segment.startsWith('.') && lower !== '.github');
  });
}

export function canonicalizeFidelityPaths(paths) {
  return [...new Set((paths || [])
    .map(normalizeFidelityPath)
    .filter((path) => path && !isFidelityIgnoredPath(path)))]
    .sort();
}

export function fingerprintPaths(paths) {
  const canonicalPaths = canonicalizeFidelityPaths(paths);
  return {
    count: canonicalPaths.length,
    fingerprint: fingerprintText(canonicalPaths.join('\n')),
    paths: canonicalPaths,
  };
}

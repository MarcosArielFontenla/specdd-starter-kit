import { useState } from 'react';
import { analyzeProject } from './analyzer.js';

// Folder ingestion for the Brownfield scenario. All analysis happens in-browser via
// the File API; only manifest files are ever read.
export default function IngestStep({ data, skippedCount, replacedCount, onAnalyzed, onAck }) {
  const [busy, setBusy] = useState(false);

  async function onPick(e) {
    const inputEl = e.target;
    const files = Array.from(inputEl.files || []);
    if (!files.length) return;
    setBusy(true);
    try {
      const folderName = files[0].webkitRelativePath.split('/')[0];
      const prefix = folderName.length + 1;
      const byPath = new Map(files.map((f) => [f.webkitRelativePath.slice(prefix), f]));
      const analysis = await analyzeProject({
        folderName,
        paths: [...byPath.keys()],
        readFile: (p) => byPath.get(p).text(),
      });
      onAnalyzed(analysis, [...byPath.keys()]);
    } finally {
      setBusy(false);
      inputEl.value = '';
    }
  }

  const a = data.analysis;
  return (
    <>
      <p className="b-lead">
        Pick your project folder. The analysis runs 100% in your browser — no file
        ever leaves your machine. Only manifest files (package.json and friends) are
        read; everything else contributes its path only.
      </p>
      <label>Project folder *</label>
      <input type="file" data-testid="folder-input" webkitdirectory="" directory="" multiple
        onChange={onPick} disabled={busy} />
      {busy && <p className="b-lead">Analyzing…</p>}
      {a && !busy && (
        <>
          <div className="b-cards" data-testid="analysis-summary">
            <div className="b-card">
              <strong>{a.projectName}</strong>
              <p>{a.fileCount} files scanned{a.truncated ? ' (truncated at the scan cap)' : ''} · manifests: {a.manifestsFound.join(', ') || 'none'}</p>
            </div>
            <div className="b-card">
              <strong>Stack</strong>
              <p>{[a.stack.frontend, a.stack.backend, a.stack.testing, a.stack.database].filter(Boolean).join(' · ') || 'not detected'}{a.stack.languages.length ? ` · ${a.stack.languages.join(', ')}` : ''}</p>
            </div>
            <div className="b-card">
              <strong>Suggestions</strong>
              <p>{a.domains.length} domains · {a.entities.length} entities — editable in the next steps</p>
            </div>
            <div className="b-card">
              <strong>Collisions</strong>
              <p>{skippedCount} file(s) skipped · {replacedCount} legacy harness file(s) replaced on extract</p>
            </div>
          </div>
          {a.legacyHarness?.detected && (
            <div className="b-card b-card--warning" data-testid="legacy-warning">
              <strong>⚠ Legacy harness detected</strong>
              <p>
                {a.legacyHarness.mechanism.length + a.legacyHarness.knowledge.length} files —{' '}
                {a.legacyHarness.mechanism.length} mechanism file(s) will be deprecated (archived by
                your agent; replaced on extract where paths collide) and{' '}
                {a.legacyHarness.knowledge.length} knowledge file(s) will be triaged into the new
                harness by your agent via the pre-generated migration tasks.
              </p>
              <label className="b-check">
                <input type="checkbox" data-testid="legacy-ack" checked={!!data.legacyAck}
                  onChange={(e) => onAck(e.target.checked)} />
                I understand the previous harness will be deprecated and its mechanism files
                replaced by the new scaffold.
              </label>
            </div>
          )}
        </>
      )}
      {a && !busy && <p className="b-lead">Re-pick a folder to re-run the analysis.</p>}
    </>
  );
}

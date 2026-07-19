import { useState } from 'react';
import { detectTargetHarness } from './target.js';

// Optional target-project ingestion. Only the path LIST is used — no file content
// is ever read. Everything stays in the browser.
export default function TargetStep({ data, onTarget }) {
  const [busy, setBusy] = useState(false);

  function onPick(e) {
    const inputEl = e.target;
    const files = Array.from(inputEl.files || []);
    if (!files.length) return;
    setBusy(true);
    try {
      const folderName = files[0].webkitRelativePath.split('/')[0];
      const prefix = folderName.length + 1;
      const paths = files.map((f) => f.webkitRelativePath.slice(prefix));
      onTarget(paths, detectTargetHarness(paths), folderName);
    } finally {
      setBusy(false);
      inputEl.value = '';
    }
  }

  const picked = (data.targetPaths || []).length > 0;
  return (
    <>
      <p className="b-lead">
        Optional: pick the target project folder so the pack can detect its SpecDD
        Harness and avoid overwriting existing files. Only the file LIST is read —
        no content ever leaves your machine. Skip to get a standard pack.
      </p>
      <label>Target project folder (optional)</label>
      <input type="file" data-testid="folder-input" webkitdirectory="" directory="" multiple
        onChange={onPick} disabled={busy} />
      {picked && (
        <div className="b-card" data-testid="target-status">
          <strong>{data.targetName}</strong>
          <p>
            {data.harness.specdd
              ? 'SpecDD Harness detected — the pack will extend it and skip colliding files.'
              : data.harness.legacy
                ? 'A previous (non-SpecDD) harness was detected. Recommended: migrate it first with the SpecDD wizard (Brownfield scenario).'
                : 'No harness detected. Recommended: generate one first with the SpecDD wizard — the pack plugs into it.'}
          </p>
        </div>
      )}
    </>
  );
}

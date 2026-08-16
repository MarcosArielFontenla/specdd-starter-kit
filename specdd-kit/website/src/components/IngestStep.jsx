import { useRef, useState } from 'react';
import { analyzeProject } from './analyzer.js';
import { ANALYSIS_DEPTHS, ANALYSIS_LEVELS, DEFAULT_ANALYSIS_DEPTH } from './analysis.js';

const summarizeManifests = (manifests = []) => {
  if (!manifests.length) return 'none detected';
  return `${manifests.length} detected`;
};

// Folder ingestion for the Brownfield scenario. All analysis happens in-browser via
// the File API; only manifest files are ever read.
export default function IngestStep({ data, skippedCount, replacedCount, onAnalyzed, onAck, onAnalysisDepthChange }) {
  const [busy, setBusy] = useState(false);
  const [showFolderConsent, setShowFolderConsent] = useState(false);
  const [pickerError, setPickerError] = useState('');
  const inputRef = useRef(null);
  const analysisDepth = data.analysisDepth || DEFAULT_ANALYSIS_DEPTH;
  const selectedLevel = ANALYSIS_LEVELS.find((level) => level.id === analysisDepth) || ANALYSIS_LEVELS[0];

  async function analyzeEntries(folderName, entries, inputEl = null) {
    if (!entries.length) {
      setPickerError('The selected folder did not contain any readable files.');
      return;
    }
    setBusy(true);
    setPickerError('');
    try {
      const byPath = new Map(entries.map(({ path, file }) => [path, file]));
      const analysis = await analyzeProject({
        folderName,
        paths: [...byPath.keys()],
        readFile: (p) => byPath.get(p).text(),
        analysisDepth,
      });
      onAnalyzed(analysis, [...byPath.keys()]);
    } catch {
      setPickerError('The folder could not be read. Check the browser permission and try again.');
    } finally {
      setBusy(false);
      if (inputEl) inputEl.value = '';
    }
  }

  async function onPick(e) {
    const inputEl = e.target;
    const files = Array.from(inputEl.files || []);
    if (!files.length) return;
    const folderName = files[0].webkitRelativePath.split('/')[0];
    const prefix = folderName.length + 1;
    await analyzeEntries(folderName, files.map((file) => ({
      path: file.webkitRelativePath.slice(prefix),
      file,
    })), inputEl);
  }

  async function readDirectory(handle, parentPath = '', entries = []) {
    for await (const entry of handle.values()) {
      const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        try {
          entries.push({ path, file: await entry.getFile() });
        } catch {
          // An unreadable file remains absent from the local analysis snapshot.
        }
      } else if (entry.kind === 'directory') {
        await readDirectory(entry, path, entries);
      }
    }
    return entries;
  }

  function openFolderConsent() {
    if (!busy) setShowFolderConsent(true);
  }

  async function confirmFolderPicker() {
    setShowFolderConsent(false);
    setPickerError('');
    if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
      try {
        const directory = await window.showDirectoryPicker({ mode: 'read' });
        const entries = await readDirectory(directory);
        await analyzeEntries(directory.name, entries);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setPickerError('The folder could not be opened. Check the browser permission and try again.');
        }
      }
      return;
    }
    inputRef.current?.click();
  }

  const a = data.analysis;
  return (
    <>
      <p className="b-lead">
        Pick your project folder. The analysis runs 100% in your browser — no file
        ever leaves your machine. Level 1 reads manifests and paths; Level 2 also
        reads a bounded allowlist of safe documentation, models, routes and tests.
      </p>
      <fieldset className="b-analysis-depth">
        <legend>Analysis depth</legend>
        {ANALYSIS_LEVELS.map((level) => (
          <label
            className={`b-analysis-depth__option${analysisDepth === level.id ? ' b-analysis-depth__option--selected' : ''}${!level.available ? ' b-analysis-depth__option--disabled' : ''}`}
            key={level.id}
          >
            <input
              type="radio"
              name="analysis-depth"
              value={level.id}
              data-testid={`analysis-depth-${level.id}`}
              checked={analysisDepth === level.id}
              disabled={!level.available}
              onChange={() => onAnalysisDepthChange(level.id)}
            />
            <span className="b-analysis-depth__copy">
              <strong>Level {level.number} — {level.title}</strong>
              <small>{level.description}</small>
            </span>
            {!level.available && <span className="b-analysis-depth__status">Coming soon</span>}
          </label>
        ))}
      </fieldset>
      <label>Project folder *</label>
      <div className="b-folder-picker">
        <button type="button" className="b-btn b-btn--ghost" data-testid="folder-trigger"
          onClick={openFolderConsent} disabled={busy}>
          {busy ? 'Analyzing…' : 'Choose project folder'}
        </button>
        <span className="b-folder-picker__hint">Read locally in your browser</span>
      </div>
      <input ref={inputRef} className="b-folder-input b-folder-input--native" type="file"
        data-testid="folder-input" webkitdirectory="" directory="" multiple
        onChange={onPick} disabled={busy} />
      {pickerError && <p className="b-error" data-testid="picker-error">{pickerError}</p>}
      {busy && <p className="b-lead">Analyzing…</p>}
      {a && !busy && (
        <>
          <div className="b-cards" data-testid="analysis-summary">
            <div className="b-card">
              <strong>{a.projectName}</strong>
              <p>{a.fileCount} files scanned{a.truncated ? ' (truncated at the scan cap)' : ''}</p>
              <p className="b-card__meta" title={a.manifestsFound.join('\n')}>
                Manifests: {summarizeManifests(a.manifestsFound)}
              </p>
            </div>
            <div className="b-card">
              <strong>Analysis</strong>
              <p>Level {selectedLevel.number} — {selectedLevel.title}</p>
            </div>
            <div className="b-card">
              <strong>Stack</strong>
              <p>{[a.stack.frontend, a.stack.backend, a.stack.testing, a.stack.database].filter(Boolean).join(' · ') || 'not detected'}{a.stack.languages.length ? ` · ${a.stack.languages.join(', ')}` : ''}</p>
            </div>
            <div className="b-card">
              <strong>Suggestions</strong>
              <p>{a.domains.length} domains · {a.entities.length} entities · {a.features?.length || 0} features — editable in the next steps</p>
            </div>
            {a.semantic && (
              <div className="b-card">
                <strong>Semantic context</strong>
                <p>{a.semantic.filesRead.length} safe files read · {a.semantic.evidence.length} evidence items · confidence: {a.semantic.confidence}</p>
              </div>
            )}
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
      {showFolderConsent && (
        <div className="b-modal-layer" data-testid="folder-consent">
          <section className="b-modal" role="dialog" aria-modal="true" aria-labelledby="folder-consent-title">
            <div className="b-modal__eyebrow">BROWSER-LOCAL · NO SERVER</div>
            <h3 id="folder-consent-title">Analyze a local project</h3>
            <p>
              Choose the project folder you want to bootstrap. The analysis stays in
              this browser and does not upload your project to a backend.
            </p>
            <ul className="b-modal__list">
              <li>Known manifests are read for technology detection.</li>
              {analysisDepth === ANALYSIS_DEPTHS.SEMANTIC
                ? <li>Level 2 reads only safe documentation, models, routes and tests.</li>
                : <li>Other files contribute paths only.</li>}
              <li>Secrets, environment files and binaries are never read.</li>
              <li>Existing project files are never overwritten.</li>
            </ul>
            <div className="b-modal__actions">
              <button type="button" className="b-btn b-btn--ghost" data-testid="folder-cancel"
                onClick={() => setShowFolderConsent(false)}>
                Cancel
              </button>
              <button type="button" className="b-btn b-btn--primary" data-testid="folder-confirm"
                onClick={confirmFolderPicker}>
                Choose folder
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

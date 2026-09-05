import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import providers from '../data/providers.json';
import { generateFilesWithDelivery, slugify } from './generators.js';
import { deliveryInputError } from './delivery-export.js';
import Stepper from '@specdd/ui/stepper';
import { ChevronLeft, ChevronRight, Download, Copy, TriangleAlert } from 'lucide-react';

const STEPS = ['Welcome', 'App', 'Target', 'CI/CD', 'Security', 'Review'];
const PRESETS = {
  astro: { buildCommand: 'npm run build', outputDir: 'dist' },
  vite: { buildCommand: 'npm run build', outputDir: 'dist' },
  'next-export': { buildCommand: 'npm run build', outputDir: 'out' },
  cra: { buildCommand: 'npm run build', outputDir: 'build' },
  plain: { buildCommand: '', outputDir: '.' },
  custom: { buildCommand: '', outputDir: '' },
};
const CI_OPTIONS = [
  { id: 'github-actions', label: 'GitHub Actions' },
  { id: 'azure-pipelines', label: 'Azure Pipelines' },
];

const initial = {
  app: { name: '', preset: 'astro', buildCommand: 'npm run build', outputDir: 'dist', api: 'none', apiDir: 'api' },
  providerId: '',
  providerFields: {},
  ci: ['github-actions'],
  envs: 'prod',
  approvalGate: false,
  ack: false,
  delivery: { enabled: false, projectId: '', repositoryRef: '', sourceRevision: '', stagingDestinationRef: '', productionDestinationRef: '' },
};
const pad2 = (n) => String(n).padStart(2, '0');

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const [previewPath, setPreviewPath] = useState('specdeploy.json');
  const [ready, setReady] = useState(false);
  const [generation, setGeneration] = useState({ input: null, files: {}, error: '' });
  useEffect(() => { setReady(true); }, []);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const provider = data.providerId ? providers[data.providerId] : null;

  function selectPreset(preset) {
    const p = PRESETS[preset] || PRESETS.custom;
    set({ app: { ...data.app, preset, buildCommand: p.buildCommand, outputDir: p.outputDir } });
  }

  function selectProvider(id) {
    if (id === data.providerId) return;
    const p = providers[id];
    const fields = {};
    for (const f of p.fields || []) fields[f.key] = f.default ?? (f.type === 'select' ? f.options[0] : '');
    const kept = data.ci.filter((c) => p.ci.includes(c));
    set({ providerId: id, providerFields: fields, ci: kept.length ? kept : [p.ci[0]], ack: false });
  }

  function fieldError(f) {
    const v = String(data.providerFields[f.key] ?? '');
    if (f.required && v.trim() === '') return `${f.label} is required.`;
    if (f.pattern && v && !new RegExp(f.pattern).test(v)) return `${f.label} is invalid.`;
    return '';
  }
  function errorFor(i) {
    if (i === 1) {
      if (!data.app.name.trim()) return 'App name is required.';
      if (!data.app.outputDir.trim()) return 'Output directory is required.';
    }
    if (i === 2) {
      if (!data.providerId) return 'Pick a deployment target.';
      for (const f of provider?.fields || []) { const e = fieldError(f); if (e) return e; }
    }
    if (i === 3 && data.ci.length === 0) return 'Pick at least one CI/CD system.';
    if (i === 3 && deliveryInputError(data)) return deliveryInputError(data);
    if (i === 4 && !data.ack) return 'Please acknowledge the secrets checklist.';
    return '';
  }
  const isStepValid = (i) => errorFor(i) === '';

  function next() {
    const e = errorFor(step);
    if (e) { setError(e); return; }
    setError('');
    const target = Math.min(step + 1, STEPS.length - 1);
    setStep(target);
    setMaxVisited((m) => Math.max(m, target));
  }
  function back() { setError(''); setStep((s) => Math.max(s - 1, 0)); }
  function jump(i) { if (i <= maxVisited) { setError(''); setStep(i); } }

  const last = step === STEPS.length - 1;
  useEffect(() => {
    if (!last) return;
    let cancelled = false;
    generateFilesWithDelivery(providers, data).then(
      files => { if (!cancelled) setGeneration({ input: data, files, error: '' }); },
      error => { if (!cancelled) setGeneration({ input: data, files: {}, error: error.message }); }
    );
    return () => { cancelled = true; };
  }, [last, data]);
  const generated = last && generation.input === data;
  const files = generated ? generation.files : {};
  const generationError = generated ? generation.error : '';
  useEffect(() => {
    if (generated && !generationError && !Object.hasOwn(files, previewPath)) setPreviewPath('specdeploy.json');
  }, [generated, generationError, files, previewPath]);
  const apiUnsupported = data.app.api !== 'none' && provider && !provider.supportsApi;

  async function download() {
    if (!generated || generationError) return;
    const zip = new JSZip();
    for (const [path, contents] of Object.entries(files)) zip.file(path, contents);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(data.app.name) || 'specdeploy'}-${data.providerId}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="b-shell" data-ready={ready ? 'true' : 'false'}>
      <aside className="b-sidebar">
        <div className="b-brand">SpecDeploy Wizard</div>
        <div className="b-sidebar__eyebrow">STEP {pad2(step + 1)} / {pad2(STEPS.length)}</div>
        <Stepper steps={STEPS} current={step} isValid={isStepValid} maxVisited={maxVisited} onJump={jump} />
      </aside>

      <main className="b-main">
        <div className="b-main__eyebrow">STEP {pad2(step + 1)} · {STEPS[step].toUpperCase()}</div>
        <h2 className="b-main__title" data-testid="step-title">{STEPS[step]}</h2>

        <div className="b-main__body">
          {step === 0 && (
            <p className="b-lead">
              Generate deployment artifacts (CI/CD pipeline, IaC, runbook) for your stack.
              This wizard never deploys and never asks for credentials — secrets are referenced
              by name only. Click Next to start.
            </p>
          )}

          {step === 1 && (
            <>
              <label>App name *</label>
              <input data-testid="app-name" value={data.app.name}
                onChange={(e) => set({ app: { ...data.app, name: e.target.value } })} />
              <label>Framework preset</label>
              <select data-testid="preset" value={data.app.preset} onChange={(e) => selectPreset(e.target.value)}>
                {Object.keys(PRESETS).map((p) => <option key={p}>{p}</option>)}
              </select>
              <label>Build command</label>
              <input value={data.app.buildCommand}
                onChange={(e) => set({ app: { ...data.app, buildCommand: e.target.value } })} />
              <label>Output directory *</label>
              <input data-testid="output-dir" value={data.app.outputDir}
                onChange={(e) => set({ app: { ...data.app, outputDir: e.target.value } })} />
              <label>API</label>
              <select data-testid="api" value={data.app.api}
                onChange={(e) => set({ app: { ...data.app, api: e.target.value } })}>
                <option value="none">none</option>
                <option value="node">Node serverless</option>
              </select>
              {data.app.api !== 'none' && (
                <>
                  <label>API directory</label>
                  <input value={data.app.apiDir}
                    onChange={(e) => set({ app: { ...data.app, apiDir: e.target.value } })} />
                </>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="b-personas">
                {Object.values(providers).map((p) => (
                  <button key={p.id} data-testid={`provider-${p.id}`}
                    className={`b-persona${data.providerId === p.id ? ' b-persona--active' : ''}`}
                    onClick={() => selectProvider(p.id)}>{p.label}</button>
                ))}
              </div>
              {apiUnsupported && (
                <p className="b-error" data-testid="api-warning">
                  <TriangleAlert size={14} /> {provider.label} does not deploy the API folder — the runbook explains alternatives.
                </p>
              )}
              {provider && (provider.fields || []).map((f) => (
                <div key={f.key}>
                  <label>{f.label}{f.required ? ' *' : ''}</label>
                  {f.type === 'select'
                    ? (
                      <select data-testid={`field-${f.key}`} value={data.providerFields[f.key] ?? ''}
                        onChange={(e) => set({ providerFields: { ...data.providerFields, [f.key]: e.target.value } })}>
                        {f.options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    )
                    : (
                      <input data-testid={`field-${f.key}`} value={data.providerFields[f.key] ?? ''}
                        onChange={(e) => set({ providerFields: { ...data.providerFields, [f.key]: e.target.value } })} />
                    )}
                  {f.help && <p className="b-help">{f.help}</p>}
                </div>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <label>CI/CD systems</label>
              {CI_OPTIONS.filter((c) => !provider || provider.ci.includes(c.id)).map((c) => (
                <label className="b-check" key={c.id}>
                  <input type="checkbox" data-testid={`ci-${c.id}`} checked={data.ci.includes(c.id)}
                    onChange={(e) => set({ ci: e.target.checked ? [...data.ci, c.id] : data.ci.filter((x) => x !== c.id) })} />
                  {c.label}
                </label>
              ))}
              <label>Environments</label>
              <select data-testid="envs" value={data.envs} onChange={(e) => set({ envs: e.target.value })}>
                <option value="prod">prod only</option>
                <option value="dev+prod">dev + prod</option>
              </select>
              <label className="b-check">
                <input type="checkbox" data-testid="approval-gate" checked={data.approvalGate}
                  onChange={(e) => set({ approvalGate: e.target.checked })} />
                Approval gate for prod
              </label>
              <hr />
              <label className="b-check">
                <input type="checkbox" data-testid="delivery-enabled" checked={data.delivery.enabled}
                  onChange={(e) => set({ delivery: { ...data.delivery, enabled: e.target.checked } })} />
                Export delivery contract and graph (draft only)
              </label>
              {data.delivery.enabled && (
                <>
                  <p className="b-help" data-testid="delivery-warning">
                    Not executable. {provider?.label} has no controlled-delivery runtime adapter.
                    This adds draft files only; existing pipelines do not implement these gates.
                    No merge, deployment or promotion approval is performed. Warp is not required.
                  </p>
                  {[
                    ['projectId', 'Canonical project ID'], ['repositoryRef', 'Repository ID'],
                    ['sourceRevision', 'Full source commit hash (40 or 64 lowercase characters)'],
                    ['stagingDestinationRef', 'Staging destination ID'], ['productionDestinationRef', 'Production destination ID'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label htmlFor={`delivery-${key}`}>{label} *</label>
                      <input id={`delivery-${key}`} data-testid={`delivery-${key}`} value={data.delivery[key]}
                        onChange={(e) => set({ delivery: { ...data.delivery, [key]: e.target.value } })} />
                    </div>
                  ))}
                  <p className="b-help">
                    Use logical IDs, not URLs or credentials. Destinations must differ and are independent
                    of the legacy environment selector. Supply context/project-definition.json and
                    .agents/REGISTRY.md separately. A commit hash is not proof of merge.
                  </p>
                </>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <p className="b-lead">
                The generated pipeline references these secrets <strong>by name</strong>.
                Create them in your CI system — this wizard never asks for values.
              </p>
              <pre className="b-preview" data-testid="secrets-list">
                {(provider?.secrets || []).map((s) => `${s.name}\n  ${s.description}\n  → ${s.where}`).join('\n\n') || 'No secrets required.'}
              </pre>
              <label className="b-check">
                <input type="checkbox" data-testid="ack" checked={data.ack}
                  onChange={(e) => set({ ack: e.target.checked })} />
                I understand secrets are created in the CI system and never committed.
              </label>
            </>
          )}

          {step === 5 && (
            <>
              {!generated && <p role="status">Preparing files…</p>}
              {generationError && <p role="alert" data-testid="generation-error">{generationError}</p>}
              {data.delivery.enabled && <p data-testid="delivery-review-warning" className="b-help">Delivery export is draft and not executable. Provider runtime unsupported; legacy pipelines have not gained these graph protections. No approval has been granted.</p>}
              <p className="b-lead">{Object.keys(files).length} files ready for {provider?.label}.</p>
              <pre className="b-preview" data-testid="preview">{Object.keys(files).sort().join('\n')}</pre>
              <label>Preview file</label>
              <select data-testid="preview-select" value={previewPath} onChange={(e) => setPreviewPath(e.target.value)}>
                {Object.keys(files).sort().map((p) => <option key={p}>{p}</option>)}
              </select>
              <pre className="b-preview" data-testid="preview-content">{files[previewPath] || ''}</pre>
              <button className="b-btn b-btn--ghost" onClick={() => navigator.clipboard.writeText(files[previewPath] || '')}>
                <Copy size={16} />Copy file
              </button>
            </>
          )}
        </div>

        {error && <p className="b-error" data-testid="error">{error}</p>}

        <div className="b-nav">
          <button className="b-btn b-btn--ghost" onClick={back} disabled={step === 0}><ChevronLeft size={16} />Back</button>
          {last
            ? <button className="b-btn b-btn--primary" data-testid="download-btn" disabled={!generated || !!generationError} onClick={download}><Download size={16} />Download ZIP</button>
            : <button className="b-btn b-btn--primary" data-testid="next-btn" onClick={next}>Next<ChevronRight size={16} /></button>}
        </div>
      </main>
    </div>
  );
}

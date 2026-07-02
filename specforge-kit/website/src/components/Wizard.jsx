import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import skills from '../data/skills.json';
import { generateFiles } from './generators.js';
import Stepper from '@specdd/ui/stepper';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

const STEPS = ['Welcome', 'Persona', 'Role', 'Context', 'Governance', 'Review'];
const PERSONAS = ['BA', 'QA', 'Dev', 'UX'];

const initial = {
  persona: '',
  agent: { primary: 'GitHub Copilot', model: '' },
  project: { name: '', featureTitle: '', featureSlug: '' },
  context: { text: '' },
  security: { classification: 'internal', regulatory: 'none' },
  ba: { strategy: '555', storyHierarchy: 'Epic→Feature→Story', sizing: 'Fibonacci', style: 'Gherkin' },
  qa: { approach: 'manual', appBaseUrl: '' },
  dev: { architecture: 'component-based', framework: '', commentLevel: 'normal' },
  ux: { designSystem: '', figmaEnabled: false, figmaUrl: '' },
  skills: [],
  mcp: { figma: false, playwright: false },
};

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pad2 = (n) => String(n).padStart(2, '0');

function withDerived(d) {
  const slug = slugify(d.project.featureTitle) || 'feature';
  const mcp = { figma: d.persona === 'UX' && d.ux.figmaEnabled, playwright: d.persona === 'QA' && d.qa.approach !== 'manual' };
  return { ...d, project: { ...d.project, featureSlug: slug }, mcp };
}

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  function isStepValid(i) {
    if (i === 1) return !!data.persona;
    if (i === 2) return data.project.featureTitle.trim() !== '';
    return true;
  }
  function errorFor(i) {
    if (i === 1 && !data.persona) return 'Pick a persona.';
    if (i === 2 && !data.project.featureTitle.trim()) return 'Feature title is required.';
    return '';
  }

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
  const files = last ? generateFiles(skills, withDerived(data)) : {};
  const skillSlugs = Object.keys(skills);

  async function download() {
    const d = withDerived(data);
    const zip = new JSZip();
    for (const [path, contents] of Object.entries(generateFiles(skills, d))) zip.file(path, contents);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d.project.name || 'specforge'}-${d.persona || 'scaffold'}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="b-shell" data-ready={ready ? 'true' : 'false'}>
      <aside className="b-sidebar">
        <div className="b-brand">SpecForge Wizard</div>
        <div className="b-sidebar__eyebrow">STEP {pad2(step + 1)} / {pad2(STEPS.length)}</div>
        <Stepper steps={STEPS} current={step} isValid={isStepValid} maxVisited={maxVisited} onJump={jump} />
      </aside>

      <main className="b-main">
        <div className="b-main__eyebrow">STEP {pad2(step + 1)} · {STEPS[step].toUpperCase()}</div>
        <h2 className="b-main__title" data-testid="step-title">{STEPS[step]}</h2>

        <div className="b-main__body">
          {step === 0 && <p className="b-lead">Generate a role-specific Copilot scaffold. Click Next to start.</p>}

          {step === 1 && (
            <div className="b-personas">
              {PERSONAS.map((p) => (
                <button key={p} data-testid={`persona-${p}`} className={`b-persona${data.persona === p ? ' b-persona--active' : ''}`}
                  onClick={() => set({ persona: p })}>{p}</button>
              ))}
            </div>
          )}

          {step === 2 && (
            <>
              <label>Project name</label>
              <input value={data.project.name} onChange={(e) => set({ project: { ...data.project, name: e.target.value } })} />
              <label>Feature title *</label>
              <input data-testid="feature-title" value={data.project.featureTitle}
                onChange={(e) => set({ project: { ...data.project, featureTitle: e.target.value } })} />
              {data.persona === 'QA' && (
                <>
                  <label>Test approach</label>
                  <select value={data.qa.approach} onChange={(e) => set({ qa: { ...data.qa, approach: e.target.value } })}>
                    {['manual', 'automated', 'manual + automated'].map((a) => <option key={a}>{a}</option>)}
                  </select>
                </>
              )}
              {data.persona === 'UX' && (
                <label className="b-check">
                  <input type="checkbox" checked={data.ux.figmaEnabled}
                    onChange={(e) => set({ ux: { ...data.ux, figmaEnabled: e.target.checked } })} /> Figma enabled
                </label>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <label>Context (paste any relevant notes)</label>
              <textarea value={data.context.text} onChange={(e) => set({ context: { text: e.target.value } })} />
              <label>Skills to include</label>
              {skillSlugs.map((s) => (
                <label className="b-check" key={s}>
                  <input type="checkbox" checked={data.skills.includes(s)}
                    onChange={(e) => set({ skills: e.target.checked ? [...data.skills, s] : data.skills.filter((x) => x !== s) })} />
                  {s}
                </label>
              ))}
            </>
          )}

          {step === 4 && (
            <>
              <label>Data classification</label>
              <select value={data.security.classification} onChange={(e) => set({ security: { ...data.security, classification: e.target.value } })}>
                {['public', 'internal', 'confidential', 'restricted'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </>
          )}

          {step === 5 && (
            <>
              <p className="b-lead">{Object.keys(files).length} files ready for persona {data.persona}.</p>
              <pre className="b-preview" data-testid="preview">{Object.keys(files).sort().join('\n')}</pre>
            </>
          )}
        </div>

        {error && <p className="b-error" data-testid="error">{error}</p>}

        <div className="b-nav">
          <button className="b-btn b-btn--ghost" onClick={back} disabled={step === 0}><ChevronLeft size={16} />Back</button>
          {last
            ? <button className="b-btn b-btn--primary" data-testid="download-btn" onClick={download}><Download size={16} />Download ZIP</button>
            : <button className="b-btn b-btn--primary" data-testid="next-btn" onClick={next}>Next<ChevronRight size={16} /></button>}
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import skills from '../data/skills.json';
import { generateFiles } from './generators.js';

const STEPS = ['Welcome', 'Persona', 'Role', 'Context', 'Governance', 'Review'];
const PERSONAS = ['BA', 'QA', 'Dev', 'UX'];
const AGENTS = ['GitHub Copilot', 'Claude', 'Cursor', 'Gemini'];

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

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  function validate() {
    if (step === 1 && !data.persona) return 'Pick a persona.';
    if (step === 2 && !data.project.featureTitle.trim()) return 'Feature title is required.';
    return '';
  }
  function next() {
    const e = validate();
    if (e) { setError(e); return; }
    setError('');
    // derive mcp + slug as we pass the role step
    if (step === 2) {
      const slug = slugify(data.project.featureTitle) || 'feature';
      const mcp = { figma: data.persona === 'UX' && data.ux.figmaEnabled, playwright: data.persona === 'QA' && data.qa.approach !== 'manual' };
      setData((d) => ({ ...d, project: { ...d.project, featureSlug: slug }, mcp }));
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setError(''); setStep((s) => Math.max(s - 1, 0)); }

  const files = step === STEPS.length - 1 ? generateFiles(skills, data) : {};

  async function download() {
    const zip = new JSZip();
    for (const [path, contents] of Object.entries(generateFiles(skills, data))) zip.file(path, contents);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.project.name || 'specforge'}-${data.persona || 'scaffold'}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const skillSlugs = Object.keys(skills);

  return (
    <main className="wizard" data-ready={ready ? 'true' : 'false'}>
      <h1>SpecForge Wizard</h1>
      <div className="steps">
        {STEPS.map((s, i) => <span key={s} className={i === step ? 'active' : ''}>{i + 1}. {s}</span>)}
      </div>
      <h2 data-testid="step-title">{STEPS[step]}</h2>

      {step === 0 && <p>Generate a role-specific Copilot scaffold. Click Next to start.</p>}

      {step === 1 && (
        <div className="personas">
          {PERSONAS.map((p) => (
            <button key={p} data-testid={`persona-${p}`} style={{ outline: data.persona === p ? '2px solid #fff' : 'none' }}
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
            <label style={{ fontWeight: 400 }}>
              <input type="checkbox" style={{ width: 'auto', marginRight: '.5rem' }} checked={data.ux.figmaEnabled}
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
            <label key={s} style={{ fontWeight: 400 }}>
              <input type="checkbox" style={{ width: 'auto', marginRight: '.5rem' }} checked={data.skills.includes(s)}
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
          <p>{Object.keys(files).length} files ready for persona {data.persona}.</p>
          <pre className="preview" data-testid="preview">{Object.keys(files).sort().join('\n')}</pre>
          <button data-testid="download-btn" onClick={download}>Download ZIP</button>
        </>
      )}

      {error && <p className="error" data-testid="error">{error}</p>}

      <div className="nav">
        <button onClick={back} disabled={step === 0}>Back</button>
        {step < STEPS.length - 1 && <button data-testid="next-btn" onClick={next}>Next</button>}
      </div>
    </main>
  );
}

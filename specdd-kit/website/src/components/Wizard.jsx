import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import kitFiles from '../data/kit-files.json';
import { generateFiles } from './generators.js';

const STEPS = ['Welcome', 'Project', 'Tech Stack', 'Principles', 'MCP Tools', 'Agent & LLM', 'Security', 'Preview / Download'];
const MCP_OPTIONS = ['github', 'sonarqube', 'context7', 'postgresql', 'playwright', 'figma'];
const AGENTS = ['GitHub Copilot', 'Claude', 'Cursor', 'Gemini'];

const initial = {
  project: { name: '', description: '', problem: '' },
  personas: [], outcomes: { user: '', business: '' },
  constraints: { business: '', technical: '' },
  stack: { languages: [], frontend: '', backend: '', testing: '', database: '', infra: '', swagger: false, a11y: false },
  principles: ['Specifications are the source of truth'],
  mcp: [], agent: { primary: 'GitHub Copilot', model: '' },
  security: { classification: 'internal', owaspControls: [] },
  featuresSpec: '',
};

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  function validate() {
    if (step === 1 && !data.project.name.trim()) return 'Project name is required.';
    if (step === 1 && !data.project.description.trim()) return 'Description is required.';
    if (step === 2 && !data.stack.frontend.trim()) return 'Frontend is required.';
    return '';
  }

  function next() {
    const e = validate();
    if (e) { setError(e); return; }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setError(''); setStep((s) => Math.max(s - 1, 0)); }

  const files = step === STEPS.length - 1 ? generateFiles(kitFiles, data) : {};

  async function download() {
    const zip = new JSZip();
    for (const [path, contents] of Object.entries(generateFiles(kitFiles, data))) {
      zip.file(path, contents);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.project.name || 'sdd-kit'}-scaffold.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="wizard" data-ready={ready ? 'true' : 'false'}>
      <h1>SDD Kit Wizard</h1>
      <div className="steps">
        {STEPS.map((s, i) => <span key={s} className={i === step ? 'active' : ''}>{i + 1}. {s}</span>)}
      </div>
      <h2 data-testid="step-title">{STEPS[step]}</h2>

      {step === 0 && <p>Generate a Spec-Driven Development scaffold in under 3 minutes. Click Next to start.</p>}

      {step === 1 && (
        <>
          <label>Project name *</label>
          <input data-testid="project-name" value={data.project.name}
            onChange={(e) => set({ project: { ...data.project, name: e.target.value } })} />
          <label>Description *</label>
          <textarea value={data.project.description}
            onChange={(e) => set({ project: { ...data.project, description: e.target.value } })} />
          <label>Problem statement</label>
          <textarea value={data.project.problem}
            onChange={(e) => set({ project: { ...data.project, problem: e.target.value } })} />
        </>
      )}

      {step === 2 && (
        <>
          <label>Frontend *</label>
          <input value={data.stack.frontend}
            onChange={(e) => set({ stack: { ...data.stack, frontend: e.target.value } })} />
          <label>Backend</label>
          <input value={data.stack.backend}
            onChange={(e) => set({ stack: { ...data.stack, backend: e.target.value } })} />
          <label>Testing</label>
          <input value={data.stack.testing}
            onChange={(e) => set({ stack: { ...data.stack, testing: e.target.value } })} />
          <label>Database</label>
          <input value={data.stack.database}
            onChange={(e) => set({ stack: { ...data.stack, database: e.target.value } })} />
        </>
      )}

      {step === 3 && (
        <>
          <label>Principles (one per line)</label>
          <textarea value={data.principles.join('\n')}
            onChange={(e) => set({ principles: e.target.value.split('\n').filter(Boolean) })} />
        </>
      )}

      {step === 4 && (
        <>
          <label>MCP tools</label>
          {MCP_OPTIONS.map((m) => (
            <label key={m} style={{ fontWeight: 400 }}>
              <input type="checkbox" style={{ width: 'auto', marginRight: '.5rem' }}
                checked={data.mcp.includes(m)}
                onChange={(e) => set({ mcp: e.target.checked ? [...data.mcp, m] : data.mcp.filter((x) => x !== m) })} />
              {m}
            </label>
          ))}
        </>
      )}

      {step === 5 && (
        <>
          <label>Primary agent</label>
          <select value={data.agent.primary}
            onChange={(e) => set({ agent: { ...data.agent, primary: e.target.value } })}>
            {AGENTS.map((a) => <option key={a}>{a}</option>)}
          </select>
          <label>Default model</label>
          <input value={data.agent.model}
            onChange={(e) => set({ agent: { ...data.agent, model: e.target.value } })} />
        </>
      )}

      {step === 6 && (
        <>
          <label>Data classification</label>
          <select value={data.security.classification}
            onChange={(e) => set({ security: { ...data.security, classification: e.target.value } })}>
            {['public', 'internal', 'confidential', 'restricted'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </>
      )}

      {step === 7 && (
        <>
          <p>{Object.keys(files).length} files ready.</p>
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

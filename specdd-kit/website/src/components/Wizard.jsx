import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import kitFiles from '../data/kit-files.json';
import { generateScaffold } from './generators.js';
import { stepsFor, errorFor as stepError, TOOLS, OWASP_CONTROLS } from './steps.js';
import ChipInput from './ChipInput.jsx';
import IngestStep from './IngestStep.jsx';
import { DEFAULT_ANALYSIS_DEPTH } from './analysis.js';
import Stepper from '@specdd/ui/stepper';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

const MCP_OPTIONS = ['github', 'sonarqube', 'context7', 'postgresql', 'playwright', 'figma'];

const initial = {
  scenario: 'greenfield',
  analysisDepth: DEFAULT_ANALYSIS_DEPTH, analysis: null, existingPaths: [], legacyAck: false,
  project: { name: '', description: '', problem: '' },
  personas: [], outcomes: { user: '', business: '' },
  constraints: { business: '', technical: '' },
  domains: [], entities: [], features: [],
  stack: { languages: [], frontend: '', backend: '', testing: '', database: '', infra: '', swagger: false, a11y: false },
  principles: ['Specifications are the source of truth'],
  mcp: [], tools: ['GitHub Copilot'], model: '',
  security: { classification: 'internal', owaspControls: [] },
};

const pad2 = (n) => String(n).padStart(2, '0');

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  const steps = stepsFor(data.scenario);
  const stepName = steps[step];
  const isStepValid = (i) => stepError(steps[i], data) === '';
  function next() {
    const e = stepError(stepName, data);
    if (e) { setError(e); return; }
    setError('');
    const target = Math.min(step + 1, steps.length - 1);
    setStep(target);
    setMaxVisited((m) => Math.max(m, target));
  }
  function back() { setError(''); setStep((s) => Math.max(s - 1, 0)); }
  function jump(i) { if (i <= maxVisited) { setError(''); setStep(i); } }
  function chooseScenario(scenario) {
    set({ scenario });
    setMaxVisited((m) => Math.min(m, 1)); // steps after Scenario differ per branch — revisit them
  }
  function applyAnalysis(analysis, existingPaths) {
    setData((d) => ({
      ...d,
      analysisDepth: analysis.analysisDepth || d.analysisDepth,
      analysis, existingPaths, legacyAck: false,
      project: {
        ...d.project,
        name: analysis.projectName || d.project.name,
        description: analysis.description || d.project.description,
      },
      stack: {
        ...d.stack,
        frontend: analysis.stack.frontend || d.stack.frontend,
        backend: analysis.stack.backend || d.stack.backend,
        testing: analysis.stack.testing || d.stack.testing,
        database: analysis.stack.database || d.stack.database,
        languages: analysis.stack.languages.length ? analysis.stack.languages : d.stack.languages,
      },
      domains: analysis.domains.length ? analysis.domains : d.domains,
      entities: analysis.entities.length ? analysis.entities : d.entities,
    }));
  }

  const last = step === steps.length - 1;
  const needsScaffold = last || stepName === 'Ingest & Analyze';
  const { files, skipped, replaced } = needsScaffold ? generateScaffold(kitFiles, data) : { files: {}, skipped: [], replaced: [] };

  async function download() {
    const zip = new JSZip();
    for (const [path, contents] of Object.entries(generateScaffold(kitFiles, data).files)) zip.file(path, contents);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.project.name || 'sdd-kit'}-scaffold.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="b-shell" data-ready={ready ? 'true' : 'false'}>
      <aside className="b-sidebar">
        <div className="b-brand">SDD Kit Wizard</div>
        <div className="b-sidebar__eyebrow">STEP {pad2(step + 1)} / {pad2(steps.length)}</div>
        <Stepper steps={steps} current={step} isValid={isStepValid} maxVisited={maxVisited} onJump={jump} />
      </aside>

      <main className="b-main">
        <div className="b-main__eyebrow">STEP {pad2(step + 1)} · {stepName.toUpperCase()}</div>
        <h2 className="b-main__title" data-testid="step-title">{stepName}</h2>

        <div className="b-main__body">
          {stepName === 'Welcome' && <p className="b-lead">Generate a Spec-Driven Development scaffold in under 3 minutes. Click Next to start.</p>}

          {stepName === 'Scenario' && (
            <div className="b-cards">
              <button type="button" data-testid="scenario-greenfield"
                className={`b-card ${data.scenario === 'greenfield' ? 'b-card--active' : ''}`}
                onClick={() => chooseScenario('greenfield')}>
                <strong>Greenfield</strong>
                <p>New project — pour in all the context you have and get a fully personalized harness scaffold.</p>
              </button>
              <button type="button" data-testid="scenario-brownfield"
                className={`b-card ${data.scenario === 'brownfield' ? 'b-card--active' : ''}`}
                onClick={() => chooseScenario('brownfield')}>
                <strong>Brownfield</strong>
                <p>Existing project — pick your folder and the wizard analyzes it in your browser to pre-fill the flow.</p>
              </button>
            </div>
          )}

          {stepName === 'Ingest & Analyze' && (
            <IngestStep data={data} skippedCount={skipped.length} replacedCount={replaced.length}
              onAnalyzed={applyAnalysis} onAck={(v) => set({ legacyAck: v })}
              onAnalysisDepthChange={(analysisDepth) => set({ analysisDepth })} />
          )}

          {stepName === 'Project' && (
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
              <ChipInput label="Personas" values={data.personas} onChange={(v) => set({ personas: v })}
                placeholder="e.g. Admin — press Enter" testid="persona-input" />
              <label>User outcome</label>
              <input value={data.outcomes.user} onChange={(e) => set({ outcomes: { ...data.outcomes, user: e.target.value } })} />
              <label>Business outcome</label>
              <input value={data.outcomes.business} onChange={(e) => set({ outcomes: { ...data.outcomes, business: e.target.value } })} />
              <label>Business constraints</label>
              <input value={data.constraints.business} onChange={(e) => set({ constraints: { ...data.constraints, business: e.target.value } })} />
              <label>Technical constraints</label>
              <input value={data.constraints.technical} onChange={(e) => set({ constraints: { ...data.constraints, technical: e.target.value } })} />
            </>
          )}

          {stepName === 'Tech Stack' && (
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

          {stepName === 'Domains & Entities' && (
            <>
              <p className="b-lead">Domains become skills and routing rows; primary entities become spec placeholders.</p>
              <ChipInput label="Domains * (1–8, e.g. auth, billing)" values={data.domains}
                onChange={(v) => set({ domains: v })} placeholder="Type a domain, press Enter" testid="domain-input" />
              <ChipInput label="Primary entities (e.g. User, Invoice)" values={data.entities}
                onChange={(v) => set({ entities: v })} placeholder="Type an entity, press Enter" testid="entity-input" />
            </>
          )}

          {stepName === 'Features' && (
            <>
              <label>Initial features (one per line)</label>
              <textarea data-testid="features-input" value={data.features.join('\n')}
                onChange={(e) => set({ features: e.target.value.split('\n').filter(Boolean) })} />
            </>
          )}

          {stepName === 'Principles' && (
            <>
              <label>Principles (one per line)</label>
              <textarea value={data.principles.join('\n')}
                onChange={(e) => set({ principles: e.target.value.split('\n').filter(Boolean) })} />
            </>
          )}

          {stepName === 'MCP Tools' && (
            <>
              <label>MCP tools</label>
              {MCP_OPTIONS.map((m) => (
                <label className="b-check" key={m}>
                  <input type="checkbox" checked={data.mcp.includes(m)}
                    onChange={(e) => set({ mcp: e.target.checked ? [...data.mcp, m] : data.mcp.filter((x) => x !== m) })} />
                  {m}
                </label>
              ))}
            </>
          )}

          {stepName === 'Agents & Tools' && (
            <>
              <label>Team tools * (one pointer adapter is generated per tool)</label>
              {TOOLS.map((t) => (
                <label className="b-check" key={t}>
                  <input type="checkbox" data-testid={`tool-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    checked={data.tools.includes(t)}
                    onChange={(e) => set({ tools: e.target.checked ? [...data.tools, t] : data.tools.filter((x) => x !== t) })} />
                  {t}
                </label>
              ))}
              <label>Default model (informative)</label>
              <input value={data.model} onChange={(e) => set({ model: e.target.value })} />
            </>
          )}

          {stepName === 'Security' && (
            <>
              <label>Data classification</label>
              <select value={data.security.classification}
                onChange={(e) => set({ security: { ...data.security, classification: e.target.value } })}>
                {['public', 'internal', 'confidential', 'restricted'].map((c) => <option key={c}>{c}</option>)}
              </select>
              <label>OWASP focus controls</label>
              {OWASP_CONTROLS.map((c) => (
                <label className="b-check" key={c}>
                  <input type="checkbox" checked={data.security.owaspControls.includes(c)}
                    onChange={(e) => set({ security: { ...data.security, owaspControls: e.target.checked ? [...data.security.owaspControls, c] : data.security.owaspControls.filter((x) => x !== c) } })} />
                  {c}
                </label>
              ))}
            </>
          )}

          {stepName === 'Preview / Download' && (() => {
            const paths = Object.keys(files).sort();
            const isHarness = (p) => p === 'AGENTS.md' || p === 'CLAUDE.md' || p === 'GEMINI.md' || p.startsWith('.agents/');
            const isCopilot = (p) => p.startsWith('.github/');
            const groups = [
              ['Harness core & adapters', paths.filter(isHarness)],
              ['Copilot projection', paths.filter(isCopilot)],
              ['Project content', paths.filter((p) => !isHarness(p) && !isCopilot(p))],
            ].filter(([, items]) => items.length > 0);
            return (
              <>
                <p className="b-lead">{paths.length} files ready.</p>
                <div data-testid="preview">
                  {groups.map(([title, items]) => (
                    <details key={title} open>
                      <summary>{title} ({items.length})</summary>
                      <pre className="b-preview">{items.join('\n')}</pre>
                    </details>
                  ))}
                  {skipped.length > 0 && (
                    <details data-testid="skipped-group" open>
                      <summary>Skipped — already exist in your project ({skipped.length})</summary>
                      <pre className="b-preview">{skipped.join('\n')}</pre>
                    </details>
                  )}
                  {replaced.length > 0 && (
                    <details data-testid="replaced-group" open>
                      <summary>Replaced — legacy harness files ({replaced.length})</summary>
                      <pre className="b-preview">{replaced.join('\n')}</pre>
                    </details>
                  )}
                </div>
              </>
            );
          })()}
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

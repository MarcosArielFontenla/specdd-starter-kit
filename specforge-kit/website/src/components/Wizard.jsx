import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import skills from '../data/skills.json';
import { generatePack } from './generators.js';
import { stepsFor, errorFor as stepError, ROLES, ROLE_SKILLS, TOOLS } from './roles.js';
import TargetStep from './TargetStep.jsx';
import Stepper from '@specdd/ui/stepper';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

const initial = {
  targetPaths: [], harness: { specdd: false, legacy: false }, targetName: '',
  roles: [], qa: { approach: 'manual' }, ux: { figmaEnabled: false },
  skillsByRole: {},
  tools: ['GitHub Copilot'],
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const pad2 = (n) => String(n).padStart(2, '0');

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  const steps = stepsFor(data);
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

  function toggleRole(role) {
    setData((d) => {
      const on = d.roles.includes(role);
      const roles = on ? d.roles.filter((r) => r !== role) : [...d.roles, role];
      const skillsByRole = { ...d.skillsByRole };
      if (on) delete skillsByRole[role];
      else skillsByRole[role] = [...ROLE_SKILLS[role]];
      return { ...d, roles, skillsByRole };
    });
    // Step list length can change (Role Options) — keep navigation on solid ground.
    setMaxVisited((m) => Math.min(m, 2));
  }

  function onTarget(targetPaths, harness, targetName) {
    set({ targetPaths, harness, targetName });
  }

  const last = step === steps.length - 1;
  const { files, skipped } = last ? generatePack(skills, data) : { files: {}, skipped: [] };

  async function download() {
    const zip = new JSZip();
    for (const [path, contents] of Object.entries(generatePack(skills, data).files)) zip.file(path, contents);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.targetName || 'specforge'}-role-pack.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="b-shell" data-ready={ready ? 'true' : 'false'}>
      <aside className="b-sidebar">
        <div className="b-brand">SpecForge Wizard</div>
        <div className="b-sidebar__eyebrow">STEP {pad2(step + 1)} / {pad2(steps.length)}</div>
        <Stepper steps={steps} current={step} isValid={isStepValid} maxVisited={maxVisited} onJump={jump} />
      </aside>

      <main className="b-main">
        <div className="b-main__eyebrow">STEP {pad2(step + 1)} · {stepName.toUpperCase()}</div>
        <h2 className="b-main__title" data-testid="step-title">{stepName}</h2>

        <div className="b-main__body">
          {stepName === 'Welcome' && (
            <p className="b-lead">
              Build a Role Pack for your SpecDD Harness project: per-role skills,
              playbooks, workflows and subagent seeds for BA, QA, Dev and UX. Click
              Next to start.
            </p>
          )}

          {stepName === 'Target Project' && <TargetStep data={data} onTarget={onTarget} />}

          {stepName === 'Roles' && (
            <div className="b-personas">
              {ROLES.map((r) => (
                <button key={r} data-testid={`role-${slug(r)}`}
                  className={`b-persona${data.roles.includes(r) ? ' b-persona--active' : ''}`}
                  onClick={() => toggleRole(r)}>{r}</button>
              ))}
            </div>
          )}

          {stepName === 'Role Options' && (
            <>
              {data.roles.includes('QA') && (
                <>
                  <label>QA test approach</label>
                  <select value={data.qa.approach}
                    onChange={(e) => set({ qa: { ...data.qa, approach: e.target.value } })}>
                    {['manual', 'automated', 'manual + automated'].map((a) => <option key={a}>{a}</option>)}
                  </select>
                </>
              )}
              {data.roles.includes('UX') && (
                <label className="b-check">
                  <input type="checkbox" checked={data.ux.figmaEnabled}
                    onChange={(e) => set({ ux: { ...data.ux, figmaEnabled: e.target.checked } })} /> Figma enabled
                </label>
              )}
            </>
          )}

          {stepName === 'Skills' && data.roles.map((role) => (
            <div key={role}>
              <label>{role} playbooks</label>
              {ROLE_SKILLS[role].map((s) => (
                <label className="b-check" key={s}>
                  <input type="checkbox"
                    checked={(data.skillsByRole[role] || []).includes(s)}
                    onChange={(e) => {
                      const cur = data.skillsByRole[role] || [];
                      set({ skillsByRole: { ...data.skillsByRole, [role]: e.target.checked ? [...cur, s] : cur.filter((x) => x !== s) } });
                    }} />
                  {s}
                </label>
              ))}
            </div>
          ))}

          {stepName === 'Tools' && (
            <>
              <label>Team tools * (drives the Copilot projection)</label>
              {TOOLS.map((t) => (
                <label className="b-check" key={t}>
                  <input type="checkbox" data-testid={`tool-${slug(t)}`}
                    checked={data.tools.includes(t)}
                    onChange={(e) => set({ tools: e.target.checked ? [...data.tools, t] : data.tools.filter((x) => x !== t) })} />
                  {t}
                </label>
              ))}
            </>
          )}

          {stepName === 'Preview / Download' && (() => {
            const paths = Object.keys(files).sort();
            const isProjection = (p) => p.startsWith('.github/');
            const groups = [
              ['Role pack', paths.filter((p) => !isProjection(p))],
              ['Copilot projection', paths.filter(isProjection)],
            ].filter(([, items]) => items.length > 0);
            return (
              <>
                <p className="b-lead">{paths.length} files ready for roles: {data.roles.join(', ')}.</p>
                <div data-testid="preview">
                  {groups.map(([title, items]) => (
                    <details key={title} open>
                      <summary>{title} ({items.length})</summary>
                      <pre className="b-preview">{items.join('\n')}</pre>
                    </details>
                  ))}
                  {skipped.length > 0 && (
                    <details data-testid="skipped-group" open>
                      <summary>Skipped — already exist in the target ({skipped.length})</summary>
                      <pre className="b-preview">{skipped.join('\n')}</pre>
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

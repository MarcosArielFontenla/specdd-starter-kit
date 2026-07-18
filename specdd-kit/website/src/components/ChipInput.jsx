import { useState } from 'react';

// Text input that turns Enter/comma into removable chips. Controlled via values/onChange.
export default function ChipInput({ label, values, onChange, placeholder, testid }) {
  const [draft, setDraft] = useState('');

  function commit() {
    const v = draft.trim().replace(/,+$/, '');
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  }
  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
    if (e.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1));
  }

  return (
    <>
      <label>{label}</label>
      <div className="b-chips">
        {values.map((v) => (
          <button type="button" className="b-chip" key={v} onClick={() => onChange(values.filter((x) => x !== v))}>
            {v} ×
          </button>
        ))}
        <input data-testid={testid} value={draft} placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} onBlur={commit} />
      </div>
    </>
  );
}

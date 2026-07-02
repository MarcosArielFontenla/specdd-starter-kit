import { Check, Circle } from 'lucide-react';

export default function Stepper({ steps, current, isValid, maxVisited, onJump }) {
  return (
    <ol className="b-stepper">
      {steps.map((label, i) => {
        const visited = i <= maxVisited;
        const active = i === current;
        const done = visited && !active && isValid(i);
        const state = active ? 'active' : done ? 'done' : visited ? 'visited' : 'upcoming';
        return (
          <li key={label}>
            <button
              type="button"
              className={`b-step b-step--${state}`}
              data-testid={`step-nav-${i}`}
              data-state={state}
              disabled={!visited}
              aria-current={active ? 'step' : undefined}
              onClick={() => { if (visited) onJump(i); }}
            >
              <span className="b-step__icon">
                {done ? <Check size={16} /> : active ? <span className="b-step__dot" /> : <Circle size={16} />}
              </span>
              <span className="b-step__label">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

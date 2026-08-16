import { REVIEW_STATUSES, reviewStatusLabel } from './review.js';

function updateItem(review, group, index, patch, onChange) {
  onChange({
    ...review,
    approved: false,
    [group]: review[group].map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  });
}

function FindingList({ group, title, items, review, onChange }) {
  return (
    <section className="b-review-section">
      <div className="b-review-section__heading">
        <h3>{title}</h3>
        <span>{items.length} detected</span>
      </div>
      {items.length === 0 && <p className="b-review-empty">No findings were detected for this category.</p>}
      <div className="b-review-list">
        {items.map((item, index) => (
          <article className={`b-review-item${item.selected ? '' : ' b-review-item--excluded'}`} key={`${group}-${index}`}>
            <div className="b-review-item__main">
              {group === 'stack' ? (
                <>
                  <strong>{item.label}</strong>
                  <input
                    aria-label={`${item.label} value`}
                    value={item.value}
                    onChange={(event) => updateItem(review, group, index, { value: event.target.value }, onChange)}
                  />
                </>
              ) : (
                <input
                  aria-label={`${title} finding ${index + 1}`}
                  value={item.value}
                  onChange={(event) => updateItem(review, group, index, { value: event.target.value }, onChange)}
                />
              )}
              <small>{item.source} · confidence: {item.confidence}</small>
            </div>
            <div className="b-review-item__controls">
              <label className="b-review-item__include">
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={(event) => updateItem(review, group, index, { selected: event.target.checked }, onChange)}
                />
                Keep
              </label>
              <select
                aria-label={`${title} status ${index + 1}`}
                value={item.status}
                onChange={(event) => updateItem(review, group, index, { status: event.target.value }, onChange)}
              >
                {REVIEW_STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
              </select>
              <span className="b-review-item__status">{reviewStatusLabel(item.status)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function ContextReviewStep({ data, onReviewChange, onApprove }) {
  const review = data.contextReview;
  if (!review) return <p className="b-error">Run the analysis before reviewing its context.</p>;
  const semantic = data.analysis?.semantic;
  const update = (next) => onReviewChange(next);
  const listProps = (group, title) => ({
    group,
    title,
    review,
    items: review[group] || [],
    onChange: update,
  });

  return (
    <div className="b-review" data-testid="context-review">
      <p className="b-lead">
        Review the detected context before the Harness is generated. Keep only what belongs
        to the project and classify each finding based on its current state.
      </p>
      <div className="b-review-summary">
        <strong>{semantic ? `Level 2 confidence: ${semantic.confidence}` : 'Structural context review'}</strong>
        <span>{semantic ? `${semantic.filesRead.length} safe files read · ${semantic.evidence.length} evidence items` : 'No semantic evidence was requested.'}</span>
      </div>
      <FindingList {...listProps('stack', 'Technology stack')} />
      <FindingList {...listProps('domains', 'Domains')} />
      <FindingList {...listProps('entities', 'Primary entities')} />
      <FindingList {...listProps('features', 'Features')} />
      <FindingList {...listProps('architecture', 'Architecture signals')} />
      <div className="b-review__footer">
        <p className="b-help">Approval applies the selected names to the next wizard steps and preserves their classifications in the Brownfield report.</p>
        <button type="button" className="b-btn b-btn--primary" data-testid="context-approve" onClick={() => onApprove(review)}>
          {review.approved ? 'Context approved' : 'Approve context'}
        </button>
      </div>
    </div>
  );
}

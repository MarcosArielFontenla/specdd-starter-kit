import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyReviewedContext, classifySelectedContext, createContextReview, reviewStatusLabel, selectedUnknownCount } from './review.js';

const analysis = {
  stack: { frontend: 'React', backend: 'ASP.NET Core', testing: 'xUnit', database: 'PostgreSQL' },
  domains: ['Catalog', 'Inventory'],
  entities: ['Product', 'InventoryItem'],
  features: ['catalog', 'inventory'],
  semantic: {
    evidence: [{ category: 'stack', value: 'React', source: 'README.md', confidence: 'high' }],
    architecture: [{ value: 'Modular monolith', source: 'architecture.md', confidence: 'high' }],
  },
};

test('context review creates editable, unapproved findings with evidence', () => {
  const review = createContextReview(analysis);
  assert.equal(review.approved, false);
  assert.deepEqual(review.domains.map((item) => item.value), ['Catalog', 'Inventory']);
  assert.equal(review.stack.find((item) => item.field === 'frontend').source, 'README.md');
  assert.equal(review.stack[0].status, 'unknown');
  assert.equal(review.entities[0].selected, true);
  assert.equal(review.architecture[0].value, 'Modular monolith');
});

test('approved context keeps only selected findings and updates the harness input', () => {
  const review = createContextReview(analysis);
  review.domains[0].status = 'implemented';
  review.domains[1].selected = false;
  review.entities[0].selected = false;
  review.features[1].status = 'planned';
  review.stack[1].value = 'ASP.NET Core / .NET 10';
  const result = applyReviewedContext({ stack: {}, domains: [], entities: [], features: [] }, review);
  assert.equal(result.contextReview.approved, true);
  assert.deepEqual(result.domains, ['Catalog']);
  assert.deepEqual(result.entities, ['InventoryItem']);
  assert.deepEqual(result.features, ['catalog', 'inventory']);
  assert.equal(result.stack.backend, 'ASP.NET Core / .NET 10');
  assert.deepEqual(result.architecture, ['Modular monolith']);
});

test('unknown review status has a safe label', () => {
  assert.equal(reviewStatusLabel('planned'), 'Planned');
  assert.equal(reviewStatusLabel('not-a-status'), 'Unknown / verify');
});

test('bulk classification requires an explicit action and uses category-safe defaults', () => {
  const review = createContextReview(analysis);
  assert.ok(selectedUnknownCount(review) > 0);
  const classified = classifySelectedContext(review);
  assert.equal(selectedUnknownCount(classified), 0);
  assert.ok(classified.stack.every((item) => item.status === 'implemented'));
  assert.ok(classified.architecture.every((item) => item.status === 'architectural'));
});

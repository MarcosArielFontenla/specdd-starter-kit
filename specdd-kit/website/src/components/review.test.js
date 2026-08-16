import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyReviewedContext, createContextReview, reviewStatusLabel } from './review.js';

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

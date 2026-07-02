import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate } from './render-template.js';

test('replaces {{var}} including dotted paths', () => {
  const out = renderTemplate('Deploy {{app.name}} to {{region}}', { app: { name: 'Demo' }, region: 'westeurope' });
  assert.equal(out, 'Deploy Demo to westeurope');
});

test('{{#if}} keeps block when truthy, drops when falsy (inline and block form)', () => {
  const t = 'branches: [main{{#if envDev}}, develop{{/if}}]';
  assert.equal(renderTemplate(t, { envDev: true }), 'branches: [main, develop]');
  assert.equal(renderTemplate(t, { envDev: false }), 'branches: [main]');
  const block = 'a\n{{#if api}}\napi: yes\n{{/if}}\nb';
  assert.match(renderTemplate(block, { api: true }), /api: yes/);
  assert.ok(!renderTemplate(block, { api: false }).includes('api: yes'));
});

test('throws on unresolved placeholder', () => {
  assert.throws(() => renderTemplate('hello {{missing}}', {}), /unresolved/);
});

test('leaves GitHub Actions ${{ }} expressions untouched', () => {
  const t = 'token: ${{ secrets.MY_TOKEN }}';
  assert.equal(renderTemplate(t, {}), t);
});

test('vars inside a kept if-block are rendered', () => {
  const out = renderTemplate('{{#if api}}dir: {{app.apiDir}}{{/if}}', { api: true, app: { apiDir: 'api' } });
  assert.equal(out, 'dir: api');
});

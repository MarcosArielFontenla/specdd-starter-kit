import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

test('Azure SWA + GitHub Actions walkthrough downloads a deploy ZIP', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();
  await expect(page.getByTestId('step-title')).toHaveText('Welcome');

  await page.getByTestId('next-btn').click(); // -> App
  await page.getByTestId('next-btn').click(); // blocked (no app name)
  await expect(page.getByTestId('error')).toBeVisible();
  await page.getByTestId('app-name').fill('Demo Site');
  await page.getByTestId('next-btn').click(); // -> Target

  await page.getByTestId('provider-azure-swa').click();
  await page.getByTestId('field-appName').fill('demo-site');
  await page.getByTestId('field-resourceGroup').fill('rg-demo');
  await page.getByTestId('next-btn').click(); // -> CI/CD

  await expect(page.getByTestId('ci-github-actions')).toBeChecked();
  await expect(page.getByTestId('delivery-enabled')).not.toBeChecked();
  await page.getByTestId('next-btn').click(); // -> Security

  await expect(page.getByTestId('secrets-list')).toContainText('AZURE_STATIC_WEB_APPS_API_TOKEN');
  await page.getByTestId('next-btn').click(); // blocked (no ack)
  await expect(page.getByTestId('error')).toBeVisible();
  await page.getByTestId('ack').check();
  await page.getByTestId('next-btn').click(); // -> Review

  await expect(page.getByTestId('preview')).toContainText('.github/workflows/deploy.yml');
  await expect(page.getByTestId('preview')).toContainText('infra/main.bicep');
  await expect(page.getByTestId('preview')).toContainText('docs/deploy-runbook.md');
  await expect(page.getByTestId('preview')).toContainText('specdeploy.json');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toBe('demo-site-azure-swa.zip');
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  expect(Object.keys(zip.files).some(p => p.startsWith('delivery/'))).toBe(false);
});

test('optional delivery draft validates inputs, previews and downloads the exact graph', async ({ page }) => {
  await page.goto('/'); await page.locator('.b-shell[data-ready="true"]').waitFor();
  await page.getByTestId('next-btn').click(); await page.getByTestId('app-name').fill('Delivery Demo');
  await page.getByTestId('next-btn').click(); await page.getByTestId('provider-vercel').click();
  await page.getByTestId('field-projectName').fill('demo'); await page.getByTestId('next-btn').click();
  await page.getByTestId('delivery-enabled').check();
  await expect(page.getByTestId('delivery-warning')).toContainText('Not executable');
  await page.getByTestId('next-btn').click(); await expect(page.getByTestId('step-title')).toHaveText('CI/CD');
  for (const [key, value] of Object.entries({ projectId: 'demo-project', repositoryRef: 'demo-repo', sourceRevision: 'a'.repeat(40), stagingDestinationRef: 'demo-stage', productionDestinationRef: 'demo-stage' })) await page.getByTestId(`delivery-${key}`).fill(value);
  await page.getByTestId('next-btn').click(); await expect(page.getByTestId('error')).toContainText('must be different');
  await page.getByTestId('delivery-productionDestinationRef').fill('demo-prod');
  await page.getByTestId('next-btn').click(); await page.getByTestId('ack').check(); await page.getByTestId('next-btn').click();
  await expect(page.getByTestId('download-btn')).toBeEnabled();
  await expect(page.getByTestId('preview')).toContainText('delivery/control-plane.json');
  await expect(page.getByTestId('delivery-review-warning')).toContainText('not executable');
  await page.getByTestId('preview-select').selectOption('delivery/projection.json');
  const preview = await page.getByTestId('preview-content').textContent();
  expect(JSON.parse(preview).executable).toBe(false);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-btn').click()]);
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  expect(await zip.file('delivery/projection.json').async('string')).toBe(preview);
  const definition = JSON.parse(await zip.file('delivery/definition.json').async('string'));
  expect(definition.environments.map(e => e.destinationRef)).toEqual(['demo-stage', 'demo-prod']);
  expect(definition.release.artifactSha256).toBe(null);
  // Returning to CI/CD and disabling restores the legacy-only ZIP preview.
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByTestId('delivery-enabled').uncheck(); await page.getByTestId('next-btn').click(); await page.getByTestId('next-btn').click();
  await expect(page.getByTestId('download-btn')).toBeEnabled();
  await expect(page.getByTestId('preview')).not.toContainText('delivery/definition.json');
});

test('vercel provider hides Azure Pipelines (ci filtering)', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();
  await page.getByTestId('next-btn').click();
  await page.getByTestId('app-name').fill('Demo');
  await page.getByTestId('next-btn').click();
  await page.getByTestId('provider-vercel').click();
  await page.getByTestId('field-projectName').fill('demo');
  await page.getByTestId('next-btn').click(); // -> CI/CD
  await expect(page.getByTestId('ci-github-actions')).toBeVisible();
  await expect(page.getByTestId('ci-azure-pipelines')).toHaveCount(0);
});

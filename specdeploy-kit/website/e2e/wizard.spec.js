import { test, expect } from '@playwright/test';

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

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const noDomainFixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'specdd-kit', 'website', 'e2e', 'fixtures', 'brownfield-no-domain',
);

for (const route of ['specdd', 'specforge', 'specdeploy']) {
  test(`/${route} mounts its wizard`, async ({ page }) => {
    await page.goto(`/${route}`);
    await page.locator('.b-shell[data-ready="true"]').waitFor();
    await expect(page.getByTestId('step-title')).toHaveText('Welcome');
  });
}

test('landing shows hero, three wizard cards and the SDD flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.p-hero h1')).toHaveText('SpecDD Platform');
  await expect(page.getByTestId('card-specdd')).toHaveAttribute('href', '/specdd');
  await expect(page.getByTestId('card-specforge')).toHaveAttribute('href', '/specforge');
  await expect(page.getByTestId('card-specdeploy')).toHaveAttribute('href', '/specdeploy');
  await expect(page.locator('.p-flow')).toContainText('constitution');
});

test('/specdd keeps a Brownfield analysis without inferred domains usable', async ({ page }) => {
  await page.goto('/specdd');
  await page.locator('.b-shell[data-ready="true"]').waitFor();
  await page.getByTestId('next-btn').click();
  await page.getByTestId('scenario-brownfield').click();
  await page.getByTestId('next-btn').click();

  await page.getByTestId('folder-input').setInputFiles(noDomainFixtureDir);
  await expect(page.getByTestId('analysis-summary')).toContainText('0 domains');
  await expect(page.getByTestId('analysis-summary')).toContainText('Pending required project context');
  await page.getByTestId('next-btn').click();
  await expect(page.getByTestId('step-title')).toHaveText('Review Context');
});

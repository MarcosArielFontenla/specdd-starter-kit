import { test, expect } from '@playwright/test';

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

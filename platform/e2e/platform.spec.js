import { test, expect } from '@playwright/test';

for (const route of ['specdd', 'specforge', 'specdeploy']) {
  test(`/${route} mounts its wizard`, async ({ page }) => {
    await page.goto(`/${route}`);
    await page.locator('.b-shell[data-ready="true"]').waitFor();
    await expect(page.getByTestId('step-title')).toHaveText('Welcome');
  });
}

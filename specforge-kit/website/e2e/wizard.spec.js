import { test, expect } from '@playwright/test';

test('BA persona walkthrough downloads a scaffold ZIP', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();
  await expect(page.getByTestId('step-title')).toHaveText('Welcome');

  await page.getByTestId('next-btn').click(); // -> Persona
  await page.getByTestId('next-btn').click(); // blocked (no persona)
  await expect(page.getByTestId('error')).toBeVisible();
  await page.getByTestId('persona-BA').click();
  await page.getByTestId('next-btn').click(); // -> Role
  await page.getByTestId('feature-title').fill('Login');
  await page.getByTestId('next-btn').click(); // -> Context
  await page.getByTestId('next-btn').click(); // -> Governance
  await page.getByTestId('next-btn').click(); // -> Review

  await expect(page.getByTestId('preview')).toContainText('context/login.md');
  await expect(page.getByTestId('preview')).toContainText('specforge-requirements.prompt.md');

  // Boreal stepper: the Persona step is marked done and is clickable
  await expect(page.getByTestId('step-nav-1')).toHaveAttribute('data-state', 'done');
  await page.getByTestId('step-nav-1').click();
  await expect(page.getByTestId('step-title')).toHaveText('Persona');
  await page.getByTestId('step-nav-5').click(); // back to Review (visited)
  await expect(page.getByTestId('step-title')).toHaveText('Review');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('BA.zip');
});

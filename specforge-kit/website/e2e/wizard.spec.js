import { test, expect } from '@playwright/test';

test('BA persona walkthrough downloads a scaffold ZIP', async ({ page }) => {
  await page.goto('/');
  await page.locator('main.wizard[data-ready="true"]').waitFor();
  await expect(page.getByTestId('step-title')).toHaveText('Welcome');

  await page.getByTestId('next-btn').click();           // -> Persona
  await page.getByTestId('next-btn').click();            // blocked (no persona)
  await expect(page.getByTestId('error')).toBeVisible();
  await page.getByTestId('persona-BA').click();
  await page.getByTestId('next-btn').click();            // -> Role
  await page.getByTestId('feature-title').fill('Login');
  await page.getByTestId('next-btn').click();            // -> Context
  await page.getByTestId('next-btn').click();            // -> Governance
  await page.getByTestId('next-btn').click();            // -> Review

  await expect(page.getByTestId('preview')).toContainText('context/login.md');
  await expect(page.getByTestId('preview')).toContainText('specforge-requirements.prompt.md');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('BA.zip');
});

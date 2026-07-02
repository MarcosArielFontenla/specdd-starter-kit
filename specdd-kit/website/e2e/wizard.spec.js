import { test, expect } from '@playwright/test';

test('wizard walks steps and downloads a scaffold ZIP', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();
  await expect(page.getByTestId('step-title')).toHaveText('Welcome');

  await page.getByTestId('next-btn').click(); // -> Project
  await page.getByTestId('next-btn').click(); // validation blocks (name empty)
  await expect(page.getByTestId('error')).toBeVisible();

  await page.getByTestId('project-name').fill('Acme');
  await page.locator('textarea').first().fill('An SDD project');
  await page.getByTestId('next-btn').click(); // -> Tech Stack
  await page.locator('.b-main__body input').first().fill('React');
  await page.getByTestId('next-btn').click(); // -> Principles
  await page.getByTestId('next-btn').click(); // -> MCP
  await page.getByTestId('next-btn').click(); // -> Agent
  await page.getByTestId('next-btn').click(); // -> Security
  await page.getByTestId('next-btn').click(); // -> Preview

  await expect(page.getByTestId('preview')).toContainText('context/project.md');

  // Boreal stepper: completed steps are marked done and are clickable
  await expect(page.getByTestId('step-nav-1')).toHaveAttribute('data-state', 'done');
  await page.getByTestId('step-nav-1').click();
  await expect(page.getByTestId('step-title')).toHaveText('Project');
  await page.getByTestId('step-nav-7').click(); // jump forward to a visited step
  await expect(page.getByTestId('step-title')).toHaveText('Preview / Download');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('scaffold.zip');
});

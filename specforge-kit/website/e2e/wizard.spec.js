import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const targetDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'harness-target');

test('standalone multi-role pack: roles gate, conditional options, ZIP download', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();
  await expect(page.getByTestId('step-title')).toHaveText('Welcome');

  await page.getByTestId('next-btn').click(); // -> Target Project (optional, skipped)
  await page.getByTestId('next-btn').click(); // -> Roles

  await page.getByTestId('next-btn').click(); // validation blocks (no roles)
  await expect(page.getByTestId('error')).toBeVisible();

  await page.getByTestId('role-qa').click();
  await page.getByTestId('role-dev').click();
  await page.getByTestId('next-btn').click(); // -> Role Options (QA selected)
  await page.locator('select').selectOption('automated');
  await page.getByTestId('next-btn').click(); // -> Skills (preselected)
  await page.getByTestId('next-btn').click(); // -> Tools (Copilot preselected)
  await page.getByTestId('next-btn').click(); // -> Preview

  await expect(page.getByTestId('preview')).toContainText('.agents/skills/role-qa/SKILL.md');
  await expect(page.getByTestId('preview')).toContainText('.agents/workflows/role-qa/specforge-playwright.md');
  await expect(page.getByTestId('preview')).toContainText('.agents/specs/tasks/role-pack-install.tasks.md');
  await expect(page.getByTestId('preview')).toContainText('.github/prompts/specforge-implement.prompt.md');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('role-pack.zip');
});

test('target ingestion: harness detected, colliding rubric skipped', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();

  await page.getByTestId('next-btn').click(); // -> Target Project
  await page.getByTestId('folder-input').setInputFiles(targetDir);
  await expect(page.getByTestId('target-status')).toContainText('SpecDD Harness detected');
  await page.getByTestId('next-btn').click(); // -> Roles

  await page.getByTestId('role-qa').click();
  await page.getByTestId('next-btn').click(); // -> Role Options
  await page.getByTestId('next-btn').click(); // -> Skills
  await page.getByTestId('next-btn').click(); // -> Tools
  await page.getByTestId('next-btn').click(); // -> Preview

  await expect(page.getByTestId('skipped-group')).toContainText('.agents/evals/rubrics/role-qa.yaml');
  await expect(page.getByTestId('preview')).toContainText('context/role-pack-report.md');
});

import { test, expect } from '@playwright/test';

test('greenfield wizard walks all steps and downloads a harness scaffold ZIP', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();
  await expect(page.getByTestId('step-title')).toHaveText('Welcome');

  await page.getByTestId('next-btn').click(); // -> Scenario
  await expect(page.getByTestId('scenario-brownfield')).toBeEnabled();
  await page.getByTestId('next-btn').click(); // -> Project (greenfield preselected)

  await page.getByTestId('next-btn').click(); // validation blocks (name empty)
  await expect(page.getByTestId('error')).toBeVisible();
  await page.getByTestId('project-name').fill('Acme');
  await page.locator('textarea').first().fill('An SDD project');
  await page.getByTestId('next-btn').click(); // -> Tech Stack

  await page.locator('.b-main__body input').first().fill('React');
  await page.getByTestId('next-btn').click(); // -> Domains & Entities

  await page.getByTestId('next-btn').click(); // validation blocks (no domains)
  await expect(page.getByTestId('error')).toBeVisible();
  await page.getByTestId('domain-input').fill('auth');
  await page.getByTestId('domain-input').press('Enter');
  await page.getByTestId('entity-input').fill('User');
  await page.getByTestId('entity-input').press('Enter');
  await page.getByTestId('next-btn').click(); // -> Features

  await page.getByTestId('features-input').fill('User can sign up');
  await page.getByTestId('next-btn').click(); // -> Principles
  await page.getByTestId('next-btn').click(); // -> MCP Tools
  await page.getByTestId('next-btn').click(); // -> Agents & Tools (Copilot preselected)
  await page.getByTestId('next-btn').click(); // -> Security
  await page.getByTestId('next-btn').click(); // -> Preview

  await expect(page.getByTestId('preview')).toContainText('AGENTS.md');
  await expect(page.getByTestId('preview')).toContainText('.agents/skills/auth/SKILL.md');
  await expect(page.getByTestId('preview')).toContainText('.agents/specs/user.spec.yaml');
  await expect(page.getByTestId('preview')).toContainText('context/project.md');

  // Boreal stepper: completed steps are marked done and are clickable
  await expect(page.getByTestId('step-nav-2')).toHaveAttribute('data-state', 'done');
  await page.getByTestId('step-nav-2').click();
  await expect(page.getByTestId('step-title')).toHaveText('Project');
  await page.getByTestId('step-nav-10').click(); // jump forward to a visited step
  await expect(page.getByTestId('step-title')).toHaveText('Preview / Download');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('scaffold.zip');
});

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'brownfield-sample');
const legacyFixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'brownfield-legacy');

test('brownfield wizard analyzes a folder, pre-fills steps, skips collisions', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();

  await page.getByTestId('next-btn').click(); // -> Scenario
  await page.getByTestId('scenario-brownfield').click();
  await page.getByTestId('next-btn').click(); // -> Ingest & Analyze

  await expect(page.getByTestId('analysis-depth-structural')).toBeChecked();
  await expect(page.getByTestId('analysis-depth-semantic')).toBeDisabled();

  await page.getByTestId('next-btn').click(); // validation blocks (no folder yet)
  await expect(page.getByTestId('error')).toBeVisible();

  await page.getByTestId('folder-input').setInputFiles(fixtureDir);
  await expect(page.getByTestId('analysis-summary')).toBeVisible();
  await expect(page.getByTestId('analysis-summary')).toContainText('acme-shop');
  await page.getByTestId('next-btn').click(); // -> Project (pre-filled)

  await expect(page.getByTestId('project-name')).toHaveValue('acme-shop');
  await page.getByTestId('next-btn').click(); // -> Tech Stack (React pre-filled)
  await expect(page.locator('.b-main__body input').first()).toHaveValue('React');
  await page.getByTestId('next-btn').click(); // -> Domains & Entities (pre-suggested)
  await page.getByTestId('next-btn').click(); // -> Features
  await page.getByTestId('next-btn').click(); // -> Principles
  await page.getByTestId('next-btn').click(); // -> MCP Tools
  await page.getByTestId('next-btn').click(); // -> Agents & Tools
  await page.getByTestId('next-btn').click(); // -> Security
  await page.getByTestId('next-btn').click(); // -> Preview

  await expect(page.getByTestId('preview')).toContainText('.agents/workflows/spec-converge.md');
  await expect(page.getByTestId('preview')).toContainText('context/brownfield-analysis.md');
  await expect(page.getByTestId('preview')).toContainText('.agents/skills/auth/SKILL.md');
  await expect(page.getByTestId('skipped-group')).toContainText('README.md');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('scaffold.zip');
});

test('brownfield with legacy harness: warning gates next, replaced group and migration tasks appear', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();

  await page.getByTestId('next-btn').click(); // -> Scenario
  await page.getByTestId('scenario-brownfield').click();
  await page.getByTestId('next-btn').click(); // -> Ingest & Analyze

  await page.getByTestId('folder-input').setInputFiles(legacyFixtureDir);
  await expect(page.getByTestId('legacy-warning')).toBeVisible();
  await expect(page.getByTestId('legacy-warning')).toContainText('4 files');
  await expect(page.getByTestId('legacy-warning')).toContainText('1 knowledge file(s)');

  await page.getByTestId('next-btn').click(); // blocked: unacknowledged
  await expect(page.getByTestId('error')).toContainText(/deprecat/i);

  await page.getByTestId('legacy-ack').check();
  await page.getByTestId('next-btn').click(); // -> Project

  await page.getByTestId('next-btn').click(); // -> Tech Stack (react pre-filled)
  await page.getByTestId('next-btn').click(); // -> Domains & Entities (auth suggested)
  await page.getByTestId('next-btn').click(); // -> Features
  await page.getByTestId('next-btn').click(); // -> Principles
  await page.getByTestId('next-btn').click(); // -> MCP Tools
  await page.getByTestId('next-btn').click(); // -> Agents & Tools
  await page.getByTestId('next-btn').click(); // -> Security
  await page.getByTestId('next-btn').click(); // -> Preview

  await expect(page.getByTestId('preview')).toContainText('.agents/specs/tasks/harness-migration.tasks.md');
  await expect(page.getByTestId('replaced-group')).toContainText('AGENTS.md');
  await expect(page.getByTestId('skipped-group')).toContainText('README.md');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('scaffold.zip');
});

# specdeploy-kit — Setup

## Prerequisites

- Node.js 20+
- npm

## Run the wizard

```powershell
cd specdeploy-kit\website
npm install
npm run dev        # bundles providers automatically (predev), serves on :4323
```

## Tests

```powershell
npm run test:unit  # renderer, bundler, generators + full provider matrix
npm test           # Playwright e2e (npx playwright install chromium first, once)
npm run build      # production build
```

## Using the generated ZIP

1. Extract the ZIP at the root of the project you want to deploy.
2. Read `docs/deploy-runbook.md` — it lists prerequisites, the exact secret **names** to
   create in your CI system, first-deploy steps, verification and rollback.
3. Commit the generated files. Never commit secret values; `.env.example` documents names only.

## Adapting to a new company / stack

Write a provider folder (descriptor + templates) — no wizard code changes needed.
Full guide: `docs/provider-authoring.md`. The provider matrix test covers new providers
automatically.

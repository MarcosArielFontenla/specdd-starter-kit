# specdeploy-kit

Infrastructure-agnostic **deploy wizard**: collects your app's build info, a deployment
target and CI/CD choices, then generates a ZIP with everything needed to deploy —
pipeline (GitHub Actions / Azure Pipelines), IaC, a step-by-step runbook, a `specdeploy.json`
manifest and `.env.example`.

> It generates artifacts. It never deploys, never runs a backend, never touches credentials.
> Generated pipelines reference secrets **by name only**.

## Providers (v1)

| Provider | CI | API support | IaC |
|----------|----|-------------|-----|
| Azure Static Web Apps | GHA + AzP | ✅ managed Functions | Bicep |
| Cloudflare Pages | GHA + AzP | — | — |
| AWS S3 + CloudFront | GHA + AzP | — | Terraform |
| Vercel | GHA | — | — |
| Netlify | GHA | — | — |
| On-prem Docker (Nginx/IIS) | GHA + AzP | ✅ Node sidecar | docker-compose |

Providers are **data, not code**: a folder under `providers/` with a `provider.json`
descriptor + templates. Adding one requires no wizard changes — see
[`docs/provider-authoring.md`](docs/provider-authoring.md).

## Quick start

```powershell
cd specdeploy-kit\website
npm install
npm run dev
```

Open http://localhost:4323, complete the 6 steps, download the ZIP and extract it at the
root of the project you want to deploy. Then follow `docs/deploy-runbook.md` inside the ZIP.

## Design

Boreal Design System (dark frosted-glass, sidebar-stepper) — same as specdd-kit/specforge-kit.

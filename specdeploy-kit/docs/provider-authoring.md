# Provider authoring guide

A provider is a **data folder** — the wizard renders its fields and generates its artifacts
without any code changes. This is how specdeploy-kit adapts to a new company's stack.

## Anatomy

```text
providers/<provider-id>/
├── provider.json        # descriptor (validated against _schema/provider.schema.json)
└── templates/           # one file per artifact, with {{placeholders}}
```

## 1. The descriptor (`provider.json`)

```json
{
  "id": "my-cloud",
  "label": "My Cloud",
  "description": "Static hosting on My Cloud",
  "supportsApi": false,
  "ci": ["github-actions"],
  "fields": [
    { "key": "siteName", "label": "Site name", "type": "text", "required": true,
      "pattern": "^[a-z0-9-]+$", "help": "Shown under the input." },
    { "key": "tier", "label": "Tier", "type": "select", "options": ["free", "pro"], "default": "free" }
  ],
  "secrets": [
    { "name": "MYCLOUD_TOKEN", "description": "Deploy token", "where": "GitHub Actions secrets" }
  ],
  "artifacts": [
    { "template": "github-actions.yml", "output": ".github/workflows/deploy.yml", "when": "ci:github-actions" },
    { "template": "runbook.md", "output": "docs/deploy-runbook.md" }
  ]
}
```

Rules enforced by `bundle-providers` (build fails with a clear message otherwise):

- `id` must equal the folder name.
- `ci` non-empty; only `github-actions` / `azure-pipelines`.
- Every artifact's `template` file must exist under `templates/`.
- `fields` need `key`/`label`/`type`; `select` fields need `options`.
- `secrets` need `name`/`description`/`where`. **Names only — never values.**

## 2. Templates

Minimal syntax (see `render-template.js`):

- `{{var}}` — value substitution, dotted paths allowed (`{{app.outputDir}}`).
- `{{#if flag}}…{{/if}}` — truthy block. No else, no loops.
- GitHub Actions expressions `${{ secrets.X }}` pass through untouched.
- Any unresolved `{{…}}` after rendering **throws** — the matrix test catches it.

Context available inside templates:

| Key | Meaning |
|-----|---------|
| `app.name`, `app.buildCommand`, `app.outputDir`, `app.apiDir` | From the App step |
| `appSlug` | Kebab-cased app name (safe for image/resource names) |
| every field `key` | Your descriptor fields (e.g. `{{siteName}}`) |
| `<key>_<value>` | Boolean flag per **select** field value (e.g. `{{#if tier_pro}}`) |
| `api` / `apiUnsupported` | API chosen / chosen but unsupported by this provider |
| `ciGithub`, `ciAzp`, `envDev`, `approvalGate` | CI/CD step choices |
| `providerLabel`, `kitVersion`, `secretsTable` | Metadata (secretsTable = markdown rows) |

Artifact `when` conditions: `ci:<id>`, `api`, `!api`, `field.<key>:<value>`, combinable with `&&`.

## 3. Conventions

- Always ship a `runbook.md` → `docs/deploy-runbook.md`: prerequisites, secrets table
  (`{{secretsTable}}`), first deploy, verify, rollback.
- If `supportsApi` is `false`, include an `{{#if apiUnsupported}}` note in the runbook.
- Pipelines reference secrets by name (`${{ secrets.X }}` / `$(X)`); never inline values.

## 4. Test it

Nothing to register — the matrix test discovers providers from disk:

```bash
cd website
npm run test:unit    # your provider now renders in every ci × api combination
npm run dev          # it appears as a card in the Target step
```

## 5. Checklist before PR

- [ ] `npm run test:unit` green (matrix covers the new provider).
- [ ] Wizard shows the provider and its fields; ZIP downloads.
- [ ] Runbook is accurate for a first-time operator.
- [ ] No secret values anywhere.

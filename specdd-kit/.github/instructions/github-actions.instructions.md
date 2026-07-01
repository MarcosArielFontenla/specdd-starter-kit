---
applyTo: "**/.github/workflows/*.yml"
description: GitHub Actions CI/CD workflow best practices
---

# GitHub Actions Instructions

## When this applies
When writing or editing GitHub Actions workflow files under `.github/workflows/*.yml`.

## Guidelines
- Pin third-party actions to a full commit SHA (or at minimum a version tag from a trusted publisher), not a floating branch, to prevent supply-chain tampering.
- Grant the workflow's `GITHUB_TOKEN` the minimum required `permissions` explicitly, rather than relying on the broad default.
- Use repository/organization secrets (`secrets.*`) for credentials and never hardcode tokens, API keys, or passwords in the workflow YAML.
- Cache dependencies (`actions/cache` or built-in package-manager caching) to keep CI runs fast, and scope the cache key to the lockfile hash so stale caches don't leak across changes.
- Run tests, linting, and security scans on every pull request before allowing merge, and fail the workflow (non-zero exit) on any violation instead of only warning.

## Anti-patterns
- Referencing third-party actions by a mutable tag like `@main` or `@v1` without pinning to a SHA.
- Hardcoding secrets or tokens directly in the workflow file instead of using encrypted secrets.
- Granting `permissions: write-all` to a workflow that only needs read access.

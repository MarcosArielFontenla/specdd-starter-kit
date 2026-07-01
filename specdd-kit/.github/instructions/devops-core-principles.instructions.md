---
applyTo: "all"
description: Core DevOps principles for build, release, and operate workflows
---

# DevOps Core Principles Instructions

## When this applies
Always, when changing build scripts, CI/CD pipelines, deployment configuration, or operational runbooks.

## Guidelines
- Automate the full path from commit to deploy; avoid manual, undocumented steps that only one person knows how to run.
- Keep builds reproducible: pin dependency versions and use lockfiles so `it works on my machine` doesn't leak into CI/production.
- Treat infrastructure and pipeline configuration as code: version it, review it, and test changes the same way as application code.
- Make deployments reversible: support rollback (previous artifact/version) rather than only forward fixes.
- Emit structured logs, metrics, and health checks from every service so operational issues are diagnosable without redeploying with debug prints.

## Anti-patterns
- Manually editing configuration or deploying artifacts directly on a production server outside the pipeline.
- Shipping a change with no rollback path or feature flag for risky behavior.
- Ignoring flaky CI jobs instead of fixing or quarantining them.

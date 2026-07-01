---
applyTo: "**/Dockerfile*"
description: Docker containerization best practices
---

# Containerization / Docker Best Practices Instructions

## When this applies
When writing or editing `Dockerfile`/`Dockerfile.*` files.

## Guidelines
- Use multi-stage builds to keep the final image small: build/compile in one stage, then copy only the built artifacts into a minimal runtime base image.
- Pin base image versions with a specific tag or digest (`node:22-slim`, not `node:latest`) so builds are reproducible and not silently broken by upstream updates.
- Run the container process as a non-root user (`USER` instruction) instead of the default root user.
- Order instructions so that infrequently-changing layers (dependency installation) come before frequently-changing layers (application source) to maximize Docker layer cache hits.
- Add a `.dockerignore` file to exclude `node_modules`, `.git`, build artifacts, and secrets from the build context.

## Anti-patterns
- Using `latest` (or no tag) as the base image, making builds non-reproducible.
- Running the container as root without a documented reason.
- Copying the entire repository into the image (including `.env`, `.git`, credentials) instead of only the files needed at runtime.

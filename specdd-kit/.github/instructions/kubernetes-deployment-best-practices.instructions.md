---
applyTo: "**/*.{yaml,yml}"
description: Kubernetes deployment manifest best practices
---

# Kubernetes Deployment Best Practices Instructions

## When this applies
When writing or editing Kubernetes manifest files (`.yaml`/`.yml`) such as Deployments, Services, ConfigMaps, and Ingress resources.

## Guidelines
- Set resource `requests` and `limits` (CPU/memory) on every container so the scheduler can place pods correctly and a runaway pod can't starve the node.
- Define `readinessProbe` and `livenessProbe` for every container so Kubernetes can route traffic only to healthy pods and restart stuck ones.
- Pin container image tags to a specific version or digest, never `:latest`, so rollouts are deterministic and rollback is possible.
- Store configuration in `ConfigMap`s and secrets in `Secret`s (or an external secret manager), never inline plaintext credentials in a Deployment spec.
- Set `replicas >= 2` with a `PodDisruptionBudget` for user-facing services so a single node drain or pod eviction doesn't cause an outage.

## Anti-patterns
- Deploying containers with no `resources.requests`/`limits`, risking noisy-neighbor resource contention.
- Using `:latest` as the image tag in a Deployment manifest.
- Storing plaintext secrets or credentials directly in a `ConfigMap` or manifest instead of a `Secret`/secret manager.

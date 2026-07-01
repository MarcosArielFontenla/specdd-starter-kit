---
applyTo: "all"
description: Guidance for keeping code clean of SonarQube quality-gate violations
---

# SonarQube Instructions

## When this applies
Always, when writing or modifying code in a repository with a SonarQube/SonarCloud quality gate.

## Guidelines
- Keep cyclomatic complexity low by extracting nested conditionals and long functions into smaller, named functions.
- Avoid duplicated code blocks (SonarQube's duplication detector); extract shared logic into a reusable function or module instead of copy-pasting.
- Remove dead code, commented-out code, and unused imports/variables before committing; Sonar flags these as code smells.
- Address every new "blocker" and "critical" issue on changed lines before merging; do not suppress with `// NOSONAR` unless the finding is a documented false positive.
- Add or update unit tests alongside new logic so changed code keeps meeting the project's coverage-on-new-code threshold.

## Anti-patterns
- Suppressing Sonar warnings with blanket `NOSONAR` comments instead of fixing the underlying issue.
- Leaving TODO-only stubs or commented-out blocks of old code in committed files.
- Merging changes that drop code coverage on new code below the configured quality gate.

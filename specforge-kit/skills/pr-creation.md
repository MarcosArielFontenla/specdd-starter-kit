---
name: pr-creation
description: Open a PR with a clear description linked to the story
persona: Dev
---

# PR Creation

## Purpose
Open a pull request with a description clear enough that a reviewer can understand what changed, why, and how it was verified without needing to reconstruct context from the diff alone.

## When to use
Once implementation and self-`code-review` are complete for a story or fix and the change is ready for teammate review.

## How
1. Keep the PR scoped to one story or one coherent fix; split unrelated changes into separate PRs so review and revert stay simple.
2. Link the story/issue explicitly in the description (ID and title, not just a vague reference) so traceability from code back to requirement is one click, not a search.
3. Summarize what changed and why in a few sentences aimed at a reviewer with no prior context — the diff shows "what," the description should carry the "why."
4. List the acceptance criteria covered by this PR explicitly, and call out any AC intentionally not covered (deferred, out of scope) rather than leaving it silently unaddressed.
5. Describe how the change was verified: tests added/updated, manual verification steps taken, and any relevant screenshots or output for UI changes.
6. Flag anything a reviewer should pay special attention to (risky area, deliberate tradeoff, follow-up work intentionally deferred) rather than letting them discover it unguided.
7. Confirm CI is green and the branch is up to date with its target before requesting review; don't ask for review on a red or stale branch.
8. Keep the PR title and description free of secrets, credentials, and internal-only sensitive detail, since PRs are often more widely visible than the code itself.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.

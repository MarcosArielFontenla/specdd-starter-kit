---
applyTo: "all"
description: General code review expectations independent of language/stack
---

# Code Review Instructions

## When this applies
Always, when reviewing a diff, pull request, or proposed change, whether performed by a human or an AI agent.

## Guidelines
- Check the change against its stated intent (spec, issue, or PR description) before checking style; correctness and scope come first.
- Verify tests exist and actually cover the new behavior, including at least one edge case and one failure case.
- Look for missing error handling, unchecked nulls/undefined, and unhandled promise rejections on changed lines.
- Flag public API, schema, or contract changes explicitly, since they can break other consumers.
- Keep review comments specific and actionable (reference a line, explain the risk, suggest a fix) rather than vague style preferences.

## Anti-patterns
- Approving a PR without reading the diff because "the tests pass."
- Requesting unrelated refactors or style nits that block an otherwise correct, in-scope change.
- Reviewing only the added lines while ignoring how they interact with surrounding code.

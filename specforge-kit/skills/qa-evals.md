---
name: qa-evals
description: Define eval criteria for AI-assisted QA output
persona: QA
---

# QA Evals

## Purpose
Define objective, checkable criteria for evaluating AI-generated QA artifacts (test cases, bug reports, automated steps) so their quality can be measured and trusted rather than accepted on faith.

## When to use
Before relying on AI-generated QA output in a real workflow, and periodically thereafter (e.g., when the generating prompt/skill changes) to confirm quality hasn't regressed.

## How
1. Define the eval target precisely: which artifact type (test cases, bug reports, automated steps) and which skill/prompt produced it.
2. Write a scoring rubric with binary, checkable criteria rather than subjective quality judgments, for example:
   - Test cases: every AC has ≥1 test case; each test case has Given/When/Then; expected result is measurable, not vague.
   - Bug reports: reproduction steps are numbered and complete from a clean state; expected/actual are both present and cite a source; evidence is attached.
   - Automated steps: each step maps to exactly one Gherkin line; Given steps contain no assertions; the test fails when the underlying behavior is broken.
3. Assemble a small fixed set of representative inputs (real ACs, real bugs, real Gherkin scenarios) as the eval fixture set, so runs are comparable over time.
4. Run the AI-assisted skill against the fixture set, score each output against the rubric, and compute a pass rate per criterion, not just an overall average that can hide a systematically weak criterion.
5. Set a minimum pass-rate threshold per criterion before output is trusted unreviewed; below threshold, output requires human review before use, not automatic acceptance.
6. Record failing examples verbatim alongside the rubric criterion they failed, so prompt/skill fixes can target the actual failure mode instead of guessing.
7. Re-run the eval whenever the generating skill, prompt, or underlying model changes, and track the pass rate over time to catch silent regressions.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.

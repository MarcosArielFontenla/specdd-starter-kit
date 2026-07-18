# Skill Review Workflow

Run when a drift report exists in `.agents/evals/reports/` or a human requests a rule
change.

## 1. Gather evidence
Read the drift report, the skill's recent scores (`.agents/evals/scores/`), and any
`rule_violation` telemetry events in the window.

## 2. Reproduce
Confirm the drop is real: re-run the skill's eval tasks. If it does not reproduce, the
report was noise — log that and stop.

## 3. Classify the drift cause (always one of these five)
1. **Rule is wrong** — the rule causes worse output
2. **Rule is stale** — the codebase evolved; the rule no longer maps to reality
3. **Rule is unclear** — agents interpret it differently each time
4. **Benchmark is wrong** — the eval task doesn't represent real work
5. **Threshold is wrong** — the alert is a false positive

## 4. Draft the proposal (agent work, diff-based)
Write `.agents/evals/proposals/[skill]-[date].md` containing a mandatory section:

    ## Proposed diff (pre-generated — pending human review)
    ```diff
    --- a/.agents/skills/[domain]/SKILL.md
    +++ b/.agents/skills/[domain]/SKILL.md
    @@ [context] @@
    -[current rule, quoted exactly]
    +[proposed rule]
    ```
    ## Why this diff
    [Rationale tied to the drift classification and the evidence]

A proposal without a diff is incomplete and cannot be approved.

## 5. Human review (hard boundary)
**The proposal diff never self-applies.** Only a human applies it after review. After
approval: apply the diff, bump the skill version, regenerate its snapshot
(`generate-snapshots.ps1 -Scaffold` → fill → `-Check`), and reset the baseline ONLY if
the change redefines the quality bar (`run-eval.ps1 -ResetBaseline -Reason "..."`).

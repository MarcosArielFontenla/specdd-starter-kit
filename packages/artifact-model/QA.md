# QA domain API

Phase 6 adds the portable QA domain under `@specdd/artifact-model/qa`. It does not
add the Phase 7 workspace UI or execute tests.

## Artifacts

Artifact schema `1.2.0` is additive and introduces:

- `test-scenario`: objective, covered acceptance-criterion IDs and technique.
- `test-case`: criterion IDs, preconditions, observable steps, level and design-time
  automation status.
- `coverage-assessment`: deterministic mapping from every criterion of one approved
  requirement to the test cases that declare coverage.
- `quality-risk`: likelihood, impact and mitigation.
- `defect`: expected/observed behavior, reproduction steps and pinned evidence.

Scenarios, cases and coverage use `validates` only toward a `requirement`. The graph
rejects every other endpoint combination. `implements` remains unsupported.
Risks and defects require at least one `relates-to` link to a current approved
requirement before approval.

`automationStatus: automated` says that automation exists; it is not a run result.
Coverage scope is always `declared-design-only`. Phase 6 has no pass/fail field and
does not infer execution from source files, an agent response or a relationship.

## Capability-bound actions

`resolveQACapability` consumes the active generated `role-qa` pack and byte-pins its
workflow, playbooks, rubric and required context supplied by the host. Markdown is
knowledge, never permission to invoke Playwright, commands or another tool.

`prepareQAAction` accepts only an approved current Requirement and emits a hash-bound,
non-executable request. `acceptQAActionOutput` accepts typed proposals for gaps,
scenarios, cases and risks. Agent output cannot contain defects, run evidence,
pass/fail results, approvals or `automated` claims.

## Coverage and approval

`createQACoverageAssessment` derives criterion-to-case mappings from current
`validates` edges and pins the graph snapshot. Empty mappings remain visible.
`assertQACoverageBasis` reproduces the calculation against its original supplied
graph; it does not prove runtime coverage. Approval also recomputes the complete
declared mapping against the current graph and checks its system provenance.

`prepareQAApproval`, `approveQA` and `assertQAApproval` provide the same exact-subject,
human-only, replayable receipt boundary as BA. Approval requires a current approved
requirement link, valid criterion IDs and no graph blockers. Defects additionally
require host/human evidence and cannot preserve agent-proposed provenance.

The host remains responsible for authentication, atomic compare-and-swap,
persistence and the truth/accessibility of external evidence locators.

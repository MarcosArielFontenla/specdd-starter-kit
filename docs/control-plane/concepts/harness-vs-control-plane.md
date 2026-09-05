# Harness vs Control Plane

The Harness and SpecControl collaborate but answer different questions.

| Layer | Primary question | Examples |
|---|---|---|
| Project Definition | What project and architecture exist? | identity, stack, domains, installed capabilities |
| Capability Pack | What specialized ability is available? | role skill, playbooks, workflows, policies, eval rubric |
| Harness | How should an agent work? | context loading, routing, rules, budgets, verification |
| SpecControl | Who runs, in what order, behind which gates? | graphs, roles, approvals, retries, failure routes, eval gates |
| Runtime adapter | How is the portable definition expressed for one backend? | target configuration and unsupported-feature report |

SpecControl references Project Definition, Harness, and Capability Pack artifacts by
stable ID and repository-relative source. It does not copy their content.

The Phase 3 definition is descriptive, not executable. A valid graph does not grant
permissions, approve work, prove an artifact exists, or imply that a run occurred.
Those effects require later compilation, runtime execution, evidence, and human action.


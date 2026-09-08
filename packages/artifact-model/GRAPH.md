# Artifact graph — Phase 2

`@specdd/artifact-model/graph` adds a bounded, read-only graph over exact artifact
revisions. It does not modify the artifact 1.0.0 contract, approve work, execute
agents or publish specs. Schema: `@specdd/artifact-model/schema/graph`.

## Input and use

A `SpecForgeArtifactGraph` definition contains a canonical project ref, revision/
subject-pinned nodes, and relationship assertions. Each assertion records ID,
kind, source, target, actor, time and optional source refs (array may be empty).
Actor/source refs are caller attestations, not authenticated evidence.

```js
import { createArtifactGraph } from '@specdd/artifact-model/graph';

// definition and context are loaded from reviewed local data by the host.
const graph = await createArtifactGraph(definition, {
  project: projectDefinition,
  artifacts: currentArtifacts,
});
const impact = graph.impact('question-deadline');
const questions = graph.openQuestions('requirement-cancel');
const blockers = graph.blockers('requirement-cancel');
```

For the checked-in synthetic example, load `examples/graph.json`, the three
artifact examples (`requirement.json`, `question.json`, `decision.json`), and
`../project-model/examples/minimal.project.json`. The requirement has one declared
dependency on the scope decision and is blocked by the unresolved deadline
question. None of these records represents an approved Bloom business rule.

## Relationship semantics

| A → B | Meaning / rule |
|---|---|
| depends-on | A requires B |
| derives-from | A was derived from B; declaration, not fidelity proof |
| refines | Requirement A details Requirement B |
| blocks | A declares a blocker of B; normalized as B depending on A |
| supersedes | A declares replacement of same-type B; at most one replacement per target |
| relates-to | Symmetric association, stored once; reverse duplicate rejects |
| validates / implements | Recognized but fail with `GRAPH_UNSUPPORTED_RELATION_TYPES` until matching payloads/evidence semantics exist |

Self-links and duplicate kind/source/target tuples reject. Associations allow
cycles. The union of depends-on/derives-from/refines/supersedes and reversed blocks
must be acyclic. Multiple distinct relations in the same dependency direction are
allowed. A nonblocking question cannot be the source of a blocks assertion.

Phase 1 embedded relationships are automatically included with origin `artifact`.
Graph assertions have origin `graph` and retain actor/source metadata. Omitting an
embedded edge cannot remove a blocker; duplicate tuples across either origin fail.
`artifact.*` assertion IDs are reserved for generated embedded-edge identities.
Missing embedded targets must be supplied and listed as nodes.

Separating graph assertions from snapshot content avoids recursive hashes when
associating existing artifacts mutually. Adding a graph assertion changes graph
identity, not an existing artifact approval. Consumers must explicitly adopt the
graph revision in their workflow context. The Phase 1 approval API still checks
direct embedded targets only; it is not secretly upgraded to a graph-wide gate.

## Queries and results

| Query | Result |
|---|---|
| `neighbors(id, {direction?, kinds?})` | One-hop trace, includes root at depth 0 |
| `trace(id, {direction?, kinds?, maxDepth?})` | Breadth-first traversal, shortest depth per node and traversed edges |
| `impact(id, maxDepth?)` | Reverse causal dependencies: candidates needing review when id changes; excludes association and supersession |
| `openQuestions(id, maxDepth?)` | Unresolved questions reachable along prerequisites, including root if it is a question |
| `blockers(id, maxDepth?)` | Blocking questions plus declared blocks along those prerequisites; no aggregate readiness verdict |
| `replacements(id)` | Incoming supersedes assertions; no status change or automatic selection/adoption |
| `snapshot()` | Independent copy of normalized definition, records and effective edges |

Directions are outgoing (default), incoming or both. relates-to works symmetrically
in every direction. Nodes sort by depth then ID, edges by ID using ordinal ordering.
Depth 0 returns only root; depth bounds expose `truncated: true` when reachable
nodes remain outside the limit. Empty kind selection means no traversal. Unknown
nodes, invalid options and unsupported definitions throw or return diagnostics;
they are never reported as successful empty results.

For blockers, a resolved question no longer yields an open question or an active
declared block. Its relationship remains inspectable in the snapshot. For other
types, blocks is a declaration until that assertion is revised; approval of its
source is not evidence that the declared blocker was removed. Draft/agent assertions
are visible with provenance. A declared blocker is not an authenticated decision.

## Identity, validation and migration

`validateArtifactGraph(value, context)` returns diagnostics. `createArtifactGraph`
validates then returns an immutable view with private data; modifying caller input
or returned copies cannot mutate it. No cached view promises live freshness.

The context must have exactly the graph's node IDs, one current record each, all
bound to the same canonical project hash. Node and embedded target refs must match
revision/subject. Assertions cannot predate source/target edit times. The host is
responsible for obtaining the actual current project and complete relevant inventory.
Validation cannot discover withheld artifacts, prove revision history, verify
external sources or authenticate participants.

`definitionSha256` hashes the normalized definition (node/assertion arrays sorted
by identity). `snapshotSha256` also hashes all full artifact records, including
review journals/status. A lifecycle change may preserve subject/definition while
changing the snapshot hash. Every trace/question report carries snapshot identity.
Consumers requiring freshness rebuild and compare against their current state.

`migrateArtifactGraph(value, context)` recognizes 1.0.0, validates bindings and
normalizes set ordering. It does not create approvals or infer links from older
formats. Unknown versions reject. Artifact 1.0.0 files need no migration.

Limits: 200 nodes, 1,000 effective edges including embedded edges, maxDepth 0–200,
and 2 MB for each input definition/context through the existing canonical JSON
boundary. Validation uses iterative cycle checking; traversal is bounded. No
vector database, new dependency, UI graph renderer or runtime is involved.

Run `npm run test:unit -w @specdd/artifact-model`. See the
[spec](../../docs/specforge-workspace/specs/phase-2.md),
[ADR](../../docs/specforge-workspace/adrs/0002-revision-bound-artifact-graph.md) and
[acceptance evidence](../../docs/specforge-workspace/phases/phase-2.md).

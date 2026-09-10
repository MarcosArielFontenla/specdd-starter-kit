# @specdd/artifact-model

SpecForge Phase 1: portable JSON artifacts for Requirements, Open Questions and
Decisions. Strict typed payloads, exact-revision review and pure lifecycle functions.
No persistence, user interface, LLM execution or canonical SpecDD publication.

Phase 2 adds the separate [artifact graph API](GRAPH.md): pinned relationships,
causal-cycle validation, bidirectional traceability and transitive impact/question
queries. The Phase 1 approval APIs below retain their direct-target scope.

Phase 3 adds the [BA domain](BA.md): versioned BusinessRule/ImpactAnalysis payloads,
capability-bound action proposals and an explicit transitive BA approval gate.

Phase 5 adds the separate [governed SpecDD projection](PROJECTION.md): deterministic
Markdown, explicit gaps/unsupported mappings, exact diff/base binding and a human
receipt. It remains pure and performs no repository I/O.

## Verify locally

From the monorepo root with its dependencies already available:

```powershell
npm run test:unit -w @specdd/artifact-model
```

The package compiles `@specdd/capability-model` and `@specdd/project-model` first.
All test actors, decisions and timestamps are synthetic. The examples pin the actual canonical hash of
`packages/project-model/examples/minimal.project.json`; they are draft data, not
Bloom requirements or evidence of a real stakeholder approval.

## Contract

`Artifact = Envelope & Payload`, schema versions `1.0.0` and additive `1.1.0`,
kind `SpecForgeArtifact`. The original schema export remains 1.0.0; see [BA](BA.md)
for the new composed schema and explicit compatibility policy.
`Envelope` includes stable ID, title, owner role, pinned Project Definition,
revision number, previous revision record hash, creation/edit timestamps, cumulative
contributions, exact target references, status, lifecycle journal and optional
namespaced extensions. Role is a portable ID, not a verified capability/identity.

- Requirement: description plus identified Given/When/Then acceptance criteria.
- Open Question: question, blocking flag and null or human-attributed resolution.
- Decision: proposed decision text and rationale. A draft is not an adopted decision.

Published JSON Schema: `@specdd/artifact-model/schema`. Root/nested contract objects
reject extra keys. Discriminated payload rules reject mixing a question and a
requirement. Empty criteria are valid for a draft but cannot pass approval.

`schemaVersion` evolves the format; `revision` versions work; `status` derives from
the review journal. These are distinct. `updatedAt` is the snapshot edit time;
review events carry their own times and do not change the approved snapshot hash.

## API and validation layers

| API | Responsibility |
|---|---|
| `validateArtifact(value)` / `assertArtifact(value)` | Portable JSON, structural/semantic shape, dates, author provenance, criteria and local relationship constraints. **Does not establish approval integrity.** |
| `canonicalJson(value)` / `fingerprint(value)` | Sorted-key ordinary JSON and Web Crypto SHA-256. No Node-only imports, JSON coercion or newline normalization. |
| `artifactSubject(artifact)` | Hash of the full snapshot excluding only `status` and `review`. Includes project context, revision ancestry and pinned relationships. |
| `assertArtifactIntegrity(value)` | Structure plus journal replay, exact subjects, event-chain hashes, chronology, human-only transitions and status consistency. |
| `assertArtifactContext(artifact, context)` | Valid canonical project/hash; unique current IDs; same-project direct target existence/revision/hash. Detects a different supplied current record. |
| `createArtifact(input, contribution)` | New independent revision 1 draft. IDs/times supplied by host, never inferred from a title. |
| `reviseArtifact(previous, edit, contribution)` | New draft revision; preserves previous snapshot and cumulative provenance; pins entire previous record, including its journal. |
| `reviewArtifact(artifact, decision, context)` | Pure append of exact-subject lifecycle event. Context must include the exact current artifact and its direct targets. |
| `assertApprovedArtifact(artifact, context)` | Consumption gate: current approved/active revision, valid context and direct targets, no open blocking questions or superseded targets. |
| `assertRevisionHistory(revisions)` | Complete ordered revision chain from 1, fixed identity/project/type, ancestry and contribution continuity. |
| `migrateArtifact(unknown)` | Recognize/validate 1.0.0 or 1.1.0 and return an independent copy; unsupported/legacy input returns null + diagnostics. No inferred conversions or new approvals. |

All hashing/review APIs are asynchronous for native browser Web Crypto. Use a
secure browser context (including localhost) or Node 22.12+. Source bounds include
2 MB canonical JSON, depth 64, 100 direct relationships/criteria and 1,000 journal
events/contributions. Reaching these limits requires an explicit future archival
or schema strategy; records are never silently truncated.

## Lifecycle and host integration

```text
draft → under-review → approved → active → superseded
           ↓
         draft (returned by human)

editing a non-superseded current revision → next revision in draft
```

`request-review` may be proposed by an agent. `return-to-draft`, `approve`,
`activate`, `supersede` require a human actor. The supplied actor is an attestation
by the caller, not authenticated identity. Agents can suggest answers in prose,
but cannot populate/change a question resolution through revision APIs.

The host loads current canonical context and the current records, computes/shows
`artifactSubject`, receives the human decision, then invokes `reviewArtifact`.
Before saving it must atomically compare the old record hash/revision with stored
state. It retains old revisions and verifies their chain on load. After creating
a child revision, the captured parent record stays frozen; its historical status
is not the status of the latest revision. `superseded` retires the current artifact;
cross-artifact supersession and richer relation semantics live in the Phase 2 graph.

Replay is rejected against an already transitioned record; a pure function invoked
twice with the same old data cannot know another process persisted it. No service,
database or global exactly-once claim is made. Whole-record fingerprints and a
trusted journal head must be retained by the host to detect changes to the final
event or malicious rewriting of a full chain. Hashes are not signatures.

Consumers must use `assertApprovedArtifact` with fresh context, not inspect the
serialized flag alone. It validates direct refs only: it cannot detect an omitted
question, prove all domain decisions are known, inspect source-ref content, verify
a source actor, or resolve transitive dependency conflicts. Phase 2 adds graph
semantics; Phase 3 adds BA-specific workflows and capability resolution.

Approval here records reviewed business intent. It never approves a shell command,
installs a Harness, modifies Project Definition, or overwrites a SpecDD spec. Those
boundaries remain governed separately; projection is Phase 5.

## Provenance and migration

Every edit appends one contribution; an agent contribution can never disappear
from a validated revision chain. Human edits after agent contributions must be
`human-edited-agent-proposal` (or explicitly imported/generated with source refs),
not exclusively `human-authored`. Imported/generated origins remain in the chain
after subsequent human edits. This is revision-level provenance, not attribution
of each word, and it relies on truthful host input.

No legacy SpecForge business artifact format exists. `migrateArtifact` therefore
does not invent migration from Capability Packs, SpecControl plans or Markdown
specs. It preserves current-format journals as data and verifies their integrity;
it does not trust their authority or publish them. Importers must separately
revalidate project/relationships, history and local trust before use. Future schema
versions need explicit converters and preservation tests.

See [Phase 1 spec](../../docs/specforge-workspace/specs/phase-1.md),
[ADR](../../docs/specforge-workspace/adrs/0001-artifact-revisions-and-ownership.md)
and [phase evidence](../../docs/specforge-workspace/phases/phase-1.md).

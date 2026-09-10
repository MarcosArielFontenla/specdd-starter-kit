# BA domain — Phase 3

Portable domain API: `@specdd/artifact-model/ba`. This module itself has no UI,
store, agent runtime, external integration, pack installation or SpecDD projection.
The existing Capability Builder remains unchanged. The separate Phase 5 API
[`@specdd/artifact-model/projection`](PROJECTION.md) consumes an exact approved BA
snapshot and remains behind its own human gate. [Phase spec](../../docs/specforge-workspace/specs/phase-3.md)
and [ADR](../../docs/specforge-workspace/adrs/0003-ba-domain-and-capability-bound-actions.md).

## Artifact taxonomy and versions

Requirement retains its description and identity-bearing Given/When/Then criteria.
OpenQuestion and Decision keep the Phase 1 contracts. Stories can be expressed as
requirements; no duplicate story/criteria envelope is introduced.

New `business-rule` has `statement` and `rationale`. Draft agent contributions are
proposals, not confirmed facts. New `impact-analysis` has `basisSnapshotSha256`,
exact `root`/`affected` references and `scope: provided-context-only`. It describes
structural impact from known graph relationships, not semantic completeness.

`createArtifact` uses schema 1.1.0 for these two types and preserves 1.0.0 for the
three existing types. Revisions retain their schema version. `migrateArtifact`
recognizes both without rewriting records, histories or hashes. Version 1.0.0 does
not accept the new types. `artifactSchema` and `./schema` still expose 1.0.0;
`artifactSchemaV11` (also exported from `./schema/v1.1`) is the self-contained 1.1.0
JSON Schema object composed from the unchanged base and BA payload definitions.
Serialize that object if an external validator requires a JSON file.

Run the synthetic impact example after building, from the monorepo root:

```powershell
node packages/artifact-model/examples/ba-impact.mjs
```

It prints a draft and writes nothing. The [rule example](examples/business-rule.json)
is also synthetic and does not claim any approved Bloom rule.

## Workflow and capability resolution

`getBAWorkflow()` returns a defensive copy of the
[canonical action catalog](schema/ba-workflows.json). It describes human draft,
agent proposal, human questions/review, deterministic impact and exact approval.
It is a declarative contract, not an executable SpecControl DAG.

`resolveBACapability({pack, files, dependencies})` requires an active `role-ba`
manifest, the `specforge-requirements` workflow, referenced skills, seven BA
playbooks, applicable eval content and required project context. `files` is a
host-supplied map of manifest paths to actual text. Optional absent context is
reported explicitly; missing required content rejects. Directory context such as
`.agents/specs` needs an explicit host-produced text inventory/projection if supplied;
the library does not enumerate a repository. It does not synthesize project.md or
constitution.md from incomplete inputs. The host must check consistency of those
documents with the canonical Project Definition; both are bound in the request.

The resolver reads the existing generated role skill, policies, workflow and
verbatim playbooks. No BA prose is duplicated in JSX. The seven-playbook set covers
the references in `specforge-ba`: Miro is knowledge only, never an integration
requirement. `documentation` remains in the legacy BA pack but is excluded here:
its actual content addresses Dev APIs/modules and references Dev playbooks.
Unresolved free-text references in arbitrary customized Markdown are not parsed
or fetched recursively; this is a bounded resolver for the current BA contract.

`dependencies` lists `{id, kind, versionRange}` requirements that the host attests
are available. Exact manifest requirements must be present. This is not a semver
resolver, installation proof or permission to install a Harness. Eval rubrics are
consumed as knowledge; this library does not execute evals or report their success.
File hashes use canonical JSON string fingerprinting, preserving CRLF/LF/BOM.
They are not raw-byte file hashes. The resolved manifest, consumed text and host
attestations all participate in request identity.

An existing Project Definition capability binding must be enabled, pin the exact
manifest version and resolve to matching manifest content in `files`; contradictory
bindings reject. An unregistered capability can prepare a detached domain proposal,
but the request reports `projectCapabilityBinding: null`. Every request carries
`executionAuthorized: false`: building this data contract never grants runtime
permissions. Before real execution, Phase 4 must enforce project registration,
trusted source selection, runtime configuration and the user's action authorization.

## Agent contracts

```js
const input = {
  runId, action: 'analyze-requirement', targetId,
  graph: graphDefinition, context: {project, artifacts},
  capability: {pack, files, dependencies},
};
const {request, requestSha256} = await prepareBAAction(input);
// Phase 4 host invokes a configured runtime with the request and output schema.
const proposal = await acceptBAActionOutput(rawOutput, currentInput, {
  actor: {id: runtimeActorId, kind: 'agent'}, at: actualCompletionTime,
});
```

| Action | Allowed proposal fields |
|---|---|
| analyze-requirement | ambiguities, questions, rules, criteria |
| refine-wording | wording, ambiguities, questions |
| suggest-acceptance-criteria | criteria, questions |
| impact-analysis | Local `createBAImpactAnalysis`, no agent request |

All outputs conform to [the strict schema](schema/ba-action-output.schema.json):
schemaVersion, requestSha256 and all five fields are required; unused arrays are
empty and wording is null. Each suggestion has a unique ID and nonempty
`supportArtifactIds` drawn from the exact input inventory. IDs identify suggestions,
not permission to overwrite artifact/criterion IDs. Status, decisions, answers,
resolution and extra fields reject. No output is materialized automatically.

Consumption rebuilds the request from **current** host input. Changed content,
graph, lifecycle, run, action or consumed capability text rejects old output.
Calls snapshot their arguments before awaiting. Hash equality only establishes
binding; an empty proposal does not prove no ambiguities exist. Source references
do not prove that suggested business rules are true. A human must review each
suggestion and decide what to adopt. The method name `acceptBAActionOutput` means
accepting a structurally valid runtime response as a proposal, not human approval.

The Phase 4 Workspace host stores request/proposal and real execution evidence,
offers edits and rejection, creates draft revisions with retained agent provenance,
and updates graph pins/assertions explicitly. It must not relabel accepted agent
text as solely human-authored. No helper in this module claims an LLM actually ran.

## BA approval and impact

`prepareBAApproval({targetId, graph, context})` requires an under-review BA artifact.
It checks criteria/question readiness, transitive blocking questions, declared
blocks, superseded prerequisites and unapproved causal business rules/decisions.
Associations alone do not require approval; draft prerequisite requirements are
not automatically treated as business decisions. Phase 1 direct-target constraints
also apply when the transition executes. Supersedes assertions remain declarations,
not automatic lifecycle changes.

Show the exact subject to the human, then call `approveBA(input, {subjectSha256,
eventId, actor, at})`. It appends the existing human approval journal event and
returns `{artifact, receipt}`. Receipt pins graph/record before and after approval.
No approval or analysis may predate its supplied graph evidence.

At consumption call `assertBAApproval(currentInput, receipt)`. It reconstructs the
pre-approval record and replays the transition; altered receipt fields and changed
context fail. This gate accepts the exact `approved` record only. Later activation,
editing, another graph lifecycle change or graph assertion change invalidates this
receipt; do not silently reuse it. A future activation workflow needs its own
explicit context policy. Direct Phase 1 APIs do not implicitly become BA gates.

The host must CAS the previous graph/record and persist artifact plus receipt
atomically, preserve historical input, and attest the real human identity/time.
These are pure functions: repeated calls with the same old input remain possible.
Hashes/journals/receipts are not signatures, authentication or globally-once writes.

`createBAImpactAnalysis(input, {id, title, at})` calculates the full bounded impact
and creates a system-generated draft with provenance. `assertBAImpactBasis` exactly
regenerates that draft against its **original pre-analysis graph**. Do not include
the analysis itself in that basis. Keep the historical graph to audit older reports;
changed context requires a new analysis. It is not an approval-ready BA decision.

## Verification

Run `npm run test:unit -w @specdd/artifact-model`. Tests load a real generated BA
pack and canonical skill text; project context, users, proposals and approvals are
explicitly synthetic. See [Phase 3 evidence](../../docs/specforge-workspace/phases/phase-3.md).

# Governed SpecDD projection

`@specdd/artifact-model/projection` is the pure Phase 5 boundary from one currently
approved BA requirement to a portable SpecDD proposal. It performs no I/O and does
not invoke an agent.

`prepareSpecDDProjection(input, options)` revalidates the exact BA approval receipt,
maps the supplied graph to `specs/<slug>/spec.md`, and returns the proposal plus its
SHA-256 subject. The proposal contains full content, a line diff, current canonical
base hash, mapped sources, explicit incomplete sections and unsupported related
types.

After displaying the complete proposal, call `applySpecDDProjection` with the exact
subject and a human actor. It rechecks the BA graph, receipt and current canonical
base and returns a new canonical revision plus receipt. Persist them atomically.
`assertSpecDDProjectionReceipt` validates retained evidence. These functions are
repeatable pure operations; a host must enforce create-once/CAS semantics.

The canonical artifact is local/portable data. It does not mean a file was written,
a spec is implementation-ready, or a repository was published. A `partial` mapping
must remain visible to downstream consumers.

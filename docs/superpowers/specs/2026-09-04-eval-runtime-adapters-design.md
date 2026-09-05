# Phase 6 — Eval runtime adapters

Scope: canonical eval definition and result contract; strict schema validation;
local mechanical outcome adapter; optional Warp classification scorer compiler;
score normalization; hashed evidence capture; examples, tests and CI. ADR-0008/0009
govern vendor independence and fidelity. No external writes or paid runtime needed.

Acceptance: positive/negative schema cases, unique labels, thresholds with both
passing/failing labels, finite bounded normalization, strict run/input identity,
missing/unknown label rejection, timeout/signal/error never passing, deterministic
Warp output with explicit target agents/model, mechanical projection rejected,
real Phase 5 pilot test re-executed and its observed result normalized locally.

Canonical labels and threshold are preserved, not derived from runtime defaults.
An EvalGate resolves via evalRef matching definition.id; required gates need pass.
Advisory gates remain advisory. No changes to the Phase 4 compiler's conservative
required-eval stop behavior: a scorer definition does not install a runtime gate.

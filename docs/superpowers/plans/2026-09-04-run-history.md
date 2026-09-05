# Phase 7 implementation plan

1. Define schema/types plus lifecycle and graph-binding validation.
2. Implement pure summary projection and explicit canonical eval observation adapter.
3. Implement bounded JSONL create/read/list and read-only CLI; no destructive command.
4. Test happy/partial/failure/retry/approval traces, malformed and hostile inputs,
   safe paths, duplicate writes, bounded parsing and schema fidelity.
5. Exercise the existing approved pilot eval locally; persist/read its actual result
   without claiming a new full workflow or changing pilot evidence.
6. Run workspace unit/build/browser/Phase 5 checks and dependency audit. Record only
   observed results; document limits and move the tracker to Phase 8 readiness if accepted.

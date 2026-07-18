# Telemetry Event Contract v1

Storage: `.agents/telemetry/events/[YYYY-MM].jsonl` — one JSON object per line.
Gitignored (local/ephemeral; aggregate via reports, not raw commits). Retention: 90 days.

Every event: `{ "event": string, "ts": ISO-8601, "tool": string, ... }`
`tool` is free-text self-identification of the coding agent in use.

| event | extra fields | emitted when |
|-------|-------------|--------------|
| session_start | project | session begins |
| context_injected | artifact (path), lines (int) | any .agents/ artifact is loaded into context |
| rule_violation | skill, rule (short id/quote), detectedBy (eval\|review\|self) | a Must/Never rule was violated |
| task_completed | category (ROUTING class), sessionMinutes (int) | task ends |
| session_summary | linesInjected (int), skillsLoaded (int), violations (int) | session ends (fallback mode: this may be the ONLY event) |

Rules:
- Append-only. Never edit past lines.
- Unknown fields are allowed; unknown events are ignored by consumers.
- Emitting is best-effort: a missed event is acceptable, a fabricated one is not.
- The instruction-based fallback is EXPECTEDLY LOSSY: a session-end instruction sits in
  the weakest position of a long context and will be dropped some fraction of the time.
  Consumers must treat fallback data as a sample, not a census. The emission rate itself
  is a metric: sessions observed (via VCS activity) vs session_summary lines is the
  fallback's real coverage.
- If your agent runtime supports session-end lifecycle hooks, wire the hook to append
  `session_summary` mechanically — a hook fires 100% of the time; an instruction does
  not. Hook config lives in the tool's own config file, never in `.agents/`.

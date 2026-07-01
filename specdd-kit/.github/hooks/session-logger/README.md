# Session Logger Hook

A minimal hook pair that records when an agent session starts and ends, so a
team can see session activity over time without capturing what was discussed.

## What it logs

Two lines are appended to `.specdd/logs/session.log`:

```
session-start 2026-07-01T09:00:00Z
session-end 2026-07-01T09:42:00Z
```

That is the entire contents of every log entry: an event name (`session-start`
or `session-end`) and a UTC timestamp in `YYYY-MM-DDTHH:MM:SSZ` format.

## What it does NOT log

- No prompt content, model output, or conversation transcript.
- No file paths, diffs, or code touched during the session.
- No secrets, tokens, credentials, or environment variables.
- No user identity or machine-identifying information.

The scripts only ever `mkdir -p .specdd/logs` and append a single timestamped
line. They do not read `stdin`, environment variables beyond what `date`
needs, or any other session state.

## Files

- `hooks.json` — registers `on-session-start.sh` for the `SessionStart` event
  and `on-session-end.sh` for the `SessionEnd` event.
- `on-session-start.sh` — appends a `session-start` line with the current UTC
  timestamp to `.specdd/logs/session.log`.
- `on-session-end.sh` — appends a `session-end` line with the current UTC
  timestamp to `.specdd/logs/session.log`.

## How to enable

1. Copy (or keep) this `session-logger/` directory under `.github/hooks/` in
   your project.
2. Ensure your agent runtime is configured to read hook definitions from
   `.github/hooks/*/hooks.json` (see your tool's hook-registration docs).
3. Make the scripts executable if your platform requires it:
   ```bash
   chmod +x .github/hooks/session-logger/on-session-start.sh
   chmod +x .github/hooks/session-logger/on-session-end.sh
   ```
4. Start a session; confirm `.specdd/logs/session.log` is created and gains a
   `session-start` line, and a `session-end` line when the session closes.

## Disabling

Remove or rename `hooks.json` (or delete the `session-logger/` directory) to
stop the hooks from being registered. Existing log entries in
`.specdd/logs/session.log` are left untouched — delete that file manually if
you want to clear history.

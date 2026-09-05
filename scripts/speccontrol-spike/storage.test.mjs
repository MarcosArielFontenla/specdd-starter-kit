import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { probe } from './preflight.mjs';

function fixture(t) {
  const root = realpathSync(tmpdir());
  const directory = mkdtempSync(join(root, 'speccontrol-o1-'));
  t.after(() => {
    // Delete only the validated temporary directory created by this test.
    assert.equal(dirname(realpathSync(directory)), root);
    rmSync(directory, { recursive: true });
  });
  const path = join(directory, 'state.sqlite');
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE operations(id TEXT PRIMARY KEY, state TEXT NOT NULL) STRICT;
    INSERT INTO operations VALUES ('attempt-1', 'prepared');`);
  db.close();
  return path;
}

test('committed intent survives an abrupt child exit', (t) => {
  const path = fixture(t);
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { DatabaseSync } from 'node:sqlite';
    const db = new DatabaseSync(process.argv[1]);
    db.exec("PRAGMA synchronous=FULL; BEGIN IMMEDIATE; UPDATE operations SET state='dispatch-intent'; COMMIT;");
    process.exit(23);`, path], { windowsHide: true, timeout: 5000 });
  assert.equal(result.status, 23);
  const db = new DatabaseSync(path);
  try { assert.equal(db.prepare('SELECT state FROM operations').get().state, 'dispatch-intent'); }
  finally { db.close(); }
});

test('uncommitted result is rolled back after abrupt exit', (t) => {
  const path = fixture(t);
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { DatabaseSync } from 'node:sqlite';
    const db = new DatabaseSync(process.argv[1]);
    db.exec("BEGIN IMMEDIATE; UPDATE operations SET state='success';");
    process.exit(24);`, path], { windowsHide: true, timeout: 5000 });
  assert.equal(result.status, 24);
  const db = new DatabaseSync(path);
  try { assert.equal(db.prepare('SELECT state FROM operations').get().state, 'prepared'); }
  finally { db.close(); }
});

test('writer lock rejects concurrent transaction; stale transition changes zero rows', (t) => {
  const path = fixture(t);
  const first = new DatabaseSync(path), second = new DatabaseSync(path);
  try {
    first.exec('BEGIN IMMEDIATE');
    assert.throws(() => second.exec('BEGIN IMMEDIATE'), /locked/);
    first.exec("UPDATE operations SET state='dispatch-intent'; COMMIT;");
    assert.equal(second.prepare("UPDATE operations SET state='success' WHERE state='prepared'").run().changes, 0);
    assert.throws(() => second.prepare('INSERT INTO operations VALUES (?, ?)').run('attempt-1', 'prepared'), /UNIQUE/);
  } finally { first.close(); second.close(); }
});

test('a persisted dispatch intent remains uncertain, not automatically retried', (t) => {
  const path = fixture(t);
  const db = new DatabaseSync(path);
  db.exec("UPDATE operations SET state='dispatch-intent'"); db.close();
  const reopened = new DatabaseSync(path);
  try {
    // Recovery policy under evaluation: require reconciliation, never infer failure/success.
    reopened.exec("UPDATE operations SET state='needs-attention' WHERE state='dispatch-intent'");
    assert.equal(reopened.prepare('SELECT state FROM operations').get().state, 'needs-attention');
  } finally { reopened.close(); }
});

test('preflight rejects a missing executable without exposing spawn details', async () => {
  await assert.rejects(probe({ executable: join(tmpdir(), 'speccontrol-nonexistent-executable'),
    cwd: tmpdir(), timeoutMs: 1000 }), /^Error: PROBE_SPAWN_ERROR$/);
});

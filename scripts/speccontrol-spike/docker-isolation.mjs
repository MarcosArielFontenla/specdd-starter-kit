import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { realpathSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Explicit opt-in infrastructure experiment, not part of ordinary unit tests.
// Runs no database, coding agent, model call, or project dependency script.
const fixture = realpathSync(fileURLToPath(new URL('./fixtures/sandbox', import.meta.url)));
const before = readFileSync(new URL('./fixtures/sandbox/input.txt', import.meta.url), 'utf8');
const name = `speccontrol-o1-${randomUUID()}`;
const label = `speccontrol.spike=${name}`;
let containerId;
const checks = [];

function docker(args) {
  const r = spawnSync('docker', args, { encoding: 'utf8', shell: false, windowsHide: true,
    timeout: 20000, maxBuffer: 131072 });
  if (r.error || r.status !== 0) throw new Error(`Docker ${args[0]} failed: ${r.error?.code ?? r.status}`);
  return r.stdout.trim();
}
function inspect() {
  const info = JSON.parse(docker(['inspect', containerId]))[0];
  assert.equal(info.Config.Labels['speccontrol.spike'], name);
  assert.equal(info.Id, containerId);
  return info;
}
function check(id, shell) {
  docker(['exec', containerId, '/bin/bash', '-euc', shell]);
  checks.push(id);
}

try {
  const image = JSON.parse(docker(['image', 'inspect', 'postgres:17-bookworm']))[0];
  assert.match(image.Id, /^sha256:[a-f0-9]{64}$/);
  assert.equal(image.Os, 'linux');
  containerId = docker(['create', '--pull=never', '--name', name, '--label', label,
    '--network=none', '--read-only', '--user=65534:65534', '--cap-drop=ALL',
    '--security-opt=no-new-privileges:true', '--pids-limit=32', '--memory=128m',
    '--memory-swap=128m', '--cpus=0.5', '--no-healthcheck',
    '--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=8m,mode=1777',
    '--tmpfs=/var/lib/postgresql/data:rw,noexec,nosuid,nodev,size=1m,mode=1777',
    '--mount', `type=bind,source=${fixture},target=/fixture,readonly`,
    '--workdir=/tmp', '--entrypoint=/bin/bash', image.Id,
    '-euc', 'sleep 600 & wait']);
  assert.match(containerId, /^[a-f0-9]{64}$/);
  const config = inspect();
  assert.equal(config.HostConfig.NetworkMode, 'none');
  assert.equal(config.HostConfig.ReadonlyRootfs, true);
  assert.equal(config.Config.User, '65534:65534');
  assert.equal(config.HostConfig.PidsLimit, 32);
  assert.equal(config.HostConfig.Memory, 134217728);
  assert.equal(config.HostConfig.NanoCpus, 500000000);
  assert.equal(config.HostConfig.Privileged, false);
  assert.equal(config.HostConfig.PublishAllPorts, false);
  assert.ok(!config.HostConfig.PortBindings || Object.keys(config.HostConfig.PortBindings).length === 0);
  const binds = config.Mounts.filter(m => m.Type === 'bind');
  assert.equal(binds.length, 1);
  assert.equal(binds[0].Destination, '/fixture');
  assert.equal(binds[0].RW, false);
  assert.equal(config.Mounts.filter(m => m.Type === 'volume').length, 0);
  docker(['start', containerId]);
  check('read-approved-fixture', 'test "$(cat /fixture/input.txt)" = SPECCONTROL_SYNTHETIC_INPUT');
  check('deny-fixture-write', 'if (echo changed > /fixture/input.txt) 2>/dev/null; then exit 1; fi');
  check('deny-root-write', 'if (echo changed > /etc/speccontrol-canary) 2>/dev/null; then exit 1; fi');
  check('allow-ephemeral-write', 'echo synthetic > /tmp/canary; test "$(cat /tmp/canary)" = synthetic');
  check('deny-executable-tmp', 'cp /bin/true /tmp/probe-executable; if /tmp/probe-executable 2>/dev/null; then exit 1; fi');
  check('no-host-sockets-or-home-mount', 'test ! -e /var/run/docker.sock; test ! -e /run/docker.sock; test ! -e /host; test ! -e /mnt/c');
  check('nonroot-no-capabilities', 'test "$(id -u)" = 65534; grep -Eq "^CapEff:[[:space:]]+0+$" /proc/self/status; grep -Eq "^NoNewPrivs:[[:space:]]+1$" /proc/self/status');
  check('no-default-route', '! grep -Eq "^[^[:space:]]+[[:space:]]+00000000[[:space:]]" /proc/net/route');
  // Reserved documentation address, no service/contact intended. Require no-route,
  // not just a timeout/refusal that could hide a broken command or absent listener.
  check('deny-outbound-network', 'if timeout 2 bash -c "echo probe > /dev/tcp/192.0.2.1/9" 2>/tmp/network-error; then exit 1; fi; grep -q "Network is unreachable" /tmp/network-error');
  assert.equal(inspect().State.Running, true);
  checks.push('reconcile-running-by-owned-id');
  const processes = docker(['top', containerId, '-eo', 'pid,comm']);
  assert.match(processes, /bash/); assert.match(processes, /sleep/);
  docker(['stop', '--time=1', containerId]);
  const stopped = inspect();
  assert.equal(stopped.State.Running, false);
  assert.equal(stopped.State.Pid, 0);
  checks.push('stop-container-and-child-confirmed');
  assert.equal(readFileSync(new URL('./fixtures/sandbox/input.txt', import.meta.url), 'utf8'), before);
  checks.push('host-fixture-unchanged');
  console.log(JSON.stringify({ imageId: image.Id, dockerIsolation: 'bounded-probe-passed', checks,
    agentExecuted: false, runtimeRecoveryVerified: false }, null, 2));
} finally {
  // Recover a create response lost to a timeout by the unique name + ownership label.
  if (!containerId) {
    const found = docker(['ps', '-aq', '--filter', `name=^/${name}$`, '--filter', `label=${label}`]);
    if (found) { assert.match(found, /^[a-f0-9]+$/); containerId = docker(['inspect', '--format={{.Id}}', found]); }
  }
  if (containerId) {
    inspect(); // Exact ID and ownership label required before destructive cleanup.
    docker(['rm', '-f', '-v', containerId]);
    assert.equal(docker(['ps', '-aq', '--filter', `label=${label}`]), '');
    console.log('cleanup: owned disposable container removed; no image or host data deleted');
  }
}

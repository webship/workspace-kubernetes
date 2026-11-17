/**
 * Without a cluster, every K8S verb says so in one sentence instead of printing kubectl's internals (#20).
 *
 * With no current context kubectl falls back to localhost:8080 and prints "couldn't get current server API group
 * list…" (or "the connection to the server localhost:8080 was refused"), five times over. Each verb now asks for
 * the context first. The lines are run for real with bash against a stand-in kubectl that writes down its calls.
 */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

import { kubernetesRuntime } from '../src/index';
import { NO_CONTEXT } from '../src/lib/runtime';

function project(withChart = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-no-context-'));
  fs.mkdirSync(path.join(dir, 'k8s'));
  fs.writeFileSync(path.join(dir, 'k8s', 'deployment.yaml'), 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: site1\n  namespace: web\n');
  if (withChart) fs.writeFileSync(path.join(dir, 'Chart.yaml'), 'name: site1\n');
  return dir;
}

function bin(context: boolean) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-bin-'));
  const log = path.join(dir, 'calls.log');
  const body = (name: string) => `#!/bin/bash\nprintf '%s %s\\n' "${name}" "$*" >> "${log}"\n`
    + (name === 'kubectl' ? `if [ "$1 $2" = "config current-context" ]; then ${context ? 'echo kind-r9; exit 0' : 'echo "error: current-context is not set" >&2; exit 1'}; fi\n` : '')
    + 'exit 0\n';
  for (const name of ['kubectl', 'helm']) fs.writeFileSync(path.join(dir, name), body(name), { mode: 0o755 });
  return { dir, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean) : []) };
}

const run = (line: string, cwd: string, b: { dir: string }) => spawnSync('/bin/bash', ['-c', line], { cwd, encoding: 'utf8', env: { PATH: b.dir, HOME: os.tmpdir() } });

test('with no context, every verb stops at one sentence and asks kubectl nothing else', () => {
  for (const chart of [false, true]) {
    const dir = project(chart);
    const p = kubernetesRuntime.detect(dir);
    assert.ok(p);
    for (const [name, verb] of Object.entries(kubernetesRuntime.verbs)) {
      const b = bin(false);
      const out = run(verb.cmd(p, 'site1'), dir, b);
      assert.strictEqual(out.status, 1, `${name}: exit 1`);
      assert.strictEqual(out.stdout.trim(), NO_CONTEXT, `${name}: the one sentence`);
      assert.deepStrictEqual(b.calls(), ['kubectl config current-context'], `${name}: nothing else was asked`);
    }
  }
  assert.match(NO_CONTEXT, /no current context.*~\/\.kube\/config.*kubectl config use-context <name>/);
});

test('with a context, each verb runs its own command after the check', () => {
  const dir = project(false);
  const p = kubernetesRuntime.detect(dir);
  const b = bin(true);
  const out = run(kubernetesRuntime.verbs.status.cmd(p!, 'site1'), dir, b);
  assert.strictEqual(out.status, 0, out.stdout + out.stderr);
  assert.deepStrictEqual(b.calls(), ['kubectl config current-context', 'kubectl get pods,svc,ingress -n web -o wide']);
});

test('the state does not wait on a cluster that is not there', async () => {
  const calls: string[][] = [];
  const lib: any = { run: async (_cmd: string, args: string[]) => { calls.push(args); return args[0] === 'config' ? { ok: false, code: 1, stdout: '', stderr: 'error: current-context is not set' } : { ok: true, code: 0, stdout: 'x Running', stderr: '' }; } };
  const dir = project(false);
  assert.strictEqual(await kubernetesRuntime.state(kubernetesRuntime.detect(dir)!, dir, lib), 'unknown');
  assert.deepStrictEqual(calls, [['config', 'current-context']], 'no get pods without a context');
});

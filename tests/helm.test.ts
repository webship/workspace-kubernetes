/**
 * A Helm chart needs helm, and the plugin says so (#7).
 *
 * Apply and Delete the resources run helm on a project with a Chart.yaml, but the manifest named only kubectl and
 * the session checked only kubectl: on a machine without helm the verb failed with "helm: command not found".
 */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

import { kubernetesRuntime } from '../src/index';

function chart() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-helm-'));
  fs.writeFileSync(path.join(dir, 'Chart.yaml'), 'name: site1\n');
  fs.mkdirSync(path.join(dir, 'templates'));
  fs.writeFileSync(path.join(dir, 'templates', 'deployment.yaml'), 'kind: Deployment\nmetadata:\n  name: site1\n  namespace: web\n');
  return dir;
}

function bin(withHelm: boolean) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-helm-bin-'));
  const log = path.join(dir, 'calls.log');
  const stub = (name: string) => fs.writeFileSync(path.join(dir, name), `#!/bin/bash\nprintf '%s %s\\n' "${name}" "$*" >> "${log}"\nexit 0\n`, { mode: 0o755 });
  stub('kubectl');
  if (withHelm) stub('helm');
  return { dir, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean) : []) };
}

const run = (line: string, cwd: string, b: { dir: string }) => spawnSync('/bin/bash', ['-c', line], { cwd, encoding: 'utf8', env: { PATH: b.dir, HOME: os.tmpdir() } });

test('without helm, Apply and Delete on a chart say helm is missing and where to get it, and run nothing', () => {
  const dir = chart();
  const p = kubernetesRuntime.detect(dir)!;
  for (const verb of ['start', 'stop']) {
    const b = bin(false);
    const out = run(kubernetesRuntime.verbs[verb].cmd(p, 'site1'), dir, b);
    assert.strictEqual(out.status, 1, verb);
    assert.strictEqual(out.stdout.trim(), 'helm is not installed, and this project is a Helm chart (Chart.yaml): https://helm.sh/docs/intro/install/');
    assert.deepStrictEqual(b.calls(), ['kubectl config current-context'], `${verb}: only the context was asked`);
  }
});

test('with helm, the chart is installed and removed with helm; manifests never ask for helm', () => {
  const dir = chart();
  const p = kubernetesRuntime.detect(dir)!;
  const b = bin(true);
  assert.strictEqual(run(kubernetesRuntime.verbs.start.cmd(p, 'site1'), dir, b).status, 0);
  assert.deepStrictEqual(b.calls(), ['kubectl config current-context', 'helm upgrade --install site1 . -n web --create-namespace']);
  const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-plain-'));
  fs.mkdirSync(path.join(plain, 'k8s'));
  fs.writeFileSync(path.join(plain, 'k8s', 'deployment.yaml'), 'kind: Deployment\nmetadata:\n  name: site1\n');
  assert.doesNotMatch(kubernetesRuntime.verbs.start.cmd(kubernetesRuntime.detect(plain)!, 'site1'), /helm/);
});

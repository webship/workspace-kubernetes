/**
 * Kubernetes, as a container runtime: a project with manifests (k8s/, kubernetes/), a kustomization
 * or a Helm chart. The namespace and the app name come from the first manifest's metadata.
 */

import fs from 'fs';
import path from 'path';
import type { ContainerProject, ContainerRuntime } from '@webship.co/workspace-container';

interface K8sProject extends ContainerProject { kind: 'manifests' | 'kustomize' | 'helm'; namespace: string; app: string }

function firstManifest(dir: string, sub: string): string {
  try {
    for (const f of fs.readdirSync(path.join(dir, sub)).sort()) {
      if (/\.ya?ml$/.test(f)) return fs.readFileSync(path.join(dir, sub, f), 'utf8');
    }
  } catch (_) { /* no folder */ }
  return '';
}

export function detectK8s(dir: string): K8sProject | null {
  let file = ''; let kind: K8sProject['kind'] = 'manifests'; let text = '';
  if (fs.existsSync(path.join(dir, 'Chart.yaml'))) { file = 'Chart.yaml'; kind = 'helm'; text = firstManifest(dir, 'templates'); }
  else if (fs.existsSync(path.join(dir, 'kustomization.yaml')) || fs.existsSync(path.join(dir, 'kustomization.yml'))) { file = fs.existsSync(path.join(dir, 'kustomization.yaml')) ? 'kustomization.yaml' : 'kustomization.yml'; kind = 'kustomize'; text = firstManifest(dir, '.'); }
  else if (fs.existsSync(path.join(dir, 'k8s'))) { file = 'k8s'; text = firstManifest(dir, 'k8s'); }
  else if (fs.existsSync(path.join(dir, 'kubernetes'))) { file = 'kubernetes'; text = firstManifest(dir, 'kubernetes'); }
  else return null;
  const meta = text.slice(text.indexOf('metadata:'));
  const app = (meta.match(/^\s+name:\s*["']?([\w.-]+)/m) || [])[1] || path.basename(dir);
  const namespace = (meta.match(/^\s+namespace:\s*["']?([\w.-]+)/m) || [])[1] || 'default';
  return { file, kind, namespace, app, name: `${namespace}/${app}` };
}

const ns = (p: ContainerProject) => `-n ${(p as K8sProject).namespace}`;
const app = (p: ContainerProject) => (p as K8sProject).app;

export const kubernetesRuntime: ContainerRuntime = {
  id: 'kubernetes',
  label: 'K8S',
  title: 'Kubernetes',
  cli: 'kubectl',
  cliHint: 'https://kubernetes.io/docs/tasks/tools/',
  detect: (dir) => detectK8s(dir),
  state: async (p, dir, lib) => {
    const out = await lib.run('kubectl', ['get', 'pods', '-n', (p as K8sProject).namespace, '-l', `app=${app(p)}`, '--no-headers'], dir, { timeoutMs: 20 * 1000 });
    if (!out.ok) return 'unknown';
    return /Running/.test(String(out.stdout)) ? 'up' : 'down';
  },
  verbs: {
    start: { label: 'Apply', icon: 'play', kind: 'start', cmd: (p) => { const k = p as K8sProject; return k.kind === 'helm' ? `helm upgrade --install ${k.app} . ${ns(p)} --create-namespace` : k.kind === 'kustomize' ? `kubectl apply -k .` : `kubectl apply -f ${k.file}/`; } },
    stop: { label: 'Delete the resources', icon: 'trash', kind: 'stop', danger: true, cmd: (p) => { const k = p as K8sProject; return k.kind === 'helm' ? `helm uninstall ${k.app} ${ns(p)}` : k.kind === 'kustomize' ? `kubectl delete -k .` : `kubectl delete -f ${k.file}/`; } },
    restart: { label: 'Rollout restart', icon: 'refresh', kind: 'restart', cmd: (p) => `kubectl rollout restart deployment ${ns(p)} -l app=${app(p)} && kubectl rollout status deployment ${ns(p)} -l app=${app(p)}` },
    status: { label: 'Pods, services, ingress', icon: 'info', kind: 'status', cmd: (p) => `kubectl get pods,svc,ingress ${ns(p)} -o wide` },
    logs: { label: 'Logs (follow)', icon: 'file-text', kind: 'logs', cmd: (p) => `kubectl logs ${ns(p)} -l app=${app(p)} -f --tail=200 --all-containers` },
    shell: { label: 'Shell in the deployment', icon: 'terminal', kind: 'shell', cmd: (p) => `kubectl exec -it ${ns(p)} deploy/${app(p)} -- sh` },
    describe: { label: 'Describe the deployment', icon: 'file-edit', kind: 'other', cmd: (p) => `kubectl describe deploy ${ns(p)} ${app(p)}` },
    context: { label: 'Current context', icon: 'world', kind: 'other', cmd: () => 'kubectl config current-context && kubectl cluster-info' },
  },
  init: { label: 'Scaffold a k8s/ folder with a Deployment and a Service here', cmd: (name) => `mkdir -p k8s && [ -e k8s/deployment.yaml ] || printf 'apiVersion: apps/v1\\nkind: Deployment\\nmetadata:\\n  name: ${name}\\n  namespace: default\\n  labels:\\n    app: ${name}\\nspec:\\n  replicas: 1\\n  selector:\\n    matchLabels:\\n      app: ${name}\\n  template:\\n    metadata:\\n      labels:\\n        app: ${name}\\n    spec:\\n      containers:\\n        - name: web\\n          image: nginx:alpine\\n          ports:\\n            - containerPort: 80\\n---\\napiVersion: v1\\nkind: Service\\nmetadata:\\n  name: ${name}\\n  namespace: default\\nspec:\\n  selector:\\n    app: ${name}\\n  ports:\\n    - port: 80\\n' > k8s/deployment.yaml`, help: 'One nginx Deployment and its Service, to edit.' },
  menuNote: 'The host ~/.kube is mounted: the verbs use the same contexts',
};

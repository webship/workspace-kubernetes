/**
 * Kubernetes for Webship Workspace.
 *
 * The K8S menu on every project folder that carries Kubernetes manifests (k8s/, kubernetes/, kustomization.yaml or Chart.yaml): the runtime's verbs as terminal
 * sessions in the project, the up/down caption, the site link, and "Scaffold a k8s/ folder with a Deployment and a Service here" when a new folder
 * is made. All of it is the container family's surface (@webship/workspace-container); this
 * package is the Kubernetes runtime plus its host install.
 */

import type { PluginApi } from '@webship/workspace-plugin-api';
import { registerContainer } from '@webship/workspace-container';

import { kubernetesRuntime } from './lib/runtime';

export { kubernetesRuntime };

export function register(api: PluginApi): void {
  registerContainer(api, kubernetesRuntime);
}

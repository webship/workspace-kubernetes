---
name: kubernetes-menu
description: Run a project of a Webship Workspace on Kubernetes through the Kubernetes plugin (`@webship.co/workspace-kubernetes`) — which folder is a Kubernetes project, every entry of the K8S menu and the `kubectl` command behind it, the up or down caption, the site link, the option the New folder form offers, and how to check that `kubectl` is on the machine. Use when asked "is this a Kubernetes project", "what does the K8S menu do", "start this project", "why is there no K8S menu on this project", "the caption says ?", or when a project of the workspace that carries Kubernetes manifests.
argument-hint: '<project>'
---

# kubernetes-menu

Kubernetes for a project of a Webship Workspace (`~/workspace`, container-based, DDEV by default). It
comes with the Kubernetes plugin (`@webship.co/workspace-kubernetes`), a runtime of the container family
(`@webship.co/workspace-container`), like the agent `kubernetes-operator`, the command `/kubernetes-status` and
the prompt `kubernetes-up-and-check`.

The workspace builds its own sites on DDEV. This plugin is for a project that runs on Kubernetes
instead: it gives that project a menu of its own, beside the others.

## Which project gets the menu

A project is a Kubernetes project when its folder carries, looked for in this order, a `Chart.yaml` (a Helm chart), a `kustomization.yaml` or `kustomization.yml` (a kustomization), or a folder `k8s/` or `kubernetes/` (plain manifests). `<namespace>` and `<app>` below are read from the `metadata` of the first manifest: its `namespace:` (`default` when it has none) and its `name:` (the folder's name when it has none).

```bash
cd ~/workspace/<folder>/<project>
ls -d Chart.yaml kustomization.yaml kustomization.yml k8s/ kubernetes/ 2>/dev/null
```

## The K8S menu

On top the menu shows the name of the project and the file it was recognised by. Every
other entry opens a terminal session in the project's folder and runs one command there, so what
`kubectl` prints is what is seen, and a question it asks can be answered.

Plain manifests, in `k8s/` (the same with `kubernetes/`):

| Menu entry | The command, in the project's folder |
| --- | --- |
| **Apply** | `kubectl apply -f k8s/` |
| **Delete the resources** | `kubectl delete -f k8s/` |
| **Rollout restart** | `kubectl rollout restart deployment -n <namespace> -l app=<app> && kubectl rollout status deployment -n <namespace> -l app=<app>` |
| **Pods, services, ingress** | `kubectl get pods,svc,ingress -n <namespace> -o wide` |
| **Logs (follow)** | `kubectl logs -n <namespace> -l app=<app> -f --tail=200 --all-containers` |
| **Shell in the deployment** | `kubectl exec -it -n <namespace> deploy/<app> -- sh` |
| **Describe the deployment** | `kubectl describe deploy -n <namespace> <app>` |
| **Current context** | `kubectl config current-context && kubectl cluster-info` |

A kustomization:

| Menu entry | The command, in the project's folder |
| --- | --- |
| **Apply** | `kubectl apply -k .` |
| **Delete the resources** | `kubectl delete -k .` |
| **Rollout restart** | `kubectl rollout restart deployment -n <namespace> -l app=<app> && kubectl rollout status deployment -n <namespace> -l app=<app>` |
| **Pods, services, ingress** | `kubectl get pods,svc,ingress -n <namespace> -o wide` |
| **Logs (follow)** | `kubectl logs -n <namespace> -l app=<app> -f --tail=200 --all-containers` |
| **Shell in the deployment** | `kubectl exec -it -n <namespace> deploy/<app> -- sh` |
| **Describe the deployment** | `kubectl describe deploy -n <namespace> <app>` |
| **Current context** | `kubectl config current-context && kubectl cluster-info` |

A Helm chart:

| Menu entry | The command, in the project's folder |
| --- | --- |
| **Apply** | `helm upgrade --install <app> . -n <namespace> --create-namespace` |
| **Delete the resources** | `helm uninstall <app> -n <namespace>` |
| **Rollout restart** | `kubectl rollout restart deployment -n <namespace> -l app=<app> && kubectl rollout status deployment -n <namespace> -l app=<app>` |
| **Pods, services, ingress** | `kubectl get pods,svc,ingress -n <namespace> -o wide` |
| **Logs (follow)** | `kubectl logs -n <namespace> -l app=<app> -f --tail=200 --all-containers` |
| **Shell in the deployment** | `kubectl exec -it -n <namespace> deploy/<app> -- sh` |
| **Describe the deployment** | `kubectl describe deploy -n <namespace> <app>` |
| **Current context** | `kubectl config current-context && kubectl cluster-info` |

The menu ends with the note "The host ~/.kube is mounted: the verbs use the same contexts".

### The caption beside the menu

| Caption | What it means |
| --- | --- |
| `up` | `kubectl get pods` for the app, in its namespace, shows a pod Running |
| `down` | It answered, and nothing of the project is running |
| `?` | `kubectl` could not answer: it is not installed where the dashboard runs, or it failed |

### A new folder

The New folder form offers **Scaffold a k8s/ folder with a Deployment and a Service here**: it writes `k8s/deployment.yaml` with one nginx Deployment and its Service, to edit, unless the file is already there.

## Turn it on, and check it

```bash
cd ~/workspace
bash core/scripts/plugins.sh --require @webship.co/workspace-kubernetes
bash core/scripts/plugins.sh --activate kubernetes --with-needs     # adds the AI folders its items land in
bash core/scripts/plugins.sh --install kubernetes
bash core/scripts/plugins.sh --check kubernetes                     # kubectl: found, with its version, or missing
```

The plugin has no settings file. `kubectl` is installed outside the workspace: https://kubernetes.io/docs/tasks/tools/

## Traps

- **The verbs act on the current context of `kubectl`**, whatever cluster that is. The entry **Current context** says which; look before **Apply** and before **Delete the resources**.
- **No context, no verb**: every entry first asks `kubectl config current-context`. With none (no cluster set up on this machine) it answers "kubectl has no current context, so there is no cluster to talk to", with the step that fixes it (the cluster's kubeconfig in `~/.kube/config`, or a local cluster, then `kubectl config use-context <name>`), and runs nothing else. The caption is then `?`.
- **The stop entry of this menu deletes**: there is no stop that keeps the resources. It is drawn in red.
- **The app is found by the label `app=<app>`**: logs, the rollout and the caption select on it. A project whose pods carry another label shows `down` while it runs.
- **The menu has no site link**: the plugin reads no ingress from the files.
- **The dashboard uses the same contexts as the machine**: the `~/.kube` folder of the machine is mounted into its container.
- **A verb answers "kubectl is not installed"**: the terminal session of the menu checks for `kubectl`
  first, and says where to get it.
- **A project on DDEV** keeps the workspace's own menus; this one is not drawn for it unless it
  also carries manifests of its own.

## The book

For any automated functional testing in this work (a Gherkin feature, a step definition, choosing a
step, a test run and its failures), read the book *Automated Functional Testing Recipes* first.

- **Where.** Use the first that exists: `.claude/automated-functional-testing-recipes/` in the project,
  `~/.claude/automated-functional-testing-recipes/` (installed by webship/webship-js-ai-agent,
  webship/webship-js-skills or webship/ai-agents), or
  https://github.com/webship/webship-js-ai-agent/tree/2.0.x/automated-functional-testing-recipes
- **How.** Its `README.md` first, then the chapter that matches the task (one file per chapter,
  named by its subject), not the single complete file.
- **Which wins.** The installed webship-js package and the step pack are the source of truth for
  step phrasing. When they differ from the book, follow them and say so.

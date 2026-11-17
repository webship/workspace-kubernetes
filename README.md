# @webship.co/workspace-kubernetes

Kubernetes for the [Webship Workspace](https://github.com/webship/workspace) dashboard: the **K8S**
menu on every project folder that carries Kubernetes manifests (k8s/, kubernetes/, kustomization.yaml or Chart.yaml), with the runtime's verbs as terminal sessions in
the project, the up/down caption and the site link, and "Scaffold a k8s/ folder with a Deployment and a Service here" when a new folder is made.
A runtime of [`@webship.co/workspace-container`](https://github.com/webship/workspace-container).

A project is a Kubernetes project when it carries `k8s/` or `kubernetes/` (plain manifests), a `kustomization.yaml` (kustomize) or a `Chart.yaml` (Helm). The namespace and the app name are read from the first manifest's metadata; the host's `~/.kube` is mounted into the dashboard container so the verbs use the same contexts.

## Use it

```bash
cd ~/workspace
bash core/scripts/plugins.sh --require github:webship/workspace-kubernetes
bash core/scripts/plugins.sh --activate kubernetes --with-needs
bash core/scripts/plugins.sh --install kubernetes
```

## The items it carries

The workspace is container-based (DDEV by default). Each item lands in the folder of its kind, when
that folder is an active workspace folder, is listed there like any other item, and is installed
into Claude Code from there:

| What | Lands in | What it is for |
| --- | --- | --- |
| The agent `kubernetes-operator` | `ai-agents/` | Says whether a Kubernetes project is up, starts, stops and restarts it with the commands of the K8S menu, and never runs the destroying one on its own |
| The skill `kubernetes-menu` | `ai-skills/` | Which folder is a Kubernetes project, every entry of the K8S menu and its `kubectl` command, the caption, the site link, the New folder option |
| The command `/kubernetes-status` | `ai-commands/` | `/kubernetes-status <project>`: whether it is a Kubernetes project and whether it is up. Read-only |
| The prompt `kubernetes-up-and-check` | `ai-prompts/` | The launch command of a session that starts a Kubernetes project and says whether it came up |

The plugin places no `cmd-*.sh`: every entry of the menu is one `kubectl` command in the project's folder, and a wrapper would add nothing to it. The item bodies are plain Markdown any AI command-line assistant can follow; Claude Code is the default shape (frontmatter, the launch command of the prompt).

How the items are laid out and checked: [docs/plugin-items-pattern.md](docs/plugin-items-pattern.md).

## What it needs

On the machine this plugin needs `kubectl` (https://kubernetes.io/docs/tasks/tools/), and its manifest says so (`needs.commands`). A project that is a Helm chart (`Chart.yaml`) also needs `helm` for Apply and Delete the resources (https://helm.sh/docs/intro/install/): the manifest names it among what a part of the plugin uses (`suggests.commands`), and those two entries say so when it is missing. The workspace reports both and never installs them:

```bash
bash core/scripts/plugins.sh --check kubernetes      # found, with its version, or missing, with how to install it
webship-workspace doctor                        # the same for the core and every plugin
```

It also needs the AI folders its items are placed in (`needs`): `ai-agents`, `ai-skills`, `ai-commands` and `ai-prompts`. `--require` says so, `--activate` and `--install` stop until the workspace has them, and `--with-needs` adds what is missing first. A kind whose folder is not an active workspace folder is skipped, and the install says so. It needs no sites folder: its menu is on the project rows of whatever folders the workspace has.

## The verbs

| Verb | Command |
| --- | --- |
| Apply | `kubectl apply -k .`/`kubectl apply -f k8s/` or `helm upgrade --install <folder> .` |
| Delete | `kubectl delete -f k8s/` (the resources: marked in red) |
| Rollout restart | `kubectl rollout restart deployment -n <namespace> -l app=<name>` |
| Pods | `kubectl get pods,svc,ingress -n <namespace>` |
| Logs | `kubectl logs -n <namespace> -l app=<name> -f --tail=200` |
| Shell | `kubectl exec -it -n <namespace> deploy/<name> -- sh` |
| Describe | `kubectl describe deploy -n <namespace> <name>` |
| Context | `kubectl config current-context && kubectl cluster-info` |

Every verb opens a terminal session in the project folder, so what the CLI prints is what you see,
and a verb that asks a question can be answered.

The `workspacePlugin` block in `package.json` is the manifest the installer reads.

## What the package holds of them

| Path | What it is |
| --- | --- |
| `ai/agents/kubernetes-operator.md` | The agent `kubernetes-operator` |
| `ai/skills/kubernetes-menu/` | The skill `kubernetes-menu` |
| `ai/commands/kubernetes-status.md` | The command `/kubernetes-status` |
| `ai/prompts/kubernetes-up-and-check.md` | The prompt `kubernetes-up-and-check` |
| `tests/items.test.ts` | The shape of every item, and that it names nothing the plugin does not have |

# @webship/workspace-kubernetes

Kubernetes for the [Webship Workspace](https://github.com/webship/workspace) dashboard: the **K8S**
menu on every project folder that carries Kubernetes manifests (k8s/, kubernetes/, kustomization.yaml or Chart.yaml), with the runtime's verbs as terminal sessions in
the project, the up/down caption and the site link, and "Scaffold a k8s/ folder with a Deployment and a Service here" when a new folder is made.
A runtime of [`@webship/workspace-container`](https://github.com/webship/workspace-container).

A project is a Kubernetes project when it carries `k8s/` or `kubernetes/` (plain manifests), a `kustomization.yaml` (kustomize) or a `Chart.yaml` (Helm). The namespace and the app name are read from the first manifest's metadata; the host's `~/.kube` is mounted into the dashboard container so the verbs use the same contexts.

## Use it

```bash
cd ~/workspace
bash core/scripts/plugins.sh --require github:webship/workspace-kubernetes
bash core/scripts/plugins.sh --activate kubernetes
bash core/scripts/plugins.sh --install kubernetes
```

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

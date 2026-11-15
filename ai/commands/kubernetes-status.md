---
description: Say whether a Webship Workspace project is a Kubernetes project and whether it is up, with the read-only commands the K8S menu runs. Nothing is started, stopped or removed.
argument-hint: '<project>'
---

# /kubernetes-status

Say where this project stands on Kubernetes: `$ARGUMENTS`

The argument is one word: the project, which is its folder name in a workspace folder. With no
project, stop and ask for one.

The workspace is container-based (DDEV by default); `kubectl` runs on the machine, in the project's
folder. This command only reads: these are the entries of the K8S menu of the Kubernetes plugin
(`@webship.co/workspace-kubernetes`) that change nothing. Never start, stop, restart, build or remove anything here.

## 1. Find the project and its file

```bash
ls -d ~/workspace/*/<project>
cd ~/workspace/<folder>/<project>
ls -d Chart.yaml kustomization.yaml kustomization.yml k8s/ kubernetes/ 2>/dev/null
```

If none of those files is there, stop and say that it is not a Kubernetes project: the K8S menu is
not on it either.

## 2. Is `kubectl` here

```bash
cd ~/workspace && bash core/scripts/plugins.sh --check kubernetes
```

If it is missing, say so with the address it gives (https://kubernetes.io/docs/tasks/tools/), and stop.

## 3. Read

```bash
cd ~/workspace/<folder>/<project>
kubectl get pods,svc,ingress -n <namespace> -o wide
kubectl describe deploy -n <namespace> <app>
kubectl config current-context && kubectl cluster-info
```

## 4. Report

The file the project was recognised by, then what is running and what is not, in the words of
the answer. Say which context the commands spoke to: it is the cluster everything else acts on.

For starting or stopping it, hand over to the agent `kubernetes-operator`.

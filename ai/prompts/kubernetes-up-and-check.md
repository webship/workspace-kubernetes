Start a Kubernetes project of the workspace and say whether it came up, with the commands of the K8S menu.

```
claude --permission-mode bypassPermissions """
Start the Kubernetes project <project> and tell me whether it came up
# ~/workspace/<folder>/<project> · container-based (DDEV by default) · kubectl runs on the machine, in the project's folder
# only the commands below; nothing that removes containers or data; if a command fails, show why and stop

1. cd ~/workspace/<folder>/<project> ; ls -d Chart.yaml kustomization.yaml kustomization.yml k8s/ kubernetes/ 2>/dev/null
   stop if none of those files is there: it is not a Kubernetes project
2. cd ~/workspace ; bash core/scripts/plugins.sh --check kubernetes ; cd ~/workspace/<folder>/<project>
   stop if kubectl is missing, and tell me where to get it
   then: kubectl config current-context && kubectl cluster-info
   tell me which cluster that is, and wait for my yes before the next step
3. start it:
   Plain manifests, in `k8s/` (the same with `kubernetes/`): kubectl apply -f k8s/
   A kustomization: kubectl apply -k .
   A Helm chart: helm upgrade --install <app> . -n <namespace> --create-namespace
4. read its state:
   kubectl get pods,svc,ingress -n <namespace> -o wide

Tell me what is running and what is not, and which context it was.
If it did not come up, show me the lines that say why. Do not try other flags, and remove nothing.
"""
```

The text between the triple quotes is plain: it can be given to another AI command-line assistant as it is.

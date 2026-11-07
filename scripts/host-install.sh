#!/usr/bin/env bash
## The host side of the Kubernetes plugin: the CLI on this machine. Run by core/scripts/plugins.sh
## --install kubernetes, and by core/scripts/install.sh for every installed plugin that ships one.
## Idempotent: whatever is already there is reported, not redone; nothing is installed unasked.
set -u
BIN='';
for candidate in "$(command -v kubectl 2>/dev/null)" "${HOME}/.local/bin/kubectl" ; do
  [ -n "${candidate}" ] && [ -x "${candidate}" ] && { BIN="${candidate}"; break; }
done
if [ -n "${BIN}" ] ; then
  printf '  ✓ %-16s %s\n' "kubectl" "${BIN}" ;
else
  printf '  ✗ %-16s %s\n' "kubectl" "missing — the K8S menu's verbs need it (kubernetes.io/docs/tasks/tools)" ;
fi

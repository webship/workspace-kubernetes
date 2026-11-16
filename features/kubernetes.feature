Feature: The Kubernetes plugin on a project row
  Once the plugin is activated and installed, every project folder that carries Kubernetes manifests (k8s/, kubernetes/, kustomization.yaml or Chart.yaml) carries
  the K8S menu, and the Plugins page lists the plugin with its four steps.

  # The Plugins page names each plugin; the package is on the plugin's own page (the row shows it on hover only).
  Scenario: The plugin is listed on the Plugins page, and its own page names its package
    Given I am on "/settings/plugins"
     Then I should see "Kubernetes"
     When I go to "/settings/plugin/kubernetes"
     Then I should see "@webship.co/workspace-kubernetes"

  # The AI folders are searched by name: with every plugin on, a folder lists more than one page of items.
  Scenario: The AI Agents folder lists the agent the plugin ships
    Given I am on "/ai-agents?q=kubernetes-operator"
     Then I should see "kubernetes-operator"

  Scenario: The AI Skills folder lists the skill the plugin ships
    Given I am on "/ai-skills?q=kubernetes-menu"
     Then I should see "kubernetes-menu"

  Scenario: The AI Commands folder lists the command the plugin ships
    Given I am on "/ai-commands?q=kubernetes-status"
     Then I should see "kubernetes-status"

  Scenario: The AI Prompts folder lists the prompt the plugin ships
    Given I am on "/ai-prompts?q=kubernetes-up-and-check"
     Then I should see "kubernetes-up-and-check"

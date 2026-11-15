Feature: The Kubernetes plugin on a project row
  Once the plugin is activated and installed, every project folder that carries Kubernetes manifests (k8s/, kubernetes/, kustomization.yaml or Chart.yaml) carries
  the K8S menu, and the Plugins page lists the plugin with its four steps.

  Scenario: The plugin is listed on the Plugins page
    Given I am on "/settings/plugins"
     Then I should see "Kubernetes"
      And I should see "@webship.co/workspace-kubernetes"

  Scenario: The AI Agents folder lists the agent the plugin ships
    Given I am on "/ai-agents"
     Then I should see "kubernetes-operator"

  Scenario: The AI Skills folder lists the skill the plugin ships
    Given I am on "/ai-skills"
     Then I should see "kubernetes-menu"

  Scenario: The AI Commands folder lists the command the plugin ships
    Given I am on "/ai-commands"
     Then I should see "kubernetes-status"

  Scenario: The AI Prompts folder lists the prompt the plugin ships
    Given I am on "/ai-prompts"
     Then I should see "kubernetes-up-and-check"

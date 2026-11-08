Feature: The Kubernetes plugin on a project row
  Once the plugin is activated and installed, every project folder that carries Kubernetes manifests (k8s/, kubernetes/, kustomization.yaml or Chart.yaml) carries
  the K8S menu, and the Plugins page lists the plugin with its four steps.

  Scenario: The plugin is listed on the Plugins page
    Given I am on "/settings/plugins"
     Then I should see "Kubernetes"
      And I should see "@webship.co/workspace-kubernetes"

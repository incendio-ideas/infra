import { Construct } from "constructs";
import { App, Chart } from "cdk8s";

import { KubeDeployment, KubeService, IntOrString } from "./imports/k8s";
import { ServiceType } from "cdk8s-plus-27";

class IncendioChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const label = { app: "auth" };

    new KubeDeployment(this, "AuthDeployment", {
      spec: {
        replicas: 2,
        selector: {
          matchLabels: label,
        },
        template: {
          metadata: { labels: label },
          spec: {
            containers: [
              {
                name: "auth",
                image: "ghcr.io/incendio-ideas/auth:main",
                ports: [{ containerPort: 80 }],
              },
            ],
          },
        },
      },
    });

    new KubeService(this, "AuthService", {
      spec: {
        type: ServiceType.LOAD_BALANCER,
        ports: [{ port: 80, targetPort: IntOrString.fromNumber(80) }],
        selector: label,
      },
    });
  }
}

const app = new App();
new IncendioChart(app, "Incendio");
app.synth();

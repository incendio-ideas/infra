import { Construct } from "constructs";
import { App, Chart } from "cdk8s";

import { KubeDeployment, KubeService, IntOrString } from "./imports/k8s";
import { ServiceType } from "cdk8s-plus-27";

class IncendioChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const authLabels = { app: "auth" };

    new KubeDeployment(this, "AuthDeployment", {
      spec: {
        replicas: 2,
        selector: {
          matchLabels: authLabels,
        },
        template: {
          metadata: { labels: authLabels },
          spec: {
            containers: [
              {
                name: "auth",
                image: "ghcr.io/incendio-ideas/auth:main",
                ports: [{ containerPort: 50051 }],
              },
            ],
            imagePullSecrets: [{ name: "ghcr-io-creds" }],
          },
        },
      },
    });

    new KubeService(this, "AuthService", {
      spec: {
        ports: [{ port: 50051, targetPort: IntOrString.fromNumber(50051) }],
        selector: authLabels,
      },
    });

    const apiGatewayLabels = { app: "api-gateway" };

    new KubeDeployment(this, "ApiGatewayDeployment", {
      spec: {
        replicas: 2,
        selector: {
          matchLabels: apiGatewayLabels,
        },
        template: {
          metadata: { labels: apiGatewayLabels },
          spec: {
            containers: [
              {
                name: "api-gateway",
                image: "ghcr.io/incendio-ideas/api-gateway:main",
                ports: [{ containerPort: 8080 }],
              },
            ],
            imagePullSecrets: [{ name: "ghcr-io-creds" }],
          },
        },
      },
    });

    new KubeService(this, "ApiGatewayService", {
      spec: {
        type: ServiceType.LOAD_BALANCER,
        ports: [{ port: 80, targetPort: IntOrString.fromNumber(8080) }],
        selector: apiGatewayLabels,
      },
    });
  }
}

const app = new App();
new IncendioChart(app, "Incendio");
app.synth();

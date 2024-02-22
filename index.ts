import { Construct } from "constructs";
import { App, Chart, YamlOutputType } from "cdk8s";

import { KubeDeployment, KubeService, IntOrString } from "./imports/k8s";
import { ServiceType } from "cdk8s-plus-27";

class IncendioChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const authLabels = { app: "auth" };

    new KubeDeployment(this, "AuthDeployment", {
      metadata: {
        name: "auth-deployment",
      },
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
                image: "ghcr.io/incendio-ideas/auth:0.0.1",
                ports: [{ containerPort: 50051 }],
              },
            ],
            imagePullSecrets: [{ name: "ghcr-io-creds" }],
          },
        },
      },
    });

    new KubeService(this, "AuthService", {
      metadata: {
        name: "auth-service",
      },
      spec: {
        ports: [{ port: 50051, targetPort: IntOrString.fromNumber(50051) }],
        selector: authLabels,
      },
    });

    const apiGatewayLabels = { app: "api-gateway" };

    new KubeDeployment(this, "ApiGatewayDeployment", {
      metadata: {
        name: "api-gateway-deployment",
      },
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
                image: "ghcr.io/incendio-ideas/api-gateway:0.0.1",
                ports: [{ containerPort: 8000 }],
              },
            ],
            imagePullSecrets: [{ name: "ghcr-io-creds" }],
          },
        },
      },
    });

    new KubeService(this, "ApiGatewayService", {
      metadata: {
        name: "api-gateway-service",
      },
      spec: {
        type: ServiceType.LOAD_BALANCER,
        ports: [{ port: 80, targetPort: IntOrString.fromNumber(8000) }],
        selector: apiGatewayLabels,
      },
    });

    const webLabels = { app: "web" };

    new KubeDeployment(this, "WebDeployment", {
      metadata: {
        name: "web-deployment",
      },
      spec: {
        replicas: 2,
        selector: {
          matchLabels: webLabels,
        },
        template: {
          metadata: { labels: webLabels },
          spec: {
            containers: [
              {
                name: "web",
                image: "ghcr.io/incendio-ideas/web:0.0.7",
                ports: [{ containerPort: 8000 }],
                command: ["sh", "-c", "envsubst < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]
              },
            ],
            imagePullSecrets: [{ name: "ghcr-io-creds" }],
          },
        },
      },
    });

    new KubeService(this, "WebService", {
      metadata: {
        name: "web-service",
      },
      spec: {
        type: ServiceType.LOAD_BALANCER,
        ports: [{ port: 80, targetPort: IntOrString.fromNumber(8000) }],
        selector: webLabels,
      },
    });
  }
}

const app = new App({
  yamlOutputType: YamlOutputType.FILE_PER_APP,
});

new IncendioChart(app, "Incendio");
app.synth();

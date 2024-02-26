import { Construct } from "constructs";
import { App, Chart, Helm, YamlOutputType } from "cdk8s";

import { KubeDeployment, KubeService, IntOrString, KubeNamespace } from "./imports/k8s";
import { ServiceType } from "cdk8s-plus-27";

class IncendioChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new KubeNamespace(this, "IncendioNamespace", {
      metadata: {
        name: "incendio",
      },
    });

    const authLabels = { app: "auth" };

    new KubeDeployment(this, "AuthDeployment", {
      metadata: {
        name: "auth",
        namespace: "incendio",
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
                image: "ghcr.io/incendio-ideas/auth:0.0.2",
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
        name: "auth",
        namespace: "incendio",
      },
      spec: {
        ports: [{ port: 50051, targetPort: IntOrString.fromNumber(50051) }],
        selector: authLabels,
      },
    });

    const apiGatewayLabels = { app: "api-gateway" };

    new KubeDeployment(this, "ApiGatewayDeployment", {
      metadata: {
        name: "api-gateway",
        namespace: "incendio",
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
                image: "ghcr.io/incendio-ideas/api-gateway:0.0.3",
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
        name: "api-gateway",
        namespace: "incendio",
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
        name: "web",
        namespace: "incendio",
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
                image: "ghcr.io/incendio-ideas/web:0.0.15",
                ports: [{ containerPort: 8000 }],
              },
            ],
            imagePullSecrets: [{ name: "ghcr-io-creds" }],
          },
        },
      },
    });

    new KubeService(this, "WebService", {
      metadata: {
        name: "web",
        namespace: "incendio",
      },
      spec: {
        type: ServiceType.LOAD_BALANCER,
        ports: [{ port: 80, targetPort: IntOrString.fromNumber(8000) }],
        selector: webLabels,
      },
    });

    new Helm(this, "Database", {
      chart: "bitnami/postgresql",
      namespace: "incendio",
      values: {
        fullnameOverride: "db",
        global: {
          postgresql: {
            postgresqlUsername: "user",
            postgresqlPassword: "password",
          },
        },
        persistence: {
          enabled: true,
          size: "8Gi",
        },
        initdbScripts: {
          'create-multiple-dbs.sh': `
            #!/bin/bash
            set -e
            psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
              CREATE DATABASE auth;
            EOSQL
          `
        }
      },
    });
  }
}

const app = new App({
  yamlOutputType: YamlOutputType.FILE_PER_APP,
});

new IncendioChart(app, "Incendio");
app.synth();

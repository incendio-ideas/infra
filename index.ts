import { Construct } from "constructs";
import { App, Chart } from "cdk8s";

import { KubeDeployment, KubeService, IntOrString } from "./imports/k8s";
import { ServiceType } from "cdk8s-plus-27";

class MyChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const label = { app: "hello-k8s" };

    new KubeService(this, "service", {
      spec: {
        type: ServiceType.LOAD_BALANCER,
        ports: [{ port: 80, targetPort: IntOrString.fromNumber(80) }],
        selector: label,
      },
    });

    new KubeDeployment(this, "deployment", {
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
                name: "nginx",
                image: "nginx:latest",
                ports: [{ containerPort: 80 }],
              },
            ],
          },
        },
      },
    });
  }
}

const app = new App();
new MyChart(app, "MyChart");
app.synth();

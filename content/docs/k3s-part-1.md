---
date: 2026-07-13T00:00:00Z
draft: true
title: 1. Rebuilding my cluster from scratch
tags:
---
It's been a while since I've posted on here, but now that my exams are finally over, I have some time to dedicate to the lab! We're going to start by rebuilding the cluster from scratch, to be easily scalable, built on k3s, and follow a hybrid architecture that allows it to run on both the cloud and at home.

> This is **Part 1** of an **X-Part** series, on rebuilding the lab

## Hardware
As of now, I have the following hardware:
- A Raspberry Pi 5, with a 256GB WD M.2 NVMe drive attached, after my previous Samsung 840 series drive failed
	- 1x 256GB HDD
	- 1x 512GB HDD
	- More to come... hopefully
- A Raspberry Pi 3, with a 64GB SD card, for small, mission-critical workloads
- A couple of Oracle Cloud VMs in different regions, for a geo-distributed ingress
	- 2x in UK-South
	- 2x in EU-Marseille
	- 2x in AP-Mumbai

## Planning
To allow my nodes to communicate across sites, I will be using Tailscale. I initially planned to migrate to NetBird, but my testing showed it wasn't as resilient as Tailscale.

### Goals
A couple of goals that I set for myself, so I knew what I was working towards:
- As much as possible should be configured via manifests, stored in git
- Avoid running tasks on the cluster bare-metal
- Should be easy to scale - just have to add worker nodes and label for specific workloads, e.g. longhorn
- Should have fast yet resilient routing for accessing resources remotely.

We know all of this works now, as this site is being served from there! You can actually see that status of public facing services by going [here](https://up.vmd1.dev).

### Core components
To start off, we need to install k3s. As I wished to deploy my custom instance of Traefik, during install, I passed the flag `--disable=traefik` to prevent the default Traefik ingress controller from being installed.

Before we go any further, we need to deploy some core services that are shared between different applications. These were:
- Redis
- PostgreSQL
- Traefik
- Longhorn

## Traefik
I started with Traefik, being a key component of my architecture. Using k3s's embedded HelmChart CRD, I was able to using a standard Kubernetes manifest to control the deployment. I wanted Traefik to be deployed on all ingress nodes, and controlplane nodes. My ingress nodes were the Oracle VMs in the cloud. For now, I will use hardcoded IPs in my DNS configuration on Cloudflare, but a future goal I have is using GeoDNS to route a user's request to the closest healthy ingress node, eliminating downtime and latency - more on that in the next part. I also wanted it on my controlplane nodes, so I could use split-horizon DNS at home, and route traffic locally when possible, e.g. my future media server.

Here is my Traefik config:
```
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: traefik
  namespace: kube-system
spec:
  repo: https://traefik.github.io/charts
  chart: traefik
  version: 41.0.1
  targetNamespace: traefik
  valuesContent: |-
    deployment:
      kind: DaemonSet
      dnsPolicy: ClusterFirstWithHostNet

    updateStrategy:
      type: RollingUpdate
      rollingUpdate:
        maxUnavailable: 4
        maxSurge: 0

    hostNetwork: true

    service:
      enabled: false

    tolerations:
      - operator: "Exists"

    ports:
      web:
        port: 80
      websecure:
        port: 443
      dot:
        port: 853
        expose:
          default: true

    additionalArguments:
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--entrypoints.web.http.redirections.entrypoint.permanent=true"
      - "--log.level=INFO"
      - "--accesslog=true"
      - "--accesslog.format=json"
      - "--providers.kubernetescrd.allowCrossNamespace=true"
      - "--serverstransport.forwardingtimeouts.dialtimeout=15s"
      - "--serverstransport.forwardingtimeouts.responseheadertimeout=15s"
      - "--serverstransport.forwardingtimeouts.idleconntimeout=30s"

    tlsStore:
      default:
        defaultCertificate:
          secretName: cluster-wildcard-tls

    securityContext:
      capabilities:
        add:
          - NET_BIND_SERVICE
        drop:
          - ALL
      readOnlyRootFilesystem: true
      runAsGroup: 0
      runAsNonRoot: false
      runAsUser: 0
```

As it was running as a DaemonSet, across nodes with a variety of possible taints, I thought it wise to add an `operator: "Exists` toleration, to ensure it is schedules on any node matching my selectors.

This led me to an issue - Traefik will refuse to handle certs if deployed as a DaemonSet, which makes complete sense. But then - what do I use instead?

The answer is actually quite simple.
### Cert Manager
`cert-manager` is an application for all your certificate needs in Kubernetes. It grabs certificates for you and stores them in secrets, which can be accessed on any node. This makes it significantly easier to manage them.

Deployment remained relatively simple, no node selectors as it doesn't need much:
```
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: cert-manager
  namespace: kube-system
spec:
  repo: https://charts.jetstack.io
  chart: cert-manager
  version: v1.20.2
  targetNamespace: cert-manager
  valuesContent: |-
    crds:
      enabled: true
    dns01RecursiveNameservers: 1.1.1.1:53,8.8.8.8:53
    dns01RecursiveNameserversOnly: true
```

Then, you use the `ClusterIssuer` and `Certificate` CRDs to define the issuer, in my case, Let's Encrypt, with a dns-cloudflare challenge. 
```
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-cloudflare
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: me@vmd1.dev
    privateKeySecretRef:
      name: letsencrypt-cloudflare-key
    solvers:
      - dns01:
          cloudflare:
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: apiToken
```

and then the `Certificate` itself.
```
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: cluster-wildcard-tls
  namespace: traefik
spec:
  secretName: cluster-wildcard-tls
  issuerRef:
    name: letsencrypt-cloudflare
    kind: ClusterIssuer
  commonName: vmd1.dev
  dnsNames:
    - vmd1.dev
    - "*.vmd1.dev"
```

This is then picked up by my Traefik config above, ensuring easy management.

## PostgreSQL
In my opinion, probably the easiest part to setup. I used the `CNPG` - Cloud-native Postgres Operator. This handles the entire deployment for you, with everything being configured by Kubernetes resources. This kept my entire architecture in git, and made it very simple to deploy.

Their documentation is quite thorough, so I won't replicate it. It can be found [here](https://cloudnative-pg.io/docs/1.30/installation_upgrade). Unfortunately, I only have 1 main worker node so far, so I can't use any of its replication features yet - but an aim of this cluster is to be easily scalable, so this is definitely a part of that. As of now, I have one central database cluster, for all my applications, as it's just easier to manage. It also reduces memory and CPU overhead, both of which are precious in todays economy.

In order to copy all data, I spun up a temporary postgres container on my laptop, and ran `pg_dumpall`, before importing that into CNPG.

## Redis
Oddly enough, this was one of the more tricky ones to configure. It seems there are no easily scalable versions of this already there, so I built my own manifest, where you tag 3 nodes as sentinels, and 3 or more and redis hosts. It will then dynamically scale to all tagged nodes.

```
apiVersion: v1
kind: Namespace
metadata:
  name: redis

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-bootstrap-config
  namespace: redis
data:
  redis-bootstrap.sh: |
    #!/bin/sh
    CONF="/data/redis.conf"
    SENTINEL_HOST="redis-sentinel"
    SENTINEL_PORT="26379"

    # Always remove the old config file to avoid stale settings on container restart
    rm -f "$CONF"

    echo "Checking for existing master from Sentinel..."
    MASTER_INFO=$(timeout 3 redis-cli -h "$SENTINEL_HOST" -p "$SENTINEL_PORT" --raw sentinel get-master-addr-by-name mymaster 2>/dev/null)

    # Verify sentinel-reported master is actually alive
    if [ -n "$MASTER_INFO" ]; then
        MASTER_IP=$(echo "$MASTER_INFO" | head -n 1)
        echo "Sentinel reported master at $MASTER_IP. Verifying connectivity..."
        if timeout 3 redis-cli -h "$MASTER_IP" -p 6379 ping >/dev/null 2>&1; then
            echo "Found active master via Sentinel: $MASTER_IP"
        else
            echo "Sentinel reported master $MASTER_IP is unreachable. Ignoring."
            MASTER_INFO=""
        fi
    fi

    if [ -n "$MASTER_INFO" ]; then
        MASTER_IP=$(echo "$MASTER_INFO" | head -n 1)
        if [ "$MASTER_IP" = "$POD_IP" ]; then
            echo "I am the active master."
            echo "dir /data" > "$CONF"
            echo "protected-mode no" >> "$CONF"
            echo "replica-announce-ip $POD_IP" >> "$CONF"
        else
            echo "I am a replica of $MASTER_IP"
            echo "dir /data" > "$CONF"
            echo "protected-mode no" >> "$CONF"
            echo "replicaof $MASTER_IP 6379" >> "$CONF"
            echo "replica-announce-ip $POD_IP" >> "$CONF"
        fi
    else
        echo "No master found via Sentinel. Bootstrapping initial master..."

        # Wait for at least 3 peers to appear in DNS so we have all nodes resolved
        echo "Waiting for headless service to resolve all 3 peers..."
        for i in $(seq 1 30); do
            PEERS=$(getent ahosts redis | awk '{print $1}' | grep -E '^[0-9]' | sort -u)
            PEER_COUNT=$(echo "$PEERS" | wc -l)
            if [ "$PEER_COUNT" -ge 3 ]; then
                echo "Resolved all 3 peers."
                break
            fi
            echo "Only found $PEER_COUNT peers. Retrying..."
            sleep 2
        done

        # Fallback if we don't resolve 3 peers, just use what we have
        PEERS=$(getent ahosts redis | awk '{print $1}' | grep -E '^[0-9]' | sort -u)

        # Deterministically choose the lowest IP address as initial master
        BOOTSTRAP_MASTER=$(echo "$PEERS" | sort -n -t . -k 1,1 -k 2,2 -k 3,3 -k 4,4 | head -n 1)
        if [ -z "$BOOTSTRAP_MASTER" ]; then
            BOOTSTRAP_MASTER="$POD_IP"
        fi

        if [ "$BOOTSTRAP_MASTER" = "$POD_IP" ]; then
            echo "I am the bootstrap master ($POD_IP)."
            echo "dir /data" > "$CONF"
            echo "protected-mode no" >> "$CONF"
            echo "replica-announce-ip $POD_IP" >> "$CONF"
        else
            echo "Bootstrap master is $BOOTSTRAP_MASTER. Setting replicaof."
            echo "dir /data" > "$CONF"
            echo "protected-mode no" >> "$CONF"
            echo "replicaof $BOOTSTRAP_MASTER 6379" >> "$CONF"
            echo "replica-announce-ip $POD_IP" >> "$CONF"
        fi
    fi

    exec redis-server "$CONF"

  sentinel-bootstrap.sh: |
    #!/bin/sh
    CONF="/data/sentinel.conf"
    SENTINEL_HOST="redis-sentinel"
    SENTINEL_PORT="26379"

    # Always remove old config file to start fresh
    rm -f "$CONF"

    echo "Finding current Redis master..."

    # Try querying other Sentinel instances first to see if they already have a master
    MASTER_INFO=""
    for i in $(seq 1 15); do
        MASTER_INFO=$(timeout 3 redis-cli -h "$SENTINEL_HOST" -p "$SENTINEL_PORT" --raw sentinel get-master-addr-by-name mymaster 2>/dev/null)
        if [ -n "$MASTER_INFO" ]; then
            # Verify the master IP reported by sentinel is alive
            MASTER_IP=$(echo "$MASTER_INFO" | head -n 1)
            if timeout 3 redis-cli -h "$MASTER_IP" -p 6379 ping >/dev/null 2>&1; then
                break
            else
                echo "Sentinel reported master $MASTER_IP is unreachable."
                MASTER_INFO=""
            fi
        fi
        sleep 2
    done

    if [ -n "$MASTER_INFO" ]; then
        MASTER_IP=$(echo "$MASTER_INFO" | head -n 1)
        echo "Found master via Sentinel: $MASTER_IP"
    else
        echo "No master found via Sentinel. Checking redis headless service..."

        # Wait for redis headless service to resolve at least 3 nodes
        for i in $(seq 1 30); do
            PEERS=$(getent ahosts redis | awk '{print $1}' | grep -E '^[0-9]' | sort -u)
            PEER_COUNT=$(echo "$PEERS" | wc -l)
            if [ "$PEER_COUNT" -ge 3 ]; then
                break
            fi
            sleep 2
        done

        PEERS=$(getent ahosts redis | awk '{print $1}' | grep -E '^[0-9]' | sort -u)

        # Query the peers to see if any of them is already running as a master
        MASTER_IP=""
        for peer in $PEERS; do
            ROLE=$(timeout 3 redis-cli -h "$peer" info replication 2>/dev/null | grep 'role:master')
            if [ -n "$ROLE" ]; then
                # Verify it is reachable
                if timeout 3 redis-cli -h "$peer" -p 6379 ping >/dev/null 2>&1; then
                    MASTER_IP="$peer"
                    echo "Found active Redis master at: $MASTER_IP"
                    break
                fi
            fi
        done

        if [ -z "$MASTER_IP" ]; then
            # If no node is active master, default to the deterministic initial bootstrap master
            MASTER_IP=$(echo "$PEERS" | sort -n -t . -k 1,1 -k 2,2 -k 3,3 -k 4,4 | head -n 1)
            echo "No active master found. Using initial bootstrap master: $MASTER_IP"
        fi

        if [ -z "$MASTER_IP" ]; then
             echo "Could not resolve redis. Exiting."
             exit 1
        fi
    fi

    echo "port 26379" > "$CONF"
    echo "dir /data" >> "$CONF"
    echo "sentinel monitor mymaster $MASTER_IP 6379 2" >> "$CONF"
    echo "sentinel down-after-milliseconds mymaster 5000" >> "$CONF"
    echo "sentinel failover-timeout mymaster 10000" >> "$CONF"
    echo "sentinel parallel-syncs mymaster 1" >> "$CONF"
    echo "protected-mode no" >> "$CONF"
    echo "sentinel announce-ip $POD_IP" >> "$CONF"
    echo "sentinel announce-port 26379" >> "$CONF"

    echo "Starting Sentinel..."
    exec redis-server "$CONF" --sentinel

---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: redis
  labels:
    app: redis
spec:
  publishNotReadyAddresses: true
  clusterIP: None
  ports:
    - port: 6379
      targetPort: 6379
      name: redis
  selector:
    app: redis

---
apiVersion: v1
kind: Service
metadata:
  name: redis-sentinel
  namespace: redis
  labels:
    app: redis-sentinel
spec:
  publishNotReadyAddresses: true
  ports:
    - port: 26379
      targetPort: 26379
      name: sentinel
  selector:
    app: redis-sentinel

---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: redis
  namespace: redis
  labels:
    app: redis
spec:
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      tolerations:
        - operator: Exists
      nodeSelector:
        redis: "true"
      containers:
        - name: redis
          image: redis:7.2-alpine
          command: ["/bin/sh", "/bootstrap/redis-bootstrap.sh"]
          env:
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
          ports:
            - containerPort: 6379
              name: redis
          volumeMounts:
            - name: bootstrap
              mountPath: /bootstrap
            - name: data
              mountPath: /data
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
      volumes:
        - name: bootstrap
          configMap:
            name: redis-bootstrap-config
            defaultMode: 0755
        - name: data
          hostPath:
            path: /var/lib/redis-data
            type: DirectoryOrCreate

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-sentinel
  namespace: redis
  labels:
    app: redis-sentinel
spec:
  serviceName: redis-sentinel
  replicas: 3
  selector:
    matchLabels:
      app: redis-sentinel
  template:
    metadata:
      labels:
        app: redis-sentinel
    spec:
      tolerations:
        - operator: Exists
      nodeSelector:
        sentinel: "true"
      containers:
        - name: sentinel
          image: redis:7.2-alpine
          command: ["/bin/sh", "/bootstrap/sentinel-bootstrap.sh"]
          env:
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
          ports:
            - containerPort: 26379
              name: sentinel
          volumeMounts:
            - name: bootstrap
              mountPath: /bootstrap
            - name: data
              mountPath: /data
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
      volumes:
        - name: bootstrap
          configMap:
            name: redis-bootstrap-config
            defaultMode: 0755
        - name: data
          emptyDir: {}

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-haproxy-config
  namespace: redis
data:
  haproxy.cfg: |
    global
        log stdout format raw local0

    defaults
        log     global
        mode    tcp
        timeout connect 4s
        timeout client  30m
        timeout server  30m
        timeout check   2s

    resolvers k8s
        nameserver dns1 10.43.0.10:53
        accepted_payload_size 8192
        hold valid 5s

    frontend redis_front
        bind *:6379
        default_backend redis_back

    backend redis_back
        mode tcp
        option tcp-check
        tcp-check send info\ replication\r\n
        tcp-check expect string role:master
        server-template redis 10 redis.redis.svc.cluster.local:6379 resolvers k8s resolve-prefer ipv4 check inter 2s fall 3 rise 2

---
apiVersion: v1
kind: Service
metadata:
  name: redis-master
  namespace: redis
  labels:
    app: redis-haproxy
spec:
  type: LoadBalancer
  ports:
    - port: 6379
      targetPort: 6379
      name: redis
  selector:
    app: redis-haproxy

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-haproxy
  namespace: redis
  labels:
    app: redis-haproxy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: redis-haproxy
  template:
    metadata:
      labels:
        app: redis-haproxy
    spec:
      tolerations:
        - operator: Exists
      containers:
        - name: haproxy
          image: haproxy:2.8-alpine
          ports:
            - containerPort: 6379
              name: redis
          volumeMounts:
            - name: config
              mountPath: /usr/local/etc/haproxy
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
      volumes:
        - name: config
          configMap:
            name: redis-haproxy-config
```

This allowed me to ensure redis remained available, being a cornerstone of many services, including Authentik.

## Longhorn
Storage, after networking, is one of the most crucial layers in a cluster. Without persistent storage for your workloads, most applications will fail. Although I am currently limited to one actual worker node right now - I intend on scaling up in the future, and this makes it easy by just tagging nodes based on whether they need the longhorn client or will also run the longhorn disk services.
```
apiVersion: v1
kind: Namespace
metadata:
  name: longhorn-system
---
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: longhorn
  namespace: kube-system
spec:
  repo: https://charts.longhorn.io
  chart: longhorn
  targetNamespace: longhorn-system
  valuesContent: |-
    global:
      nodeSelector:
        longhorn-client: "true"
    defaultSettings:
      createDefaultDiskLabeledNodes: true
      systemManagedComponentsNodeSelector: "longhorn-client:true"
      taintToleration: ""
      backupTarget: "s3://longhorn@us-east-1/"
      backupTargetCredentialSecret: "longhorn-backup-secret"
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: longhorn-ui
  namespace: longhorn-system
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`longhorn.kmnet.uk`)
      kind: Rule
      services:
        - name: longhorn-frontend
          port: 80
      middlewares:
        - name: authentik-auth
          namespace: authentik
```

The UI for this was protected by Authentik, which I setup shortly after this by just using the HelmChart and pointing it to my database on CNPG.

## Conclusion
This is just the start! I have much more planned, and once I had a basic cluster running, things only became easier and more interesting.
AI-Powered Distributed Log Anomaly Detection Platform

Transformer-Based Semantic Embeddings • Cosine Similarity Engine • Kubernetes-Native Observability

📌 Executive Summary
This project implements a distributed, transformer-powered log anomaly detection platform designed for real-time observability in microservices environments.

Unlike traditional rule-based log monitoring systems, this architecture leverages:
•Semantic vector embeddings
•Unsupervised similarity-based anomaly scoring
•Kubernetes-native service orch•estration
•Prometheus-based metric exposition
•Grafana-based real-time alerting

The system transforms raw logs into high-dimensional embeddings and performs contextual similarity analysis to detect behavioral deviations at scale.

🏗️ System Architecture
Client → Ingest API → MongoDB → Embedding Service → Anomaly Engine → Prometheus → Grafana
Deployed inside a Kubernetes cluster (Minikube locally) as isolated microservices.

🧩 Core Components

1️⃣ Ingest Service (Log Gateway)
Tech Stack:
•Node.js (Express)
•MongoDB (Mongoose)
•Prometheus client instrumentation

Responsibilities:
•Accepts structured JSON logs via REST API
•Persists logs in MongoDB
•Initializes anomaly processing lifecycle flags:
•embeddingProcessed: false
•anomalyProcessed: false
•Exposes /metrics endpoint for Prometheus scraping

This service acts as the entry point into the anomaly pipeline.

2️⃣ MongoDB (State Store)
Collection: logs

Each document contains:

{
  "service": "auth-service",
  "level": "error",
  "message": "JWT token expired",
  "embedding": [384-dimensional vector],
  "embeddingProcessed": true,
  "anomalyScore": 0.3479,
  "anomalyProcessed": true,
  "createdAt": ISODate,
  "updatedAt": ISODate
}

MongoDB acts as:
•Durable event storage
•Vector persistence layer
•State coordination medium between services

3️⃣ Embedding Service (Semantic Vectorization Engine)

Tech Stack:
•Node.js
•@xenova/transformers
•ONNX-backed inference
•MiniLM-L6-v2 model (384 dimensions)

Model Used:
Xenova/all-MiniLM-L6-v2
This model transforms raw log text into normalized semantic embeddings in ℝ³⁸⁴.

Processing Logic:
For every unprocessed log:

embedding = Transformer(message)

Options used:

pooling: "mean"
normalize: true

Result:

384-dimensional normalized embedding
Stored directly in MongoDB
embeddingProcessed = true

This enables semantic comparison rather than keyword-based matching.

4️⃣ Anomaly Engine (Similarity-Based Detection Core)
Approach:
Unsupervised, contextual anomaly scoring using cosine similarity.

Algorithm
For each newly embedded log:
•Fetch last N processed logs (window size = 20)
•Compute cosine similarity against each prior embedding
•Calculate average similarity
Derive anomaly score:
•AnomalyScore=1−Avg(CosineSimilarity)
•Cosine Similarity Formula
similarity=∣∣A∣∣⋅∣∣B∣∣/(A⋅B)
	​
Properties:
1.0 → identical
0.0 → orthogonal
-1.0 → opposite

By using normalized embeddings, magnitude bias is eliminated.

Interpretation
Avg Similarity	Anomaly Score	Meaning
•~0.95	0.05	Normal
•~0.70	0.30	Suspicious
•~0.40	0.60	Highly anomalous

This provides contextual anomaly detection rather than static thresholds.

☸ Kubernetes Deployment
Each service runs as:
•Deployment
•ClusterIP Service
•Namespace: ai-log-anomaly
Why Kubernetes?
•Pod isolation
•Declarative configuration
•Horizontal scalability
•Service discovery via DNS
•Production parity architecture

🔍 Observability Layer
📊 Prometheus Integration

Each microservice exposes:
/metrics
Using:
prom-client.collectDefaultMetrics()

Prometheus scrapes:
•CPU usage
•Memory usage
•Process metrics
•Custom anomaly metrics
•Log processing counters
Service discovery configured via Kubernetes annotations.
<img width="500" height="200" alt="Prometheus" src="https://github.com/user-attachments/assets/d116bcb3-16df-4253-b6fb-f9da6f7daec1" />


📈 Grafana Dashboards

Built dashboards include:
•Log ingestion rate
•Embedding processing throughput
•Anomaly processing throughput
•CPU usage per service
•Memory usage per service
<img width="400" height="200" alt="dashboard1" src="https://github.com/user-attachments/assets/7c83513a-dc94-4146-b7b6-e0fa7f7ae7f8" />
<img width="400" height="200" alt="dashboard2" src="https://github.com/user-attachments/assets/fbb54712-386a-4656-bd44-0fdadd07fabb" />



🚨 Alerting System
Alert rule example:
IF anomaly_score > 0.5
FOR 1m
THEN fire alert

Alerts configured in Grafana:
•Evaluation interval
•Threshold conditions
•Alert lifecycle states

🧠 Design Philosophy
Why Embeddings Instead of Regex?
Traditional log monitoring:

•Rule-based
•Signature-based
•Keyword-driven
•Hard to maintain
•High false positives

This system:

•Understands semantic similarity
•Detects novel patterns
•Adapts to log evolution
•No hardcoded rules

⚙ Scalability Considerations
•Stateless services
•Horizontal scaling possible
•Batch-based log processing
•Sliding similarity window
•Kubernetes-native autoscaling compatible
🧪 Example Flow
Client sends:
{
  "service": "auth-service",
  "level": "error",
  "message": "JWT token expired for user 999"
}
•Ingest stores document
•Embedding service vectorizes message
•Anomaly engine computes similarity
•Score written back
•Prometheus scrapes metrics
•Grafana visualizes trends
•Alert fires if threshold breached

🔬 Why This Is Production-Grade
•Transformer-based NLP inference inside microservice
•Unsupervised anomaly detection
•Kubernetes-native orchestration
•Real-time metrics pipeline
•Observability-driven architecture
•Alerting automation
•Fully containerized workflow

🏆 Technical Stack
•Node.js
•Express.js
•MongoDB
•Mongoose
•Transformers.js
•ONNX runtime
•Docker
•Kubernetes (Minikube)
•Prometheus
•Grafana
•Cosine Similarity
•Vector Embeddings
•REST APIs
•Microservices Architecture

🎯 Real-World Impact
This platform demonstrates:
•Applied NLP in infrastructure monitoring
•ML-powered observability
•Distributed system design
•Cloud-native deployment
•Production monitoring best practices

It bridges AI + DevOps + Distributed Systems into a single cohesive platform.

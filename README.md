# LabMetrics
Operational Tracking, Reagent Consumption &amp; TAT Analytics API for Hospital Laboratories.


Overview
LabRamos-Metrics is a dedicated analytical microservice built to process, aggregate, and monitor key operational indicators for clinical laboratories. Designed to work alongside LabRamos, this system tracks turnaround times (TAT), reagent waste, and pre-analytical/analytical error rates without handling sensitive Patient Health Information (PHI).

Tech Stack
Language: TypeScript (Strict Mode)
Runtime / Framework: Node.js, Express
Database: MySQL (Advanced SQL: Window Functions, CTEs, Aggregations)
Analytics & BI: Power BI (REST API / Direct Queries)
Architecture: Modular REST API Architecture
Key Features
Throughput & TAT Monitoring: Tracks batch completion times and processing speeds across lab departments.
Reagent & Scrap Rate Analytics: Monitors consumption, repeat tests, and preventable waste (e.g., clotting, insufficient sample).
Incident & Error Auditing: Categorizes operational failures (Pre-analytical, Extraction, Physician Input, Instrumental) for Pareto analysis.
Power BI Integration: Ready-to-use schemas optimized for BI modeling and executive reporting.

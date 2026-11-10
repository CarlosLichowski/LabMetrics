# LabRamos-Metrics / LabMetrics LIS



> Operational Tracking, Reagent Consumption & TAT Analytics API for Hospital Laboratories.

## Overview
**LabMetrics** (LabRamos-Metrics) is a dedicated analytical microservice and backend built to process, aggregate, and monitor key operational indicators for clinical laboratories, optimized specifically for **Roche Cobas 6000 (c501 & ISE)** systems. Designed to work alongside [LabRamos](https://labramos.web.app/), this system tracks turnaround times (TAT), reagent differential consumption, and error rates without handling sensitive Patient Health Information (PHI).

## Tech Stack & Architecture
- **Language & Runtime:** TypeScript (Strict Mode), Node.js, Express
- **Database (Cloud Serverless):** TiDB Cloud (MySQL Compatible, SSL/TLS Secure Transport)
- **Frontend Integration:** React, Vite (Deployed via Firebase Hosting)
- **Deployment & Hosting:** Render (Web Service Backend)
- **Analytics & BI:** Power BI (REST API / Direct Queries via SQL Window Functions & Views)

## Key Features
- **Differential Reagent Inventory Control:** Automated monthly calculations using opening/closing counts for Roche Cobas c501 and ISE modules.
- **Throughput & TAT Monitoring:** Tracks batch completion times and processing speeds across lab departments.
- **Incident & Error Auditing:** Categorizes operational failures (Pre-analytical, Extraction, Instrumental, Reagent) for deep quality control.
- **Power BI & BI Views:** Pre-compiled database views (`v_cierres_detallados`, `v_consumos_mensuales_diferencial`) optimized for executive reporting.

## Environment Variables (Production / Render)
To run the backend service successfully, configure the following environment variables in your hosting provider (e.g., Render):



```env
DB_HOST=gateway01.sa-east-1.prod.aws.tidbcloud.com
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=labmetrics_db
DB_PORT=4000
PORT=10000
```

🔌 API Endpoints
GET /api/metricas - Operational metrics and consumption analytics.

GET /api/cierres-mensuales - Cobas monthly inventory closures and differential calculations.

GET /api/pruebas - Official test catalog (ACN channels and modules).

POST /api/analisis-ia - AI-powered operational insights service.

##  Arquitectura del Sistema

                              ┌──────────────────────────────────────────────┐
                              │     LabRamos Frontend (React / TypeScript)   │
                              │   - Floating Trigger (Glow Pulse)            │
                              │   - Slate Console / Drawer (#0f172a, #2563eb)│
                              │   - Markdown & Table Parser                  │
                              │   - Interactive Source Badges Popover        │
                              └──────────────────────┬───────────────────────┘
                                                     │ HTTP POST /api/chatbot/query
                                                     ▼
                              ┌──────────────────────────────────────────────┐
                              │      Labmetrics Backend (Express 5 / TS)     │
                              │      Route & Controller /api/chatbot/query   │
                              └──────┬───────────────────────┬───────────────┘
                                     │                       │
                  ┌──────────────────┴─────────────┐         │
                  ▼                                ▼         ▼
    ┌──────────────────────────┐     ┌───────────────────────────┐   ┌──────────────────────────┐
    │ Knowledge Base & RAG     │     │ Base de Datos Operativa   │   │ Motor de Inferencia      │
    │  - Reagent Inserts       │     │  - cierres_diarios        │   │  - Gemini 2.5 Flash /    │
    │    (CREJ2, GLUC3, HIL)   │     │  - registro_incidencias   │   │    OpenAI GPT-4o-mini    │
    │  - Analyzer Manuals      │     │  - inventario_reactivos   │   │  - Local Clinical Logic  │
    │    (Cobas 6000, LauraXL) │     │  - pruebas & secciones    │   │    Synthesizer (Offline) │
    │  - Derivaciones Hospital │     │                           │   │                          │
    └──────────────────────────┘     └───────────────────────────┘   └──────────────────────────┘



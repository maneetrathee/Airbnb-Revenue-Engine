# Airbnb Revenue Engine (Final Year B.Tech Project)
**Submission Report (≤ 6 pages)**  

**Student**: ____________________  \\
**University / College**: ____________________  \\
**Department**: ____________________  \\
**Guide / Supervisor**: ____________________  \\
**Date**: ____________________  

---

## Abstract
Short‑term rental (STR) pricing is highly dynamic and influenced by seasonality, occupancy trends, lead time, competitor positioning, and local demand shocks. Many hosts either price manually or rely on opaque “smart pricing” tools that do not explain decisions and do not integrate market intelligence or investment feasibility. This project delivers an end‑to‑end **Airbnb Revenue Engine** that provides (i) AI‑assisted explainable dynamic pricing and forecasting, (ii) neighborhood‑level RevPAR analytics and recommendations, (iii) investment arbitrage simulation (Airbnb vs Buy‑to‑Let), and (iv) operational automation using scheduled syncs and email digests. The system is implemented as a full‑stack application using **React + FastAPI + PostgreSQL**, with scheduled workflows via **APScheduler** and reporting via **email digests**.

---

## 1. Problem Statement and Objectives

### 1.1 Problem Statement
STR hosts must decide nightly pricing under uncertainty. Demand changes frequently due to:
- seasonality and day‑of‑week effects,
- booking lead time and length of stay,
- neighborhood occupancy variation,
- competitor pricing and market positioning,
- events/holidays and sudden demand spikes.

Manual pricing is inconsistent and time‑consuming. Existing tools may provide a price but often are **black‑box**, **generic**, and do not connect operational pricing to **market intelligence** (RevPAR/ADR/occupancy) or **investment viability** (arbitrage).

### 1.2 Objectives
- Build an explainable **dynamic pricing engine** with a multi‑day forecast.
- Provide **Market Intelligence** using ADR, occupancy, RevPAR, and trends.
- Generate actionable guidance (raise/hold/drop) from RevPAR analytics.
- Provide **investment arbitrage** analysis with pessimistic/base/optimistic scenarios.
- Implement **Smart Sync** automation with logs and scheduled reporting.
- Deliver a usable full‑stack product with authentication and dashboards.

---

## 2. Literature Review

### 2.1 Revenue Management and Dynamic Pricing
Dynamic pricing is widely adopted in airlines and hotels to maximize expected revenue under uncertain demand. STR pricing can be modeled similarly using interpretable signals (e.g., occupancy pressure, lead time) and market anchoring via comparable listings.

### 2.2 STR KPIs and RevPAR
Key metrics used in hospitality analytics:
- **ADR (Average Daily Rate)**: average realized nightly rate.
- **Occupancy Rate**: fraction of nights booked/available.
- **RevPAR (Revenue per Available Room)**:  
  \[
  \text{RevPAR} = \text{ADR} \times \text{Occupancy Rate}
  \]

### 2.3 Competitor-aware Pricing and Similarity Search
Competitor positioning (“comps”) is frequently used to anchor pricing. Similarity can be calculated from structured data (room type, neighborhood) and from semantic text embeddings of listing descriptions.

### 2.4 Explainability in Decision Support
User trust increases when systems explain “why” a recommendation was produced. Common approaches include exposing the contribution of each factor/signal to the final decision.

### 2.5 Automation, Monitoring, and Reporting
Industry systems reduce manual work via scheduling, logging, and periodic reporting (digests/weekly summaries). These features improve consistency and operational usability.

---

## 3. Methodology / System Design

### 3.1 System Architecture
The project is designed as a full‑stack system:
- **Frontend**: React SPA with dashboard UI and Clerk authentication.
- **Backend**: FastAPI service exposing pricing, RevPAR, arbitrage, properties, and sync APIs.
- **Database**: PostgreSQL storing market data and app state (properties, settings, logs).
- **Scheduler**: APScheduler for nightly sync and periodic report jobs.
- **Email**: Resend for digest and weekly summaries.

**Figure 1: System Architecture**

![System Architecture](diagrams/system-architecture.png)

### 3.2 Pricing Engine (Explainable Signals + Guardrails)
**Inputs**: neighborhood, date & nights, guardrails (min/max), optional property description.  
**Steps**: market data fetch → comparable listings → base anchor → pricing signals → aggregation → guardrail clamp → outputs (price, breakdown, forecast).

**Figure 2: Pricing Engine Pipeline**

![Pricing Engine Pipeline](diagrams/pricing-engine-pipeline.png)

### 3.3 RevPAR Analytics and Recommendation
For a selected neighborhood the backend computes ADR, occupancy, RevPAR, listing count, and trend. Based on observed market strength/weakness, the system produces an actionable recommendation (**raise/hold/drop**) with reasoning.

### 3.4 Investment Arbitrage Method
Inputs (purchase price, room type, LTV, interest rate, mortgage type) are evaluated under pessimistic/base/optimistic scenarios. The module compares Airbnb returns against a Buy‑to‑Let baseline and produces a verdict and financial metrics.

### 3.5 Smart Sync Automation and Reporting
Users configure global and per‑property guardrails. Nightly scheduler runs pricing for eligible properties, stores results in logs, and generates daily/weekly email summaries.

**Figure 3: Smart Sync Automation Loop**

![Smart Sync Automation Loop](diagrams/smart-sync-loop.png)

---

## 4. Implementation Completed So Far (≥ 50%)

### 4.1 Backend (Completed)
- Pricing engine with multi‑signal explainable logic and multi‑day forecast.
- Predict‑price endpoint using comparable listings (similarity search) + forecast enrichment.
- RevPAR APIs: neighborhoods, summary, trend, and optimization recommendation.
- Arbitrage API: scenario simulation + Airbnb vs Buy‑to‑Let comparison.
- Properties APIs: CRUD + per‑property sync settings.
- Smart Sync APIs: global settings, manual trigger, and sync logs.
- Scheduler jobs: nightly sync, daily digest, weekly report.
- Email digest/report generation and sending via Resend.

### 4.2 Frontend (Completed)
- Dashboard shell (sidebar + routed pages) with Clerk authentication integration.
- Pricing dashboard: input → KPIs → forecast → competitor list + map.
- Market Intel dashboard: neighborhood selection → KPIs → trend chart → optimizer.
- Arbitrage dashboard: input form → scenario outputs → exportable report.
- Properties page: CRUD + per‑property sync configuration.
- Settings page: Smart Sync configuration + scheduler status + logs + email setup/test.

**50% completion justification**: the primary workflows are implemented end‑to‑end (UI → APIs → logic/DB → outputs) and are demonstrable.

---

## 5. Results / Output (Current)
- **AI Pricing**: recommended nightly price, signal breakdown, multi‑day forecast, comparable listings visualization.
- **Market Intel**: RevPAR/ADR/occupancy KPIs, neighborhood trends, pricing action recommendation.
- **Arbitrage**: scenario outputs with verdict and comparison against Buy‑to‑Let.
- **Automation**: scheduler status, sync logs history, and email digest/report capability.

*(Add UI screenshots here if required by your department.)*

---

## 6. Future Work Plan

### 6.1 Industry-level hardening
- Standardize configuration (remove hardcoded URLs; consistent environment variables).
- Refactor backend into clean layers (routers vs services; central DB/config).
- Consistent request/response models, validation, and error handling.
- Stronger multi‑tenant security (authenticated user scoping for all data).
- Unit + integration tests and CI automation.

### 6.2 Innovation roadmap (impact + patent direction)
- Explainable pricing waterfall chart (base price + each signal contribution).
- Multi‑objective strategy modes (occupancy‑max / revenue‑max / balanced / risk‑averse).
- Closed‑loop tuning using logged outcomes to adapt signal weights per neighborhood/property.
- Event/anomaly‑aware pricing using calendar/event signals and pattern similarity.

### 6.3 Deployment and documentation
- Docker deployment (frontend + backend + postgres) with `.env.example`.
- Improved README, demo script, and diagrams.
- Dataset documentation (sources, proxies, limitations).


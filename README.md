# InsightIQ

A **local-only** AI-powered analytics platform. Upload a CSV or Excel file and
get a full intelligence suite — auto-generated dashboards, narrative insights,
root-cause investigation, time-series forecasting, actionable recommendations,
and a natural-language Q&A interface. Everything runs on your machine. The only
outbound call is to the Groq API, and it only ever receives **schema profiles
and locally-computed aggregate numbers** — never your raw data.

## Features

| Layer | What it does |
|---|---|
| **Auto-Dashboard** | KPI cards + adaptive charts generated instantly from your data — no LLM needed |
| **Ask Questions** | Type a question in plain English → DuckDB SQL is generated, validated, and executed → a chart + one-line takeaway is returned |
| **Auto-Insights** | Narrative report surfacing period-over-period changes, Pareto concentration, segment comparisons, and outliers |
| **Root-Cause Investigation** | Additive contribution breakdown explaining *why* a metric changed, with offsetting-movement and churn detection |
| **Forecasting** | Trend + seasonality model with 95 % prediction intervals and historical anomaly flagging |
| **Decision Copilot** | Prioritised action recommendations scored by impact × confidence |
| **Story Mode** | One-click fullscreen AI presentation walking through all analytics layers — ready for stakeholders |
| **Theme Toggle** | Light / dark mode with OS-preference fallback and zero-flash hydration |

## Quick start

### 1. Backend (Python 3.12)

> Use **Python 3.12**, not 3.14. Some dependencies (`numpy`, `duckdb`) lag new
> Python releases.

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python --version          # → Python 3.12.x

pip install -r requirements.txt

# Create your env file:
cp .env.example .env
# Edit .env and add your GROQ_API_KEY (required for AI features)

uvicorn app.main:app --reload --port 8000
```

Then open **http://127.0.0.1:8000/docs** to explore the API.

### 2. Frontend (Next.js) — in a second terminal

```bash
cd frontend
npm install          # first time only
npm run dev          # starts on http://localhost:3000
```

Open **http://localhost:3000**, drop a file onto the page, and the dashboard
renders in seconds. A theme toggle (top-right) switches light / dark.

The frontend talks to the backend at `http://127.0.0.1:8000` by default;
override with `NEXT_PUBLIC_API_BASE` in `frontend/.env.local`.

> **Requires** Node 18 +. Stack: Next.js 16 (App Router) · React 19 ·
> Tailwind CSS v4 · Recharts 3. UI primitives are hand-authored in shadcn/ui
> style.

### 3. Try it

Drop `samples/sales_sample.csv` (business metrics) or `samples/ts_demo.csv`
(time-series) onto the upload zone and explore the full analytics suite.

## How the Q&A works

Type a question ("total revenue by product", "which region sells most?"). The
pipeline:

1. **Text → SQL** — Groq writes DuckDB SQL from your question + schema profile
2. **Validation** — a fail-fast chain: column allowlist → single `SELECT`/`WITH`
   only → table allowlist → `EXPLAIN` bind-check → injected `LIMIT`
3. **Execution** — the query runs read-only on a DuckDB cursor
4. **Visualisation** — a chart type is chosen from the result shape
5. **Takeaway** — Groq phrases a one-line insight from the computed numbers only

The generated SQL is always shown. Only schema profiles and aggregate numbers
are ever sent to Groq — never raw rows.

## Configuration

All config comes from environment variables (see `backend/.env.example`), with
local defaults — nothing hardcoded. Copy `.env.example` to `.env` to override.

| Variable | Default | Purpose |
|---|---|---|
| `GROQ_API_KEY` | *(empty)* | Groq API key — required for AI features |
| `INSIGHTIQ_DB_PATH` | `./data/insightiq.duckdb` | Local DuckDB database path |
| `INSIGHTIQ_PORT` | `8000` | Backend server port |
| `INSIGHTIQ_CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `INSIGHTIQ_GROQ_MODEL` | `llama-3.3-70b-versatile` | Primary Groq model |
| `INSIGHTIQ_GROQ_FALLBACK_MODEL` | `moonshotai/kimi-k2-instruct` | Fallback if primary is unavailable |
| `INSIGHTIQ_QUERY_ROW_LIMIT` | `500` | Safety row cap on chat queries |

> After changing `backend/.env`, **restart the backend** — `--reload` watches
> code, not env files.

## Project layout

```
backend/app/
  main.py          FastAPI entrypoint, CORS, lifespan
  config.py        env-var settings (pydantic-settings)
  db.py            DuckDB connection manager
  util.py          identifier quoting, JSON helpers
  ai/              Groq client, prompt builders, text-to-SQL, takeaway
  api/             HTTP routes (datasets, chat, insights, investigate, forecast, decisions)
  dashboard/       deterministic auto-dashboard builder (no LLM)
  ingest/          file loader (CSV/Excel, messy-file handling) + data profiler
  insights/        auto-insights, investigation, forecasting, decision copilot
  models/          Pydantic API schemas
  query/           query executor, chart selector, result summariser
  sql/             5-stage untrusted-SQL validation pipeline
  storage/         metadata store behind a swappable interface

frontend/src/
  app/             layout, page (upload → dashboard state machine), globals.css
  components/      upload-zone, dashboard-view, chart-card, kpi-card, ingest-report,
                   insights-panel, investigation-panel, forecast-panel, forecast-chart,
                   recommendations-panel, chat-panel, chat-result, story-mode,
                   analysis-workspace, contribution-bars, theme-toggle
  components/ui/   shadcn-style primitives (card, button, badge)
  lib/             typed API client, types (mirror backend models), hooks, utils

samples/
  sales_sample.csv   business metrics sample
  ts_demo.csv        time-series sample for forecasting
```

## Privacy

InsightIQ is designed with a strict local-first privacy model:

- **All data stays on your machine.** Uploaded files are loaded into a local
  DuckDB database; no data is sent to any external service.
- **Groq receives only metadata.** The LLM sees schema profiles (column names,
  types, cardinalities) and pre-computed aggregate numbers — never individual
  rows or PII.
- **SQL is sandboxed.** LLM-generated SQL passes through a 5-stage validation
  pipeline (column/table allowlists, DDL/DML blocking, `EXPLAIN` dry-run,
  row-limit injection) before read-only execution.

## Tech stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.12 · FastAPI · DuckDB · Pandas · NumPy · Groq (via OpenAI SDK) |
| **Frontend** | Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Recharts 3 · TypeScript |
| **AI** | Groq cloud inference (OpenAI-compatible API) |

## License

[MIT](LICENSE)

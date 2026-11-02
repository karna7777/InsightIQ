# Deploying InsightIQ

InsightIQ has two parts that deploy to two hosts:

- **Frontend** (Next.js) → **Vercel**
- **Backend** (FastAPI + DuckDB) → **Render**

The backend keeps a persistent DuckDB file and runs as a long-lived process, so
it needs a real server (Render), not Vercel's serverless functions. The frontend
talks to it over one environment variable (`NEXT_PUBLIC_API_BASE`).

You'll need: a [Render](https://render.com) account, a [Vercel](https://vercel.com)
account, and a [Groq API key](https://console.groq.com) (optional — without it the
AI narration falls back to deterministic text).

Deploy the **backend first** (so you have its URL for the frontend), then the
frontend, then lock down CORS.

---

## 1 — Backend on Render

1. In Render: **New +** → **Blueprint** → connect this GitHub repo.
   Render reads [`render.yaml`](./render.yaml) and sets up the `insightiq-backend`
   web service automatically (build, start command, health check).
2. When prompted for environment variables, set:
   - `GROQ_API_KEY` — your Groq key (leave blank to run without AI narration).
   - `INSIGHTIQ_CORS_ORIGINS` — leave blank for now; you'll set it in step 3.
3. Click **Apply** / **Create**. First build takes a few minutes.
4. Copy the service URL, e.g. `https://insightiq-backend.onrender.com`.
   Check it's alive: open `…/health` — it should return `{"status":"ok"}`.

The two demo datasets load automatically on first boot, so the app isn't empty.

> **Free tier:** the service sleeps after ~15 min idle (first request after that
> is slow while it wakes), and it has no persistent disk — demo datasets re-seed
> on every boot, but visitor **uploads reset** on restart. To keep uploads, in
> the Render dashboard upgrade the instance, **add a Disk** (e.g. mount
> `/var/data`, 1 GB), and add an env var `INSIGHTIQ_DB_PATH=/var/data/insightiq.duckdb`.

---

## 2 — Frontend on Vercel

1. In Vercel: **Add New…** → **Project** → import this GitHub repo.
2. Set **Root Directory** to `frontend` (the Next.js app lives in a subfolder).
   Vercel auto-detects Next.js for the build.
3. Add an environment variable:
   - `NEXT_PUBLIC_API_BASE` = your Render backend URL from step 1
     (e.g. `https://insightiq-backend.onrender.com`, no trailing slash).
4. **Deploy.** Copy the resulting URL, e.g. `https://insightiq.vercel.app`.

---

## 3 — Point CORS back at the frontend

The backend only accepts browser requests from origins you allow.

1. In Render → `insightiq-backend` → **Environment**, set:
   - `INSIGHTIQ_CORS_ORIGINS` = your Vercel URL(s), comma-separated.
     Include the production domain and any preview domain you use, e.g.
     `https://insightiq.vercel.app,https://insightiq-yourname.vercel.app`.
2. Save — Render redeploys. Open the Vercel URL and click **Launch InsightIQ**;
   the dashboards, insights and forecasts should now load from the backend.

---

## Notes

- **Shared data, no login.** There's no authentication, so every visitor sees the
  same datasets (the demos, plus anything anyone uploads). That's fine for a demo;
  don't put private data on the public instance.
- **Environment variables** (all optional except where noted):
  - Backend: `GROQ_API_KEY`, `INSIGHTIQ_CORS_ORIGINS`, `INSIGHTIQ_DB_PATH`,
    `INSIGHTIQ_SEED_DEMO` (set `false` to skip the demo datasets).
  - Frontend: `NEXT_PUBLIC_API_BASE` (required — the backend URL).
- **Local development** still works unchanged: the frontend defaults to
  `http://127.0.0.1:8000` when `NEXT_PUBLIC_API_BASE` is unset.

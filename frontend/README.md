# InsightIQ — Frontend

The Next.js frontend for InsightIQ. See the [root README](../README.md) for
full project documentation.

## Setup

```bash
npm install        # first time only
npm run dev        # http://localhost:3000
```

## Environment

Copy `.env.local.example` to `.env.local` to override defaults:

```bash
cp .env.local.example .env.local
```

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | `http://127.0.0.1:8000` | Backend API URL |

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Recharts 3 · TypeScript 5

# Verdex — AI-Powered Loan Analysis

Upload a loan application PDF or fill the form. Verdex runs a 4-stage AI pipeline to score risk, detect bias, and explain the decision in plain language.

## Architecture

```
POST /api/submit
  → SHA-256 cache check (O(1) DB lookup)
  → Cache hit? Return immediately
  → Save application (status: queued)
  → Return applicationId

GET /api/analyze/[id]  (SSE stream)
  → Stage 1: DocumentParser    (sync — validate + characterise text)
  → Stage 2: RiskScorer   ─┐  (parallel — independent LLM calls)
  → Stage 3: BiasAnalyzer ─┘
  → Stage 4: Explainer         (sync — grounded by stages 2+3 output)
  → Save result → emit pipeline_complete
```

**CS concepts implemented:**
- **Chain of Responsibility** — pipeline stage design (`PipelineStage` interface)
- **Finite State Machine** — `queued → parsing → scoring → complete/failed` enforced by Postgres ENUM
- **Task parallelism** — stages 2 and 3 via `Promise.allSettled`
- **Hash-based caching** — SHA-256 deduplication, `O(1)` lookup
- **Server-Sent Events** — unidirectional HTTP streaming (vs WebSocket: no upgrade, no framing overhead)
- **Hybrid scoring** — deterministic formula + bounded LLM delta (±15)
- **Relational schema** — JSONB vs `text[]` vs column tradeoffs made explicit

## Stack
- **Framework:** Next.js 15 App Router
- **Database + Storage:** Supabase (PostgreSQL + Storage)
- **AI:** Google Gemini 1.5 Flash (free tier)
- **UI:** Tailwind CSS + shadcn/ui
- **Streaming:** Server-Sent Events (native Web API)
- **Deploy:** Vercel

## Setup

1. `npm install`
2. Create Supabase project → run `schema.sql` in the SQL editor
3. Create Storage bucket `loan-documents` (private)
4. Get Gemini API key: https://aistudio.google.com/app/apikey
5. Copy `.env.example` → `.env.local` and fill all values
6. `npm run dev`

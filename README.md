# DealSense — AI-Native CRM

> A CRM where AI isn't a bolt-on chatbot — a custom-trained model scores every deal in real time, an LLM copilot acts on that score, and RAG grounds every answer in actual interaction history.

`FastAPI + uv · Next.js · PostgreSQL + pgvector · Redis · XGBoost · Cohere · Docker`

---

## 1. Why this exists

Three AI subsystems, each earning its place:

- **Custom ML** → deal win-probability scoring (precision/recall/F1, ROC-AUC, calibration)
- **LLM copilot** → drafts follow-ups, summarizes calls, suggests next action
- **RAG** → grounds copilot in per-customer history via pgvector, not hallucination

Interview pitch:

> "Fine-tuning per customer is impractical — data changes daily and is private. Retrieval lets one LLM stay grounded in fresh, scoped data without retraining."

Resume bullets (fill [X] after training):

- *Architected full-stack AI-native CRM (FastAPI/uv, Next.js, PostgreSQL+pgvector, Redis, Docker) with custom XGBoost win-prediction, achieving [X]% F1 on held-out data.*
- *Designed RAG pipeline over per-customer history using pgvector + Cohere rerank, grounding follow-up drafts and next-action suggestions in retrieved context.*
- *Implemented async score recompute via Celery/Redis with live WebSocket updates, reducing dashboard staleness from manual refresh to real-time.*

---

## 2. Demo moment (the killer flow)

1. Rep logs interaction (email reply / call note) → `POST /deals/{id}/interactions`
2. Backend writes Postgres, enqueues Celery job
3. Worker: (a) embeds note → pgvector, (b) builds features → `POST ml-service:8001/predict` → writes `deal_scores`, caches in Redis
4. Frontend gets live score push via WS → dashboard updates, no refresh
5. Rep clicks "Suggest next action" → top-k retrieval + score + stage → Cohere Command → action + drafted email → logged to `copilot_suggestions`

---

## 3. Architecture

```text
                          ┌─────────────────────┐
                          │   Next.js Frontend   │
                          │ (App Router, RSC)    │
                          │  Vercel in prod      │
                          └──────────┬───────────┘
                                     │ REST/WS
                          ┌──────────▼───────────┐
                          │   FastAPI Backend     │
                          │  (managed with uv)    │
                          │  Render in prod       │
                          ├───────────────────────┤
                          │ /auth  /leads  /deals │
                          │ /copilot  /score      │
                          └──┬─────────┬───────┬──┘
                 ┌───────────┘         │       └────────────┐
                 ▼                     ▼                    ▼
        ┌────────────────┐   ┌─────────────────┐   ┌──────────────────┐
        │   PostgreSQL     │   │      Redis      │   │  ML Inference     │
        │  + pgvector      │   │ cache / queue /  │   │  Service :8001    │
        │ (CRM data +      │   │ rate-limit /     │   │  FastAPI, loads   │
        │  embeddings)     │   │ pub-sub          │   │  XGBoost/sklearn  │
        └────────────────┘   └─────────────────┘   └──────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │  Celery/RQ Workers    │
                          │ (recompute score,     │
                          │  embed interaction)   │
                          └─────────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │   Cohere API          │
                          │  embed + rerank +     │
                          │  Command (chat)       │
                          └─────────────────────┘

Local dev: docker-compose spins up postgres, redis, backend, ml-service, worker, frontend.
Prod: Render Blueprint (backend/ml/worker/postgres/redis) + Vercel (frontend).
```

---

## 4. Tech choices

| Piece | Choice | Why |
|---|---|---|
| Backend | FastAPI + uv | Async-native, typed, fast dev loop; uv for reproducible fast resolution over pip/poetry |
| DB | PostgreSQL + pgvector | Relational integrity + vector search in same transactional store — no separate vector DB to sync |
| Cache/Queue | Redis | (1) cache hot scores, (2) Celery broker, (3) LLM rate-limit, (4) pub/sub for WS push |
| ML serving | Separate FastAPI microservice | Decouples inference — scale/redeploy independently, mirrors MLOps |
| LLM | Cohere API (Command) | Strong at RAG-grounded generation + native `embed` + `rerank` — one vendor instead of two; can self-host via vLLM at scale |
| Frontend | Next.js App Router | Server components for dashboard, client components for live score widgets |
| Orchestration | Docker Compose (local), Render + Vercel (prod) | One-command local dev, public URLs for resume/demo |

> Cost note: dev uses `all-MiniLM-L6-v2` (384-d, local, free) + mocked LLM. Prod/demo only uses Cohere trial (`embed-english-v3.0` 1024-d + rerank + Command). Embeddings cached by `hash(content)` in Redis.

---

## 5. Monorepo layout

```text
CRM/
  docker-compose.yml      # local dev only
  render.yaml             # prod backend/ml/worker/db
  .env.example
  README.md
  backend/                # owner: backend dev
    pyproject.toml (uv)
    app/
      main.py
      routers/{auth.py, deals.py, interactions.py, copilot.py, ws.py}
      schemas.py          # <-- contract with ML + frontend
      worker.py           # celery tasks: embed + score
      seed.py
  ml-service/             # owner: ML dev
    pyproject.toml (uv)
    app/main.py           # GET /health, POST /predict
    training/{train.py, features.py, evaluate.py}
    notebooks/{01_eda.ipynb, 02_baseline.ipynb, 03_xgboost.ipynb}
    scripts/make_synthetic.py
    models/ (.gitignore *.pkl, keep metrics.json)
  frontend/               # owner: frontend dev
    app/(dashboard)/...
    components/{ScoreBadge.tsx, CopilotPanel.tsx}
```

Rule: no cross-imports between `backend/` / `ml-service/` / `frontend/` except via HTTP + `schemas.py` copy.

---

## 6. Quickstart (local)

Prereqs: Docker, `uv`, Node 20, Cohere key (optional for local mock mode).

```bash
cp .env.example .env
# set DATABASE_URL, REDIS_URL, COHERE_API_KEY, JWT_SECRET, ML_SERVICE_URL
docker compose up --build

# backend docs: http://localhost:8000/docs
# ml-service docs: http://localhost:8001/docs
# frontend: http://localhost:3000

# seed demo data:
docker compose exec backend python -m app.seed
# or generate synthetic from ML side:
python ml-service/scripts/make_synthetic.py --deals 200 --out data/seed.json
```

---

## 7. Database schema (Postgres)

Full DDL in `backend/app/migrations/001_init.sql`. Summary:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    role TEXT DEFAULT 'sales_rep',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id),
    owner_id UUID REFERENCES users(id),
    stage TEXT NOT NULL,  -- lead, qualified, proposal, negotiation, won, lost
    value NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES deals(id),
    type TEXT,  -- email, call, meeting, note
    content TEXT,
    sentiment_score FLOAT,
    response_time_minutes INT,
    embedding VECTOR(1024), -- Cohere embed-english-v3.0 = 1024 dims; local dev override = 384
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON interactions USING hnsw (embedding vector_cosine_ops);

CREATE TABLE deal_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES deals(id),
    win_probability FLOAT,
    churn_risk FLOAT,
    model_version TEXT,
    computed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE copilot_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES deals(id),
    prompt TEXT,
    retrieved_context_ids UUID[],
    suggestion TEXT,
    accepted BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

> Never mix embedding dims in one table. If switching models, re-embed. Keep `VECTOR(1024)` in prod, `VECTOR(384)` in local override.

---

## 8. API surface

```text
POST /auth/register, /auth/login          (JWT)
GET  /deals, /deals/{id}
POST /deals/{id}/interactions             {type, content}
GET  /deals/{id}/score                    {win_probability, churn_risk, model_version, computed_at}
POST /copilot/suggest                     {deal_id} -> {action, draft_email, context_ids}
POST /copilot/summarize                   {transcript} -> {summary, pain_points, next_steps}
WS   /ws/scores                            {deal_id, win_probability}
ML:  POST http://ml-service:8001/predict
```

`/predict` contract (frozen for parallel work):

```json
// request
{"deal_value": 50000, "stage": "proposal", "days_in_stage": 12,
 "num_interactions": 8, "avg_response_min": 320,
 "days_since_last": 3, "sentiment_trend": -0.2}
// response
{"win_probability": 0.63, "churn_risk": 0.41, "model_version": "xgb-v0.1"}
```

Frontend only reads `GET /deals/{id}/score`. Backend guarantees to send exactly the 7 features above to ML.

---

## 9. ML pipeline — Deal Win Scoring (owner: ML dev)

- **Task:** binary classification (won vs lost) → calibrated win probability.
- **Data:** public Kaggle CRM/sales-opportunity CSV for pretraining + synthetic (`faker` + rules) matching schema for demo volume. Be upfront in report — normal for student projects.
- **Features v0:** `deal_value, stage, days_in_stage, num_interactions, avg_response_min, days_since_last, sentiment_trend`. v1 stretch: embedding cluster id.
- **Models:** LogisticRegression baseline (interpretable) → XGBoost/LightGBM + isotonic/Platt calibration → stretch: tabular+embedding NN.
- **Eval:** precision/recall/F1, ROC-AUC, calibration curve + ECE. Save to `ml-service/models/metrics.json` + plot.
- **Serving:** `joblib`/`onnx` → `ml-service POST /predict`, called async by Celery after each interaction.
- **Retraining:** log preds vs outcomes → periodic `train.py` → bump `model_version` in `deal_scores`.

```bash
cd ml-service
uv sync
uv run python training/train.py --data data/deals.csv --out models/
uv run python training/evaluate.py --model models/xgb-v0.1.pkl
uv run uvicorn app.main:app --port 8001
```

---

## 10. RAG pipeline

1. **Ingest:** chunk long notes → Cohere `embed-english-v3.0` (or `embed-multilingual-v3.0`) → `interactions.embedding`.
2. **Retrieve:** `SELECT ... WHERE deal_id=:id ORDER BY embedding <=> :q LIMIT k` — scoped to deal/contact, not whole-DB dump.
3. **Rerank (stretch, high value):** Cohere `rerank` top-k before LLM — most student projects skip this.
4. **Augment:** system instructions + reranked snippets + score/stage + user ask.
5. **Generate:** Cohere `chat`/Command → log prompt + context ids + output to `copilot_suggestions`.

Why not fine-tune: data changes daily and is private per customer — retrieval keeps one LLM grounded in fresh scoped data without retraining.

---

## 11. Copilot features (build 1 first)

1. **Next-best-action:** score + history → concrete action ("Stalled 12d, sentiment dropped — offer discount call this week").
2. **Draft follow-up email:** grounded in past tone + latest interaction.
3. **Call summarizer:** transcript → pain points, objections, next steps → auto-logged as interaction.
4. **NL query:** "deals at risk this month" → filtered query over `deal_scores` + LLM narration.

Start with #1 for MVP.

---

## 12. Deployment

- **Local:** `docker compose up` — postgres (`pgvector/pgvector:pg16`), redis:7, backend:8000, ml-service:8001, worker, frontend:3000.
- **Prod:** `render.yaml` Blueprint (postgres+pgvector, redis, backend, ml-service, worker) + Vercel frontend with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL=wss://...`.
- **Alt (recommended for stable demo):** $6 VPS (Hetzner/DigitalOcean) + `docker compose up` = always-on pgvector + Redis + no sleep. Keep Vercel for frontend. Render free tier sleeps → 30-50s cold start + WS drops; add 5s polling fallback if staying on Render.

---

## 13. Env vars

```text
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/crm
REDIS_URL=redis://redis:6379/0
JWT_SECRET=change-me
COHERE_API_KEY=...
ML_SERVICE_URL=http://ml-service:8001
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/scores
```

See `.env.example` for template.

---

## 14. Testing

```bash
# backend
cd backend; uv run pytest
# ml
cd ml-service; uv run pytest; uv run python training/evaluate.py
# frontend
cd frontend; npm run lint; npm run build
```

---

## 15. Roadmap (3-person parallel)

- **M1 (joint):** schemas + compose up + synthetic seed. Contract frozen.
- **M2 (ML):** `metrics.json` with XGBoost F1 + calibration plot, `/predict` live with dummy→real swap.
- **M3 (joint integration):** interaction → Celery → `/predict` → `deal_scores` → WS to UI.
- **M4:** RAG retrieval + 1 copilot action + Redis cache + rate-limit.
- **M5:** polish, report, demo video, deploy.

ML dev starts: skeleton `/predict` → synthetic data → `features.py` → baseline → XGBoost.

---

## 16. Results (fill after M2)

> XGBoost `xgb-v0.1`: F1 [X]%, ROC-AUC [Y], ECE [Z] on held-out. See `models/metrics.json` + calibration plot in `notebooks/03_xgboost.ipynb`.

---

## 17. Responsible AI / Traceability

All copilot outputs log `prompt + retrieved_context_ids + suggestion + accepted` in `copilot_suggestions`. Retrieval scoped per deal/contact only. Show this table in demo as audit trail.

---

## 18. Troubleshooting

- **Dim mismatch (1024 vs 384):** check embed model that seeded DB, re-embed after switch. Never mix.
- **Render cold start:** expected on free tier; use VPS for live demo.
- **WS drops:** fallback to polling `GET /deals/{id}/score` every 5s.
- **Cohere 429:** Redis rate-limiter tripped — check `X-RateLimit` headers, use mock mode locally.
- **pgvector missing on Render:** must use `pgvector/pgvector:pg16` image, run `CREATE EXTENSION vector;`.

---

## Contributors

- Frontend dev — `frontend/`
- Backend dev — `backend/` + worker + RAG wiring
- ML dev — `ml-service/` + training + eval

License: MIT.

# DealSense — ML Part: Full Build Plan, Roadmap & Spec

> Owner: ML dev (you) · Stack: Python 3.13 + uv, scikit-learn, XGBoost, pandas, joblib, SHAP · Serves: `POST http://localhost:8001/predict` · Repo root: `C:\Tanay\CRM`

This file is your single source of truth for the ML track. Backend and frontend teammates should read §2 (contract) only. You execute everything else.

---

## 0. TL;DR — what you are building

Binary classifier: `deal won (1) vs lost (0)` → calibrated `win_probability` in `[0,1]` + `churn_risk = 1 - win_probability` (v0) + `model_version`.

Flow:

```text
Kaggle CSV + synthetic interactions
  → training/features.py (7 features, must mirror backend)
  → train.py (logreg baseline → XGBoost + isotonic calibration)
  → models/xgb-v0.1.pkl + metrics.json + calibration plot
  → ml-service/app/main.py loads once, serves POST /predict <200ms
  → backend calls you per interaction (sync POST /deals/{id}/score + async Celery tasks.py)
  → deal_scores row + Redis pubsub deal_scores → WS /ws/scores → UI live update
```

Success = backend 503 goes away (dummy), then real model with `F1 ≥ 0.75, ROC-AUC ≥ 0.80, ECE < 0.05` on held-out temporal split, served with version string.

---

## 1. Current repo state (verified 2026-09-26, main @ bd26eef)

Backend already done, waiting on you:

| File | What it does | Your obligation |
|---|---|---|
| `Backend/src/backend/services/deal_features.py:10` | `calculate_deal_features(deal, db)` builds 7 fields | Mirror exactly in `training/features.py`, including defaults |
| `Backend/src/backend/services/ml_client.py:7` | `POST http://localhost:8001/predict` json=features, 10s timeout | Must accept that JSON, return 3 keys, or backend raises 503 |
| `Backend/src/backend/services/deal_score_service.py:10` | Saves `DealScore(win_probability, churn_risk, model_version)` + `redis.publish("deal_scores")` | `model_version` must be unique per training run (e.g. `xgb-v0.1`) |
| `Backend/src/backend/tasks.py:14` | Celery `process_interaction(interaction_id)` → recompute on every new interaction | Expect burst traffic, keep inference stateless + fast |
| `Backend/src/backend/worker.py:6` | Celery broker = `settings.redis_url` | No ML change, but local dev needs Redis up |
| `Backend/src/backend/api/v1/websocket.py:11` | `WS /ws/scores` subscribes Redis `deal_scores` | No ML change, but score must be float 0-1 or UI breaks |
| `Backend/src/backend/models/deal.py:12`, `interaction.py:12`, `deal_score.py:12` | Schema: deals, interactions (`embedding VECTOR(1024)`), deal_scores | Train features only from these columns + Kaggle-mapped columns |
| `Backend/pyproject.toml:6` | `requires-python >=3.13,<3.14` | Pin `ml-service` to 3.13 too (`uv python pin 3.13`), system has 3.14.6 — do not use system python |

Missing (you must create): entire `ml-service/` folder, any `*.csv`, `features.py`, `train.py`, `evaluate.py`, `make_synthetic.py`, `models/`, notebooks.

---

## 2. Frozen API contract (do not change without backend teammate)

### 2.1 `POST /predict` — request

Built by `deal_features.py:68-76`:

```json
{
  "deal_value": 50000.0,
  "stage": "proposal",
  "days_in_stage": 12,
  "num_interactions": 8,
  "avg_response_min": 320.0,
  "days_since_last": 3,
  "sentiment_trend": -0.2
}
```

Types: `deal_value: float ≥0`, `stage: lead|qualified|proposal|negotiation|won|lost`, rest `int/float`. Backend sends zeros when no history (see §4.3). You must accept all stages, including `won/lost` (closed deals still get scored for audit).

### 2.2 `POST /predict` — response

Consumed by `deal_score_service.py:22-25`:

```json
{
  "win_probability": 0.63,
  "churn_risk": 0.37,
  "model_version": "xgb-v0.1"
}
```

Rules: both probs clamped `[0,1]`, `model_version` = `<algo>-v<major>.<minor>` (e.g. `logreg-v0.0`, `xgb-v0.1`). Never return NaN/inf — backend will write it straight to Postgres `Float` and publish to WS.

### 2.3 Health + errors

- `GET /health` → `{"status":"ok","model_version":"xgb-v0.1"}`. Backend has no health check yet — add it so teammate can gate startup.
- On bad input: `422` with Pydantic detail. On model not loaded: `503`. Backend maps `ConnectError/Timeout/HTTPStatusError` to 503 (see `ml_client.py:19-32`), so fail fast, don't hang >10s.

---

## 3. Datasets — where to get, what to use, how to map

You need two layers. Neither alone is sufficient.

### 3.1 Layer A — public pretrain (real labels, fast start)

**Primary: Maven `CRM Sales Opportunities` — 8,800 B2B computer-hardware deals**

- Kaggle: `innocentmfa/crm-sales-opportunities`, `agungpambudi/crm-sales-predictive-analytics`, `mdasifikbalmamun/crm-sales-opportunities`; playground: `mavenanalytics.io/data-playground/crm-sales-opportunities`; GitHub mirrors: `samiMazari/CRM_Sales_Opportunities`, analysis example `Rajkumar0863/crm-sales-pipeline-analysis`, end-to-end training example `piyushxbhardwaj/Sales_Win_Loss_Prediction`.
- Key file `sales_pipeline.csv`: `opportunity_id, sales_agent, product, account, deal_stage, engage_date, close_date, close_value`.
- Stats to verify in EDA: win rate ~55-63%, `$10M` won revenue, agent spread 55-70%, `GTX Pro` highest loss.
- Mapping to your 7 features:
  - `close_value → deal_value` (apply `log1p` in training, but serve raw — do transform inside pipeline)
  - `deal_stage → stage` (normalize: `Prospecting→lead`, `Engaging→qualified`, keep `Won/Lost` as label, map any `proposal/negotiation` if present else synthesize)
  - `(close_date - engage_date).days → days_in_stage` (TRAIN ONLY — never serve; at inference backend uses `now - created_at`, see `deal_features.py:31`)
  - Label: `y = 1 if deal_stage == Won else 0`. Drop rows with other stages for training, but keep them for inference tests.
  - Missing in Kaggle (must synthesize or default): `num_interactions, avg_response_min, days_since_last, sentiment_trend`. Strategy: join with Layer B generator or sample from empirical distributions per stage (see §3.3).

**Alternates (use if primary blocked):**

- `sushicatsan/sample-sales-crm-data` — synthetic Salesforce-style: `account 10k, lead 14k, opportunity 16k, tasks 110k, event 38k`. Best if you want relational volume to simulate `interactions`. Map `tasks/event → interactions`.
- Olist `mql + closed_deals` — funnel + `time_to_close` regression example. Sparse revenue, good for time-based features only.
- IBM Watson sales win-loss 78k × 19 (via `MichaelWeber2050/Sales_Leads_Classifier`) — larger, includes company size, region, prior purchase. Good for imbalance handling practice (F1 0.81, AUC 0.83 reported with XGBoost).

Do NOT commit raw CSVs >5MB. Put in `ml-service/data/` + `.gitignore`, document download URL + SHA in `data/README.md`.

### 3.2 Layer B — synthetic interactions (your high-leverage deliverable)

Public data has zero `interactions.content/sentiment/response_time`. Without Layer B you cannot train 4/7 features or demo RAG/live scoring.

Spec for `ml-service/scripts/make_synthetic.py` (deterministic, `seed=42`, share with backend/frontend for seeding):

- Input flags: `--deals 200 --min-inter 3 --max-inter 15 --won-rate 0.55 --out data/synthetic.json`
- Per deal: pick `stage` weighted `[lead 0.3, qualified 0.3, proposal 0.2, negotiation 0.2]`, `value` lognormal (median 25k, tail to 250k), `created_at` uniform last 90d.
- Per interaction: `type` weighted `[email 0.5, call 0.25, meeting 0.15, note 0.1]`, `content` from templates via `faker` (e.g. `"Followed up on {product} pricing, {contact} asked about discount"`), `created_at` sorted ascending.
- Rules (encode signal so model can learn):
  - `won`: `response_time_minutes ~ Normal(120, 60)` clipped ≥15, `sentiment_score ~ Normal(0.35, 0.2)` clipped [-1,1], trend positive, `days_since_last ≤ 5`.
  - `lost`: `response_time ~ Normal(600, 200)`, `sentiment ~ Normal(-0.25, 0.25)`, trend negative, `days_since_last 8-25`, 30% have 12+ day gap.
- Closed deals: set `deals.stage = won/lost`, `closed_at = last interaction + 1-3d`. Open deals: stage ≠ won/lost, `closed_at = null`.
- Output: JSONL matching `InteractionCreate` + `DealCreate` so backend `seed.py` can POST it directly. Also emit `labels.csv` for training without DB.

This file unblocks all 3 devs — prioritize it right after dummy `/predict`.

### 3.3 Joining A+B for training v0

- Start: train on A with 3 real features + 4 sampled interaction features (sample per-stage means from B). This gives day-2 baseline.
- Then: train on B alone (fully labeled, clean signal) to validate pipeline end-to-end.
- Finally: train on A+B concatenated (standardize column names first). Report both in `metrics.json` with `dataset` tag. Be explicit in report: pretrain on public, validate on synthetic matching prod schema; real anonymized data = future work.

---

## 4. Features — in-depth spec (must mirror backend exactly)

### 4.1 Definitions + derivation

| # | Feature | Type | Derivation (train + serve) | Notes |
|---|---|---|---|---|
| 1 | `deal_value` | float | `float(deals.value)` → `log1p` inside pipeline | Heavy tail; never use `close_value` at serve (leakage) |
| 2 | `stage` | categorical 6 | `deals.stage` verbatim | OneHot `handle_unknown=ignore`; do NOT ordinal-encode |
| 3 | `days_in_stage` | int | Backend `deal_features.py:31`: `(now_utc - deals.created_at).days`. Train approx: `(close_date - engage_date).days` or `(now - created_at).days` for open deals | No `stage_entered_at` column exists — accepted workaround, flag to backend to add later |
| 4 | `num_interactions` | int | `count(interactions where deal_id=?)` | 0 allowed |
| 5 | `avg_response_min` | float | `mean(interactions.response_time_minutes where not null)` else `0.0` | Backend `deal_features.py:43-47`; replicate default |
| 6 | `days_since_last` | int | ` (now - max(interactions.created_at)).days` else `0` | Most predictive; stalled = dead. Backend `deal_features.py:50-54` uses last in asc order |
| 7 | `sentiment_trend` | float [-2,2] | `last sentiment - first sentiment` (asc order, non-null only) else `0.0`; need ≥2 points | Backend `deal_features.py:63-66`; v0 use VADER/TextBlob to fill `sentiment_score` if null |

Churn v0: `churn_risk = 1 - win_probability`. Separate head later if needed.

### 4.2 Preprocessing pipeline (single source of truth)

Use `sklearn.compose.ColumnTransformer` + `Pipeline`, persisted with model via `joblib`. Identical object at train and serve — no duplicated code.

- Numeric `[deal_value, days_in_stage, num_interactions, avg_response_min, days_since_last, sentiment_trend]`: `SimpleImputer(median)` → optional `StandardScaler` (needed for logreg, harmless for XGB; keep for consistency).
- `deal_value`: `FunctionTransformer(np.log1p)` before imputer (handle 0).
- Categorical `[stage]`: `SimpleImputer(most_frequent)` → `OneHotEncoder(handle_unknown=ignore)`.
- Never fit imputer/encoder on test. Save fitted pipeline inside model bundle.

### 4.3 Edge cases (copy from backend or you get train/serve skew)

- 0 interactions → `num=0, avg=0.0, days_since_last=0, trend=0.0`. Must be in training data (add synthetic 0-inter deals) or model will misbehave on new leads.
- All `response_time` null → `0.0` (not median — match backend).
- 0-1 sentiments → `0.0`.
- Future `created_at` (clock skew) → clip `days_*` at ≥0.
- `stage won/lost` at inference → still score (audit), don't reject.

### 4.4 Leakage blocklist (never as features)

`close_date, closed_at, close_value at inference, time_to_close, days to close, is_won flag, future interactions after close`. Training-time `close_date`-derived `days_in_stage` is allowed only for pretraining, must be replaced by `now-created_at` logic before serving. Add assertion in `train.py` that blocklisted columns are absent.

### 4.5 v1 stretch (after M2 green)

- Embedding cluster id: `KMeans(k=8)` on interaction embeddings (local `all-MiniLM-L6-v2` 384-d for dev, Cohere 1024-d prod — never mix in one table) → per-deal majority cluster as categorical. Adds signal from text without LLM cost.
- Agent/product priors: target-encoded win rate with smoothing (needs enough history, beware leakage — compute priors from train fold only).

---

## 5. Models & algorithms — progression

### 5.1 Baseline: LogisticRegression (day 1-2, must do)

- Purpose: proves pipeline, gives interpretable coefficients for report (`days_since_last` should be large negative).
- Config: `LogisticRegression(max_iter=1000, class_weight=balanced)` inside pipeline. Eval on temporal split. Expect acc 0.70-0.75, AUC ~0.75 on Maven.
- Artifact: `models/logreg-v0.0.pkl` + coefficients plot. Serve briefly as `mock` replacement to validate integration before XGB.

### 5.2 Main: XGBoost + calibration (week 1-2, resume model)

Why XGB: best accuracy/effort on tabular sales data, handles missing + imbalance via `scale_pos_weight`, fast inference (<10ms), `feature_importances_` + SHAP for demo. Precedent: Salesforce Einstein, Zoho use XGB for opportunity scoring; IBM 78k-lead XGB F1 0.81/AUC 0.83; FicZon 7.4k-lead XGB AUC 0.81/recall 84%.

- Base: `XGBClassifier(use_label_encoder=False (if old v), eval_metric=logloss, tree_method=hist, random_state=42, scale_pos_weight=neg/pos)`.
- Search via `RandomizedSearchCV(n_iter=30, cv=StratifiedKFold(5), scoring=f1)`: `max_depth 3-6, learning_rate 0.03-0.1, n_estimators 200-800, subsample 0.7-1.0, colsample_bytree 0.7-1.0, min_child_weight 1-10, gamma 0-0.3, reg_alpha 0-1, reg_lambda 1-5`.
- Imbalance: prefer `scale_pos_weight` over SMOTE unless positive <15%. Tune decision threshold on validation PR curve (often 0.35-0.45 beats 0.5 for recall; FicZon 0.40 gave F1 0.67/recall 84%). Report both 0.5 and tuned.
- Calibration (mandatory — you output a probability to UI): wrap best XGB in `CalibratedClassifierCV(method=isotonic (if n>2000 else sigmoid), cv=5)`. Plot reliability curve before/after, report ECE + Brier. Target `ECE < 0.05`.
- Explainability: `shap.TreeExplainer` summary + 1 waterfall for demo deal. Save PNGs to `models/plots/`.
- Artifact: `models/xgb-v0.1.pkl` = `{"model": calibrated, "preprocess": pipeline, "version": "xgb-v0.1", "threshold": 0.42, "metrics": {...}}` via joblib. Never pickle bare classifier without preprocess.

### 5.3 Stretch: tabular + embedding NN (only if asked / extra credit)

Small MLP concatenating 7 tabular + pooled interaction embedding (mean of last-5). Shows depth but adds serving complexity (needs embedding service at inference). Do not attempt before M3 integration green. Mention as future work in report.

### 5.4 Model selection rule

Pick by weighted business score, not acc alone: `0.4*Recall + 0.3*AUC + 0.2*F1 + 0.1*stability (1-std across folds)`. Sales prefers catching wins (recall) over being right on losses. Document in `metrics.json` why XGB beat logreg/RF.

---

## 6. Evaluation — metrics, splits, acceptance gates

- Split: temporal (sort by `close_date/created_at`, train oldest 70%, val next 15%, test newest 15%) + stratified 5-fold CV inside train. Random split overstates by leaking future behavior.
- Metrics (log all): accuracy, precision, recall, F1, ROC-AUC, PR-AUC, Brier, ECE, confusion matrix, PR curve, calibration curve. Save to `models/metrics.json` with `{"model_version","dataset","split","threshold","metrics":{...}}`.
- Gates for `xgb-v0.1` promotion: `F1 ≥ 0.75, ROC-AUC ≥ 0.80, ECE < 0.05, inference p95 < 200ms, no NaN on 0-inter edge tests`. If miss, stay on `logreg-v0.0` for integration and iterate — never block backend on metric chase.
- Report plots: `plots/calibration.png`, `plots/pr_curve.png`, `plots/shap_summary.png`, `plots/feature_importance.png`. These go straight into README + interview deck.

---

## 7. Training & serving codebase (you must scaffold)

```text
ml-service/
  pyproject.toml              # python >=3.13,<3.14, deps: fastapi, uvicorn, httpx, scikit-learn, xgboost, pandas, numpy, joblib, shap, faker, pytest
  .python-version             # 3.13
  app/main.py                 # GET /health, POST /predict (load model once at startup, Pydantic validate, clamp, return version)
  app/schemas.py              # PredictRequest (7 fields) / PredictResponse (3 fields) — copy types from §2
  training/features.py        # build_features(df_deals, df_interactions) -> X, y; mirrors deal_features.py defaults
  training/train.py            # --data --out --model {logreg,xgb} --calibrate isotonic; writes .pkl + metrics.json
  training/evaluate.py         # --model --test-csv; prints + saves plots
  scripts/make_synthetic.py    # §3.2 generator
  notebooks/01_eda.ipynb 02_baseline.ipynb 03_xgboost.ipynb
  data/ (.gitignore *.csv/*.pkl, keep README + labels.csv sample)
  models/ (.gitignore *.pkl, keep metrics.json + plots/)
  tests/test_features.py test_predict.py
  Dockerfile                   # python:3.13-slim, uv sync, uvicorn :8001
```

Commands (run from `ml-service/`):

```bash
uv python pin 3.13
uv sync
uv run python scripts/make_synthetic.py --deals 200 --out data/synthetic.json
uv run python training/train.py --data data/maven_mapped.csv --out models/ --model xgb --calibrate isotonic
uv run python training/evaluate.py --model models/xgb-v0.1.pkl --test-csv data/test.csv
uv run uvicorn app.main:app --port 8001 --reload
uv run pytest
```

Reproducibility: `seed=42` everywhere, `uv.lock` committed, `model_version` in every artifact + every `/predict` response + every `deal_scores` row.

---

## 8. Integration & async behavior (what backend already does to you)

- Sync: `POST /deals/{deal_id}/score` → `calculate_deal_features` → your `/predict` → save + `redis.publish deal_scores` → `GET` returns latest. 10s timeout — keep p95 <500ms or backend 503s spike.
- Async: `POST /deals/{id}/interactions` (see `api/v1/interactions.py`) enqueues `tasks.process_interaction` → Celery worker → same path. Expect 1 call per interaction; must be stateless (no DB in ml-service v0).
- Live: `WS /ws/scores` pushes whatever you returned. Clamp outputs or UI chart breaks.
- Local dev to verify: `docker compose up postgres redis backend ml-service worker` → `POST /predict` with §2.1 sample → expect §2.2 shape → `POST /deals/{id}/score` → `GET` same id → WS message.

---

## 9. Roadmap — phased with exit criteria (flexible time, 3-person parallel)

| Phase | You do | Teammates do | Exit gate |
|---|---|---|---|
| **M0 Contract (0.5d, joint)** | Confirm §2 JSON with backend, agree `ML_SERVICE_URL` env | Backend freezes `deal_features.py`, frontend mocks score badge | Sample payload round-trips dummy 0.5 |
| **M1 Skeleton (0.5-1d)** | `ml-service/` + dummy `/predict` (`mock-v0`) + `/health` + Dockerfile | Backend points `ml_client.py` at you, frontend builds `ScoreBadge` | `POST /deals/{id}/score` 201 (not 503) |
| **M2 Data (2-3d)** | Download Maven CSV, `01_eda.ipynb`, `make_synthetic.py` 200 deals, `labels.csv` | Backend seeds DB via your synthetic JSON, adds seed script | `data/` has mapped train/test + synthetic demo seed |
| **M3 Baseline (2d)** | `features.py` + logreg `logreg-v0.0` + `metrics.json` | No block — integrate against `mock-v0` | F1/AUC logged, `/predict` serves logreg |
| **M4 Main model (3-5d)** | XGB search + isotonic + threshold tune + SHAP + `xgb-v0.1.pkl` + calibration plot | Switch `ML_SERVICE_URL` to real model, test Celery burst | Gates §6 pass, p95 <200ms, ECE <0.05 |
| **M5 Harden (2d)** | Edge tests (0-inter, nulls, won/lost stage), `evaluate.py`, version bump story | WS demo: new interaction → live score tick, no refresh | Demo video records killer flow §10 |
| **M6 Stretch** | Embedding cluster feature, monthly `retrain.py`, Registry of `model_version` | Rerank/RAG uses your scores for copilot prompt | Report + README results filled |

Do M1 today — it removes the 503 and lets teammates proceed while you train.

---

## 10. Demo script (ML part, 60 seconds)

1. Show `metrics.json` + calibration plot: "XGB F1 [X], AUC [Y], calibrated ECE [Z] — probabilities you can trust."
2. `POST /predict` with stalled deal (`days_since_last 18, sentiment_trend -0.6`) → low win prob. Add fresh positive interaction → Celery → WS tick up live.
3. SHAP waterfall: "days_since_last pushed it down, recent sentiment pulled it up — rep knows what to fix."
4. Audit: `deal_scores.model_version = xgb-v0.1` row + `copilot_suggestions` trace.

---

## 11. Cost, risk & mitigations (free-tier aware)

- Cohere burn: you don't call Cohere in v0 training — use VADER/TextBlob for sentiment, local `all-MiniLM-L6-v2` (384-d) only if doing v1 cluster. Prod Cohere 1024-d only for demo, cached by `hash(content)` in Redis. Never re-embed same text.
- Dim mismatch: `interactions.embedding VECTOR(1024)` prod vs 384 local — never mix tables; re-embed on switch. Your tabular model is immune (doesn't read embedding in v0).
- Python drift: pin 3.13 in both services; CI asserts `uv run python --version`.
- Leakage: `train.py` asserts blocklist absent; temporal split enforced.
- Cold start (Render free sleeps): note in demo; prefer VPS `docker compose up` for live WS.

---

## 12. Definition of done for ML track

- [ ] `ml-service POST /predict` serves `xgb-v0.1` with §2 shape, p95 <200ms, `/health` ok
- [ ] `models/metrics.json` + 4 plots committed (pkl gitignored)
- [ ] `features.py` parity tests vs `deal_features.py` defaults pass
- [ ] `make_synthetic.py` seeds 200 deals usable by backend/frontend demo
- [ ] Backend `POST /deals/{id}/score` + Celery `process_interaction` + WS tick verified end-to-end
- [ ] README §16 results filled with real numbers + `model_version` traceable in DB

---

## 13. Next action (do now)

```bash
# from C:\Tanay\CRM
mkdir ml-service
# scaffold pyproject + app/main.py dummy per §7, then:
# uv run uvicorn app.main:app --port 8001
# curl -X POST http://localhost:8001/predict -H "Content-Type: application/json" -d '{"deal_value":50000,"stage":"proposal","days_in_stage":12,"num_interactions":8,"avg_response_min":320,"days_since_last":3,"sentiment_trend":-0.2}'
```

Tell backend teammate when `:8001/health` is up — their 503 clears instantly.

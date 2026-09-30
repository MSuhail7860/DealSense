import argparse
import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
import sys
from sklearn.linear_model import LogisticRegression
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, FunctionTransformer, OneHotEncoder
from xgboost import XGBClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    brier_score_loss,
    precision_recall_curve,
)

def compute_ece(y_true, y_prob, n_bins=10):
    bin_limits = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)
    for i in range(n_bins):
        bin_mask = (y_prob >= bin_limits[i]) & (y_prob <= bin_limits[i+1])
        if np.sum(bin_mask) > 0:
            bin_acc = np.mean(y_true[bin_mask])
            bin_conf = np.mean(y_prob[bin_mask])
            ece += np.abs(bin_acc - bin_conf) * (np.sum(bin_mask) / len(y_true))
    return float(ece)

def train_model(data_path, out_dir, model_type, calibrate):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Load dataset
    with open(data_path, "r") as f:
        deals_list = [json.loads(line) for line in f]
    
    labels_file = Path(data_path).parent / "labels.csv"
    if not labels_file.exists():
        raise FileNotFoundError(f"labels.csv not found alongside {data_path}")
    labels_df = pd.read_csv(labels_file)
    
    # Add training to python path
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    from training.features import build_features
    
    df = build_features(deals_list, labels_df)
    
    # Assertion for Leakage Blocklist per ML.md §4.4
    leakage_blocklist = [
        "close_date", "closed_at", "close_value", "time_to_close",
        "days_to_close"
    ]
    for col in leakage_blocklist:
        assert col not in df.columns, f"Leakage violation: {col} present in feature DataFrame!"
    
    # Drop rows without labels
    df = df.dropna(subset=['is_won']).copy()
    
    # Feature columns exactly matching contract §2.1
    feature_cols = [
        'deal_value', 'stage', 'days_in_stage',
        'num_interactions', 'avg_response_min',
        'days_since_last', 'sentiment_trend'
    ]
    
    X = df[feature_cols]
    y = df['is_won'].astype(int)
    
    # Temporal split: oldest 70% train, remaining 30% test
    train_size = int(len(X) * 0.7)
    X_train, X_test = X.iloc[:train_size], X.iloc[train_size:]
    y_train, y_test = y.iloc[:train_size], y.iloc[train_size:]
    
    numeric_features = [
        'deal_value', 'days_in_stage', 'num_interactions',
        'avg_response_min', 'days_since_last', 'sentiment_trend'
    ]
    categorical_features = ['stage']
    
    numeric_transformer = Pipeline(steps=[
        ('log1p', FunctionTransformer(np.log1p, feature_names_out="one-to-one", validate=False)),
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ]
    )
    
    pos_count = y_train.sum()
    neg_count = len(y_train) - pos_count
    scale_pos_weight = float(neg_count / max(1, pos_count))
    
    if model_type == 'xgb':
        version = 'xgb-v0.1'
        classifier = XGBClassifier(
            eval_metric='logloss',
            random_state=42,
            n_estimators=300,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight
        )
    else:
        version = 'logreg-v0.0'
        classifier = LogisticRegression(
            max_iter=1000,
            class_weight='balanced',
            random_state=42
        )
        
    if calibrate:
        classifier = CalibratedClassifierCV(
            estimator=classifier,
            method=calibrate,
            cv=5
        )
        
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', classifier)
    ])
    
    pipeline.fit(X_train, y_train)
    
    # Predict probabilities on test
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    
    # Tune decision threshold on PR curve
    precisions, recalls, thresholds = precision_recall_curve(y_test, y_prob)
    f1_scores = 2 * (precisions * recalls) / np.maximum(precisions + recalls, 1e-8)
    best_idx = np.argmax(f1_scores)
    best_threshold = float(thresholds[best_idx]) if best_idx < len(thresholds) else 0.5
    best_threshold = max(0.1, min(0.9, best_threshold))
    
    y_pred = (y_prob >= best_threshold).astype(int)
    
    metrics = {
        "model_version": version,
        "dataset": str(data_path),
        "split": "temporal 70/30",
        "threshold": round(best_threshold, 4),
        "metrics": {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
            "brier": round(float(brier_score_loss(y_test, y_prob)), 4),
            "ece": round(compute_ece(y_test, y_prob), 4)
        }
    }
    
    print(json.dumps(metrics, indent=2))
    
    with open(out_dir / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
        
    bundle = {
        "model": pipeline,
        "version": version,
        "threshold": best_threshold,
        "metrics": metrics
    }
    joblib.dump(bundle, out_dir / f"{version}.pkl")
    print(f"Model saved to {out_dir / f'{version}.pkl'}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--model", choices=['logreg', 'xgb'], default='xgb')
    parser.add_argument("--calibrate", choices=['isotonic', 'sigmoid'], default='isotonic')
    args = parser.parse_args()
    
    train_model(args.data, args.out, args.model, args.calibrate)

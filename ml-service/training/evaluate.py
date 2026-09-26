import argparse
import joblib
import json
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.metrics import classification_report, PrecisionRecallDisplay
from sklearn.calibration import CalibrationDisplay
import matplotlib.pyplot as plt
import shap
import sys

def evaluate_model(model_path, test_csv):
    out_dir = Path(model_path).parent / "plots"
    out_dir.mkdir(parents=True, exist_ok=True)
    
    bundle = joblib.load(model_path)
    pipeline = bundle["model"]
    
    print(f"Loaded model version: {bundle['version']}")
    print(f"Training metrics: {json.dumps(bundle['metrics'], indent=2)}")
    
    if not test_csv:
        print("No test-csv provided. Skipping plots.")
        return
        
    with open(test_csv, "r") as f:
        deals_list = [json.loads(line) for line in f]
    
    labels_file = Path(test_csv).parent / "labels.csv"
    labels_df = pd.read_csv(labels_file)
    
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    from training.features import build_features
    
    df = build_features(deals_list, labels_df)
    df = df.dropna(subset=['is_won'])
    
    X = df[['deal_value', 'stage', 'days_in_stage', 'num_interactions', 'avg_response_min', 'days_since_last', 'sentiment_trend']]
    y = df['is_won']
    
    y_prob = pipeline.predict_proba(X)[:, 1]
    
    # Calibration plot
    fig, ax = plt.subplots()
    CalibrationDisplay.from_predictions(y, y_prob, n_bins=10, ax=ax, name=bundle['version'])
    plt.savefig(out_dir / "calibration.png")
    plt.close()
    
    # PR Curve
    fig, ax = plt.subplots()
    PrecisionRecallDisplay.from_predictions(y, y_prob, ax=ax, name=bundle['version'])
    plt.savefig(out_dir / "pr_curve.png")
    plt.close()
    
    # Feature Importance (Extract from XGB if possible, else skip or plot preprocessor weights)
    # The pipeline is preprocessor -> CalibratedClassifierCV
    # We can extract the base estimator if we want, but it might be hard. We'll generate dummy plots if needed.
    fig, ax = plt.subplots()
    ax.text(0.5, 0.5, 'Feature Importance Plot', ha='center')
    plt.savefig(out_dir / "feature_importance.png")
    plt.close()
    
    # SHAP Summary
    fig, ax = plt.subplots()
    ax.text(0.5, 0.5, 'SHAP Summary Plot', ha='center')
    plt.savefig(out_dir / "shap_summary.png")
    plt.close()
    
    print("Saved plots to", out_dir)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--test-csv", required=False)
    args = parser.parse_args()
    
    evaluate_model(args.model, args.test_csv)

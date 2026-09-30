import argparse
import joblib
import json
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.metrics import classification_report, PrecisionRecallDisplay
from sklearn.calibration import CalibrationDisplay
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import shap
import sys

def evaluate_model(model_path, test_csv):
    out_dir = Path(model_path).parent / "plots"
    out_dir.mkdir(parents=True, exist_ok=True)
    
    bundle = joblib.load(model_path)
    pipeline = bundle["model"]
    version = bundle["version"]
    
    print(f"Loaded model version: {version}")
    print(f"Training metrics: {json.dumps(bundle.get('metrics', {}), indent=2)}")
    
    if not test_csv:
        print("No test-csv provided. Skipping plots.")
        return
        
    with open(test_csv, "r") as f:
        deals_list = [json.loads(line) for line in f]
    
    labels_file = Path(test_csv).parent / "labels.csv"
    if not labels_file.exists():
        print(f"Warning: {labels_file} not found. Skipping evaluation on data.")
        return
        
    labels_df = pd.read_csv(labels_file)
    
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    from training.features import build_features
    
    df = build_features(deals_list, labels_df)
    df = df.dropna(subset=['is_won']).copy()
    
    feature_cols = [
        'deal_value', 'stage', 'days_in_stage',
        'num_interactions', 'avg_response_min',
        'days_since_last', 'sentiment_trend'
    ]
    X = df[feature_cols]
    y = df['is_won'].astype(int)
    
    y_prob = pipeline.predict_proba(X)[:, 1]
    
    # 1. Calibration Plot
    fig, ax = plt.subplots(figsize=(7, 6))
    CalibrationDisplay.from_predictions(y, y_prob, n_bins=10, ax=ax, name=version)
    ax.set_title(f"Reliability Curve (Calibration) - {version}")
    plt.tight_layout()
    plt.savefig(out_dir / "calibration.png", dpi=150)
    plt.close()
    
    # 2. Precision-Recall Curve
    fig, ax = plt.subplots(figsize=(7, 6))
    PrecisionRecallDisplay.from_predictions(y, y_prob, ax=ax, name=version)
    ax.set_title(f"Precision-Recall Curve - {version}")
    plt.tight_layout()
    plt.savefig(out_dir / "pr_curve.png", dpi=150)
    plt.close()
    
    # 3. Feature Importance & SHAP
    preprocessor = pipeline.named_steps['preprocessor']
    classifier = pipeline.named_steps['classifier']
    try:
        feature_names = preprocessor.get_feature_names_out()
        clean_feature_names = [f.replace('num__', '').replace('cat__stage_', 'stage:') for f in feature_names]
    except Exception:
        numeric_names = ['deal_value', 'days_in_stage', 'num_interactions', 'avg_response_min', 'days_since_last', 'sentiment_trend']
        try:
            cat_names = [f"stage:{c}" for c in preprocessor.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(['stage'])]
        except Exception:
            cat_names = ['stage:lead', 'stage:qualified', 'stage:proposal', 'stage:negotiation', 'stage:won', 'stage:lost']
        clean_feature_names = numeric_names + cat_names
    
    X_transformed = preprocessor.transform(X)
    if hasattr(X_transformed, "toarray"):
        X_transformed = X_transformed.toarray()
        
    # Extract base tree estimator if calibrated
    base_estimator = None
    if hasattr(classifier, "calibrated_classifiers_"):
        first_cal = classifier.calibrated_classifiers_[0]
        base_estimator = getattr(first_cal, "estimator", getattr(first_cal, "base_estimator", None))
        # Average feature importances across folds
        importances = np.mean([
            getattr(c, "estimator", getattr(c, "base_estimator", None)).feature_importances_
            for c in classifier.calibrated_classifiers_
            if hasattr(getattr(c, "estimator", getattr(c, "base_estimator", None)), "feature_importances_")
        ], axis=0)
    elif hasattr(classifier, "feature_importances_"):
        base_estimator = classifier
        importances = classifier.feature_importances_
    else:
        importances = None
        
    if importances is not None and len(importances) == len(clean_feature_names):
        fig, ax = plt.subplots(figsize=(8, 5))
        indices = np.argsort(importances)
        ax.barh(range(len(indices)), importances[indices], color="#2563eb", align="center")
        ax.set_yticks(range(len(indices)))
        ax.set_yticklabels([clean_feature_names[i] for i in indices])
        ax.set_xlabel("Relative Feature Importance")
        ax.set_title(f"Feature Importances - {version}")
        plt.tight_layout()
        plt.savefig(out_dir / "feature_importance.png", dpi=150)
        plt.close()
        
    # Generate real SHAP summary & waterfall
    if base_estimator is not None:
        try:
            explainer = shap.TreeExplainer(base_estimator)
            # Sample up to 200 rows for faster SHAP computation
            sample_size = min(len(X_transformed), 200)
            X_sample = X_transformed[:sample_size]
            shap_values = explainer(X_sample)
            
            # Summary plot
            fig = plt.figure(figsize=(9, 6))
            shap.summary_plot(shap_values.values, X_sample, feature_names=clean_feature_names, show=False)
            plt.title(f"SHAP Feature Impact - {version}")
            plt.tight_layout()
            plt.savefig(out_dir / "shap_summary.png", dpi=150)
            plt.close()
            
            # Waterfall plot for 1 demo deal per ML.md §5.2 & §10
            fig = plt.figure(figsize=(8, 6))
            shap_explanation = shap.Explanation(
                values=shap_values.values[0],
                base_values=shap_values.base_values[0] if hasattr(shap_values.base_values, "__len__") else explainer.expected_value,
                data=X_sample[0],
                feature_names=clean_feature_names
            )
            shap.plots.waterfall(shap_explanation, show=False)
            plt.title("SHAP Waterfall - Single Deal Attribution")
            plt.tight_layout()
            plt.savefig(out_dir / "shap_waterfall.png", dpi=150)
            plt.close()
            print("Generated real SHAP summary and waterfall plots.")
        except Exception as e:
            print(f"Warning: SHAP plot generation error: {e}")
            
    print(f"Saved all evaluation plots to {out_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--test-csv", required=False)
    args = parser.parse_args()
    
    evaluate_model(args.model, args.test_csv)

import argparse
import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, FunctionTransformer, OneHotEncoder
from xgboost import XGBClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, brier_score_loss, confusion_matrix
import sys

def train_model(data_path, out_dir, model_type, calibrate):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Load data
    with open(data_path, "r") as f:
        deals_list = [json.loads(line) for line in f]
    
    labels_file = Path(data_path).parent / "labels.csv"
    labels_df = pd.read_csv(labels_file)
    
    # Add training to python path
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    from training.features import build_features
    
    df = build_features(deals_list, labels_df)
    
    # Drop rows where is_won is NaN (open deals)
    df = df.dropna(subset=['is_won'])
    
    # Features and labels
    X = df[['deal_value', 'stage', 'days_in_stage', 'num_interactions', 'avg_response_min', 'days_since_last', 'sentiment_trend']]
    y = df['is_won']
    
    train_size = int(len(X) * 0.7)
    X_train, X_test = X.iloc[:train_size], X.iloc[train_size:]
    y_train, y_test = y.iloc[:train_size], y.iloc[train_size:]
    
    numeric_features = ['deal_value', 'days_in_stage', 'num_interactions', 'avg_response_min', 'days_since_last', 'sentiment_trend']
    categorical_features = ['stage']
    
    numeric_transformer = Pipeline(steps=[
        ('log1p', FunctionTransformer(np.log1p, validate=False)),
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
        ])
    
    if model_type == 'xgb':
        classifier = XGBClassifier(
            eval_metric='logloss',
            random_state=42,
            scale_pos_weight=1.0
        )
        version = 'xgb-v0.1'
    else:
        classifier = LogisticRegression(max_iter=1000, class_weight='balanced')
        version = 'logreg-v0.0'
        
    if calibrate:
        classifier = CalibratedClassifierCV(classifier, method=calibrate, cv=5)
                                   
    pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                               ('classifier', classifier)])
                                   
    pipeline.fit(X_train, y_train)
    
    # Evaluate
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    
    metrics = {
        "model_version": version,
        "dataset": str(data_path),
        "f1": float(f1_score(y_test, y_pred)),
        "roc_auc": float(roc_auc_score(y_test, y_prob)),
        "brier": float(brier_score_loss(y_test, y_prob))
    }
    
    print(json.dumps(metrics, indent=2))
    
    with open(out_dir / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
        
    bundle = {
        "model": pipeline,
        "version": version,
        "threshold": 0.5,
        "metrics": metrics
    }
    joblib.dump(bundle, out_dir / f"{version}.pkl")
    
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--model", choices=['logreg', 'xgb'], default='logreg')
    parser.add_argument("--calibrate", choices=['isotonic', 'sigmoid'], default=None)
    args = parser.parse_args()
    
    train_model(args.data, args.out, args.model, args.calibrate)

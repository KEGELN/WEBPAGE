import pandas as pd
import json
import os

def extract_constants():
    df = pd.read_csv('./placingPredict/data/1finalDataset.csv')
    feature_cols = [c for c in df.columns if c != "RESULT"]
    x_ref = df[feature_cols].copy()

    object_cols = [c for c in feature_cols if x_ref[c].dtype == "object"]
    mappings = {}
    for col in object_cols:
        vocab = pd.Index(x_ref[col].astype(str).dropna().unique())
        mappings[col] = {value: int(idx) for idx, value in enumerate(vocab)}
        x_ref[col] = x_ref[col].astype(str).map(mappings[col]).fillna(-1).astype("int32")

    for col in feature_cols:
        x_ref[col] = pd.to_numeric(x_ref[col], errors="coerce")

    medians = x_ref[feature_cols].median(numeric_only=True).fillna(0.0).to_dict()

    output = {
        "feature_cols": feature_cols,
        "mappings": mappings,
        "medians": medians
    }

    os.makedirs('./placingPredict/data/generated', exist_ok=True)
    with open('./placingPredict/data/generated/model_constants.json', 'w') as f:
        json.dump(output, f)
    
    print("Extracted constants to ./placingPredict/data/generated/model_constants.json")

if __name__ == "__main__":
    extract_constants()

import json
import os
import pandas as pd
import numpy as np
from collections import defaultdict, deque
import xgboost as xgb
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# --- Load Model and Data ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

MODEL_PATH = os.path.join(ROOT_DIR, 'placingPredict/models/best_xgb_model.json')
CONSTANTS_PATH = os.path.join(ROOT_DIR, 'placingPredict/data/generated/model_constants.json')
PVP_DATA_PATH = os.path.join(ROOT_DIR, 'placingPredict/data/bskv_pvp_dataset.csv')

# Globals for caching
_model = None
_constants = None
_state = None

def get_elo_k(matches_played):
    if matches_played < 10: return 64.0
    elif matches_played < 30: return 32.0
    else: return 16.0

def expected_score(elo_a, elo_b):
    return 1.0 / (1.0 + (10.0 ** ((elo_b - elo_a) / 400.0)))

def win_rate(results, window=None):
    if not results: return 0.0
    vals = list(results)[-window:] if window else list(results)
    return float(np.mean(vals)) if vals else 0.0

def avg_last(values, window=None):
    if not values: return 0.0
    vals = list(values)[-window:] if window else list(values)
    return float(np.mean(vals)) if vals else 0.0

def std_last(values, window=None):
    if not values: return 0.0
    vals = list(values)[-window:] if window else list(values)
    return float(np.std(vals)) if len(vals) > 1 else 0.0

def load_resources():
    global _model, _constants, _state
    if _model is not None:
        return

    print("Loading AI resources...")
    # Load Constants
    with open(CONSTANTS_PATH, 'r') as f:
        _constants = json.load(f)

    # Load Model
    _model = xgb.XGBRegressor()
    _model.load_model(MODEL_PATH)

    # Load PvP Data and build ELO state
    df = pd.read_csv(PVP_DATA_PATH)
    
    # Simple date parser
    def parse_dt(s):
        try:
            return pd.to_datetime(str(s).split(' - ')[0], format='%d.%m.%Y', errors='coerce')
        except:
            return pd.NaT

    df['dt'] = df['date_time'].apply(parse_dt)
    df = df.dropna(subset=['dt']).sort_values('dt')

    state = {
        "player_elo": defaultdict(lambda: 1500.0),
        "player_matches": defaultdict(int),
        "player_results": defaultdict(lambda: deque(maxlen=50)),
        "player_kegel": defaultdict(lambda: deque(maxlen=50)),
        "player_sp": defaultdict(lambda: deque(maxlen=50)),
        "player_last_ts": {},
        "h2h_wins": defaultdict(int),
        "player_context": {},
        "max_ts": int(df['dt'].max().timestamp()) if not df.empty else 0
    }

    # Extract required columns
    group_keys = ["season_id", "league_id", "game_id", "duel_row_idx"]
    df['kegel_val'] = pd.to_numeric(df['player_kegel'].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
    df['opp_kegel_val'] = pd.to_numeric(df['opponent_kegel'].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
    df['sp_val'] = pd.to_numeric(df['player_sp'].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
    df['opp_sp_val'] = pd.to_numeric(df['opponent_sp'].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
    df['mp_val'] = pd.to_numeric(df['player_mp'].astype(str).str.replace(',', '.'), errors='coerce')
    df['opp_mp_val'] = pd.to_numeric(df['opponent_mp'].astype(str).str.replace(',', '.'), errors='coerce')

    # Build ELO state (Simplified version of predictmatch.py logic)
    for _, row in df.iterrows():
        p1 = str(row['player_name'])
        p2 = str(row['opponent_name'])
        ts = int(row['dt'].timestamp())

        # Result
        if pd.notna(row['mp_val']) and pd.notna(row['opp_mp_val']):
            res1 = 1.0 if row['mp_val'] > row['opp_mp_val'] else (0.0 if row['mp_val'] < row['opp_mp_val'] else 0.5)
        else:
            res1 = 1.0 if row['kegel_val'] > row['opp_kegel_val'] else (0.0 if row['kegel_val'] < row['opp_kegel_val'] else 0.5)
        
        res2 = 1.0 - res1

        # Context
        state["player_context"][p1] = {"league_id": row["league_id"], "league_name": row["league_name"], "team": row["player_team"]}
        state["player_context"][p2] = {"league_id": row["league_id"], "league_name": row["league_name"], "team": row["opponent_team"]}

        # ELO Update
        exp1 = expected_score(state["player_elo"][p1], state["player_elo"][p2])
        exp2 = 1.0 - exp1
        k1 = get_elo_k(state["player_matches"][p1])
        k2 = get_elo_k(state["player_matches"][p2])

        state["player_elo"][p1] += k1 * (res1 - exp1)
        state["player_elo"][p2] += k2 * (res2 - exp2)

        # History
        state["player_matches"][p1] += 1
        state["player_matches"][p2] += 1
        state["player_results"][p1].append(res1)
        state["player_results"][p2].append(res2)
        state["player_kegel"][p1].append(float(row['kegel_val']))
        state["player_kegel"][p2].append(float(row['opp_kegel_val']))
        state["player_sp"][p1].append(float(row['sp_val']))
        state["player_sp"][p2].append(float(row['opp_sp_val']))
        state["player_last_ts"][p1] = ts
        state["player_last_ts"][p2] = ts

        if res1 == 1.0: state["h2h_wins"][(p1, p2)] += 1
        elif res1 == 0.0: state["h2h_wins"][(p2, p1)] += 1

    _state = state

def predict_match(p1, p2):
    load_resources()
    
    def get_features(player, opponent, is_home=1):
        ctx = _state["player_context"].get(player, {})
        opp_ctx = _state["player_context"].get(opponent, {})
        match_ts = _state["max_ts"] + 86400
        
        p_last = _state["player_last_ts"].get(player)
        o_last = _state["player_last_ts"].get(opponent)
        p_rest = (match_ts - p_last) / 86400.0 if p_last else -1.0
        o_rest = (match_ts - o_last) / 86400.0 if o_last else -1.0
        
        row = {
            "season_id": -1,
            "league_id": ctx.get("league_id", -1),
            "league_name": str(ctx.get("league_name", "unknown")),
            "game_id": -1, "duel__row_idx": -1, "match_timestamp": match_ts,
            "player_name": player, "opponent_name": opponent,
            "player_team": str(ctx.get("team", "unknown")),
            "opponent_team": str(opp_ctx.get("team", "unknown")),
            "player_is_home": is_home,
            "player_matches_pre": _state["player_matches"][player],
            "opponent_matches_pre": _state["player_matches"][opponent],
            "player_is_cold_start": 1 if _state["player_matches"][player] < 10 else 0,
            "opponent_is_cold_start": 1 if _state["player_matches"][opponent] < 10 else 0,
            "player_elo_pre": float(_state["player_elo"][player]),
            "opponent_elo_pre": float(_state["player_elo"][opponent]),
            "elo_diff_pre": float(_state["player_elo"][player] - _state["player_elo"][opponent]),
            "player_winrate_pre": win_rate(_state["player_results"][player]),
            "opponent_winrate_pre": win_rate(_state["player_results"][opponent]),
            "winrate_diff_pre": win_rate(_state["player_results"][player]) - win_rate(_state["player_results"][opponent]),
            "player_avg_kegel_pre": avg_last(_state["player_kegel"][player]),
            "opponent_avg_kegel_pre": avg_last(_state["player_kegel"][opponent]),
            "avg_kegel_diff_pre": avg_last(_state["player_kegel"][player]) - avg_last(_state["player_kegel"][opponent]),
            "player_avg_sp_pre": avg_last(_state["player_sp"][player]),
            "opponent_avg_sp_pre": avg_last(_state["player_sp"][opponent]),
            "avg_sp_diff_pre": avg_last(_state["player_sp"][player]) - avg_last(_state["player_sp"][opponent]),
            "player_rest_days_pre": p_rest, "opponent_rest_days_pre": o_rest,
            "h2h_player_wins_pre": _state["h2h_wins"][(player, opponent)],
            "h2h_opponent_wins_pre": _state["h2h_wins"][(opponent, player)],
            "h2h_diff_pre": _state["h2h_wins"][(player, opponent)] - _state["h2h_wins"][(opponent, player)],
        }
        
        for w in [5, 10, 20]:
            row[f"player_winrate_last_{w}_pre"] = win_rate(_state["player_results"][player], w)
            row[f"opponent_winrate_last_{w}_pre"] = win_rate(_state["player_results"][opponent], w)
            row[f"player_avg_kegel_last_{w}_pre"] = avg_last(_state["player_kegel"][player], w)
            row[f"opponent_avg_kegel_last_{w}_pre"] = avg_last(_state["player_kegel"][opponent], w)
            row[f"player_std_kegel_last_{w}_pre"] = std_last(_state["player_kegel"][player], w)
            row[f"opponent_std_kegel_last_{w}_pre"] = std_last(_state["player_kegel"][opponent], w)
            row[f"player_avg_sp_last_{w}_pre"] = avg_last(_state["player_sp"][player], w)
            row[f"opponent_avg_sp_last_{w}_pre"] = avg_last(_state["player_sp"][opponent], w)
            row[f"player_std_sp_last_{w}_pre"] = std_last(_state["player_sp"][player], w)
            row[f"opponent_std_sp_last_{w}_pre"] = std_last(_state["player_sp"][opponent], w)
        return row

    def preprocess(row_dict):
        x = pd.DataFrame([row_dict])
        for col in _constants["feature_cols"]:
            if col not in x.columns: x[col] = 0
        x = x[_constants["feature_cols"]].copy()
        
        for col, mapping in _constants["mappings"].items():
            x[col] = x[col].astype(str).map(mapping).fillna(-1).astype("int32")
        
        for col in _constants["feature_cols"]:
            x[col] = pd.to_numeric(x[col], errors='coerce')
            
        return x.fillna(_constants["medians"]).fillna(0.0)

    # Duel Prob calculation: Average of (A vs B) and (1 - B vs A)
    x_ab = preprocess(get_features(p1, p2, 1))
    x_ba = preprocess(get_features(p2, p1, 0))
    
    p_ab = float(_model.predict(x_ab)[0])
    p_ba = float(_model.predict(x_ba)[0])
    
    prob = (p_ab + (1.0 - p_ba)) / 2.0
    return max(0.01, min(0.99, prob))

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        p1 = query.get('p1', [None])[0]
        p2 = query.get('p2', [None])[0]

        if not p1 or not p2:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Missing parameters p1 and p2"}).encode())
            return

        try:
            prob = predict_match(p1, p2)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "player1": p1,
                "player2": p2,
                "prediction": prob,
                "win_chance": round(prob * 100, 1)
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

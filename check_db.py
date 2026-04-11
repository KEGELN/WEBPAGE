import os
import psycopg2
from dotenv import load_dotenv
load_dotenv(".env.local")
load_dotenv(".env")

url = os.environ.get("DATABASE_URL")
if url:
    try:
        conn = psycopg2.connect(url, sslmode='require')
        cur = conn.cursor()
        cur.execute("SELECT season_id, league_id, sort_key, count(*) FROM standings_snapshots GROUP BY 1,2,3;")
        rows = cur.fetchall()
        print("Data in standings_snapshots:")
        for r in rows:
            print(r)
    except Exception as e:
        print("Error:", e)

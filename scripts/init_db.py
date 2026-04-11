#!/usr/bin/env python3
import os
import psycopg2
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()
load_dotenv(".env.local")

def get_db_conn():
    url = os.environ.get("MIRROR_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        raise ValueError("DATABASE_URL or MIRROR_DATABASE_URL is required")
    return psycopg2.connect(url, sslmode='require')

def run_sql_file(cur, file_path):
    print(f"Applying {file_path}...")
    with open(file_path, 'r') as f:
        sql = f.read()
        cur.execute(sql)

def main():
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        
        # Apply schemas
        run_sql_file(cur, "db/mirror-postgres.sql")
        run_sql_file(cur, "db/training-postgres.sql")
        
        conn.commit()
        print("\n[SUCCESS] Database tables initialized successfully.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"\n[ERROR] Initialization failed: {e}")

if __name__ == "__main__":
    main()

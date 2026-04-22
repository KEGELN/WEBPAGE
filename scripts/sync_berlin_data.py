#!/usr/bin/env python3
import os
import re
import json
import urllib.request
import urllib.error
import subprocess
import psycopg2
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import urljoin
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

# Load local environment variables
load_dotenv()
load_dotenv(".env.local")

# Configuration
LEAGUE_SOURCES = {
    'berlinliga-local': {
        'page': 'https://kleeblatt-berlin.de/berlinliga-skb/',
        'pdfPage': 'https://kleeblatt-berlin.de/berlinliga-skb/auswertungen-berlinliga/',
        'name': 'Berlin-Liga (Kleeblatt)'
    },
    'vereinsliga-local': {
        'page': 'https://kleeblatt-berlin.de/vereinsliga-skb/',
        'pdfPage': 'https://kleeblatt-berlin.de/vereinsliga-skb/auswertungen-vereinsliga/',
        'name': 'Vereinsliga (Kleeblatt)'
    }
}

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"

def get_db_conn():
    # Priority: MIRROR_DATABASE_URL -> DATABASE_URL
    url = os.environ.get("MIRROR_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        raise ValueError("Neither DATABASE_URL nor MIRROR_DATABASE_URL is set in environment or .env files.")
    
    url = url.strip().strip('"').strip("'")
    
    if "abcxyzabcdef" in url or "[id]" in url:
        print("\n[ERROR] It looks like you are using an EXAMPLE project ID.")
        raise ValueError("Invalid Project ID in Database URL")

    try:
        return psycopg2.connect(url, sslmode='require')
    except psycopg2.OperationalError as e:
        print(f"\n[ERROR] Connection failed: {e}")
        raise

def fetch_url(url, referer=None):
    headers = {"User-Agent": UA}
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        if resp.status >= 400:
            raise urllib.error.HTTPError(url, resp.status, "HTTP Error", {}, None)

        class _Resp:
            def __init__(self, r):
                self.status_code = r.status
                self.content = r.read()
                self.text = self.content.decode("utf-8", errors="replace")
            def raise_for_status(self):
                pass

        return _Resp(resp)

def split_points(val):
    val = str(val).replace(':', '-').replace('/', '-')
    if '-' in val:
        parts = val.split('-')
        return parts[0].strip(), parts[1].strip()
    return val.strip(), "0"

def parse_standings(html):
    soup = BeautifulSoup(html, 'html.parser')
    container = soup.find('div', class_='skb-liga-tabelle-container')
    if not container:
        return []
    
    rows = []
    tbody = container.find('tbody')
    if not tbody: return []
    
    for tr in tbody.find_all('tr'):
        cells = [td.get_text(strip=True) for td in tr.find_all('td')]
        if len(cells) >= 6:
            rows.append({
                'place': cells[0],
                'team': cells[1],
                'games': cells[2],
                'sp': cells[3],
                'mp': cells[4],
                'points': cells[5]
            })
    return rows

def parse_matchdays(html):
    soup = BeautifulSoup(html, 'html.parser')
    matchdays = []
    
    headings = soup.find_all('h3', class_='spieltag-heading')
    for h in headings:
        title = h.get_text(strip=True)
        ul = h.find_next_sibling('ul', class_='spielplan-liste')
        games = []
        if ul:
            for li in ul.find_all('li', class_='spiel-item'):
                spiel_nr_tag = li.find('span', class_='spielnummer')
                pairing_tag = li.find('span', class_='spielpaarung')
                time_tag = li.find('time')
                result_div = li.find('div', class_='ergebnis-info')
                
                res_text = result_div.get_text(" ", strip=True) if result_div else ""
                
                games.append({
                    'spielNumber': spiel_nr_tag.get_text(strip=True) if spiel_nr_tag else "",
                    'pairing': pairing_tag.get_text(strip=True) if pairing_tag else "",
                    'time': time_tag.get_text(strip=True) if time_tag else "",
                    'result': res_text
                })
        matchdays.append({'title': title, 'games': games})
    return matchdays

def extract_pdf_info(html, base_url):
    soup = BeautifulSoup(html, 'html.parser')
    pdfs = []
    for a in soup.find_all('a', href=re.compile(r'\.pdf')):
        url = urljoin(base_url, a['href'])
        title = a.get_text(strip=True)
        pdfs.append({'url': url, 'title': title})
    
    def sort_key(p):
        m = re.search(r'-(\d{1,2})(?:_|\.|$)', p['url'])
        return int(m.group(1)) if m else -1
    
    pdfs.sort(key=sort_key, reverse=True)
    return pdfs

def normalize_pdf_text(text: str) -> list:
    text = text.replace("\r", "\n").replace("\f", "\n").replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    lines = [ln.strip() for ln in re.split(r"\n+", text) if ln.strip()]
    return lines

def is_invalid_left_segment(value: str) -> bool:
    return bool(re.search(r"(?:^|\s)(Bahn|Kegel|SP|MP|Endstand|Schnittliste)(?:\s|$)", value, re.I))

def split_name_team(left: str) -> tuple:
    left = left.strip()
    team_match = re.match(
        r"^(.*?)(KSC(?:\s+[IVX]+)?(?:\s+\([^)]+\))?|Ferns\s+\([^)]+\)|"
        r"Semp(?:/AdW|AdW)?(?:\s+[IVX]+)?(?:\s+\([^)]+\))?|SempAdW|Jugend|Luft|CKC|Klee)$",
        left,
        re.I,
    )
    if team_match:
        return team_match.group(1).strip(), team_match.group(2).strip()

    parts = left.split()
    split_at = max(1, int(len(parts) * 0.65))
    return " ".join(parts[:split_at]).strip(), " ".join(parts[split_at:]).strip()

def parse_pdf_schnitt(pdf_url):
    print(f"  Parsing PDF: {pdf_url}")
    try:
        resp = fetch_url(pdf_url)
        with open("/tmp/temp.pdf", "wb") as f:
            f.write(resp.content)
        
        result = subprocess.run(["pdftotext", "-raw", "/tmp/temp.pdf", "-"], capture_output=True, text=True, check=True)
        text = result.stdout
    except Exception as e:
        print(f"  Warning: PDF parsing failed: {e}")
        return []

    players = []
    seen = set()
    
    lines = normalize_pdf_text(text)
    for line in lines:
        matches = re.finditer(r'(\d{1,2})\s+\.\s+(.*?)(?=\s+\d{1,2}\s+\.|$)', line)
        for m in matches:
            place = int(m.group(1))
            chunk = m.group(2).strip()
            
            # Pattern: (Name/Team) (Games) (Avg with optional comma/multiple decimals) (MP with optional comma) (AE)
            # Vereinsliga example: Tobias Scheffler Jugend 1 542 1 0
            # Berlinliga example: Mayuran Vivekananthan (EO) KSC 1 528,0 1,0 0
            
            # 1. Try strict regex with comma decimals (Berlinliga style)
            num_match = re.search(r'(.*?)\s+(\d{1,2})\s+(\d{1,3},\d+)\s+(\d{1,2},\d+)\s+(\d)$', chunk)
            
            # 2. Try strict regex with possible spaces or missing commas (Vereinsliga style)
            if not num_match:
                num_match = re.search(r'(.*?)\s+(\d{1,2})\s+(\d{1,4}(?:[\.,]\d+)?)\s+(\d{1,2}(?:[\.,]\d+)?)\s+(\d)$', chunk)

            if num_match:
                left_side = num_match.group(1).strip()
                games = num_match.group(2)
                avg = num_match.group(3)
                mp = num_match.group(4)
                plus_ae = num_match.group(5)
                
                if is_invalid_left_segment(left_side): continue
                
                name, team = split_name_team(left_side)
                
                key = (place, name)
                if key not in seen:
                    seen.add(key)
                    players.append({
                        'place': place,
                        'name': name,
                        'team': team,
                        'games': games,
                        'avg': avg,
                        'mp': mp,
                        'plus_ae': plus_ae
                    })
            else:
                # Heuristic split from right
                parts = chunk.split()
                if len(parts) >= 5:
                    try:
                        plus_ae = parts[-1]
                        mp = parts[-2]
                        avg = parts[-3]
                        games = parts[-4]
                        
                        if games.isdigit() and (avg.replace(',','').replace('.','').isdigit()):
                            left_side = " ".join(parts[:-4])
                            name, team = split_name_team(left_side)
                            key = (place, name)
                            if key not in seen:
                                seen.add(key)
                                players.append({
                                    'place': place, 'name': name, 'team': team,
                                    'games': games, 'avg': avg, 'mp': mp, 'plus_ae': plus_ae
                                })
                    except: continue
            
    players.sort(key=lambda r: (r['place'], r['name']))
    print(f"  Found {len(players)} players in Schnittliste")
    return players

def sync_to_db(league_id, info, standings, matchdays, players):
    conn = get_db_conn()
    cur = conn.cursor()
    now = datetime.now().isoformat()
    
    try:
        print(f"  Syncing {league_id} to database...")
        
        cur.execute("""
            INSERT INTO leagues (season_id, league_id, district_id, name, fetched_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (season_id, league_id) DO UPDATE SET name = EXCLUDED.name, fetched_at = EXCLUDED.fetched_at
        """, ('11', league_id, 'local-district', info['name'], now))
        
        cur.execute("DELETE FROM standings_snapshots WHERE season_id = %s AND league_id = %s AND sort_key = %s", ('11', league_id, 'tabelle'))
        for i, row in enumerate(standings):
            tp_plus, tp_minus = split_points(row['points'])
            
            raw_row = [""] * 16
            raw_row[1] = row['place']
            raw_row[2] = row['team']
            raw_row[4] = row['games']
            raw_row[7] = tp_plus
            raw_row[10] = tp_minus
            raw_row[13] = row['mp']
            raw_row[14] = row['sp']
            
            cur.execute("""
                INSERT INTO standings_snapshots (season_id, league_id, spieltag_nr, sort_key, row_index, team_name, position, raw_row_json, fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, ('11', league_id, '100', 'tabelle', i, row['team'], row['place'], json.dumps(raw_row), now))
            
        for day in matchdays:
            matchday_nr_match = re.search(r'(\d+)', day['title'])
            matchday_nr = matchday_nr_match.group(1) if matchday_nr_match else '0'
            
            for game in day['games']:
                game_slug = re.sub(r'[^a-z0-9]', '', game['pairing'].lower())
                game_id = f"{league_id}-{matchday_nr}-{game_slug}"
                
                parts = game['pairing'].split(' - ')
                home = parts[0].strip() if len(parts) > 0 else "Heim"
                away = parts[1].strip() if len(parts) > 1 else "Gast"
                
                pts_match = re.search(r'(\d+)\s*:\s*(\d+)', game['result'])
                pts_home = pts_match.group(1) if pts_match else ""
                pts_away = pts_match.group(2) if pts_match else ""
                
                cur.execute("""
                    INSERT INTO games (game_id, season_id, league_id, district_id, matchday_nr, matchday_label, game_nr, team_home, team_away, result, points_home, points_away, status, source, updated_at, normalized_home, normalized_away)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (game_id) DO UPDATE SET 
                        result = EXCLUDED.result, points_home = EXCLUDED.points_home, points_away = EXCLUDED.points_away,
                        status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
                """, (
                    game_id, '11', league_id, 'local-district', matchday_nr, day['title'], game['spielNumber'],
                    home, away, game['result'], pts_home, pts_away, 
                    'Gespielt' if game['result'] else 'Geplant', 'kleeblatt', now,
                    home.lower(), away.lower()
                ))
        
        cur.execute("DELETE FROM standings_snapshots WHERE season_id = %s AND league_id = %s AND sort_key = %s", ('11', league_id, 'schnitt'))
        for i, p in enumerate(players):
            raw_row = [p['place'], p['name'], p['team'], 'Männer', 0, 0, p['games'], '0', '0', p['avg'], 0, 0, p['mp'], 0]
            
            cur.execute("""
                INSERT INTO standings_snapshots (season_id, league_id, spieltag_nr, sort_key, row_index, team_name, position, raw_row_json, fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, ('11', league_id, '100', 'schnitt', i, p['name'], p['place'], json.dumps(raw_row), now))
            
            normalized = re.sub(r'[^a-z0-9äöüß]', '', p['name'].lower())
            player_key = p['name'].encode('utf-8').hex()
            cur.execute("""
                INSERT INTO player_search_index (player_key, player_name, normalized_name, club_name, season_id, league_id, game_count, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (player_key) DO UPDATE SET 
                    game_count = player_search_index.game_count + EXCLUDED.game_count,
                    updated_at = EXCLUDED.updated_at
            """, (player_key, p['name'], normalized, p['team'], '11', league_id, p['games'], now))
            
        conn.commit()
        print(f"  Successfully synced {league_id}")
        
    except Exception as e:
        conn.rollback()
        print(f"  Sync failed for {league_id}: {e}")
    finally:
        cur.close()
        conn.close()

def main():
    print(f"--- Kegler Hub Berlin Sync Started at {datetime.now()} ---\n")
    for league_id, sources in LEAGUE_SOURCES.items():
        print(f"Processing {league_id} ({sources['name']})...")
        try:
            main_html = fetch_url(sources['page']).text
            pdf_html = fetch_url(sources['pdfPage'], referer=sources['page']).text
            standings = parse_standings(main_html)
            matchdays = parse_matchdays(main_html)
            pdfs = extract_pdf_info(pdf_html, sources['pdfPage'])
            players = parse_pdf_schnitt(pdfs[0]['url']) if pdfs else []
            sync_to_db(league_id, sources, standings, matchdays, players)
        except Exception as e:
            print(f"  CRITICAL ERROR for {league_id}: {e}")

if __name__ == "__main__":
    main()

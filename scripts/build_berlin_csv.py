#!/usr/bin/env python3
"""
Build Berlinliga/Vereinsliga player-table CSVs from Kleeblatt PDFs.

Outputs:
  data/berlinliga/{pdfname}.csv
  data/vereinsliga/{pdfname}.csv
  data/{league}/index.json

Requirements:
  - Python 3.10+
  - Poppler pdftotext available in PATH
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

LEAGUE_PDF_PAGES = {
    "berlinliga": "https://kleeblatt-berlin.de/berlinliga-skb/auswertungen-berlinliga/",
    "vereinsliga": "https://kleeblatt-berlin.de/vereinsliga-skb/auswertungen-vereinsliga/",
}

UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"
)


@dataclass
class PlayerRow:
    place: int
    name: str
    team: str
    games: str
    avg_kegel: str
    mp: str
    plus_ae: str


def fetch_text(url: str, referer: str | None = None) -> str:
    req = Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "de-DE,de;q=0.8,en;q=0.6",
            **({"Referer": referer} if referer else {}),
        },
    )
    with urlopen(req, timeout=30) as res:
        return res.read().decode("utf-8", errors="replace")


def fetch_bytes(url: str, referer: str | None = None) -> bytes:
    req = Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/pdf,*/*;q=0.8",
            **({"Referer": referer} if referer else {}),
        },
    )
    with urlopen(req, timeout=45) as res:
        return res.read()


def extract_pdf_links(html: str, base_url: str) -> list[tuple[str, str]]:
    links: list[tuple[str, str]] = []
    seen: set[str] = set()
    for href, title_html in re.findall(r'<a[^>]+href="([^"]+\.pdf[^"]*)"[^>]*>(.*?)</a>', html, re.I | re.S):
        url = urljoin(base_url, href)
        if url in seen:
            continue
        seen.add(url)
        title = re.sub(r"<[^>]*>", " ", title_html)
        title = re.sub(r"\s+", " ", title).strip()
        if not title:
            title = Path(urlparse(url).path).name
        links.append((url, title))
    return links


def normalize_pdf_text(text: str) -> list[str]:
    text = text.replace("\r", "\n").replace("\f", "\n").replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    lines = [ln.strip() for ln in re.split(r"\n+", text) if ln.strip()]
    return lines


def is_invalid_left_segment(value: str) -> bool:
    return bool(re.search(r"(?:^|\s)(Bahn|Kegel|SP|MP|Endstand|Schnittliste)(?:\s|$)", value, re.I))


def split_name_team(left: str) -> tuple[str, str]:
    left = left.strip()
    team_match = re.match(
        r"^(.*?)(KSC(?:\s+[IVX]+)?(?:\s+\([^)]+\))?|Ferns\s+\([^)]+\)|"
        r"Semp(?:/AdW|AdW)?(?:\s+[IVX]+)?(?:\s+\([^)]+\))?|SempAdW)$",
        left,
        re.I,
    )
    if team_match:
        return team_match.group(1).strip(), team_match.group(2).strip()

    parts = left.split()
    split_at = max(1, int(len(parts) * 0.65))
    return " ".join(parts[:split_at]).strip(), " ".join(parts[split_at:]).strip()


def pick_games_avg(rest: str) -> tuple[str, str, str] | None:
    candidates: list[tuple[int, str, str, str]] = []

    # Preferred form when separators survive extraction: "... <games> <avg>"
    m_sep = re.match(r"^(.*\S)\s+(\d{1,2})\s+(\d{1,4},\d)$", rest)
    if m_sep:
        left, games, avg = m_sep.group(1).strip(), m_sep.group(2), m_sep.group(3)
        try:
            games_n = int(games)
            avg_n = float(avg.replace(",", "."))
        except ValueError:
            games_n = -1
            avg_n = -1
        if left and 0 <= games_n <= 30 and 0 <= avg_n <= 999.9:
            score = 150
            if avg_n >= 100:
                score += 100
            if games_n <= 12:
                score += 30
            candidates.append((score, left, games, avg))

    for avg_digits in range(1, 5):
        for games_digits in range(1, 3):
            m = re.match(rf"^(.*?)(\d{{{games_digits}}})(\d{{{avg_digits}}},\d)$", rest)
            if not m:
                continue
            left, games, avg = m.group(1).strip(), m.group(2), m.group(3)
            if not left:
                continue
            try:
                games_n = int(games)
                avg_n = float(avg.replace(",", "."))
            except ValueError:
                continue
            if games_n > 30 or avg_n > 999.9:
                continue
            score = 0
            if avg_n >= 100:
                score += 100
            if avg_n == 0 and games_n == 0:
                score += 90
            if games_n <= 12:
                score += 30
            if re.search(r"\b(KSC|Ferns|Semp)\b", left, re.I):
                score += 20
            candidates.append((score, left, games, avg))
    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0], reverse=True)
    _, left, games, avg = candidates[0]
    return left, games, avg


def parse_rank_chunk(chunk: str) -> tuple[str, str, str, str, str] | None:
    rest = chunk.strip()
    if not rest:
        return None
    plus = re.search(r"(\d)$", rest)
    if not plus:
        return None
    plus_ae = plus.group(1)
    rest = rest[:-1].rstrip()

    mp = re.search(r"((?:[1-9]\d|\d),\d)$", rest)
    if not mp:
        return None
    mp_val = mp.group(1)
    rest = rest[: -len(mp_val)].rstrip()

    games_avg = pick_games_avg(rest)
    if not games_avg:
        return None
    left, games, avg = games_avg
    return left, games, avg, mp_val, plus_ae


def parse_player_rows(text: str) -> list[PlayerRow]:
    rows: list[PlayerRow] = []
    seen: set[tuple[int, str]] = set()

    for line in normalize_pdf_text(text):
        for m in re.finditer(r"(\d{1,2})\s+\.\s*(.*?)(?=\s+\d{1,2}\s+\.|$)", line):
            place = int(m.group(1))
            parsed = parse_rank_chunk(m.group(2))
            if not parsed:
                continue
            left, games, avg, mp, plus_ae = parsed
            if is_invalid_left_segment(left):
                continue
            name, team = split_name_team(left)
            if not name or not team:
                continue
            key = (place, name)
            if key in seen:
                continue
            seen.add(key)
            rows.append(
                PlayerRow(
                    place=place,
                    name=name,
                    team=team,
                    games=games,
                    avg_kegel=avg,
                    mp=mp,
                    plus_ae=plus_ae,
                )
            )

    rows.sort(key=lambda r: (r.place, r.name))
    return rows


def parse_spieltag_hint(file_name: str, text: str) -> str | None:
    m = re.search(r"(?:-|_)(\d{1,2})(?:_|\.|$)", file_name)
    if m:
        return str(int(m.group(1)))
    m2 = re.search(r"(\d{1,2})\.\s*Spieltag", text, re.I)
    if m2:
        return str(int(m2.group(1)))
    return None


def extract_text_with_poppler(pdf_path: Path) -> str:
    result = subprocess.run(
        ["pdftotext", "-raw", str(pdf_path), "-"],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def write_csv(path: Path, rows: Iterable[PlayerRow]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow(["place", "name", "team", "games", "avg_kegel", "mp", "plus_ae"])
        for r in rows:
            writer.writerow([r.place, r.name, r.team, r.games, r.avg_kegel, r.mp, r.plus_ae])


def build_league(league: str, root: Path) -> None:
    if league not in LEAGUE_PDF_PAGES:
        raise ValueError(f"Unsupported league: {league}")

    league_dir = root / "data" / league
    league_dir.mkdir(parents=True, exist_ok=True)

    page_url = LEAGUE_PDF_PAGES[league]
    html = fetch_text(page_url, referer="https://kleeblatt-berlin.de/")
    links = extract_pdf_links(html, page_url)

    entries: list[dict[str, object]] = []
    with tempfile.TemporaryDirectory(prefix=f"kegel-{league}-") as tmp:
        tmp_dir = Path(tmp)
        for pdf_url, title in links:
            file_name = Path(urlparse(pdf_url).path).name or "report.pdf"
            safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file_name)
            pdf_path = tmp_dir / safe_name

            try:
                data = fetch_bytes(pdf_url, referer=page_url)
                pdf_path.write_bytes(data)
                text = extract_text_with_poppler(pdf_path)
                rows = parse_player_rows(text)
                csv_name = f"{Path(safe_name).stem}.csv"
                csv_path = league_dir / csv_name
                write_csv(csv_path, rows)

                entries.append(
                    {
                        "id": safe_name,
                        "title": title,
                        "pdf_url": pdf_url,
                        "csv_file": csv_name,
                        "spieltag": parse_spieltag_hint(safe_name, text),
                        "row_count": len(rows),
                    }
                )
            except Exception as exc:  # noqa: BLE001
                entries.append(
                    {
                        "id": safe_name,
                        "title": title,
                        "pdf_url": pdf_url,
                        "csv_file": None,
                        "spieltag": None,
                        "row_count": 0,
                        "error": str(exc),
                    }
                )

    index_path = league_dir / "index.json"
    index_path.write_text(json.dumps({"league": league, "reports": entries}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[{league}] wrote {index_path} with {len(entries)} reports")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--league",
        choices=["berlinliga", "vereinsliga", "all"],
        default="all",
        help="League to process",
    )
    parser.add_argument("--root", default=".", help="Project root path")
    args = parser.parse_args()

    if shutil.which("pdftotext") is None:
        raise SystemExit("pdftotext not found in PATH. Install poppler-utils first.")

    root = Path(args.root).resolve()
    leagues = ["berlinliga", "vereinsliga"] if args.league == "all" else [args.league]
    for league in leagues:
        build_league(league, root)


if __name__ == "__main__":
    main()

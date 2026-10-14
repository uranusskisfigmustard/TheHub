#!/usr/bin/env python3
"""Publish the private Warden News editorial Sheet at a confirmed campaign date.

Only the sanitized, date-filtered JSON is ever written inside the repository.
All private source rows remain in memory or an OS temporary directory.
"""
import argparse
import csv
import importlib.util
import json
import os
import re
import sys
import tempfile
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
BUILDER = Path(__file__).with_name("build-hub-news.py")
SHEET_ID = "1dulNV520TgHCJVYHe2rg8Xl9vBwdk-Fm1vzOqrA_7Mo"
SECRET_ENV = "HUB_NEWS_GOOGLE_SERVICE_ACCOUNT_JSON"
STAMP = re.compile(r"^\d{4}-\d{3}$")

POST_HEADERS = [
    "ID", "Publish", "Category", "Type Label", "Title", "Source",
    "Posted Date", "Original Date", "Received Date", "Summary",
    "Body Paragraph 1", "Body Paragraph 2", "Internal Warden Notes",
    "Canon Source",
]
COMMENT_HEADERS = [
    "Post ID", "Order", "Publish", "Username / By", "Posted Date",
    "Comment", "Internal Warden Notes",
]

def load_builder():
    spec = importlib.util.spec_from_file_location("hub_news_exporter", BUILDER)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def validate_stamp(stamp):
    if not STAMP.fullmatch(stamp):
        raise ValueError("Use a campaign date in YYYY-DDD format.")
    year, day = map(int, stamp.split("-"))
    leap = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)
    if year < 1 or day < 1 or day > (366 if leap else 365):
        raise ValueError("Campaign date is not a valid day-of-year.")
    return stamp

def fetch_private_values():
    secret = os.environ.get(SECRET_ENV)
    if not secret:
        raise RuntimeError(
            "Private Google Sheets credential is not configured. "
            "No public feed has been changed."
        )
    # Credential material must never be logged, printed, or written to the repo.
    from google.oauth2 import service_account
    from google.auth.transport.requests import AuthorizedSession
    info = json.loads(secret)
    if info.get("type") != "service_account":
        raise ValueError("The Google Sheets credential must be a service account.")
    creds = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
    )
    session = AuthorizedSession(creds)

    def tab_range(tab, columns):
        range_name = f"'{tab}'!A1:{columns}100"
        url = (f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}"
               f"/values/{quote(range_name, safe='')}")
        response = session.get(
            url,
            params={"valueRenderOption": "FORMATTED_VALUE"},
            timeout=35,
        )
        response.raise_for_status()
        values = response.json().get("values", [])
        if not isinstance(values, list):
            raise ValueError("Unexpected Google Sheets values format.")
        return values

    return tab_range("Posts", "N"), tab_range("Comments", "G")

def validate_rows(values, headers, kind):
    if not values or values[0] != headers:
        raise ValueError(f"Private {kind} sheet header mismatch; publication stopped.")
    result = []
    for line_number, cells in enumerate(values[1:], 2):
        if len(cells) > len(headers):
            raise ValueError(f"Unexpected extra cell in {kind} row {line_number}.")
        padded = list(cells) + [""] * (len(headers) - len(cells))
        if not any(str(v).strip() for v in padded):
            continue
        if not str(padded[0]).strip():
            raise ValueError(f"{kind} row {line_number} has no ID.")
        result.append(dict(zip(headers, padded)))
    return result

def guarded_history(previous, forthcoming, date):
    """Refuse accidental rollback or loss of already published material."""
    if not isinstance(previous, dict) or not isinstance(previous.get("posts"), list):
        raise ValueError("Existing public News JSON is invalid.")
    old_date = validate_stamp(previous["asOf"])
    if date < old_date:
        raise ValueError(f"Cannot roll back News from {old_date} to {date}.")
    old_posts = {p["id"]: p for p in previous["posts"]}
    new_posts = {p["id"]: p for p in forthcoming["posts"]}
    removed = old_posts.keys() - new_posts.keys()
    if removed:
        raise ValueError("Publication would remove historical posts: " + ", ".join(sorted(removed)))
    for pid, old in old_posts.items():
        old_comments = {
            (c["by"], c["date"], c["text"])
            for c in old.get("comments", [])
        }
        new_comments = {
            (c["by"], c["date"], c["text"])
            for c in new_posts[pid].get("comments", [])
        }
        if not old_comments.issubset(new_comments):
            raise ValueError(f"Publication would remove/edit past comments on {pid}.")
    # Corrections of a visible post are allowed only by explicit editorial update
    # through the source sheet; never remove a published post in a normal rebuild.

def write_temp_csv(path, headers, records):
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)

def prepare_publication(post_values, comment_values, date, previous):
    date = validate_stamp(date)
    posts = validate_rows(post_values, POST_HEADERS, "Posts")
    comments = validate_rows(comment_values, COMMENT_HEADERS, "Comments")
    builder = load_builder()
    with tempfile.TemporaryDirectory(prefix="hub-news-private-") as temp:
        post_path = Path(temp) / "posts.csv"
        comment_path = Path(temp) / "comments.csv"
        write_temp_csv(post_path, POST_HEADERS, posts)
        write_temp_csv(comment_path, COMMENT_HEADERS, comments)
        output = builder.build(post_path, comment_path, date)
    guarded_history(previous, output, date)
    return output

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", required=True, help="Confirmed in-game date YYYY-DDD")
    parser.add_argument(
        "--output", type=Path, default=ROOT / "data/hub-news.json",
        help="Sanitized public feed destination",
    )
    args = parser.parse_args()
    date = validate_stamp(args.as_of)
    if not args.output.is_file():
        raise ValueError("The existing public feed must be present before publishing.")
    previous = json.loads(args.output.read_text(encoding="utf-8"))
    private_posts, private_comments = fetch_private_values()
    result = prepare_publication(private_posts, private_comments, date, previous)
    content = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output.read_text(encoding="utf-8") == content:
        print(f"Hub News unchanged at {date}; {len(result['posts'])} public posts.")
        return
    # Atomic replacement: failure before this point leaves public feed untouched.
    staged = args.output.with_suffix(".json.tmp")
    try:
        staged.write_text(content, encoding="utf-8")
        staged.replace(args.output)
    finally:
        staged.unlink(missing_ok=True)
    print(f"Prepared sanitized Hub News at {date}: {len(result['posts'])} public posts.")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # Do not include Google response bodies or service-account material in logs.
        print(f"Hub News publication stopped safely: {type(exc).__name__}.", file=sys.stderr)
        sys.exit(1)

#!/usr/bin/env python3
"""Export player-safe Hub News JSON from private Warden CSVs."""
import argparse
import csv
import json
import re
from pathlib import Path
STAMP = re.compile(r"^\d{4}-\d{3}$")
IDENT = re.compile(r"^[a-z0-9-]{2,80}$")
CATEGORIES = {"local", "outside", "discussion"}

# Approved editorial rule for player-facing News only; does not rename setting canon.
BANNED_PUBLIC_WORD = re.compile(r"\bspine\b", re.IGNORECASE)

def check_public_wording(value, field):
    if BANNED_PUBLIC_WORD.search(value):
        raise ValueError(f"{field}: prohibited News wording detected (Spine)")
    return value

def rows(path):
    with open(path, "r", newline="", encoding="utf-8-sig") as stream:
        return list(csv.DictReader(stream))

def cell(row, key):
    return (row.get(key) or "").strip()

def date_check(value, field, as_of):
    if not STAMP.fullmatch(value) or value > as_of:
        raise ValueError(f"{field}: invalid/future campaign date: {value!r}")
    return value

def build(posts_file, comments_file, as_of):
    if not STAMP.fullmatch(as_of):
        raise ValueError("as-of must be YYYY-DDD")
    posts, by_id = [], {}
    for r in rows(posts_file):
        if cell(r, "Publish") != "PUBLIC":
            continue
        ident, category = cell(r, "ID"), cell(r, "Category")
        if not IDENT.fullmatch(ident) or ident in by_id:
            raise ValueError("Invalid or duplicate post ID: " + ident)
        if category not in CATEGORIES:
            raise ValueError(f"{ident}: invalid category")
        body = [cell(r, "Body Paragraph 1"), cell(r, "Body Paragraph 2")]
        body = [p for p in body if p]
        post = dict(id=ident, visibility="PUBLIC",
            date=date_check(cell(r, "Posted Date"), ident, as_of),
            category=category, typeLabel=cell(r, "Type Label"),
            title=cell(r, "Title"), source=cell(r, "Source"),
            summary=cell(r, "Summary"), body=body, comments=[])
        if not all(post[k] for k in ("typeLabel","title","source","summary")) or not body:
            raise ValueError(f"{ident}: missing public content")
        origin, received = cell(r, "Original Date"), cell(r, "Received Date")
        if category == "outside" and (not origin or not received):
            raise ValueError(f"{ident}: outside dispatch needs original and received dates")
        if origin:
            post["originDate"] = date_check(origin, ident + " origin", as_of)
        if received:
            post["receivedDate"] = date_check(received, ident + " received", as_of)
        if origin and received and origin > received:
            raise ValueError(f"{ident}: origin after receipt")
        by_id[ident] = post
        posts.append(post)
    orders = set()
    for r in rows(comments_file):
        if cell(r, "Publish") != "PUBLIC":
            continue
        ident, order = cell(r, "Post ID"), cell(r, "Order")
        if ident not in by_id:
            raise ValueError("PUBLIC comment has unpublished/missing post " + ident)
        if not order.isdigit() or int(order) < 1 or (ident, int(order)) in orders:
            raise ValueError("Duplicate/invalid comment order: " + ident + "/" + order)
        orders.add((ident, int(order)))
        name, message = cell(r, "Username / By"), cell(r, "Comment")
        if not name or not message:
            raise ValueError(f"{ident}: empty public comment")
        date = date_check(cell(r,"Posted Date"), ident + " comment", as_of)
        by_id[ident]["comments"].append((int(order), dict(by=name,date=date,text=message)))
    for post in posts:
        post["comments"] = [comment for _,comment in sorted(post["comments"])]
        for key in ("typeLabel", "title", "source", "summary"):
            check_public_wording(post[key], f"{post['id']} {key}")
        for i, paragraph in enumerate(post["body"], 1):
            check_public_wording(paragraph, f"{post['id']} body {i}")
        for i, comment in enumerate(post["comments"], 1):
            check_public_wording(comment["by"], f"{post['id']} comment {i} author")
            check_public_wording(comment["text"], f"{post['id']} comment {i} text")
    posts.sort(key=lambda p:(p["date"],p["id"]),reverse=True)
    return dict(schemaVersion=1,asOf=as_of,publicationMode="warden-curated",posts=posts)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--posts",type=Path,required=True)
    p.add_argument("--comments",type=Path,required=True)
    p.add_argument("--as-of",required=True)
    p.add_argument("--output",type=Path,required=True)
    a=p.parse_args()
    result=build(a.posts,a.comments,a.as_of)
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Exported {len(result['posts'])} PUBLIC posts")
if __name__=="__main__":
    main()

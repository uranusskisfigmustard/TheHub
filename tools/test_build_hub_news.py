#!/usr/bin/env python3
"""Regression tests for in-game date gates on player-visible Hub News."""
import csv
import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("build-hub-news.py")
spec = importlib.util.spec_from_file_location("hub_news_exporter", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

POST_FIELDS = [
    "ID", "Publish", "Category", "Type Label", "Title", "Source",
    "Posted Date", "Original Date", "Received Date", "Summary",
    "Body Paragraph 1", "Body Paragraph 2",
    "Internal Warden Notes", "Canon Source",
]
COMMENT_FIELDS = [
    "Post ID", "Order", "Publish", "Username / By", "Posted Date",
    "Comment", "Internal Warden Notes",
]


def post(ident, state, date):
    return {
        "ID": ident, "Publish": state, "Category": "discussion",
        "Type Label": "DOCK / CHAT", "Title": "routine service",
        "Source": "bayclock", "Posted Date": date,
        "Summary": "people are working", "Body Paragraph 1": "tool bags again",
        "Internal Warden Notes": "SECRET: future shuttle recovery intention",
    }


def comment(ident, number, state, date):
    return {
        "Post ID": ident, "Order": str(number), "Publish": state,
        "Username / By": "quayrunner", "Posted Date": date,
        "Comment": "service permits aren't release papers",
        "Internal Warden Notes": "SECRET: Warden plan",
    }


class HubNewsScheduledPublicationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.posts = root / "posts.csv"
        self.comments = root / "comments.csv"

    def write(self, filename, fields, records):
        with filename.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(records)

    def baseline(self):
        self.write(self.posts, POST_FIELDS, [
            post("public-post", "PUBLIC", "2237-280"),
            post("future-post", "SCHEDULED", "2237-291"),
            post("draft-post", "DRAFT", "2237-250"),
            post("hold-post", "HOLD", "2237-250"),
        ])
        self.write(self.comments, COMMENT_FIELDS, [
            comment("public-post", 1, "PUBLIC", "2237-281"),
            comment("public-post", 2, "SCHEDULED", "2237-287"),
            comment("future-post", 1, "SCHEDULED", "2237-292"),
            comment("public-post", 3, "DRAFT", "2237-280"),
        ])

    def test_undue_posts_and_comments_are_not_exported(self):
        self.baseline()
        out = module.build(self.posts, self.comments, "2237-283")
        self.assertEqual([p["id"] for p in out["posts"]], ["public-post"])
        self.assertEqual(len(out["posts"][0]["comments"]), 1)
        self.assertNotIn("SECRET", str(out))
        self.assertNotIn("future-post", str(out))

    def test_scheduled_posts_and_replies_arrive_when_clock_advances(self):
        self.baseline()
        middle = module.build(self.posts, self.comments, "2237-290")
        self.assertEqual(len(middle["posts"]), 1)
        self.assertEqual(len(middle["posts"][0]["comments"]), 2)
        out = module.build(self.posts, self.comments, "2237-292")
        self.assertEqual(len(out["posts"]), 2)
        self.assertEqual(out["posts"][0]["id"], "future-post")
        self.assertEqual(len(out["posts"][0]["comments"]), 1)
        self.assertEqual(out["posts"][0]["visibility"], "PUBLIC")
        self.assertNotIn("draft-post", str(out))
        self.assertNotIn("hold-post", str(out))

    def test_future_public_rows_are_rejected(self):
        self.write(self.posts, POST_FIELDS, [post("future-public", "PUBLIC", "2237-300")])
        self.write(self.comments, COMMENT_FIELDS, [])
        with self.assertRaisesRegex(ValueError, "future"):
            module.build(self.posts, self.comments, "2237-283")

    def test_due_scheduled_comment_requires_a_published_parent(self):
        self.write(self.posts, POST_FIELDS, [post("held-post", "HOLD", "2237-280")])
        self.write(self.comments, COMMENT_FIELDS, [comment("held-post", 1, "SCHEDULED", "2237-283")])
        with self.assertRaisesRegex(ValueError, "missing post"):
            module.build(self.posts, self.comments, "2237-283")


if __name__ == "__main__":
    unittest.main()

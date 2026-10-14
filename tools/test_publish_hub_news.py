#!/usr/bin/env python3
"""End-to-end unit checks for the private-Sheets campaign-date publisher."""
import importlib.util
import json
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("publish_hub_news.py")
spec = importlib.util.spec_from_file_location("hub_news_publisher", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def record(headers, **fields):
    return [str(fields.get(k, "")) for k in headers]

def make_post(post_id, state, date):
    return record(module.POST_HEADERS, **{
        "ID": post_id, "Publish": state, "Category": "discussion",
        "Type Label": "DOCK / CHAT", "Title": "routine visits",
        "Source": "quayrunner", "Posted Date": date,
        "Summary": "boring inspection", "Body Paragraph 1": "tools came in",
        "Internal Warden Notes": "SECRET: hidden motive",
        "Canon Source": "SECRET: Warden-only canon",
    })

def make_comment(post_id, order, state, date):
    return record(module.COMMENT_HEADERS, **{
        "Post ID": post_id, "Order": order, "Publish": state,
        "Username / By": "watchstander", "Posted Date": date,
        "Comment": "not cleared to launch",
        "Internal Warden Notes": "SECRET: hidden motive",
    })

def old_feed():
    return {"schemaVersion": 1, "asOf": "2237-283",
            "publicationMode": "warden-curated", "posts": [
        {"id": "existing", "visibility": "PUBLIC", "date": "2237-283",
         "comments": [{"by": "someone", "date": "2237-283", "text": "already here"}]}
    ]}

class CampaignPublisherTests(unittest.TestCase):
    def baseline(self):
        posts = [
            module.POST_HEADERS,
            make_post("existing", "PUBLIC", "2237-283"),
            make_post("future", "SCHEDULED", "2237-291"),
            make_post("unplayed", "DRAFT", ""),
        ]
        comments = [
            module.COMMENT_HEADERS,
            make_comment("existing", "1", "PUBLIC", "2237-283"),
            make_comment("existing", "2", "SCHEDULED", "2237-288"),
            make_comment("future", "1", "SCHEDULED", "2237-292"),
        ]
        old = old_feed()
        old["posts"][0]["comments"][0] = {
            "by": "watchstander", "date": "2237-283", "text": "not cleared to launch"
        }
        return posts, comments, old

    def test_private_notes_and_future_posts_never_export_early(self):
        posts, comments, previous = self.baseline()
        result = module.prepare_publication(posts, comments, "2237-283", previous)
        self.assertEqual(result["asOf"], "2237-283")
        self.assertEqual([p["id"] for p in result["posts"]], ["existing"])
        self.assertEqual(len(result["posts"][0]["comments"]), 1)
        self.assertNotIn("SECRET", json.dumps(result))
        self.assertNotIn("future", json.dumps(result))
        self.assertNotIn("unplayed", json.dumps(result))

    def test_date_advance_publishes_scheduled_items(self):
        posts, comments, previous = self.baseline()
        result = module.prepare_publication(posts, comments, "2237-292", previous)
        self.assertEqual([p["id"] for p in result["posts"]], ["future", "existing"])
        self.assertEqual(len(result["posts"][0]["comments"]), 1)
        self.assertEqual(len(result["posts"][1]["comments"]), 2)
        self.assertNotIn("SECRET", json.dumps(result))

    def test_date_rollback_rejected(self):
        posts, comments, previous = self.baseline()
        with self.assertRaisesRegex(ValueError, "roll back"):
            module.prepare_publication(posts, comments, "2237-282", previous)

    def test_history_removal_rejected(self):
        posts, comments, previous = self.baseline()
        posts[1][1] = "HOLD"
        with self.assertRaisesRegex(ValueError, "remove historical posts"):
            module.prepare_publication(posts, comments, "2237-283", previous)

    def test_comment_removal_rejected(self):
        posts, comments, previous = self.baseline()
        comments[1][2] = "HOLD"
        with self.assertRaisesRegex(ValueError, "remove/edit past comments"):
            module.prepare_publication(posts, comments, "2237-283", previous)

    def test_invalid_day_of_year(self):
        for bad in ("2237-000", "2237-366", "2236-367", "tomorrow"):
            with self.subTest(bad=bad):
                with self.assertRaises(ValueError):
                    module.validate_stamp(bad)
        self.assertEqual(module.validate_stamp("2236-366"), "2236-366")

    def test_private_sheet_header_mismatch_fails_closed(self):
        posts, comments, previous = self.baseline()
        posts[0][0] = "not-an-id-header"
        with self.assertRaisesRegex(ValueError, "header mismatch"):
            module.prepare_publication(posts, comments, "2237-283", previous)

if __name__ == "__main__":
    unittest.main()

# The Hub — News & Discussions

Status: CANON design approved 13 October 2026; deployment and public feed publication must be verified separately.

## Purpose
- NEWS is a distinct player console section, not a Mission Board contract category.
- Players cannot post, reply, vote, or edit. The page has no submission endpoint.
- All news and replies are Warden-authored as in-fiction public material. Sources are limited, biased, and sometimes wrong.
- Existing Hub canon controls decentralized information. This public feed is an aggregator, not a universal station broadcaster.
- Outside reports arrive aboard ships, not by FTL communications. Keep original and received dates.
- No essential clue, plot viability, or formal contract automatically hinges on reading the feed.
- M5 had no public broadcast or organized recognition. Preserve its ordinary gratitude and gradual word of mouth.

## Private editorial source
WARDEN-ONLY Google Sheet:
https://docs.google.com/spreadsheets/d/1dulNV520TgHCJVYHe2rg8Xl9vBwdk-Fm1vzOqrA_7Mo/edit

Tabs: Posts, Comments, Publish Guide.
Posts and Comments have independent PUBLIC/DRAFT/HOLD gates.
Internal Warden Notes and Canon Source stay private. Never upload private CSV files to the public GitHub repository.

## Publication procedure
1. Resolve facts using Master Index → Canon Register → narrowest current setting/mission/live authority.
2. Add/edit private Posts and Comments. Assign distinct IDs, dates, source and publication state. Start new rows in DRAFT.
3. Only after editorial approval, mark PUBLIC. Export Posts and Comments as separate UTF-8 CSV files outside the public repo.
4. Run locally: python tools/build-hub-news.py --posts posts.csv --comments comments.csv --as-of 2237-283 --output data/hub-news.json
5. Inspect the allowlisted player-visible JSON, check spoilers/chronology/source credibility, test on preview and mobile, then commit sanitized JSON.
6. Preserve older reports as history. Update or add a new report when the world genuinely responds.

The exporter reads fixed public columns only and never publishes Internal Warden Notes, Canon Source, DRAFT, or HOLD rows. Publishing is deliberate; the calendar never auto-invents news.

## Public JSON
data/hub-news.json contains schemaVersion, asOf, publicationMode and posts.
A post contains id, visibility PUBLIC, date, category local/outside/discussion, typeLabel, title, source, summary, body paragraphs and comments. Outside posts also have originDate and receivedDate. Each comment includes by, date and text. The frontend creates text nodes instead of interpreting markup.

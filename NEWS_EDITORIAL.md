# The Hub — News & Discussions

Status: CANON design approved 13 October 2026; deployment and public feed publication must be verified separately.

## Purpose
- NEWS & DISCUSSIONS is a subpage of the BOARD navigation, alongside CONTRACTS and CLASSIFIEDS; it is not a Mission Board contract category. The NEWS & DISCUSSIONS page, read-only permissions, editorial records and sanitized feed remain independent of Contracts and Classifieds.
- Players cannot post, reply, vote, or edit. The page has no submission endpoint.
- All news and replies are Warden-authored as in-fiction public material. Sources are limited, biased, and sometimes wrong.
- Everyday entries should read like messages from residents, not formal summaries: distinct handles, varied contractions, shorthand, occasional typos, inconsistent punctuation, disagreement and incomplete understanding. Do not force errors into every sentence; preserve legibility and each poster's individual voice. Verified public notices and authentic outside dispatches can be more formally written and clearly labeled.
- Keep users' uncertainty in the fiction. A person's anecdote, rumor, complaint or bad guess is not a newly confirmed event, a Warden-only reveal, or automatically public notoriety.
- The full original post is visible in the feed. Replies open underneath it. Players cannot add their own replies. In the editorial Sheet, the Source column is the visible author/handle for informal posts and the named source for official dispatches.
- Existing Hub canon controls decentralized information. This public feed is an aggregator, not a universal station broadcaster.
- Outside reports arrive aboard ships, not by FTL communications. Keep original and received dates.
- No essential clue, plot viability, or formal contract automatically hinges on reading the feed.
- M5 had no public broadcast or organized recognition. Preserve its ordinary gratitude and gradual word of mouth.
- Player-facing News terminology: do not use the word **Spine** (case-insensitive) in articles, source labels, or NPC comments. Prefer **Public Transit** when referring to ordinary passenger transportation. This does not rename established setting canon. The exporter enforces the restriction.

## Chronology and independent world progression
- The published feed is a history of in-game posts, not a feed freshly created on the current date. Retain original post dates, allow older threads to revive, show both post and latest-reply dates, and order by latest activity. Reply dates cannot precede their post or exceed the recorded campaign endpoint.
- Update posts in response to actual in-game time advances and meaningful events, not real-world elapsed time. There is no fixed posts-per-session quota; some threads end quietly.
- NPCs, factions, employers and other contractors act while the PCs are absent. At session close, downtime advancement, or another meaningful time skip, check existing Campaign Thread Ledger / Continuity Tracker owners and Mission Board lifecycle. Adjudicate independent choices and consequences using established interests, resources, pressure and opportunity; record the outcome in the narrow owning state before publishing reactions.
- An ignored situation may be solved, negotiated, worsened, transferred, abandoned or closed by other people. Do not prewrite inevitable disasters or force one ending; declining work does not itself punish the PCs. PC actions can modify the outcome, timing and costs but are not a prerequisite for movement.
- Posts and replies report only what their fictional authors could know. Distinguish established outcomes from bias, misunderstanding and rumor; never let a public rumor itself establish a hidden event. Ongoing labor/union talk does not establish a union, a strike, or a new management concession without independent recorded advancement.
- Initial 2237-283 mix approved: 11 posts (6 ordinary Hub life, 3 M2 worker-safety/representation/privacy discussions, 1 public Working the Old Ground listing, 1 public Recirculation Contamination Trace listing). Keep M5 word of mouth gradual; do not reveal confidential SUSTAIN-9, corporate chains, the carrier's status or future mission outcomes.
- This is an editorial and session-review rule, not an autonomous real-time service. Each recorded campaign-time advance must be adjudicated, then selectively reflected here. The board never decides mission outcomes by itself.

## Private editorial source
WARDEN-ONLY Google Sheet:
https://docs.google.com/spreadsheets/d/1dulNV520TgHCJVYHe2rg8Xl9vBwdk-Fm1vzOqrA_7Mo/edit

Tabs: Posts, Comments, Publish Guide.
Posts and Comments have independent PUBLIC/SCHEDULED/DRAFT/HOLD gates. SCHEDULED requires Warden approval of the fictional trigger and a known in-game date; it is not suitable for an event that has not yet happened. Future SCHEDULED content remains private until the campaign date reaches its Posted Date and the feed is rebuilt. DRAFT/HOLD never export.
Internal Warden Notes and Canon Source stay private. Never upload private CSV files to the public GitHub repository.
Use Internal Warden Notes only for a concrete canon dependency, deliberate misinformation, an evolving thread, or a consequential future follow-up. Leave routine comments' notes blank. Never include these notes in public JSON, public replies, dates, source labels, or the player board itself.

## Connected date-gated publication

- **Hub News Date Publisher is active**. It runs daily at 7:00 PM America/New_York using connected Google Drive and GitHub tools. The prior weekly task was paused on 18 October 2026 after a repository-write restriction; direct GitHub write capability was verified restored on 27 October 2026. It is date-gated: a run with no newly due approved material makes no content change.
- The publisher calculates the established derived campaign date (in-world year = real-world year + 211; matching ordinal day), checks for a recorded manual time jump, and treats `data/campaign-date.json` only as a derived mirror. GitHub Actions remains test/deployment-only; it does not select or create News content.
- At each run, read the WARDEN-ONLY editorial Sheet and the current Timeline, Dashboard, Canon Register, and Continuity Tracker; determine the **actual confirmed in-game date**. Apply the established derived calendar rule for ordinary day-to-day progression; a scheduled run never creates a manual time jump, a fictional event, or a mission outcome.
- Confirm each public entry is already approved and its fictional prerequisites actually occurred. For entries that are **SCHEDULED**, the in-game date must be on or after the post/comment date. Conditional Levent maintenance rumors remain DRAFT until the actual visits are recorded; no date alone establishes a visit, tampering, theft, or outcome.
- Rebuild the allowlisted player feed using the same validation rules as `tools/build-hub-news.py`, preserving all previous public posts and replies. Never commit future-dated content, unapproved DRAFT/HOLD material, Internal Warden Notes, Canon Source, or unsanitized spreadsheet data, including in Git history.
- Commit **only** changed `data/hub-news.json` to `uranusskisfigmustard/TheHub`. When the authoritative campaign date changes, also update `data/campaign-date.json` as a **derived marker only**. These files never override canon. Verify the public GitHub snapshot after the write and report only genuine publication or a blocker.
- If neither campaign time nor approved player-visible content changed, make no GitHub edits. An inaccessible connector, questionable source, bad chronology or history loss blocks publication instead of falling back to guessing. No new workflow needs configuring by the user.

The older GitHub Actions private-service-account publishing workflow was retired because it required credential setup. The optional `tools/publish_hub_news.py` script remains as inactive fallback tooling; it is **not** the scheduled publishing mechanism.

## Publication procedure
1. Resolve facts using Master Index → Canon Register → narrowest current setting/mission/live authority.
2. Add/edit private Posts and Comments. Assign distinct IDs, dates, source and publication state. Start new rows in DRAFT.
3. After verifying what has actually occurred, choose a publish state: PUBLIC for immediate inclusion, SCHEDULED for approved material with a known future in-game Posted Date, or DRAFT/HOLD for unresolved fictional events. A SCHEDULED row must not assume a visit, breach, confrontation, or other event has happened merely because a date is approaching. Give Comments their own dates and states.
4. The scheduled publisher publishes only approved entries whose known in-game dates have arrived. For an authorized manual/offline publication pass, export private Posts and Comments as UTF-8 CSV **outside** the public repository and run `python tools/build-hub-news.py --posts posts.csv --comments comments.csv --as-of 2237-283 --output data/hub-news.json` using the current confirmed in-game date.
5. The exporter includes PUBLIC rows, and SCHEDULED rows only when Posted Date <= --as-of. Future scheduled posts and comments never enter the generated JSON. It refuses a PUBLIC row dated in the future; DRAFT/HOLD never export.
6. Inspect the allowlisted player-visible JSON: each reply has a real YYYY-DDD campaign date and the actual NPC text, never an editorial note. Check spoilers/chronology/source credibility, test on preview and mobile, then commit sanitized JSON.
7. Preserve older reports as history. Update or add a new report when the world genuinely responds.

**Date-gated publication:** Hub News Date Publisher is the configured routine publisher. It checks the established campaign date daily and publishes only due approved rows through the connected GitHub path. GitHub Actions runs code tests and deployment only, not News selection. No credential or real-world GitHub cron is needed. Never commit future posts, private CSVs, service-account keys, or Warden notes to the public repository.

The exporter reads fixed public columns only and never publishes Internal Warden Notes, Canon Source, DRAFT, HOLD, or not-yet-due SCHEDULED rows. Publication remains deliberate and never auto-creates story events.

## Public JSON
data/hub-news.json contains schemaVersion, asOf, publicationMode and posts.
A post contains id, visibility PUBLIC, date, category local/outside/discussion, typeLabel, title, source, summary, body paragraphs and comments. Outside posts also have originDate and receivedDate. Each comment includes by, date and text. The frontend creates text nodes instead of interpreting markup.

# Warden Frontend Performance / Load TODO

Scope: frontend-only Warden console work. Do not change Google Apps Script contracts from this list.

## Current requirement

- [x] Preload the Warden interface and frontend assets instead of showing only a blank/loading page.
- [x] Keep Warden campaign controls non-interactable while the authoritative backend feed is connecting.
- [x] Show explicit connection state: `LOCKED`, `CONNECTING`, `BACKEND READY`, or `BACKEND ERROR`.
- [x] Keep connection/recovery controls available while records refresh.

## Frontend performance work

- [x] Preconnect to the immutable base source and Apps Script host.
- [x] Start downloading all Warden patch scripts and styles immediately.
- [x] Execute patch scripts with `defer` so downloads can overlap while preserving script order.
- [x] Cache the immutable pinned base HTML instead of forcing a fresh network copy on every load.
- [x] Use `content-visibility` on long Warden panels/cards to reduce offscreen layout and paint work without lazy-loading data.
- [x] Keep the player-style visual layer separate from application behavior.
- [ ] Materialize the pinned base Warden HTML directly in the repository so `warden.html` no longer needs the bootstrap fetch / `document.write` replacement step.
- [ ] After functional parity is confirmed, consider a generated Warden frontend bundle to reduce the large number of individual patch-file requests while retaining source modules for maintenance.
- [ ] Add lightweight client-side timing diagnostics for bootstrap, first shell paint, backend-ready, and workspace-ready states if further tuning is needed.

## Out of scope unless separately approved

These would require Google Apps Script/backend work and are intentionally not part of the frontend-only pass:

- Consolidating multiple backend actions into a single larger Warden feed.
- Server-side caching or ETag/version responses.
- Changing Apps Script response formats or authentication/session behavior.

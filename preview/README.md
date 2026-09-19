# Player Console Preview

This directory is a non-production structural preview for the player console refactor.

## Safety rules

- Do not load transactional production modules here.
- Do not accept contracts, commit purchases, mutate Warden state, or perform other write actions from preview.
- Do not reuse production localStorage/sessionStorage keys. Preview-owned storage keys must use the `hub-preview:` prefix.
- Do not use MutationObserver or polling to coordinate application-owned shell elements.
- Keep production routes unchanged until a preview migration slice passes desktop and phone checks.

## Current scope

The preview validates the approved navigation hierarchy only:

- BOARD — Contracts, Classifieds
- CREW — Contract Logs, Between Sessions
- ACCOUNTS — Statements, Purchase Board
- REFERENCE — Player Reference

All preview destinations are represented through the `page` query parameter on `/preview/`. The shell resolves that explicit page ID through `player-routes.js` and renders navigation once.

## Manual smoke checks

1. Load `/preview/` and confirm `BOOT OK` appears.
2. Open each primary and secondary destination.
3. Reload a non-default destination and confirm its active state persists from the URL.
4. Use browser back/forward and confirm active state follows the route.
5. Check desktop width and narrow phone width.
6. Confirm no horizontal overflow or clipped primary navigation.
7. Confirm touch targets remain usable.
8. Confirm the page remains responsive after navigation/reload.
9. Confirm browser console contains no uncaught errors or unhandled promise rejections.
10. Confirm no production state changes occur.

## Promotion rule

This preview is not a production replacement. Migrate one real player page at a time only after the preview shell remains stable.
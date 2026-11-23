/* Player-safe Special Request previews: 3 unapproved gear candidates.
 * Deliberately excludes canon/adapted duplicates, rejected or Warden-only concepts,
 * source-only organism/ore tables, and other non-retail reference entries.
 * Source and price references are not live offers. No catalog row or purchase permission.
 * WARDEN-ONLY Source Gear Staging in Drive retains the full 200-row audit and reasons.
 */
(() => {
  'use strict';
  window.HubSpecialRequests = Object.freeze([
  {
    "id": "SRC-0198",
    "item": "Non-Lethal Ammo",
    "source": "Armory Expanded v2",
    "group": "WEAPONS & SECURITY",
    "sourcePrice": "5cr",
    "referenceOnly": false
  },
  {
    "id": "SRC-0199",
    "item": "Shotgun Shells",
    "source": "Armory Expanded v2",
    "group": "WEAPONS & SECURITY",
    "sourcePrice": "8cr",
    "referenceOnly": false
  },
  {
    "id": "SRC-0200",
    "item": "Sonic Charges",
    "source": "Armory Expanded v2",
    "group": "WEAPONS & SECURITY",
    "sourcePrice": "20cr",
    "referenceOnly": false
  }
]);
})();

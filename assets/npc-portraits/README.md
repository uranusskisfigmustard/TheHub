# NPC Portrait Assets

Player-safe web copies of approved Hub NPC portraits used by the Warden Console and potentially other in-game interfaces.

## File naming

Use the NPC's canonical name converted to lowercase kebab-case:

- `Asha Raman` -> `asha-raman.png`
- `Dr. Pella Sorn` -> `dr-pella-sorn.jpg`
- `Tovan Rusk` -> `tovan-rusk.jpeg`
- `Service Controller Anik Saye` -> `service-controller-anik-saye.png`

Supported extensions, checked in this order:

1. `.png`
2. `.jpg`
3. `.jpeg`

Keep only one active file per NPC slug to avoid ambiguity.

The full-resolution campaign master may remain in Google Drive as `NPC Portrait — <Canonical NPC Name>.<ext>`. Assets in this public repository must contain no WARDEN-ONLY information.

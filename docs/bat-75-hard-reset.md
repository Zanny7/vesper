# BAT-75: local hard reset

The Home page exposes **Development · Hard Reset** only on localhost. The action opens a confirmation dialog explaining that local Vesper progress and settings will be erased. Cancel only closes the dialog. Reset Everything removes the keys listed in `src/hard-reset.js` and reloads the page so all in-memory combat, selection, and chapter-run state is initialized from a fresh save.

## Current persistence inventory

All current persisted game data uses `localStorage`:

- `vesper-campaign-v3` stores completed campaign encounters. `vesper-chapter1-v2` is its legacy migration source.
- `vesper-chapter-runs-v1` stores active chapter routes and encounter resources.
- `vesper-equipment-v2` stores owned, bagged, and equipped gear. `vesper-equipment-v1` is its legacy migration source.
- `vesper-talents-v1` stores healer milestones, talent allocations, and the one-time legacy reconciliation marker.
- `vesper-active-healer-v1` stores the selected healer.
- `vesper-abilities-v1-priest` and `vesper-abilities-v1-druid` store ability order and keybinds.
- `vesper-view`, `vesper-music-settings-v1`, and `vesper-encounter-speed` store presentation and audio/speed preferences.

The app currently does not use `sessionStorage`, IndexedDB, or cookies for Vesper state. Add any future persistent key to the reset registry and this inventory. The reset does not clear other origin keys.

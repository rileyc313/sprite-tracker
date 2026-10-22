# Sprite Tracker

A Windows desktop app for tracking your Fortnite Sprite collection, styled like Windows 95 (it follows [Muck95](https://github.com/rileyc313/muck95)'s theme when Muck95 is installed).

- Tick every variant you own and star the ones you've mastered
- Filter by rarity, variant type, missing/owned/mastered or new; search covers abilities and lobby codes
- Tracks Chapter 7 Season 4 (27 sprites, 162 variants) and Season 3
- Stays up to date: on launch it downloads [`ui/sprites.json`](ui/sprites.json) from this repo and checks the Fortnite Wiki for sprites and variants that aren't listed yet. Pictures come from the wiki
- Add anything still missing yourself; export/import a backup of your collection

## Adding new sprites

Edit `ui/sprites.json`, bump `updated` to today's date, and push. Every copy of the app picks it up on its next launch (or F5).
A sprite gets `"Base"` plus the season's `defaultVariants`. `variants` replaces that list, `extra` adds to it, and `how` / `vadded` are keyed by variant type.

## Build

Tauri 2 with zero Rust logic beyond reading Muck95's theme; the UI is `ui/`.

```
cargo build --release
```

Then copy `target\release\sprite-tracker.exe` to `%LOCALAPPDATA%\Programs\Sprite Tracker\Sprite Tracker.exe`.

Not affiliated with Epic Games. Wiki content from fortnite.fandom.com (CC BY-SA).

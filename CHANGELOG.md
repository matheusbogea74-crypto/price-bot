# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Initial public snapshot of the project. Not yet tagged as a release.

### Added
- Scheduled price checks against a tracked-product list, with historical-low detection.
- Autonomous deal discovery from store deal pages, with real-price re-verification, a configurable minimum-discount threshold, and an optional AI relevance gate (Google Gemini).
- Per-store scraping strategies (direct headless browser and managed-proxy scraping), unified behind a single dispatch interface.
- WhatsApp delivery for alerts via an unofficial WhatsApp Web client library, including image + formatted price-comparison messages.
- Coupon-channel relay: subscribes to a source WhatsApp channel and republishes cleaned-up messages.
- Remote control commands (`/pausar`, `/retomar`, `/status`) via WhatsApp messages.
- Per-store affiliate link construction with an optional link-shortening step.
- SQLite storage (`node:sqlite`) with a two-table schema (`products`, `price_history`).
- CLI utilities for managing tracked products, previewing ad output, and testing individual store scrapers in isolation.
- Open-source project scaffolding: README, architecture docs, contribution guide, code of conduct, security policy, CI, lint/format tooling.
- Starter automated test suite (`npm test`, Node's built-in test runner) covering pure utility functions.
- Shared `src/utils/currency.js`, `src/utils/delay.js`, and `src/whatsapp/messageText.js`, replacing several near-identical implementations that were previously duplicated across scraper, discovery, and messaging modules.
- JSDoc comments on the most-used exported functions across the codebase.

### Fixed
- `detectStore()` no longer classifies Magalu URLs as a supported store. It matched a `magalu` pattern with no corresponding entry in the scraper dispatch table, so a Magalu product could be added successfully but would fail confusingly on every subsequent price check. It's now rejected up front, consistent with the other genuinely-unsupported stores.
- Fixed a high-severity SSRF advisory ([GHSA-mwp4-54f8-5fhr](https://github.com/advisories/GHSA-mwp4-54f8-5fhr) and related) in a transitive dependency (`ip-address`, via `apify-client`) by updating to a patched version.

### Removed
- `src/discovery/googleShopping.js` — an alternate deal-discovery source superseded by the current store-deals-page approach and no longer referenced anywhere.
- `src/cron/index.js` and the `npm run cron` script — an orphaned parallel entry point that scheduled price checks but never actually sent WhatsApp alerts (the real scheduling lives in `src/index.js`). Kept around, it would have silently misled anyone who ran it expecting working notifications.
- Unused `ML_AFFILIATE_ID` / `MAGALU_AFFILIATE_ID` environment variables — read into config in one case, never actually used anywhere in the codebase.

[Unreleased]: https://github.com/matheusbogea74-crypto/price-bot/commits/main

# Roadmap

This is a living list of planned work and ideas under consideration — not a commitment or a timeline. Items are roughly ordered by priority within each section. Contributions toward any of these are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Planned

- **Expand test coverage.** A starter suite exists (`npm test`, Node's built-in test runner) covering pure functions in `src/utils/`, `src/products/detectStore.js`, and `src/whatsapp/messageText.js`. Not yet covered: the price-comparison business rule (`isNewLow` in `src/priceCheck/checkProduct.js`) and the discount-qualification logic in `src/discovery/runDiscovery.js` — both touch the database directly today, so testing them cleanly needs either a lightweight in-memory-DB fixture or a small refactor to separate the pure decision logic from the DB read/write.
- **Structured logging.** Replace `console.*` calls with a structured logger (e.g. `pino`, already a transitive dependency via Baileys) emitting leveled, parseable log lines — makes long-running production behavior much easier to monitor and alert on.
- **Generic store-scraper interface + registry.** Formalize the `(url) => Promise<ScrapedProduct>` shape already implicit in `src/scrapers/` as a documented interface, so adding a new store is closer to "implement this interface and register it" than "read existing files and pattern-match."
- **Deduplicate the CLI-runner boilerplate.** The `if (import.meta.url === pathToFileURL(process.argv[1]).href) { try { ... } catch { ... } }` block at the bottom of most standalone scripts (`src/scrapers/*.js`, `src/mercadolivre/*.js`, etc.) is copy-pasted rather than shared — a small `runCli(fn, usage)` helper in `src/utils/` would remove the repetition. (Shared currency parsing/formatting, delay helpers, and WhatsApp message-text extraction have already been consolidated into `src/utils/` and `src/whatsapp/messageText.js`.)

## Under consideration

- **Pluggable notification channels.** Generalize the send path (`src/whatsapp/sendAd.js`) behind an interface so alternative channels (Telegram, Discord, email) can be added without touching the business-logic layers that produce the alert content.
- **Configurable business rules.** Move currently-hardcoded constants (discount thresholds, cooldown windows, max alerts per run) from source into `.env`/config, so operators can tune behavior without editing code.
- **Multi-operator support.** Would require a real data-isolation and auth layer — a substantial architecture change, not a small addition (see [README → Positioning](README.md#positioning--who-this-is-for) for why this isn't assumed as a goal today). Worth discussing in an issue before anyone starts on it.
- **Web dashboard** for viewing tracked products and price history, as an alternative to the CLI utilities in `src/products/`.

## Explicitly not planned

- **A message queue / job runner.** The current job volume doesn't justify the operational overhead — see the [FAQ](README.md#faq). This would be reconsidered only alongside multi-operator support, which would change the volume calculus entirely.
- **Replacing SQLite with a client-server database**, for the same reason.

## Contributing to the roadmap

Have an idea not listed here? Open an issue to discuss it before starting work — see [CONTRIBUTING.md](CONTRIBUTING.md).

# Contributing to price-bot

Thanks for considering a contribution. This is a small, single-maintainer project, so the process is intentionally lightweight — but a few things will make your contribution easier to review and merge.

## Before you start

For anything beyond a small fix (typo, obvious bug), please **open an issue first** to discuss the change. This project has a specific scope and some deliberate design trade-offs (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — in particular _why_ there's no message queue and _why_ SQLite) — a quick discussion up front can save you from building something that doesn't fit the project's direction.

## Development setup

```bash
git clone https://github.com/matheusbogea74-crypto/price-bot.git
cd price-bot
npm install
cp .env.example .env
npm run init-db
```

You don't need every integration configured to work on most parts of the codebase — see [Configuration](README.md#configuration) for what's actually required (just `WHATSAPP_MY_NUMBER`) versus optional. For scraper/discovery changes, you can exercise a single store without a live database or WhatsApp connection using the standalone `scrape-*` scripts (e.g. `npm run scrape-amazon -- "<url>"`).

## Code style

- Run `npm run lint` and `npm run format` before opening a PR (`npm run lint:fix` and `npm run format` will auto-fix most issues).
- Match the existing patterns in the file/module you're touching rather than introducing a new one — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the intended shape of each layer (scrapers, ads, discovery, etc.).
- User-facing strings (WhatsApp message text, CLI output) are in Portuguese in this codebase, matching the original operator's language; code identifiers (function/variable names), comments explaining _why_ (not _what_), and documentation are in English. Please keep new code consistent with this split rather than mixing languages within one string.
- Prefer small, focused functions with a clear single responsibility over large multi-purpose ones — most existing modules follow this already.

## Tests

Run the suite with `npm test` (Node's built-in test runner, `node --test` — no extra framework dependency). Coverage is currently limited to pure, dependency-free functions (`src/utils/`, `src/products/detectStore.js`, `src/whatsapp/messageText.js`) — see [ROADMAP.md](ROADMAP.md) for what's still untested (notably the `isNewLow` business rule and the discovery-qualification logic, both of which touch the database and are a good next target).

For anything not yet covered by an automated test:

- For scraper changes, run the relevant `npm run scrape-*` script against a real URL and confirm the output shape (`title`, `price`, `currency`, `imageUrl`, `permalink`) is correct.
- For changes touching the send path, use `npm run preview-ad` (builds a message without sending) before testing an actual `npm run wa-test` send.
- For anything touching the database, run `npm run init-db` against a throwaway SQLite file and verify the schema/queries behave as expected.

If you're adding a new pure function (parsing, formatting, business-rule logic), add a test alongside it in `test/` — that's the easiest way to grow coverage incrementally. New tests should not depend on network access, a live database, or a WhatsApp connection; anything that does belongs in the manual-verification list above until the project has a proper mocking/fixture strategy for those.

## Commit / PR guidelines

- Keep pull requests focused on one change — smaller PRs get reviewed faster.
- Write commit messages that explain _why_, not just _what_ (the diff already shows what changed).
- Update relevant documentation (`README.md`, `docs/ARCHITECTURE.md`, inline comments) in the same PR as the code change it describes — don't leave docs to a follow-up.
- If your change affects environment variables, update `.env.example` and the configuration table in `README.md` too.

## Reporting bugs

Open a GitHub issue with:

- What you expected to happen vs. what actually happened
- Steps to reproduce (which script/command, with what input)
- Relevant log output (redact anything that looks like a token, phone number, or URL containing personal identifiers)

## Reporting security issues

**Do not open a public issue for security vulnerabilities.** See [SECURITY.md](SECURITY.md) for how to report those privately.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you're expected to uphold it.

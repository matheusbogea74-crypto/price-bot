# Architecture

This document explains how `price-bot` is built, why each major decision was made, and where to look when something breaks. It assumes you've read the [README](../README.md) overview first.

## Table of Contents

- [Process model](#process-model)
- [Module map](#module-map)
- [Database](#database)
- [Business rules: what counts as "worth an alert"](#business-rules-what-counts-as-worth-an-alert)
- [Scraping strategy](#scraping-strategy)
- [Ad generation](#ad-generation)
- [Scheduling ("queues")](#scheduling-queues)
- [Monitoring & logs](#monitoring--logs)
- [Failure recovery](#failure-recovery)
- [Extending the system](#extending-the-system)

## Process model

`price-bot` runs as a **single long-lived Node.js process** (`src/index.js`, started with `npm start`). There is no separate web server, worker process, or database server — everything happens inside one process:

```
┌─────────────────────────────────────────────────────────────┐
│                         src/index.js                          │
│                                                                 │
│  ┌───────────────────┐        ┌──────────────────────────┐   │
│  │  WhatsApp socket   │◄──────►│  node-cron schedules      │   │
│  │  (Baileys, one     │        │  - price check (interval) │   │
│  │  persistent conn.) │        │  - deal discovery (3x/day) │   │
│  └─────────┬──────────┘        └──────────────────────────┘   │
│            │                                                    │
│  ┌─────────▼──────────┐        ┌──────────────────────────┐   │
│  │ Live listeners       │       │  SQLite (node:sqlite)     │   │
│  │ - coupon channel      │◄────►│  products, price_history  │   │
│  │ - remote commands      │      └──────────────────────────┘   │
│  └────────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

The WhatsApp socket is established once and shared by everything that needs to send or receive a message. This matters operationally: **only one process may hold that connection at a time** (the underlying protocol session gets corrupted by concurrent use). Every one-off script in this repo that talks to WhatsApp (`wa-test`, `discover` run standalone, etc.) opens its own short-lived connection — if the main service is already running, stop it first (`systemctl stop` or equivalent) before running a standalone script that also connects.

## Module map

| Module              | Responsibility                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.js`      | Wires everything together: connects WhatsApp, registers cron jobs, attaches live listeners, owns the "paused" state                    |
| `src/config/`       | Single source of truth for all environment-derived configuration; every other module reads from `config`, never `process.env` directly |
| `src/db/`           | SQLite connection singleton + schema definition + init script                                                                          |
| `src/priceCheck/`   | The "re-check every tracked product" loop                                                                                              |
| `src/discovery/`    | The "find new deals we're not already tracking" loop — listing, verification, filtering, sending                                       |
| `src/scrapers/`     | Per-store price-extraction strategies, behind one dispatch function                                                                    |
| `src/ads/`          | Turns a price-check result into a WhatsApp message payload                                                                             |
| `src/affiliate/`    | Per-store affiliate link construction, plus an optional link-shortening step                                                           |
| `src/whatsapp/`     | Connection lifecycle (connect, reconnect, persist session) and low-level send helpers                                                  |
| `src/coupons/`      | Listens to a source WhatsApp channel, forwards cleaned-up messages                                                                     |
| `src/control/`      | Remote pause/resume/status commands, driven by the operator's own WhatsApp messages                                                    |
| `src/products/`     | CLI utilities for managing the tracked-product list                                                                                    |
| `src/mercadolivre/` | Optional official OAuth API client for one store (see [below](#scraping-strategy))                                                     |

## Database

A single SQLite file, accessed through Node's built-in `node:sqlite` module — no ORM, no migration framework, no external database process.

```sql
products (
  id, name, url UNIQUE, store,
  affiliate_url, image_url,
  active,                    -- soft-disable a product without deleting history
  created_at,
  last_discovery_ad_at        -- cooldown marker, see below
)

price_history (
  id, product_id → products.id (cascade delete),
  price, currency,
  checked_at
)
```

Every price check — whether from the scheduled loop or discovery — appends one row to `price_history`. Nothing is ever updated or deleted from this table; it's a pure, append-only log. That's deliberate: the entire "is this a new low?" business rule reduces to one query (see below), and keeping full history costs nothing at this data volume (a handful of products, checked a few times a day, indefinitely — thousands of rows a year, not millions).

`last_discovery_ad_at` exists specifically to stop the discovery loop from re-announcing the same deal every time it happens to still qualify on a later run (see [Business rules](#business-rules-what-counts-as-worth-an-alert)).

## Business rules: what counts as "worth an alert"

There are **two independent qualification paths**, because they answer two different questions.

### 1. Tracked-product price check — "did something I'm already watching get cheaper than ever?"

```
previousLowest = MIN(price) FROM price_history WHERE product_id = ?
isNewLow = currentPrice < previousLowest
```

That's the entire rule. A product is not announced for being "on sale," or for beating yesterday's price, or for any percentage threshold — only for beating **every price ever recorded for it**. This is intentionally strict: it guarantees every alert is objectively meaningful ("the best I've ever seen this at"), with no reliance on a store's own "was/now" pricing, which is easy to game with an inflated reference price.

### 2. Deal discovery — "is this new-to-me product actually worth mentioning?"

This path handles products that aren't already being tracked, sourced from a store's own "deals" page feed. It has more steps, because a store's self-reported discount badge is not trusted:

1. **List candidates** from the store's official deals page (store-reported price + discount %).
2. **Re-scrape the real price directly from the product page** — the same code path used for tracked products — to get a verified, independent number instead of trusting the feed.
3. **Compute the real discount** from the verified price against the store's stated "original" price, and require it to clear a minimum threshold (`MIN_DISCOUNT_PCT` in `src/discovery/runDiscovery.js`) — **or** accept the store's own "historical low" badge as an alternate qualifying signal, since that's a claim about the product's own price history rather than an arbitrary reference price.
4. **Optional AI relevance gate** (`src/discovery/judgeDeal.js`): if `GEMINI_API_KEY` is configured, a small LLM call judges whether the deal is the kind of thing worth surfacing — a real, popular, sensibly-priced product — versus something that technically clears the discount bar but isn't a genuine opportunity (an implausibly inflated "original" price, an obscure niche item with no general appeal, and so on). This step **fails open**: if the API key is missing, the call errors, or the response is malformed, the deal is approved by default. It's a quality filter layered on top of the hard rules above, never a hard dependency — discovery works correctly with it fully disabled.
5. **Independent price-history cross-check** against a third-party price-history site, purely informational (logged, never blocks a deal on its own) — a sanity signal for how the current price compares to a source outside the store itself.
6. **Cooldown**: before sending, each qualifying product's `last_discovery_ad_at` is checked; if it was already announced within the cooldown window (24h, `RE_AD_COOLDOWN_HOURS`), it's skipped even if it still qualifies, to avoid repeating the same alert run after run.
7. **Rank and cap**: qualifying deals are sorted by discount percentage and capped at a small number per run (`MAX_ADS_PER_RUN`) — deliberately, to keep the channel from ever feeling like spam even on a run that finds many qualifying deals. Sends are also spaced out with a randomized delay between messages, with a shorter spacing tier for very large discounts so an exceptional deal doesn't sit in a multi-minute queue behind ordinary ones.

## Scraping strategy

Different stores need different approaches, and the codebase makes this an explicit, per-store choice rather than a one-size-fits-all scraper:

- **Direct headless-browser scraping** (Playwright or a stealth-patched fork), for stores that serve normal traffic to a well-behaved automated browser.
- **Managed scraping via a cloud Actor platform** (Apify), which supplies a headless browser _behind residential-reputation IP egress_, for stores whose bot-detection is IP-reputation-based rather than (or in addition to) browser-fingerprint-based — meaning even a well-disguised headless browser gets blocked if it's connecting from a datacenter/cloud IP range, and the fix is changing the network path, not the browser fingerprint. This was discovered empirically for this project (see [Troubleshooting](../README.md#troubleshooting)): the same store, same browser configuration, was blocked from cloud server IPs and unblocked from a residential connection, regardless of how the automated browser was disguised.

Both strategies are normalized behind one dispatch function, `scrapeProduct()` in `src/scrapers/index.js`, so calling code (`priceCheck/`, `discovery/`) never needs to know which strategy a given store uses.

An **official API client exists for one store** (`src/mercadolivre/`) and is preferred where available — in practice, the specific endpoint needed for general product search/price-lookup was not accessible to a small third-party integration on that platform, so the scraping path is what's actually used in production; the API client remains in the repo for the cases it _does_ cover (fetching a known item by ID) and as a template for stores where the official API is a better fit.

## Ad generation

Two builders (`src/ads/buildAd.js` for tracked-product alerts, `src/discovery/runDiscovery.js`'s `buildDiscoveryAd` for discovered deals) both follow the same shape: headline → title → price comparison (strikethrough old price, bold new price, discount %) → optional context line (historical-low confirmation, independent price reference) → link.

The link itself goes through `src/affiliate/`:

1. Resolve the store-appropriate affiliate link (tag/query-param scheme differs per store).
2. Optionally sync that link to a companion URL-shortening service and use the short link instead — mainly to hide an unsightly affiliate query string. This step is entirely optional: if the shortener isn't configured or doesn't respond, the direct affiliate link is used and the message still sends.

## Scheduling ("queues")

There is no message queue, job runner, or worker pool in this system, by design. The entire workload is:

- One price-check pass over a small, fixed list of tracked products, on a multi-hour interval.
- One deal-discovery pass, a few times a day.
- A small number of live-event listeners (incoming WhatsApp messages) that react immediately.

`node-cron`, running inside the same process that holds the WhatsApp connection, is sufficient for this volume and avoids the operational cost of running Redis/a queue broker/a separate worker fleet for a job count measured in single digits per day. If this were adapted to track hundreds of products across many operators, that calculus would change — see [ROADMAP.md](../ROADMAP.md).

## Monitoring & logs

Logging is currently plain `console.log`/`console.warn`/`console.error`, captured by whatever process supervisor runs the service (e.g. `journalctl` under systemd). There is no structured logging, log aggregation, or metrics export yet — see [ROADMAP.md](../ROADMAP.md). In practice, each scheduled run logs a per-item result line (success/error) and a summary line (`N/M ok, E error(s), K alert(s) sent`), which is enough to `grep` for the state of any given run after the fact.

## Failure recovery

Failure isolation happens at the smallest reasonable unit in every loop:

- **Per-product, in the price-check loop**: one product's scrape failing (site markup changed, network error, upstream quota exhausted) is caught, logged, and the loop continues to the next product. A batch summary reports how many succeeded vs. failed; it never aborts the whole run.
- **Per-candidate, in discovery**: identical isolation — one candidate failing to re-verify doesn't stop evaluation of the rest.
- **Per-destination, when sending**: if a WhatsApp send fails for one recipient, it's logged and the loop continues (relevant when a message goes to more than one destination).
- **Per-integration, at the edges**: the link shortener, the AI relevance gate, and the independent price-reference check all have their own try/catch with a safe fallback (use the direct link; approve the deal; skip the informational check) — none of them can block the core alert from sending.
- **Connection-level**: the WhatsApp connection wrapper (`src/whatsapp/connectPersistent.js`) automatically reconnects on an unexpected drop, re-attaching the live listeners to the new socket. A genuine logout (not just a dropped connection) is treated as unrecoverable and exits the process, since it requires a human to re-scan a QR code.

Nothing in the scheduled loops retries automatically beyond what's described above — a failed item simply waits for the next scheduled run rather than being retried in a tight loop, which is the right trade-off for a batch job that runs every few hours anyway.

## Extending the system

**Adding a new store**: implement a function matching the `(url) => Promise<{title, price, currency, imageUrl, permalink}>` shape (see any file in `src/scrapers/`), register it in the dispatch map in `src/scrapers/index.js`, add the store name to the `CHECK` constraint in `src/db/schema.sql`, and add an affiliate-link builder in `src/affiliate/` if applicable. If the store blocks direct automated access, route it through the managed-scraping path instead of fighting the block directly (see [Scraping strategy](#scraping-strategy)).

**Adding a new notification channel**: the send path is already isolated behind `src/whatsapp/sendAd.js` — a parallel `src/telegram/sendAd.js` (for example) with the same signature, called alongside the existing one, is a small, additive change. This is on the [roadmap](../ROADMAP.md).

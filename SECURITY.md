# Security Policy

## Reporting a Vulnerability

If you find a security vulnerability in this project, **please do not open a public GitHub issue.**

Instead, report it privately using [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) feature on this repository (**Security → Report a vulnerability**), or by opening a draft security advisory.

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce it
- Any relevant logs or proof-of-concept code (with secrets/credentials redacted)

We'll acknowledge reports as soon as possible and keep you updated as the issue is addressed. This is a small, single-maintainer project without a formal SLA, but security reports are treated as a priority over other work.

## Supported Versions

This project does not follow semantic-versioned releases with long-term support branches. Security fixes are applied to the `main` branch only; please run the latest version.

## Handling of secrets

- All credentials (API tokens, WhatsApp session state, phone numbers) are configured exclusively through environment variables (`.env`, gitignored) or the gitignored `baileys_auth/` session directory — never hardcoded in source.
- If you believe a secret has been accidentally committed to this repository's history, please report it the same way as a vulnerability (see above) rather than opening a public issue, so it can be rotated/removed before wider attention is drawn to it.

## Scope and disclaimer

This project performs automated, scheduled access (web scraping and/or official APIs, depending on the store) to third-party e-commerce websites, and uses an **unofficial** WhatsApp client library ([Baileys](https://github.com/WhiskeySockets/Baileys)) rather than WhatsApp's official Business API.

A few things worth being explicit about:

- **Automated access to a website may be subject to that site's Terms of Service**, independent of the specific technique used to access it. This project does not attempt to circumvent authentication, paywalls, or access non-public data — it reads publicly visible product/price information, the same information a human visitor would see.
- **Unofficial WhatsApp client libraries operate outside WhatsApp's official Business API**, and WhatsApp's own Terms of Service govern automated use of consumer accounts. This is a well-known, widely-used category of open-source tooling ([Baileys](https://github.com/WhiskeySockets/Baileys) itself has tens of thousands of users), but it's a decision each operator makes for their own account, not something this project can make a compliance guarantee about on your behalf.
- **This is not legal advice.** If you plan to run this against a website or messaging account where Terms-of-Service compliance matters to you (e.g. a business account, a account you can't afford to lose), review the relevant terms yourself before deploying it.
- Running an instance of this project is a decision — and responsibility — you take on for your own use case and jurisdiction.

None of this is a statement that the project does anything malicious or unusual for its category of software; it's included here so anyone evaluating or deploying this code has the full picture up front, rather than discovering it later.

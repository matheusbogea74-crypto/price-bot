// Only stores with a registered scraper (see src/scrapers/index.js) belong
// here. Magalu is intentionally excluded: MAGALU_AFFILIATE_ID exists as
// forward-looking configuration, but there is no working scraper for it yet
// — matching a Magalu URL here would let a product be added that can never
// actually be checked, failing confusingly later instead of clearly now.
const STORE_PATTERNS = [
  { store: 'mercadolivre', pattern: /mercadolivre\.com|mercadolibre\.com/i },
  { store: 'amazon', pattern: /amazon\.com/i },
  { store: 'casasbahia', pattern: /casasbahia\.com/i },
  { store: 'netshoes', pattern: /netshoes\.com/i },
];

/**
 * Identifies which store a product URL belongs to. Throws if the URL doesn't
 * match any store with a registered scraper (see src/scrapers/index.js).
 */
export function detectStore(url) {
  const match = STORE_PATTERNS.find(({ pattern }) => pattern.test(url));

  if (!match) {
    throw new Error(
      `Não foi possível identificar a loja pela URL: ${url}\n` +
        'Lojas suportadas: Mercado Livre, Amazon, Casas Bahia, Netshoes.',
    );
  }

  return match.store;
}

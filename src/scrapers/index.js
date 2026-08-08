import { scrapeMercadoLivre } from './mercadolivre.js';
import { scrapeAmazon } from './amazon.js';
import { scrapeCasasBahia } from './casasbahia.js';
import { scrapeNetshoes } from './netshoes.js';

const SCRAPERS = {
  mercadolivre: scrapeMercadoLivre,
  amazon: scrapeAmazon,
  casasbahia: scrapeCasasBahia,
  netshoes: scrapeNetshoes,
};

/**
 * Dispatches to the right per-store scraping strategy and returns a
 * normalized product snapshot. This is the single entry point every caller
 * (price checks, discovery) should use — never import a store-specific
 * scraper directly, so adding a new store only requires changes here and in
 * the `SCRAPERS` map above (see docs/ARCHITECTURE.md → Extending the system).
 *
 * @param {{store: string, url: string}} product
 * @returns {Promise<{title: string, price: number, currency: string, imageUrl: string|null, permalink: string}>}
 * @throws {Error} if `product.store` has no registered scraper
 */
export async function scrapeProduct(product) {
  const scraper = SCRAPERS[product.store];

  if (!scraper) {
    throw new Error(`Loja "${product.store}" não tem scraper suportado ainda.`);
  }

  return scraper(product.url);
}

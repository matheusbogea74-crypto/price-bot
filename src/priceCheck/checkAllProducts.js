import { pathToFileURL } from 'node:url';
import { getDb } from '../db/index.js';
import { checkProduct } from './checkProduct.js';
import { sleep, randomDelayMs } from '../utils/delay.js';

const MIN_BETWEEN_PRODUCTS_MS = 3000;
const MAX_BETWEEN_PRODUCTS_MS = 8000;

/**
 * Runs one price-check pass over every active tracked product, in sequence,
 * with a randomized delay between each to avoid a bot-like burst pattern.
 * Each product is isolated with its own try/catch — one failure never aborts
 * the batch, it's just recorded as an error result.
 *
 * @returns {Promise<{results: object[], summary: {total: number, ok: number, errors: number, newLows: object[]}}>}
 */
export async function checkAllProducts() {
  const db = getDb();
  const products = db.prepare('SELECT * FROM products WHERE active = 1').all();

  const results = [];

  for (const [index, product] of products.entries()) {
    if (index > 0) {
      await sleep(randomDelayMs(MIN_BETWEEN_PRODUCTS_MS, MAX_BETWEEN_PRODUCTS_MS));
    }

    try {
      const result = await checkProduct(product);
      results.push({ ok: true, ...result });

      const priceStr = `R$ ${result.price.toFixed(2)}`;
      if (result.isNewLow) {
        console.log(
          `[NOVO MENOR PREÇO] #${product.id} ${result.title} — ${priceStr} (antes: R$ ${result.previousLowest.toFixed(2)})`,
        );
      } else if (result.isFirstCheck) {
        console.log(`[PRIMEIRA CHECAGEM] #${product.id} ${result.title} — ${priceStr}`);
      } else {
        console.log(
          `[OK] #${product.id} ${result.title} — ${priceStr} (menor histórico: R$ ${result.previousLowest.toFixed(2)})`,
        );
      }
    } catch (err) {
      results.push({ ok: false, product, error: err.message });
      console.error(`[ERRO] #${product.id} ${product.name} — ${err.message}`);
    }
  }

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.ok).length,
    errors: results.filter((r) => !r.ok).length,
    newLows: results.filter((r) => r.ok && r.isNewLow),
  };

  return { results, summary };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { summary } = await checkAllProducts();
  console.log(
    `\nResumo: ${summary.ok}/${summary.total} ok, ${summary.errors} erro(s), ${summary.newLows.length} novo(s) menor preço.`,
  );
}

import { getDb } from '../db/index.js';
import { scrapeProduct } from '../scrapers/index.js';

/**
 * Scrapes a single product's current price, records it in `price_history`,
 * and reports whether it's a new all-time low — the core business rule this
 * whole project exists to evaluate (see docs/ARCHITECTURE.md → Business
 * rules). Always writes a history row, even when the price didn't change,
 * since `price_history` is an append-only log, not a "current state" table.
 *
 * @param {{id: number, store: string, url: string}} product
 * @returns {Promise<{product: object, title: string, price: number, currency: string, imageUrl: string|null, previousLowest: number|null, isNewLow: boolean, isFirstCheck: boolean}>}
 */
export async function checkProduct(product) {
  const db = getDb();

  const previousLowestRow = db
    .prepare('SELECT MIN(price) AS lowest FROM price_history WHERE product_id = @productId')
    .get({ productId: product.id });
  const previousLowest = previousLowestRow.lowest;

  const result = await scrapeProduct(product);

  db.prepare('INSERT INTO price_history (product_id, price, currency) VALUES (@productId, @price, @currency)').run({
    productId: product.id,
    price: result.price,
    currency: result.currency,
  });

  if (result.imageUrl) {
    db.prepare('UPDATE products SET image_url = @imageUrl WHERE id = @productId').run({
      productId: product.id,
      imageUrl: result.imageUrl,
    });
  }

  const isNewLow = previousLowest !== null && result.price < previousLowest;
  const isFirstCheck = previousLowest === null;

  return {
    product,
    title: result.title,
    price: result.price,
    currency: result.currency,
    imageUrl: result.imageUrl,
    previousLowest,
    isNewLow,
    isFirstCheck,
  };
}

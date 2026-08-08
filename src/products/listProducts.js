import { getDb } from '../db/index.js';

const db = getDb();

const products = db
  .prepare(
    `SELECT
       p.id,
       p.name,
       p.store,
       p.url,
       p.active,
       MIN(h.price) AS lowest_price,
       (SELECT price FROM price_history WHERE product_id = p.id ORDER BY checked_at DESC LIMIT 1) AS last_price
     FROM products p
     LEFT JOIN price_history h ON h.product_id = p.id
     GROUP BY p.id
     ORDER BY p.id`,
  )
  .all();

if (products.length === 0) {
  console.log('Nenhum produto cadastrado ainda.');
  process.exit(0);
}

for (const p of products) {
  const status = p.active ? 'ativo' : 'inativo';
  const lastPrice = p.last_price != null ? `R$ ${p.last_price.toFixed(2)}` : 'sem histórico';
  const lowestPrice = p.lowest_price != null ? `R$ ${p.lowest_price.toFixed(2)}` : '—';
  console.log(
    `#${p.id} [${p.store}] (${status}) ${p.name}\n  último: ${lastPrice} | menor histórico: ${lowestPrice}\n  ${p.url}`,
  );
}

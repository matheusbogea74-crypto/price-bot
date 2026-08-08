import { getDb } from '../db/index.js';

const [, , productId, affiliateUrl] = process.argv;

if (!productId || !affiliateUrl) {
  console.error('Uso: npm run set-affiliate-link -- <ID_DO_PRODUTO> "URL_DE_AFILIADO"');
  process.exit(1);
}

const db = getDb();
const result = db
  .prepare('UPDATE products SET affiliate_url = @affiliateUrl WHERE id = @id')
  .run({ id: Number(productId), affiliateUrl });

if (result.changes === 0) {
  console.error(`Nenhum produto encontrado com id ${productId}.`);
  process.exit(1);
}

console.log(`Link de afiliado salvo pro produto #${productId}.`);

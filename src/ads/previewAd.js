import { pathToFileURL } from 'node:url';
import { getDb } from '../db/index.js';
import { checkProduct } from '../priceCheck/checkProduct.js';
import { buildAd } from './buildAd.js';

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const productId = process.argv[2];

  if (!productId) {
    console.error('Uso: npm run preview-ad -- <ID_DO_PRODUTO>');
    process.exit(1);
  }

  const product = getDb()
    .prepare('SELECT * FROM products WHERE id = @id')
    .get({ id: Number(productId) });

  if (!product) {
    console.error(`Nenhum produto encontrado com id ${productId}.`);
    process.exit(1);
  }

  const result = await checkProduct(product);

  if (!result.isNewLow) {
    console.log(
      result.isFirstCheck
        ? '[nota] Esta é a primeira checagem deste produto — ainda não há histórico pra comparar.'
        : `[nota] O preço atual (R$ ${result.price.toFixed(2)}) NÃO é um novo menor histórico ` +
            `(menor já registrado: R$ ${result.previousLowest.toFixed(2)}). Gerando prévia mesmo assim.`,
    );
    console.log();
  }

  const ad = await buildAd(result);

  console.log('--- TEXTO DO ANÚNCIO ---\n');
  console.log(ad.text);
  console.log('\n--- IMAGEM ---');
  console.log(ad.imageUrl);
}

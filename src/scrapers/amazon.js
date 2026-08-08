import { pathToFileURL } from 'node:url';
import { withPatchrightPage } from './browserPatchright.js';
import { parseBRLPrice } from '../utils/currency.js';

export async function scrapeAmazon(url) {
  return withPatchrightPage(async (page) => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForSelector('#productTitle', { timeout: 15000 });

    const title = await page
      .locator('#productTitle')
      .first()
      .textContent()
      .then((t) => t?.trim());

    const priceText = await page.locator('.a-price .a-offscreen').first().textContent();

    const imageUrl = await page
      .locator('#landingImage')
      .first()
      .getAttribute('src')
      .catch(() => null);

    if (!title || !priceText) {
      throw new Error('Não foi possível extrair título/preço da página. A estrutura do site pode ter mudado.');
    }

    const price = parseBRLPrice(priceText);

    if (!(price > 0)) {
      throw new Error(
        `Preço extraído inválido ("${priceText}" -> ${price}). Descartando resultado em vez de reportar preço quebrado.`,
      );
    }

    return {
      title,
      price,
      currency: 'BRL',
      imageUrl,
      permalink: url,
    };
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = process.argv[2];

  if (!input) {
    console.error('Uso: npm run scrape-amazon -- "URL_DO_PRODUTO"');
    process.exit(1);
  }

  try {
    const result = await scrapeAmazon(input);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

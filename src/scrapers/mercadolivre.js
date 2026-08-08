import { pathToFileURL } from 'node:url';
import { scrapeViaApifyActor } from './apifyActor.js';

// Migrado do scraping local (Playwright direto) pro Actor da Apify na Fase 15:
// rodando de um servidor (IP de datacenter, mesmo brasileiro), o ML bloqueia
// igual bloqueava a Casas Bahia/Netshoes — resolvido com o mesmo proxy residencial.
export async function scrapeMercadoLivre(url) {
  return scrapeViaApifyActor(url, 'Mercado Livre');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = process.argv[2];

  if (!input) {
    console.error('Uso: npm run scrape-ml -- "URL_DO_PRODUTO"');
    process.exit(1);
  }

  try {
    const result = await scrapeMercadoLivre(input);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

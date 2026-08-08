import { pathToFileURL } from 'node:url';
import { scrapeViaApifyActor } from './apifyActor.js';

export async function scrapeNetshoes(url) {
  return scrapeViaApifyActor(url, 'Netshoes');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = process.argv[2];

  if (!input) {
    console.error('Uso: npm run scrape-netshoes -- "URL_DO_PRODUTO"');
    process.exit(1);
  }

  try {
    const result = await scrapeNetshoes(input);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

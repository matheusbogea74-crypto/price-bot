import { pathToFileURL } from 'node:url';
import { config } from '../config/index.js';
import { refreshAccessToken } from './refreshAccessToken.js';
import { extractItemId } from './extractItemId.js';

export async function getItem(urlOrId) {
  const itemId = extractItemId(urlOrId);
  let { accessToken } = config.mercadolivre;

  let response = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) {
    accessToken = await refreshAccessToken();
    response = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Erro ao buscar item ${itemId}: ${JSON.stringify(data)}`);
  }

  return {
    id: data.id,
    title: data.title,
    price: data.price,
    currency: data.currency_id,
    imageUrl: data.pictures?.[0]?.url ?? data.thumbnail,
    permalink: data.permalink,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = process.argv[2];

  if (!input) {
    console.error('Uso: npm run ml-get-item -- "URL_OU_ID_DO_PRODUTO"');
    process.exit(1);
  }

  try {
    const item = await getItem(input);
    console.log(JSON.stringify(item, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

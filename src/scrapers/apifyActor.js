import { ApifyClient } from 'apify-client';
import { config } from '../config/index.js';

export async function scrapeViaApifyActor(url, storeLabel) {
  const { token, casasBahiaActorId } = config.apify;

  if (!token || !casasBahiaActorId) {
    throw new Error('APIFY_API_TOKEN e/ou CASASBAHIA_APIFY_ACTOR_ID não configurados no .env');
  }

  const client = new ApifyClient({ token });
  const run = await client.actor(casasBahiaActorId).call({ url });
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  const result = items[0];

  if (!result || result.blocked || result.error || !result.title || !result.price) {
    throw new Error(
      `Não foi possível extrair título/preço da ${storeLabel} via Actor. Resultado: ${JSON.stringify(result)}`,
    );
  }

  return {
    title: result.title,
    price: result.price,
    currency: result.currency ?? 'BRL',
    imageUrl: result.imageUrl ?? null,
    permalink: url,
  };
}

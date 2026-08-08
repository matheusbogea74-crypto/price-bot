import { config } from '../config/index.js';

export function toAmazonAffiliateLink(url) {
  const { affiliateTag } = config.amazon;

  if (!affiliateTag) {
    throw new Error('AMAZON_AFFILIATE_TAG não configurado no .env');
  }

  const parsed = new URL(url);
  parsed.searchParams.set('tag', affiliateTag);

  return parsed.toString();
}

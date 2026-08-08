import { toAmazonAffiliateLink } from './amazon.js';
import { toMercadoLivreAffiliateLink } from './mercadolivre.js';

/**
 * Resolves the affiliate link to use for a product, per the rules of its
 * store: Amazon/Mercado Livre construct one from a tag/account parameters
 * (with a manually-set `affiliate_url` taking priority for Mercado Livre);
 * Casas Bahia/Netshoes require a manually-set `affiliate_url` and fall back
 * to the plain URL (with a warning) if none is set, rather than blocking.
 *
 * @param {{store: string, url: string, affiliate_url?: string}} product
 * @returns {string}
 * @throws {Error} if the store has no affiliate-link logic at all
 */
export function getAffiliateLink(product) {
  if (product.store === 'amazon') {
    return toAmazonAffiliateLink(product.url);
  }

  if (product.store === 'mercadolivre') {
    // affiliate_url manual (setAffiliateLink) continua tendo prioridade, caso
    // exista um caso específico que precise de link diferente do padrão da conta.
    if (product.affiliate_url) return product.affiliate_url;
    return toMercadoLivreAffiliateLink(product.url);
  }

  if (product.store === 'casasbahia' || product.store === 'netshoes') {
    if (!product.affiliate_url) {
      console.warn(
        `[aviso] Produto #${product.id} (${product.name}) não tem link de afiliado da ${product.store} salvo — ` +
          'usando URL normal sem comissão.',
      );
      return product.url;
    }
    return product.affiliate_url;
  }

  throw new Error(`Loja "${product.store}" não tem lógica de link de afiliado.`);
}

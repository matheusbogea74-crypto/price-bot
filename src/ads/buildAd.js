import { getShortLink, STORE_LABELS } from '../affiliate/shortLink.js';
import { formatBRLPrice } from '../utils/currency.js';

/**
 * Builds the WhatsApp message payload for a tracked product that just hit a
 * new all-time-low price (see `isNewLow` in `src/priceCheck/checkProduct.js`).
 *
 * @param {object} checkResult - the result object returned by `checkProduct()`
 * @returns {Promise<{text: string, imageUrl: string|null}>}
 */
export async function buildAd(checkResult) {
  const { product, title, price, previousLowest, imageUrl } = checkResult;

  const { url: link, usedRedirector } = await getShortLink(product);
  const discountPct = previousLowest ? Math.round((1 - price / previousLowest) * 100) : null;

  const lines = ['🔥 *MENOR PREÇO HISTÓRICO* 🔥', '', title];

  if (previousLowest) {
    lines.push('', `~De R$ ${formatBRLPrice(previousLowest)}~ por *R$ ${formatBRLPrice(price)}*`);
    if (discountPct > 0) {
      lines.push(`(${discountPct}% de queda em relação ao menor preço anterior)`);
    }
  } else {
    lines.push('', `*R$ ${formatBRLPrice(price)}*`);
  }

  // Quando o link passa pelo redirecionador, a loja some da URL — declara no
  // texto pra manter transparente de onde vem a oferta.
  if (usedRedirector) {
    lines.push(`🛒 Promoção na ${STORE_LABELS[product.store] ?? product.store}`);
  }

  lines.push('', `👉 ${link}`);

  return {
    text: lines.join('\n'),
    imageUrl: imageUrl ?? product.image_url ?? null,
  };
}

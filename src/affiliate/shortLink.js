import { getAffiliateLink } from './index.js';
import { config } from '../config/index.js';

// ML fica de fora do redirecionador de propósito: o link já é razoavelmente
// limpo (domínio mercadolivre.com.br + matt_word/matt_tool), o usuário prefere
// ver a loja de verdade na URL. Só passa pelo redirecionador quem precisa
// esconder algo feio (ex: Amazon com "?tag=SEU-TAG-AFILIADO").
const STORES_WITHOUT_REDIRECTOR = new Set(['mercadolivre']);

export const STORE_LABELS = {
  amazon: 'Amazon',
  mercadolivre: 'Mercado Livre',
  casasbahia: 'Casas Bahia',
  netshoes: 'Netshoes',
};

/**
 * Sincroniza o link de afiliado real com o redirecionador (price-bot-redirector)
 * e devolve o link curto (https://SEUDOMINIO/p/ID) pra usar no anúncio, escondendo
 * a URL feia da loja. Se o redirecionador não estiver configurado ou não responder,
 * cai de volta pro link de afiliado normal — nunca bloqueia o envio do anúncio.
 *
 * Devolve também `usedRedirector`, pra quem monta o anúncio saber se precisa
 * declarar o nome da loja no texto (já que o link deixa de mostrar isso).
 */
export async function getShortLink(product) {
  const realLink = getAffiliateLink(product);

  if (STORES_WITHOUT_REDIRECTOR.has(product.store)) {
    return { url: realLink, usedRedirector: false };
  }

  const { baseUrl, syncSecret } = config.redirector;

  if (!baseUrl || !syncSecret) {
    return { url: realLink, usedRedirector: false };
  }

  try {
    const response = await fetch(`${baseUrl}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${syncSecret}`,
      },
      body: JSON.stringify({ id: product.id, url: realLink }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Redirecionador respondeu ${response.status}`);
    }

    return { url: `${baseUrl}/p/${product.id}`, usedRedirector: true };
  } catch (err) {
    console.warn(`[aviso] Falha ao sincronizar com o redirecionador (${err.message}) — usando link direto.`);
    return { url: realLink, usedRedirector: false };
  }
}

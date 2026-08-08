import { config } from '../config/index.js';

/**
 * O link de afiliado do ML não é gerado por produto — é um par fixo de
 * identificadores da conta (matt_word + matt_tool) que funciona colado em
 * qualquer URL de produto, igual à tag da Amazon. Descoberto resolvendo um
 * link de afiliado de exemplo gerado manualmente (mercadolivre.com.br/afiliados).
 */
export function toMercadoLivreAffiliateLink(url) {
  const { mattWord, mattTool } = config.mercadolivre;

  if (!mattWord || !mattTool) {
    throw new Error('ML_MATT_WORD e/ou ML_MATT_TOOL não configurados no .env');
  }

  const parsed = new URL(url);
  parsed.searchParams.set('matt_word', mattWord);
  parsed.searchParams.set('matt_tool', mattTool);

  return parsed.toString();
}

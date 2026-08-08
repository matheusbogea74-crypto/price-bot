import { config } from '../config/index.js';

// Frases que só fazem sentido pra quem tá lendo como afiliado (te mandando
// divulgar), não pro consumidor final que vai receber o anúncio.
const AFFILIATE_ONLY_PATTERNS = [
  /recomende agora/i,
  /fature alto/i,
  /compartilhe (este|esse) link/i,
  /divulgue/i,
  /ganhe comiss(ã|a)o/i,
];

function extractLinks(text) {
  const matches = text.match(/https?:\/\/\S+/g) ?? [];
  return [...new Set(matches)];
}

function cleanDescription(text) {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/https?:\/\//i.test(trimmed)) return false; // link vai separado, no final (a linha toda pode ter emoji antes, tipo "🔗 https://...")
      if (AFFILIATE_ONLY_PATTERNS.some((p) => p.test(trimmed))) return false;
      return true;
    })
    .join('\n')
    .trim();
}

export function buildCouponAd(rawText) {
  const links = extractLinks(rawText);
  const description = cleanDescription(rawText);

  const lines = ['🎟️ *CUPOM MERCADO LIVRE* 🎟️', '', description || rawText.trim()];
  if (links[0]) lines.push('', `👉 ${links[0]}`);

  return {
    text: lines.join('\n'),
    imageUrl: config.coupons.logoImageUrl ?? null,
  };
}

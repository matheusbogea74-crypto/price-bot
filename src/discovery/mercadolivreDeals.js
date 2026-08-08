import { withStealthPage } from '../scrapers/browser.js';

function parseReais(ariaLabel) {
  if (!ariaLabel) return null;
  const match = ariaLabel.match(/(\d+)\s*reais(?:\s*com\s*(\d+)\s*centavos?)?/i);
  if (!match) return null;
  const reais = Number(match[1]);
  const centavos = match[2] ? Number(match[2]) : 0;
  return reais + centavos / 100;
}

/**
 * Lista ofertas direto da página oficial de ofertas do Mercado Livre
 * (mercadolivre.com.br/ofertas) — já vem com desconto %, preço "antes"/"agora"
 * e o link do produto, sem precisar de fonte externa (Google Shopping).
 */
export async function listMercadoLivreDeals({ maxItems = 20 } = {}) {
  return withStealthPage(async (page) => {
    await page.goto('https://www.mercadolivre.com.br/ofertas', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(4000);

    const cards = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('.poly-card.poly-card--grid-card'));
      return els.map((c) => {
        const link = c.querySelector('a.poly-component__title');
        const badge = c.querySelector('.poly-component__poly-label')?.textContent?.trim() ?? null;
        const currentEl = c.querySelector('.poly-price__current .andes-money-amount');
        const previousEl = c.querySelector('.poly-price__labels .andes-money-amount--previous');
        const discountEl = c.querySelector('.polylabel-pill');
        return {
          title: link?.textContent?.trim() ?? null,
          href: link?.href ?? null,
          badge,
          currentAriaLabel: currentEl?.getAttribute('aria-label') ?? null,
          previousAriaLabel: previousEl?.getAttribute('aria-label') ?? null,
          discountText: discountEl?.textContent?.trim() ?? null,
        };
      });
    });

    const deals = [];
    for (const card of cards) {
      if (!card.title || !card.href || !card.currentAriaLabel) continue;

      const currentPrice = parseReais(card.currentAriaLabel);
      const originalPrice = parseReais(card.previousAriaLabel);
      const discountMatch = card.discountText?.match(/(\d+)%/);
      const discountPct = discountMatch ? Number(discountMatch[1]) : null;

      if (!currentPrice) continue;

      deals.push({
        title: card.title,
        storeUrl: card.href.split('#')[0],
        store: 'mercadolivre',
        badge: card.badge,
        currentPrice,
        originalPrice,
        discountPct,
      });
    }

    deals.sort((a, b) => (b.discountPct ?? 0) - (a.discountPct ?? 0));
    return deals.slice(0, maxItems);
  });
}

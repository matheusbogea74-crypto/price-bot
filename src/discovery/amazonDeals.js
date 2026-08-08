import { withPatchrightPage } from '../scrapers/browserPatchright.js';
import { parseBRLPrice } from '../utils/currency.js';

/**
 * Lista ofertas direto da página oficial de ofertas da Amazon
 * (amazon.com.br/deals) — já vem com desconto %, preço "de"/"por" e às vezes
 * o selo "Menor preço em N dias" (sinal próprio da Amazon de mínima histórica).
 */
export async function listAmazonDeals({ maxItems = 20 } = {}) {
  return withPatchrightPage(async (page) => {
    await page.goto('https://www.amazon.com.br/deals', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    const cards = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[class*="ProductCard-module__card_"]'));
      return els.map((c) => {
        const link = c.querySelector('a[href*="/dp/"]');
        const img = c.querySelector('img');
        return {
          href: link?.href ?? null,
          title: img?.getAttribute('alt') ?? null,
          fullText: c.textContent ?? '',
        };
      });
    });

    const seen = new Set();
    const deals = [];

    for (const card of cards) {
      if (!card.href || !card.title) continue;

      const cleanUrl = card.href.split('?')[0];
      if (seen.has(cleanUrl)) continue;
      seen.add(cleanUrl);

      const discountMatch = card.fullText.match(/(\d+)%\s*off/i);
      const currentMatch = card.fullText.match(/(?:Preço da Oferta|Com oferta especial):\s*R\$\s*([\d.,]+)/i);
      const originalMatch = card.fullText.match(/De:\s*R\$\s*([\d.,]+)/i);
      const lowestInDaysMatch = card.fullText.match(/Menor preço em (\d+) dias/i);

      const currentPrice = currentMatch ? parseBRLPrice(currentMatch[0]) : null;
      if (!currentPrice) continue;

      deals.push({
        title: card.title,
        storeUrl: cleanUrl,
        store: 'amazon',
        discountPct: discountMatch ? Number(discountMatch[1]) : null,
        currentPrice,
        originalPrice: originalMatch ? parseBRLPrice(originalMatch[0]) : null,
        isHistoricalLow: Boolean(lowestInDaysMatch),
        historicalLowDays: lowestInDaysMatch ? Number(lowestInDaysMatch[1]) : null,
      });
    }

    deals.sort((a, b) => (b.discountPct ?? 0) - (a.discountPct ?? 0));
    return deals.slice(0, maxItems);
  });
}

import { chromium } from 'patchright';

function extractBalancedArray(html, marker) {
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;

  const start = html.indexOf('[', markerIdx);
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < html.length; i++) {
    if (html[i] === '[') depth++;
    else if (html[i] === ']') {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Busca um produto no Zoom pelo título, abre a página dele e extrai o histórico
 * diário de preço (últimos ~40 dias, JSON já embutido no HTML da página) pra
 * calcular a mínima histórica entre lojas — usado como referência independente
 * pra validar se um "desconto" achado no Google Shopping é real ou inflado.
 */
export async function validateOnZoom(title) {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    viewport: null,
  });

  try {
    const page = await context.newPage();
    const searchUrl = `https://www.zoom.com.br/search?q=${encodeURIComponent(title)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

    const searchHtml = await page.content();
    const productUrlMatch = searchHtml.match(/"url":"(https:\/\/www\.zoom\.com\.br\/[^"]+)"/);
    if (!productUrlMatch) {
      return { matched: false, reason: 'Nenhum produto encontrado na busca do Zoom.' };
    }
    const zoomProductUrl = productUrlMatch[1];

    await page.goto(zoomProductUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

    const productHtml = await page.content();
    const daysArrayText = extractBalancedArray(productHtml, '"priceHistory":{"isFetching"');
    if (!daysArrayText) {
      return { matched: true, zoomProductUrl, zoomMinPrice: null, reason: 'Sem histórico de preço disponível.' };
    }

    let days;
    try {
      days = JSON.parse(daysArrayText);
    } catch {
      return { matched: true, zoomProductUrl, zoomMinPrice: null, reason: 'Histórico de preço em formato inesperado.' };
    }

    const prices = days.map((d) => d.price).filter((p) => typeof p === 'number' && p > 0);
    if (prices.length === 0) {
      return { matched: true, zoomProductUrl, zoomMinPrice: null, reason: 'Histórico de preço vazio.' };
    }

    return {
      matched: true,
      zoomProductUrl,
      zoomMinPrice: Math.min(...prices),
      sampleSize: prices.length,
    };
  } finally {
    await context.close();
  }
}

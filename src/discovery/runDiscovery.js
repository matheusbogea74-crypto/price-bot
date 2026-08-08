import { pathToFileURL } from 'node:url';
import { getDb } from '../db/index.js';
import { scrapeProduct } from '../scrapers/index.js';
import { listMercadoLivreDeals } from './mercadolivreDeals.js';
import { listAmazonDeals } from './amazonDeals.js';
import { validateOnZoom } from './zoomValidate.js';
import { judgeDeal } from './judgeDeal.js';
import { getShortLink, STORE_LABELS } from '../affiliate/shortLink.js';
import { sendAd } from '../whatsapp/sendAd.js';
import { config } from '../config/index.js';
import { sleep, randomDelayMs } from '../utils/delay.js';
import { formatBRLPrice } from '../utils/currency.js';

const MIN_DISCOUNT_PCT = 40;
const MAX_ADS_PER_RUN = 3;
const SUPER_DEAL_DISCOUNT_PCT = 60;
const MIN_DELAY_MS = 8 * 60 * 1000;
const MAX_DELAY_MS = 10 * 60 * 1000;
const SUPER_DEAL_MIN_DELAY_MS = 1 * 60 * 1000;
const SUPER_DEAL_MAX_DELAY_MS = 2 * 60 * 1000;
const RE_AD_COOLDOWN_HOURS = 24;

async function buildDiscoveryAd({
  product,
  title,
  price,
  originalPrice,
  discountPct,
  isHistoricalLow,
  zoomMinPrice,
  imageUrl,
}) {
  const { url: link, usedRedirector } = await getShortLink(product);

  const lines = ['🔥 *OFERTA ENCONTRADA* 🔥', '', title];

  if (originalPrice) {
    lines.push('', `~De R$ ${formatBRLPrice(originalPrice)}~ por *R$ ${formatBRLPrice(price)}*`);
    if (discountPct) lines.push(`(${discountPct}% de desconto)`);
  } else {
    lines.push('', `*R$ ${formatBRLPrice(price)}*`);
  }

  if (isHistoricalLow) lines.push('📉 A própria loja confirma: menor preço em meses.');
  if (zoomMinPrice) lines.push(`Referência independente (Zoom, ~40 dias): R$ ${formatBRLPrice(zoomMinPrice)}`);

  if (usedRedirector) {
    lines.push(`🛒 Promoção na ${STORE_LABELS[product.store] ?? product.store}`);
  }

  lines.push('', `👉 ${link}`);

  return { text: lines.join('\n'), imageUrl: imageUrl ?? product.image_url ?? null };
}

function upsertProduct(db, { name, url, store }) {
  const existing = db.prepare('SELECT * FROM products WHERE url = @url').get({ url });
  if (existing) return existing;

  const result = db
    .prepare('INSERT INTO products (name, url, store) VALUES (@name, @url, @store)')
    .run({ name, url, store });

  return db.prepare('SELECT * FROM products WHERE id = @id').get({ id: result.lastInsertRowid });
}

function wasRecentlyAdvertised(db, productId) {
  const row = db.prepare('SELECT last_discovery_ad_at FROM products WHERE id = @id').get({ id: productId });
  if (!row?.last_discovery_ad_at) return false;

  const hoursSince = (Date.now() - new Date(`${row.last_discovery_ad_at}Z`).getTime()) / (60 * 60 * 1000);
  return hoursSince < RE_AD_COOLDOWN_HOURS;
}

function markAdvertised(db, productId) {
  db.prepare("UPDATE products SET last_discovery_ad_at = datetime('now') WHERE id = @id").run({ id: productId });
}

/**
 * Runs one full deal-discovery pass: lists candidates from each store's deals
 * page, re-verifies the real price on the product page, filters by discount
 * threshold and the optional AI relevance gate, then sends the best-ranked
 * qualifying deals (up to `MAX_ADS_PER_RUN`) over WhatsApp.
 *
 * @param {object} options
 * @param {import('@whiskeysockets/baileys').WASocket} options.sock - an already-connected WhatsApp socket (this
 *   function does not manage the connection lifecycle itself — see the CLI runner below for a standalone example)
 * @param {number} [options.maxPerStore] - max candidates to pull from each store's deals feed
 * @param {string[]} [options.extraDestinationJids] - additional WhatsApp JIDs to send alongside the configured operator number
 * @returns {Promise<{stats: object, sent: number}>}
 */
export async function runDiscovery({ sock, maxPerStore = 15, extraDestinationJids = [] }) {
  const db = getDb();
  const qualifyingDeals = [];

  const stats = { candidatesFound: 0, scraped: 0, scrapeErrors: 0, realDeals: 0 };

  console.log('\n=== Buscando ofertas oficiais no Mercado Livre e na Amazon ===');
  const [mlDeals, amazonDeals] = await Promise.all([
    listMercadoLivreDeals({ maxItems: maxPerStore }).catch((err) => {
      console.warn(`Falha ao listar ofertas do ML: ${err.message}`);
      return [];
    }),
    listAmazonDeals({ maxItems: maxPerStore }).catch((err) => {
      console.warn(`Falha ao listar ofertas da Amazon: ${err.message}`);
      return [];
    }),
  ]);

  const candidates = [...mlDeals, ...amazonDeals];
  stats.candidatesFound = candidates.length;
  console.log(`Candidatos: ${mlDeals.length} do ML, ${amazonDeals.length} da Amazon.`);

  for (const deal of candidates) {
    console.log(`\n--- ${deal.title} (${deal.store}) ---`);
    console.log(
      `Loja: R$ ${deal.currentPrice}${deal.originalPrice ? ` (de R$ ${deal.originalPrice})` : ''}${
        deal.discountPct ? ` — ${deal.discountPct}% off` : ''
      }${deal.isHistoricalLow ? ' — loja marca como menor preço histórico' : ''}`,
    );

    let scraped;
    try {
      scraped = await scrapeProduct({ store: deal.store, url: deal.storeUrl });
      stats.scraped++;
    } catch (err) {
      console.warn(`Falha ao confirmar preço real: ${err.message}`);
      stats.scrapeErrors++;
      continue;
    }

    if (!(scraped.price > 0)) {
      console.warn(`Preço confirmado inválido (${scraped.price}) — descartando.`);
      stats.scrapeErrors++;
      continue;
    }

    console.log(`Preço confirmado agora: R$ ${scraped.price} — "${scraped.title}"`);

    const realDiscountPct = deal.originalPrice ? Math.round((1 - scraped.price / deal.originalPrice) * 100) : null;
    const isWorthIt = (realDiscountPct !== null && realDiscountPct >= MIN_DISCOUNT_PCT) || deal.isHistoricalLow;

    if (!isWorthIt) {
      console.log(
        `Não vale a pena (desconto real ${realDiscountPct ?? '?'}%, abaixo do mínimo de ${MIN_DISCOUNT_PCT}%, sem selo de menor preço) — pulando.`,
      );
      continue;
    }

    const product = upsertProduct(db, { name: scraped.title, url: deal.storeUrl, store: deal.store });

    if (wasRecentlyAdvertised(db, product.id)) {
      console.log(`Já anunciado nas últimas ${RE_AD_COOLDOWN_HOURS}h — pulando pra não repetir.`);
      continue;
    }

    const judged = await judgeDeal({
      title: scraped.title,
      store: deal.store,
      currentPrice: scraped.price,
      originalPrice: deal.originalPrice,
      discountPct: realDiscountPct ?? deal.discountPct,
    });
    if (!judged.approved) {
      console.log(`🤖 IA rejeitou o anúncio (${judged.reason}) — pulando.`);
      continue;
    }

    const zoomResult = await validateOnZoom(scraped.title).catch(() => ({ matched: false }));
    if (zoomResult.matched && zoomResult.zoomMinPrice) {
      console.log(`Referência Zoom: mínima histórica R$ ${zoomResult.zoomMinPrice} (informativo, não bloqueia).`);
    }

    console.log(
      `✅ Vale a pena (desconto real ${realDiscountPct ?? '?'}%${deal.isHistoricalLow ? ', menor preço histórico confirmado pela loja' : ''}). IA: ${judged.reason}`,
    );
    stats.realDeals++;

    db.prepare('INSERT INTO price_history (product_id, price, currency) VALUES (@productId, @price, @currency)').run({
      productId: product.id,
      price: scraped.price,
      currency: scraped.currency,
    });

    if (scraped.imageUrl) {
      db.prepare('UPDATE products SET image_url = @imageUrl WHERE id = @productId').run({
        productId: product.id,
        imageUrl: scraped.imageUrl,
      });
    }

    // Registra no banco (histórico) independente do limite de envio — o corte
    // pro WhatsApp acontece depois, priorizando os maiores descontos.
    qualifyingDeals.push({
      rankScore: realDiscountPct ?? deal.discountPct ?? 0,
      product,
      title: scraped.title,
      price: scraped.price,
      originalPrice: deal.originalPrice,
      discountPct: realDiscountPct ?? deal.discountPct,
      isHistoricalLow: deal.isHistoricalLow,
      zoomMinPrice: zoomResult.matched ? zoomResult.zoomMinPrice : null,
      imageUrl: scraped.imageUrl,
    });
  }

  console.log(`\n=== Resumo ===`);
  console.log(
    `${stats.candidatesFound} candidato(s), ${stats.scraped} confirmado(s) com sucesso (${stats.scrapeErrors} erro(s)), ${stats.realDeals} oferta(s) real(is) registrada(s) no banco.`,
  );

  if (qualifyingDeals.length === 0) {
    console.log('Nenhuma oferta validada — nada será enviado no WhatsApp.');
    return { stats, sent: 0 };
  }

  qualifyingDeals.sort((a, b) => b.rankScore - a.rankScore);
  const toSend = qualifyingDeals.slice(0, MAX_ADS_PER_RUN);
  console.log(
    `Enviando os ${toSend.length} melhor(es) desconto(s) de ${qualifyingDeals.length} oferta(s) válida(s) (limite de ${MAX_ADS_PER_RUN} por execução).`,
  );

  if (!config.whatsapp.myNumber) {
    console.warn('WHATSAPP_MY_NUMBER não configurado — pulando envio, mas os produtos já foram salvos no banco.');
    return { stats, sent: 0 };
  }

  const destinations = [`${config.whatsapp.myNumber}@s.whatsapp.net`, ...extraDestinationJids];
  console.log(`\nEnviando ${toSend.length} anúncio(s) pra ${destinations.length} destino(s)...`);

  let sent = 0;
  for (let i = 0; i < toSend.length; i++) {
    const deal = toSend[i];
    const isSuperDeal = (deal.discountPct ?? 0) >= SUPER_DEAL_DISCOUNT_PCT;

    // Espaça os envios pra não parecer rajada de spam no grupo. Super ofertas
    // pulam a espera longa (disparam quase na hora), mas ainda guardam um
    // espaçamento curto entre si — pra não cair 2 mensagens juntas se baterem
    // 2 descontos grandes na mesma checagem.
    if (i > 0) {
      const delayMs = isSuperDeal
        ? randomDelayMs(SUPER_DEAL_MIN_DELAY_MS, SUPER_DEAL_MAX_DELAY_MS)
        : randomDelayMs(MIN_DELAY_MS, MAX_DELAY_MS);
      console.log(
        `\nAguardando ${(delayMs / 60000).toFixed(1)} min antes do próximo envio${isSuperDeal ? ' (super oferta, espera curta)' : ' (evitar rajada)'}...`,
      );
      await sleep(delayMs);
    }

    const ad = await buildDiscoveryAd(deal);
    for (const jid of destinations) {
      try {
        await sendAd(sock, jid, ad);
        sent++;
        console.log(`Enviado${isSuperDeal ? ' (super oferta)' : ''} pra ${jid}: ${deal.title}`);
      } catch (err) {
        console.error(`Falha ao enviar anúncio pra ${jid}: ${err.message}`);
      }
    }
    markAdvertised(db, deal.product.id);
  }

  return { stats, sent };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { connectWhatsApp, waitForConnection } = await import('../whatsapp/connect.js');
  const maxPerStore = process.argv[2] ? Number(process.argv[2]) : undefined;
  const sock = await connectWhatsApp();
  await waitForConnection(sock);
  try {
    await runDiscovery({ sock, ...(maxPerStore ? { maxPerStore } : {}) });
    await sock.end();
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    await sock.end();
    process.exit(1);
  }
}

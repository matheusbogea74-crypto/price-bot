import cron from 'node-cron';
import { config } from './config/index.js';
import { checkAllProducts } from './priceCheck/checkAllProducts.js';
import { buildAd } from './ads/buildAd.js';
import { runDiscovery } from './discovery/runDiscovery.js';
import { connectPersistent } from './whatsapp/connectPersistent.js';
import { sendAd } from './whatsapp/sendAd.js';
import { startCouponChannelListener } from './coupons/couponChannel.js';
import { buildCouponAd } from './coupons/buildCouponAd.js';
import { startCommandListener } from './control/commandListener.js';

// TODO Fase 7: trocar pro JID do grupo (config.whatsapp.groupId) quando for validado.
const DESTINATION_JID = `${config.whatsapp.myNumber}@s.whatsapp.net`;

let sock = null;
let stopCouponListener = null;
let stopCommandListener = null;
let paused = false;
let lastCheckAt = null;

async function handleCoupon({ text }) {
  if (paused) return;

  const ad = buildCouponAd(text);
  try {
    await sendAd(sock, DESTINATION_JID, ad);
    console.log(`Cupom repassado: ${text.slice(0, 80)}`);
  } catch (err) {
    console.error(`Falha ao repassar cupom: ${err.message}`);
  }
}

async function onPause(replyTo) {
  paused = true;
  console.log('Bot pausado via comando do WhatsApp.');
  await sock.sendMessage(replyTo, {
    text: '⏸️ Bot pausado. Checagens de preço e cupons ficam em espera até você mandar /retomar.',
  });
}

async function onResume(replyTo) {
  paused = false;
  console.log('Bot retomado via comando do WhatsApp.');
  await sock.sendMessage(replyTo, { text: '▶️ Bot retomado. Voltando a checar preços e repassar cupons normalmente.' });
}

async function onStatus(replyTo) {
  const state = paused ? '⏸️ pausado' : '▶️ ativo';
  const lastCheck = lastCheckAt ? lastCheckAt.toLocaleString('pt-BR') : 'nenhuma ainda';
  await sock.sendMessage(replyTo, { text: `🤖 Status: ${state}\nÚltima checagem de preços: ${lastCheck}` });
}

async function runCheckAndNotify() {
  if (!sock) {
    console.warn('WhatsApp ainda não conectado, pulando esta checagem.');
    return;
  }

  if (paused) {
    console.log('Bot pausado — pulando esta checagem.');
    return;
  }

  lastCheckAt = new Date();
  console.log(`\n--- Checagem iniciada: ${lastCheckAt.toISOString()} ---`);
  const { summary } = await checkAllProducts();

  for (const result of summary.newLows) {
    const ad = await buildAd(result);
    try {
      await sendAd(sock, DESTINATION_JID, ad);
      console.log(`Anúncio enviado: ${result.title}`);
    } catch (err) {
      console.error(`Falha ao enviar anúncio de "${result.title}": ${err.message}`);
    }
  }

  console.log(
    `--- Checagem concluída: ${summary.ok}/${summary.total} ok, ${summary.errors} erro(s), ${summary.newLows.length} anúncio(s) enviado(s) ---\n`,
  );
}

async function runDiscoveryAndNotify() {
  if (!sock) {
    console.warn('WhatsApp ainda não conectado, pulando esta descoberta.');
    return;
  }

  if (paused) {
    console.log('Bot pausado — pulando esta descoberta.');
    return;
  }

  console.log(`\n--- Descoberta de ofertas iniciada: ${new Date().toISOString()} ---`);
  try {
    const { stats, sent } = await runDiscovery({ sock });
    console.log(
      `--- Descoberta concluída: ${stats.realDeals} oferta(s) válida(s), ${sent} anúncio(s) enviado(s) ---\n`,
    );
  } catch (err) {
    console.error(`Falha na descoberta de ofertas: ${err.message}`);
  }
}

const { start } = connectPersistent({
  onOpen: async (activeSock) => {
    const isFirstConnection = sock === null;
    sock = activeSock;

    // A conexão é trocada por um socket novo a cada reconexão — o listener
    // precisa ser reanexado nele (o antigo, se ainda tiver um timer rodando,
    // é encerrado antes).
    stopCouponListener?.();
    stopCouponListener = startCouponChannelListener(sock, handleCoupon);

    stopCommandListener?.();
    stopCommandListener = startCommandListener(sock, { onPause, onResume, onStatus });

    if (isFirstConnection) {
      const cronExpression = `0 */${config.checkIntervalHours} * * *`;
      cron.schedule(cronExpression, runCheckAndNotify);
      console.log(`Cron agendado: checagem a cada ${config.checkIntervalHours}h (${cronExpression}).`);

      // 3x ao dia (9h, 15h, 21h em Brasília = 12h, 18h, 0h UTC) — descoberta de
      // ofertas novas nas páginas oficiais do ML/Amazon (independente dos
      // produtos já rastreados).
      cron.schedule('0 0,12,18 * * *', runDiscoveryAndNotify);
      console.log('Cron agendado: descoberta de ofertas 3x/dia às 9h, 15h e 21h BRT.');

      await runCheckAndNotify();
    }
  },
});

console.log(`Price Bot iniciando. Destino das notificações: ${DESTINATION_JID} (seu número, não o grupo).`);
await start();

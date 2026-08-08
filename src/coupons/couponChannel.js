import { getConversationText, getMediaCaption } from '../whatsapp/messageText.js';

// Canal oficial "Afiliados e Criadores Mercado Livre" — resolvido a partir do
// link de convite https://www.whatsapp.com/channel/0029VaXBWV24IBhJJ0T1023C
export const COUPON_CHANNEL_JID = '120363284081143328@newsletter';

// A assinatura de "live updates" do WhatsApp expira (~90s) — precisa renovar
// periodicamente enquanto o bot estiver rodando, senão para de receber mensagens novas.
const RESUBSCRIBE_INTERVAL_MS = 70 * 1000;

function extractText(message) {
  return getConversationText(message) || getMediaCaption(message);
}

/**
 * Escuta o canal de afiliados do Mercado Livre em tempo real e chama
 * `onCoupon({ text, messageId })` pra cada mensagem nova recebida enquanto o
 * bot estiver conectado. NÃO busca mensagens antigas — `newsletterFetchMessages`
 * do Baileys não funciona de forma confiável pra esse canal (testado, trava).
 * Devolve uma função de limpeza (parar de reassinar o live update).
 */
export function startCouponChannelListener(sock, onCoupon) {
  const processedIds = new Set();

  async function subscribe() {
    try {
      await sock.newsletterFollow(COUPON_CHANNEL_JID);
    } catch {
      // provavelmente já segue o canal, ignora
    }
    try {
      await sock.subscribeNewsletterUpdates(COUPON_CHANNEL_JID);
    } catch (err) {
      console.warn(`[cupons] Falha ao (re)assinar live updates do canal: ${err.message}`);
    }
  }

  subscribe();
  const interval = setInterval(subscribe, RESUBSCRIBE_INTERVAL_MS);

  const handler = ({ messages }) => {
    for (const msg of messages) {
      if (msg.key?.remoteJid !== COUPON_CHANNEL_JID) continue;
      if (!msg.key.id || processedIds.has(msg.key.id)) continue;
      processedIds.add(msg.key.id);

      const text = extractText(msg.message);
      if (!text) continue;

      Promise.resolve(onCoupon({ text, messageId: msg.key.id })).catch((err) => {
        console.error(`[cupons] Falha ao processar cupom: ${err.message}`);
      });
    }
  };

  sock.ev.on('messages.upsert', handler);

  return () => {
    clearInterval(interval);
    sock.ev.off('messages.upsert', handler);
  };
}

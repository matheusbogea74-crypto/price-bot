import { getConversationText } from '../whatsapp/messageText.js';

const COMMANDS = {
  '/pausar': 'pause',
  '/pause': 'pause',
  '/retomar': 'resume',
  '/resume': 'resume',
  '/status': 'status',
};

/**
 * Escuta mensagens que o próprio usuário manda (fromMe) em qualquer conversa
 * do WhatsApp dele, procurando por comandos de controle (/pausar, /retomar,
 * /status). Só o dono da conta consegue disparar isso — o Baileys só reporta
 * fromMe=true pra mensagens enviadas pela própria conta autenticada, não tem
 * como outra pessoa forjar isso sem já ter acesso ao WhatsApp do usuário.
 */
export function startCommandListener(sock, handlers) {
  const handler = async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key?.fromMe) continue;

      const text = getConversationText(msg.message)?.trim().toLowerCase();
      if (!text) continue;

      const action = COMMANDS[text];
      if (!action) continue;

      const replyTo = msg.key.remoteJid;

      try {
        if (action === 'pause') await handlers.onPause(replyTo);
        if (action === 'resume') await handlers.onResume(replyTo);
        if (action === 'status') await handlers.onStatus(replyTo);
      } catch (err) {
        console.error(`[controle] Falha ao processar comando "${text}": ${err.message}`);
      }
    }
  };

  sock.ev.on('messages.upsert', handler);

  return () => sock.ev.off('messages.upsert', handler);
}

import { DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { connectWhatsApp } from './connect.js';

const RECONNECT_DELAY_MS = 5000;

/**
 * Wraps `connectWhatsApp()` for long-running use: automatically reconnects
 * on an unexpected drop (with a fixed delay), and calls `onOpen(sock)` every
 * time a connection is established — including reconnects, since Baileys
 * hands back a new socket object each time and any listeners attached to the
 * previous one need to be re-attached to the new one (see `src/index.js` for
 * the pattern). A genuine logout is treated as unrecoverable and exits the
 * process, since it requires a human to re-scan a QR code.
 *
 * @param {{onOpen: (sock: import('@whiskeysockets/baileys').WASocket) => void}} options
 * @returns {{start: () => Promise<void>}}
 */
export function connectPersistent({ onOpen }) {
  async function start() {
    const sock = await connectWhatsApp();

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\nEscaneie o QR code no WhatsApp: Aparelhos conectados > Conectar um aparelho\n');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'open') {
        console.log('Conectado ao WhatsApp!');
        onOpen(sock);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        if (loggedOut) {
          console.error(
            'Sessão desconectada (logged out). Apague a pasta baileys_auth e rode de novo pra reparear o QR code.',
          );
          process.exit(1);
        }

        console.log(`Conexão perdida (código ${statusCode}). Reconectando em ${RECONNECT_DELAY_MS / 1000}s...`);
        setTimeout(start, RECONNECT_DELAY_MS);
      }
    });
  }

  return { start };
}

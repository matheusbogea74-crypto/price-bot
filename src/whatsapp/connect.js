import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { config } from '../config/index.js';

// libsignal (dependência interna do Baileys) chama console.info() direto pra logar
// o fechamento de sessões de criptografia — não dá pra configurar isso pelo `logger`
// do Baileys. Nosso código nunca usa console.info, então é seguro silenciar só ele.
console.info = () => {};

/**
 * Opens a new WhatsApp connection using the persisted session in
 * `config.whatsapp.authDir` (or starts a fresh pairing, printing a QR code,
 * if none exists yet). Returns immediately with the socket — pair with
 * `waitForConnection()` to know when it's actually usable. For a
 * long-running service, prefer `connectPersistent()` instead, which wraps
 * this with automatic reconnection.
 *
 * @returns {Promise<import('@whiskeysockets/baileys').WASocket>}
 */
export async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.authDir);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  return sock;
}

/**
 * Resolves once `sock` reaches an open connection; rejects if it closes
 * first (distinguishing an actual logout, which needs a fresh QR pairing,
 * from a transient close). Prints the QR code to the terminal when the
 * server requests a fresh pairing.
 *
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @returns {Promise<import('@whiskeysockets/baileys').WASocket>}
 */
export function waitForConnection(sock) {
  return new Promise((resolve, reject) => {
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\nEscaneie o QR code no WhatsApp: Aparelhos conectados > Conectar um aparelho\n');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'open') {
        console.log('Conectado ao WhatsApp!');
        resolve(sock);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        if (loggedOut) {
          reject(
            new Error(
              'Sessão desconectada (logged out). Apague a pasta baileys_auth e rode de novo pra reparear o QR code.',
            ),
          );
        } else {
          reject(new Error(`Conexão fechada antes de completar (código ${statusCode}). Rode o script de novo.`));
        }
      }
    });
  });
}

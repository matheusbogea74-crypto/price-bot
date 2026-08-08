import { pathToFileURL } from 'node:url';
import { connectWhatsApp, waitForConnection } from './connect.js';
import { config } from '../config/index.js';

export async function sendTestMessage(text) {
  if (!config.whatsapp.myNumber) {
    throw new Error('WHATSAPP_MY_NUMBER não configurado no .env');
  }

  const sock = await connectWhatsApp();
  await waitForConnection(sock);

  const jid = `${config.whatsapp.myNumber}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text });

  console.log(`Mensagem de teste enviada para ${config.whatsapp.myNumber}.`);

  await sock.end();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const text =
    process.argv[2] ?? 'Teste do Price Bot 🤖 — se você recebeu isso, a conexão com o WhatsApp está funcionando!';

  try {
    await sendTestMessage(text);
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

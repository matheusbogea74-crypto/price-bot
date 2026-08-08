import { pathToFileURL } from 'node:url';
import { connectWhatsApp, waitForConnection } from './connect.js';

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sock = await connectWhatsApp();
  await waitForConnection(sock);

  const groups = await sock.groupFetchAllParticipating();
  const list = Object.values(groups);

  if (list.length === 0) {
    console.log('Nenhum grupo encontrado nessa conta.');
  } else {
    console.log(`\n${list.length} grupo(s) encontrado(s):\n`);
    for (const g of list) {
      console.log(`${g.subject}\n  JID: ${g.id}\n`);
    }
  }

  await sock.end();
  process.exit(0);
}

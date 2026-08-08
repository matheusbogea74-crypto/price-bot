/**
 * Sends an ad/alert built by `buildAd()` or `buildDiscoveryAd()` to a JID —
 * as an image with caption if `ad.imageUrl` is set, otherwise as plain text.
 *
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string} jid - destination WhatsApp JID (user or group)
 * @param {{text: string, imageUrl: string|null}} ad
 */
export async function sendAd(sock, jid, ad) {
  if (ad.imageUrl) {
    await sock.sendMessage(jid, { image: { url: ad.imageUrl }, caption: ad.text });
  } else {
    await sock.sendMessage(jid, { text: ad.text });
  }
}

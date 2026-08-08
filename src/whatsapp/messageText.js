/**
 * Extracts plain text from a Baileys message object's `conversation` or
 * `extendedTextMessage` field — the two shapes a typed/pasted text message
 * can arrive as. Returns `null` if neither is present.
 */
export function getConversationText(message) {
  return message?.conversation || message?.extendedTextMessage?.text || null;
}

/**
 * Extracts the caption from an image or video message, if any.
 * Returns `null` if the message isn't media or has no caption.
 */
export function getMediaCaption(message) {
  return message?.imageMessage?.caption || message?.videoMessage?.caption || null;
}

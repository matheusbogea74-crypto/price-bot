/**
 * Parses a Brazilian-real price string (e.g. "R$ 1.234,56") into a number
 * (e.g. 1234.56). Returns `null` if no price-like substring is found.
 */
export function parseBRLPrice(text) {
  const match = text?.match(/R\$\s*([\d.,]+)/);
  if (!match) return null;
  return Number(match[1].replace(/\./g, '').replace(',', '.'));
}

/**
 * Formats a number as a Brazilian-real amount without the currency symbol
 * (e.g. 1234.5 -> "1234,50"), for embedding in message text such as
 * `R$ ${formatBRLPrice(value)}`.
 */
export function formatBRLPrice(value) {
  return value.toFixed(2).replace('.', ',');
}

export function extractItemId(urlOrId) {
  const match = urlOrId.match(/MLB-?(\d+)/i);

  if (!match) {
    throw new Error(
      `Não foi possível extrair o ID do item de: ${urlOrId}\n` +
        'Use uma URL de produto do Mercado Livre (ex: .../MLB-123456789-...) ou o ID direto (ex: MLB123456789).',
    );
  }

  return `MLB${match[1]}`;
}

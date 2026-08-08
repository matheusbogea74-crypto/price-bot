import { pathToFileURL } from 'node:url';
import { config } from '../config/index.js';
import { updateEnvValues } from '../config/updateEnv.js';

export async function refreshAccessToken() {
  const { clientId, clientSecret, refreshToken } = config.mercadolivre;

  if (!refreshToken) {
    throw new Error('ML_REFRESH_TOKEN não configurado no .env. Rode o fluxo de autorização primeiro.');
  }

  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Erro ao renovar token: ${JSON.stringify(data)}`);
  }

  updateEnvValues({
    ML_ACCESS_TOKEN: data.access_token,
    ML_REFRESH_TOKEN: data.refresh_token,
  });

  config.mercadolivre.accessToken = data.access_token;
  config.mercadolivre.refreshToken = data.refresh_token;

  return data.access_token;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const token = await refreshAccessToken();
  console.log('Token renovado com sucesso.');
  console.log(`Novo access_token: ${token.slice(0, 12)}...`);
}

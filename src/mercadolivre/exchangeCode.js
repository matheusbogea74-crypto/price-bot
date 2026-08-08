import { config } from '../config/index.js';
import { updateEnvValues } from '../config/updateEnv.js';

const code = process.argv[2];
const { clientId, clientSecret, redirectUri } = config.mercadolivre;

if (!code) {
  console.error('Uso: npm run ml-exchange-code -- "CODIGO_RECEBIDO_NA_URL"');
  process.exit(1);
}

const response = await fetch('https://api.mercadolibre.com/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  }),
});

const data = await response.json();

if (!response.ok) {
  console.error('Erro ao trocar o código pelo token:', data);
  process.exit(1);
}

updateEnvValues({
  ML_ACCESS_TOKEN: data.access_token,
  ML_REFRESH_TOKEN: data.refresh_token,
});

console.log('Token obtido e salvo no .env com sucesso.');
console.log(`Expira em: ${data.expires_in} segundos (~${Math.round(data.expires_in / 3600)}h)`);
console.log(`Usuário autorizado (user_id): ${data.user_id}`);

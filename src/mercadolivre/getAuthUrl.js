import { config } from '../config/index.js';

const { clientId, redirectUri } = config.mercadolivre;

if (!clientId || !redirectUri) {
  console.error('Faltam ML_CLIENT_ID e/ou ML_REDIRECT_URI no arquivo .env');
  process.exit(1);
}

const url = new URL('https://auth.mercadolivre.com.br/authorization');
url.searchParams.set('response_type', 'code');
url.searchParams.set('client_id', clientId);
url.searchParams.set('redirect_uri', redirectUri);

console.log('Abra esta URL no navegador, faça login e autorize a aplicação:\n');
console.log(url.toString());
console.log(
  '\nDepois de autorizar, você será redirecionado para uma página que não existe' +
    ' (example.com) — isso é esperado. Copie o valor do parâmetro "code=" que aparece' +
    ' na barra de endereço do navegador.',
);

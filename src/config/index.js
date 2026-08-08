import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');

export const config = {
  rootDir,
  envPath: path.join(rootDir, '.env'),
  dbPath: path.join(rootDir, 'data', 'price-bot.db'),
  schemaPath: path.join(rootDir, 'src', 'db', 'schema.sql'),
  checkIntervalHours: 3,
  mercadolivre: {
    clientId: process.env.ML_CLIENT_ID,
    clientSecret: process.env.ML_CLIENT_SECRET,
    redirectUri: process.env.ML_REDIRECT_URI,
    accessToken: process.env.ML_ACCESS_TOKEN,
    refreshToken: process.env.ML_REFRESH_TOKEN,
    mattWord: process.env.ML_MATT_WORD,
    mattTool: process.env.ML_MATT_TOOL,
  },
  amazon: {
    affiliateTag: process.env.AMAZON_AFFILIATE_TAG,
  },
  apify: {
    token: process.env.APIFY_API_TOKEN,
    casasBahiaActorId: process.env.CASASBAHIA_APIFY_ACTOR_ID,
  },
  whatsapp: {
    authDir: path.join(rootDir, 'baileys_auth'),
    myNumber: process.env.WHATSAPP_MY_NUMBER,
    groupId: process.env.WHATSAPP_GROUP_ID,
  },
  redirector: {
    baseUrl: process.env.REDIRECTOR_BASE_URL,
    syncSecret: process.env.REDIRECTOR_SYNC_SECRET,
  },
  coupons: {
    logoImageUrl: process.env.COUPON_LOGO_IMAGE_URL,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
};

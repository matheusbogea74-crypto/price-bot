import fs from 'node:fs';
import path from 'node:path';
import { getDb, isUniqueConstraintError } from '../db/index.js';
import { detectStore } from './detectStore.js';
import { config } from '../config/index.js';

const filePath = process.argv[2] ?? path.join(config.rootDir, 'products.seed.json');

if (!fs.existsSync(filePath)) {
  console.error(`Arquivo não encontrado: ${filePath}`);
  console.error('Uso: npm run import-products -- caminho/para/produtos.json');
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const db = getDb();
const insert = db.prepare(`INSERT INTO products (name, url, store) VALUES (@name, @url, @store)`);

let added = 0;
let skipped = 0;

for (const product of products) {
  const store = detectStore(product.url);
  try {
    insert.run({ name: product.name, url: product.url, store });
    added += 1;
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      skipped += 1;
      continue;
    }
    throw err;
  }
}

console.log(`Importação concluída: ${added} adicionados, ${skipped} já existiam.`);

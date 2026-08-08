import { getDb, isUniqueConstraintError } from '../db/index.js';
import { detectStore } from './detectStore.js';

const [, , name, url] = process.argv;

if (!name || !url) {
  console.error('Uso: npm run add-product -- "Nome do produto" "https://..."');
  process.exit(1);
}

const store = detectStore(url);
const db = getDb();

const insert = db.prepare(`INSERT INTO products (name, url, store) VALUES (@name, @url, @store)`);

try {
  const result = insert.run({ name, url, store });
  console.log(`Produto cadastrado (id ${result.lastInsertRowid}): ${name} [${store}]`);
} catch (err) {
  if (isUniqueConstraintError(err)) {
    console.error('Já existe um produto cadastrado com essa URL.');
    process.exit(1);
  }
  throw err;
}

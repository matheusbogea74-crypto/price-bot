import fs from 'node:fs';
import { getDb } from './index.js';
import { config } from '../config/index.js';

const db = getDb();
const schema = fs.readFileSync(config.schemaPath, 'utf8');

db.exec(schema);

console.log(`Banco inicializado em: ${config.dbPath}`);

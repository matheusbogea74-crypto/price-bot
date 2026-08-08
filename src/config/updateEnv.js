import fs from 'node:fs';
import { config } from './index.js';

export function updateEnvValues(values) {
  let content = fs.readFileSync(config.envPath, 'utf8');

  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');

    content = pattern.test(content) ? content.replace(pattern, line) : `${content}\n${line}`;
  }

  fs.writeFileSync(config.envPath, content);
}

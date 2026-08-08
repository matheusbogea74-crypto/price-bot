// Cross-platform syntax check for every source file, without executing any
// of them — `node --check` only parses. This is intentionally separate from
// a real test suite (see ROADMAP.md): it just catches syntax errors / typos
// that `git diff` review can miss, cheaply, in CI.
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

function collectJsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectJsFiles(fullPath, out);
    } else if (extname(entry) === '.js' || extname(entry) === '.mjs') {
      out.push(fullPath);
    }
  }
  return out;
}

const files = collectJsFiles('src');
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}

console.log(`\nChecked ${files.length} file(s).`);
process.exit(failed ? 1 : 0);

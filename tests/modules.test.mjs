// Loads every module of the game (without a browser) so a syntax error anywhere fails the tests.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js');
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) files.push(p); } })(root);
let bad = 0;
globalThis.window = globalThis; globalThis.document = { querySelector: () => null, getElementById: () => null, addEventListener() {}, documentElement: { style: { setProperty() {} }, dataset: {} } };
for (const f of files) {
  if (/main\.js$/.test(f)) continue; // the controller boots the DOM app on import
  try { await import(pathToFileURL(f)); } catch (e) { if (e instanceof SyntaxError) { bad++; console.error('✗', path.relative(root, f), e.message); } }
}
console.log(bad ? `${bad} module(s) failed to parse` : `All ${files.length} modules parse.`);
process.exit(bad ? 1 : 0);

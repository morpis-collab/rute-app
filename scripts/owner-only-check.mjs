import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message });
}

function listFiles(dir, predicate = () => true) {
  const absoluteDir = path.join(root, dir);
  if (!fs.existsSync(absoluteDir)) return [];
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolutePath = path.join(absoluteDir, entry.name);
    const relativePath = path.relative(root, absolutePath).replaceAll(path.sep, '/');
    if (entry.isDirectory()) return listFiles(relativePath, predicate);
    return predicate(relativePath) ? [relativePath] : [];
  });
}

const appRouter = read('src/App.jsx');
const authServer = read('server/auth.js');
const dbServer = read('server/db.js');

assert(!appRouter.includes('/partner'), 'frontend router does not expose /partner routes');
assert(!fs.existsSync(path.join(root, 'src/pages/partner')), 'frontend partner page directory is removed');
assert(!authServer.includes('RUTE_PARTNER_PIN'), 'server auth no longer supports RUTE_PARTNER_PIN');
assert(!dbServer.includes("partner:"), 'server seed no longer creates a partner user');
assert(!dbServer.includes("role: 'partner'"), 'server seed/normalization no longer keeps partner role');

const uiFiles = listFiles('src', (file) => (
  /\.(jsx|js)$/.test(file)
  && !file.startsWith('src/assets/')
));

const forbiddenUiTexts = [
  'Partner / Kasir',
  'Owner dan partner',
  'Catatan Partner',
  'Status Partner',
  'aktivitas partner',
  'Partner RUTE',
  "user?.role === 'partner'",
  "role === 'partner'",
];

for (const text of forbiddenUiTexts) {
  const hits = uiFiles.filter((file) => read(file).includes(text));
  assert(hits.length === 0, `UI source has no forbidden partner text: ${text}${hits.length ? ` (${hits.join(', ')})` : ''}`);
}

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? 'OK' : 'FAIL'} ${check.message}`);
}

if (failed.length) {
  console.error(`\nOwner-only check failed: ${failed.length} issue(s).`);
  process.exit(1);
}

console.log('\nOwner-only check passed.');

// しおりを暗号化して1つのHTMLにする。使い方: node build.js <出力先フォルダ>
// 公開されるのは暗号化した結果だけ。鍵は key.txt（公開しない）。
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const out = process.argv[2]; if (!out) { console.error('出力先を指定'); process.exit(1); }
const here = __dirname;
const keyFile = path.join(here, 'key.txt');
if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(32).toString('base64url'), { mode: 0o600 });
const keyStr = fs.readFileSync(keyFile, 'utf8').trim();
const key = Buffer.from(keyStr, 'base64url'); if (key.length !== 32) throw new Error('key length');
// データは data.js（手元の原本）か、復号して取り出した JSON（第2引数）から読む
const data = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : require('./data.js');
const plain = Buffer.from(JSON.stringify(data), 'utf8');
const iv = crypto.randomBytes(12);
const c = crypto.createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([c.update(plain), c.final()]);
const payload = Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64');
let html = fs.readFileSync(path.join(here, 'template.html'), 'utf8');
if (!html.includes('__PAYLOAD__')) throw new Error('no placeholder');
// 公開する殻（テンプレート）に旅の中身が平文で残っていないことを確かめる
const shell = html;
html = html.replace('__PAYLOAD__', payload);
for (const w of (data._check || [])) if (shell.includes(w)) throw new Error('plaintext leak: ' + w);
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html);
const ver = crypto.createHash('sha1').update(html).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(out, 'sw.js'), `// オフラインでも開けるように、最後に読み込んだページを端末に残す
const C = 'shiori-${ver}';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(['./', './icon-180.png']))); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url); if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./'))));
});
`);
console.log('built', out, 'html', html.length, 'bytes; plain', plain.length, '; ver', ver);

// 公開中の index.html からデータ（JSON）を取り出す。使い方: node decrypt.js <index.html> <鍵> > data.json
const fs = require('fs'), crypto = require('crypto');
const [file, keyStr] = process.argv.slice(2);
if (!file || !keyStr) { console.error('使い方: node decrypt.js <index.html> <鍵>'); process.exit(1); }
const m = /<script id="payload"[^>]*>([^<]+)<\/script>/.exec(fs.readFileSync(file, 'utf8'));
const raw = Buffer.from(m[1], 'base64'), key = Buffer.from(keyStr.replace(/^.*k=/, ''), 'base64url');
const d = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
d.setAuthTag(raw.subarray(raw.length - 16));
process.stdout.write(Buffer.concat([d.update(raw.subarray(12, raw.length - 16)), d.final()]).toString('utf8'));

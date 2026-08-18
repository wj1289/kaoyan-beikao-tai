/* 生成 VAPID 密钥对，写入 .env（首次部署用）
 * 用法：node gen-vapid.js
 */
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const pair = webpush.generateVAPIDKeys();
const envPath = path.join(__dirname, '.env');
let env = '';
try { env = fs.readFileSync(envPath, 'utf8'); } catch (e) { env = ''; }
const set = (k, v) => {
  const re = new RegExp('^' + k + '=.*$', 'm');
  if (re.test(env)) env = env.replace(re, k + '=' + v);
  else env += (env && !env.endsWith('\n') ? '\n' : '') + k + '=' + v + '\n';
};
set('VAPID_PUBLIC_KEY', pair.publicKey);
set('VAPID_PRIVATE_KEY', pair.privateKey);
set('VAPID_SUBJECT', 'mailto:admin@example.com');
fs.writeFileSync(envPath, env);
console.log('已写入 .env：');
console.log('VAPID_PUBLIC_KEY=' + pair.publicKey);
console.log('VAPID_PRIVATE_KEY=' + pair.privateKey);
console.log('\n请把 VAPID_PUBLIC_KEY 也填到前端 index.html 的 PUSH_VAPID_PUBLIC_KEY 常量。');

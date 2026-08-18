/* 考研备考台 · 自托管推送后端
 * 职责：
 *   1) 静态托管 PWA（考研备考台-pwa/index.html）
 *   2) /api/sync        跨设备共享状态（按 workspace 隔离，last-write-wins，个人使用足够）
 *   3) /api/subscribe    保存浏览器 Push 订阅（VAPID）
 *   4) 调度器：读共享状态，计算到期复习卡片，经 Web Push 跨设备真后台推送（应用关闭也弹）
 *
 * 环境变量（见 .env.example）：
 *   PORT                  监听端口（默认 8080）
 *   VAPID_PUBLIC_KEY      gen-vapid.js 生成
 *   VAPID_PRIVATE_KEY     gen-vapid.js 生成
 *   VAPID_SUBJECT         mailto:you@example.com
 *   STATE_DIR             状态持久化目录（默认 ./data）
 *
 * 部署：Node 起服务即可（自带 HTTPS 或挂反向代理+Nginx/Cloudflare TLS）。
 *       免费最简方案：Vercel/Cloudflare Pages 仅托管前端；后端用 Vercel/CloudFlare Function
 *       或 Railway/Render 等 Node 容器（均自带 HTTPS）。
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const webpush = require('web-push');

// ---------- 配置 ----------
try { require('dotenv').config(); } catch (e) {} // 可选依赖：若装了 dotenv 则加载 .env
// 复制一份 process.env：某些托管环境会把变量设为「不可写」，直接改 process.env 会静默失败，
// 用普通对象副本即可自由清洗与覆盖。
const env = Object.assign({}, process.env);

// 防御：某些托管平台/环境会把「未设置」的变量注入成字符串 "undefined" / "null" / ""。
// 这里统一清洗为 JS undefined（用「赋值」而非 delete，避免 env 属性不可配置时删除失败），
// 以便后续回退到 .env 文件 / 默认值 / 自动生成密钥。
function cleanVal(v) {
  return (v && v !== 'undefined' && v !== 'null' && String(v).trim() !== '') ? String(v).trim() : undefined;
}
['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'STATE_DIR', 'PORT'].forEach(function (k) {
  env[k] = cleanVal(env[k]);
});

function readEnvFile(key) {
  try {
    const m = require('fs').readFileSync(require('path').join(__dirname, '.env'), 'utf8').match(new RegExp('^' + key + '=(.*)$', 'm'));
    return m ? m[1].trim() : undefined;
  } catch (e) { return undefined; }
}
if (!env.VAPID_PUBLIC_KEY) env.VAPID_PUBLIC_KEY = readEnvFile('VAPID_PUBLIC_KEY');
if (!env.VAPID_PRIVATE_KEY) env.VAPID_PRIVATE_KEY = readEnvFile('VAPID_PRIVATE_KEY');
if (!env.VAPID_SUBJECT) env.VAPID_SUBJECT = readEnvFile('VAPID_SUBJECT');
const PORT = parseInt(env.PORT || '8080', 10);
const STATE_DIR = env.STATE_DIR || path.join(__dirname, 'data');
const PWA_DIR = path.join(__dirname, '..', '考研备考台-pwa');

fs.mkdirSync(STATE_DIR, { recursive: true });

// 零配置：若仍未配置 VAPID 密钥，则自动生成并持久化到 STATE_DIR/vapid.json
// —— 这样一键部署（Render / Railway）无需手动填写任何密钥。
// 注意：平台在重新部署时可能重置磁盘，导致密钥变化、旧订阅失效；
//       个人使用足够，届时在设备上重新授权一次推送即可。
function loadVapidFile() {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(STATE_DIR, 'vapid.json'), 'utf8'));
    if (v.publicKey)    env.VAPID_PUBLIC_KEY  = env.VAPID_PUBLIC_KEY  || v.publicKey;
    if (v.privateKey)   env.VAPID_PRIVATE_KEY = env.VAPID_PRIVATE_KEY || v.privateKey;
    if (v.subject)      env.VAPID_SUBJECT     = env.VAPID_SUBJECT     || v.subject;
  } catch (e) {}
}
function genVapid() {
  try {
    const pair = webpush.generateVAPIDKeys();
    env.VAPID_PUBLIC_KEY = pair.publicKey;
    env.VAPID_PRIVATE_KEY = pair.privateKey;
    if (!env.VAPID_SUBJECT) env.VAPID_SUBJECT = 'mailto:admin@example.com';
    try {
      fs.writeFileSync(path.join(STATE_DIR, 'vapid.json'),
        JSON.stringify({ publicKey: pair.publicKey, privateKey: pair.privateKey, subject: env.VAPID_SUBJECT }, null, 2));
    } catch (e) {}
    console.log('🔑 已自动生成并保存 VAPID 密钥（STATE_DIR/vapid.json）');
  } catch (e) {
    console.log('⚠️ 自动生成 VAPID 失败：', e && e.message);
  }
}

function safeSubject(s) {
  return (s && /^mailto:|^https?:\/\//i.test(s)) ? s : 'mailto:admin@example.com';
}
loadVapidFile();
if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) genVapid();

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    safeSubject(env.VAPID_SUBJECT),
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
  console.log('✅ VAPID 已配置');
} else {
  console.log('⚠️ 未配置 VAPID 密钥：推送不可用，但 /api/sync 与静态托管正常。');
}

// ---------- 共享状态持久化 ----------
function stateFile(ws) { return path.join(STATE_DIR, 'ws-' + (ws || 'default') + '.json'); }
function loadState(ws) {
  try { return JSON.parse(fs.readFileSync(stateFile(ws), 'utf8')); }
  catch (e) { return { state: null, subs: [], pushed: {}, lastDaily: '' }; }
}
function saveState(ws, obj) {
  try { fs.writeFileSync(stateFile(ws), JSON.stringify(obj, null, 2)); } catch (e) {}
}

// ---------- 推送内容构造（与前端 cardNotifyBody/digestBody 文案一致） ----------
const SUBJ = { '408': '408', '英1': '英语一', '数1': '数学一', '政': '政治', '雅思': '雅思', '软设': '软件设计师' };
const EB_LABEL = ['5分钟', '30分钟', '12小时', '1天', '2天', '4天', '7天', '15天', '30天'];
function cardQ(c) { return (c.front || '(空白正面)').trim(); }
function cardA(c) { return (c.back || '(暂无答案)').trim(); }
function cardBody(c) {
  const lines = [SUBJ[c.subj] + ' · 第' + ((c.lvl || 0) + 1) + '档（' + (EB_LABEL[c.lvl] || EB_LABEL[0]) + '）',
    '问：' + cardQ(c).slice(0, 80), '答：' + cardA(c).slice(0, 120)];
  if (c.wrong) lines.push('⚠️ 已错 ' + c.wrong + ' 次，重点巩固');
  return lines.join('\n');
}
function digest(cards) {
  const head = '🃏 待复习卡片 · 共 ' + cards.length + ' 张（点开应用可逐张自测）';
  const blocks = cards.slice(0, 6).map(function (c, i) {
    return '─ ' + (i + 1) + '. ' + SUBJ[c.subj] + ' · ' + (EB_LABEL[c.lvl] || EB_LABEL[0]) + '档 ─\n问：' + cardQ(c).slice(0, 60) + '\n答：' + cardA(c).slice(0, 90);
  });
  let s = head + '\n\n' + blocks.join('\n\n');
  if (cards.length > 6) s += '\n\n…还有 ' + (cards.length - 6) + ' 张，打开应用查看';
  return s;
}

// ---------- 调度器：到点推送到期卡片 ----------
function tick() {
  const now = Date.now();
  const files = fs.readdirSync(STATE_DIR).filter(f => /^ws-.*\.json$/.test(f));
  for (const f of files) {
    const ws = f.replace(/^ws-/, '').replace(/\.json$/, '');
    const rec = loadState(ws);
    if (!rec.state || !rec.subs || !rec.subs.length) continue;
    const cards = (rec.state.cards || []).filter(c => c.dueAt != null);
    const dueNow = cards.filter(c => c.dueAt <= now);
    if (!dueNow.length) continue;
    // 仅推送「尚未推送过该 dueAt」的卡片（复习后 dueAt 会变，自动允许再次推送）
    const fresh = dueNow.filter(c => (rec.pushed[c.id] || 0) !== c.dueAt);
    if (!fresh.length) continue;
    let payload;
    if (fresh.length === 1) {
      const c = fresh[0];
      payload = { title: '🃏 复习 · ' + SUBJ[c.subj] + '：' + cardQ(c).slice(0, 28),
        body: cardBody(c), data: { cardId: c.id, ws: ws } };
    } else {
      payload = { title: '🃏 待复习卡片 · 共 ' + fresh.length + ' 张',
        body: digest(fresh), data: { ws: ws } };
    }
    for (const sub of rec.subs.slice()) {
      webpush.sendNotification(sub, JSON.stringify(payload)).then(() => {
        fresh.forEach(c => { rec.pushed[c.id] = c.dueAt; });
        saveState(ws, rec);
      }).catch(err => {
        if (err && (err.statusCode === 410 || err.statusCode === 404)) {
          rec.subs = rec.subs.filter(s => s.endpoint !== sub.endpoint);
          saveState(ws, rec);
        }
      });
    }
  }
}
setInterval(tick, 60 * 1000);

// ---------- HTTP ----------
const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/api/vapid', (req, res) => res.json({ publicKey: env.VAPID_PUBLIC_KEY || '' }));

app.get('/api/sync', (req, res) => {
  const rec = loadState(req.query.ws);
  res.json({ state: rec.state, serverTime: Date.now() });
});

app.post('/api/sync', (req, res) => {
  const ws = (req.body && req.body.ws) || 'default';
  const state = req.body && req.body.state;
  if (!state) return res.status(400).json({ error: 'missing state' });
  const rec = loadState(ws);
  rec.state = state;
  saveState(ws, rec);
  res.json({ ok: true, serverTime: Date.now() });
});

app.post('/api/subscribe', (req, res) => {
  const ws = (req.body && req.body.ws) || 'default';
  const sub = req.body && req.body.subscription;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'missing subscription' });
  const rec = loadState(ws);
  if (!rec.subs) rec.subs = [];
  const exists = rec.subs.some(s => s.endpoint === sub.endpoint);
  if (!exists) rec.subs.push(sub);
  saveState(ws, rec);
  res.json({ ok: true, count: rec.subs.length });
});

// 静态托管 PWA（SPA）
app.use(express.static(PWA_DIR, { extensions: ['html'] }));
app.get('*', (req, res) => res.sendFile(path.join(PWA_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log('考研备考台推送后端已启动：http://localhost:' + PORT);
  console.log('VAPID 公钥已配置：' + (env.VAPID_PUBLIC_KEY ? '是' : '否（请先运行 node gen-vapid.js）'));
});

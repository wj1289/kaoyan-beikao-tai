// Cloudflare Pages Functions 共享存储层：用 KV 替代本地文件/Redis。
// 需要在 Cloudflare 控制台把 KV namespace 绑定为变量名 KV。
async function loadState(env, ws) {
  try {
    const r = await env.KV.get('kb:sync:' + ws, { type: 'json' });
    if (r) return r;
  } catch (e) { console.error(e); }
  return { state: null, subs: [], pushed: {}, lastDaily: '' };
}

async function saveState(env, ws, obj) {
  try {
    await env.KV.put('kb:sync:' + ws, JSON.stringify(obj));
  } catch (e) { console.error(e); }
}

async function getVapid(env) {
  try { return await env.KV.get('kb:vapid', { type: 'json' }); } catch (e) { return null; }
}

async function setVapid(env, v) {
  try { await env.KV.put('kb:vapid', JSON.stringify(v)); } catch (e) {}
}

function setCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

module.exports = { loadState, saveState, getVapid, setVapid, setCorsHeaders };

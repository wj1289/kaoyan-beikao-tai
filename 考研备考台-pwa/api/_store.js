const { Redis } = require('@upstash/redis');
let _r = null;
function redis() {
  if (_r) return _r;
  _r = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return _r;
}
async function loadState(ws) {
  try { const r = await redis().get('kb:sync:' + ws); if (r) return r; } catch (e) { console.error(e); }
  return { state: null, subs: [], pushed: {}, lastDaily: '' };
}
async function saveState(ws, obj) {
  try { await redis().set('kb:sync:' + ws, obj); } catch (e) { console.error(e); }
}
async function getVapid() { try { return await redis().get('kb:vapid'); } catch (e) { return null; } }
async function setVapid(v) { try { await redis().set('kb:vapid', v); } catch (e) {} }
module.exports = { redis, loadState, saveState, getVapid, setVapid };

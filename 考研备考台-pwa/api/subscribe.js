const store = require('./_store');
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method === 'POST') {
    const ws = (req.body && req.body.ws) || 'default';
    const sub = req.body && req.body.subscription;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: 'missing subscription' });
    const rec = await store.loadState(ws);
    if (!rec.subs) rec.subs = [];
    if (!rec.subs.some((s) => s.endpoint === sub.endpoint)) rec.subs.push(sub);
    await store.saveState(ws, rec);
    res.json({ ok: true, count: rec.subs.length });
    return;
  }
  res.status(405).end();
};

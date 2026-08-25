const store = require('./_store');
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method === 'GET') {
    const ws = (req.query && req.query.ws) || 'default';
    const rec = await store.loadState(ws);
    res.json({ state: rec.state, serverTime: Date.now() });
    return;
  }
  if (req.method === 'POST') {
    const ws = (req.body && req.body.ws) || 'default';
    const state = req.body && req.body.state;
    if (!state) return res.status(400).json({ error: 'missing state' });
    const rec = await store.loadState(ws);
    rec.state = state;
    await store.saveState(ws, rec);
    res.json({ ok: true, serverTime: Date.now() });
    return;
  }
  res.status(405).end();
};

// GET  /api/sync?ws=xxx -> { state, serverTime }
// POST /api/sync        -> { ws, state } 整状态 last-write-wins 写入 KV
const store = require('../_store');

module.exports = {
  async onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return store.setCorsHeaders(new Response(null, { status: 204 }));
    }
    if (request.method === 'GET') {
      const ws = url.searchParams.get('ws') || 'default';
      const rec = await store.loadState(env, ws);
      return store.setCorsHeaders(Response.json({ state: rec.state, serverTime: Date.now() }));
    }
    if (request.method === 'POST') {
      const body = await request.json();
      const ws = (body && body.ws) || 'default';
      const state = body && body.state;
      if (!state) return Response.json({ error: 'missing state' }, { status: 400 });
      const rec = await store.loadState(env, ws);
      rec.state = state;
      await store.saveState(env, ws, rec);
      return store.setCorsHeaders(Response.json({ ok: true, serverTime: Date.now() }));
    }
    return new Response('Method not allowed', { status: 405 });
  },
};

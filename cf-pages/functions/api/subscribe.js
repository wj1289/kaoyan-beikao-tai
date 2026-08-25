// POST /api/subscribe -> { ws, subscription } 保存 Web Push 订阅到 KV
const store = require('../_store');

module.exports = {
  async onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') {
      return store.setCorsHeaders(new Response(null, { status: 204 }));
    }
    if (request.method === 'POST') {
      const body = await request.json();
      const ws = (body && body.ws) || 'default';
      const sub = body && body.subscription;
      if (!sub || !sub.endpoint) {
        return Response.json({ error: 'missing subscription' }, { status: 400 });
      }
      const rec = await store.loadState(env, ws);
      if (!rec.subs) rec.subs = [];
      if (!rec.subs.some((s) => s.endpoint === sub.endpoint)) rec.subs.push(sub);
      await store.saveState(env, ws, rec);
      return store.setCorsHeaders(Response.json({ ok: true, count: rec.subs.length }));
    }
    return new Response('Method not allowed', { status: 405 });
  },
};

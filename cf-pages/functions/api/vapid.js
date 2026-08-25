// GET /api/vapid -> 返回 VAPID 公钥。零配置：使用 Web Crypto 在 Cloudflare Workers 内生成 P-256 密钥对并缓存到 KV。
const store = require('../_store');

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateVapid() {
  const kp = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const raw = await crypto.subtle.exportKey('raw', kp.publicKey);
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  return {
    publicKey: b64url(raw),
    privateKey: jwk.d.replace(/=+$/, ''),
    subject: 'mailto:admin@example.com',
  };
}

module.exports = {
  async onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') {
      return store.setCorsHeaders(new Response(null, { status: 204 }));
    }
    let v = null;
    if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
      v = {
        publicKey: env.VAPID_PUBLIC_KEY,
        privateKey: env.VAPID_PRIVATE_KEY,
        subject: env.VAPID_SUBJECT || 'mailto:admin@example.com',
      };
    } else {
      v = await store.getVapid(env);
      if (!v) {
        v = await generateVapid();
        await store.setVapid(env, v);
      }
    }
    return store.setCorsHeaders(Response.json({ publicKey: v ? v.publicKey : '' }));
  },
};

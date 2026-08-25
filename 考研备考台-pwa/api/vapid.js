const webpush = require('web-push');
const store = require('./_store');
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  let v = null;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    v = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY, subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com' };
  } else {
    v = await store.getVapid();
    if (!v) {
      try {
        const p = webpush.generateVAPIDKeys();
        v = { publicKey: p.publicKey, privateKey: p.privateKey, subject: 'mailto:admin@example.com' };
        await store.setVapid(v);
      } catch (e) { console.error(e); }
    }
  }
  res.json({ publicKey: v ? v.publicKey : '' });
};

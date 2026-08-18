/* 考研备考台 · 自托管 PWA
 * 1) 离线缓存应用外壳（断网秒开）
 * 2) Service Worker 后台提醒：
 *    - 应用在前台时通过 registration.showNotification({showTrigger}) 把每张卡片的复习时间点
 *      交给系统调度；即使 PWA 已关闭，到点也会弹出通知（Chromium / Android 安装版支持）。
 *    - 用户点击通知 → 打开/聚焦应用，并 postMessage 让页面跳到「巩固」页定位该卡片。
 * 说明：iOS Safari 不支持 Notification Triggers，后台触发在其上不可用时，应用内轮询仍可用。
 */
const CACHE = 'kaoyan-desk-v2';
const SHELL = ['./', 'index.html', 'icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('index.html').then(function(cached){
        const network = fetch(req).then(function(res){
          return caches.open(CACHE).then(function(c){ c.put('index.html', res.clone()); return res; });
        }).catch(function(){ return cached; });
        return cached || network;
      })
    );
    return;
  }
  e.respondWith(caches.match(req).then(function(cached){ return cached || fetch(req).catch(function(){ return cached; }); }));
});

/* 后台复习提醒：点击通知 → 跳转巩固页并定位卡片 */
self.addEventListener('notificationclick', function(e){
  const data = (e.notification && e.notification.data) || {};
  e.notification.close();
  const target = (self.location.pathname || '/') + '#review';
  e.waitUntil((self.clients.matchAll({type:'window', includeUncontrolled:true})).then(function(clients){
    for (let i=0; i<clients.length; i++){
      const c = clients[i];
      if ('focus' in c){ c.postMessage({type:'review-card', cardId: data.cardId}); try{ c.focus(); }catch(x){} return; }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target).then(function(w){ if(w) w.postMessage({type:'review-card', cardId: data.cardId}); });
  }));
});

/* 跨设备真后台推送：后端经 Web Push 推来的复习/任务提醒（应用关闭也弹） */
self.addEventListener('push', function(e){
  try{
    const d = (e.data ? e.data.json() : {}) || {};
    const data = d.data || {};
    e.waitUntil(self.registration.showNotification(d.title || '考研备考台', {
      body: d.body || '',
      data: data,
      tag: data.cardId ? ('push-'+data.cardId) : ('push-'+Date.now()),
      renotify: !!data.cardId
    }));
  }catch(err){}
});

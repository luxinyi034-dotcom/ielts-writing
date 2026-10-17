/* 离线缓存（v14，PRD 第十四部分）：先用存在设备上的那份，马上打开；同时在后台取新的存起来，下次打开就是新版本。
   发布时缓存名换成带版本号的（release_site.py），新版本装好后删掉旧缓存 */
const CACHE = 'ielts-writing-site-v14';
const SHELL = ['./', './manifest.webmanifest', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  // no-cache：向服务器确认是不是最新的（没变就不重新下载），避免把浏览器里过期的旧页面存进新缓存
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'no-cache' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const nav = req.mode === 'navigate';
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: nav });
    const fresh = fetch(req, { cache: 'no-cache' }).then(res => { if (res.status === 200) c.put(req, res.clone()).catch(() => {}); return res; });
    if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
    // 还没存过：联网取；连不上时，打开主页面用存好的 App
    return fresh.catch(async err => { const app = nav && await c.match('./'); if (app) return app; throw err; });
  }));
});

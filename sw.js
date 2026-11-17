/* 心笺 / 心契 · service worker
 * ------------------------------------------------------------------
 * 两个 app 同源，共用一个 sw（作用域是站点根），缓存也共用。
 * 策略：
 *   - 导航请求（打开页面）：network-first，先要最新的，失败才回落缓存；
 *   - 其它静态资源：stale-while-revalidate，先用缓存，同时悄悄更新。
 * 换了版本 → CACHE 名变 → activate 时删掉旧缓存并 skipWaiting，用户下次打开就是新版。
 */
var CACHE = 'chuanxun-c60c5036';
var CORE = [
    './index.html',
    './manifest.webmanifest',
    './icons/xinjian-192.png',
    './icons/xinjian-512.png',
    './icons/xinqi-192.png',
    './icons/xinqi-512.png',
    './xinqi/index.html',
    './xinqi/manifest.webmanifest'
];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(CACHE).then(function (c) {
            return c.addAll(CORE).catch(function () { });
        }).then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) {
                return k === CACHE ? null : caches.delete(k);
            }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== location.origin) return;       // 字体等跨域资源交给浏览器

    if (req.mode === 'navigate') {
        e.respondWith(
            fetch(req).then(function (r) {
                var cp = r.clone();
                caches.open(CACHE).then(function (c) { c.put(req, cp); });
                return r;
            }).catch(function () {
                return caches.match(req).then(function (hit) {
                    if (hit) return hit;
                    // 没缓存过这个 URL（比如参数不同）→ 按目录回落
                    var fallback = url.pathname.indexOf('/xinqi/') >= 0 ? './xinqi/index.html' : './index.html';
                    return caches.match(fallback);
                });
            })
        );
        return;
    }

    e.respondWith(
        caches.match(req).then(function (hit) {
            var net = fetch(req).then(function (r) {
                var cp = r.clone();
                caches.open(CACHE).then(function (c) { c.put(req, cp); });
                return r;
            }).catch(function () { return hit; });
            return hit || net;
        })
    );
});

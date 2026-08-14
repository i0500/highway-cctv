/* 앱 셸만 캐시한다.
   CCTV 목록·영상·계정 파일은 절대 캐시하지 않는다 —
   토큰이 2시간마다 바뀌고, 계정 변경(차단)이 즉시 반영돼야 하기 때문. */
/* 캐시 이름을 올리면 이전 캐시가 정리되고 새 파일을 받는다.
   앱을 고칠 때마다 숫자를 올릴 것 — 그래야 이미 설치한 사람도 최신을 받는다. */
const CACHE = 'cctv-shell-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // 외부 호스트(API·영상·지도 타일·CDN)는 그대로 통과
  if(url.origin !== self.location.origin) return;
  // 계정 파일은 항상 최신 — 차단이 즉시 먹어야 한다
  if(url.pathname.endsWith('accounts.json')) return;

  // 앱 셸: 네트워크 우선, 실패하면 캐시 (오프라인에서도 화면은 뜬다)
  e.respondWith(
    fetch(req)
      .then(res => {
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});

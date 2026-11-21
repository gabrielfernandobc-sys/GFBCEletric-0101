// =========================================================================
// SERVICE WORKER - PRO-ELÉTRICA CAD NBR 5410 (PWA OFFLINE / CACHE)
// =========================================================================
const CACHE_NAME = 'pro-eletrica-cad-v2.6';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './libs/three.min.js',
  './libs/OrbitControls.js',
  './js/nbr5410.js',
  './js/importador-dxf.js',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Bibliotecas externas usadas pela página. Scripts e CSS são carregados pela página
// em modo no-cors (resposta "opaca"); as fontes de ícones são pedidas pelo CSS em
// modo CORS — por isso cada uma é pré-carregada no modo em que será usada.
const CDN_NO_CORS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js'
];
const CDN_CORS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2'
];

function preCarregarCdn(cache) {
  const pedir = (url, mode) => fetch(new Request(url, { mode }))
    .then(resp => (resp.ok || resp.type === 'opaque') ? cache.put(url, resp) : null)
    .catch(err => console.warn('[PWA SW] Sem cache para', url, err));
  return Promise.all([
    ...CDN_NO_CORS.map(u => pedir(u, 'no-cors')),
    ...CDN_CORS.map(u => pedir(u, 'cors'))
  ]);
}

// Instalação: Pré-armazena em cache os arquivos essenciais locais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-caching offline app shell');
      return Promise.all([
        cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[PWA SW] Falha ao pré-carregar alguns assets:', err);
        }),
        preCarregarCdn(cache)
      ]);
    })
  );
  self.skipWaiting();
});

// Ativação: Limpa versões antigas do cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA SW] Removendo cache legado:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptação de Requisições: Stale-While-Revalidate para máxima agilidade e suporte offline
self.addEventListener('fetch', (event) => {
  // Apenas métodos GET
  if (event.request.method !== 'GET') return;
  // A API do servidor local (projetos salvos, status, preços) nunca é servida do cache
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Se a resposta for válida, armazena no cache para uso offline posterior
          // status 200 ou resposta "opaca" de CDN (scripts/CSS de outro domínio têm status 0)
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // Não armazena chrome-extension ou esquemas desconhecidos
              if (event.request.url.startsWith('http')) {
                cache.put(event.request, responseToCache);
              }
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Se estiver sem internet, retorna o que estiver em cache
          return cachedResponse;
        });

      // Retorna o cache se disponível para carregamento instantâneo, ou aguarda a rede
      return cachedResponse || fetchPromise;
    })
  );
});

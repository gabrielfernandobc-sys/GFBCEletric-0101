// =========================================================================
// SERVICE WORKER - PRO-ELÉTRICA CAD NBR 5410 (PWA OFFLINE / CACHE)
// =========================================================================
const CACHE_NAME = 'pro-eletrica-cad-v2.8';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './libs/three.min.js',
  './libs/OrbitControls.js',
  './js/nbr5410.js',
  './js/importador-dxf.js',
  './css/tailwind.css',
  './css/app.css',
  './js/pwa.js',
  './js/app/01-dados-estado.js',
  './js/app/02-projetos-historico.js',
  './js/app/03-editor-planta.js',
  './js/app/04-memorial-impressao.js',
  './js/app/05-instalacoes-pontos.js',
  './js/app/06-auto-lancamento.js',
  './js/app/07-importacao-cad-bim.js',
  './js/app/08-desenho-2d.js',
  './js/app/09-maquete-3d.js',
  './js/app/10-demanda.js',
  './js/app/11-circuitos.js',
  './js/app/12-quadro-qdt.js',
  './js/app/13-materiais-orcamento.js',
  './js/app/14-pesquisa-internet.js',
  './js/pesquisa-precos.js',
  './libs/fontawesome/css/all.min.css',
  './libs/fontawesome/webfonts/fa-solid-900.woff2',
  './libs/fontawesome/webfonts/fa-regular-400.woff2',
  './libs/fontawesome/webfonts/fa-brands-400.woff2',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Única biblioteca externa (SheetJS, exportação Excel): scripts de outro domínio chegam
// como resposta "opaca" (status 0), por isso é pré-carregada em modo no-cors.
// Tailwind e Font Awesome agora são arquivos locais (STATIC_ASSETS).
const CDN_NO_CORS = [
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js'
];

function preCarregarCdn(cache) {
  const pedir = (url, mode) => fetch(new Request(url, { mode }))
    .then(resp => (resp.ok || resp.type === 'opaque') ? cache.put(url, resp) : null)
    .catch(err => console.warn('[PWA SW] Sem cache para', url, err));
  return Promise.all(CDN_NO_CORS.map(u => pedir(u, 'no-cors')));
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

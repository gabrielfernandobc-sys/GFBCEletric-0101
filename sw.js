// =========================================================================
// SERVICE WORKER - PRO-ELÉTRICA CAD NBR 5410 (PWA OFFLINE / CACHE)
// =========================================================================
const CACHE_NAME = 'pro-eletrica-cad-v3.9';
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
  './js/app/15-unifilar-desenho.js',
  './js/unifilar.js',
  './js/mao-de-obra.js',
  './js/modelos-projeto.js',
  './js/app/16-mao-de-obra.js',
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

// Interceptação de requisições:
// - arquivos do próprio app (mesmo endereço): REDE PRIMEIRO, para uma atualização
//   (git pull) aparecer já na primeira abertura; o cache só é usado sem conexão.
//   (Antes era "cache primeiro": a primeira abertura depois de atualizar ainda
//   mostrava a versão antiga.)
// - bibliotecas de outros domínios (SheetJS): cache primeiro, atualizando em segundo plano.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // A API do servidor local (projetos salvos, status, pesquisa de preços) nunca é servida do cache
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;
  if (!event.request.url.startsWith('http')) return;

  const guardar = (resp) => {
    if (resp && (resp.status === 200 || resp.type === 'opaque')) {
      const copia = resp.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
    }
    return resp;
  };

  if (url.origin === self.location.origin) {
    event.respondWith(
      // cache: 'no-cache' → sempre confere com o servidor (ETag/304, barato). Sem isso o
      // cache HTTP do navegador (GitHub Pages: 10 min) ainda entregava os .js antigos
      // logo depois de uma atualização.
      fetch(event.request, { cache: 'no-cache' })
        .then(guardar)
        .catch(() => caches.match(event.request).then((r) => r || (event.request.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((emCache) => {
      const daRede = fetch(event.request).then(guardar).catch(() => emCache);
      return emCache || daRede;
    })
  );
});

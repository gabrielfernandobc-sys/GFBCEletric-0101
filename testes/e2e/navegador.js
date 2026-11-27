/* =============================================================================
   Ambiente dos testes de ponta a ponta (npm run test:e2e)
   -----------------------------------------------------------------------------
   Abre o index.html no Chromium (Playwright) servindo os arquivos do repositório
   por page.route — sem servidor externo. O endpoint /api/projetos (servidor
   local opcional) é simulado com uma pasta vazia e qualquer host externo (CDNs)
   é bloqueado, para o teste não depender de rede.

   Playwright: usa o pacote instalado no projeto ou, se não houver, o global
   (npm root -g). O navegador é o Chromium que acompanha essa instalação
   (no CI: npx playwright install --with-deps chromium).
   ============================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
const ORIGEM = 'http://pro-eletrica.teste';
const TIPOS = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json'
};

function carregarPlaywright() {
    try { return require('playwright'); } catch (e) { /* tenta a instalação global */ }
    const global = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return require(path.join(global, 'playwright'));
}

/**
 * Abre o app e devolve { navegador, pagina, erros }. `extra`: opções do contexto (ex.: deviceScaleFactor).
 * `erros` acumula exceções da página, console.error e requisições locais que falharam
 * (as externas, bloqueadas de propósito, não contam).
 */
async function abrirApp(extra) {
    const { chromium } = carregarPlaywright();
    const opcoes = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
    const navegador = await chromium.launch(opcoes);
    const contexto = await navegador.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' }, extra || {}));
    const pagina = await contexto.newPage();
    const erros = [];
    const externo = url => !String(url || '').startsWith(ORIGEM);

    pagina.on('pageerror', e => erros.push(`exceção: ${e.message} ${(e.stack || '').split('\n').slice(1, 3).join(' ').trim()}`));
    pagina.on('console', m => {
        if (m.type() !== 'error') return;
        const loc = m.location() || {};
        if (/Failed to load resource/.test(m.text()) && externo(loc.url)) return;   // CDN bloqueada
        erros.push(`console: ${m.text()}${loc.url ? ` (${loc.url}:${loc.lineNumber})` : ''}`);
    });
    pagina.on('requestfailed', r => { if (!externo(r.url())) erros.push(`requisição: ${r.url()} ${r.failure() ? r.failure().errorText : ''}`); });

    await pagina.route('**/*', rota => {
        const url = new URL(rota.request().url());
        if (url.origin !== ORIGEM) return rota.abort('blockedbyclient');
        if (url.pathname.startsWith('/api/projetos')) {
            return rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sucesso: true, projetos: [], pasta: 'projetos' }) });
        }
        if (url.pathname.startsWith('/api/')) {
            return rota.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ sucesso: false }) });
        }
        const arquivo = path.join(RAIZ, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
        if (!arquivo.startsWith(RAIZ + path.sep) || !fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) {
            return rota.fulfill({ status: 404, body: '' });
        }
        return rota.fulfill({ status: 200, contentType: TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(arquivo) });
    });

    await pagina.goto(`${ORIGEM}/index.html`, { waitUntil: 'load' });
    // `state` é declarado com let no escopo global dos scripts (não vira propriedade de window)
    await pagina.waitForFunction("typeof confirmarIniciarNovoProjeto === 'function' && typeof state === 'object'", null, { timeout: 15000 });
    return { navegador, pagina, erros };
}

module.exports = { abrirApp, RAIZ };

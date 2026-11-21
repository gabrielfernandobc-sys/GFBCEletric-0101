/* =============================================================================
   PRO-ELÉTRICA CAD — IMPORTADOR DXF (AutoCAD / LibreCAD / QCAD / DraftSight)
   -----------------------------------------------------------------------------
   Lê um arquivo DXF ASCII e devolve a geometria em METROS e os cômodos
   reconhecidos, sem acessar o DOM nem o estado do app.

   Entidades lidas (seção ENTITIES): LINE, LWPOLYLINE, POLYLINE/VERTEX,
   CIRCLE, ARC, TEXT, MTEXT. Blocos (INSERT) — portas, móveis, louças — são
   ignorados de propósito, para não serem confundidos com paredes.

   Cômodos são reconhecidos de duas formas:
     1. Polilinhas fechadas com tamanho de ambiente (contorno do cômodo);
     2. Rótulos de texto ("SALA", "QUARTO 2"...): a partir do texto, procura-se
        a parede mais próxima nas quatro direções e mede-se o retângulo interno.

   Uso no navegador:  window.ImportadorDXF.analisar(texto, { fatorMetros })
   Uso no Node.js:    require('./js/importador-dxf.js').analisar(texto)
   ============================================================================= */
(function (raiz, fabrica) {
    'use strict';
    const modulo = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = modulo;
    else raiz.ImportadorDXF = modulo;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // $INSUNITS → metros por unidade do desenho
    const UNIDADES = { 1: ['polegadas', 0.0254], 2: ['pés', 0.3048], 4: ['milímetros', 0.001], 5: ['centímetros', 0.01], 6: ['metros', 1], 14: ['decímetros', 0.1] };

    // Camadas que não representam paredes (cotas, mobiliário, hachuras, eixos...)
    const CAMADAS_IGNORADAS_PAREDES = /cota|dim|mobil|furn|movel|móvel|hach|hatch|eixo|axis|texto|text|anota|loucas|louça|equip|layout|vegeta|arvore|árvore/i;

    // Limites de um cômodo plausível (metros / m²)
    const LADO_MIN = 0.9, LADO_MAX = 40, AREA_MIN = 1.2, AREA_MAX = 600;

    // ---------------------------------------------------------------------
    // 1. LEITURA DO DXF
    // ---------------------------------------------------------------------
    function limparTexto(t) {
        return String(t || '')
            .replace(/\\U\+([0-9A-Fa-f]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)))
            .replace(/\\P/g, ' ')                         // quebra de parágrafo do MTEXT
            .replace(/\\[A-Za-z][^;\\{}]*;/g, '')         // códigos de formatação \f..; \H..; \C..;
            .replace(/\\[LlOoKk]/g, '')                   // sublinhado/sobrelinhado
            .replace(/[{}]/g, '')
            .replace(/%%[cC]/g, 'Ø').replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').replace(/%%[a-zA-Z]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function lerEntidades(texto) {
        const linhas = String(texto).split(/\r\n|\r|\n/);
        const pares = [];
        for (let i = 0; i + 1 < linhas.length; i += 2) {
            const codigo = parseInt(linhas[i].trim(), 10);
            if (isNaN(codigo)) { i -= 1; continue; }     // linha desalinhada: ressincroniza
            pares.push([codigo, linhas[i + 1].replace(/\s+$/, '')]);
        }

        let secao = null, insunits = null;
        const entidades = [];
        let atual = null, polilinha = null;

        const fechar = () => {
            if (!atual) return;
            if (atual.tipo === 'VERTEX' && polilinha) {
                if (atual.x !== undefined) polilinha.pts.push({ x: atual.x, y: atual.y });
            } else if (atual.tipo === 'POLYLINE') {
                polilinha = atual;                          // vértices chegam em VERTEX
            } else if (atual.tipo === 'SEQEND') {
                if (polilinha) { entidades.push(polilinha); polilinha = null; }
            } else {
                entidades.push(atual);
            }
            atual = null;
        };

        for (let k = 0; k < pares.length; k++) {
            const [c, v] = pares[k];
            const vt = v.trim();
            if (c === 0) {
                if (vt === 'SECTION') { fechar(); secao = null; continue; }
                if (vt === 'ENDSEC') { fechar(); secao = null; continue; }
                if (secao === 'ENTITIES') { fechar(); atual = { tipo: vt, camada: '', pts: [], flags: 0, textoPartes: [] }; }
                continue;
            }
            if (c === 2 && secao === null) { secao = vt; continue; }
            if (secao === 'HEADER' && c === 9 && vt === '$INSUNITS') {
                const prox = pares[k + 1];
                if (prox && prox[0] === 70) insunits = parseInt(prox[1].trim(), 10);
                continue;
            }
            if (secao !== 'ENTITIES' || !atual) continue;

            const num = parseFloat(vt);
            switch (c) {
                case 8: atual.camada = vt; break;
                case 70: atual.flags = parseInt(vt, 10) || 0; break;
                case 10:
                    if (atual.tipo === 'LWPOLYLINE') atual.pts.push({ x: num, y: 0 });
                    else atual.x = num;
                    break;
                case 20:
                    if (atual.tipo === 'LWPOLYLINE') { if (atual.pts.length) atual.pts[atual.pts.length - 1].y = num; }
                    else atual.y = num;
                    break;
                case 11: atual.x2 = num; break;
                case 21: atual.y2 = num; break;
                case 40: atual.r = num; break;
                case 50: atual.a1 = num; break;
                case 51: atual.a2 = num; break;
                case 1: atual.texto = v; break;
                case 3: atual.textoPartes.push(v); break;
            }
        }
        fechar();
        if (polilinha) entidades.push(polilinha);
        return { entidades, insunits };
    }

    // ---------------------------------------------------------------------
    // 2. GEOMETRIA
    // ---------------------------------------------------------------------
    function areaPoligono(pts) {
        let a = 0;
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i], q = pts[(i + 1) % pts.length];
            a += p.x * q.y - q.x * p.y;
        }
        return Math.abs(a) / 2;
    }

    function pontoNoPoligono(px, py, pts) {
        let dentro = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const a = pts[i], b = pts[j];
            if (((a.y > py) !== (b.y > py)) && (px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x)) dentro = !dentro;
        }
        return dentro;
    }

    function caixa(pts) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        pts.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
        return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
    }

    function iou(a, b) {
        const ix = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
        const iy = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
        const inter = ix * iy, uniao = a.w * a.h + b.w * b.h - inter;
        return uniao > 0 ? inter / uniao : 0;
    }

    function nomeBonito(t) {
        const s = limparTexto(t);
        if (s !== s.toUpperCase()) return s;                 // já tem minúsculas: mantém
        const menores = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em']);
        return s.toLowerCase().split(' ').map((p, i) => (i > 0 && menores.has(p)) ? p : p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }

    // Texto parece nome de ambiente? (exclui cotas, áreas, níveis, pés-direitos)
    function ehRotuloDeAmbiente(t) {
        const s = limparTexto(t);
        if (!s || s.length > 40) return false;
        if (/m²|m2\b|^\s*(á|a)rea\s*[:=]?\s*\d|^\s*(a|pd|p\.d\.?|h|nv|n\.v\.?|cota|esc(ala)?)\s*[=:.]/i.test(s)) return false;
        // títulos de prancha e legendas: "PLANTA BAIXA ESC 1:50", "CORTE AA", "FACHADA"...
        if (/\b1\s*:\s*\d+|^\s*(planta|corte|fachada|situa[cç][aã]o|implanta[cç][aã]o|prancha|legenda|escala|detalhe|cobertura)\b/i.test(s)) return false;
        const letras = (s.match(/[A-Za-zÀ-ÿ]/g) || []).length;
        const digitos = (s.match(/\d/g) || []).length;
        return letras >= 2 && letras >= digitos;
    }

    // ---------------------------------------------------------------------
    // 3. ANÁLISE COMPLETA
    // ---------------------------------------------------------------------
    /**
     * @param {string} texto conteúdo do arquivo DXF
     * @param {{fatorMetros?: number}} [opcoes] fator fixo (1, 0.01, 0.001); omita para detectar
     * @returns {{unidade: string, fatorMetros: number, unidadeDetectadaPor: string,
     *   segmentos: Array, circulos: Array, arcos: Array, textos: Array,
     *   comodos: Array<{nome, xMin, yMin, largura, comprimento, origem}>,
     *   ext: {minX, minY, maxX, maxY}, contagem: Object, totalEntidades: number}}
     *   Coordenadas em metros, eixo Y para cima (convenção do DXF).
     */
    function analisar(texto, opcoes) {
        opcoes = opcoes || {};
        const { entidades, insunits } = lerEntidades(texto);

        const contagem = {};
        entidades.forEach(e => { contagem[e.tipo] = (contagem[e.tipo] || 0) + 1; });

        // --- primitivas em unidades do desenho
        const segsBrutos = [], polisFechadas = [], circulosBrutos = [], arcosBrutos = [], textosBrutos = [];
        entidades.forEach(e => {
            if (e.tipo === 'LINE' && isFinite(e.x) && isFinite(e.y) && isFinite(e.x2) && isFinite(e.y2)) {
                segsBrutos.push({ x1: e.x, y1: e.y, x2: e.x2, y2: e.y2, camada: e.camada });
            } else if ((e.tipo === 'LWPOLYLINE' || e.tipo === 'POLYLINE') && e.pts.length >= 2) {
                const pts = e.pts.filter(p => isFinite(p.x) && isFinite(p.y));
                const primeiro = pts[0], ultimo = pts[pts.length - 1];
                const fechada = (e.flags & 1) === 1 || (pts.length > 3 && Math.hypot(primeiro.x - ultimo.x, primeiro.y - ultimo.y) < 1e-6);
                const n = pts.length;
                for (let i = 0; i < n - 1; i++) segsBrutos.push({ x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y, camada: e.camada });
                if (fechada) {
                    segsBrutos.push({ x1: ultimo.x, y1: ultimo.y, x2: primeiro.x, y2: primeiro.y, camada: e.camada });
                    const unicos = Math.hypot(primeiro.x - ultimo.x, primeiro.y - ultimo.y) < 1e-6 ? pts.slice(0, -1) : pts;
                    if (unicos.length >= 3) polisFechadas.push({ pts: unicos, camada: e.camada });
                }
            } else if (e.tipo === 'CIRCLE' && isFinite(e.x) && isFinite(e.r)) {
                circulosBrutos.push({ x: e.x, y: e.y, r: e.r });
            } else if (e.tipo === 'ARC' && isFinite(e.x) && isFinite(e.r)) {
                arcosBrutos.push({ x: e.x, y: e.y, r: e.r, a1: e.a1 || 0, a2: e.a2 || 0 });
            } else if ((e.tipo === 'TEXT' || e.tipo === 'MTEXT') && isFinite(e.x)) {
                const bruto = (e.textoPartes || []).join('') + (e.texto || '');
                const t = limparTexto(bruto);
                if (t) textosBrutos.push({ x: e.x, y: e.y, texto: t, camada: e.camada });
            }
        });

        const totalEntidades = segsBrutos.length + circulosBrutos.length + arcosBrutos.length + textosBrutos.length;
        const vazio = { unidade: '-', fatorMetros: 1, unidadeDetectadaPor: '-', segmentos: [], circulos: [], arcos: [], textos: [], comodos: [], ext: { minX: 0, minY: 0, maxX: 0, maxY: 0 }, contagem, totalEntidades: 0 };
        if (totalEntidades === 0) return vazio;

        // --- unidade: opção do usuário > $INSUNITS > tamanho do desenho
        const extBruto = caixa([].concat(...segsBrutos.map(s => [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]),
            circulosBrutos.map(c => ({ x: c.x, y: c.y })), textosBrutos.map(t => ({ x: t.x, y: t.y }))));
        let fator, unidade, por;
        if (opcoes.fatorMetros && isFinite(opcoes.fatorMetros) && opcoes.fatorMetros > 0) {
            fator = opcoes.fatorMetros; unidade = ({ 1: 'metros', 0.01: 'centímetros', 0.001: 'milímetros' })[fator] || `×${fator}`; por = 'escolha do usuário';
        } else if (UNIDADES[insunits]) {
            [unidade, fator] = UNIDADES[insunits]; por = 'cabeçalho do arquivo ($INSUNITS)';
        } else {
            const vao = Math.max(extBruto.w, extBruto.h);
            if (vao >= 2000) { fator = 0.001; unidade = 'milímetros'; }
            else if (vao >= 200) { fator = 0.01; unidade = 'centímetros'; }
            else { fator = 1; unidade = 'metros'; }
            por = 'tamanho do desenho';
        }

        // --- converte para metros
        const m = v => v * fator;
        const segmentos = segsBrutos.map(s => ({ x1: m(s.x1), y1: m(s.y1), x2: m(s.x2), y2: m(s.y2), camada: s.camada }));
        const circulos = circulosBrutos.map(c => ({ x: m(c.x), y: m(c.y), r: m(c.r) }));
        const arcos = arcosBrutos.map(a => ({ x: m(a.x), y: m(a.y), r: m(a.r), a1: a.a1, a2: a.a2 }));
        const textos = textosBrutos.map(t => ({ x: m(t.x), y: m(t.y), texto: t.texto, camada: t.camada }));
        const poligonos = polisFechadas.map(p => ({ pts: p.pts.map(q => ({ x: m(q.x), y: m(q.y) })), camada: p.camada }));
        const ext = { minX: m(extBruto.minX), minY: m(extBruto.minY), maxX: m(extBruto.maxX), maxY: m(extBruto.maxY) };

        // --- 3.1 cômodos por polilinhas fechadas
        let candidatos = poligonos
            .filter(p => !CAMADAS_IGNORADAS_PAREDES.test(p.camada || ''))
            .map(p => {
                const b = caixa(p.pts);
                const area = areaPoligono(p.pts);
                return { pts: p.pts, b, area };
            })
            .filter(c => Math.min(c.b.w, c.b.h) >= LADO_MIN && Math.max(c.b.w, c.b.h) <= LADO_MAX &&
                         c.area >= AREA_MIN && c.area <= AREA_MAX && c.area / (c.b.w * c.b.h) >= 0.75);
        // contorno externo que envolve 2+ cômodos não é um cômodo
        candidatos = candidatos.filter(a => candidatos.filter(o => o !== a &&
            pontoNoPoligono((o.b.minX + o.b.maxX) / 2, (o.b.minY + o.b.maxY) / 2, a.pts) && o.area < a.area).length < 2);
        // parede desenhada como dois contornos (face externa e interna): fica a interna
        candidatos = candidatos.filter(a => !candidatos.some(o => o !== a && o.area < a.area &&
            o.b.minX >= a.b.minX - 1e-6 && o.b.maxX <= a.b.maxX + 1e-6 && o.b.minY >= a.b.minY - 1e-6 && o.b.maxY <= a.b.maxY + 1e-6 &&
            (a.b.w - o.b.w) < 0.7 && (a.b.h - o.b.h) < 0.7));

        const comodos = candidatos.map(c => ({ b: c.b, pts: c.pts, nome: null, origem: 'polilinha' }));

        // --- 3.2 rótulos de texto
        const paredes = segmentos.filter(s => !CAMADAS_IGNORADAS_PAREDES.test(s.camada || ''));
        const verticais = paredes.filter(s => Math.abs(s.x1 - s.x2) <= 0.02 * Math.hypot(s.x2 - s.x1, s.y2 - s.y1) + 1e-6 && Math.abs(s.y1 - s.y2) > 1e-6);
        const horizontais = paredes.filter(s => Math.abs(s.y1 - s.y2) <= 0.02 * Math.hypot(s.x2 - s.x1, s.y2 - s.y1) + 1e-6 && Math.abs(s.x1 - s.x2) > 1e-6);
        const EPS = 0.02;
        // distância até a parede mais próxima a partir de (px, py) numa direção
        const acerto = (px, py, dir) => {
            let melhor = Infinity;
            if (dir === 'dir' || dir === 'esq') {
                verticais.forEach(s => {
                    if (py < Math.min(s.y1, s.y2) - EPS || py > Math.max(s.y1, s.y2) + EPS) return;
                    const d = dir === 'dir' ? ((s.x1 + s.x2) / 2 - px) : (px - (s.x1 + s.x2) / 2);
                    if (d > EPS && d < melhor) melhor = d;
                });
            } else {
                horizontais.forEach(s => {
                    if (px < Math.min(s.x1, s.x2) - EPS || px > Math.max(s.x1, s.x2) + EPS) return;
                    const d = dir === 'cima' ? ((s.y1 + s.y2) / 2 - py) : (py - (s.y1 + s.y2) / 2);
                    if (d > EPS && d < melhor) melhor = d;
                });
            }
            return melhor;
        };
        // mediana de um feixe de raios paralelos: ignora raios que escapam por vãos de porta
        const mediana = arr => { const v = arr.filter(isFinite).sort((a, b) => a - b); return v.length * 2 >= arr.length && v.length ? v[Math.floor((v.length - 1) / 2)] : Infinity; };
        const feixe = (px, py, dir, desloc) => mediana(desloc.map(o => (dir === 'dir' || dir === 'esq') ? acerto(px, py + o, dir) : acerto(px + o, py, dir)));
        // 9 deslocamentos entre a e b (80% do intervalo), para espalhar o feixe pelo cômodo
        const espalhar = (a, b) => [0, 1, 2, 3, 4, 5, 6, 7, 8].map(k => 0.8 * (a + (b - a) * k / 8));
        const raio = (px, py) => {
            // 1ª passada: feixe estreito em torno do rótulo
            const estreito = [-0.3, -0.15, 0, 0.15, 0.3];
            let d = { dir: feixe(px, py, 'dir', estreito), esq: feixe(px, py, 'esq', estreito), cima: feixe(px, py, 'cima', estreito), baixo: feixe(px, py, 'baixo', estreito) };
            if (!Object.values(d).every(isFinite)) return null;
            // 2 refinamentos: raios horizontais espalhados pela altura já medida e
            // verticais pela largura já medida (sempre partindo do rótulo)
            for (let it = 0; it < 2; it++) {
                const offY = espalhar(-d.baixo, d.cima), offX = espalhar(-d.esq, d.dir);
                d = { dir: feixe(px, py, 'dir', offY), esq: feixe(px, py, 'esq', offY), cima: feixe(px, py, 'cima', offX), baixo: feixe(px, py, 'baixo', offX) };
                if (!Object.values(d).every(isFinite)) return null;
            }
            const b = { minX: px - d.esq, maxX: px + d.dir, minY: py - d.baixo, maxY: py + d.cima };
            b.w = b.maxX - b.minX; b.h = b.maxY - b.minY;
            if (Math.min(b.w, b.h) < LADO_MIN || Math.max(b.w, b.h) > LADO_MAX || b.w * b.h > AREA_MAX) return null;
            return b;
        };

        textos.filter(t => ehRotuloDeAmbiente(t.texto)).forEach(t => {
            // dentro de um cômodo já reconhecido? dá nome a ele
            const dono = comodos.find(c => c.pts ? pontoNoPoligono(t.x, t.y, c.pts)
                : (t.x >= c.b.minX && t.x <= c.b.maxX && t.y >= c.b.minY && t.y <= c.b.maxY));
            if (dono) { if (!dono.nome) dono.nome = t.texto; return; }
            const b = raio(t.x, t.y);
            if (!b) return;
            if (comodos.some(c => iou(c.b, b) > 0.5)) return;
            comodos.push({ b, nome: t.texto, origem: 'rotulo' });
        });

        // --- saída (ordenada de cima para baixo, da esquerda para a direita)
        comodos.sort((a, b) => (b.b.maxY - a.b.maxY) || (a.b.minX - b.b.minX));
        let semNome = 0;
        const saida = comodos.map(c => ({
            nome: c.nome ? nomeBonito(c.nome) : `Ambiente ${++semNome}`,
            xMin: c.b.minX, yMin: c.b.minY,
            largura: Math.round(c.b.w * 100) / 100,
            comprimento: Math.round(c.b.h * 100) / 100,
            origem: c.origem
        }));

        return { unidade, fatorMetros: fator, unidadeDetectadaPor: por, segmentos, circulos, arcos, textos, comodos: saida, ext, contagem, totalEntidades };
    }

    return Object.freeze({ analisar, lerEntidades, limparTexto, ehRotuloDeAmbiente });
});

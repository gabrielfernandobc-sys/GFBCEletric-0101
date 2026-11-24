/* =============================================================================
   PRO-ELÉTRICA CAD — DIAGRAMA UNIFILAR NA PLANTA (NBR 5444)
   -----------------------------------------------------------------------------
   Regras sem DOM (testáveis no Node) para a representação unifilar da aba
   "Instalações": cada eletroduto é uma linha só, e os condutores que passam
   por ele são marcados com traços (fase, neutro, retorno, proteção) e o
   número do circuito, como na NBR 5444.

     1. atribuirCircuitos(): diz o circuito de cada ponto. Circuitos divididos
        por potência (ex.: "TUG - Tomadas Gerais (Circuito 1/2)") compartilham
        um grupo e os pontos são repartidos em ordem até a potência de cada um.
     2. montarTrechosComodo(): eletrodutos do cômodo (quadro → luminária,
        luminária → interruptores, tomadas e luminárias extras) e os
        condutores de cada trecho.
     3. curva()/pontoNaCurva(): geometria das linhas curvas do desenho.

   Uso no navegador: window.Unifilar     Uso no Node: require('./js/unifilar.js')
   ============================================================================= */
(function (raiz, fabrica) {
    'use strict';
    const modulo = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = modulo;
    else raiz.Unifilar = modulo;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Circuito de cada ponto e de cada cômodo (iluminação).
     * @param {Array} circuitos circuitos numerados, com escopo {tipo:'ilum'|'pontos', grupo, ids}
     * @param {Object} potIlumPorComodo potência de iluminação (VA) por id de cômodo
     * @param {Object} potPorPonto potência (VA/W) por id de ponto
     * @returns {{ilumPorComodo: Object, porPonto: Object}} valores = número do circuito
     */
    function atribuirCircuitos(circuitos, potIlumPorComodo, potPorPonto) {
        const ilumPorComodo = {}, porPonto = {};
        const grupos = new Map();
        (circuitos || []).forEach(c => {
            if (!c || !c.escopo || !Array.isArray(c.escopo.ids)) return;
            const g = c.escopo.grupo || ('circ:' + c.num);
            if (!grupos.has(g)) grupos.set(g, { tipo: c.escopo.tipo, ids: c.escopo.ids, circuitos: [] });
            grupos.get(g).circuitos.push(c);
        });
        grupos.forEach(g => {
            const destino = g.tipo === 'ilum' ? ilumPorComodo : porPonto;
            const pot = g.tipo === 'ilum' ? (potIlumPorComodo || {}) : (potPorPonto || {});
            const circs = g.circuitos;
            if (circs.length === 1) { g.ids.forEach(id => { destino[id] = circs[0].num; }); return; }
            // repartição em ordem: cada circuito recebe pontos até a sua potência
            let k = 0, acumulado = 0;
            g.ids.forEach((id, i) => {
                const p = Number(pot[id]) || 0;
                const restantes = g.ids.length - i;
                const circuitosRestantes = circs.length - k;
                const cheio = acumulado > 0 && acumulado + p > (Number(circs[k].potVal) || 0) + 1e-6;
                // passa ao próximo se este encheu, ou se faltam pontos para os circuitos seguintes
                if (k < circs.length - 1 && (cheio || (acumulado > 0 && restantes < circuitosRestantes))) { k++; acumulado = 0; }
                destino[id] = circs[k].num;
                acumulado += p;
            });
        });
        return { ilumPorComodo, porPonto };
    }

    function ehThreeWay(pt) {
        return /three|paralelo|3 ?way/i.test(String((pt && (pt.nome || pt.subTipo)) || ''));
    }

    /** Condutores de um circuito no eletroduto (sem o de proteção, que é um só por trecho). */
    function condutoresCircuito(num, polos) {
        if (polos === '3P') return [{ tipo: 'F', circ: num }, { tipo: 'F', circ: num }, { tipo: 'F', circ: num }, { tipo: 'N', circ: num }];
        return polos === '2P' ? [{ tipo: 'F', circ: num }, { tipo: 'F', circ: num }] : [{ tipo: 'F', circ: num }, { tipo: 'N', circ: num }];
    }

    function ordenarCondutores(lista) {
        const ordem = { F: 0, N: 1, R: 2, T: 3 };
        // proteção (um só por eletroduto) por último
        const chave = c => c.tipo === 'T' ? Infinity : (c.circ || 0);
        return lista.slice().sort((a, b) => (chave(a) - chave(b)) || (ordem[a.tipo] - ordem[b.tipo]));
    }

    /**
     * Eletrodutos de um cômodo e os condutores de cada um.
     * @param {Object} p
     * @param {{x:number,y:number}} p.luz         luminária principal (centro do cômodo)
     * @param {{x:number,y:number}} p.quadro      quadro de distribuição
     * @param {Array<{x,y}>} p.rotaQuadro          desvios do eletroduto quadro → luminária
     * @param {Array} p.pontos                     pontos elétricos do cômodo
     * @param {string} p.letra                     comando padrão do cômodo ("a", "b"...)
     * @param {number} p.circIlum                  circuito de iluminação do cômodo
     * @param {Object} p.circPorPonto              circuito de cada ponto (atribuirCircuitos)
     * @param {Object} p.polosPorCircuito          '1P' | '2P' por número de circuito
     * @param {boolean} p.encadearTugs             tomadas ligadas em sequência (true) ou radiais
     * @param {Set|Array} [p.interruptoresComNeutro] ids dos interruptores inteligentes (exigem neutro na caixa)
     * @returns {Array<{tipo, de, para, via?, condutores, pontoId?}>}
     */
    function montarTrechosComodo(p) {
        const trechos = [];
        const pontos = p.pontos || [];
        const polos = p.polosPorCircuito || {};
        const circDe = pt => (p.circPorPonto || {})[pt.id];
        const luz = p.luz;
        const L = p.circIlum;

        const interr = pontos.filter(pt => pt.tipo === 'INTERRUPTOR');
        const luzesExtras = pontos.filter(pt => pt.tipo === 'ILUM' && Math.hypot(pt.x - luz.x, pt.y - luz.y) > 10);
        const tugs = pontos.filter(pt => pt.tipo === 'TUG');
        const tues = pontos.filter(pt => pt.tipo === 'TUE');
        const letraDe = pt => (pt && pt.comando) || p.letra || 'a';

        // luminária → interruptores: fase + retorno(s) do comando (+ neutro no interruptor inteligente)
        const comNeutro = new Set(p.interruptoresComNeutro || []);
        interr.forEach(s => {
            const letra = letraDe(s);
            const cond = [{ tipo: 'F', circ: L }, { tipo: 'R', circ: L, letra }];
            if (ehThreeWay(s)) cond.push({ tipo: 'R', circ: L, letra });
            if (comNeutro.has(s.id)) cond.push({ tipo: 'N', circ: L });
            trechos.push({ tipo: 'interruptor', de: luz, para: s, pontoId: s.id, condutores: cond });
        });
        // luminária → luminárias extras: neutro + retorno + proteção
        luzesExtras.forEach(lx => {
            trechos.push({ tipo: 'ilum', de: luz, para: lx, pontoId: lx.id,
                condutores: [{ tipo: 'N', circ: L }, { tipo: 'R', circ: L, letra: letraDe(lx) }, { tipo: 'T' }] });
        });
        // tomadas de uso geral
        if (tugs.length) {
            if (p.encadearTugs && tugs.length > 1) {
                const seq = tugs.slice().sort((a, b) => (a.x + a.y) - (b.x + b.y));
                let anterior = luz;
                seq.forEach((t, i) => {
                    // circuitos que seguem a partir deste trecho (este ponto e os seguintes)
                    const circs = [...new Set(seq.slice(i).map(circDe).filter(n => n != null))];
                    const cond = [].concat(...circs.map(n => condutoresCircuito(n, polos[n])), [{ tipo: 'T' }]);
                    trechos.push({ tipo: 'tug', de: anterior, para: t, pontoId: t.id, condutores: cond });
                    anterior = t;
                });
            } else {
                tugs.forEach(t => {
                    const n = circDe(t);
                    trechos.push({ tipo: 'tug', de: luz, para: t, pontoId: t.id,
                        condutores: [].concat(n != null ? condutoresCircuito(n, polos[n]) : [], [{ tipo: 'T' }]) });
                });
            }
        }
        // tomadas de uso específico: circuito próprio
        tues.forEach(t => {
            const n = circDe(t);
            trechos.push({ tipo: 'tue', de: luz, para: t, pontoId: t.id,
                condutores: [].concat(n != null ? condutoresCircuito(n, polos[n]) : [], [{ tipo: 'T' }]) });
        });

        // quadro → luminária: todos os circuitos que entram no cômodo + uma proteção
        const circsComodo = new Set();
        if (L != null) circsComodo.add(L);
        tugs.concat(tues).forEach(t => { const n = circDe(t); if (n != null) circsComodo.add(n); });
        const principal = [].concat(...[...circsComodo].sort((a, b) => a - b).map(n => n === L ? condutoresCircuito(n, '1P') : condutoresCircuito(n, polos[n])));
        if (principal.length) principal.push({ tipo: 'T' });
        trechos.unshift({ tipo: 'principal', de: p.quadro, para: luz, via: p.rotaQuadro || [], condutores: principal });

        trechos.forEach(t => { t.condutores = ordenarCondutores(t.condutores); });
        return trechos;
    }

    /** Ponto de controle da curva entre a e b (arco suave como nos desenhos à mão). */
    function curva(a, b, sentido) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const flecha = Math.min(60, len * 0.18) * (sentido || 1);
        return { x: (a.x + b.x) / 2 - dy / len * flecha, y: (a.y + b.y) / 2 + dx / len * flecha };
    }

    /** Ponto e tangente unitária na curva quadrática a–c–b no parâmetro t. */
    function pontoNaCurva(a, c, b, t) {
        const u = 1 - t;
        const x = u * u * a.x + 2 * u * t * c.x + t * t * b.x;
        const y = u * u * a.y + 2 * u * t * c.y + t * t * b.y;
        let tx = 2 * u * (c.x - a.x) + 2 * t * (b.x - c.x);
        let ty = 2 * u * (c.y - a.y) + 2 * t * (b.y - c.y);
        const n = Math.hypot(tx, ty) || 1;
        return { x, y, tx: tx / n, ty: ty / n };
    }

    /** Polilinha que aproxima a curva (para detectar o mouse sobre o eletroduto). */
    function amostrarCurva(a, b, sentido, n) {
        const c = curva(a, b, sentido);
        const pts = [];
        const k = n || 12;
        for (let i = 0; i <= k; i++) { const q = pontoNaCurva(a, c, b, i / k); pts.push({ x: q.x, y: q.y }); }
        return pts;
    }

    /** Texto dos circuitos de um trecho ("1,3,5"), para o rótulo junto aos traços. */
    function rotuloCircuitos(condutores) {
        return [...new Set((condutores || []).map(c => c.circ).filter(n => n != null))].sort((a, b) => a - b).join(',');
    }

    return Object.freeze({
        atribuirCircuitos, montarTrechosComodo, condutoresCircuito, ehThreeWay,
        curva, pontoNaCurva, amostrarCurva, rotuloCircuitos
    });
});

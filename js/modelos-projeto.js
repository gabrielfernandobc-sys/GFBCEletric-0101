/* =============================================================================
   PRO-ELÉTRICA CAD — MODELOS DE PROJETO ("Novo Projeto")
   -----------------------------------------------------------------------------
   Modelos descritos em METROS: terreno (lote e recuos), cômodos posicionados
   dentro da área construível, cargas específicas (chuveiro, ar-condicionado,
   spots...) em posição relativa ao cômodo, quadro, prumada e entrada de energia.

   Antes os modelos tinham posições fixas em pixels (pensadas para 40 px/m) e
   não mudavam o terreno: em outra escala os cômodos se sobrepunham ou
   separavam, os pontos caíam fora dos cômodos e o lote do projeto anterior
   continuava na tela.

   montar(id, { escala, origem }) devolve tudo em pixels na escala pedida.
   A frente do lote fica embaixo (calçada); os fundos, em cima.

   Uso no navegador: window.ModelosProjeto   Uso no Node: require('./js/modelos-projeto.js')
   ============================================================================= */
(function (raiz, fabrica) {
    'use strict';
    const modulo = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = modulo;
    else raiz.ModelosProjeto = modulo;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const PAV_TERREO = { id: 'terreo', nome: 'Pavimento Térreo', nivel: 0, alturaPeDireito: 2.8, temLajePiso: true, tipoLajePiso: 'concreto', espessuraLajePiso: 0.20, temLajeTeto: true, tipoLajeTeto: 'concreto', espessuraLajeTeto: 0.15, tipoPassagemCabos: 'teto' };
    const PAV_SUPERIOR = Object.assign({}, PAV_TERREO, { id: 'superior', nome: '1º Pavimento (Superior)', nivel: 1 });

    // x, y: posição do cômodo (m) a partir do canto da área construível (fundos-esquerda)
    // pontos: cargas específicas; fx/fy = posição relativa dentro do cômodo (0 a 1)
    const MODELOS = Object.freeze({
        em_branco: {
            nome: 'Projeto em branco',
            terreno: { largura: 12, comprimento: 25, recuoFrontal: 4, recuoLateral: 1.5, recuoFundos: 3 },
            pavimentos: [PAV_TERREO],
            comodos: [],
            quadro: { x: 0.2, y: 0.2 }
        },
        casa_terrea: {
            nome: 'Casa térrea (4 cômodos)',
            terreno: { largura: 12, comprimento: 25, recuoFrontal: 4, recuoLateral: 1.5, recuoFundos: 3 },
            pavimentos: [PAV_TERREO],
            comodos: [
                { id: 101, pav: 'terreo', nome: 'Sala de Estar', tipo: 'geral', x: 0, y: 0, largura: 5.0, comprimento: 4.0 },
                { id: 102, pav: 'terreo', nome: 'Cozinha', tipo: 'servico', x: 5.0, y: 0, largura: 4.0, comprimento: 3.0,
                  pontos: [{ tipo: 'TUE', nome: 'Forno Elétrico de Embutir', pot: 2800, tensao: 220, altura: 'media', fx: 0.85, fy: 0.15 }] },
                { id: 103, pav: 'terreo', nome: 'Dormitório', tipo: 'geral', x: 0, y: 4.0, largura: 4.0, comprimento: 3.5 },
                { id: 104, pav: 'terreo', nome: 'Banheiro', tipo: 'servico', x: 4.0, y: 4.0, largura: 2.5, comprimento: 2.0,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico 5500 W', pot: 5500, tensao: 220, altura: 'alta', fx: 0.8, fy: 0.25 }] }
            ],
            quadro: { x: 6.6, y: 4.2 }
        },
        sobrado: {
            nome: 'Sobrado (2 pavimentos)',
            terreno: { largura: 10, comprimento: 25, recuoFrontal: 4, recuoLateral: 1.25, recuoFundos: 3 },
            pavimentos: [PAV_TERREO, PAV_SUPERIOR],
            comodos: [
                { id: 201, pav: 'terreo', nome: 'Living / Sala', tipo: 'geral', x: 0, y: 0, largura: 5.5, comprimento: 4.0 },
                { id: 203, pav: 'terreo', nome: 'Lavabo', tipo: 'servico', x: 5.5, y: 0, largura: 2.0, comprimento: 1.8 },
                { id: 202, pav: 'terreo', nome: 'Cozinha Gourmet', tipo: 'servico', x: 0, y: 4.0, largura: 4.0, comprimento: 4.0,
                  pontos: [{ tipo: 'TUE', nome: 'Cooktop por Indução 4 Bocas', pot: 7200, tensao: 220, altura: 'baixa', fx: 0.5, fy: 0.15 }] },
                { id: 204, pav: 'superior', nome: 'Suíte Master', tipo: 'geral', x: 0, y: 0, largura: 4.5, comprimento: 4.0,
                  pontos: [{ tipo: 'TUE', nome: 'Ar Condicionado 12.000 BTU', pot: 1150, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.08 }] },
                { id: 206, pav: 'superior', nome: 'Banheiro Social', tipo: 'servico', x: 4.5, y: 0, largura: 2.5, comprimento: 2.0,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico 6800 W', pot: 6800, tensao: 220, altura: 'alta', fx: 0.75, fy: 0.3 }] },
                { id: 205, pav: 'superior', nome: 'Dormitório 2', tipo: 'geral', x: 0, y: 4.0, largura: 4.0, comprimento: 3.5 }
            ],
            // escada no Living: 0,95 m × 2,60 m (horizontal), de pé no canto dos fundos
            escadas: [{ id: 'escada_sobrado_1', comodoId: 201, comodoNome: 'Living / Sala', pavimentoOrigemId: 'terreo', pavimentoDestinoId: 'superior',
                x: 0.3, y: 0.3, largura: 0.95, comprimento: 2.60, direcao: 'H_DIR', orientacao: 'H', numDegraus: 16 }],
            quadro: { x: 4.4, y: 4.3 },
            prumada: { x: 5.3, y: 2.3 }
        },
        apartamento: {
            nome: 'Apartamento studio',
            // "lote" = área privativa do apartamento (sem recuos de terreno)
            terreno: { largura: 10, comprimento: 5.5, recuoFrontal: 0.25, recuoLateral: 0.25, recuoFundos: 0.25 },
            pavimentos: [Object.assign({}, PAV_TERREO, { nome: 'Apartamento Studio', alturaPeDireito: 2.7, espessuraLajePiso: 0.18 })],
            comodos: [
                { id: 301, pav: 'terreo', nome: 'Living / Dormitório', tipo: 'geral', x: 0, y: 0, largura: 6.0, comprimento: 4.5,
                  pontos: [
                      { tipo: 'ILUM', nome: 'Spot Sala de Estar', pot: 60, tensao: 127, altura: 'teto', fx: 0.28, fy: 0.5 },
                      { tipo: 'ILUM', nome: 'Spot Espaço Dormitório', pot: 60, tensao: 127, altura: 'teto', fx: 0.72, fy: 0.5 },
                      { tipo: 'TUE', nome: 'Ar Condicionado Inverter 9.000 BTU', pot: 850, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.06 }
                  ] },
                { id: 302, pav: 'terreo', nome: 'Cozinha Americana', tipo: 'servico', x: 6.0, y: 0, largura: 3.5, comprimento: 2.5 },
                { id: 303, pav: 'terreo', nome: 'Banheiro', tipo: 'servico', x: 6.0, y: 2.5, largura: 2.2, comprimento: 2.0,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico 5500 W', pot: 5500, tensao: 220, altura: 'alta', fx: 0.75, fy: 0.3 }] }
            ],
            quadro: { x: 8.4, y: 2.7 }
        }
    });

    /** Área construível (m) do modelo: lote menos os recuos. */
    function areaConstruivel(m) {
        const t = m.terreno;
        return { largura: t.largura - 2 * t.recuoLateral, comprimento: t.comprimento - t.recuoFrontal - t.recuoFundos };
    }

    /**
     * Monta o modelo em pixels.
     * @param {string} id
     * @param {{escala:number, origem?:{x:number,y:number}}} op escala (px/m) e canto superior-esquerdo do lote (px)
     */
    function montar(id, op) {
        const m = MODELOS[id] || MODELOS.em_branco;
        const E = Number(op && op.escala) || 40;
        const origem = (op && op.origem) || { x: 40, y: 40 };
        const t = m.terreno;
        const ox = origem.x + t.recuoLateral * E;          // canto da área construível (fundos-esquerda)
        const oy = origem.y + t.recuoFundos * E;
        const px = v => Math.round(v * E * 100) / 100;

        const comodos = m.comodos.map(c => ({
            id: c.id, pavimentoId: c.pav, nome: c.nome, tipo: c.tipo,
            largura: c.largura, comprimento: c.comprimento,
            area: Math.round(c.largura * c.comprimento * 100) / 100,
            perimetro: Math.round(2 * (c.largura + c.comprimento) * 100) / 100,
            x: ox + px(c.x), y: oy + px(c.y),
            cargas: [], passagemTomadas: 'horizontal', espessuraParede: null
        }));
        const pontos = [];
        m.comodos.forEach((c, i) => (c.pontos || []).forEach((p, k) => {
            const cx = comodos[i];
            pontos.push({
                id: `pt_${id}_${c.id}_${k}`, comodoId: c.id, pavimentoId: c.pav,
                tipo: p.tipo, nome: p.nome, pot: p.pot, tensao: p.tensao, altura: p.altura,
                x: cx.x + px(c.largura * p.fx), y: cx.y + px(c.comprimento * p.fy)
            });
        }));
        const escadas = (m.escadas || []).map(e => Object.assign({}, e, { x: ox + px(e.x), y: oy + px(e.y) }));
        const q = m.quadro || { x: 0.2, y: 0.2 };
        const qdtPos = { x: ox + px(q.x), y: oy + px(q.y), w: 45, h: 26 };
        const pr = m.prumada || { x: q.x + 1.3, y: q.y + 0.1 };
        const prumadaPos = { x: ox + px(pr.x), y: oy + px(pr.y), w: 20, h: 20 };
        // entrada da concessionária: na calçada/frente do lote, à esquerda
        const alimentacao = { x: origem.x + px(0.3), y: origem.y + px(t.comprimento) - 36 - 4, w: 75, h: 36 };
        return {
            id, nome: m.nome,
            terreno: Object.assign({ ativo: true, customizado: false }, t, { x: origem.x, y: origem.y }),
            pavimentos: m.pavimentos.map(p => Object.assign({}, p)),
            comodos, pontos, escadas, qdtPos, prumadaPos, alimentacao
        };
    }

    return Object.freeze({ MODELOS, areaConstruivel, montar });
});

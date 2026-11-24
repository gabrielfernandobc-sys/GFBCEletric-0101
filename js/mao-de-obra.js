/* =============================================================================
   PRO-ELÉTRICA CAD — MÃO DE OBRA DO ORÇAMENTO
   -----------------------------------------------------------------------------
   Regras sem DOM (testáveis no Node) para estimar a mão de obra da instalação
   a partir das quantidades que o app já calcula (pontos, dispositivos do
   quadro, metragem do alimentador, área construída e total de material).

   Modos de cálculo:
     • 'ponto'      — por ponto/serviço (padrão);
     • 'percentual' — percentual sobre o total de material;
     • 'm2'         — por m² construído;
     • 'horas'      — horas de eletricista e ajudante (horas estimadas por serviço).

   Valores de referência: médias de mercado para o INTERIOR DE SP (pesquisa de
   nov/2026 em guias de preço de eletricista e no custo horário do SINAPI-SP).
   São aproximados: confirme com profissionais da região ou no SINAPI.

   Uso no navegador: window.MaoDeObra     Uso no Node: require('./js/mao-de-obra.js')
   ============================================================================= */
(function (raiz, fabrica) {
    'use strict';
    const modulo = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = modulo;
    else raiz.MaoDeObra = modulo;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const DATA_TABELA = 'nov/2026';
    const REGIAO_TABELA = 'interior de SP';

    // Serviços da tabela de referência. `valor` é o preço (R$) por unidade e `horas`
    // a estimativa de horas da equipe (eletricista + ajudante) por unidade.
    const SERVICOS = Object.freeze([
        { id: 'ponto',            nome: 'Ponto de tomada, luz ou interruptor (obra nova: rasgo, eletroduto, fiação e acabamento)', unidade: 'pt', valor: 110,  horas: 1.5,  busca: 'preço mão de obra eletricista ponto de tomada obra nova' },
        { id: 'pontoEspecifico',  nome: 'Ponto de uso específico (chuveiro, torneira, ar-condicionado, forno...)',                 unidade: 'pt', valor: 220,  horas: 3,    busca: 'preço mão de obra eletricista instalação ponto chuveiro ar condicionado' },
        { id: 'luminaria',        nome: 'Instalação de luminária ou plafon',                                                        unidade: 'un', valor: 70,   horas: 0.75, busca: 'preço instalação luminária plafon eletricista' },
        { id: 'quadroMontagem',   nome: 'Montagem do quadro de distribuição',                                                       unidade: 'un', valor: 600,  horas: 6,    busca: 'preço mão de obra montagem quadro de distribuição eletricista' },
        { id: 'dispositivo',      nome: 'Instalação de disjuntor, IDR ou DPS no quadro',                                            unidade: 'un', valor: 50,   horas: 0.4,  busca: 'preço instalação disjuntor DR DPS eletricista' },
        { id: 'aterramento',      nome: 'Aterramento (haste, caixa de inspeção e conexões)',                                       unidade: 'cj', valor: 300,  horas: 3,    busca: 'preço mão de obra aterramento haste eletricista' },
        { id: 'padraoEntrada',    nome: 'Padrão de entrada (montagem conforme a concessionária)',                                   unidade: 'cj', valor: 1200, horas: 12,   busca: 'preço mão de obra instalação padrão de entrada energia' },
        { id: 'alimentadorMetro', nome: 'Alimentador (medidor → quadro)',                                                           unidade: 'm',  valor: 15,   horas: 0.15, busca: 'preço mão de obra passagem de cabo alimentador por metro' },
        { id: 'percentualMaterial', nome: 'Percentual sobre o material',                                                            unidade: '%',  valor: 45,   busca: 'percentual mão de obra instalação elétrica sobre material' },
        { id: 'porM2',            nome: 'Instalação elétrica por m² construído',                                                    unidade: 'm²', valor: 60,   busca: 'preço mão de obra instalação elétrica por m² construído' },
        { id: 'horaEletricista',  nome: 'Hora do eletricista',                                                                      unidade: 'h',  valor: 90,   busca: 'valor hora eletricista' },
        { id: 'horaAjudante',     nome: 'Hora do ajudante de eletricista',                                                          unidade: 'h',  valor: 40,   busca: 'valor hora ajudante de eletricista' }
    ]);

    const MODOS = Object.freeze({
        ponto: 'Por ponto / serviço',
        percentual: 'Percentual sobre o material',
        m2: 'Por m² construído',
        horas: 'Por horas (eletricista e ajudante)'
    });

    /** Tabela de preços padrão { id: valor }. */
    function tabelaPadrao() {
        const t = {};
        SERVICOS.forEach(s => { t[s.id] = s.valor; });
        return t;
    }

    /** Horas estimadas padrão por unidade de serviço { id: horas }. */
    function horasPadrao() {
        const h = {};
        SERVICOS.forEach(s => { if (s.horas !== undefined) h[s.id] = s.horas; });
        return h;
    }

    function servico(id) { return SERVICOS.find(s => s.id === id); }

    const num = v => { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; };
    const arred = v => Math.round(v * 100) / 100;

    /** Valores da tabela com os editados por cima (ignora chaves desconhecidas e valores inválidos). */
    function mesclarTabela(editada) {
        const t = tabelaPadrao();
        Object.keys(editada || {}).forEach(k => {
            if (k in t && isFinite(Number(editada[k])) && Number(editada[k]) >= 0) t[k] = Number(editada[k]);
        });
        return t;
    }

    /**
     * Linhas de serviço por ponto (base dos modos 'ponto' e 'horas').
     * @param {Object} q quantidades: tomadas, luzes, interruptores, especificos, luminarias,
     *                   quadros, dispositivos, alimentadorMetros, incluirAterramento, incluirPadrao
     */
    function linhasDeServico(q) {
        const pontos = num(q.tomadas) + num(q.luzes) + num(q.interruptores);
        const linhas = [
            { id: 'ponto', qtd: pontos },
            { id: 'pontoEspecifico', qtd: num(q.especificos) },
            { id: 'luminaria', qtd: num(q.luminarias) },
            { id: 'quadroMontagem', qtd: q.quadros === undefined ? 1 : num(q.quadros) },
            { id: 'dispositivo', qtd: num(q.dispositivos) },
            { id: 'alimentadorMetro', qtd: Math.ceil(num(q.alimentadorMetros)) },
            { id: 'aterramento', qtd: q.incluirAterramento === false ? 0 : 1 },
            { id: 'padraoEntrada', qtd: q.incluirPadrao ? 1 : 0 }
        ];
        return linhas.filter(l => l.qtd > 0);
    }

    /**
     * Mão de obra no modo escolhido.
     * @param {Object} q quantidades (linhasDeServico) + areaConstruida (m²) + totalMaterial (R$)
     * @param {Object} opcoes { modo, tabela (valores editados), horas (horas editadas) }
     * @returns {{modo, itens: Array<{id, servico, qtd, unidade, preco, subtotal, horas?}>, total, horasTotais?}}
     */
    function calcular(q, opcoes) {
        const op = opcoes || {};
        const modo = MODOS[op.modo] ? op.modo : 'ponto';
        const t = mesclarTabela(op.tabela);
        const horasTab = Object.assign(horasPadrao(), op.horas || {});
        const item = (id, qtd, preco, extra) => {
            const s = servico(id);
            return Object.assign({ id, servico: s.nome, qtd, unidade: s.unidade, preco, subtotal: arred(qtd * preco) }, extra || {});
        };
        let itens = [], horasTotais;
        const padrao = q.incluirPadrao ? [item('padraoEntrada', 1, t.padraoEntrada)] : [];

        if (modo === 'ponto') {
            itens = linhasDeServico(q).map(l => item(l.id, l.qtd, t[l.id]));
        } else if (modo === 'percentual') {
            const base = num(q.totalMaterial);
            itens = [Object.assign(item('percentualMaterial', 1, arred(base * t.percentualMaterial / 100)),
                { servico: `Mão de obra: ${t.percentualMaterial}% sobre o material (R$ ${base.toFixed(2).replace('.', ',')})`, unidade: 'vb' })].concat(padrao);
        } else if (modo === 'm2') {
            const area = arred(num(q.areaConstruida));
            itens = [item('porM2', area, t.porM2)].concat(padrao);
        } else {
            // horas da equipe: cada serviço × horas estimadas; eletricista e ajudante trabalham juntos
            const detalhe = linhasDeServico(q).map(l => ({ id: l.id, servico: servico(l.id).nome, qtd: l.qtd, horas: arred(l.qtd * (Number(horasTab[l.id]) || 0)) }));
            horasTotais = Math.ceil(detalhe.reduce((s, d) => s + d.horas, 0));
            itens = [
                item('horaEletricista', horasTotais, t.horaEletricista, { detalhe }),
                item('horaAjudante', horasTotais, t.horaAjudante)
            ].filter(i => i.qtd > 0);
        }
        itens = itens.filter(i => i.qtd > 0);
        const total = arred(itens.reduce((s, i) => s + i.subtotal, 0));
        return { modo, itens, total, horasTotais };
    }

    /** Totais do orçamento: material, mão de obra, BDI (% sobre os dois) e total geral. */
    function totais(totalMaterial, totalMaoDeObra, bdiPct) {
        const material = arred(num(totalMaterial));
        const maoDeObra = arred(num(totalMaoDeObra));
        const pct = Math.max(0, Number(bdiPct) || 0);
        const bdi = arred((material + maoDeObra) * pct / 100);
        return { material, maoDeObra, bdiPct: pct, bdi, total: arred(material + maoDeObra + bdi) };
    }

    /** Links de busca para conferir o preço de um serviço (abrem numa nova aba). */
    function linksDeBusca(idServico, regiao) {
        const s = servico(idServico);
        const q = `${s ? s.busca : idServico} ${regiao || REGIAO_TABELA}`.trim();
        const e = encodeURIComponent;
        return [
            { id: 'google', nome: 'Google', icone: 'fa-google', marca: true, url: `https://www.google.com/search?q=${e(q)}` },
            { id: 'getninjas', nome: 'GetNinjas', icone: 'fa-user-gear', url: `https://www.google.com/search?q=${e(q + ' site:getninjas.com.br')}` },
            { id: 'habitissimo', nome: 'Habitissimo', icone: 'fa-house-chimney', url: `https://www.google.com/search?q=${e(q + ' site:habitissimo.com.br')}` },
            { id: 'sinapi', nome: 'SINAPI (Caixa)', icone: 'fa-building-columns', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' }
        ];
    }

    return Object.freeze({
        DATA_TABELA, REGIAO_TABELA, SERVICOS, MODOS,
        tabelaPadrao, horasPadrao, servico, mesclarTabela, linhasDeServico, calcular, totais, linksDeBusca
    });
});

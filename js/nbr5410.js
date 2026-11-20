/* =============================================================================
   PRO-ELÉTRICA CAD — NÚCLEO DE CÁLCULO NBR 5410
   -----------------------------------------------------------------------------
   Regras de dimensionamento de circuitos terminais e de demanda, isoladas da
   interface. Nenhuma função aqui acessa o DOM nem o objeto global `state`:
   tudo entra por parâmetro e sai por retorno, para poder ser testado e
   auditado de forma independente.

   Uso no navegador:  <script src="js/nbr5410.js"></script>  →  window.NBR5410
   Uso no Node.js:    const NBR5410 = require('./js/nbr5410.js');
   ============================================================================= */
(function (raiz, fabrica) {
    'use strict';
    const modulo = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = modulo;
    else raiz.NBR5410 = modulo;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // =========================================================================
    // 1. CONSTANTES NORMATIVAS
    // =========================================================================

    // Resistividade do cobre a 70 °C (temperatura de serviço em regime contínuo
    // do PVC), em Ω·mm²/m — NBR 5410 Anexo J / Tabela 35.
    const RESISTIVIDADE_COBRE_70C = 0.0221;

    // Seções nominais comerciais de condutores de cobre (mm²) usadas pelo app.
    const SECOES_PADRONIZADAS = [1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0];

    // Capacidade de condução de corrente Iz (A) — NBR 5410 Tabela 36,
    // método de referência B1, condutores de cobre isolados em PVC 70 °C,
    // 2 condutores carregados, temperatura ambiente 30 °C.
    // OBS.: valores sem fatores de correção de agrupamento (FCA) e temperatura (FCT).
    const IZ_METODO_B1 = { 1.5: 17.5, 2.5: 24, 4.0: 32, 6.0: 41, 10.0: 57, 16.0: 76, 25.0: 101 };

    // Iz assumida quando a seção não está na tabela (comportamento legado do app).
    const IZ_PADRAO_SECAO_DESCONHECIDA = 24;

    // Queda de tensão máxima em circuitos terminais (%) — NBR 5410 item 6.2.7.
    const QUEDA_TENSAO_MAX_PCT = 4.0;

    // Seções mínimas de condutores (mm²) — NBR 5410 Tabela 47.
    const SECAO_MINIMA_ILUMINACAO = 1.5;
    const SECAO_MINIMA_FORCA = 2.5;

    // Limites de potência por circuito usados na divisão automática de circuitos.
    const LIMITE_POT_ILUMINACAO_VA = 1200; // ~9,4 A a 127 V (disjuntor 10 A / cabo 1,5 mm²)
    const LIMITE_POT_TUG_VA = 2200;        // ~17,3 A a 127 V (disjuntor 20 A / cabo 2,5 mm²)

    // Fator de potência residencial normativo adotado no cálculo de demanda.
    const FATOR_POTENCIA_RESIDENCIAL = 0.95;

    // Fator de demanda aplicado às cargas que não são aquecimento nem ar-condicionado.
    const FD_OUTRAS_CARGAS = 0.70;

    // =========================================================================
    // 2. FUNÇÕES AUXILIARES
    // =========================================================================

    /** Iz (A) da seção no método B1; seção fora da tabela → 24 A (legado). */
    function izMetodoB1(secaoMm2) {
        return IZ_METODO_B1[secaoMm2] || IZ_PADRAO_SECAO_DESCONHECIDA;
    }

    /** Formata a seção como no restante do app: 2.5 → "2.5 mm²", 6 → "6 mm²". */
    function formatarSecao(secaoMm2) {
        return `${secaoMm2.toFixed(1).replace('.0', '')} mm²`;
    }

    /** Cargas resistivas (curva B): chuveiro, torneira, aquecedor, boiler. */
    function ehCargaResistiva(nome) {
        const n = (nome || '').toLowerCase();
        return n.includes('chuveiro') || n.includes('torneira') || n.includes('aquecedor') || n.includes('boiler');
    }

    /**
     * Cabo e disjuntor iniciais de um circuito TUE em função da corrente de projeto.
     * @param {number} ib Corrente de projeto (A)
     * @returns {{cabo: string, disj: string}}
     */
    function selecionarProtecaoTUE(ib) {
        let cabo = '2.5 mm²';
        let disj = '20 A';
        if (ib <= 12) { cabo = '2.5 mm²'; disj = '16 A'; }
        else if (ib <= 17.5) { cabo = '2.5 mm²'; disj = '20 A'; }
        else if (ib <= 24) { cabo = '4.0 mm²'; disj = '25 A'; }
        else if (ib <= 32) { cabo = '6.0 mm²'; disj = '32 A'; }
        else if (ib <= 41) { cabo = '10.0 mm²'; disj = '40 A'; }
        else if (ib <= 57) { cabo = '16.0 mm²'; disj = '50 A'; }
        else { cabo = '25.0 mm²'; disj = '63 A'; }
        return { cabo, disj };
    }

    /**
     * Queda de tensão em circuito monofásico (fase-neutro ou fase-fase, ida e volta):
     * ΔV = 2 · ρ · L · Ib / S
     * @returns {{volts: number, pct: number}}
     */
    function calcularQuedaTensao(ib, comprimentoM, secaoMm2, tensaoV) {
        const volts = (2 * RESISTIVIDADE_COBRE_70C * comprimentoM * ib) / secaoMm2;
        return { volts, pct: (volts / tensaoV) * 100 };
    }

    /** Diâmetro nominal do eletroduto para a seção (taxa de ocupação ≤ 40%, item 6.2.11). */
    function dimensionarEletroduto(secaoMm2) {
        if (secaoMm2 >= 16.0) return 'DN 40 mm (1.1/4")';
        if (secaoMm2 >= 10.0) return 'DN 32 mm (1")';
        if (secaoMm2 >= 4.0) return 'DN 25 mm (3/4")';
        if (secaoMm2 >= 2.5) return 'DN 20/25 mm (3/4")';
        return 'DN 20 mm (1/2")';
    }

    /** Circuito em área molhada ou de potência (IDR 30 mA obrigatório — item 5.1.3.2.2). */
    function ehAreaMolhadaOuPotencia(circ) {
        const nomeLower = (circ.nome || '').toLowerCase();
        return circ.tipo === 'TUE' || nomeLower.includes('cozinha') || nomeLower.includes('banheiro') ||
            nomeLower.includes('serviço') || nomeLower.includes('lavanderia') || nomeLower.includes('extern');
    }

    // =========================================================================
    // 3. DIMENSIONAMENTO DE CIRCUITO TERMINAL
    // =========================================================================

    /**
     * Dimensiona disjuntor, seção, queda de tensão, eletroduto e IDR de um circuito.
     *
     * Entrada (campos lidos de `circ`):
     *   tipo ('Iluminação' | 'TUG' | 'TUE'), nome, tensao (V), ibVal (A),
     *   cabo ("2.5 mm²"), disj ("20 A"), rota (m), ehManual, distanciaCritica (m)
     *
     * Saída: o próprio `circ`, com cabo/disj atualizados e os campos
     *   secaoMm2, bitola, disjuntor, deltaVVolts, deltaVPct, quedaTensaoOk,
     *   quedaStatus, eletroduto, requerIdr, idrTag, ampacidadeOk.
     */
    function dimensionarCircuito(circ) {
        // 0. Capacidade de corrente / sobrecarga (item 5.3 e Tabela 36): Ib ≤ In ≤ Iz
        let inDisj = parseFloat(circ.disj.replace(' A', '')) || 20;
        const secaoMinPorTipo = (circ.tipo === 'Iluminação') ? SECAO_MINIMA_ILUMINACAO : SECAO_MINIMA_FORCA;
        let secaoNum = Math.max(secaoMinPorTipo, parseFloat(circ.cabo.replace(' mm²', '').replace(',', '.')) || secaoMinPorTipo);

        if (circ.ibVal > inDisj || inDisj > izMetodoB1(secaoNum)) {
            if (circ.ibVal <= 10 && circ.tipo === 'Iluminação') { inDisj = 10; secaoNum = Math.max(secaoNum, 1.5); }
            else if (circ.ibVal <= 16) { inDisj = 16; secaoNum = Math.max(secaoNum, 2.5); }
            else if (circ.ibVal <= 20) { inDisj = 20; secaoNum = Math.max(secaoNum, 2.5); }
            else if (circ.ibVal <= 25) { inDisj = 25; secaoNum = Math.max(secaoNum, 4.0); }
            else if (circ.ibVal <= 32) { inDisj = 32; secaoNum = Math.max(secaoNum, 6.0); }
            else if (circ.ibVal <= 40) { inDisj = 40; secaoNum = Math.max(secaoNum, 10.0); }
            else if (circ.ibVal <= 50) { inDisj = 50; secaoNum = Math.max(secaoNum, 16.0); }
            else { inDisj = 63; secaoNum = Math.max(secaoNum, 25.0); }
            circ.disj = `${inDisj} A`;
            circ.cabo = formatarSecao(secaoNum);
        }

        // 1. Queda de tensão (item 6.2.7): máximo 4% em circuitos terminais.
        //    Se exceder, aumenta a seção comercial até atender (ou até a maior disponível).
        const distParaDeltaV = circ.ehManual ? circ.rota : (circ.distanciaCritica || circ.rota);
        let queda = calcularQuedaTensao(circ.ibVal, distParaDeltaV, secaoNum, circ.tensao);

        let idxBitola = SECOES_PADRONIZADAS.indexOf(secaoNum);
        if (idxBitola === -1) idxBitola = 1;

        while (queda.pct > QUEDA_TENSAO_MAX_PCT && idxBitola < SECOES_PADRONIZADAS.length - 1) {
            idxBitola++;
            secaoNum = SECOES_PADRONIZADAS[idxBitola];
            circ.cabo = formatarSecao(secaoNum);
            queda = calcularQuedaTensao(circ.ibVal, distParaDeltaV, secaoNum, circ.tensao);
        }

        circ.secaoMm2 = secaoNum;
        circ.bitola = secaoNum;
        circ.disjuntor = inDisj;
        circ.deltaVVolts = queda.volts;
        circ.deltaVPct = queda.pct;
        circ.quedaTensaoOk = (queda.pct <= QUEDA_TENSAO_MAX_PCT);
        circ.quedaStatus = `${queda.pct.toFixed(1)}% (OK ≤ 4%)`;

        // 2. Eletroduto (item 6.2.11 — taxa de ocupação máxima 40%)
        circ.eletroduto = dimensionarEletroduto(secaoNum);

        // 3. Proteção diferencial-residual (IDR 30 mA — item 5.1.3.2.2)
        circ.requerIdr = true;
        circ.idrTag = ehAreaMolhadaOuPotencia(circ) ? 'IDR 30mA (Obrigatório)' : 'IDR 30mA (Geral)';

        // 4. Verificação final da regra de ampacidade Ib ≤ In ≤ Iz
        circ.ampacidadeOk = (circ.ibVal <= inDisj && inDisj <= izMetodoB1(secaoNum));

        return circ;
    }

    // =========================================================================
    // 4. BANCO DE DADOS DE CONCESSIONÁRIAS / DISTRIBUIDORAS (NBR 5410 ITEM 9.5.2)
    // =========================================================================
    const CONCESSIONARIAS = {
        cpfl: {
            id: 'cpfl',
            nome: 'CPFL Energia / RGE',
            norma: 'GED 13 / NTD 01',
            ufs: ['SP', 'RS'],
            tensao: '127/220V',
            descricao: 'CPFL Paulista, CPFL Piratininga, CPFL Santa Cruz e RGE Sul. Fornecimento em Baixa Tensão.',
            tabelaIlumTug: [
                { de: 0, ate: 1.0, fd: 0.86 },
                { de: 1.0, ate: 2.0, fd: 0.75 },
                { de: 2.0, ate: 3.0, fd: 0.65 },
                { de: 3.0, ate: 4.0, fd: 0.55 },
                { de: 4.0, ate: 5.0, fd: 0.50 },
                { de: 5.0, ate: 6.0, fd: 0.45 },
                { de: 6.0, ate: 7.0, fd: 0.40 },
                { de: 7.0, ate: 8.0, fd: 0.35 },
                { de: 8.0, ate: 9.0, fd: 0.31 },
                { de: 9.0, ate: 10.0, fd: 0.27 },
                { de: 10.0, ate: 999, fd: 0.24 }
            ],
            fdAquecimento: [1.00, 0.75, 0.70, 0.66, 0.60, 0.55, 0.50, 0.45, 0.40, 0.38],
            fdArCond: [1.00, 1.00, 0.86, 0.82, 0.76, 0.70, 0.65, 0.60],
            categorias: [
                { id: 'M1', tipo: 'Monofásico', kvaMax: 8.0, disj: '40 A', cabo: '10.0 mm²', tubo: '25 mm (3/4")' },
                { id: 'M2', tipo: 'Monofásico', kvaMax: 10.0, disj: '50 A', cabo: '10.0 mm²', tubo: '25 mm (3/4")' },
                { id: 'B1', tipo: 'Bifásico', kvaMax: 15.0, disj: '50 A', cabo: '10.0 mm²', tubo: '32 mm (1")' },
                { id: 'B2', tipo: 'Bifásico', kvaMax: 20.0, disj: '63 A', cabo: '16.0 mm²', tubo: '32 mm (1")' },
                { id: 'B3', tipo: 'Bifásico', kvaMax: 25.0, disj: '70 A', cabo: '16.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'C1', tipo: 'Trifásico', kvaMax: 28.0, disj: '50 A', cabo: '16.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'C2', tipo: 'Trifásico', kvaMax: 38.0, disj: '63 A', cabo: '25.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'C3', tipo: 'Trifásico', kvaMax: 48.0, disj: '80 A', cabo: '35.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'C4', tipo: 'Trifásico', kvaMax: 60.0, disj: '100 A', cabo: '50.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'C5', tipo: 'Trifásico', kvaMax: 75.0, disj: '125 A', cabo: '70.0 mm²', tubo: '60 mm (2")' }
            ]
        },
        cemig: {
            id: 'cemig',
            nome: 'CEMIG Distribuição',
            norma: 'ND-5.1 / ND-5.2',
            ufs: ['MG'],
            tensao: '127/220V',
            descricao: 'Norma de Distribuição ND-5.1 (Fornecimento a Edificações Individuais) e ND-5.2 (Coletivas) - Minas Gerais.',
            tabelaIlumTug: [
                { de: 0, ate: 1.0, fd: 0.86 },
                { de: 1.0, ate: 2.0, fd: 0.75 },
                { de: 2.0, ate: 3.0, fd: 0.65 },
                { de: 3.0, ate: 4.0, fd: 0.55 },
                { de: 4.0, ate: 5.0, fd: 0.50 },
                { de: 5.0, ate: 6.0, fd: 0.45 },
                { de: 6.0, ate: 7.0, fd: 0.40 },
                { de: 7.0, ate: 8.0, fd: 0.35 },
                { de: 8.0, ate: 9.0, fd: 0.31 },
                { de: 9.0, ate: 10.0, fd: 0.27 },
                { de: 10.0, ate: 999, fd: 0.24 }
            ],
            fdAquecimento: [1.00, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50, 0.45, 0.40, 0.37],
            fdArCond: [1.00, 1.00, 0.86, 0.80, 0.75, 0.70, 0.65, 0.60],
            categorias: [
                { id: 'Atend. A', tipo: 'Monofásico', kvaMax: 10.0, disj: '50 A', cabo: '10.0 mm²', tubo: '25 mm (3/4")' },
                { id: 'Atend. B', tipo: 'Bifásico', kvaMax: 15.0, disj: '50 A', cabo: '10.0 mm²', tubo: '32 mm (1")' },
                { id: 'Atend. B2', tipo: 'Bifásico', kvaMax: 22.0, disj: '63 A', cabo: '16.0 mm²', tubo: '32 mm (1")' },
                { id: 'Atend. C1', tipo: 'Trifásico', kvaMax: 30.0, disj: '50 A', cabo: '16.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'Atend. C2', tipo: 'Trifásico', kvaMax: 40.0, disj: '63 A', cabo: '25.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'Atend. C3', tipo: 'Trifásico', kvaMax: 50.0, disj: '80 A', cabo: '35.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'Atend. C4', tipo: 'Trifásico', kvaMax: 65.0, disj: '100 A', cabo: '50.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'Atend. C5', tipo: 'Trifásico', kvaMax: 76.0, disj: '125 A', cabo: '70.0 mm²', tubo: '60 mm (2")' }
            ]
        },
        enel_sp: {
            id: 'enel_sp',
            nome: 'ENEL Distribuição São Paulo',
            norma: 'NTC 8410 / CNS-OMBR-ENG-21',
            ufs: ['SP'],
            tensao: '115/230V ou 127/220V',
            descricao: 'Regulamentação Técnica para Conexão de Instalações de Consumidores em BT - Região Metropolitana de SP.',
            tabelaIlumTug: [
                { de: 0, ate: 1.0, fd: 0.80 },
                { de: 1.0, ate: 2.0, fd: 0.75 },
                { de: 2.0, ate: 3.0, fd: 0.65 },
                { de: 3.0, ate: 4.0, fd: 0.55 },
                { de: 4.0, ate: 5.0, fd: 0.50 },
                { de: 5.0, ate: 6.0, fd: 0.45 },
                { de: 6.0, ate: 7.0, fd: 0.40 },
                { de: 7.0, ate: 8.0, fd: 0.35 },
                { de: 8.0, ate: 9.0, fd: 0.31 },
                { de: 9.0, ate: 10.0, fd: 0.27 },
                { de: 10.0, ate: 999, fd: 0.24 }
            ],
            fdAquecimento: [1.00, 0.92, 0.84, 0.76, 0.70, 0.65, 0.60, 0.56, 0.52, 0.49],
            fdArCond: [1.00, 1.00, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60],
            categorias: [
                { id: 'M1', tipo: 'Monofásico', kvaMax: 10.0, disj: '50 A', cabo: '10.0 mm²', tubo: '25 mm (3/4")' },
                { id: 'B1', tipo: 'Bifásico', kvaMax: 16.0, disj: '50 A', cabo: '10.0 mm²', tubo: '32 mm (1")' },
                { id: 'B2', tipo: 'Bifásico', kvaMax: 22.0, disj: '63 A', cabo: '16.0 mm²', tubo: '32 mm (1")' },
                { id: 'T1', tipo: 'Trifásico', kvaMax: 30.0, disj: '50 A', cabo: '16.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'T2', tipo: 'Trifásico', kvaMax: 40.0, disj: '63 A', cabo: '25.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'T3', tipo: 'Trifásico', kvaMax: 50.0, disj: '80 A', cabo: '35.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'T4', tipo: 'Trifásico', kvaMax: 65.0, disj: '100 A', cabo: '50.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'T5', tipo: 'Trifásico', kvaMax: 75.0, disj: '125 A', cabo: '70.0 mm²', tubo: '60 mm (2")' }
            ]
        },
        copel: {
            id: 'copel',
            nome: 'COPEL Distribuição',
            norma: 'NTC 901100 / NTC 901110',
            ufs: ['PR'],
            tensao: '127/220V',
            descricao: 'Norma Técnica Copel para Atendimento a Edificações de Baixa Tensão Individuais e Coletivas - Paraná.',
            tabelaIlumTug: [
                { de: 0, ate: 1.0, fd: 0.86 },
                { de: 1.0, ate: 2.0, fd: 0.75 },
                { de: 2.0, ate: 3.0, fd: 0.65 },
                { de: 3.0, ate: 4.0, fd: 0.55 },
                { de: 4.0, ate: 5.0, fd: 0.50 },
                { de: 5.0, ate: 6.0, fd: 0.45 },
                { de: 6.0, ate: 7.0, fd: 0.40 },
                { de: 7.0, ate: 8.0, fd: 0.35 },
                { de: 8.0, ate: 9.0, fd: 0.31 },
                { de: 9.0, ate: 10.0, fd: 0.27 },
                { de: 10.0, ate: 999, fd: 0.24 }
            ],
            fdAquecimento: [1.00, 0.75, 0.70, 0.66, 0.60, 0.55, 0.50, 0.45, 0.40, 0.38],
            fdArCond: [1.00, 1.00, 0.86, 0.80, 0.75, 0.70, 0.65, 0.60],
            categorias: [
                { id: 'Cat. 1', tipo: 'Monofásico', kvaMax: 8.0, disj: '40 A', cabo: '10.0 mm²', tubo: '25 mm (3/4")' },
                { id: 'Cat. 2', tipo: 'Bifásico', kvaMax: 16.0, disj: '50 A', cabo: '10.0 mm²', tubo: '32 mm (1")' },
                { id: 'Cat. 3', tipo: 'Bifásico', kvaMax: 22.0, disj: '63 A', cabo: '16.0 mm²', tubo: '32 mm (1")' },
                { id: 'Cat. 4', tipo: 'Trifásico', kvaMax: 30.0, disj: '50 A', cabo: '16.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'Cat. 5', tipo: 'Trifásico', kvaMax: 40.0, disj: '63 A', cabo: '25.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'Cat. 6', tipo: 'Trifásico', kvaMax: 50.0, disj: '80 A', cabo: '35.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'Cat. 7', tipo: 'Trifásico', kvaMax: 65.0, disj: '100 A', cabo: '50.0 mm²', tubo: '50 mm (1.1/2")' }
            ]
        },
        light: {
            id: 'light',
            nome: 'LIGHT Serviços de Eletricidade',
            norma: 'Recon-BT (Regulamento de Conexão)',
            ufs: ['RJ'],
            tensao: '127/220V',
            descricao: 'Recon BT - Regulamentação para Fornecimento de Energia Elétrica em Tensão Secundária - Rio de Janeiro.',
            tabelaIlumTug: [
                { de: 0, ate: 1.0, fd: 0.86 },
                { de: 1.0, ate: 2.0, fd: 0.75 },
                { de: 2.0, ate: 3.0, fd: 0.65 },
                { de: 3.0, ate: 4.0, fd: 0.55 },
                { de: 4.0, ate: 5.0, fd: 0.50 },
                { de: 5.0, ate: 6.0, fd: 0.45 },
                { de: 6.0, ate: 7.0, fd: 0.40 },
                { de: 7.0, ate: 8.0, fd: 0.35 },
                { de: 8.0, ate: 9.0, fd: 0.31 },
                { de: 9.0, ate: 10.0, fd: 0.27 },
                { de: 10.0, ate: 999, fd: 0.24 }
            ],
            fdAquecimento: [1.00, 0.80, 0.72, 0.67, 0.62, 0.58, 0.54, 0.50, 0.46, 0.42],
            fdArCond: [1.00, 1.00, 0.86, 0.80, 0.75, 0.70, 0.65, 0.60],
            categorias: [
                { id: 'Recon M', tipo: 'Monofásico', kvaMax: 8.0, disj: '40 A', cabo: '10.0 mm²', tubo: '25 mm (3/4")' },
                { id: 'Recon B', tipo: 'Bifásico', kvaMax: 18.0, disj: '50 A', cabo: '10.0 mm²', tubo: '32 mm (1")' },
                { id: 'Recon B2', tipo: 'Bifásico', kvaMax: 24.0, disj: '63 A', cabo: '16.0 mm²', tubo: '32 mm (1")' },
                { id: 'Recon T1', tipo: 'Trifásico', kvaMax: 32.0, disj: '50 A', cabo: '16.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'Recon T2', tipo: 'Trifásico', kvaMax: 42.0, disj: '63 A', cabo: '25.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'Recon T3', tipo: 'Trifásico', kvaMax: 52.0, disj: '80 A', cabo: '35.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'Recon T4', tipo: 'Trifásico', kvaMax: 68.0, disj: '100 A', cabo: '50.0 mm²', tubo: '50 mm (1.1/2")' }
            ]
        },
        neoenergia: {
            id: 'neoenergia',
            nome: 'NEOENERGIA (Elektro / Coelba / Celpe / Cosern / Brasília)',
            norma: 'DIS-NOR-030 / NT-01',
            ufs: ['SP', 'BA', 'PE', 'RN', 'DF'],
            tensao: '127/220V ou 220/380V',
            descricao: 'Norma Técnica de Fornecimento em Baixa Tensão do Grupo Neoenergia.',
            tabelaIlumTug: [
                { de: 0, ate: 1.0, fd: 0.86 },
                { de: 1.0, ate: 2.0, fd: 0.75 },
                { de: 2.0, ate: 3.0, fd: 0.65 },
                { de: 3.0, ate: 4.0, fd: 0.55 },
                { de: 4.0, ate: 5.0, fd: 0.50 },
                { de: 5.0, ate: 6.0, fd: 0.45 },
                { de: 6.0, ate: 7.0, fd: 0.40 },
                { de: 7.0, ate: 8.0, fd: 0.35 },
                { de: 8.0, ate: 9.0, fd: 0.31 },
                { de: 9.0, ate: 10.0, fd: 0.27 },
                { de: 10.0, ate: 999, fd: 0.24 }
            ],
            fdAquecimento: [1.00, 0.75, 0.70, 0.66, 0.60, 0.55, 0.50, 0.45, 0.40, 0.38],
            fdArCond: [1.00, 1.00, 0.86, 0.80, 0.75, 0.70, 0.65, 0.60],
            categorias: [
                { id: 'Padrão Mono', tipo: 'Monofásico', kvaMax: 9.0, disj: '40 A', cabo: '10.0 mm²', tubo: '25 mm (3/4")' },
                { id: 'Padrão Bi', tipo: 'Bifásico', kvaMax: 18.0, disj: '50 A', cabo: '10.0 mm²', tubo: '32 mm (1")' },
                { id: 'Padrão Bi 2', tipo: 'Bifásico', kvaMax: 24.0, disj: '63 A', cabo: '16.0 mm²', tubo: '32 mm (1")' },
                { id: 'Padrão Tri 1', tipo: 'Trifásico', kvaMax: 32.0, disj: '50 A', cabo: '16.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'Padrão Tri 2', tipo: 'Trifásico', kvaMax: 42.0, disj: '63 A', cabo: '25.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'Padrão Tri 3', tipo: 'Trifásico', kvaMax: 54.0, disj: '80 A', cabo: '35.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'Padrão Tri 4', tipo: 'Trifásico', kvaMax: 68.0, disj: '100 A', cabo: '50.0 mm²', tubo: '50 mm (1.1/2")' }
            ]
        },
        equatorial: {
            id: 'equatorial',
            nome: 'EQUATORIAL Energia',
            norma: 'NT.001 / NT-BT',
            ufs: ['MA', 'PA', 'PI', 'AL', 'GO', 'RS'],
            tensao: '127/220V ou 220/380V',
            descricao: 'Equatorial Maranhão, Pará, Piauí, Alagoas, Goiás e CEEE-D RS.',
            tabelaIlumTug: [
                { de: 0, ate: 1.0, fd: 0.86 },
                { de: 1.0, ate: 2.0, fd: 0.75 },
                { de: 2.0, ate: 3.0, fd: 0.65 },
                { de: 3.0, ate: 4.0, fd: 0.55 },
                { de: 4.0, ate: 5.0, fd: 0.50 },
                { de: 5.0, ate: 6.0, fd: 0.45 },
                { de: 6.0, ate: 7.0, fd: 0.40 },
                { de: 7.0, ate: 8.0, fd: 0.35 },
                { de: 8.0, ate: 9.0, fd: 0.31 },
                { de: 9.0, ate: 10.0, fd: 0.27 },
                { de: 10.0, ate: 999, fd: 0.24 }
            ],
            fdAquecimento: [1.00, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50, 0.45, 0.40, 0.38],
            fdArCond: [1.00, 1.00, 0.86, 0.80, 0.75, 0.70, 0.65, 0.60],
            categorias: [
                { id: 'M', tipo: 'Monofásico', kvaMax: 8.0, disj: '40 A', cabo: '10.0 mm²', tubo: '25 mm (3/4")' },
                { id: 'B', tipo: 'Bifásico', kvaMax: 18.0, disj: '50 A', cabo: '10.0 mm²', tubo: '32 mm (1")' },
                { id: 'T1', tipo: 'Trifásico', kvaMax: 30.0, disj: '50 A', cabo: '16.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'T2', tipo: 'Trifásico', kvaMax: 40.0, disj: '63 A', cabo: '25.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'T3', tipo: 'Trifásico', kvaMax: 50.0, disj: '80 A', cabo: '35.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'T4', tipo: 'Trifásico', kvaMax: 65.0, disj: '100 A', cabo: '50.0 mm²', tubo: '50 mm (1.1/2")' }
            ]
        },
        energisa: {
            id: 'energisa',
            nome: 'ENERGISA',
            norma: 'NDU-001',
            ufs: ['MT', 'MS', 'PB', 'SE', 'TO', 'RO', 'AC', 'MG', 'SP'],
            tensao: '127/220V ou 220/380V',
            descricao: 'Norma de Distribuição Unificada NDU-001 - Grupo Energisa.',
            tabelaIlumTug: [
                { de: 0, ate: 1.0, fd: 0.86 },
                { de: 1.0, ate: 2.0, fd: 0.75 },
                { de: 2.0, ate: 3.0, fd: 0.65 },
                { de: 3.0, ate: 4.0, fd: 0.55 },
                { de: 4.0, ate: 5.0, fd: 0.50 },
                { de: 5.0, ate: 6.0, fd: 0.45 },
                { de: 6.0, ate: 7.0, fd: 0.40 },
                { de: 7.0, ate: 8.0, fd: 0.35 },
                { de: 8.0, ate: 9.0, fd: 0.31 },
                { de: 9.0, ate: 10.0, fd: 0.27 },
                { de: 10.0, ate: 999, fd: 0.24 }
            ],
            fdAquecimento: [1.00, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50, 0.45, 0.40, 0.38],
            fdArCond: [1.00, 1.00, 0.86, 0.80, 0.75, 0.70, 0.65, 0.60],
            categorias: [
                { id: 'M', tipo: 'Monofásico', kvaMax: 8.0, disj: '40 A', cabo: '10.0 mm²', tubo: '25 mm (3/4")' },
                { id: 'B', tipo: 'Bifásico', kvaMax: 18.0, disj: '50 A', cabo: '10.0 mm²', tubo: '32 mm (1")' },
                { id: 'T1', tipo: 'Trifásico', kvaMax: 30.0, disj: '50 A', cabo: '16.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'T2', tipo: 'Trifásico', kvaMax: 40.0, disj: '63 A', cabo: '25.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'T3', tipo: 'Trifásico', kvaMax: 50.0, disj: '80 A', cabo: '35.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'T4', tipo: 'Trifásico', kvaMax: 65.0, disj: '100 A', cabo: '50.0 mm²', tubo: '50 mm (1.1/2")' }
            ]
        },
        celesc: {
            id: 'celesc',
            nome: 'CELESC Distribuição',
            norma: 'N-120.0001',
            ufs: ['SC'],
            tensao: '220/380V',
            descricao: 'Norma Técnica Celesc de Fornecimento em Tensão Secundária - Santa Catarina.',
            tabelaIlumTug: [
                { de: 0, ate: 1.0, fd: 0.86 },
                { de: 1.0, ate: 2.0, fd: 0.75 },
                { de: 2.0, ate: 3.0, fd: 0.65 },
                { de: 3.0, ate: 4.0, fd: 0.55 },
                { de: 4.0, ate: 5.0, fd: 0.50 },
                { de: 5.0, ate: 6.0, fd: 0.45 },
                { de: 6.0, ate: 7.0, fd: 0.40 },
                { de: 7.0, ate: 8.0, fd: 0.35 },
                { de: 8.0, ate: 9.0, fd: 0.31 },
                { de: 9.0, ate: 10.0, fd: 0.27 },
                { de: 10.0, ate: 999, fd: 0.24 }
            ],
            fdAquecimento: [1.00, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50, 0.45, 0.40, 0.38],
            fdArCond: [1.00, 1.00, 0.86, 0.80, 0.75, 0.70, 0.65, 0.60],
            categorias: [
                { id: 'M', tipo: 'Monofásico', kvaMax: 10.0, disj: '40 A', cabo: '10.0 mm²', tubo: '25 mm (3/4")' },
                { id: 'B', tipo: 'Bifásico', kvaMax: 20.0, disj: '50 A', cabo: '10.0 mm²', tubo: '32 mm (1")' },
                { id: 'T1', tipo: 'Trifásico', kvaMax: 32.0, disj: '50 A', cabo: '16.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'T2', tipo: 'Trifásico', kvaMax: 42.0, disj: '63 A', cabo: '25.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'T3', tipo: 'Trifásico', kvaMax: 54.0, disj: '80 A', cabo: '35.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'T4', tipo: 'Trifásico', kvaMax: 70.0, disj: '100 A', cabo: '50.0 mm²', tubo: '50 mm (1.1/2")' }
            ]
        },
        edp: {
            id: 'edp',
            nome: 'EDP São Paulo / Espírito Santo',
            norma: 'NTU-01 (Fornecimento BT)',
            ufs: ['SP', 'ES'],
            tensao: '127/220V',
            descricao: 'Norma Técnica Unificada EDP - Vale do Paraíba, Alto Tietê e Espírito Santo.',
            tabelaIlumTug: [
                { de: 0, ate: 1.0, fd: 0.86 },
                { de: 1.0, ate: 2.0, fd: 0.75 },
                { de: 2.0, ate: 3.0, fd: 0.65 },
                { de: 3.0, ate: 4.0, fd: 0.55 },
                { de: 4.0, ate: 5.0, fd: 0.50 },
                { de: 5.0, ate: 6.0, fd: 0.45 },
                { de: 6.0, ate: 7.0, fd: 0.40 },
                { de: 7.0, ate: 8.0, fd: 0.35 },
                { de: 8.0, ate: 9.0, fd: 0.31 },
                { de: 9.0, ate: 10.0, fd: 0.27 },
                { de: 10.0, ate: 999, fd: 0.24 }
            ],
            fdAquecimento: [1.00, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50, 0.45, 0.40, 0.38],
            fdArCond: [1.00, 1.00, 0.86, 0.80, 0.75, 0.70, 0.65, 0.60],
            categorias: [
                { id: 'M', tipo: 'Monofásico', kvaMax: 8.0, disj: '40 A', cabo: '10.0 mm²', tubo: '25 mm (3/4")' },
                { id: 'B', tipo: 'Bifásico', kvaMax: 18.0, disj: '50 A', cabo: '10.0 mm²', tubo: '32 mm (1")' },
                { id: 'T1', tipo: 'Trifásico', kvaMax: 30.0, disj: '50 A', cabo: '16.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'T2', tipo: 'Trifásico', kvaMax: 40.0, disj: '63 A', cabo: '25.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'T3', tipo: 'Trifásico', kvaMax: 50.0, disj: '80 A', cabo: '35.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'T4', tipo: 'Trifásico', kvaMax: 65.0, disj: '100 A', cabo: '50.0 mm²', tubo: '50 mm (1.1/2")' }
            ]
        },
        prodist_nacional: {
            id: 'prodist_nacional',
            nome: 'PADRÃO NACIONAL (PRODIST ANEEL / CODI / ABNT)',
            norma: 'PRODIST Módulo 3 / NBR 5410',
            ufs: ['outros'],
            tensao: '127/220V ou 220/380V',
            descricao: 'Método Oficial de Referência Nacional Consolidado ANEEL / CODI para demais regiões.',
            tabelaIlumTug: [
                { de: 0, ate: 1.0, fd: 0.86 },
                { de: 1.0, ate: 2.0, fd: 0.75 },
                { de: 2.0, ate: 3.0, fd: 0.65 },
                { de: 3.0, ate: 4.0, fd: 0.55 },
                { de: 4.0, ate: 5.0, fd: 0.50 },
                { de: 5.0, ate: 6.0, fd: 0.45 },
                { de: 6.0, ate: 7.0, fd: 0.40 },
                { de: 7.0, ate: 8.0, fd: 0.35 },
                { de: 8.0, ate: 9.0, fd: 0.31 },
                { de: 9.0, ate: 10.0, fd: 0.27 },
                { de: 10.0, ate: 999, fd: 0.24 }
            ],
            fdAquecimento: [1.00, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50, 0.45, 0.40, 0.38],
            fdArCond: [1.00, 1.00, 0.86, 0.80, 0.75, 0.70, 0.65, 0.60],
            categorias: [
                { id: 'M', tipo: 'Monofásico', kvaMax: 8.0, disj: '40 A', cabo: '10.0 mm²', tubo: '25 mm (3/4")' },
                { id: 'B', tipo: 'Bifásico', kvaMax: 18.0, disj: '50 A', cabo: '10.0 mm²', tubo: '32 mm (1")' },
                { id: 'T1', tipo: 'Trifásico', kvaMax: 30.0, disj: '50 A', cabo: '16.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'T2', tipo: 'Trifásico', kvaMax: 40.0, disj: '63 A', cabo: '25.0 mm²', tubo: '40 mm (1.1/4")' },
                { id: 'T3', tipo: 'Trifásico', kvaMax: 50.0, disj: '80 A', cabo: '35.0 mm²', tubo: '50 mm (1.1/2")' },
                { id: 'T4', tipo: 'Trifásico', kvaMax: 65.0, disj: '100 A', cabo: '50.0 mm²', tubo: '50 mm (1.1/2")' }
            ]
        }
    };

    // =========================================================================
    // 5. CÁLCULO DE DEMANDA DA EDIFICAÇÃO (PADRÃO DE ENTRADA)
    // =========================================================================

    /** Normaliza o sistema de alimentação para 'monofasico' | 'bifasico' | 'trifasico'. */
    function normalizarSistema(sistema) {
        const s = String(sistema || 'bifasico').toLowerCase();
        return s.includes('tri') ? 'trifasico' : (s.includes('mono') ? 'monofasico' : 'bifasico');
    }

    /**
     * Calcula a demanda da edificação e a categoria de atendimento da concessionária.
     * @param {number} totIlum Potência total de iluminação (VA)
     * @param {number} totTug  Potência total de TUGs (VA)
     * @param {Array<{nome: string, pot: number}>} tues Pontos de uso específico
     * @param {string} sistema 'monofasico' | 'bifasico' | 'trifasico'
     * @param {string} concessionariaId chave de CONCESSIONARIAS (padrão: cpfl)
     */
    function calcularDemanda(totIlum, totTug, tues, sistema, concessionariaId) {
        const conc = CONCESSIONARIAS[concessionariaId] || CONCESSIONARIAS.cpfl;

        // Parcela a: iluminação e TUGs, por faixas de potência (kW)
        const potIlumTugKW = (totIlum + totTug) / 1000.0;
        let demandaIlumTugKW = 0;
        let restanteKW = potIlumTugKW;
        const memoriaParcelaA = [];
        conc.tabelaIlumTug.forEach(faixa => {
            if (restanteKW <= 0) return;
            const faixaTamanho = faixa.ate - faixa.de;
            const kwNestaFaixa = Math.min(restanteKW, faixaTamanho);
            const demFaixa = kwNestaFaixa * faixa.fd;
            demandaIlumTugKW += demFaixa;
            memoriaParcelaA.push({
                faixa: `${faixa.de.toFixed(1)} a ${faixa.ate === 999 ? 'acima' : faixa.ate.toFixed(1)} kW`,
                potencia: kwNestaFaixa,
                fd: faixa.fd,
                demanda: demFaixa
            });
            restanteKW -= kwNestaFaixa;
        });

        // Parcelas b (aquecimento/resistivas), c (ar-condicionado) e d (outras cargas)
        let potAquecKW = 0, qtdAparelhosAquec = 0;
        const aparelhosAquec = [];
        let potArCondKW = 0, qtdArCond = 0;
        const aparelhosAr = [];
        let potOutrasKW = 0;

        tues.forEach(pt => {
            const nome = (pt.nome || '').toLowerCase();
            const kw = pt.pot / 1000.0;
            if (nome.includes('chuveiro') || nome.includes('torneira') || nome.includes('aquecedor') || nome.includes('boiler') || nome.includes('forno') || nome.includes('cooktop')) {
                potAquecKW += kw;
                qtdAparelhosAquec++;
                aparelhosAquec.push({ nome: pt.nome, potKW: kw });
            } else if (nome.includes('ar ') || nome.includes('condicionado') || nome.includes('climatizador') || nome.includes('split')) {
                potArCondKW += kw;
                qtdArCond++;
                aparelhosAr.push({ nome: pt.nome, potKW: kw });
            } else {
                potOutrasKW += kw;
            }
        });

        // Fatores de demanda por quantidade de aparelhos
        const idxAquec = Math.min(qtdAparelhosAquec, conc.fdAquecimento.length) - 1;
        const fdAquec = qtdAparelhosAquec > 0 ? (conc.fdAquecimento[idxAquec] || 0.40) : 0;
        const demandaAquecKW = potAquecKW * fdAquec;

        const idxAr = Math.min(qtdArCond, conc.fdArCond.length) - 1;
        const fdAr = qtdArCond > 0 ? (conc.fdArCond[idxAr] || 0.60) : 0;
        const demandaArKW = potArCondKW * fdAr;

        const demandaOutrasKW = potOutrasKW * FD_OUTRAS_CARGAS;

        // Demanda total
        const demandaTotalKW = demandaIlumTugKW + demandaAquecKW + demandaArKW + demandaOutrasKW;
        const cargaInstaladaTotalKW = potIlumTugKW + potAquecKW + potArCondKW + potOutrasKW;
        const fatorDemandaGlobal = cargaInstaladaTotalKW > 0 ? (demandaTotalKW / cargaInstaladaTotalKW) : 0.6;
        const demandaTotalkVA = demandaTotalKW / FATOR_POTENCIA_RESIDENCIAL;

        // Categoria de atendimento: primeiro no sistema escolhido; se a demanda
        // exceder, migra (mono → bi/tri, bi → tri); por fim, a maior categoria.
        const sistLimpo = normalizarSistema(sistema);
        const tipoAlvo = sistLimpo === 'trifasico' ? 'Trifásico' : (sistLimpo === 'monofasico' ? 'Monofásico' : 'Bifásico');

        let categoriaAtend = conc.categorias.find(cat => cat.tipo === tipoAlvo && demandaTotalkVA <= cat.kvaMax) || null;
        if (!categoriaAtend) {
            if (sistLimpo === 'monofasico') {
                categoriaAtend = conc.categorias.find(cat => (cat.tipo === 'Bifásico' || cat.tipo === 'Trifásico') && demandaTotalkVA <= cat.kvaMax) || null;
            } else if (sistLimpo === 'bifasico') {
                categoriaAtend = conc.categorias.find(cat => cat.tipo === 'Trifásico' && demandaTotalkVA <= cat.kvaMax) || null;
            }
        }
        if (!categoriaAtend) {
            categoriaAtend = conc.categorias[conc.categorias.length - 1];
        }

        return {
            concessionaria: conc,
            cargaInstaladaTotalKW,
            demandaTotalKW,
            demandaTotalkVA,
            fatorDemandaGlobal,
            parcelaA: { potKW: potIlumTugKW, demKW: demandaIlumTugKW, memoria: memoriaParcelaA },
            parcelaB: { potKW: potAquecKW, demKW: demandaAquecKW, qtd: qtdAparelhosAquec, fd: fdAquec, itens: aparelhosAquec },
            parcelaC: { potKW: potArCondKW, demKW: demandaArKW, qtd: qtdArCond, fd: fdAr, itens: aparelhosAr },
            parcelaD: { potKW: potOutrasKW, demKW: demandaOutrasKW },
            categoriaAtend
        };
    }

    // =========================================================================
    // API PÚBLICA
    // =========================================================================
    return Object.freeze({
        // constantes
        RESISTIVIDADE_COBRE_70C,
        SECOES_PADRONIZADAS,
        IZ_METODO_B1,
        QUEDA_TENSAO_MAX_PCT,
        SECAO_MINIMA_ILUMINACAO,
        SECAO_MINIMA_FORCA,
        LIMITE_POT_ILUMINACAO_VA,
        LIMITE_POT_TUG_VA,
        FATOR_POTENCIA_RESIDENCIAL,
        CONCESSIONARIAS,
        // funções
        izMetodoB1,
        formatarSecao,
        ehCargaResistiva,
        selecionarProtecaoTUE,
        calcularQuedaTensao,
        dimensionarEletroduto,
        ehAreaMolhadaOuPotencia,
        dimensionarCircuito,
        normalizarSistema,
        calcularDemanda
    });
});

// Testes unitários do núcleo de cálculo NBR 5410 (js/nbr5410.js).
// Rodar:  npm test   (ou: node --test testes/)
// Os valores esperados foram calculados à mão a partir das tabelas da norma.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../js/nbr5410.js');

const perto = (real, esperado, tol = 1e-6, msg) =>
    assert.ok(Math.abs(real - esperado) <= tol, `${msg || ''} esperado ${esperado}, obtido ${real}`);

test('Tabela 36 (B1): Iz por seção e erro para seção inexistente', () => {
    assert.equal(N.izMetodoB1(1.5), 17.5);
    assert.equal(N.izMetodoB1(2.5), 24);
    assert.equal(N.izMetodoB1(10), 57);
    assert.throws(() => N.izMetodoB1(3), /Tabela 36/);
    // toda seção padronizada tem Iz e diâmetro externo cadastrados, e Iz cresce com a seção
    let anterior = 0;
    for (const s of N.SECOES_PADRONIZADAS) {
        assert.ok(N.izMetodoB1(s) > anterior, `Iz de ${s} mm² deveria ser maior que a seção anterior`);
        anterior = N.izMetodoB1(s);
        assert.ok(N.areaExternaCondutor(s) > s, `área externa de ${s} mm² inclui a isolação`);
    }
});

test('Tabela 42 (FCA) por número de circuitos agrupados', () => {
    assert.equal(N.fatorAgrupamento(1), 1.00);
    assert.equal(N.fatorAgrupamento(2), 0.80);
    assert.equal(N.fatorAgrupamento(3), 0.70);
    assert.equal(N.fatorAgrupamento(9), 0.50);
    assert.equal(N.fatorAgrupamento(12), 0.45);
    assert.equal(N.fatorAgrupamento(25), 0.38);
    // entradas inválidas caem em 1 circuito
    assert.equal(N.fatorAgrupamento(0), 1.00);
    assert.equal(N.fatorAgrupamento('abc'), 1.00);
});

test('Tabela 40 (FCT, PVC): linha superior para temperaturas intermediárias', () => {
    assert.equal(N.fatorTemperatura(30), 1.00);
    assert.equal(N.fatorTemperatura(31), 0.94);
    assert.equal(N.fatorTemperatura(40), 0.87);
    assert.equal(N.fatorTemperatura(5), 1.22);
    assert.equal(N.fatorTemperatura(75), 0.50);
    assert.equal(N.fatorTemperatura('x'), 1.00);
});

test('Tabela 58: seção do condutor de proteção', () => {
    assert.equal(N.secaoProtecao(2.5), 2.5);
    assert.equal(N.secaoProtecao(16), 16);
    assert.equal(N.secaoProtecao(25), 16);
    assert.equal(N.secaoProtecao(35), 16);
    assert.equal(N.secaoProtecao(50), 25);
    assert.equal(N.secaoProtecao(95), 50);
    assert.equal(N.secaoProtecao(120), 70);
});

test('formatação da seção', () => {
    assert.equal(N.formatarSecao(2.5), '2.5 mm²');
    assert.equal(N.formatarSecao(6), '6 mm²');
    assert.equal(N.formatarSecao(10), '10 mm²');
});

test('queda de tensão ΔV = 2·ρ·L·Ib/S', () => {
    const q = N.calcularQuedaTensao(10, 20, 2.5, 127);
    perto(q.volts, 3.536);                        // 2 × 0,0221 × 20 × 10 / 2,5
    perto(q.pct, 3.536 / 127 * 100);             // 2,78 %
});

test('taxa máxima de ocupação de eletroduto (item 6.2.11.1.6)', () => {
    assert.equal(N.taxaMaximaOcupacao(1), 0.53);
    assert.equal(N.taxaMaximaOcupacao(2), 0.31);
    assert.equal(N.taxaMaximaOcupacao(3), 0.40);
    assert.equal(N.taxaMaximaOcupacao(8), 0.40);
});

test('eletroduto por ocupação: menor DN que atende e alerta quando nenhum atende', () => {
    const e = N.dimensionarEletrodutoPorOcupacao([1.5, 1.5, 1.5, 1.5]);
    assert.equal(e.dn, 20);
    assert.ok(e.atende && e.taxa <= 0.40);
    const grande = N.dimensionarEletrodutoPorOcupacao(new Array(12).fill(25));
    assert.equal(grande.atende, false);
    assert.equal(grande.dn, 60);
});

test('condutores do circuito: iluminação 4, TUG 3, ar-condicionado 2P com neutro', () => {
    assert.deepEqual(N.condutoresDoCircuito({ tipo: 'Iluminação' }, 1.5), [1.5, 1.5, 1.5, 1.5]);
    assert.deepEqual(N.condutoresDoCircuito({ tipo: 'TUG', polos: '1P' }, 2.5), [2.5, 2.5, 2.5]);
    assert.deepEqual(N.condutoresDoCircuito({ tipo: 'TUE', polos: '2P', nome: 'Chuveiro' }, 6), [6, 6, 6]);
    assert.deepEqual(N.condutoresDoCircuito({ tipo: 'TUE', polos: '2P', nome: 'Ar (12k BTU)' }, 2.5), [2.5, 2.5, 2.5, 2.5]);
});

test('ar-condicionado só pela palavra inteira "ar"', () => {
    for (const n of ['Ar (12k BTU)', 'Ar-condicionado Sala', 'Split 9000', 'AR', 'Climatizador'])
        assert.ok(N.ehArCondicionado(n), n);
    for (const n of ['Máquina de lavar roupa', 'Secar', 'Lugar', 'Carregador', 'Barbeador', ''])
        assert.ok(!N.ehArCondicionado(n), n);
    assert.ok(N.tueComNeutro('Forno Elétrico'));
    assert.ok(!N.tueComNeutro('Máquina de lavar'));
});

test('carga resistiva (curva B) e IDR obrigatório em áreas molhadas', () => {
    assert.ok(N.ehCargaResistiva('Chuveiro 7500W'));
    assert.ok(N.ehCargaResistiva('Torneira Elétrica'));
    assert.ok(!N.ehCargaResistiva('Geladeira'));
    assert.ok(N.ehAreaMolhadaOuPotencia({ tipo: 'TUG', nome: 'TUG Cozinha' }));
    assert.ok(N.ehAreaMolhadaOuPotencia({ tipo: 'TUE', nome: 'Geladeira' }));
    assert.ok(!N.ehAreaMolhadaOuPotencia({ tipo: 'TUG', nome: 'TUG Quarto' }));
});

test('dimensionarCircuito: iluminação 1200 VA / 127 V, 14 m', () => {
    const c = N.dimensionarCircuito({ tipo: 'Iluminação', nome: 'Ilum. Social', tensao: 127, ibVal: 1200 / 127, rota: 14 });
    assert.equal(c.disjuntor, 10);
    assert.equal(c.secaoMm2, 1.5);           // 17,5 × 0,70 = 12,25 A ≥ 10 A
    assert.equal(c.cabo, '1.5 mm²');
    assert.equal(c.fca, 0.70);
    perto(c.izCorrigida, 12.25);
    perto(c.deltaVPct, 2 * 0.0221 * 14 * (1200 / 127) / 1.5 / 127 * 100);
    assert.equal(c.secaoPE, 1.5);
    assert.equal(c.eletrodutoDN, 20);
    assert.ok(c.ampacidadeOk && c.quedaTensaoOk && c.conforme);
    assert.deepEqual(c.alertas, []);
});

test('dimensionarCircuito: TUG 20 A com 3 circuitos agrupados exige 4 mm²', () => {
    const c = N.dimensionarCircuito({ tipo: 'TUG', nome: 'TUG Sala', tensao: 127, ibVal: 17.3, rota: 10 });
    assert.equal(c.disjuntor, 20);
    assert.equal(c.secaoMm2, 4);             // 2,5: 24 × 0,7 = 16,8 < 20 ; 4: 32 × 0,7 = 22,4
    // circuito isolado (sem agrupamento) fica em 2,5 mm²
    const isolado = N.dimensionarCircuito({ tipo: 'TUG', nome: 'TUG Sala', tensao: 127, ibVal: 17.3, rota: 10 }, { circuitosAgrupados: 1 });
    assert.equal(isolado.secaoMm2, 2.5);
});

test('dimensionarCircuito: chuveiro 7500 W / 220 V', () => {
    const ib = 7500 / 220;                   // 34,1 A
    const c = N.dimensionarCircuito({ tipo: 'TUE', nome: 'Chuveiro', polos: '2P', tensao: 220, ibVal: ib, rota: 8 });
    assert.equal(c.disjuntor, 40);
    assert.equal(c.secaoMm2, 16);            // 10: 57 × 0,7 = 39,9 < 40 ; 16: 76 × 0,7 = 53,2
    assert.ok(c.ampacidadeOk);
    assert.equal(c.idrTag, 'IDR 30mA (Obrigatório)');
    assert.ok(ib <= c.disjuntor && c.disjuntor <= c.izCorrigida);
});

test('dimensionarCircuito: queda de tensão aumenta a seção (60 m, 10 A, 127 V)', () => {
    const c = N.dimensionarCircuito({ tipo: 'TUG', nome: 'TUG Edícula', tensao: 127, ibVal: 10, rota: 60 });
    assert.equal(c.disjuntor, 10);
    assert.equal(c.secaoMm2, 6);             // 2,5 → 8,4 % ; 4 → 5,2 % ; 6 → 3,5 %
    assert.ok(c.deltaVPct <= 4);
    assert.ok(c.quedaTensaoOk);
});

test('dimensionarCircuito: corrente acima do maior disjuntor gera alerta e não conformidade', () => {
    const c = N.dimensionarCircuito({ tipo: 'TUE', nome: 'Carro Elétrico', tensao: 220, ibVal: 200, rota: 5 });
    assert.equal(c.disjuntor, 125);
    assert.equal(c.ampacidadeOk, false);
    assert.equal(c.conforme, false);
    assert.ok(c.alertas.some(a => a.includes('maior disjuntor')));
});

test('dimensionarCircuito: propriedade Ib ≤ In ≤ Iz para correntes até 80 A', () => {
    for (let ib = 0.5; ib <= 80; ib += 0.5) {
        for (const agrup of [1, 3, 6]) {
            const c = N.dimensionarCircuito({ tipo: 'TUE', nome: 'Carga', tensao: 220, ibVal: ib, rota: 5 }, { circuitosAgrupados: agrup });
            assert.ok(ib <= c.disjuntor, `Ib ${ib} ≤ In ${c.disjuntor}`);
            if (c.alertas.length === 0) assert.ok(c.disjuntor <= c.izCorrigida + 1e-9, `In ${c.disjuntor} ≤ Iz ${c.izCorrigida} (Ib ${ib}, ${agrup} circ.)`);
            assert.ok(c.secaoMm2 >= N.SECAO_MINIMA_FORCA);
        }
    }
});

test('normalizarSistema', () => {
    assert.equal(N.normalizarSistema('Trifásico'), 'trifasico');
    assert.equal(N.normalizarSistema('monofasico'), 'monofasico');
    assert.equal(N.normalizarSistema(undefined), 'bifasico');
});

test('distribuirFases: 1P na fase menos carregada, 2P no melhor par', () => {
    const tri = N.distribuirFases([{ potVal: 3000, polos: '1P' }, { potVal: 2000, polos: '1P' }, { potVal: 1000, polos: '1P' }], 'trifasico');
    assert.deepEqual(tri.fases, ['R', 'S', 'T']);
    assert.deepEqual(tri.cargaPorFase, { R: 3000, S: 2000, T: 1000 });
    perto(tri.desequilibrio, 2000 / 3000);

    const bi = N.distribuirFases([{ potVal: 7500, polos: '2P' }, { potVal: 1000, polos: '1P' }, { potVal: 800, polos: '1P' }], 'bifasico');
    assert.equal(bi.fases[0], 'R + S');
    assert.deepEqual(bi.cargaPorFase, { R: 3750 + 1000, S: 3750 + 800 });

    const mono = N.distribuirFases([{ potVal: 500, polos: '1P' }, { potVal: 4000, polos: '2P' }], 'monofasico');
    assert.deepEqual(mono.fases, ['R', 'R']);
    assert.equal(mono.desequilibrio, 0);

    assert.deepEqual(N.distribuirFases([], 'trifasico').fases, []);
});

test('calcularDemanda (CPFL): parcela a por faixas', () => {
    // 3 kW de iluminação + TUG: 1×0,86 + 1×0,75 + 1×0,65 = 2,26 kW
    const d = N.calcularDemanda(1000, 2000, [], 'monofasico', 'cpfl');
    perto(d.parcelaA.demKW, 2.26, 1e-9);
    assert.equal(d.parcelaA.memoria.length, 3);
    perto(d.demandaTotalkVA, 2.26 / 0.95, 1e-9);
    assert.equal(d.categoriaAtend.id, 'M1');
});

test('calcularDemanda: classifica aquecimento, ar-condicionado e outras cargas', () => {
    const d = N.calcularDemanda(0, 0, [
        { nome: 'Chuveiro', pot: 5500 },
        { nome: 'Torneira Elétrica', pot: 5500 },
        { nome: 'Ar (12k BTU)', pot: 1400 },
        { nome: 'Máquina de lavar roupa', pot: 1000 }
    ], 'bifasico', 'cpfl');
    perto(d.parcelaB.potKW, 11);
    assert.equal(d.parcelaB.fd, 0.75);       // 2 aparelhos de aquecimento
    perto(d.parcelaC.potKW, 1.4);            // só o ar; "lavar" não é ar-condicionado
    assert.equal(d.parcelaC.qtd, 1);
    perto(d.parcelaD.potKW, 1.0);
    perto(d.parcelaD.demKW, 0.7);
    perto(d.demandaTotalKW, 11 * 0.75 + 1.4 + 0.7);
});

test('calcularDemanda: monofásico acima do limite migra para bifásico', () => {
    // 2,26 kW + chuveiro 7,5 kW = 9,76 kW → 10,27 kVA > 10 kVA (M2)
    const d = N.calcularDemanda(1000, 2000, [{ nome: 'Chuveiro', pot: 7500 }], 'monofasico', 'cpfl');
    assert.ok(d.demandaTotalkVA > 10);
    assert.equal(d.categoriaAtend.tipo, 'Bifásico');
    assert.equal(d.categoriaAtend.id, 'B1');
    // concessionária desconhecida cai na CPFL
    assert.equal(N.calcularDemanda(1000, 0, [], 'bifasico', 'nao_existe').concessionaria.id, 'cpfl');
});

test('tabelas das concessionárias são consistentes', () => {
    for (const [id, c] of Object.entries(N.CONCESSIONARIAS)) {
        assert.equal(c.id, id);
        // faixas da parcela a contíguas, começando em 0, com FD entre 0 e 1
        assert.equal(c.tabelaIlumTug[0].de, 0, id);
        c.tabelaIlumTug.forEach((f, i) => {
            assert.ok(f.ate > f.de, `${id} faixa ${i}`);
            assert.ok(f.fd > 0 && f.fd <= 1, `${id} fd ${i}`);
            if (i > 0) assert.equal(f.de, c.tabelaIlumTug[i - 1].ate, `${id} faixa ${i} contígua`);
        });
        for (const fd of [...c.fdAquecimento, ...c.fdArCond]) assert.ok(fd > 0 && fd <= 1, id);
        // dentro de cada tipo de ligação, as categorias crescem em kVA
        for (const tipo of ['Monofásico', 'Bifásico', 'Trifásico']) {
            const kva = c.categorias.filter(k => k.tipo === tipo).map(k => k.kvaMax);
            assert.deepEqual(kva, [...kva].sort((a, b) => a - b), `${id} ${tipo}`);
        }
    }
});

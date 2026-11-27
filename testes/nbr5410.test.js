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

// ---------------------------------------------------------------------------
// Circuitos trifásicos (3F+N, 220 V entre fases) — carregadores veiculares de 11 e 22 kW
// ---------------------------------------------------------------------------
test('trifásico: corrente da carga P / (√3·V) e reconhecimento da carga', () => {
    assert.ok(Math.abs(N.correnteDaCarga(12194, 220, 3) - 32) < 0.01);
    assert.ok(Math.abs(N.correnteDaCarga(6097, 220, 3) - 16) < 0.01);
    assert.equal(N.correnteDaCarga(2200, 220), 10);                       // bifásico: P / V
    assert.equal(N.ehCargaTrifasica({ fases: 3 }), true);
    assert.equal(N.ehCargaTrifasica({ nome: 'Carregador Veicular Wallbox 22 kW trifásico (32 A por fase)' }), true);
    assert.equal(N.ehCargaTrifasica({ nome: 'Bomba 3F 2 cv' }), true);
    assert.equal(N.ehCargaTrifasica({ nome: 'Chuveiro Elétrico 220V' }), false);
});

test('trifásico: 3 condutores carregados (Tabela 36, col. 3) e queda √3·ρ·L·I/S', () => {
    const base = { tipo: 'TUE', nome: 'Carregador trifásico', tensao: 220, ibVal: 16, rota: 15, ehManual: true };
    const tri = N.dimensionarCircuito(Object.assign({}, base, { polos: '3P' }), { circuitosAgrupados: 3, temperaturaAmbiente: 30 });
    const bi = N.dimensionarCircuito(Object.assign({}, base, { polos: '2P' }), { circuitosAgrupados: 3, temperaturaAmbiente: 30 });
    assert.equal(tri.disjuntor, 16);
    // 2,5 mm² com 3 carregados: 21 A × 0,70 = 14,7 A < 16 A → 4 mm² (28 × 0,70 = 19,6 A)
    assert.equal(tri.secaoMm2, 4);
    assert.ok(Math.abs(tri.izCorrigida - 19.6) < 1e-9);
    assert.equal(bi.secaoMm2, 2.5);                                       // 2 carregados: 24 × 0,70 = 16,8 A
    assert.equal(tri.condutores.length, 5);                               // F + F + F + N + PE
    const q3 = N.calcularQuedaTensao(16, 15, 4, 220, 3), q1 = N.calcularQuedaTensao(16, 15, 4, 220);
    assert.ok(Math.abs(q3.volts / q1.volts - Math.sqrt(3) / 2) < 1e-9);
    assert.ok(Math.abs(tri.deltaVVolts - q3.volts) < 1e-9);
    assert.ok(tri.conforme);
});

test('trifásico: um terço da carga em cada fase e IDR tetrapolar próprio no esquema bipolar', () => {
    const circs = [{ num: 1, potVal: 6000, polos: '3P', tipo: 'TUE' }, { num: 2, potVal: 1000, polos: '1P', tipo: 'TUG' }];
    const d = N.distribuirFases(circs, 'trifasico');
    assert.equal(d.fases[0], 'R + S + T');
    assert.equal(d.cargaPorFase.R + d.cargaPorFase.S + d.cargaPorFase.T, 7000);
    assert.ok(Object.values(d.cargaPorFase).every(v => v >= 2000));
    const numerados = circs.map((c, i) => Object.assign({}, c, { fase: d.fases[i] }));
    const plano = N.planejarIdrs({ circuitos: numerados, sistema: 'trifasico', configIdr: 'idr_geral', esquema: 'TN-S', inGeral: 63, modelo: { polos: '2P' } });
    const idr3 = plano.idrs.find(i => i.circuitos.includes(1));
    assert.deepEqual(idr3.polosLetras, ['N', 'R', 'S', 'T']);
    assert.equal(idr3.polos, '4P');
    assert.ok(!idr3.circuitos.includes(2));
});

test('demanda: recarga de veículo elétrico entra a plena carga (fator 1)', () => {
    const tues = [{ nome: 'Carregador Veicular Wallbox 22 kW trifásico (32 A por fase)', pot: 12194 }, { nome: 'Motor de portão', pot: 1000 }];
    const d = N.calcularDemanda(1000, 2000, tues, 'trifasico', 'cpfl');
    assert.equal(d.parcelaE.qtd, 1);
    assert.ok(Math.abs(d.parcelaE.demKW - 12.194) < 1e-9);
    assert.ok(Math.abs(d.parcelaD.demKW - 0.7) < 1e-9);               // portão segue em "outras cargas"
    assert.ok(d.demandaTotalKW >= 12.194 + 0.7);
});

test('rotas: trecho vertical pela laje (construção tradicional) ou pelo piso, e premissas de sobra', () => {
    // pela laje: desce do teto até a caixa
    assert.ok(Math.abs(N.trechoVertical('teto', 2.8, N.alturaDoPonto('baixa', 2.8)) - 2.5) < 1e-9);   // tomada baixa
    assert.ok(Math.abs(N.trechoVertical('teto', 2.8, N.alturaDoPonto('alta', 2.8)) - 0.8) < 1e-9);    // chuveiro / ar
    assert.equal(N.trechoVertical('teto', 2.8, N.alturaDoPonto('teto', 2.8)), 0);                      // luz na própria laje
    // pelo piso: sobe do contrapiso até a caixa; a luz exige subir até o teto
    assert.ok(Math.abs(N.trechoVertical('chao', 2.8, N.alturaDoPonto('baixa', 2.8)) - 0.3) < 1e-9);
    assert.equal(N.trechoVertical('chao', 2.6, N.alturaDoPonto('teto', 2.6)), 2.6);
    // o pé-direito do pavimento muda a descida
    assert.ok(N.trechoVertical('teto', 3.2, 0.3) > N.trechoVertical('teto', 2.6, 0.3));
    assert.equal(N.PARAMETROS_PADRAO.sobraCaixaM, 0.30);
    assert.equal(N.PARAMETROS_PADRAO.reservaCabosPct, 10);
});

// ---------------------------------------------------------------------------
// Tolerância numérica (2 casas) nas comparações Ib ≤ In ≤ Iz e na queda de tensão
// ---------------------------------------------------------------------------
test('tolerância: arredondar com 2 casas, inclusive na fronteira binária', () => {
    assert.equal(N.CASAS_TOLERANCIA, 2);
    assert.equal(N.arredondar(16.00005), 16);
    assert.equal(N.arredondar(16.005), 16.01);         // 16,005 × 100 = 1600,4999… em binário
    assert.equal(N.arredondar(15.999996), 16);
    assert.equal(N.arredondar(-0.004), -0);
    assert.equal(N.arredondar(3.14159, 1), 3.1);
});

test('tolerância: Ib na fronteira do disjuntor (igual, 0,0001 acima e 0,01 acima)', () => {
    const dim = ib => N.dimensionarCircuito({ tipo: 'TUE', nome: 'Carga de teste', tensao: 220, ibVal: ib, rota: 8, ehManual: true, polos: '2P' }, { circuitosAgrupados: 1, temperaturaAmbiente: 30 });
    const igual = dim(16), quase = dim(16.0001), acima = dim(16.01);
    assert.equal(igual.disjuntor, 16);
    assert.equal(quase.disjuntor, 16);                   // 16,0001 A → 16,00 A: não sobe para 20 A
    assert.equal(acima.disjuntor, 20);                   // 16,01 A já passa do disjuntor de 16 A
    assert.ok(igual.ampacidadeOk && quase.ampacidadeOk && acima.ampacidadeOk);
    assert.equal(quase.ibProjeto, 16);
    assert.equal(acima.ibProjeto, 16.01);
    // mesma regra no topo da tabela e no disjuntor mínimo
    assert.equal(dim(63.0001).disjuntor, 63);
    assert.equal(dim(63.01).disjuntor, 70);
    assert.equal(dim(10.00004).disjuntor, 10);
    // seleção inicial de cabo/disjuntor das TUEs
    assert.equal(N.selecionarProtecaoTUE(12.00004).disj, '16 A');
    assert.equal(N.selecionarProtecaoTUE(12.01).disj, '20 A');
    assert.equal(N.selecionarProtecaoTUE(17.50003).cabo, '2.5 mm²');
});

test('tolerância: carregadores trifásicos na potência nominal (16 e 32 A por fase) ficam em 16 A e 32 A', () => {
    const nominal = i => Math.round(Math.sqrt(3) * 220 * i);
    assert.equal(nominal(16), 6097);
    assert.equal(nominal(32), 12194);
    for (const [pot, inEsperado] of [[6096, 16], [6097, 16], [12193, 32], [12194, 32]]) {
        const ib = N.correnteDaCarga(pot, 220, 3);
        const c = N.dimensionarCircuito({ tipo: 'TUE', nome: 'Carregador Veicular Wallbox trifásico', tensao: 220, ibVal: ib, rota: 12, ehManual: true, polos: '3P' }, { circuitosAgrupados: 3, temperaturaAmbiente: 30 });
        assert.equal(c.disjuntor, inEsperado, `${pot} W → Ib ${ib}`);
        assert.ok(c.conforme, c.alertas.join(' '));
    }
});

test('tolerância: queda de tensão na fronteira de 4% e capacidade de condução corrigida', () => {
    const rho = N.RESISTIVIDADE_COBRE_70C;
    const L4 = 4 * 2.5 * 127 / (100 * 2 * rho * 10);       // comprimento que dá exatamente 4% em 2,5 mm²
    const circ = L => N.dimensionarCircuito({ tipo: 'TUG', nome: 'TUG teste', tensao: 127, ibVal: 10, rota: L, ehManual: true, polos: '1P' }, { circuitosAgrupados: 1, temperaturaAmbiente: 30 });
    const exato = circ(L4), quase = circ(L4 * (1 + 1e-7)), acima = circ(L4 * 1.005);
    assert.equal(exato.secaoMm2, 2.5);
    assert.ok(exato.quedaTensaoOk);
    assert.equal(quase.secaoMm2, 2.5);                    // 4,0000004% → 4,00%: atende
    assert.ok(quase.quedaTensaoOk);
    assert.equal(acima.secaoMm2, 4);                      // 4,02%: sobe a seção
    // Iz corrigida comparada com 2 casas (24 × 0,7 = 16,799999… não é tratado como < 16,8)
    const c = N.dimensionarCircuito({ tipo: 'TUG', nome: 'TUG', tensao: 127, ibVal: 15, rota: 5, ehManual: true, polos: '1P' }, { circuitosAgrupados: 3, temperaturaAmbiente: 30 });
    assert.equal(c.disjuntor, 16);
    assert.equal(c.secaoMm2, 2.5);
    assert.ok(c.ampacidadeOk);
});

test('tolerância: alimentador não acusa Ib > In por 0,0001 A, mas acusa 0,01 A', () => {
    const base = { inDisjuntor: 63, secaoMinima: 16, sistema: 'monofasico', comprimento: 10, tensaoFN: 127 };
    const quase = N.dimensionarAlimentador(Object.assign({}, base, { demandaKVA: 63.0001 * 127 / 1000 }));
    const acima = N.dimensionarAlimentador(Object.assign({}, base, { demandaKVA: 63.01 * 127 / 1000 }));
    assert.ok(!quase.alertas.some(a => /Ib ≤ In/.test(a)), quase.alertas.join(' '));
    assert.ok(acima.alertas.some(a => /Ib ≤ In/.test(a)));
});

// ---------------------------------------------------------------------------
// Rede de baixa tensão configurável: 127/220 V (padrão) e 220/380 V
// ---------------------------------------------------------------------------
test('rede: 127/220 V é o padrão (projetos antigos) e 220/380 V é reconhecida', () => {
    assert.equal(N.PARAMETROS_PADRAO.redeTensao, '127/220');
    assert.deepEqual([N.obterRede().fn, N.obterRede().ff], [127, 220]);
    assert.deepEqual([N.obterRede('220/380').fn, N.obterRede('220/380').ff], [220, 380]);
    assert.equal(N.obterRede({ redeTensao: '220/380' }).id, '220/380');
    assert.equal(N.obterRede({ circuitosAgrupados: 3 }).id, '127/220');      // premissas sem a chave
    assert.equal(N.obterRede('220/380 V').id, '220/380');
    assert.equal(N.obterRede('xyz').id, '127/220');
});

test('rede: polos da carga — 220 V é F+F em 127/220 e F+N em 220/380', () => {
    assert.equal(N.polosDaCarga(127, 1, '127/220'), '1P');
    assert.equal(N.polosDaCarga(220, 1, '127/220'), '2P');
    assert.equal(N.polosDaCarga(220, 3, '127/220'), '3P');
    assert.equal(N.polosDaCarga(220, 1, '220/380'), '1P');
    assert.equal(N.polosDaCarga(380, 1, '220/380'), '2P');
    assert.equal(N.polosDaCarga(380, 3, '220/380'), '3P');
});

test('rede: conversão das tensões dos cadastros (convenção 127/220 V) nos dois sentidos', () => {
    const r380 = '220/380', r220 = '127/220';
    assert.equal(N.tensaoNaRede({ tipo: 'TUG', tensao: 127 }, r380), 220);
    assert.equal(N.tensaoNaRede({ tipo: 'ILUM', tensao: 127 }, r380), 220);
    assert.equal(N.tensaoNaRede({ tipo: 'TUE', tensao: 127 }, r380), 220);       // aparelho 127 V → versão 220 V F+N
    assert.equal(N.tensaoNaRede({ tipo: 'TUE', tensao: 220 }, r380), 220);
    assert.equal(N.tensaoNaRede({ tipo: 'TUE', tensao: 220, fases: 3 }, r380), 380);
    assert.equal(N.tensaoNaRede({ tipo: 'TUE', tensao: 380 }, r380), 380);
    // de volta
    assert.equal(N.tensaoNaRede({ tipo: 'TUG', tensao: 220 }, r220), 127);
    assert.equal(N.tensaoNaRede({ tipo: 'TUE', tensao: 220 }, r220), 220);
    assert.equal(N.tensaoNaRede({ tipo: 'TUE', tensao: 380 }, r220), 220);
    assert.equal(N.tensaoNaRede({ tipo: 'TUE', tensao: 380, fases: 3 }, r220), 220);
    assert.equal(N.tensaoNaRede({ tipo: 'TUE', tensao: 127 }, r220), 127);
});

test('rede: carregador trifásico limitado por corrente — potência e disjuntor nas duas redes', () => {
    assert.equal(N.correntePorFaseNoNome('Carregador Veicular Wallbox 22 kW trifásico (32 A por fase)'), 32);
    assert.equal(N.correntePorFaseNoNome('Chuveiro 7500 W'), null);
    assert.equal(N.potenciaTrifasicaPorCorrente(16, '127/220'), 6097);
    assert.equal(N.potenciaTrifasicaPorCorrente(16, '220/380'), 10531);
    assert.equal(N.potenciaTrifasicaPorCorrente(32, '220/380'), 21062);
    for (const [i, rede] of [[16, '127/220'], [32, '127/220'], [16, '220/380'], [32, '220/380']]) {
        const r = N.obterRede(rede);
        const ib = N.correnteDaCarga(N.potenciaTrifasicaPorCorrente(i, r), r.ff, 3);
        const c = N.dimensionarCircuito({ tipo: 'TUE', nome: 'Carregador trifásico', tensao: r.ff, ibVal: ib, rota: 12, ehManual: true, polos: N.polosDaCarga(r.ff, 3, r) });
        assert.equal(c.disjuntor, i, `${i} A em ${rede} (Ib ${ib})`);
    }
});

test('rede: limites de potência por circuito mantêm as mesmas correntes', () => {
    assert.deepEqual(N.limitesPotenciaCircuito('127/220'), { iluminacao: 1200, tug: 2200 });
    assert.deepEqual(N.limitesPotenciaCircuito('220/380'), { iluminacao: 2000, tug: 3800 });
    assert.ok(3800 / 220 <= 2200 / 127 + 0.01);
});

test('rede: TUG e TUE em 220 V F+N — corrente, condutores e queda de tensão', () => {
    const tug = N.dimensionarCircuito({ tipo: 'TUG', nome: 'TUG Sala', tensao: 220, ibVal: 3800 / 220, rota: 20, ehManual: true, polos: '1P' });
    assert.equal(tug.disjuntor, 20);
    assert.equal(tug.condutores.length, 3);                                   // F + N + PE
    const tug127 = N.dimensionarCircuito({ tipo: 'TUG', nome: 'TUG Sala', tensao: 127, ibVal: 3800 / 220, rota: 20, ehManual: true, polos: '1P' });
    assert.ok(Math.abs(tug.deltaVPct / tug127.deltaVPct - 127 / 220) < 1e-9);   // mesma corrente, tensão maior
    const ch = N.dimensionarCircuito({ tipo: 'TUE', nome: 'Chuveiro 7500 W', tensao: 220, ibVal: 7500 / 220, rota: 10, ehManual: true, polos: N.polosDaCarga(220, 1, '220/380') });
    assert.equal(ch.polos, '1P');
    assert.equal(ch.disjuntor, 40);
    assert.equal(ch.condutores.length, 3);
    // IDR F+F rotulado com a tensão entre fases da rede
    const plano = N.planejarIdrs({ circuitos: [{ num: 1, polos: '2P', fase: 'R + S', tipo: 'TUE' }], sistema: 'bifasico', configIdr: 'idr_geral', esquema: 'TN-S', inGeral: 50, modelo: { polos: '2P' }, tensaoFF: 380 });
    assert.ok(plano.idrs.some(i => /\(380 V\)/.test(i.nome)), plano.idrs.map(i => i.nome).join(', '));
});

test('rede: categorias da distribuidora na outra rede são escaladas e marcadas como estimadas', () => {
    const cpfl = N.CONCESSIONARIAS.cpfl, celesc = N.CONCESSIONARIAS.celesc;
    assert.deepEqual(N.redesDaConcessionaria(cpfl), ['127/220']);
    assert.deepEqual(N.redesDaConcessionaria(N.CONCESSIONARIAS.neoenergia), ['127/220', '220/380']);
    assert.deepEqual(N.redesDaConcessionaria(celesc), ['220/380']);
    assert.equal(N.categoriasNaRede(cpfl, '127/220'), cpfl.categorias);
    const cpfl380 = N.categoriasNaRede(cpfl, '220/380');
    assert.equal(cpfl380[0].kvaMax, Math.round(8 * 220 / 127 * 2) / 2);
    assert.ok(cpfl380.every(c => c.estimada));
    assert.equal(cpfl380[0].disj, cpfl.categorias[0].disj);                   // mesmo disjuntor e cabo
    assert.equal(N.categoriasNaRede(celesc, '220/380'), celesc.categorias);   // tabela própria em 220/380 V
    // demanda: mesma carga cabe em categoria menor na rede 220/380 V
    const tues = [{ nome: 'Chuveiro', pot: 7500 }, { nome: 'Forno elétrico', pot: 3000 }];
    const d127 = N.calcularDemanda(2000, 4000, tues, 'monofasico', 'neoenergia');
    const d220 = N.calcularDemanda(2000, 4000, tues, 'monofasico', 'neoenergia', '220/380');
    assert.ok(Math.abs(d127.demandaTotalKW - d220.demandaTotalKW) < 1e-9);
    assert.equal(d127.rede.id, '127/220');
    assert.equal(d220.rede.id, '220/380');
    assert.ok(d220.categoriasEstimadas && d220.atendeRede);
    assert.equal(d220.categoriaAtend.tipo, 'Monofásico');
    assert.notEqual(d127.categoriaAtend.tipo, 'Monofásico');
    assert.equal(N.calcularDemanda(2000, 4000, tues, 'bifasico', 'cpfl', '220/380').atendeRede, false);
});

test('rede: alimentador com a tensão fase-neutro da rede', () => {
    const base = { inDisjuntor: 63, secaoMinima: 10, sistema: 'bifasico', comprimento: 15, demandaKVA: 20 };
    const a127 = N.dimensionarAlimentador(Object.assign({}, base, { tensaoFN: 127 }));
    const a220 = N.dimensionarAlimentador(Object.assign({}, base, { tensaoFN: 220 }));
    perto(a127.ib, 20000 / (2 * 127));
    perto(a220.ib, 20000 / (2 * 220));
    assert.ok(a220.quedaPct < a127.quedaPct);
});

// ---------------------------------------------------------------------------
// Queda de tensão detalhada (opcional) e isolação EPR/XLPE
// ---------------------------------------------------------------------------
test('queda detalhada: resistividade na temperatura de serviço (70 °C PVC, 90 °C EPR/XLPE)', () => {
    perto(N.resistividadeCobre(20), 0.017241);
    perto(N.resistividadeCobre(70), 0.017241 * (1 + 0.00393 * 50));
    perto(N.resistividadeCobre(90), 0.017241 * (1 + 0.00393 * 70));
    assert.equal(N.PARAMETROS_PADRAO.metodoQueda, 'simplificado');
    // simplificado: inalterado (e é o padrão sem opções)
    const s0 = N.calcularQuedaTensao(10, 20, 2.5, 127);
    const s1 = N.calcularQuedaTensao(10, 20, 2.5, 127, 1, { metodo: 'simplificado' });
    perto(s0.volts, 2 * 0.0221 * 20 * 10 / 2.5);
    perto(s1.volts, s0.volts);
    assert.equal(s0.metodo, 'simplificado');
    // detalhado, seção pequena (sem reatância), cos φ = 1: só muda ρ
    const d70 = N.calcularQuedaTensao(10, 20, 2.5, 127, 1, { metodo: 'detalhado', isolacao: 'pvc', fp: 1 });
    perto(d70.volts, 2 * 20 * 10 * N.resistividadeCobre(70) / 2.5);
    assert.equal(d70.reatancia, 0);
    const d90 = N.calcularQuedaTensao(10, 20, 2.5, 127, 1, { metodo: 'detalhado', isolacao: 'epr', fp: 1 });
    assert.ok(d90.volts > d70.volts);
});

test('queda detalhada: reatância de 0,08 mΩ/m a partir de 25 mm² e fator de potência', () => {
    const fp = 0.95, sen = Math.sqrt(1 - fp * fp), rho = N.resistividadeCobre(70);
    const d16 = N.calcularQuedaTensao(80, 30, 16, 220, 1, { metodo: 'detalhado', fp });
    const d25 = N.calcularQuedaTensao(80, 30, 25, 220, 1, { metodo: 'detalhado', fp });
    perto(d16.volts, 2 * 30 * 80 * (rho / 16 * fp));
    perto(d25.volts, 2 * 30 * 80 * (rho / 25 * fp + 0.00008 * sen));
    assert.equal(d25.reatancia, 0.00008);
    const t35 = N.calcularQuedaTensao(80, 30, 35, 380, 3, { metodo: 'detalhado', fp });
    perto(t35.volts, Math.sqrt(3) * 30 * 80 * (rho / 35 * fp + 0.00008 * sen));
});

test('queda detalhada: dimensionarCircuito registra o método e usa cos φ 1 nas cargas resistivas', () => {
    const base = { tipo: 'TUE', tensao: 220, ibVal: 30, rota: 25, ehManual: true, polos: '2P' };
    const simp = N.dimensionarCircuito(Object.assign({ nome: 'Chuveiro' }, base));
    const det = N.dimensionarCircuito(Object.assign({ nome: 'Chuveiro' }, base), { metodoQueda: 'detalhado' });
    assert.equal(simp.metodoQueda, 'simplificado');
    assert.equal(det.metodoQueda, 'detalhado');
    perto(det.deltaVVolts, 2 * 25 * 30 * N.resistividadeCobre(70) / det.secaoMm2);
    const motor = N.dimensionarCircuito(Object.assign({ nome: 'Bomba de piscina' }, base), { metodoQueda: 'detalhado' });
    perto(motor.deltaVVolts, 2 * 25 * 30 * N.resistividadeCobre(70) / motor.secaoMm2 * 0.95);
    // alimentador também segue o método escolhido
    const alim = N.dimensionarAlimentador({ inDisjuntor: 100, secaoMinima: 25, sistema: 'trifasico', comprimento: 30, demandaKVA: 50, tensaoFN: 127, metodoQueda: 'detalhado' });
    assert.equal(alim.metodoQueda, 'detalhado');
});

test('isolação EPR/XLPE: Tabela 37 (B1) e FCT da Tabela 40 para 90 °C', () => {
    assert.equal(N.PARAMETROS_PADRAO.isolacao, 'pvc');
    assert.equal(N.izTabela(2.5, 2, 'epr'), 31);
    assert.equal(N.izTabela(2.5, 3, 'epr'), 28);
    assert.equal(N.izTabela(2.5, 2), 24);
    assert.equal(N.fatorTemperatura(40, 'epr'), 0.91);
    assert.equal(N.fatorTemperatura(40), 0.87);
    // TUG de 20 A com 3 circuitos agrupados: PVC exige 4 mm²; EPR atende com 2,5 mm² (31 × 0,7 = 21,7 A)
    const circ = { tipo: 'TUG', nome: 'TUG', tensao: 127, ibVal: 17.3, rota: 10, ehManual: true, polos: '1P' };
    assert.equal(N.dimensionarCircuito(Object.assign({}, circ)).secaoMm2, 4);
    const epr = N.dimensionarCircuito(Object.assign({}, circ), { isolacao: 'epr' });
    assert.equal(epr.secaoMm2, 2.5);
    assert.equal(epr.isolacao, 'epr');
    perto(epr.izCorrigida, 31 * 0.7);
});

// Testes da automação residencial (js/automacao.js).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../js/automacao.js');

// Casa de exemplo (40 px/m): sala 5×4 | cozinha 3×4 na mesma linha; quarto 4×4 | banheiro 2×2 abaixo
const ESC = 40;
const comodos = [
    { id: 1, nome: 'Sala de Estar', x: 40, y: 40, largura: 5, comprimento: 4, pavimentoId: 'terreo' },
    { id: 2, nome: 'Cozinha', x: 240, y: 40, largura: 3, comprimento: 4, pavimentoId: 'terreo' },
    { id: 3, nome: 'Quarto Casal', x: 40, y: 200, largura: 4, comprimento: 4, pavimentoId: 'terreo' },
    { id: 4, nome: 'Banheiro Social', x: 200, y: 200, largura: 2, comprimento: 2, pavimentoId: 'terreo' },
    { id: 5, nome: 'Garagem', x: 360, y: 40, largura: 3, comprimento: 6, pavimentoId: 'terreo' }
];
const pontos = [
    { id: 'i1', tipo: 'INTERRUPTOR', nome: 'Int. Sala', x: 60, y: 180, comodoId: 1 },
    { id: 'i2', tipo: 'INTERRUPTOR', nome: 'Int. Cozinha', x: 250, y: 180, comodoId: 2 },
    { id: 'i3', tipo: 'INTERRUPTOR', nome: 'Int. Quarto', x: 60, y: 340, comodoId: 3 },
    { id: 't1', tipo: 'TUG', nome: 'TUG TV / painel', destino: 'TV / painel', pot: 100, tensao: 127, x: 100, y: 60, comodoId: 1 },
    { id: 't2', tipo: 'TUG', nome: 'TUG Geladeira', destino: 'Geladeira', pot: 100, tensao: 127, x: 300, y: 60, comodoId: 2 },
    { id: 't3', tipo: 'TUG', nome: 'TUG Cabeceira – lado esquerdo', destino: 'Cabeceira – lado esquerdo', pot: 100, tensao: 127, x: 60, y: 220, comodoId: 3 },
    { id: 'e1', tipo: 'TUE', nome: 'Ar Condicionado Split Inverter 12.000 BTU', pot: 1150, tensao: 220, x: 180, y: 210, comodoId: 3 },
    { id: 'e2', tipo: 'TUE', nome: 'Chuveiro Elétrico Turbo Master', pot: 7500, tensao: 220, x: 270, y: 210, comodoId: 4 },
    { id: 'e3', tipo: 'TUE', nome: 'Cooktop por Indução 4 Bocas', pot: 7200, tensao: 220, x: 300, y: 150, comodoId: 2 }
];
const pavimentos = [{ id: 'terreo', nivel: 0, alturaPeDireito: 2.8, espessuraLajePiso: 0.15 }];
const levantar = nivel => A.levantarDispositivos({ comodos, pontos, pavimentos, escala: ESC, nivel });
const conta = (lista, tipo) => lista.filter(d => d.tipo === tipo).length;

test('catálogo: oito tecnologias com todos os critérios de comparação', () => {
    assert.deepEqual(A.TECNOLOGIAS.map(t => t.id), ['wifi', 'zigbee', 'zwave', 'thread', 'blemesh', 'knx', 'rs485', 'reles']);
    for (const t of A.TECNOLOGIAS) {
        for (const k of ['alcance', 'consumo', 'malha', 'hub', 'semInternet', 'custoPonto', 'obsBrasil']) assert.ok(t[k], `${t.id}.${k}`);
        assert.deepEqual(Object.keys(t.ecossistemas).sort(), ['alexa', 'apple', 'google', 'homeassistant', 'smartthings']);
        Object.values(t.ecossistemas).forEach(v => assert.ok(['sim', 'ponte', 'nao'].includes(v), t.id));
        Object.keys(A.CRITERIOS).filter(k => k !== 'ecossistema').forEach(k => assert.ok(t.notas[k] >= 0 && t.notas[k] <= 10, `${t.id}.${k}`));
        if (t.tipo === 'sem_fio') {
            assert.ok(/Anatel/.test(t.obsBrasil), `${t.id}: homologação Anatel`);
            assert.ok(t.radio.sensDbm < 0 && t.freqMHz > 0, t.id);
        }
    }
    assert.match(A.tecnologia('zwave').obsBrasil, /921,42 MHz/);
    assert.equal(A.tecnologia('thread').ecossistemas.apple, 'sim');
});

test('perfil do cômodo pelo nome', () => {
    assert.equal(A.perfilAmbiente('Suíte Master'), 'dormitorio');
    assert.equal(A.perfilAmbiente('Banheiro da Suíte'), 'banheiro');
    assert.equal(A.perfilAmbiente('Cozinha Gourmet'), 'cozinha');
    assert.equal(A.perfilAmbiente('Varanda Gourmet'), 'gourmet');
    assert.equal(A.perfilAmbiente('Hall de Entrada'), 'circulacao');
    assert.equal(A.perfilAmbiente('Área de Serviço'), 'servico');
});

test('levantamento: três níveis, cada um contém o anterior', () => {
    const b = levantar('basico'), i = levantar('intermediario'), c = levantar('completo');
    assert.ok(b.length < i.length && i.length < c.length, `${b.length} < ${i.length} < ${c.length}`);
    for (const tipo of Object.keys(A.TIPOS)) assert.ok(conta(i, tipo) >= conta(b, tipo) || tipo === 'modulo_rele', `${tipo} básico→intermediário`);
    // todo cômodo tem comando de luz
    comodos.forEach(cm => assert.ok(b.some(d => d.comodoId === cm.id && ['modulo_rele', 'interruptor', 'dimmer'].includes(d.tipo)), cm.nome));
    // ids únicos
    [b, i, c].forEach(l => assert.equal(new Set(l.map(d => d.id)).size, l.length));
});

test('levantamento: interruptores, tomadas e TUEs viram os dispositivos certos', () => {
    const b = levantar('basico'), i = levantar('intermediario'), c = levantar('completo');
    assert.equal(b.find(d => d.origemPontoId === 'i1').tipo, 'modulo_rele');
    assert.equal(i.find(d => d.origemPontoId === 'i1').tipo, 'interruptor');
    assert.equal(c.find(d => d.origemPontoId === 'i1').tipo, 'dimmer');            // sala dimerizável
    // ar-condicionado sempre com controle IR
    [b, i, c].forEach(l => assert.equal(l.find(d => d.origemPontoId === 'e1').tipo, 'controle_ir'));
    // chuveiro: relé de potência a partir do intermediário, com a corrente da carga
    assert.equal(b.find(d => d.origemPontoId === 'e2'), undefined);
    const ch = i.find(d => d.origemPontoId === 'e2');
    assert.equal(ch.tipo, 'rele_potencia');
    assert.equal(ch.ib, 34.1);
    // cooktop nunca é comandado; geladeira nunca vira tomada inteligente
    [b, i, c].forEach(l => { assert.equal(l.find(d => d.origemPontoId === 'e3'), undefined); assert.equal(l.find(d => d.origemPontoId === 't2'), undefined); });
    // TV vira tomada inteligente no intermediário
    assert.equal(i.find(d => d.origemPontoId === 't1').tipo, 'tomada');
    // sensores de segurança
    assert.equal(conta(b, 'sensor_gas'), 1);                                          // cozinha, já no básico
    assert.ok(i.some(d => d.tipo === 'fechadura' && d.comodoId === 1));               // entrada (sala do térreo)
    assert.ok(i.some(d => d.tipo === 'sensor_presenca' && d.comodoId === 4));         // banheiro
    assert.ok(c.some(d => d.tipo === 'cortina' && d.comodoId === 3));
});

test('pontuação: as prioridades mudam a tecnologia sugerida, com justificativa', () => {
    const zero = { custo: 0, offline: 0, quantidade: 0, area: 0, paredes: 0, pavimentos: 0, ecossistema: 0 };
    const barato = A.pontuarTecnologias(Object.assign({}, zero, { custo: 5 }), {});
    assert.equal(barato[0].id, 'wifi');
    const robusto = A.pontuarTecnologias(Object.assign({}, zero, { offline: 5, area: 5, paredes: 5, pavimentos: 5, quantidade: 5 }), {});
    assert.equal(robusto[0].id, 'knx');
    const apple = A.pontuarTecnologias(Object.assign({}, zero, { ecossistema: 5, custo: 1 }), { ecossistema: 'apple' });
    assert.equal(apple.filter(r => r.tipo === 'sem_fio')[0].id, 'thread');
    // casa térrea pequena com prioridades do projeto: sem fio (o cabeado não ganha por alcance que não faz falta)
    const pequena = { qtdDispositivos: 17, areaM2: 80, numPavimentos: 1, paredesMedias: 1.5 };
    assert.equal(A.pontuarTecnologias(A.prioridadesAutomaticas(pequena), pequena)[0].tipo, 'sem_fio');
    // casa grande, 3 pavimentos, muitos aparelhos e prioridade em funcionar sem internet: cabeado
    const grande = { qtdDispositivos: 120, areaM2: 450, numPavimentos: 3, paredesMedias: 4 };
    assert.equal(A.pontuarTecnologias(Object.assign(A.prioridadesAutomaticas(grande), { offline: 5, custo: 1 }), grande)[0].tipo, 'cabeado');
    const r = A.pontuarTecnologias(A.prioridadesAutomaticas({ qtdDispositivos: 40, areaM2: 150, numPavimentos: 2, paredesMedias: 2 }), { qtdDispositivos: 40, areaM2: 150, numPavimentos: 2 });
    r.forEach(x => { assert.ok(x.pontuacao >= 0 && x.pontuacao <= 100); assert.ok(x.justificativa.length >= 2); });
    assert.match(r[0].justificativa.join(' '), /ponto(s)? à frente de|Empatou com/);
    assert.ok(r.find(x => x.id === 'wifi').alertas.some(a => /30 a 50/.test(a)));
});

test('alcance: parede compartilhada conta uma vez; paredes e lajes aumentam a perda', () => {
    const geo = A.geometriaPlanta({ comodos, pavimentos, escala: ESC });
    // do meio da sala ao meio da cozinha: atravessa só a parede entre elas
    assert.equal(A.paredesNoSegmento(geo, 'terreo', { x: 3.5, y: 3 }, { x: 7.5, y: 3 }), 1);
    // da sala à garagem: sala|cozinha e cozinha|garagem
    assert.equal(A.paredesNoSegmento(geo, 'terreo', { x: 3.5, y: 3 }, { x: 11, y: 3 }), 2);
    const zig = A.tecnologia('zigbee'), zw = A.tecnologia('zwave');
    const a = { x: 3.5, y: 3, pavId: 'terreo' };
    const mesmo = A.perdaEnlace(zig, geo, a, { x: 4.5, y: 3, pavId: 'terreo' }, 'alvenaria');
    const comParede = A.perdaEnlace(zig, geo, a, { x: 7.5, y: 3, pavId: 'terreo' }, 'alvenaria');
    assert.equal(mesmo.paredes, 0);
    assert.ok(comParede.perdaDb > mesmo.perdaDb + 8);
    // drywall perde menos que concreto; sub-GHz perde menos por parede
    assert.ok(A.perdaEnlace(zig, geo, a, { x: 11, y: 3, pavId: 'terreo' }, 'drywall').perdaDb < A.perdaEnlace(zig, geo, a, { x: 11, y: 3, pavId: 'terreo' }, 'concreto').perdaDb);
    const b = { x: 11, y: 3, pavId: 'terreo' };
    assert.ok(A.perdaEnlace(zw, geo, a, b, 'alvenaria').perdaDb < A.perdaEnlace(zig, geo, a, b, 'alvenaria').perdaDb);
    // dois pavimentos: a laje soma perda
    const geo2 = A.geometriaPlanta({ comodos: comodos.concat([{ id: 9, nome: 'Quarto 2', x: 40, y: 40, largura: 5, comprimento: 4, pavimentoId: 'sup' }]),
        pavimentos: pavimentos.concat([{ id: 'sup', nivel: 1, alturaPeDireito: 2.8, espessuraLajePiso: 0.15 }]), escala: ESC });
    const cima = A.perdaEnlace(zig, geo2, a, { x: 3.5, y: 3, pavId: 'sup' }, 'alvenaria');
    assert.equal(cima.lajes, 1);
    assert.ok(cima.perdaDb > A.perdaEnlace(zig, geo2, a, { x: 3.5, y: 5.95, pavId: 'terreo' }, 'alvenaria').perdaDb);
});

test('alcance: malha leva o sinal adiante; repetidor resolve quem ficou fora; cabeado não se aplica', () => {
    // corredor de 6 cômodos de 5 m em linha
    const linha = Array.from({ length: 6 }, (_, k) => ({ id: 'L' + k, nome: 'Sala ' + k, x: k * 200, y: 0, largura: 5, comprimento: 4, pavimentoId: 'terreo' }));
    const geo = A.geometriaPlanta({ comodos: linha, pavimentos, escala: ESC });
    const sim = A.criarSimulador('zigbee', geo, 'concreto');
    const hub = { x: 2.5, y: 2, pavId: 'terreo' };
    const longe = { id: 'sensor', x: 27.5, y: 2, pavId: 'terreo', roteador: false };
    assert.ok(sim.margem(Object.assign({ hub: true }, hub), longe) < 0, 'sem malha não alcança');
    const semMalha = A.simularRede(sim, hub, [], [longe]);
    assert.deepEqual(semMalha.fora, ['sensor']);
    // tomadas inteligentes (roteadores) no meio do caminho
    const routers = [7.5, 12.5, 17.5, 22.5].map((x, i) => ({ id: 'r' + i, x, y: 2, pavId: 'terreo', roteador: true }));
    const comMalha = A.simularRede(sim, hub, [], routers.concat([longe]));
    assert.equal(comMalha.fora.length, 0);
    assert.ok(comMalha.porDispositivo.sensor.saltos >= 2);
    // repetidores sugeridos resolvem
    const cand = linha.map(c => ({ x: c.x / ESC + 2.5, y: 2, pavId: 'terreo' }));
    const sug = A.sugerirRepetidores(sim, hub, cand, [longe]);
    assert.ok(sug.repetidores.length >= 1);
    assert.equal(sug.resultado.fora.length, 0);
    // hub: o melhor candidato conecta pelo menos tanto quanto o primeiro
    const h = A.sugerirHub(sim, cand, routers.concat([longe]));
    assert.ok(h.resultado.conectados >= A.simularRede(sim, cand[0], [], routers.concat([longe])).conectados);
    // mapa de calor: perto do hub a margem é maior
    const mapa = A.mapaDeCalor(sim, [Object.assign({ hub: true }, hub)], 'terreo', { x0: 0, y0: 0, x1: 30, y1: 4 }, 1);
    assert.equal(mapa.valores.length, mapa.nx * mapa.ny);
    assert.ok(mapa.valores[1 * mapa.nx + 2] > mapa.valores[1 * mapa.nx + 28]);
    // KNX: barramento cabeado
    assert.equal(A.simularRede(A.criarSimulador('knx', geo, 'concreto'), hub, [], [longe]).aplicavel, false);
});

test('painel: atuadores em 4/8/12 canais, módulos e caixa comercial', () => {
    assert.deepEqual(A.agruparCanais(3).map(g => g.c), [4]);
    assert.deepEqual(A.agruparCanais(9).map(g => g.c), [12]);
    assert.deepEqual(A.agruparCanais(13).map(g => g.c), [12, 4]);
    assert.deepEqual(A.agruparCanais(0), []);
    assert.deepEqual(A.contatorPara(34.1), { a: 40, mod: 2 });
    assert.deepEqual(A.caixaComercial(13), { modulos: 24, fileiras: 2 });
    const fileiras = A.distribuirEmFileiras([{ polos: 8 }, { polos: 6 }, { polos: 4 }]);
    assert.deepEqual(fileiras.map(f => f.map(i => i.polos)), [[8, 4], [6]]);          // o de 4 aproveita a sobra da 1ª

    const devs = levantar('completo');
    const knx = A.montarPainel({ tecnologia: 'knx', dispositivos: devs });
    assert.ok(knx.cabeado);
    assert.ok(knx.itens.some(i => /Fonte de alimentação KNX 640 mA/.test(i.nome)));
    assert.ok(knx.itens.some(i => /Interface IP KNX/.test(i.nome)));
    assert.ok(knx.itens.some(i => /Contator modular 40 A/.test(i.nome)));       // chuveiro de 34 A
    assert.ok(knx.itens.some(i => /Disjuntor de alimentação/.test(i.nome)) && knx.itens.some(i => /DPS/.test(i.nome)));
    assert.ok(knx.modulosReserva >= Math.ceil(knx.modulosDispositivos * 0.2));
    assert.ok(knx.caixa.modulos >= knx.modulosTotal);
    // tabela de canais: cada canal liga a uma carga ou é reserva
    const luz = knx.canais.find(c => c.dispositivoId === devs.find(d => d.origemPontoId === 'i2').id);
    assert.ok(luz && /comutação KNX 10 A/.test(luz.atuador));
    // mais de 64 aparelhos → linhas com acopladores
    const muitos = Array.from({ length: 70 }, (_, k) => ({ id: 'p' + k, tipo: 'sensor_presenca', comodoId: 1 }));
    const grande = A.montarPainel({ tecnologia: 'knx', dispositivos: muitos });
    assert.ok(grande.linhasKnx >= 2);
    assert.ok(grande.itens.some(i => /Acoplador de linha/.test(i.nome)));
    // RS-485: controlador e fonte 24 V pelo consumo × 1,25
    const rs = A.montarPainel({ tecnologia: 'rs485', dispositivos: devs });
    assert.ok(rs.itens.some(i => /Controlador mestre RS-485/.test(i.nome)));
    assert.ok(rs.fonte.potenciaW >= rs.fonte.consumoW * 1.25);
    // sem fio: só os contatores vão ao quadro
    const zig = A.montarPainel({ tecnologia: 'zigbee', dispositivos: devs });
    assert.equal(zig.cabeado, false);
    assert.ok(zig.itens.every(i => i.grupo === 'potencia'));
    // DIN em trechos de até 12 módulos
    A.itensDinDoPainel(knx).forEach(i => assert.ok(i.polos >= 1 && i.polos <= 12));
});

test('painel: integrado ao QDC ou separado', () => {
    const devs = levantar('completo');
    assert.equal(A.decidirLocalPainel(A.montarPainel({ tecnologia: 'zigbee', dispositivos: devs }), 'auto').local, 'integrado');
    assert.equal(A.decidirLocalPainel(A.montarPainel({ tecnologia: 'knx', dispositivos: devs }), 'auto').local, 'separado');
    assert.equal(A.decidirLocalPainel({ cabeado: true, modulosTotal: 10, modulosReserva: 2 }, 'auto').local, 'integrado');
    assert.equal(A.decidirLocalPainel({ cabeado: true, modulosTotal: 40 }, 'integrado').local, 'integrado');
});

test('cabo de barramento pelas rotas: árvore KNX ≤ barramento RS-485; estrela é a maior', () => {
    const painel = { x: 0, y: 0, z: 1.5 };
    const pts = [{ x: 5, y: 0, z: 1.2 }, { x: 10, y: 0, z: 1.2 }, { x: 10, y: 5, z: 1.2 }, { x: 0, y: 8, z: 1.2 }];
    const knx = A.metragemBarramento('knx', painel, pts);
    const rs = A.metragemBarramento('rs485', painel, pts);
    const est = A.metragemBarramento('reles', painel, pts);
    assert.ok(knx.metros <= rs.metros && rs.metros <= est.metros, `${knx.metros} ≤ ${rs.metros} ≤ ${est.metros}`);
    assert.ok(knx.ok && knx.limiteM === 1000);
    assert.equal(A.metragemBarramento('knx', painel, []).metros, 0);
});

test('nobreak: só quando exigido; VA comercial, banco de baterias e circuito', () => {
    assert.equal(A.dimensionarNobreak({ exigido: false, cargas: [{ potW: 100 }] }), null);
    const nb = A.dimensionarNobreak({ exigido: true, autonomiaMin: 60, tipo: 'interativo', cargas: [{ id: 'hub', nome: 'Hub', potW: 40 }, { id: 'rot', nome: 'Roteador', potW: 60 }] });
    assert.equal(nb.potW, 100);
    assert.equal(nb.projW, 125);                       // +25%
    assert.equal(nb.vaMin, 208);                       // 125 W / 0,6
    assert.equal(nb.va, 600);
    assert.equal(nb.banco.tensaoV, 12);
    assert.equal(nb.energiaWh, 235);                   // 100 W × 1 h / (0,85 × 0,5)
    assert.equal(nb.banco.ah, 26);                     // 19,6 Ah → 26 Ah comercial
    assert.equal(nb.circuito.tensao, 127);
    assert.equal(nb.circuito.ib, 4.7);
    assert.match(nb.justificativa, /600 VA/);
    // carga desmarcada não entra
    const sem = A.dimensionarNobreak({ exigido: true, cargas: [{ potW: 100 }, { potW: 900, selecionada: false }] });
    assert.equal(sem.potW, 100);
    // online tem fator de potência maior
    assert.equal(A.dimensionarNobreak({ exigido: true, tipo: 'online', cargas: [{ potW: 700 }] }).va, 1000);
    // cargas de 24 Vcc têm a alternativa de fonte com DC-UPS
    const dc = A.dimensionarNobreak({ exigido: true, cargas: [{ potW: 30, dc24: true }, { potW: 20 }] });
    assert.ok(dc.alternativaDC && /DC-UPS/.test(dc.alternativaDC.texto));
});

test('cenas, materiais, mão de obra e memorial', () => {
    const devs = levantar('completo');
    const nome = id => (comodos.find(c => c.id === id) || {}).nome;
    const cenas = A.sugerirCenas(devs, nome);
    ['Sair de casa', 'Cinema', 'Dormir'].forEach(n => assert.ok(cenas.some(c => c.nome === n), n));
    assert.ok(cenas.find(c => c.nome === 'Cinema').acoes.some(a => /10%/.test(a)));   // sala com dimmer

    const zig = A.listaMateriais({ tecnologia: 'zigbee', dispositivos: devs, painel: A.montarPainel({ tecnologia: 'zigbee', dispositivos: devs }), repetidores: 2, metrosNeutro: 20 });
    assert.ok(zig.some(i => /coordenador Zigbee/.test(i.item)));
    assert.equal(zig.find(i => /Repetidor Zigbee/.test(i.item)).qtd, 2);
    assert.ok(zig.some(i => /neutro/.test(i.item) && i.unidade === 'm'));
    assert.ok(!zig.some(i => /Nobreak/.test(i.item)));                                 // não exigido
    zig.forEach(i => assert.ok(i.qtd > 0 && i.precoRef >= 0 && i.chave && i.item, i.item));

    const painel = A.montarPainel({ tecnologia: 'knx', dispositivos: devs });
    const nb = A.dimensionarNobreak({ exigido: true, cargas: A.cargasNobreakSugeridas({ tecnologia: 'knx', dispositivos: devs, painel }) });
    const knx = A.listaMateriais({ tecnologia: 'knx', dispositivos: devs, painel, metrosBarramento: 85, nobreak: nb, local: 'separado' });
    assert.ok(knx.some(i => /Cabo KNX/.test(i.item) && i.qtd === 85));
    assert.ok(knx.some(i => /Nobreak/.test(i.item)));
    assert.ok(knx.some(i => /Quadro de automação/.test(i.item)));

    const q = A.quantidadesMaoDeObra({ tecnologia: 'knx', dispositivos: devs, metrosBarramento: 85, nobreak: nb, cenas });
    assert.equal(q.automacaoDispositivos, devs.length);
    assert.equal(q.automacaoPainel, 1);
    assert.equal(q.automacaoCaboMetros, 85);

    const mem = A.gerarMemorial({ tecnologia: 'zigbee', nivel: 'completo', dispositivos: devs, cenas, nobreak: null, painel: A.montarPainel({ tecnologia: 'zigbee', dispositivos: devs }), metrosNeutro: 20 });
    assert.ok(mem.length >= 6);
    assert.ok(mem.some(s => /Nobreak/.test(s.titulo) && /Não exigido/.test(s.paragrafos[0])));
    assert.ok(mem.some(s => /Impacto/.test(s.titulo) && s.paragrafos.some(p => /neutro/.test(p))));
});

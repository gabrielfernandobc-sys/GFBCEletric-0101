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
    assert.deepEqual(A.contatorPara(34.1), { a: 40, mod: 2, contatos: '2NA' });
    assert.deepEqual(A.contatorPara(32, 3), { a: 40, mod: 3, contatos: '4NA' });       // carregador trifásico 32 A/fase
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

test('carregador trifásico: relé de potência com a corrente por fase e contator 4NA', () => {
    const pts = pontos.concat([{ id: 'w22', tipo: 'TUE', nome: 'Carregador Veicular Wallbox 22 kW trifásico (32 A por fase)', pot: 12194, tensao: 220, fases: 3, x: 400, y: 100, comodoId: 5 }]);
    const devs = A.levantarDispositivos({ comodos, pontos: pts, pavimentos, escala: ESC, nivel: 'intermediario' });
    const w = devs.find(d => d.origemPontoId === 'w22');
    assert.equal(w.tipo, 'rele_potencia');
    assert.equal(w.fases, 3);
    assert.ok(Math.abs(w.ib - 32) < 0.1, w.ib);
    const painel = A.montarPainel({ tecnologia: 'zigbee', dispositivos: devs });
    assert.ok(painel.itens.some(i => /Contator modular 40 A 4NA/.test(i.nome) && i.modulos === 3));
    // trifásico de 16 A/fase também vai a contator 4NA (relé inteligente comum chaveia uma fase só)
    const p16 = pontos.concat([{ id: 'w11', tipo: 'TUE', nome: 'Carregador Veicular Wallbox 11 kW trifásico (16 A por fase)', pot: 6097, tensao: 220, fases: 3, x: 400, y: 100, comodoId: 5 }]);
    const d16 = A.levantarDispositivos({ comodos, pontos: p16, pavimentos, escala: ESC, nivel: 'intermediario' });
    assert.ok(A.montarPainel({ tecnologia: 'zigbee', dispositivos: d16 }).itens.some(i => /Contator modular 20 A 4NA/.test(i.nome)));
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

// ---------------------------------------------------------------------------
// Pontos de alimentação dos dispositivos
// ---------------------------------------------------------------------------
test('energia: cada tipo é rede elétrica, bateria ou usa o ponto de origem', () => {
    const rede = ['cortina', 'sensor_gas', 'camera', 'videoporteiro', 'sirene', 'controle_ir', 'fechadura_eletrica'];
    const bateria = ['sensor_presenca', 'sensor_abertura', 'sensor_fumaca', 'sensor_vazamento', 'fechadura'];
    const origem = ['modulo_rele', 'interruptor', 'dimmer', 'tomada', 'rele_potencia', 'modulo_portao'];
    rede.forEach(t => assert.equal(A.TIPOS[t].energia, 'rede', t));
    bateria.forEach(t => assert.equal(A.TIPOS[t].energia, 'bateria', t));
    origem.forEach(t => assert.equal(A.TIPOS[t].energia, 'origem', t));
    assert.deepEqual(Object.keys(A.TIPOS).sort(), rede.concat(bateria, origem).sort());
    ['camera', 'videoporteiro'].forEach(t => assert.equal(A.TIPOS[t].dados, 'ip'));
    assert.equal(A.TIPOS.interruptor.neutro, true);
});

test('alimentação: vincula a TUG livre do cômodo a até 1,5 m, na altura certa', () => {
    // sala de 5 × 4 m em (40, 40) px a 40 px/m; cortina junto à parede de cima
    const sala = { id: 1, nome: 'Sala', x: 40, y: 40, largura: 5, comprimento: 4, pavimentoId: 'terreo' };
    const cortina = { id: 'cortina:1:0', tipo: 'cortina', comodoId: 1, pavimentoId: 'terreo', x: 140, y: 47 };
    const plano = pts => A.planejarAlimentacao({ dispositivos: [cortina], pontos: pts, comodos: [sala], escala: ESC, tecnologia: 'zigbee' });
    const tug = (id, x, y, altura, destino) => ({ id, tipo: 'TUG', nome: 'TUG ' + id, comodoId: 1, x, y, altura, destino });
    // alta, livre, a ~1 m: vincula
    let r = plano([tug('a', 180, 46, 'alta')]);
    assert.equal(r.itens[0].situacao, 'vinculado');
    assert.equal(r.itens[0].pontoId, 'a');
    assert.equal(r.semPonto, 0);
    // baixa (altura errada), longe (> 1,5 m) ou reservada para a TV: não vincula e sugere
    for (const pts of [[tug('b', 150, 46, 'baixa')], [tug('c', 230, 46, 'alta')], [tug('d', 150, 46, 'alta', 'TV / painel')]]) {
        r = plano(pts);
        assert.equal(r.itens[0].situacao, 'sugerido', JSON.stringify(pts));
    }
    // "Uso geral" pode ceder a tomada
    assert.equal(plano([tug('e', 150, 46, 'alta', 'Uso geral')]).itens[0].situacao, 'vinculado');
    // uma tomada atende um dispositivo só
    const dois = A.planejarAlimentacao({ dispositivos: [cortina, Object.assign({}, cortina, { id: 'cortina:1:1', x: 150 })], pontos: [tug('a', 180, 46, 'alta')], comodos: [sala], escala: ESC, tecnologia: 'zigbee' });
    assert.deepEqual(dois.itens.filter(i => i.dispositivoId).map(i => i.situacao).sort(), ['sugerido', 'vinculado']);
});

test('alimentação: ponto sugerido com altura, potência e destinação da tabela', () => {
    const devs = levantar('completo').concat([{ id: 'fe', tipo: 'fechadura_eletrica', comodoId: 1, pavimentoId: 'terreo', x: 100, y: 190 }]);
    const r = A.planejarAlimentacao({ dispositivos: devs, pontos: [], comodos, escala: ESC, tecnologia: 'zigbee', rack: { x: 5, y: 4, pavId: 'terreo' }, repetidores: [{ x: 6.5, y: 3, pavId: 'terreo' }] });
    const sug = tipo => r.itens.find(i => i.tipo === tipo);
    assert.equal(sug('cortina').sugestao.altura, 'alta');
    assert.equal(sug('cortina').sugestao.alturaM, 2.2);
    assert.equal(sug('cortina').sugestao.destino, 'Motor da cortina');
    assert.equal(sug('cortina').sugestao.nome, 'TUG Motor da cortina');
    assert.equal(sug('sensor_gas').sugestao.alturaM, 0.3);                   // GLP
    assert.equal(sug('sirene').sugestao.altura, 'alta');
    assert.equal(sug('controle_ir').sugestao.altura, 'alta');                 // voltado para o ar-condicionado
    assert.equal(sug('camera').situacao, 'poe');
    assert.equal(sug('fechadura_eletrica').situacao, 'fonte12v');
    assert.equal(sug('hub').situacao, 'rack');
    assert.equal(sug('repetidor').sugestao.altura, 'baixa');
    assert.equal(sug('sensor_presenca').situacao, 'bateria');
    assert.equal(sug('modulo_rele') || sug('interruptor') || sug('dimmer') ? 'origem' : '', 'origem');
    r.sugestoes.forEach(s => {
        assert.equal(s.tipo, 'TUG'); assert.equal(s.pot, 100); assert.equal(s.tensao, 127);
        const c = comodos.find(x => x.id === s.comodoId);
        assert.ok(s.x >= c.x && s.x <= c.x + c.largura * ESC && s.y >= c.y && s.y <= c.y + c.comprimento * ESC, s.nome);
    });
    assert.ok(r.metrosUtp > 0 && r.poe >= 1 && r.fontes12v === 1 && r.metrosCabo12v > 0);
    // gás natural: alto; câmera em tomada alta
    const gn = A.planejarAlimentacao({ dispositivos: devs, pontos: [], comodos, escala: ESC, tecnologia: 'zigbee', tipoGas: 'gn', cameraAlimentacao: 'tomada' });
    assert.equal(gn.itens.find(i => i.tipo === 'sensor_gas').sugestao.altura, 'alta');
    assert.equal(gn.itens.find(i => i.tipo === 'camera').sugestao.altura, 'alta');
    // as TUGs sugeridas, uma vez lançadas, passam a ser as vinculadas
    const lancadas = r.sugestoes.map((s, k) => Object.assign({ id: 'novo' + k }, s));
    const depois = A.planejarAlimentacao({ dispositivos: devs, pontos: lancadas, comodos, escala: ESC, tecnologia: 'zigbee', rack: { x: 5, y: 4, pavId: 'terreo' }, repetidores: [{ x: 6.5, y: 3, pavId: 'terreo' }] });
    assert.equal(depois.semPonto, 0);
    // materiais: switch PoE, cabo de rede e fonte 12 V
    const mats = A.listaMateriais({ tecnologia: 'zigbee', dispositivos: devs, painel: A.montarPainel({ tecnologia: 'zigbee', dispositivos: devs }), alimentacao: r });
    assert.ok(mats.some(m => /Switch PoE/.test(m.item)) && mats.some(m => /UTP/.test(m.item)) && mats.some(m => /Fonte 12 V/.test(m.item)));
    // o motor de cortina que veio de uma TUE de cortina usa a própria TUE
    const tueCortina = { id: 'tc', tipo: 'TUE', nome: 'Cortina / Persiana Motorizada Integrada', comodoId: 1, x: 100, y: 45 };
    const rc = A.planejarAlimentacao({ dispositivos: [{ id: 'cortina:pt', tipo: 'cortina', comodoId: 1, x: 100, y: 45, origemPontoId: 'tc' }], pontos: [tueCortina], comodos, escala: ESC, tecnologia: 'zigbee' });
    assert.equal(rc.itens[0].situacao, 'origem');
});

// ---------------------------------------------------------------------------
// Sincronização da lista editada à mão
// ---------------------------------------------------------------------------
test('lista editada: posição do ponto, ponto apagado sai da lista, sugestões novas e manuais intactos', () => {
    const editados = levantar('intermediario').concat([{ id: 'manual:sirene:1', tipo: 'sirene', comodoId: 1, pavimentoId: 'terreo', x: 77, y: 88, origemPontoId: null, detalhe: 'Incluído manualmente' }]);
    // o interruptor da sala mudou de lugar; o ar-condicionado do quarto foi apagado; entrou uma TUG de TV no quarto
    const pts = pontos.filter(p => p.id !== 'e1').map(p => p.id === 'i1' ? Object.assign({}, p, { x: 99, y: 150 }) : p)
        .concat([{ id: 't9', tipo: 'TUG', nome: 'TUG TV', destino: 'TV', pot: 100, tensao: 127, x: 120, y: 330, comodoId: 3 }]);
    const auto = A.levantarDispositivos({ comodos, pontos: pts, pavimentos, escala: ESC, nivel: 'intermediario' });
    const r = A.sincronizarDispositivos(editados, pts, auto, []);
    const sala = r.lista.find(d => d.origemPontoId === 'i1');
    assert.deepEqual([sala.x, sala.y], [99, 150]);                                  // posição atual do ponto
    assert.equal(r.removidos.length, 1);
    assert.equal(r.removidos[0].origemPontoId, 'e1');                               // IR do ar apagado
    assert.ok(!r.lista.some(d => d.origemPontoId === 'e1'));
    assert.deepEqual(r.novos.map(d => d.origemPontoId), ['t9']);                    // TV nova vira sugestão
    assert.equal(r.novos[0].tipo, 'tomada');
    const manual = r.lista.find(d => d.id === 'manual:sirene:1');
    assert.deepEqual([manual.x, manual.y], [77, 88]);                               // manual fica onde estava
    assert.ok(r.mudou);
    // sugestão descartada pelo usuário não volta
    assert.equal(A.sincronizarDispositivos(editados, pts, auto, ['t9']).novos.length, 0);
    // sem mudança nos pontos: nada muda
    const igual = A.sincronizarDispositivos(levantar('basico'), pontos, levantar('basico'), []);
    assert.equal(igual.mudou, false);
    assert.equal(igual.novos.length, 0);
    // relé de potência acompanha a potência da TUE
    const maisForte = pontos.map(p => p.id === 'e2' ? Object.assign({}, p, { pot: 5500 }) : p);
    const rel = A.sincronizarDispositivos(levantar('intermediario'), maisForte, [], []).lista.find(d => d.origemPontoId === 'e2');
    assert.equal(rel.ib, 25);
});

test('porta de entrada: "Sala de Estar e Jantar" e "Living / Jantar" contam como sala', () => {
    for (const nome of ['Sala de Estar e Jantar', 'Living / Jantar']) {
        const cs = [{ id: 1, nome: 'Suíte Master', x: 0, y: 0, largura: 4, comprimento: 4, pavimentoId: 'terreo' },
            { id: 2, nome, x: 160, y: 0, largura: 5, comprimento: 4, pavimentoId: 'terreo' }];
        const devs = A.levantarDispositivos({ comodos: cs, pontos: [], pavimentos, escala: ESC, nivel: 'intermediario' });
        assert.equal(devs.find(d => d.tipo === 'fechadura').comodoId, 2, nome);
        assert.equal(devs.find(d => d.tipo === 'videoporteiro').comodoId, 2, nome);
    }
});

// ---------------------------------------------------------------------------
// Regras configuráveis da alimentação e alcance de rádio documentado
// ---------------------------------------------------------------------------
test('alimentação: distância máxima para aproveitar a TUG existente é configurável (0,5 a 5 m)', () => {
    const sala = { id: 1, nome: 'Sala', x: 40, y: 40, largura: 5, comprimento: 4, pavimentoId: 'terreo' };
    const sirene = { id: 'sir', tipo: 'sirene', comodoId: 1, pavimentoId: 'terreo', x: 140, y: 47 };
    const tug = { id: 't2', tipo: 'TUG', nome: 'TUG alta', comodoId: 1, x: 220, y: 46, altura: 'alta' };     // ≈ 2 m da sirene
    const plano = dist => A.planejarAlimentacao({ dispositivos: [sirene], pontos: [tug], comodos: [sala], escala: ESC, tecnologia: 'zigbee', distanciaMaxTugM: dist });
    assert.equal(A.DISTANCIA_MAX_TUG_PADRAO_M, 1.5);
    assert.equal(plano(undefined).itens[0].situacao, 'sugerido');
    assert.equal(plano(undefined).regras.distanciaMaxTugM, 1.5);
    const r = plano(2.5);
    assert.equal(r.itens[0].situacao, 'vinculado');
    assert.match(r.itens[0].motivo, /2,5 m/);
    assert.equal(plano(0.1).regras.distanciaMaxTugM, 0.5);                    // limitado a 0,5–5 m
    assert.equal(plano(99).regras.distanciaMaxTugM, 5);
});

test('alimentação: tomada compartilhada por até 2 dispositivos de baixo consumo (cortina fica de fora)', () => {
    const sala = { id: 1, nome: 'Sala', x: 40, y: 40, largura: 5, comprimento: 4, pavimentoId: 'terreo' };
    const ir = { id: 'ir', tipo: 'controle_ir', comodoId: 1, pavimentoId: 'terreo', x: 140, y: 47 };
    const sir = { id: 'sir', tipo: 'sirene', comodoId: 1, pavimentoId: 'terreo', x: 150, y: 47 };
    const sir2 = { id: 'sir2', tipo: 'sirene', comodoId: 1, pavimentoId: 'terreo', x: 160, y: 47 };
    const cort = { id: 'cort', tipo: 'cortina', comodoId: 1, pavimentoId: 'terreo', x: 145, y: 47 };
    const tug = { id: 'ta', tipo: 'TUG', nome: 'TUG alta', comodoId: 1, x: 170, y: 46, altura: 'alta' };
    const plano = (devs, compartilhar) => A.planejarAlimentacao({ dispositivos: devs, pontos: [tug], comodos: [sala], escala: ESC, tecnologia: 'zigbee', compartilharTomada: compartilhar });
    const sit = r => r.itens.filter(i => i.dispositivoId).map(i => `${i.dispositivoId}:${i.situacao}`);
    // padrão: uma tomada por dispositivo
    assert.deepEqual(sit(plano([ir, sir], false)), ['ir:vinculado', 'sir:sugerido']);
    // compartilhada: os dois na mesma TUG
    const r = plano([ir, sir], true);
    assert.deepEqual(sit(r), ['ir:vinculado', 'sir:vinculado']);
    assert.equal(r.itens[1].pontoId, 'ta');
    assert.ok(r.itens[1].compartilhada);
    assert.match(r.itens[1].motivo, /compartilhada/);
    assert.equal(r.compartilhadas, 1);
    // no máximo 2 por ponto
    assert.deepEqual(sit(plano([ir, sir, sir2], true)), ['ir:vinculado', 'sir:vinculado', 'sir2:sugerido']);
    // motor de cortina não é de baixo consumo: não divide a tomada
    assert.deepEqual(sit(plano([ir, cort], true)), ['ir:vinculado', 'cort:sugerido']);
    assert.deepEqual(sit(plano([cort, ir], true)), ['cort:vinculado', 'ir:sugerido']);
});

test('alimentação: com tomada compartilhada, dois dispositivos próximos ganham uma única TUG sugerida', () => {
    const sala = { id: 1, nome: 'Sala', x: 40, y: 40, largura: 5, comprimento: 4, pavimentoId: 'terreo' };
    const ir = { id: 'ir', tipo: 'controle_ir', comodoId: 1, pavimentoId: 'terreo', x: 140, y: 47 };
    const sir = { id: 'sir', tipo: 'sirene', comodoId: 1, pavimentoId: 'terreo', x: 160, y: 47 };
    const base = { dispositivos: [ir, sir], pontos: [], comodos: [sala], escala: ESC, tecnologia: 'zigbee', tensaoFN: 220 };
    assert.equal(A.planejarAlimentacao(base).sugestoes.length, 2);
    const r = A.planejarAlimentacao(Object.assign({ compartilharTomada: true }, base));
    assert.equal(r.sugestoes.length, 1);
    assert.equal(r.sugestoes[0].destino, 'Controle IR + Sirene');
    assert.equal(r.sugestoes[0].tensao, 220);                                   // rede 220/380 V
    assert.equal(r.itens[1].compartilhaCom, 'ir');
    assert.equal(r.semPonto, 2);
    // lançada a TUG combinada, os dois ficam vinculados a ela
    const lancada = Object.assign({ id: 'nova' }, r.sugestoes[0]);
    const depois = A.planejarAlimentacao(Object.assign({ compartilharTomada: true }, base, { pontos: [lancada] }));
    assert.equal(depois.semPonto, 0);
    assert.deepEqual(depois.itens.filter(i => i.dispositivoId).map(i => i.pontoId), ['nova', 'nova']);
});

test('alcance: modelo do mapa de calor dentro da faixa interna publicada, com a origem dos valores', () => {
    const semFio = A.TECNOLOGIAS.filter(t => t.tipo === 'sem_fio');
    assert.equal(semFio.length, 5);
    assert.deepEqual(A.CENARIO_REFERENCIA_ALCANCE, { paredes: 3, material: 'alvenaria' });
    assert.ok(A.FONTES_ALCANCE.length > 50);
    semFio.forEach(t => {
        const r = t.radio;
        assert.ok(r.fonte && r.fonte.length > 40, `${t.id}: sem origem documentada`);
        assert.ok(Number.isFinite(r.antenaDbi) && r.antenaDbi <= 0, t.id);
        const [min, max] = r.alcanceInternoM;
        const d = A.alcanceEstimadoM(t.id);
        assert.ok(d >= min && d <= max, `${t.id}: ${d} m fora de ${min}–${max} m`);
        // números da faixa batem com o texto mostrado ao usuário
        assert.ok(t.alcance.includes(`${min} a ${max} m`), `${t.id}: ${t.alcance}`);
        // menos paredes, mais alcance; concreto, menos
        assert.ok(A.alcanceEstimadoM(t.id, 1) > d && A.alcanceEstimadoM(t.id, 3, 'concreto') < d);
    });
    // sub-GHz atravessa paredes melhor: com concreto o Z-Wave vai mais longe que o Zigbee
    assert.ok(A.alcanceEstimadoM('zwave', 3, 'concreto') > A.alcanceEstimadoM('zigbee', 3, 'concreto'));
    assert.equal(A.alcanceEstimadoM('knx'), null);
});

test('nobreak e TUGs sugeridas na rede 220/380 V ficam em 220 V (F+N)', () => {
    const cargas = [{ id: 'hub', nome: 'Hub', potW: 900, selecionada: true }];
    assert.equal(A.dimensionarNobreak({ exigido: true, cargas, autonomiaMin: 30, tipo: 'interativo' }).circuito.tensao, 127);
    assert.equal(A.dimensionarNobreak({ exigido: true, cargas, autonomiaMin: 30, tipo: 'interativo', tensaoFN: 220 }).circuito.tensao, 220);
});

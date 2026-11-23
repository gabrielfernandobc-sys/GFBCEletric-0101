// Testes do planejamento de IDRs comerciais (js/nbr5410.js).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../js/nbr5410.js');

const circuitos = [
    { num: 1, nome: 'Iluminação', tipo: 'Iluminação', polos: '1P', fase: 'R' },
    { num: 2, nome: 'TUG - Tomadas Gerais', tipo: 'TUG', polos: '1P', fase: 'S' },
    { num: 3, nome: 'TUG - Cozinha', tipo: 'TUG', polos: '1P', fase: 'R' },
    { num: 4, nome: 'TUE - Chuveiro', tipo: 'TUE', polos: '2P', fase: 'R + S' }
];

test('correntes comerciais: menor IDR ≥ disjuntor a montante', () => {
    assert.equal(N.correnteIdrComercial(70, '4P'), 80);
    assert.equal(N.correnteIdrComercial(40, '2P'), 40);
    assert.equal(N.correnteIdrComercial(50, '2P'), 63);
    assert.equal(N.correnteIdrComercial(110, '4P'), 125);
    assert.equal(N.correnteIdrComercial(110, '2P'), null);
    assert.deepEqual(N.IDR_CORRENTES_COMERCIAIS['2P'], [25, 40, 63, 80, 100]);
});

test('automático: tetrapolar no bifásico, bipolar no monofásico', () => {
    const bi = N.planejarIdrs({ circuitos, sistema: 'bifasico', configIdr: 'idr_geral', inGeral: 70 });
    assert.equal(bi.idrs.length, 1);
    assert.deepEqual(bi.idrs[0].polosLetras, ['N', 'R', 'S', 'T']);
    assert.equal(bi.idrs[0].corrente, 80);             // antes: "IDR 70 A", que não existe no mercado
    assert.deepEqual(bi.idrs[0].circuitos, [1, 2, 3, 4]);
    const mono = N.planejarIdrs({ circuitos: circuitos.slice(0, 3), sistema: 'monofasico', configIdr: 'idr_geral', inGeral: 40 });
    assert.deepEqual(mono.idrs[0].polosLetras, ['N', 'R']);
    assert.equal(mono.idrs[0].corrente, 40);
});

test('bipolar no bifásico: um IDR por fase (F+N) e um para 220 V (F+F)', () => {
    const r = N.planejarIdrs({ circuitos, sistema: 'bifasico', configIdr: 'idr_geral', inGeral: 63, modelo: { polos: '2P' } });
    assert.deepEqual(r.idrs.map(i => i.polosLetras.join('')), ['NR', 'NS', 'RS']);
    assert.deepEqual(r.idrs.map(i => i.circuitos), [[1, 3], [2], [4]]);
    r.idrs.forEach(i => { assert.equal(i.polos, '2P'); assert.equal(i.corrente, 63); });
    assert.equal(new Set(r.idrs.map(i => i.id)).size, 3);
});

test('IDR parcial e por grupos separam áreas molhadas', () => {
    const parcial = N.planejarIdrs({ circuitos, sistema: 'bifasico', configIdr: 'idr_parcial', inGeral: 50 });
    assert.deepEqual(parcial.direto, [1, 2]);
    assert.deepEqual(parcial.idrs[0].circuitos, [3, 4]);
    const grupos = N.planejarIdrs({ circuitos, sistema: 'bifasico', configIdr: 'idr_grupos', inGeral: 50 });
    assert.deepEqual(grupos.idrs.map(i => i.id), ['idr_grupo_1', 'idr_grupo_2']);
});

test('alertas: corrente abaixo do geral, 300 mA e TN-C/DDR sem IDR', () => {
    const r = N.planejarIdrs({ circuitos, sistema: 'bifasico', configIdr: 'idr_geral', inGeral: 70, modelo: { corrente: 40, sensibilidade: 300 } });
    assert.equal(r.idrs[0].corrente, 40);
    assert.ok(r.alertas.some(a => a.includes('abaixo do disjuntor geral')));
    assert.ok(r.alertas.some(a => a.includes('30 mA')));
    assert.equal(N.planejarIdrs({ circuitos, sistema: 'bifasico', configIdr: 'idr_geral', esquema: 'TN-C', inGeral: 50 }).idrs.length, 0);
    assert.equal(N.planejarIdrs({ circuitos, sistema: 'bifasico', configIdr: 'ddr_individual', inGeral: 50 }).idrs.length, 0);
    const grande = N.planejarIdrs({ circuitos, sistema: 'trifasico', configIdr: 'idr_geral', inGeral: 150 });
    assert.equal(grande.idrs[0].corrente, 125);
    assert.ok(grande.alertas.length);
});

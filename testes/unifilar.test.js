// Testes do diagrama unifilar (js/unifilar.js).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../js/unifilar.js');

test('circuito único recebe todos os pontos do grupo', () => {
    const r = U.atribuirCircuitos([
        { num: 1, potVal: 900, escopo: { tipo: 'ilum', grupo: 'ilum:todos', ids: ['sala', 'cozinha'] } },
        { num: 2, potVal: 1500, escopo: { tipo: 'pontos', grupo: 'tue:t1', ids: ['t1'] } }
    ], { sala: 400, cozinha: 500 }, { t1: 1500 });
    assert.deepEqual(r.ilumPorComodo, { sala: 1, cozinha: 1 });
    assert.deepEqual(r.porPonto, { t1: 2 });
});

test('circuito dividido por potência reparte os pontos em ordem', () => {
    // 6 tomadas de 600 VA = 3600 VA → 2 circuitos de 1800 VA
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const pot = Object.fromEntries(ids.map(i => [i, 600]));
    const esc = { tipo: 'pontos', grupo: 'tug:geral', ids };
    const r = U.atribuirCircuitos([{ num: 3, potVal: 1800, escopo: esc }, { num: 4, potVal: 1800, escopo: esc }], {}, pot);
    assert.deepEqual(ids.map(i => r.porPonto[i]), [3, 3, 3, 4, 4, 4]);
});

test('cada circuito dividido recebe ao menos um ponto', () => {
    const esc = { tipo: 'pontos', grupo: 'g', ids: ['x', 'y'] };
    const r = U.atribuirCircuitos([{ num: 5, potVal: 5000, escopo: esc }, { num: 6, potVal: 100, escopo: esc }], {}, { x: 100, y: 100 });
    assert.deepEqual([r.porPonto.x, r.porPonto.y], [5, 6]);
});

test('circuitos sem escopo (projetos antigos) são ignorados', () => {
    assert.deepEqual(U.atribuirCircuitos([{ num: 1 }], {}, {}), { ilumPorComodo: {}, porPonto: {} });
});

const base = {
    luz: { x: 100, y: 100 }, quadro: { x: 0, y: 0 }, rotaQuadro: [], letra: 'a', circIlum: 1,
    polosPorCircuito: { 1: '1P', 2: '1P', 3: '1P', 7: '2P' }
};

test('trechos do cômodo: interruptor, tomada, TUE e quadro', () => {
    const pontos = [
        { id: 's', tipo: 'INTERRUPTOR', x: 20, y: 150 },
        { id: 't1', tipo: 'TUG', x: 50, y: 190 },
        { id: 'c', tipo: 'TUE', nome: 'Chuveiro', x: 180, y: 40 }
    ];
    const tr = U.montarTrechosComodo(Object.assign({}, base, { pontos, circPorPonto: { t1: 2, c: 7 } }));
    const porTipo = t => tr.find(x => x.tipo === t);
    assert.deepEqual(porTipo('interruptor').condutores, [{ tipo: 'F', circ: 1 }, { tipo: 'R', circ: 1, letra: 'a' }]);
    assert.deepEqual(porTipo('tug').condutores.map(c => c.tipo + (c.circ || '')), ['F2', 'N2', 'T']);
    assert.deepEqual(porTipo('tue').condutores.map(c => c.tipo + (c.circ || '')), ['F7', 'F7', 'T']);
    // quadro → luminária leva iluminação (F+N), a tomada (F+N), o chuveiro (F+F) e uma proteção
    const p = tr[0];
    assert.equal(p.tipo, 'principal');
    assert.deepEqual(p.condutores.map(c => c.tipo + (c.circ || '')), ['F1', 'N1', 'F2', 'N2', 'F7', 'F7', 'T']);
    assert.equal(U.rotuloCircuitos(p.condutores), '1,2,7');
});

test('tomadas encadeadas: o trecho leva os circuitos que seguem adiante', () => {
    const pontos = [
        { id: 't1', tipo: 'TUG', x: 10, y: 10 },
        { id: 't2', tipo: 'TUG', x: 50, y: 10 },
        { id: 't3', tipo: 'TUG', x: 90, y: 10 }
    ];
    const tr = U.montarTrechosComodo(Object.assign({}, base, { pontos, encadearTugs: true, circPorPonto: { t1: 2, t2: 2, t3: 3 } }))
        .filter(t => t.tipo === 'tug');
    assert.equal(tr.length, 3);
    assert.equal(U.rotuloCircuitos(tr[0].condutores), '2,3');
    assert.equal(U.rotuloCircuitos(tr[2].condutores), '3');
    assert.deepEqual(tr[1].de, pontos[0]);   // em sequência: sai da tomada anterior
});

test('three-way leva dois retornos; luminária extra leva neutro, retorno e proteção', () => {
    const pontos = [
        { id: 's3', tipo: 'INTERRUPTOR', nome: 'Interruptor Paralelo Three-Way', comando: 'b', x: 10, y: 10 },
        { id: 'l2', tipo: 'ILUM', x: 160, y: 100 }
    ];
    const tr = U.montarTrechosComodo(Object.assign({}, base, { pontos, circPorPonto: {} }));
    assert.deepEqual(tr.find(t => t.tipo === 'interruptor').condutores.map(c => c.tipo + (c.letra || '')), ['F', 'Rb', 'Rb']);
    assert.deepEqual(tr.find(t => t.tipo === 'ilum').condutores.map(c => c.tipo), ['N', 'R', 'T']);
});

test('geometria: curva passa pelas pontas e a tangente no meio é paralela à corda', () => {
    const a = { x: 0, y: 0 }, b = { x: 100, y: 0 };
    const c = U.curva(a, b);
    assert.deepEqual(U.pontoNaCurva(a, c, b, 0), { x: 0, y: 0, tx: U.pontoNaCurva(a, c, b, 0).tx, ty: U.pontoNaCurva(a, c, b, 0).ty });
    const meio = U.pontoNaCurva(a, c, b, 0.5);
    assert.ok(Math.abs(meio.tx - 1) < 1e-9 && Math.abs(meio.ty) < 1e-9);
    assert.ok(Math.abs(meio.y) > 5, 'arco afastado da corda');
    const pts = U.amostrarCurva(a, b, 1, 10);
    assert.equal(pts.length, 11);
    assert.deepEqual(pts[10], { x: 100, y: 0 });
});

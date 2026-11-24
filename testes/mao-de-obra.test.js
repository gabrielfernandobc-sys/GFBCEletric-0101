// Testes da mão de obra do orçamento (js/mao-de-obra.js).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/mao-de-obra.js');

const q = { tomadas: 20, luzes: 6, interruptores: 6, especificos: 4, luminarias: 6, quadros: 1, dispositivos: 16,
    alimentadorMetros: 13.2, incluirAterramento: true, incluirPadrao: false, areaConstruida: 78.3, totalMaterial: 10000 };

test('tabela padrão tem todos os serviços e os valores editados prevalecem', () => {
    const t = M.tabelaPadrao();
    assert.equal(Object.keys(t).length, M.SERVICOS.length);
    assert.equal(t.ponto, 110);
    const m = M.mesclarTabela({ ponto: 95, inexistente: 1, luminaria: -3, quadroMontagem: 'abc' });
    assert.equal(m.ponto, 95);
    assert.equal(m.luminaria, 70);          // negativo ignorado
    assert.equal(m.quadroMontagem, 600);    // inválido ignorado
    assert.ok(!('inexistente' in m));
});

test('por ponto: pontos, TUE, luminárias, quadro, dispositivos, alimentador e aterramento', () => {
    const r = M.calcular(q, { modo: 'ponto' });
    const por = id => r.itens.find(i => i.id === id);
    assert.equal(por('ponto').qtd, 32);                 // 20 tomadas + 6 luzes + 6 interruptores
    assert.equal(por('ponto').subtotal, 32 * 110);
    assert.equal(por('pontoEspecifico').subtotal, 4 * 220);
    assert.equal(por('luminaria').qtd, 6);
    assert.equal(por('quadroMontagem').qtd, 1);
    assert.equal(por('dispositivo').subtotal, 16 * 50);
    assert.equal(por('alimentadorMetro').qtd, 14);      // metro arredondado para cima
    assert.equal(por('aterramento').qtd, 1);
    assert.equal(por('padraoEntrada'), undefined);      // opcional, desmarcado por padrão
    assert.equal(r.total, 32 * 110 + 4 * 220 + 6 * 70 + 600 + 16 * 50 + 14 * 15 + 300);
});

test('padrão de entrada só entra quando marcado; aterramento pode ser retirado', () => {
    const r = M.calcular(Object.assign({}, q, { incluirPadrao: true, incluirAterramento: false }), { modo: 'ponto' });
    assert.ok(r.itens.some(i => i.id === 'padraoEntrada' && i.subtotal === 1200));
    assert.ok(!r.itens.some(i => i.id === 'aterramento'));
});

test('percentual sobre o material e por m²', () => {
    const p = M.calcular(q, { modo: 'percentual' });
    assert.equal(p.total, 4500);
    const p2 = M.calcular(q, { modo: 'percentual', tabela: { percentualMaterial: 50 } });
    assert.equal(p2.total, 5000);
    const m2 = M.calcular(q, { modo: 'm2' });
    assert.equal(m2.itens[0].qtd, 78.3);
    assert.equal(m2.total, 78.3 * 60);
    const m2p = M.calcular(Object.assign({}, q, { incluirPadrao: true }), { modo: 'm2' });
    assert.equal(m2p.total, 78.3 * 60 + 1200);
});

test('por horas: soma das horas por serviço × hora do eletricista e do ajudante', () => {
    const r = M.calcular(q, { modo: 'horas' });
    const horas = 32 * 1.5 + 4 * 3 + 6 * 0.75 + 6 + 16 * 0.4 + 14 * 0.15 + 3;
    assert.equal(r.horasTotais, Math.ceil(horas));
    assert.equal(r.itens.length, 2);
    assert.equal(r.total, Math.ceil(horas) * (90 + 40));
    assert.ok(Array.isArray(r.itens[0].detalhe) && r.itens[0].detalhe.length === 7);
    const editado = M.calcular(q, { modo: 'horas', horas: { ponto: 1 } });
    assert.ok(editado.horasTotais < r.horasTotais);
});

test('totais: material, mão de obra, BDI e total geral', () => {
    assert.deepEqual(M.totais(10000, 5000, 0), { material: 10000, maoDeObra: 5000, bdiPct: 0, bdi: 0, total: 15000 });
    assert.deepEqual(M.totais(10000, 5000, 20), { material: 10000, maoDeObra: 5000, bdiPct: 20, bdi: 3000, total: 18000 });
    assert.equal(M.totais(100, 0, -5).bdi, 0);
});

test('modo desconhecido cai no por ponto; quantidades vazias não geram itens', () => {
    assert.equal(M.calcular(q, { modo: 'xyz' }).modo, 'ponto');
    const vazio = M.calcular({ quadros: 0, incluirAterramento: false }, { modo: 'ponto' });
    assert.deepEqual(vazio.itens, []);
    assert.equal(vazio.total, 0);
});

test('links de busca dos serviços com a região', () => {
    const l = M.linksDeBusca('ponto', 'Campinas SP');
    assert.equal(l.length, 4);
    assert.ok(l[0].url.includes(encodeURIComponent('Campinas SP')));
    l.forEach(x => assert.ok(x.url.startsWith('https://')));
});

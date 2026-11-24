// Destinação de cada tomada (TUG) pelo uso do ambiente (js/nbr5410.js).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../js/nbr5410.js');

const AMBIENTES = ['Cozinha', 'Copa', 'Área de Serviço', 'Lavanderia', 'Varanda Gourmet', 'Banheiro Social', 'Lavabo',
    'Sala de Estar', 'Sala de Jantar', 'Quarto Casal', 'Suíte Master', 'Dormitório 2', 'Escritório', 'Home Office',
    'Varanda', 'Garagem', 'Circulação', 'Hall', 'Closet', 'Despensa', 'Depósito'];

test('uma destinação por tomada, sem repetir no mesmo cômodo', () => {
    for (const nome of AMBIENTES) {
        for (const qtd of [1, 2, 3, 4, 6, 9]) {
            const d = N.destinacoesTomadas(nome, qtd, 0);
            assert.equal(d.length, qtd, `${nome} x${qtd}`);
            assert.equal(new Set(d.map(x => x.destino)).size, qtd, `${nome} x${qtd}: destinos repetidos`);
            d.forEach(x => assert.ok(['baixa', 'media', 'alta'].includes(x.altura), `${nome}: ${x.destino}`));
        }
    }
});

test('nos ambientes molhados, as primeiras tomadas (600 VA) são as da bancada', () => {
    for (const nome of ['Cozinha', 'Área de Serviço', 'Varanda Gourmet', 'Banheiro Social', 'Lavabo']) {
        const pots = N.potenciasTomadas(nome, 2, 0);
        const dest = N.destinacoesTomadas(nome, 2, 0);
        assert.deepEqual(pots, [600, 600], nome);
        assert.equal(dest[0].altura, 'media', `${nome}: ${dest[0].destino}`);
        assert.match(dest[0].destino, /Bancada|lavar roupas/, nome);
    }
    const cozinha = N.destinacoesTomadas('Cozinha', 4, 0).map(d => d.destino);
    assert.match(cozinha[0], /Bancada/);
    assert.equal(cozinha[3], 'Geladeira');
});

test('destinações típicas de cada ambiente', () => {
    assert.match(N.destinacoesTomadas('Quarto Casal', 2, 0)[0].destino, /Cabeceira/);
    assert.match(N.destinacoesTomadas('Sala de Estar', 1, 0)[0].destino, /TV/);
    assert.match(N.destinacoesTomadas('Escritório', 1, 0)[0].destino, /computador/);
    assert.match(N.destinacoesTomadas('Área de Serviço', 1, 0)[0].destino, /lavar roupas/);
    assert.match(N.destinacoesTomadas('Banheiro da Suíte', 1, 0)[0].destino, /lavatório/);   // banheiro, não dormitório
    assert.equal(N.perfilUsoAmbiente('Suíte Master'), 'dormitorio');
    assert.equal(N.perfilUsoAmbiente('Cozinha Gourmet'), 'cozinha');           // cozinha principal, com geladeira
    assert.equal(N.perfilUsoAmbiente('Varanda Gourmet'), 'gourmet');
    assert.equal(N.perfilUsoAmbiente('Lavanderia'), 'servico');
});

test('opções para o usuário escolher incluem as sugeridas e "Uso geral"', () => {
    for (const nome of AMBIENTES) {
        const op = N.opcoesDestinacaoTomada(nome).map(o => o.destino);
        assert.ok(op.some(o => /^Uso geral/.test(o)), nome);
        N.destinacoesTomadas(nome, 3, 0).forEach(d => {
            if (!/ \d+$/.test(d.destino)) assert.ok(op.includes(d.destino), `${nome}: ${d.destino}`);
        });
    }
});

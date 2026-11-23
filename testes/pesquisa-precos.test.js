// Testes da pesquisa de preços na internet (js/pesquisa-precos.js).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../js/pesquisa-precos.js');

const cabo = { categoriaId: 'condutores', chaveItem: '2.5', unidade: 'm', item: 'Cabo Flexível de Cobre 750V 2.5 mm² - Cor: Preto (Condutor Fase (F))', precoUnit: 2.85, qtdTotal: 52 };
const cabo10 = { categoriaId: 'condutores', chaveItem: '10.0', unidade: 'm', item: 'Cabo Flexível de Cobre 750V 10.0 mm² - Cor: Verde', precoUnit: 11.5, qtdTotal: 20 };
const eletroduto = { categoriaId: 'eletrodutos', chaveItem: '', unidade: 'm', item: 'Eletroduto Corrugado Flexível Reforçado DN 25 mm (3/4")', precoUnit: 3.1, qtdTotal: 120 };
const disjuntor = { categoriaId: 'protecao', chaveItem: '', unidade: 'un', item: 'Disjuntor Termomagnético Bipolar (2P) Curva C (5 a 10×In) 25 A', precoUnit: 32, qtdTotal: 2 };
const caboNu = { categoriaId: 'aterramento', chaveItem: '', unidade: 'm', item: 'Cabo de Cobre Nu Eletrolítico 25 mm² ou 16 mm²', precoUnit: 19.5, qtdTotal: 15 };

test('consultas de busca por tipo de material', () => {
    assert.equal(P.montarConsulta(cabo), 'cabo flexível 2,5mm 750v rolo 100m');
    assert.equal(P.montarConsulta(cabo10), 'cabo flexível 10mm 750v rolo 100m');
    assert.equal(P.montarConsulta(eletroduto), 'eletroduto corrugado reforçado 3/4 rolo 50m');
    assert.equal(P.montarConsulta(disjuntor), 'Disjuntor Termomagnético Bipolar Curva C 25 A');
});

test('links de busca das lojas trazem a consulta codificada', () => {
    const links = P.linksDeBusca('cabo flexível 2,5mm');
    assert.equal(links.length, 5);
    assert.equal(links.find(l => l.id === 'ml').url, 'https://lista.mercadolivre.com.br/cabo-flex%C3%ADvel-2%2C5mm');
    assert.ok(links.find(l => l.id === 'google').url.includes('tbm=shop&q=cabo%20flex%C3%ADvel%202%2C5mm'));
    links.forEach(l => assert.ok(l.url.startsWith('https://')));
});

test('comprimento no título do anúncio', () => {
    assert.equal(P.metrosNoTitulo('Cabo Flexível 2,5mm Rolo 100m Sil'), 100);
    assert.equal(P.metrosNoTitulo('Cabo flexivel 2.5mm 50 metros azul'), 50);
    assert.equal(P.metrosNoTitulo('Eletroduto Corrugado 3/4 25 mts'), 25);
    assert.equal(P.metrosNoTitulo('Cabo 2,5mm² preto'), null);
    assert.equal(P.metrosNoTitulo('Cabo nu 25mm² 10 metros'), 10);
    assert.equal(P.metrosNoTitulo('Disjuntor 25A curva C'), null);
});

test('cabos: preço do rolo vira R$/m e rolos sem comprimento são descartados', () => {
    const r = P.analisarResultados([
        { titulo: 'Cabo Flexível 2,5mm Rolo 100m Preto', preco: 290, moeda: 'BRL' },
        { titulo: 'Cabo flexível 2,5mm 50 metros', preco: 160, moeda: 'BRL' },
        { titulo: 'Cabo Flexível 2,5mm 100m Cobrecom', preco: 310, moeda: 'BRL' },
        { titulo: 'Cabo Flexível 2,5mm Sil', preco: 300, moeda: 'BRL' },          // sem comprimento
        { titulo: 'Cabo 2,5mm rolo 100m (USD)', preco: 60, moeda: 'USD' }        // outra moeda
    ], cabo);
    assert.equal(r.itens.length, 3);
    assert.equal(r.descartados, 2);
    assert.deepEqual(r.estatisticas, { n: 3, min: 2.9, mediana: 3.1, max: 3.2 });
});

test('valores fora da curva (kits, acessórios) não entram na estatística', () => {
    const r = P.analisarResultados([
        { titulo: 'Disjuntor bipolar 25A curva C', preco: 30 },
        { titulo: 'Disjuntor 2P 25A Steck', preco: 34 },
        { titulo: 'Disjuntor 2P 25A Schneider', preco: 38 },
        { titulo: 'Kit 12 disjuntores 2P 25A', preco: 390 },
        { titulo: 'Etiqueta para disjuntor', preco: 2 }
    ], disjuntor);
    assert.equal(r.estatisticas.n, 3);
    assert.equal(r.estatisticas.mediana, 34);
    assert.equal(r.itens.filter(i => i.foraDaCurva).length, 2);
});

test('item vendido por metro sem embalagem padrão aceita anúncio por metro', () => {
    const r = P.analisarResultados([
        { titulo: 'Cabo de cobre nu 25mm² (preço por metro)', preco: 21 },
        { titulo: 'Cabo cobre nu 25mm² 10 metros', preco: 200 }
    ], caboNu);
    assert.deepEqual(r.itens.map(i => i.precoUnitario), [21, 20]);
});

test('sem resultados válidos não há estatística', () => {
    assert.equal(P.analisarResultados([], cabo).estatisticas, null);
    assert.equal(P.analisarResultados([{ titulo: 'x', preco: 0 }], disjuntor).estatisticas, null);
});

test('agrupamento: cabos de uma bitola compartilham o preço', () => {
    const corVermelha = Object.assign({}, cabo, { item: 'Cabo Flexível de Cobre 750V 2.5 mm² - Cor: Vermelho', qtdTotal: 40 });
    const g = P.agruparMateriais([cabo, corVermelha, eletroduto, disjuntor]);
    assert.equal(g.length, 3);
    const gCabo = g.find(x => x.chave === 'cabo:2.5');
    assert.equal(gCabo.quantidade, 92);
    assert.equal(gCabo.materiais.length, 2);
    assert.equal(g.find(x => x.chave === 'eletroduto:25').nome, 'Eletroduto corrugado DN 25 (3/4")');
    assert.equal(g.find(x => x.tipo === 'unidade').chave, 'item:' + disjuntor.item);
});

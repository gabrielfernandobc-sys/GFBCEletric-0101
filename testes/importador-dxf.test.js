// Testes unitários do importador de plantas DXF (js/importador-dxf.js).
// Rodar:  npm test
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const DXF = require('../js/importador-dxf.js');

// --- geradores de DXF mínimo (só a seção ENTITIES e, opcionalmente, $INSUNITS)
const linha = (x1, y1, x2, y2, camada = 'PAREDE') => ['0', 'LINE', '8', camada, '10', x1, '20', y1, '11', x2, '21', y2];
const texto = (x, y, t, tipo = 'TEXT', camada = 'NOMES') => ['0', tipo, '8', camada, '10', x, '20', y, '1', t];
const polilinha = (pts, camada = 'PAREDE') => ['0', 'LWPOLYLINE', '8', camada, '90', pts.length, '70', 1, ...pts.flatMap(([x, y]) => ['10', x, '20', y])];
const retangulo = (x, y, w, h, camada) => [linha(x, y, x + w, y, camada), linha(x + w, y, x + w, y + h, camada), linha(x + w, y + h, x, y + h, camada), linha(x, y + h, x, y, camada)].flat();
function dxf(entidades, insunits) {
    const cab = insunits ? ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', insunits, '0', 'ENDSEC'] : [];
    return [...cab, '0', 'SECTION', '2', 'ENTITIES', ...entidades.flat(), '0', 'ENDSEC', '0', 'EOF'].join('\r\n');
}
const perto = (a, b, tol = 0.011) => assert.ok(Math.abs(a - b) <= tol, `esperado ${b}, obtido ${a}`);

test('limparTexto remove a formatação do MTEXT e converte códigos especiais', () => {
    assert.equal(DXF.limparTexto('{\\fArial|b1;SALA}\\PDE ESTAR'), 'SALA DE ESTAR');
    assert.equal(DXF.limparTexto('COZINHA \\U+00C1REA'), 'COZINHA ÁREA');
    assert.equal(DXF.limparTexto('%%c25'), 'Ø25');
});

test('rótulos de ambiente × outros textos', () => {
    for (const t of ['SALA', 'Quarto 2', 'COZINHA', 'BANHEIRO SOCIAL'])
        assert.ok(DXF.ehRotuloDeAmbiente(t), t);
    for (const t of ['3,50', 'A=12,00m²', 'PLANTA BAIXA ESC 1:50'])
        assert.ok(!DXF.ehRotuloDeAmbiente(t), t);
});

test('arquivo sem entidades devolve resultado vazio sem lançar erro', () => {
    const r = DXF.analisar(dxf([]));
    assert.equal(r.totalEntidades, 0);
    assert.deepEqual(r.comodos, []);
});

test('polilinha fechada em metros vira cômodo com a medida exata', () => {
    const r = DXF.analisar(dxf([polilinha([[0, 0], [4, 0], [4, 3.5], [0, 3.5]]), texto(2, 1.7, 'SALA')], 6));
    assert.equal(r.unidade, 'metros');
    assert.equal(r.comodos.length, 1);
    assert.equal(r.comodos[0].origem, 'polilinha');
    assert.equal(r.comodos[0].nome, 'Sala');
    perto(r.comodos[0].largura, 4);
    perto(r.comodos[0].comprimento, 3.5);
});

test('planta em milímetros sem $INSUNITS: unidade pelo tamanho e cômodos pelos rótulos', () => {
    // dois cômodos lado a lado (3,0 × 4,0 m e 2,5 × 4,0 m), paredes em linhas
    const ents = [
        retangulo(0, 0, 3000, 4000),
        retangulo(3000, 0, 2500, 4000),
        texto(1500, 2000, 'QUARTO 1'),
        texto(4250, 2000, 'BANHEIRO'),
        linha(0, -500, 5500, -500, 'COTAS')          // cota não é parede
    ];
    const r = DXF.analisar(dxf(ents));
    assert.equal(r.unidade, 'milímetros');
    assert.equal(r.fatorMetros, 0.001);
    const quarto = r.comodos.find(c => /quarto/i.test(c.nome));
    const banho = r.comodos.find(c => /banheiro/i.test(c.nome));
    assert.ok(quarto && banho, JSON.stringify(r.comodos));
    perto(quarto.largura, 3); perto(quarto.comprimento, 4);
    perto(banho.largura, 2.5); perto(banho.comprimento, 4);
});

test('contorno externo que envolve vários cômodos não vira cômodo', () => {
    const ents = [
        polilinha([[0, 0], [8, 0], [8, 5], [0, 5]]),             // contorno da casa
        polilinha([[0.15, 0.15], [3.9, 0.15], [3.9, 4.85], [0.15, 4.85]]),
        polilinha([[4.1, 0.15], [7.85, 0.15], [7.85, 4.85], [4.1, 4.85]])
    ];
    const r = DXF.analisar(dxf(ents, 6));
    assert.equal(r.comodos.length, 2);
    r.comodos.forEach(c => { perto(c.largura, 3.75); perto(c.comprimento, 4.7); });
});

test('escolha manual de unidade prevalece sobre o $INSUNITS', () => {
    const r = DXF.analisar(dxf([polilinha([[0, 0], [400, 0], [400, 300], [0, 300]])], 6), { fatorMetros: 0.01 });
    assert.equal(r.unidade, 'centímetros');
    perto(r.comodos[0].largura, 4);
    perto(r.comodos[0].comprimento, 3);
});

// Previsão mínima de tomadas (9.5.2.2) e alimentador (Tabela 36 B1/3 carregados, Tabela 58, 6.2.7.1).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../js/nbr5410.js');

test('classificação do ambiente pelo nome', () => {
    const casos = { 'Banheiro Social': 'banheiro', 'Lavabo': 'banheiro', 'WC': 'banheiro', 'Cozinha': 'cozinha_servico',
        'Área de Serviço': 'cozinha_servico', 'Lavanderia': 'cozinha_servico', 'Copa': 'cozinha_servico',
        'Varanda Gourmet': 'cozinha_servico', 'Varanda': 'varanda', 'Sacada': 'varanda', 'Sala de Estar': 'sala_dormitorio',
        'Dormitório 2': 'sala_dormitorio', 'Suíte Master': 'sala_dormitorio', 'Corredor': 'outro', 'Garagem': 'outro' };
    for (const [nome, classe] of Object.entries(casos)) assert.equal(N.classificarAmbiente(nome), classe, nome);
});

test('9.5.2.2.1: quantidade mínima de tomadas', () => {
    assert.equal(N.tomadasMinimas('Banheiro', 4, 8), 1);                // a) junto ao lavatório
    assert.equal(N.tomadasMinimas('Cozinha', 12, 14), 4);               // b) 14/3,5 = 4
    assert.equal(N.tomadasMinimas('Cozinha', 12, 14.1), 5);             // b) fração conta
    assert.equal(N.tomadasMinimas('Copa', 2, 5), 2);                    // b) 2 acima da bancada
    assert.equal(N.tomadasMinimas('Varanda', 6, 10), 1);                // c)
    assert.equal(N.tomadasMinimas('Sala de Estar', 18, 17), 4);         // d) 17/5 → 4
    assert.equal(N.tomadasMinimas('Dormitório', 9, 12), 3);             // d) 12/5 → 3
    assert.equal(N.tomadasMinimas('Depósito', 2, 6), 1);                // e) ≤ 2,25 m²
    assert.equal(N.tomadasMinimas('Corredor', 5, 10), 1);               // e) 2,25 a 6 m²
    assert.equal(N.tomadasMinimas('Escada', 8, 12), 3);                 // e) > 6 m²: 1 / 5 m
});

test('9.5.2.2.2: potências mínimas dos pontos', () => {
    assert.deepEqual(N.potenciasTomadas('Cozinha', 5, 0), [600, 600, 600, 100, 100]);
    assert.deepEqual(N.potenciasTomadas('Banheiro', 1, 0), [600]);
    assert.deepEqual(N.potenciasTomadas('Cozinha', 4, 8), [600, 600, 100, 100]);   // > 6 pontos no conjunto
    assert.deepEqual(N.potenciasTomadas('Sala', 3, 0), [100, 100, 100]);
});

test('Tabela 36 (B1) com 3 condutores carregados', () => {
    assert.equal(N.izMetodoB1TresCondutores(16), 68);
    assert.equal(N.izMetodoB1TresCondutores(25), 89);
    for (const s of N.SECOES_PADRONIZADAS) assert.ok(N.izMetodoB1TresCondutores(s) < N.izMetodoB1(s), `${s} mm²`);
});

test('alimentador bifásico: Iz com 3 carregados ≥ disjuntor geral (16 mm² não atende 70 A)', () => {
    const a = N.dimensionarAlimentador({ inDisjuntor: 70, secaoMinima: 16, sistema: 'bifasico', comprimento: 14, demandaKVA: 15, quedaTerminalMaxPct: 3 });
    assert.equal(a.secaoPorCorrente, 25);          // 16 mm²: 68 A < 70 A
    assert.equal(a.secao, 25);
    assert.equal(a.secaoPE, 16);                    // Tabela 58: 16 < S ≤ 35 → 16
    assert.equal(a.condutoresCarregados, 3);
    assert.ok(a.quedaTotalPct <= 5);
    assert.deepEqual(a.alertas, []);
});

test('alimentador: aumenta a seção pela queda total de 5% e alerta Ib > In', () => {
    const longo = N.dimensionarAlimentador({ inDisjuntor: 40, secaoMinima: 10, sistema: 'monofasico', comprimento: 60, demandaKVA: 4, quedaTerminalMaxPct: 3.5 });
    assert.equal(longo.condutoresCarregados, 2);
    assert.ok(longo.aumentouPorQueda);
    assert.ok(longo.quedaPct <= 1.5 + 1e-9);
    const sub = N.dimensionarAlimentador({ inDisjuntor: 70, secaoMinima: 16, sistema: 'bifasico', comprimento: 10, demandaKVA: 25 });
    assert.ok(sub.alertas.some(a => a.includes('Ib ≤ In')));
});

test('DR: flag explícita do circuito prevalece sobre o nome', () => {
    assert.equal(N.ehCircuitoAreaMolhada({ nome: 'Iluminação - Térreo', tipo: 'Iluminação', drObrigatorio: true }), true);
    assert.equal(N.ehCircuitoAreaMolhada({ nome: 'Iluminação - Térreo', tipo: 'Iluminação' }), false);
});

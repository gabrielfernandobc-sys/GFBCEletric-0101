// Testes do catálogo de aparelhos sugeridos (js/app/01-dados-estado.js).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// O arquivo é script de navegador; só o trecho antes do `state` é carregado aqui.
const fonte = fs.readFileSync(path.join(__dirname, '../js/app/01-dados-estado.js'), 'utf8');
const trecho = fonte.slice(0, fonte.indexOf('// Estado Global'));
const ctx = {};
vm.runInNewContext(trecho + '\nthis.CATALOGO = SUGESTOES_CARGAS_BR; this.sugerir = obterTuesSugeridasPorComodo;', ctx);
const { CATALOGO, sugerir } = ctx;
const css = fs.readFileSync(path.join(__dirname, '../libs/fontawesome/css/all.min.css'), 'utf8');

test('todo aparelho tem dados completos, nome único e ícone existente', () => {
    const nomes = new Set();
    for (const it of CATALOGO) {
        assert.ok(it.grupo && it.nome && it.desc, JSON.stringify(it));
        assert.ok(['TUG', 'TUE'].includes(it.tipo), it.nome);
        assert.ok([127, 220].includes(it.tensao), `${it.nome}: só há circuitos terminais de 127 V e 220 V`);
        assert.ok(it.pot > 0, it.nome);
        assert.ok(['baixa', 'media', 'alta'].includes(it.altura), it.nome);
        assert.ok(!nomes.has(it.nome), `nome repetido: ${it.nome}`);
        nomes.add(it.nome);
        assert.ok(css.includes(`.${it.icon}:before`) || css.includes(`.${it.icon},`), `ícone inexistente: ${it.icon}`);
    }
});

test('nenhum aparelho monofásico passa de 63 A (limite prático de um circuito residencial)', () => {
    for (const it of CATALOGO) assert.ok(it.pot / it.tensao <= 63, `${it.nome}: ${(it.pot / it.tensao).toFixed(1)} A`);
});

test('wallbox de 32 A em 220 V tem 7,04 kW (não 7,4 kW, que é 230 V)', () => {
    const w = CATALOGO.find(i => /Wallbox 7 kW/.test(i.nome));
    assert.equal(w.pot, 32 * 220);
});

test('sugestões por cômodo vêm do catálogo, com a mesma potência e tensão', () => {
    const comodos = ['Banheiro Social', 'Lavabo', 'Suíte Master Hidro', 'Cozinha', 'Área de Serviço', 'Quarto Casal',
        'Sala de Estar', 'Varanda Gourmet', 'Garagem', 'Escritório', 'Piscina', 'Depósito'];
    for (const nome of comodos) {
        const tues = sugerir({ nome, tipo: '' });
        assert.ok(tues.length > 0, nome);
        for (const t of tues) {
            const it = CATALOGO.find(i => i.nome === t.nome);
            assert.ok(it, `${nome}: ${t.nome}`);
            assert.equal(t.pot, it.pot); assert.equal(t.tensao, it.tensao);
        }
    }
});

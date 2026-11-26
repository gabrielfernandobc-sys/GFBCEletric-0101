// Testes dos modelos do "Novo Projeto" (js/modelos-projeto.js).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/modelos-projeto.js');

const ids = Object.keys(M.MODELOS);
const sobrepoe = (a, b) => a.x < b.x + b.largura && b.x < a.x + a.largura && a.y < b.y + b.comprimento && b.y < a.y + a.comprimento;

test('todo modelo cabe na área construível do seu lote (descontados os recuos)', () => {
    for (const id of ids) {
        const m = M.MODELOS[id];
        const area = M.areaConstruivel(m);
        assert.ok(area.largura > 0 && area.comprimento > 0, id);
        m.comodos.forEach(c => {
            assert.ok(c.x >= 0 && c.y >= 0, `${id}/${c.nome}`);
            assert.ok(c.x + c.largura <= area.largura + 1e-9, `${id}/${c.nome} largura: ${c.x + c.largura} > ${area.largura}`);
            assert.ok(c.y + c.comprimento <= area.comprimento + 1e-9, `${id}/${c.nome} profundidade`);
        });
    }
});

test('cômodos do mesmo pavimento não se sobrepõem', () => {
    for (const id of ids) {
        const cs = M.MODELOS[id].comodos;
        for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
            if (cs[i].pav === cs[j].pav) assert.ok(!sobrepoe(cs[i], cs[j]), `${id}: ${cs[i].nome} × ${cs[j].nome}`);
        }
    }
});

test('montagem em pixels: terreno do modelo, pontos dentro dos cômodos e quadro dentro do lote', () => {
    for (const id of ids) {
        for (const escala of [20, 35, 40, 75]) {
            const r = M.montar(id, { escala, origem: { x: 50, y: 60 } });
            const t = M.MODELOS[id].terreno;
            assert.equal(r.terreno.largura, t.largura); assert.equal(r.terreno.comprimento, t.comprimento);
            assert.deepEqual([r.terreno.x, r.terreno.y], [50, 60]);
            r.pontos.forEach(p => {
                const c = r.comodos.find(x => x.id === p.comodoId);
                assert.ok(p.x >= c.x && p.x <= c.x + c.largura * escala && p.y >= c.y && p.y <= c.y + c.comprimento * escala, `${id}@${escala}: ${p.nome}`);
                assert.equal(p.pavimentoId, c.pavimentoId);
            });
            const lote = { x: 50, y: 60, w: t.largura * escala, h: t.comprimento * escala };
            assert.ok(r.qdtPos.x >= lote.x && r.qdtPos.x <= lote.x + lote.w && r.qdtPos.y >= lote.y && r.qdtPos.y <= lote.y + lote.h, `${id}@${escala}: quadro fora do lote`);
            r.escadas.forEach(e => {
                const c = r.comodos.find(x => x.id === e.comodoId);
                const w = (e.orientacao === 'V' ? e.largura : e.comprimento) * escala, h = (e.orientacao === 'V' ? e.comprimento : e.largura) * escala;
                assert.ok(e.x >= c.x && e.x + w <= c.x + c.largura * escala + 1e-6 && e.y >= c.y && e.y + h <= c.y + c.comprimento * escala + 1e-6, `${id}: escada fora do cômodo`);
            });
        }
    }
});

test('a geometria é a mesma em qualquer escala (medidas proporcionais)', () => {
    const a = M.montar('casa_terrea', { escala: 40, origem: { x: 0, y: 0 } });
    const b = M.montar('casa_terrea', { escala: 20, origem: { x: 0, y: 0 } });
    a.comodos.forEach((c, i) => { assert.equal(c.x / 40, b.comodos[i].x / 20); assert.equal(c.y / 40, b.comodos[i].y / 20); });
    // cômodos vizinhos encostam (parede comum), sem vão nem sobreposição
    const sala = a.comodos.find(c => c.nome === 'Sala de Estar'), coz = a.comodos.find(c => c.nome === 'Cozinha');
    assert.equal(sala.x + sala.largura * 40, coz.x);
});

test('modelos com o número de pavimentos e cargas esperados; desconhecido vira em branco', () => {
    assert.equal(M.montar('sobrado', { escala: 40 }).pavimentos.length, 2);
    assert.equal(M.montar('apartamento', { escala: 40 }).terreno.comprimento, 5.5);
    assert.ok(M.montar('casa_terrea', { escala: 40 }).pontos.some(p => /Chuveiro/.test(p.nome)));
    const vazio = M.montar('xyz', { escala: 40 });
    assert.equal(vazio.comodos.length, 0);
    assert.equal(vazio.terreno.largura, 12);
});

test('modelos novos: resumo para os cartões, ordem completa e cargas do catálogo', () => {
    assert.deepEqual([...M.ORDEM].sort(), Object.keys(M.MODELOS).sort());
    for (const id of M.ORDEM) {
        const r = M.resumo(id);
        assert.ok(r.nome && r.descricao && r.icone, id);
        if (id !== 'em_branco') assert.ok(r.comodos > 0 && r.areaM2 > 0, id);
    }
    const popular = M.resumo('casa_popular_2q');
    assert.ok(popular.areaM2 >= 45 && popular.areaM2 <= 55, popular.areaM2);
    assert.equal(M.resumo('casa_3q_suite').comodos, 11);
    const sob = M.montar('sobrado_3suites', { escala: 40 });
    assert.equal(sob.pavimentos.length, 2);
    assert.equal(sob.alimentacao.sistema, 'trifasico');                      // carga alta: entrada trifásica
    assert.equal(sob.comodos.filter(c => /Suíte/.test(c.nome) && !/Banheiro/.test(c.nome)).length, 3);
    assert.equal(sob.escadas.length, 1);
    const apto = M.montar('apartamento_2q', { escala: 40 });
    assert.equal(apto.pavimentos[0].alturaPeDireito, 2.6);
    assert.equal(apto.pavimentos[0].tipoPassagemCabos, 'teto');              // fiação pela laje
    assert.equal(M.montar('casa_terrea', { escala: 40 }).alimentacao.sistema, 'bifasico');
    // todo modelo com cômodos tem chuveiro e os aparelhos novos usam os nomes do catálogo
    for (const id of ['casa_popular_2q', 'casa_3q_suite', 'sobrado_3suites', 'apartamento_2q']) {
        const tues = [].concat(...M.MODELOS[id].comodos.map(c => (c.pontos || []).filter(p => p.tipo === 'TUE')));
        assert.ok(tues.some(t => /Chuveiro/.test(t.nome)), id);
        tues.forEach(t => assert.ok(t.pot > 0 && [127, 220].includes(t.tensao), `${id}: ${t.nome}`));
    }
});

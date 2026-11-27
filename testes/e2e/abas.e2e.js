/* =============================================================================
   Testes de ponta a ponta das abas (js/app/01–17) — npm run test:e2e
   -----------------------------------------------------------------------------
   Cada modelo de Novo Projeto é aberto e percorre todas as abas; o teste exige
   0 erros de JavaScript e 0 circuitos não conformes. Os 4 modelos novos também
   são verificados com a automação incluída (Zigbee e KNX): as TUGs lançadas pela
   aba Automação precisam ganhar circuito.
   ============================================================================= */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { abrirApp } = require('./navegador.js');

const ABAS = ['planta', 'instalacoes', 'visualizacao3d', 'alimentador', 'materiais', 'automacao', 'arquivos', 'duvidas', 'planta'];
const MODELOS_NOVOS = ['casa_popular_2q', 'casa_3q_suite', 'sobrado_3suites', 'apartamento_2q'];

let app;
test.before(async () => { app = await abrirApp(); });
test.after(async () => { if (app) await app.navegador.close(); });

/** Erros novos desde a última chamada (e esvazia a lista). */
function errosNovos() {
    return app.erros.splice(0, app.erros.length);
}

/** Abre o modelo, passa por todas as abas e gera as pranchas de impressão; devolve um resumo. */
async function percorrerModelo(id, ajuste) {
    return app.pagina.evaluate(({ id, abas, ajuste }) => {
        selecionarTemplateNovoProjeto(id);
        confirmarIniciarNovoProjeto();
        if (ajuste && ajuste.redeTensao && typeof alterarRedeTensao === 'function') alterarRedeTensao(ajuste.redeTensao);
        for (const aba of abas) trocarAba(aba);
        if (typeof gerarPranchasImpressao === 'function') gerarPranchasImpressao();
        if (typeof renderizarMemorialAba6 === 'function') renderizarMemorialAba6();
        const cs = state.circuitosCalculados || [];
        return {
            comodos: state.comodos.length,
            pontos: state.pontosEletricos.length,
            circuitos: cs.length,
            naoConformes: cs.filter(c => !c.conforme).map(c => `C${c.num} ${c.nome}: ${(c.alertas || []).join(' ')}`.slice(0, 200)),
            cabosM: (state.quantitativoCabosPorCor || []).reduce((s, c) => s + (c.metrosTotal || 0), 0)
        };
    }, { id, abas: ABAS, ajuste: ajuste || null });
}

test('o app abre sem erros de JavaScript', async () => {
    assert.deepEqual(errosNovos(), []);
    const titulo = await app.pagina.title();
    assert.match(titulo, /PRO-EL[ÉE]TRICA/i);
});

test('todos os modelos de Novo Projeto: todas as abas, 0 erros de JS e 0 circuitos não conformes', async (t) => {
    const ids = await app.pagina.evaluate(() => ModelosProjeto.ORDEM.slice());
    assert.ok(ids.length >= 8, `modelos: ${ids.join(', ')}`);
    for (const id of ids) {
        await t.test(id, async () => {
            const r = await percorrerModelo(id);
            assert.deepEqual(errosNovos(), [], `erros de JS em ${id}`);
            assert.deepEqual(r.naoConformes, [], `circuitos não conformes em ${id}`);
            if (id !== 'em_branco') {
                assert.ok(r.comodos > 0 && r.pontos > 0 && r.circuitos > 0, JSON.stringify(r));
                assert.ok(r.cabosM > 0, 'quantitativo de cabos vazio');
            }
        });
    }
});

for (const tecnologia of ['zigbee', 'knx']) {
    test(`modelos novos com a automação incluída (${tecnologia}): TUGs lançadas ganham circuito`, async (t) => {
        for (const id of MODELOS_NOVOS) {
            await t.test(id, async () => {
                const r = await app.pagina.evaluate(({ id, tecnologia, abas }) => {
                    selecionarTemplateNovoProjeto(id);
                    confirmarIniciarNovoProjeto();
                    trocarAba('automacao');
                    alterarAutomacao('nivel', 'completo');
                    alterarAutomacao('tecnologia', tecnologia);
                    alterarAutomacao('incluir', true);
                    const antes = calcularAutomacao().alimentacao;
                    const sugeridos = antes.sugestoes.length;
                    lancarPontosAlimentacaoAutomacao();
                    const depois = calcularAutomacao().alimentacao;
                    for (const aba of abas) trocarAba(aba);
                    const lancadas = state.pontosEletricos.filter(p => p.origemAutomacao);
                    const mapa = (state.unifilar && state.unifilar.porPonto) || {};
                    const cs = state.circuitosCalculados || [];
                    const nums = new Set(cs.map(c => c.num));
                    return {
                        sugeridos,
                        lancadas: lancadas.length,
                        semCircuito: lancadas.filter(p => !nums.has(mapa[p.id])).map(p => p.nome),
                        semPonto: depois.semPonto,
                        circuitosAutomacao: cs.filter(c => /automa|rack|nobreak/i.test(c.nome)).length,
                        naoConformes: cs.filter(c => !c.conforme).map(c => `C${c.num} ${c.nome}: ${(c.alertas || []).join(' ')}`.slice(0, 200))
                    };
                }, { id, tecnologia, abas: ABAS });
                assert.deepEqual(errosNovos(), [], `erros de JS em ${id}/${tecnologia}`);
                assert.ok(r.sugeridos > 0, `nenhum ponto sugerido em ${id}`);
                assert.equal(r.lancadas, r.sugeridos);
                assert.deepEqual(r.semCircuito, [], 'TUG lançada sem circuito');
                assert.equal(r.semPonto, 0);
                assert.ok(r.circuitosAutomacao > 0, 'circuito da automação ausente');
                assert.deepEqual(r.naoConformes, []);
            });
        }
    });
}

test('rede 220/380 V: todos os modelos sem erros, sem circuitos não conformes e sem pontos em 127 V', async (t) => {
    const ids = await app.pagina.evaluate(() => ModelosProjeto.ORDEM.slice());
    try {
        for (const id of ids) {
            await t.test(id, async () => {
                const r = await percorrerModelo(id, { redeTensao: '220/380' });
                const extra = await app.pagina.evaluate(() => ({
                    rede: redeAtivaProjeto().id,
                    tensoes127: state.pontosEletricos.filter(p => Number(p.tensao) === 127).map(p => p.nome),
                    circuitos127: (state.circuitosCalculados || []).filter(c => Number(c.tensao) === 127).map(c => c.nome),
                    tue2P220: (state.circuitosCalculados || []).filter(c => c.tipo === 'TUE' && Number(c.tensao) === 220 && c.polos !== '1P').map(c => c.nome),
                    opcoes: Array.from(document.getElementById('selModalPontoTensao').options).map(o => o.value)
                }));
                assert.deepEqual(errosNovos(), [], `erros de JS em ${id}`);
                assert.deepEqual(r.naoConformes, [], `circuitos não conformes em ${id}`);
                assert.equal(extra.rede, '220/380');
                assert.deepEqual(extra.tensoes127, []);
                assert.deepEqual(extra.circuitos127, []);
                assert.deepEqual(extra.tue2P220, [], 'aparelho de 220 V deve ser F+N na rede 220/380 V');
                assert.deepEqual(extra.opcoes, ['220', '380', '380-3F']);
            });
        }
        await t.test('volta para 127/220 V e queda detalhada com EPR', async () => {
            const r = await app.pagina.evaluate(() => {
                selecionarTemplateNovoProjeto('casa_3q_suite'); confirmarIniciarNovoProjeto();
                alterarRedeTensao('127/220');
                alterarMetodoQueda('detalhado'); alterarIsolacaoCabos('epr');
                for (const aba of ['alimentador', 'materiais', 'duvidas']) trocarAba(aba);
                if (typeof gerarPranchasImpressao === 'function') gerarPranchasImpressao();
                const cs = state.circuitosCalculados || [];
                const res = {
                    tugs: [...new Set(state.pontosEletricos.filter(p => p.tipo === 'TUG').map(p => p.tensao))],
                    metodos: [...new Set(cs.map(c => c.metodoQueda))],
                    naoConformes: cs.filter(c => !c.conforme).map(c => c.nome),
                    memorial: /método detalhado/.test(document.getElementById('lblGuiaMetodoQueda').textContent),
                    cabo: (state.quantitativoMateriaisDetalhado || []).some(m => /0,6\/1 kV/.test(m.item))
                };
                alterarMetodoQueda('simplificado'); alterarIsolacaoCabos('pvc');
                return res;
            });
            assert.deepEqual(errosNovos(), []);
            assert.deepEqual(r.tugs, [127]);
            assert.deepEqual(r.metodos, ['detalhado']);
            assert.deepEqual(r.naoConformes, []);
            assert.ok(r.memorial, 'memorial não mostra o método detalhado');
            assert.ok(r.cabo, 'orçamento sem o cabo 0,6/1 kV');
        });
    } finally {
        await app.pagina.evaluate(() => alterarRedeTensao('127/220'));
        errosNovos();
    }
});

test('automação na rede 220/380 V com tomada compartilhada e distância de 2 m', async () => {
    try {
        const r = await app.pagina.evaluate((abas) => {
            selecionarTemplateNovoProjeto('casa_3q_suite'); confirmarIniciarNovoProjeto();
            alterarRedeTensao('220/380');
            trocarAba('automacao');
            alterarAutomacao('nivel', 'completo'); alterarAutomacao('tecnologia', 'zigbee'); alterarAutomacao('incluir', true);
            const sozinha = calcularAutomacao().alimentacao.sugestoes.length;
            alterarAutomacao('compartilharTomada', true); alterarAutomacao('distanciaMaxTug', '2');
            const al = calcularAutomacao().alimentacao;
            const regrasNaTela = !!document.getElementById('inpDistanciaMaxTugAut') && document.getElementById('chkCompartilharTomadaAut').checked;
            lancarPontosAlimentacaoAutomacao();
            for (const aba of abas) trocarAba(aba);
            const depois = calcularAutomacao().alimentacao;
            const cs = state.circuitosCalculados || [];
            const rack = cs.find(c => /rack/i.test(c.nome));
            const lancadas = state.pontosEletricos.filter(p => p.origemAutomacao);
            const mapa = (state.unifilar && state.unifilar.porPonto) || {};
            const res = {
                sozinha, compartilhada: al.sugestoes.length, regras: al.regras, regrasNaTela, semPonto: depois.semPonto,
                tensoesLancadas: [...new Set(lancadas.map(p => p.tensao))],
                semCircuito: lancadas.filter(p => !cs.some(c => c.num === mapa[p.id])).length,
                rack: rack ? `${rack.tensao} ${rack.polos}` : null,
                naoConformes: cs.filter(c => !c.conforme).map(c => c.nome)
            };
            alterarAutomacao('compartilharTomada', false); alterarAutomacao('distanciaMaxTug', '1.5');
            return res;
        }, ABAS);
        assert.deepEqual(errosNovos(), []);
        assert.ok(r.regrasNaTela, 'controles das regras ausentes na aba');
        assert.deepEqual(r.regras, { distanciaMaxTugM: 2, compartilharTomada: true, maxPorTomada: 2 });
        assert.ok(r.compartilhada <= r.sozinha, JSON.stringify(r));
        assert.equal(r.semPonto, 0);
        assert.deepEqual(r.tensoesLancadas, [220]);
        assert.equal(r.semCircuito, 0);
        assert.equal(r.rack, '220 1P');
        assert.deepEqual(r.naoConformes, []);
    } finally {
        await app.pagina.evaluate(() => alterarRedeTensao('127/220'));
        errosNovos();
    }
});

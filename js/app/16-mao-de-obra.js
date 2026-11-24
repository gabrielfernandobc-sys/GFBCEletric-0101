/* PRO-ELÉTRICA CAD — 16-mao-de-obra.js
   Mão de obra no orçamento da aba Materiais: quantidades a partir do projeto,
   visão "Mão de Obra", tabela de referência editável, BDI e totais.
   Regras de cálculo em js/mao-de-obra.js (testáveis).
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */

        const MAO_DE_OBRA_PADRAO = { modo: 'ponto', tabela: {}, horas: {}, bdiPct: 0, incluirAterramento: true, incluirPadrao: false, regiao: '' };

        function configMaoDeObra() {
            state.maoDeObra = Object.assign({}, MAO_DE_OBRA_PADRAO, state.maoDeObra || {});
            state.maoDeObra.tabela = Object.assign({}, state.maoDeObra.tabela || {});
            state.maoDeObra.horas = Object.assign({}, state.maoDeObra.horas || {});
            return state.maoDeObra;
        }

        function formatarReaisMO(v) {
            return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        /** Quantidades do projeto usadas pela mão de obra. */
        function obterQuantidadesMaoDeObra(totalMaterial) {
            const cfg = configMaoDeObra();
            const comodos = state.comodos || [];
            const idsComodos = new Set(comodos.map(c => c.id));
            const pontos = (state.pontosEletricos || []).filter(p => idsComodos.has(p.comodoId));
            const contar = tipo => pontos.filter(p => p.tipo === tipo).length;
            // todo cômodo tem ao menos um ponto de luz e um comando (desenhados mesmo sem ponto lançado)
            let luzes = 0, interruptores = 0;
            comodos.forEach(c => {
                luzes += Math.max(1, pontos.filter(p => p.comodoId === c.id && p.tipo === 'ILUM').length);
                interruptores += Math.max(1, pontos.filter(p => p.comodoId === c.id && p.tipo === 'INTERRUPTOR').length);
            });
            const quadros = (state.regimeImovel === 'imoveis_separados' && Array.isArray(state.imoveis) && state.imoveis.length) ? state.imoveis.length : 1;
            const circuitos = (state.circuitosCalculados || []).length;
            const idrs = (state.planoIdr && state.planoIdr.idrs) ? state.planoIdr.idrs.length : 0;
            const dps = (state.quantitativoMateriaisDetalhado || []).filter(m => /\(DPS\)/.test(m.item)).reduce((s, m) => s + (Number(m.qtdCalculada) || 0), 0);
            return {
                tomadas: contar('TUG'), luzes, interruptores, especificos: contar('TUE'), luminarias: luzes,
                quadros,
                dispositivos: circuitos + quadros /* disjuntor geral */ + idrs + dps,
                alimentadorMetros: (state.alimentadorNBR && state.alimentadorNBR.comprimento) || 0,
                incluirAterramento: cfg.incluirAterramento !== false,
                incluirPadrao: !!cfg.incluirPadrao,
                areaConstruida: comodos.reduce((s, c) => s + (Number(c.area) || 0), 0),
                totalMaterial: Number(totalMaterial) || 0
            };
        }

        /** Recalcula a mão de obra e os totais (chamada após o quantitativo de materiais). */
        function atualizarOrcamentoMaoDeObra(totalMaterial) {
            if (typeof MaoDeObra === 'undefined') return;
            const cfg = configMaoDeObra();
            const material = (totalMaterial !== undefined) ? Number(totalMaterial) || 0
                : (state.quantitativoMateriaisDetalhado || []).reduce((s, m) => s + (m.subtotal || 0), 0);
            const q = obterQuantidadesMaoDeObra(material);
            const resultado = MaoDeObra.calcular(q, { modo: cfg.modo, tabela: cfg.tabela, horas: cfg.horas });
            const tot = MaoDeObra.totais(material, resultado.total, cfg.bdiPct);
            state.orcamentoMaoDeObra = Object.assign({}, resultado, { quantidades: q, totais: tot });
            renderizarMaoDeObra();
        }

        function renderizarMaoDeObra() {
            const r = state.orcamentoMaoDeObra;
            if (!r) return;
            const cfg = configMaoDeObra();
            const tot = r.totais;
            const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

            // controles
            const selModo = document.getElementById('selModoMaoDeObra'); if (selModo) selModo.value = r.modo;
            const inBdi = document.getElementById('inputBdiMaoDeObra'); if (inBdi && document.activeElement !== inBdi) inBdi.value = cfg.bdiPct;
            const chkA = document.getElementById('chkAterramentoMaoDeObra'); if (chkA) chkA.checked = cfg.incluirAterramento !== false;
            const chkP = document.getElementById('chkPadraoMaoDeObra'); if (chkP) chkP.checked = !!cfg.incluirPadrao;
            set('txtAvisoMaoDeObra', `Valores de referência de ${MaoDeObra.DATA_TABELA} (${MaoDeObra.REGIAO_TABELA}), aproximados: confirme com profissionais da região ou no SINAPI. Modo: ${MaoDeObra.MODOS[r.modo]}.`);

            // tabela de serviços (preço unitário editável)
            const corpo = document.getElementById('corpoTabelaMaoDeObra');
            if (corpo) {
                if (!r.itens.length) {
                    corpo.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-500">Sem serviços para calcular (projeto vazio).</td></tr>';
                } else {
                    corpo.innerHTML = r.itens.map(i => {
                        const editavel = i.id !== 'percentualMaterial';
                        const qtd = Number(i.qtd).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
                        return `<tr class="hover:bg-slate-900/60">
                            <td class="cel-item p-3 text-slate-200 font-semibold">${escHtml(i.servico)}</td>
                            <td data-rotulo="Quantidade" class="cel-num p-3 text-right font-mono text-slate-300">${qtd}</td>
                            <td data-rotulo="Unid." class="cel-num p-3 text-center font-mono text-slate-400">${escHtml(i.unidade)}</td>
                            <td data-rotulo="Preço unit." class="cel-preco p-3 text-right">
                                ${editavel
                                    ? `<input type="number" min="0" step="0.01" value="${Number(i.preco).toFixed(2)}" onchange="editarPrecoServicoMaoDeObra('${i.id}', this.value)" aria-label="Preço unitário: ${escHtml(i.servico)}" class="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-right font-mono text-xs text-amber-300 outline-none focus:border-violet-500">`
                                    : `<span class="font-mono text-slate-300">${formatarReaisMO(i.preco)}</span>
                                       <button type="button" onclick="abrirTabelaMaoDeObra()" class="block ml-auto text-[10px] text-violet-300 hover:underline">alterar %</button>`}
                            </td>
                            <td data-rotulo="Subtotal" class="cel-subtotal p-3 text-right font-mono font-bold text-white">${formatarReaisMO(i.subtotal)}</td>
                        </tr>`;
                    }).join('');
                }
            }
            set('rodapeTabelaMaoDeObra', formatarReaisMO(r.total));

            // detalhe das horas (modo por horas)
            const det = document.getElementById('detalheHorasMaoDeObra');
            if (det) {
                const linhas = (r.itens[0] && r.itens[0].detalhe) || [];
                det.classList.toggle('hidden', r.modo !== 'horas' || !linhas.length);
                det.innerHTML = r.modo === 'horas' ? `<strong class="text-slate-300">Horas estimadas (equipe eletricista + ajudante):</strong> `
                    + linhas.map(l => `${escHtml(l.servico.split(' (')[0])}: ${l.qtd} × ${(l.horas / l.qtd).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h = ${l.horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`).join(' • ')
                    + ` • <strong class="text-slate-300">Total: ${r.horasTotais} h</strong> (horas por unidade editáveis na Tabela de Mão de Obra)` : '';
            }

            // totais (cards, rodapé da lista de materiais e indicador do topo)
            set('cardTotalMaterial', formatarReaisMO(tot.material));
            set('cardTotalMaoDeObra', formatarReaisMO(tot.maoDeObra));
            set('cardBdiPct', `(${tot.bdiPct.toLocaleString('pt-BR')}%)`);
            set('cardTotalBdi', formatarReaisMO(tot.bdi));
            set('cardTotalGeral', formatarReaisMO(tot.total));
            set('rodapeTotalMaoDeObra', formatarReaisMO(tot.maoDeObra));
            set('rodapeTotalBdi', `${formatarReaisMO(tot.bdi)} (${tot.bdiPct.toLocaleString('pt-BR')}%)`);
            set('rodapeTotalGeral', formatarReaisMO(tot.total));
            set('kpiTotalOrcamentoEstimado', formatarReaisMO(tot.total));
            set('kpiDetalheOrcamento', `Mat. ${formatarReaisMO(tot.material)} • M.O. ${formatarReaisMO(tot.maoDeObra)}${tot.bdi ? ' • BDI ' + formatarReaisMO(tot.bdi) : ''}`);
        }

        function alterarMaoDeObra(campo, valor) {
            const cfg = configMaoDeObra();
            if (campo === 'bdiPct') cfg.bdiPct = Math.max(0, Math.min(200, Number(String(valor).replace(',', '.')) || 0));
            else if (campo === 'modo') cfg.modo = MaoDeObra.MODOS[valor] ? valor : 'ponto';
            else if (campo === 'regiao') { cfg.regiao = String(valor || '').slice(0, 60); renderizarTabelaMaoDeObraModal(); return; }
            else cfg[campo] = valor;
            atualizarOrcamentoMaoDeObra();
        }

        function editarPrecoServicoMaoDeObra(id, valor) {
            const n = Number(String(valor).replace(',', '.'));
            if (!isFinite(n) || n < 0) { mostrarNotificacaoToast('Informe um valor válido.', 'aviso'); renderizarMaoDeObra(); return; }
            configMaoDeObra().tabela[id] = n;
            atualizarOrcamentoMaoDeObra();
        }

        // ------------------------------------------------------------------
        // Modal: tabela de referência (valores, horas e pesquisa na internet)
        // ------------------------------------------------------------------
        function abrirTabelaMaoDeObra(destacarPesquisa) {
            const modal = document.getElementById('modalTabelaMaoDeObra');
            if (!modal) return;
            const cfg = configMaoDeObra();
            const reg = document.getElementById('inputRegiaoMaoDeObra');
            if (reg) reg.value = cfg.regiao || MaoDeObra.REGIAO_TABELA;
            const lblD = document.getElementById('lblDataTabelaMaoDeObra'); if (lblD) lblD.textContent = MaoDeObra.DATA_TABELA;
            const lblR = document.getElementById('lblRegiaoTabelaMaoDeObra'); if (lblR) lblR.textContent = MaoDeObra.REGIAO_TABELA;
            renderizarTabelaMaoDeObraModal(!!destacarPesquisa);
            modal.classList.remove('hidden');
        }

        function fecharTabelaMaoDeObra() {
            document.getElementById('modalTabelaMaoDeObra')?.classList.add('hidden');
        }

        function renderizarTabelaMaoDeObraModal(destacarPesquisa) {
            const lista = document.getElementById('listaTabelaMaoDeObra');
            if (!lista) return;
            const cfg = configMaoDeObra();
            const tabela = MaoDeObra.mesclarTabela(cfg.tabela);
            const horas = Object.assign(MaoDeObra.horasPadrao(), cfg.horas);
            const padrao = MaoDeObra.tabelaPadrao();
            const regiao = cfg.regiao || MaoDeObra.REGIAO_TABELA;
            const campo = 'bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-right font-mono text-xs outline-none focus:border-violet-500';
            lista.innerHTML = MaoDeObra.SERVICOS.map(s => {
                const editado = tabela[s.id] !== padrao[s.id];
                const ehPct = s.unidade === '%';
                const links = MaoDeObra.linksDeBusca(s.id, regiao).map(l => `<a href="${escHtml(l.url)}" target="_blank" rel="noopener noreferrer" title="Pesquisar em ${escHtml(l.nome)}" class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300 hover:text-white"><i class="${l.marca ? 'fa-brands' : 'fa-solid'} ${escHtml(l.icone)}"></i><span class="hidden sm:inline">${escHtml(l.nome)}</span></a>`).join('');
                return `<div class="p-3 rounded-xl bg-slate-950/80 border ${editado ? 'border-amber-500/50' : 'border-slate-800'} flex flex-col lg:flex-row lg:items-center gap-2">
                    <div class="flex-1 min-w-0">
                        <strong class="text-white text-xs block leading-snug">${escHtml(s.nome)}</strong>
                        <span class="text-[10px] text-slate-500">Padrão: ${ehPct ? padrao[s.id] + '%' : formatarReaisMO(padrao[s.id]) + '/' + s.unidade}${editado ? ' • <span class="text-amber-300">editado</span>' : ''}</span>
                        <div class="flex flex-wrap gap-1 mt-1.5 ${destacarPesquisa ? '' : ''}">${links}</div>
                    </div>
                    <div class="flex items-center gap-3">
                        <label class="text-[10px] text-slate-400 flex items-center gap-1.5">${ehPct ? '%' : 'R$/' + s.unidade}
                            <input type="number" min="0" step="${ehPct ? '1' : '0.01'}" value="${tabela[s.id]}" onchange="editarPrecoServicoMaoDeObra('${s.id}', this.value); renderizarTabelaMaoDeObraModal()" class="${campo} w-24 text-amber-300" aria-label="Valor: ${escHtml(s.nome)}">
                        </label>
                        ${s.horas !== undefined ? `<label class="text-[10px] text-slate-400 flex items-center gap-1.5">h/${s.unidade}
                            <input type="number" min="0" step="0.05" value="${horas[s.id]}" onchange="editarHorasServicoMaoDeObra('${s.id}', this.value)" class="${campo} w-16 text-sky-300" aria-label="Horas por unidade: ${escHtml(s.nome)}">
                        </label>` : ''}
                    </div>
                </div>`;
            }).join('');
        }

        function editarHorasServicoMaoDeObra(id, valor) {
            const n = Number(String(valor).replace(',', '.'));
            if (!isFinite(n) || n < 0) return;
            configMaoDeObra().horas[id] = n;
            atualizarOrcamentoMaoDeObra();
        }

        function restaurarTabelaMaoDeObra() {
            const cfg = configMaoDeObra();
            cfg.tabela = {};
            cfg.horas = {};
            atualizarOrcamentoMaoDeObra();
            renderizarTabelaMaoDeObraModal();
            mostrarNotificacaoToast(`Tabela de mão de obra restaurada (${MaoDeObra.REGIAO_TABELA}, ${MaoDeObra.DATA_TABELA}).`, 'info');
        }

        // ------------------------------------------------------------------
        // Saídas: texto (Copiar Lista), linhas do Excel e HTML da impressão
        // ------------------------------------------------------------------
        function textoMaoDeObraParaCopiar() {
            const r = state.orcamentoMaoDeObra;
            if (!r) return '';
            let txt = `[ MÃO DE OBRA — ${MaoDeObra.MODOS[r.modo].toUpperCase()} ]\n`;
            r.itens.forEach(i => { txt += ` • ${Number(i.qtd).toLocaleString('pt-BR')} ${i.unidade} - ${i.servico}: ${formatarReaisMO(i.preco)} = ${formatarReaisMO(i.subtotal)}\n`; });
            txt += `   Valores de referência ${MaoDeObra.REGIAO_TABELA} (${MaoDeObra.DATA_TABELA}), aproximados.\n\n`;
            return txt;
        }

        function linhasExcelMaoDeObra() {
            const r = state.orcamentoMaoDeObra;
            if (!r) return null;
            const linhas = [['Serviço', 'Quantidade', 'Unidade', 'Preço Unitário (R$)', 'Subtotal (R$)']];
            r.itens.forEach(i => linhas.push([i.servico, Number(i.qtd), i.unidade, Number(i.preco), Number(i.subtotal)]));
            linhas.push(['', '', '', 'TOTAL MÃO DE OBRA:', Number(r.total)]);
            linhas.push([]);
            linhas.push([`Modo: ${MaoDeObra.MODOS[r.modo]}. Valores de referência ${MaoDeObra.REGIAO_TABELA} (${MaoDeObra.DATA_TABELA}), aproximados: confirme com profissionais da região ou no SINAPI.`]);
            return linhas;
        }

        function linhasExcelTotaisOrcamento() {
            const t = state.orcamentoMaoDeObra && state.orcamentoMaoDeObra.totais;
            if (!t) return [];
            return [
                [''],
                ['ORÇAMENTO', ''],
                ['Material:', Number(t.material)],
                ['Mão de obra:', Number(t.maoDeObra)],
                [`BDI / margem (${t.bdiPct}%):`, Number(t.bdi)],
                ['Total geral:', Number(t.total)]
            ];
        }

        function htmlMaoDeObraParaImpressao() {
            const r = state.orcamentoMaoDeObra;
            if (!r) return '';
            const t = r.totais;
            const td = 'padding: 5px; border-bottom: 1px solid #e2e8f0;';
            return `
                <h3 style="font-size: 10pt; margin: 14px 0 6px; color: #0f172a;">Mão de obra — ${escHtml(MaoDeObra.MODOS[r.modo])}</h3>
                <table style="width: 100%; font-size: 8pt; border-collapse: collapse; text-align: left;">
                    <thead><tr style="background: #0f172a; color: #ffffff;">
                        <th style="padding: 6px;">Serviço</th><th style="padding: 6px; text-align: right;">Qtd.</th><th style="padding: 6px;">Unid.</th>
                        <th style="padding: 6px; text-align: right;">Preço unit.</th><th style="padding: 6px; text-align: right;">Subtotal</th></tr></thead>
                    <tbody>${r.itens.map(i => `<tr><td style="${td}">${escHtml(i.servico)}</td><td style="${td} text-align: right;">${Number(i.qtd).toLocaleString('pt-BR')}</td><td style="${td}">${escHtml(i.unidade)}</td><td style="${td} text-align: right;">${formatarReaisMO(i.preco)}</td><td style="${td} text-align: right; font-weight: bold;">${formatarReaisMO(i.subtotal)}</td></tr>`).join('')}</tbody>
                </table>
                <table style="margin: 10px 0 0 auto; font-size: 9pt; border-collapse: collapse; min-width: 260px;">
                    <tr><td style="padding: 3px 8px;">Material</td><td style="padding: 3px 8px; text-align: right;">${formatarReaisMO(t.material)}</td></tr>
                    <tr><td style="padding: 3px 8px;">Mão de obra</td><td style="padding: 3px 8px; text-align: right;">${formatarReaisMO(t.maoDeObra)}</td></tr>
                    <tr><td style="padding: 3px 8px;">BDI / margem (${t.bdiPct}%)</td><td style="padding: 3px 8px; text-align: right;">${formatarReaisMO(t.bdi)}</td></tr>
                    <tr style="border-top: 2px solid #0f172a; font-weight: bold;"><td style="padding: 4px 8px;">TOTAL GERAL</td><td style="padding: 4px 8px; text-align: right;">${formatarReaisMO(t.total)}</td></tr>
                </table>
                <p style="font-size: 7pt; color: #64748b; margin-top: 4px;">Mão de obra: valores de referência ${escHtml(MaoDeObra.REGIAO_TABELA)} (${escHtml(MaoDeObra.DATA_TABELA)}), aproximados — confirme com profissionais da região ou no SINAPI.</p>`;
        }

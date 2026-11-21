/* PRO-ELÉTRICA CAD — 10-demanda.js
   Concessionárias e cálculo de demanda (usa js/nbr5410.js).
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        // =========================================================================
        // BANCO DE DADOS DE CONCESSIONÁRIAS / DISTRIBUIDORAS BRASILEIRAS (NBR 5410 ITEM 9.5.2)
        // =========================================================================
        const CONCESSIONARIAS_BR = NBR5410.CONCESSIONARIAS; // dados em js/nbr5410.js

        // Estado do Fator de Demanda da Concessionária
        if (!state.concessionariaId) {
            state.concessionariaId = 'cpfl';
        }
        let tempConcessionariaSelecionada = state.concessionariaId || 'cpfl';
        let dadosUltimaDemandaCalculada = null;

        // =========================================================================
        // FUNÇÕES DO MODAL DA CONCESSIONÁRIA & CÁLCULO DE DEMANDA
        // =========================================================================
        function abrirModalConcessionaria() {
            tempConcessionariaSelecionada = state.concessionariaId || 'cpfl';
            renderizarListaConcessionarias();
            const modal = document.getElementById('modalConcessionariaLocal');
            if (modal) modal.classList.remove('hidden');
        }

        function fecharModalConcessionaria() {
            const modal = document.getElementById('modalConcessionariaLocal');
            if (modal) modal.classList.add('hidden');
        }

        function renderizarListaConcessionarias() {
            const grid = document.getElementById('gridConcessionarias');
            if (!grid) return;
            grid.innerHTML = '';

            const busca = (document.getElementById('txtBuscaConcessionaria')?.value || '').toLowerCase().trim();
            const ufFiltro = document.getElementById('selFiltroUfConcessionaria')?.value || 'todos';

            Object.values(CONCESSIONARIAS_BR).forEach(c => {
                const bateUf = ufFiltro === 'todos' || c.ufs.includes(ufFiltro) || (ufFiltro === 'outros' && c.ufs.includes('outros'));
                const bateBusca = !busca || c.nome.toLowerCase().includes(busca) || c.norma.toLowerCase().includes(busca) || c.ufs.some(u => u.toLowerCase().includes(busca)) || c.descricao.toLowerCase().includes(busca);

                if (!bateUf || !bateBusca) return;

                const isSelected = (c.id === tempConcessionariaSelecionada);
                const card = document.createElement('div');
                card.className = `p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isSelected ? 'bg-sky-950/60 border-sky-400 shadow-lg shadow-sky-500/20' : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'}`;
                card.onclick = () => {
                    tempConcessionariaSelecionada = c.id;
                    const lblTensao = document.getElementById('lblTensaoNominalConcessionaria');
                    if (lblTensao) lblTensao.innerText = c.tensao;
                    renderizarListaConcessionarias();
                };

                card.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg ${isSelected ? 'bg-sky-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'} flex items-center justify-center text-sm shrink-0">
                            ${isSelected ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-tower-broadcast"></i>'}
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-black text-sm ${isSelected ? 'text-white' : 'text-slate-200'}">${c.nome}</span>
                                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-amber-300">${c.norma}</span>
                            </div>
                            <p class="text-[11px] text-slate-400 mt-0.5">${c.descricao}</p>
                            <div class="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                <span><strong class="text-sky-400">UF:</strong> ${c.ufs.join(', ')}</span>
                                <span>•</span>
                                <span><strong class="text-amber-400">Tensão Padrão:</strong> ${c.tensao}</span>
                            </div>
                        </div>
                    </div>
                    <div class="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                        <span class="text-xs font-bold ${isSelected ? 'text-sky-400' : 'text-slate-500'}">
                            ${isSelected ? 'SELECIONADA' : 'Selecionar'}
                        </span>
                        <i class="fa-solid fa-chevron-right text-xs ${isSelected ? 'text-sky-400' : 'text-slate-600'}"></i>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        function filtrarListaConcessionarias() {
            renderizarListaConcessionarias();
        }

        function confirmarConcessionariaSelecionada() {
            state.concessionariaId = tempConcessionariaSelecionada;
            fecharModalConcessionaria();
            atualizarTabelas();
            salvarProjetoSilencioso();
        }

        // =========================================================================
        // MOTOR DE CÁLCULO NORMATIVO DE DEMANDA DA CONCESSIONÁRIA
        // =========================================================================
        function calcularDemandaConcessionaria(totIlum, totTug, tues, sistemaAlim, concessionariaId) {
            if (totIlum === undefined || totTug === undefined || !Array.isArray(tues)) {
                totIlum = 0;
                (state.comodos || []).forEach(c => {
                    totIlum += 100 + (c.area >= 6 ? Math.floor((c.area - 6) / 4) * 60 : 0);
                });
                totTug = (state.pontosEletricos || []).filter(p => p.tipo === 'TUG').reduce((acc, curr) => acc + (curr.pot || 0), 0);
                tues = (state.pontosEletricos || []).filter(p => p.tipo === 'TUE');
                sistemaAlim = sistemaAlim || (state.alimentacaoExterna && state.alimentacaoExterna.sistema) || state.sistemaAlimentacao || 'bifasico';
                concessionariaId = concessionariaId || state.concessionariaId || 'cpfl';
            }
            // Cálculo normativo em js/nbr5410.js; aqui apenas resolvemos os padrões a partir do estado
            const sistema = sistemaAlim || (state.alimentacaoExterna && state.alimentacaoExterna.sistema) || state.sistemaAlimentacao || 'bifasico';
            return NBR5410.calcularDemanda(totIlum, totTug, tues, sistema, concessionariaId);
        }

        // =========================================================================
        // MEMÓRIA DE CÁLCULO MODAL
        // =========================================================================
        function abrirModalMemoriaDemanda() {
            if (!dadosUltimaDemandaCalculada) {
                atualizarTabelas();
            }
            renderizarMemoriaDemanda();
            const modal = document.getElementById('modalMemoriaDemanda');
            if (modal) modal.classList.remove('hidden');
        }

        function fecharModalMemoriaDemanda() {
            const modal = document.getElementById('modalMemoriaDemanda');
            if (modal) modal.classList.add('hidden');
        }

        function renderizarMemoriaDemanda() {
            const c = dadosUltimaDemandaCalculada;
            const container = document.getElementById('conteudoMemoriaDemanda');
            if (!container || !c) return;

            container.innerHTML = `
                <!-- CABEÇALHO DA CONCESSIONÁRIA -->
                <div class="bg-slate-950 p-4 rounded-xl border border-sky-500/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <span class="text-[10px] font-bold uppercase text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded">Distribuidora Ativa</span>
                        <h4 class="text-base font-black text-white mt-1">${c.concessionaria.nome} — Norma ${c.concessionaria.norma}</h4>
                        <p class="text-xs text-slate-400">${c.concessionaria.descricao}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] text-slate-400 block">Fator de Demanda Resultante:</span>
                        <span class="text-xl font-black text-amber-400 font-mono">${(c.fatorDemandaGlobal * 100).toFixed(1)}%</span>
                    </div>
                </div>

                <!-- QUADRO RESUMO GERAL -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span class="text-slate-400 text-[10px] block">Carga Total Instalada (C)</span>
                        <strong class="text-base font-mono text-white">${c.cargaInstaladaTotalKW.toFixed(2)} kW</strong>
                        <span class="text-[9px] text-slate-500 block">Soma de todas as potências</span>
                    </div>
                    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span class="text-slate-400 text-[10px] block">Demanda Provável (D)</span>
                        <strong class="text-base font-mono text-emerald-400">${c.demandaTotalKW.toFixed(2)} kW</strong>
                        <span class="text-[9px] text-slate-400 block">D = a + b + c + d</span>
                    </div>
                    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span class="text-slate-400 text-[10px] block">Demanda Aparente (kVA)</span>
                        <strong class="text-base font-mono text-emerald-300">${c.demandaTotalkVA.toFixed(2)} kVA</strong>
                        <span class="text-[9px] text-slate-500 block">FP = 0,95 Residencial</span>
                    </div>
                    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span class="text-slate-400 text-[10px] block">Padrão da Concessionária</span>
                        <strong class="text-sm font-mono text-sky-300 block truncate">${c.categoriaAtend.id} (${c.categoriaAtend.tipo})</strong>
                        <span class="text-[9px] text-amber-300 font-bold block">Disjuntor ${c.categoriaAtend.disj}</span>
                    </div>
                </div>

                <!-- PARCELA A: ILUMINAÇÃO E TUGS -->
                <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div class="flex justify-between items-center border-b border-slate-850 pb-2">
                        <h5 class="font-bold text-amber-400 flex items-center gap-2">
                            <i class="fa-solid fa-lightbulb"></i> Parcela (a) — Iluminação e Tomadas de Uso Geral (TUGs)
                        </h5>
                        <div class="text-right">
                            <span class="text-slate-400 text-[10px]">Total Instalado: <strong class="text-white font-mono">${c.parcelaA.potKW.toFixed(2)} kW</strong></span>
                            <span class="mx-2 text-slate-600">•</span>
                            <span class="text-emerald-400 text-[10px]">Demanda Resultante: <strong class="font-mono text-emerald-300">${c.parcelaA.demKW.toFixed(2)} kW</strong></span>
                        </div>
                    </div>
                    <p class="text-[11px] text-slate-400">Escalonamento progressivo decrescente conforme a Tabela da Norma ${c.concessionaria.norma}:</p>
                    <div class="overflow-x-auto rounded-lg border border-slate-800">
                        <table class="w-full text-left text-[11px]">
                            <thead class="bg-slate-900 text-slate-400">
                                <tr>
                                    <th class="p-2">Faixa de Carga</th>
                                    <th class="p-2">Potência na Faixa (kW)</th>
                                    <th class="p-2">Fator de Demanda (Fd)</th>
                                    <th class="p-2 text-right">Demanda da Faixa (kW)</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-850">
                                ${c.parcelaA.memoria.map(m => `
                                    <tr>
                                        <td class="p-2 font-mono text-slate-300">${m.faixa}</td>
                                        <td class="p-2 font-mono text-white">${m.potencia.toFixed(2)} kW</td>
                                        <td class="p-2 font-mono text-amber-300 font-bold">${(m.fd * 100).toFixed(0)}%</td>
                                        <td class="p-2 font-mono text-emerald-400 font-bold text-right">${m.demanda.toFixed(3)} kW</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- PARCELA B: CARGAS DE AQUECIMENTO (TUES TÉRMICAS) -->
                <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div class="flex justify-between items-center border-b border-slate-850 pb-2">
                        <h5 class="font-bold text-rose-400 flex items-center gap-2">
                            <i class="fa-solid fa-shower"></i> Parcela (b) — Aparelhos de Aquecimento / TUEs Resistivas
                        </h5>
                        <div class="text-right">
                            <span class="text-slate-400 text-[10px]">Aparelhos: <strong class="text-white font-mono">${c.parcelaB.qtd} un.</strong> (${c.parcelaB.potKW.toFixed(2)} kW)</span>
                            <span class="mx-2 text-slate-600">•</span>
                            <span class="text-emerald-400 text-[10px]">Demanda: <strong class="font-mono text-emerald-300">${c.parcelaB.demKW.toFixed(2)} kW</strong> (${(c.parcelaB.fd * 100).toFixed(0)}%)</span>
                        </div>
                    </div>
                    <p class="text-[11px] text-slate-400">
                        Chuveiros elétricos, torneiras elétricas, fornos e boilers. Fator de simultaneidade da concessionária para <strong>${c.parcelaB.qtd} aparelhos = ${(c.parcelaB.fd * 100).toFixed(0)}%</strong>.
                    </p>
                    ${c.parcelaB.itens.length > 0 ? `
                        <div class="flex flex-wrap gap-2">
                            ${c.parcelaB.itens.map(it => `
                                <span class="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-[11px] text-slate-300 flex items-center gap-1.5 font-mono">
                                    <i class="fa-solid fa-bolt text-rose-400 text-[10px]"></i> ${it.nome}: <strong>${it.potKW.toFixed(2)} kW</strong>
                                </span>
                            `).join('')}
                        </div>
                    ` : '<span class="text-slate-500 text-[11px] italic">Nenhuma carga térmica cadastrada no projeto.</span>'}
                </div>

                <!-- PARCELA C: AR CONDICIONADO -->
                <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div class="flex justify-between items-center border-b border-slate-850 pb-2">
                        <h5 class="font-bold text-sky-400 flex items-center gap-2">
                            <i class="fa-solid fa-snowflake"></i> Parcela (c) — Condicionadores de Ar
                        </h5>
                        <div class="text-right">
                            <span class="text-slate-400 text-[10px]">Aparelhos: <strong class="text-white font-mono">${c.parcelaC.qtd} un.</strong> (${c.parcelaC.potKW.toFixed(2)} kW)</span>
                            <span class="mx-2 text-slate-600">•</span>
                            <span class="text-emerald-400 text-[10px]">Demanda: <strong class="font-mono text-emerald-300">${c.parcelaC.demKW.toFixed(2)} kW</strong> (${(c.parcelaC.fd * 100).toFixed(0)}%)</span>
                        </div>
                    </div>
                    ${c.parcelaC.itens.length > 0 ? `
                        <div class="flex flex-wrap gap-2">
                            ${c.parcelaC.itens.map(it => `
                                <span class="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-[11px] text-slate-300 flex items-center gap-1.5 font-mono">
                                    <i class="fa-solid fa-wind text-sky-400 text-[10px]"></i> ${it.nome}: <strong>${it.potKW.toFixed(2)} kW</strong>
                                </span>
                            `).join('')}
                        </div>
                    ` : '<span class="text-slate-500 text-[11px] italic">Nenhum aparelho de ar-condicionado cadastrado.</span>'}
                </div>

                <!-- ENTRADA DE SERVIÇO HOMOLOGADA -->
                <div class="bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 p-4 rounded-xl border border-emerald-500/50 space-y-2">
                    <h5 class="font-bold text-emerald-400 flex items-center gap-2">
                        <i class="fa-solid fa-circle-check"></i> Especificação Conclusiva do Padrão de Entrada da Concessionária
                    </h5>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                        <div>
                            <span class="text-slate-400 text-[10px] block">Categoria:</span>
                            <span class="font-bold text-white font-mono">${c.categoriaAtend.id} — ${c.categoriaAtend.tipo}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 text-[10px] block">Disjuntor Caixa Medição:</span>
                            <span class="font-bold text-amber-300 font-mono">${c.categoriaAtend.disj} (Curva C)</span>
                        </div>
                        <div>
                            <span class="text-slate-400 text-[10px] block">Ramal Subterrâneo/Aéreo:</span>
                            <span class="font-bold text-emerald-400 font-mono">${c.categoriaAtend.cabo} Cobre</span>
                        </div>
                        <div>
                            <span class="text-slate-400 text-[10px] block">Eletroduto Padrão:</span>
                            <span class="font-bold text-sky-300 font-mono">${c.categoriaAtend.tubo}</span>
                        </div>
                    </div>
                </div>
            `;
        }


/* PRO-ELÉTRICA CAD — 06-auto-lancamento.js
   Auto-lançamento NBR 5410, sugestões/catálogo de TUEs e atalhos de teclado.
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        // =========================================================================
        // MOTOR INTELIGENTE: AUTO-LANÇAMENTO NORMATIVO NBR 5410 (ILUM + TUGs)
        // =========================================================================
        // Variável de controle de escopo do Modal de Auto-Lançamento
        let _escopoAutoLancamentoId = 'todos';

        // =========================================================================
        // MOTOR INTELIGENTE: AUTO-LANÇAMENTO NORMATIVO NBR 5410 (ILUM + TUGs + TUEs)
        // =========================================================================
        function autoLancarPontosNBR5410(comodoId, opcoes = {}) {
            const c = state.comodos.find(x => String(x.id) === String(comodoId));
            if (!c) return;

            const escala = state.escala || 40.0;
            const comodoAndar = c.pavimentoId || state.pavimentoAtivoId || 'terreo';
            const cw = c.largura * escala;
            const ch = c.comprimento * escala;
            const rec = 14;

            // 1. ILUMINAÇÃO MÍNIMA NBR 5410 (item 9.5.2.1.2)
            const ilumPot = 100 + (c.area >= 6 ? Math.floor((c.area - 6) / 4) * 60 : 0);
            const temIlum = state.pontosEletricos.some(p => String(p.comodoId) === String(c.id) && p.tipo === 'ILUM');
            
            if (!temIlum) {
                const cx = c.x + (c.largura * escala) / 2;
                const cy = c.y + (c.comprimento * escala) / 2;
                state.pontosEletricos.push({
                    id: 'pt_ilum_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                    tipo: 'ILUM',
                    nome: `Luz Central ${c.nome}`,
                    pot: ilumPot,
                    tensao: 127,
                    altura: 'teto',
                    x: Math.round(cx),
                    y: Math.round(cy),
                    comodoId: c.id,
                    pavimentoId: comodoAndar
                });

                // Adiciona Interruptor Simples próximo à entrada
                state.pontosEletricos.push({
                    id: 'pt_int_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                    tipo: 'INTERRUPTOR',
                    subTipo: 'simples',
                    nome: `Int. ${c.nome}`,
                    pot: 0,
                    tensao: 127,
                    altura: 'media',
                    x: Math.round(c.x + 24),
                    y: Math.round(c.y + 24),
                    comodoId: c.id,
                    pavimentoId: comodoAndar
                });
            }

            // 2. TOMADAS MÍNIMAS NBR 5410 (item 9.5.2.2.1) — regra pelo NOME do ambiente
            // (o campo tipo só distingue "servico"/"geral"; antes banheiros recebiam a regra
            // da cozinha e varandas/cômodos pequenos não tinham regra própria)
            const classeAmb = NBR5410.classificarAmbiente(c.nome);
            const ehAreaServicoOuCozinha = classeAmb === 'cozinha_servico';
            const ehBanheiro = classeAmb === 'banheiro';
            const qtdTugsMin = NBR5410.tomadasMinimas(c.nome, c.area, c.perimetro);

            const tugsExistentes = state.pontosEletricos.filter(p => String(p.comodoId) === String(c.id) && p.tipo === 'TUG');
            const qtdAdicionar = Math.max(0, qtdTugsMin - tugsExistentes.length);

            if (qtdAdicionar > 0) {
                const cw = c.largura * escala;
                const ch = c.comprimento * escala;
                const rec = 14;

                for (let i = 0; i < qtdAdicionar; i++) {
                    const idxGlobal = tugsExistentes.length + i;
                    // potência mínima do ponto (item 9.5.2.2.2): 600 VA até 3 pontos em banheiros,
                    // cozinhas e áreas de serviço; 100 VA nos demais
                    const potTug = NBR5410.potenciasTomadas(c.nome, idxGlobal + 1, 0)[idxGlobal];

                    const frac = (i + 1) / (qtdAdicionar + 1);
                    let px = c.x + cw / 2;
                    let py = c.y + ch / 2;
                    const parede = i % 4;
                    if (parede === 0) { px = c.x + cw * frac; py = c.y + ch - rec; }
                    else if (parede === 1) { px = c.x + cw - rec; py = c.y + ch * frac; }
                    else if (parede === 2) { px = c.x + cw * (1 - frac); py = c.y + rec; }
                    else { px = c.x + rec; py = c.y + ch * (1 - frac); }

                    state.pontosEletricos.push({
                        id: 'pt_tug_' + Date.now() + '_' + i + '_' + Math.floor(Math.random() * 1000),
                        tipo: 'TUG',
                        subTipo: ehAreaServicoOuCozinha ? 'media' : 'baixa',
                        nome: `TUG ${c.nome} ${idxGlobal + 1}`,
                        pot: potTug,
                        tensao: 127,
                        altura: ehAreaServicoOuCozinha ? 'media' : 'baixa',
                        x: Math.round(px),
                        y: Math.round(py),
                        comodoId: c.id,
                        pavimentoId: comodoAndar
                    });
                }
            }

            // 3. TOMADAS DE USO ESPECÍFICO (TUE) SUGERIDAS (Item 9.5.3 NBR 5410)
            let tuesParaLancar = [];
            if (Array.isArray(opcoes.tues)) {
                tuesParaLancar = opcoes.tues;
            } else if (opcoes.incluirTuesSugeridas === true) {
                const sugeridas = obterTuesSugeridasPorComodo(c);
                tuesParaLancar = sugeridas.filter(s => s.padraoSelecionado);
            }

            if (tuesParaLancar.length > 0) {
                const tuesExistentes = state.pontosEletricos.filter(p => String(p.comodoId) === String(c.id) && p.tipo === 'TUE');
                tuesParaLancar.forEach((tue, idx) => {
                    // Evita duplicar TUE idêntica se a opção preservarExistentes estiver ativa
                    if (opcoes.preservarExistentes !== false) {
                        const jaExiste = tuesExistentes.some(ex => ex.nome === tue.nome);
                        if (jaExiste) return;
                    }

                    // Distribuição estratégica de TUEs nas paredes
                    const idxT = tuesExistentes.length + idx;
                    let tx = c.x + cw - rec;
                    let ty = c.y + ch * 0.4;
                    if (idxT % 4 === 0) { tx = c.x + cw - rec; ty = c.y + ch * 0.35; }
                    else if (idxT % 4 === 1) { tx = c.x + cw - rec; ty = c.y + ch * 0.70; }
                    else if (idxT % 4 === 2) { tx = c.x + cw * 0.75; ty = c.y + rec; }
                    else { tx = c.x + cw * 0.75; ty = c.y + ch - rec; }

                    const novoPontoTue = {
                        id: 'pt_tue_' + Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 1000),
                        tipo: 'TUE',
                        subTipo: tue.altura || 'alta',
                        nome: tue.nome,
                        pot: tue.pot,
                        tensao: tue.tensao || 220,
                        altura: tue.altura || 'alta',
                        x: Math.round(tx),
                        y: Math.round(ty),
                        comodoId: c.id,
                        pavimentoId: comodoAndar
                    };

                    state.pontosEletricos.push(novoPontoTue);

                    // Sincroniza com as cargas persistentes do cômodo
                    if (!c.cargas) c.cargas = [];
                    if (!c.cargas.some(cg => cg.nome === tue.nome)) {
                        c.cargas.push({
                            id: 'cg_' + Date.now() + '_' + idx,
                            nome: tue.nome,
                            tipo: 'TUE',
                            potencia: tue.pot,
                            tensao: tue.tensao || 220,
                            altura: tue.altura || 'alta'
                        });
                    }
                });
            }

            atualizarTudo();
            reconstruirCena3D();
            salvarProjetoSilencioso();
            mostrarNotificacaoToast(`NBR 5410: "${c.nome}" configurado com ${qtdTugsMin} TUGs e luz de ${ilumPot} VA!`, 'sucesso');
        }

        // =========================================================================
        // GESTÃO INTERATIVA DO MODAL DE AUTO-LANÇAMENTO COM SUGESTÕES DE TUES
        // =========================================================================
        function abrirModalAutoLancamentoPontos(comodoIdAlvo = null) {
            _escopoAutoLancamentoId = comodoIdAlvo ? String(comodoIdAlvo) : 'todos';
            const modal = document.getElementById('modalAutoLancamentoTues');
            if (!modal) return;

            // Popula o seletor de escopo
            const selEscopo = document.getElementById('selEscopoAutoLancamento');
            if (selEscopo) {
                selEscopo.innerHTML = '';
                const pavObj = state.pavimentos.find(p => p.id === state.pavimentoAtivoId);
                const nomePav = pavObj ? pavObj.nome : 'Pavimento Ativo';
                
                const optTodos = document.createElement('option');
                optTodos.value = 'todos';
                optTodos.textContent = `Todos os cômodos de "${nomePav}"`;
                selEscopo.appendChild(optTodos);

                const comodosDoAndar = (state.comodos || []).filter(c => c.pavimentoId === state.pavimentoAtivoId);
                comodosDoAndar.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = String(c.id);
                    opt.textContent = `Apenas: ${c.nome} (${c.area.toFixed(1)} m²)`;
                    if (String(c.id) === _escopoAutoLancamentoId) opt.selected = true;
                    selEscopo.appendChild(opt);
                });

                if (_escopoAutoLancamentoId === 'todos') {
                    optTodos.selected = true;
                }
            }

            renderizarComodosNoModalAutoLancamento(_escopoAutoLancamentoId);
            modal.classList.remove('hidden');
        }

        function fecharModalAutoLancamentoPontos() {
            const modal = document.getElementById('modalAutoLancamentoTues');
            if (modal) modal.classList.add('hidden');
        }

        function aoMudarEscopoAutoLancamento(novoEscopo) {
            _escopoAutoLancamentoId = novoEscopo;
            renderizarComodosNoModalAutoLancamento(novoEscopo);
        }

        function renderizarComodosNoModalAutoLancamento(escopo) {
            const container = document.getElementById('containerComodosAutoLancamento');
            if (!container) return;
            container.innerHTML = '';

            let comodosParaExibir = [];
            if (escopo === 'todos') {
                comodosParaExibir = (state.comodos || []).filter(c => c.pavimentoId === state.pavimentoAtivoId);
            } else {
                comodosParaExibir = (state.comodos || []).filter(c => String(c.id) === String(escopo));
            }

            if (comodosParaExibir.length === 0) {
                container.innerHTML = '<p class="text-slate-500 italic p-4 text-center bg-slate-950/60 rounded-xl border border-slate-800">Nenhum cômodo disponível para lançamento neste escopo.</p>';
                return;
            }

            comodosParaExibir.forEach(c => {
                const ilumPot = 100 + (c.area >= 6 ? Math.floor((c.area - 6) / 4) * 60 : 0);
                const classeAmb = NBR5410.classificarAmbiente(c.nome);
                const ehServico = classeAmb === 'cozinha_servico';
                const ehBanheiro = classeAmb === 'banheiro';
                const qtdTugsMin = NBR5410.tomadasMinimas(c.nome, c.area, c.perimetro);

                const sugeridas = obterTuesSugeridasPorComodo(c);
                const ptsExistentes = (state.pontosEletricos || []).filter(p => p.comodoId === c.id);
                const tuesExistentes = ptsExistentes.filter(p => p.tipo === 'TUE');

                const card = document.createElement('div');
                card.className = 'bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md';
                card.setAttribute('data-comodo-card-id', c.id);

                let htmlCard = `
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <div class="flex items-center gap-2">
                            <span class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-xs">
                                <i class="fa-solid fa-door-open"></i>
                            </span>
                            <div>
                                <h4 class="font-black text-white text-xs md:text-sm">${c.nome}</h4>
                                <span class="text-[10px] text-slate-400 font-mono">${c.area.toFixed(1)} m² • Perímetro: ${c.perimetro.toFixed(1)} m</span>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-1.5 text-[10px] font-mono">
                            <span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                                💡 Luz Central: ${ilumPot} VA
                            </span>
                            <span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                🔌 Mínimo TUGs: ${qtdTugsMin}x (${ehServico || ehBanheiro ? '600W/100W' : '100W'})
                            </span>
                            ${tuesExistentes.length > 0 ? `<span class="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">⚡ ${tuesExistentes.length} TUE já instalada</span>` : ''}
                        </div>
                    </div>

                    <!-- SUGESTÕES DE TUES RECOMENDADAS -->
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                                <i class="fa-solid fa-bolt"></i> Tomadas TUE Recomendadas para este Ambiente:
                            </span>
                            <span class="text-[10px] text-slate-500 font-mono">NBR 5410 Circuito Exclusivo</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2" id="gridTuesComodo_${c.id}">
                `;

                sugeridas.forEach((tue, idx) => {
                    const jaInstalada = tuesExistentes.some(ex => ex.nome.toLowerCase() === tue.nome.toLowerCase());
                    const idCheck = `chk_tue_${c.id}_${idx}`;
                    const ib = (tue.pot / tue.tensao).toFixed(1);
                    const caboSug = sugestaoProtecaoAparelho(tue.pot, tue.tensao);

                    htmlCard += `
                        <label for="${idCheck}" class="flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer select-none ${jaInstalada ? 'bg-slate-900/40 border-slate-800 opacity-60' : 'bg-slate-900 border-slate-700/80 hover:border-blue-500/50 hover:bg-slate-900/90'}">
                            <input type="checkbox" id="${idCheck}" ${tue.padraoSelecionado && !jaInstalada ? 'checked' : ''} ${jaInstalada ? 'disabled' : ''} 
                                data-comodo-id="${c.id}" 
                                data-tue-nome="${tue.nome}" 
                                data-pot="${tue.pot}" 
                                data-tensao="${tue.tensao}" 
                                data-altura="${tue.altura}" 
                                class="mt-1 rounded text-blue-500 bg-slate-950 border-slate-700 focus:ring-blue-400">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between gap-1">
                                    <span class="font-bold text-white text-xs truncate flex items-center gap-1.5">
                                        <i class="fa-solid ${tue.icon || 'fa-bolt'} text-blue-400 text-xs"></i> ${tue.nome}
                                    </span>
                                    ${jaInstalada ? '<span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">Já no cômodo</span>' : ''}
                                </div>
                                <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                    <span class="text-amber-300 font-bold">${tue.pot} W</span>
                                    <span>•</span>
                                    <span class="text-sky-300">${tue.tensao} V</span>
                                    <span>•</span>
                                    <span>${caboSug}</span>
                                </div>
                                <p class="text-[10px] text-slate-400 mt-1 italic leading-tight">${tue.obs}</p>
                            </div>
                        </label>
                    `;
                });

                htmlCard += `
                        </div>
                    </div>

                    <!-- ADICIONAR OUTRA TUE MANUALMENTE A ESTE CÔMODO -->
                    <div class="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <span class="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <i class="fa-solid fa-plus-circle text-sky-400"></i> Deseja incluir outro aparelho neste cômodo?
                        </span>
                        <div class="flex items-center gap-1.5">
                            <select id="selAddOutraTue_${c.id}" class="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-1.5 text-[11px] outline-none focus:ring-1 focus:ring-blue-400 max-w-[240px]">
                                <option value="">-- Escolha da lista de 75+ aparelhos --</option>
                            </select>
                            <button type="button" onclick="adicionarTueCustomizadaAoComodoModal('${c.id}')" class="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold text-[11px] transition shadow">
                                + Incluir
                            </button>
                        </div>
                    </div>
                `;

                card.innerHTML = htmlCard;
                container.appendChild(card);

                // Popula o select de outros aparelhos para este card
                const selOutra = document.getElementById(`selAddOutraTue_${c.id}`);
                if (selOutra) {
                    const grupos = {};
                    SUGESTOES_CARGAS_BR.forEach((item, index) => {
                        if (item.tipo === 'TUE') {
                            if (!grupos[item.grupo]) grupos[item.grupo] = [];
                            grupos[item.grupo].push({ ...item, index });
                        }
                    });
                    for (const [nomeGrupo, itens] of Object.entries(grupos)) {
                        const optGroup = document.createElement('optgroup');
                        optGroup.label = nomeGrupo;
                        itens.forEach(it => {
                            const opt = document.createElement('option');
                            opt.value = it.index;
                            opt.textContent = `${it.nome} (${it.pot}W - ${it.tensao}V)`;
                            optGroup.appendChild(opt);
                        });
                        selOutra.appendChild(optGroup);
                    }
                }
            });
        }

        function marcarTodasTuesModalAuto(marcar) {
            const inputs = document.querySelectorAll('#containerComodosAutoLancamento input[type="checkbox"]');
            inputs.forEach(inp => {
                if (!inp.disabled) inp.checked = marcar;
            });
        }

        function adicionarTueCustomizadaAoComodoModal(comodoId) {
            const sel = document.getElementById(`selAddOutraTue_${comodoId}`);
            if (!sel || sel.value === '') return;
            const item = SUGESTOES_CARGAS_BR[parseInt(sel.value, 10)];
            if (!item) return;

            const grid = document.getElementById(`gridTuesComodo_${comodoId}`);
            if (!grid) return;

            const idxCustom = 'custom_' + Date.now();
            const idCheck = `chk_tue_${comodoId}_${idxCustom}`;
            const ib = (item.pot / item.tensao).toFixed(1);
            const caboSug = sugestaoProtecaoAparelho(item.pot, item.tensao);

            const cardLabel = document.createElement('label');
            cardLabel.setAttribute('for', idCheck);
            cardLabel.className = 'flex items-start gap-2.5 p-2.5 rounded-xl border border-blue-500/70 bg-blue-950/40 transition cursor-pointer select-none';
            cardLabel.innerHTML = `
                <input type="checkbox" id="${idCheck}" checked 
                    data-comodo-id="${comodoId}" 
                    data-tue-nome="${item.nome}" 
                    data-pot="${item.pot}" 
                    data-tensao="${item.tensao}" 
                    data-altura="${item.altura || 'alta'}" 
                    class="mt-1 rounded text-blue-500 bg-slate-950 border-slate-700 focus:ring-blue-400">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-1">
                        <span class="font-bold text-white text-xs truncate flex items-center gap-1.5">
                            <i class="fa-solid ${item.icon || 'fa-bolt'} text-blue-400 text-xs"></i> ${item.nome}
                        </span>
                        <span class="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">Personalizado</span>
                    </div>
                    <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span class="text-amber-300 font-bold">${item.pot} W</span>
                        <span>•</span>
                        <span class="text-sky-300">${item.tensao} V</span>
                        <span>•</span>
                        <span>${caboSug}</span>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1 italic leading-tight">${item.desc || 'Circuito dedicado NBR 5410'}</p>
                </div>
            `;
            grid.appendChild(cardLabel);
            sel.value = '';
            mostrarNotificacaoToast(`"${item.nome}" adicionado às sugestões deste cômodo!`, 'sucesso');
        }

        function executarAutoLancamentoCompleto() {
            const chkPreservar = document.getElementById('chkAutoLancarPreservarExistentes');
            const preservarExistentes = chkPreservar ? chkPreservar.checked : true;

            const checkboxes = document.querySelectorAll('#containerComodosAutoLancamento input[type="checkbox"]:checked');
            const tuesPorComodo = {};

            checkboxes.forEach(cb => {
                const comodoId = cb.getAttribute('data-comodo-id');
                if (!comodoId) return;
                if (!tuesPorComodo[comodoId]) tuesPorComodo[comodoId] = [];
                tuesPorComodo[comodoId].push({
                    nome: cb.getAttribute('data-tue-nome'),
                    pot: parseFloat(cb.getAttribute('data-pot')) || 2200,
                    tensao: parseInt(cb.getAttribute('data-tensao'), 10) || 220,
                    altura: cb.getAttribute('data-altura') || 'alta'
                });
            });

            let comodosParaLancar = [];
            if (_escopoAutoLancamentoId === 'todos') {
                comodosParaLancar = (state.comodos || []).filter(c => c.pavimentoId === state.pavimentoAtivoId);
            } else {
                comodosParaLancar = (state.comodos || []).filter(c => String(c.id) === String(_escopoAutoLancamentoId));
            }

            let totalTuesLancadas = 0;
            comodosParaLancar.forEach(c => {
                const tues = tuesPorComodo[c.id] || [];
                totalTuesLancadas += tues.length;
                autoLancarPontosNBR5410(c.id, {
                    tues: tues,
                    preservarExistentes: preservarExistentes
                });
            });

            fecharModalAutoLancamentoPontos();
            mostrarNotificacaoToast(`Auto-Lançamento Concluído: Pontos NBR 5410 e ${totalTuesLancadas} TUEs instaladas com sucesso!`, 'sucesso');
        }

        // =========================================================================
        // SUGESTÕES DINÂMICAS DE TUE NO MODAL DE CÔMODO (modalComodo)
        // =========================================================================
        function atualizarChipsSugestoesTuesComodo() {
            const txtNome = document.getElementById('txtNome');
            const chipsCont = document.getElementById('chipsSugestoesTuesComodo');
            if (!txtNome || !chipsCont) return;

            const nome = txtNome.value.trim() || 'Ambiente';
            const selTipo = document.getElementById('selTipo');
            const tipo = selTipo ? selTipo.value : 'geral';

            const sugeridas = obterTuesSugeridasPorComodo({ nome, tipo });
            chipsCont.innerHTML = '';

            if (sugeridas.length === 0) {
                chipsCont.innerHTML = '<span class="text-[10px] text-slate-500 italic">Digite o nome do cômodo (ex: Banheiro, Cozinha, Quarto) para ver sugestões.</span>';
                return;
            }

            sugeridas.slice(0, 6).forEach(tue => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'px-2 py-1 rounded-lg bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700/80 hover:border-blue-400 transition flex items-center gap-1.5 shadow-sm active:scale-95';
                btn.innerHTML = `<i class="fa-solid ${tue.icon || 'fa-bolt'} text-amber-400 text-[10px]"></i> + ${tue.nome} <span class="font-mono text-amber-300 text-[9px] font-bold">(${tue.pot}W)</span>`;
                btn.onclick = () => {
                    adicionarCargaRapidaAoFormulario({
                        nome: tue.nome,
                        tipo: 'TUE',
                        potencia: tue.pot,
                        tensao: tue.tensao,
                        altura: tue.altura
                    });
                };
                chipsCont.appendChild(btn);
            });
        }

        function adicionarCargaRapidaAoFormulario(cg) {
            if (!state.cargasFormulario) state.cargasFormulario = [];
            state.cargasFormulario.push({
                id: 'cg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                nome: cg.nome,
                tipo: cg.tipo || 'TUE',
                potencia: cg.potencia || cg.pot || 2200,
                tensao: cg.tensao || 220,
                altura: cg.altura || 'alta'
            });
            renderizarCargasFormulario();
            mostrarNotificacaoToast(`"${cg.nome}" adicionado às cargas deste cômodo!`, 'sucesso');
        }

        // =========================================================================
        // CATÁLOGO COMPLETO DE TUES DO MERCADO BRASILEIRO (POP-UP MODAL GERAL)
        // =========================================================================
        function abrirCatalogoCompletoTuesModal() {
            const modal = document.getElementById('modalCatalogoTues');
            if (!modal) return;
            const filtro = document.getElementById('txtFiltroCatalogoTues');
            if (filtro) filtro.value = '';
            filtrarCatalogoTuesModal('');
            modal.classList.remove('hidden');
        }

        function fecharCatalogoCompletoTuesModal() {
            const modal = document.getElementById('modalCatalogoTues');
            if (!modal) return;
            modal.classList.add('hidden');
        }

        function filtrarCatalogoTuesModal(termo) {
            const container = document.getElementById('listaItensCatalogoTues');
            if (!container) return;
            container.innerHTML = '';

            const t = (termo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const itensFiltrados = SUGESTOES_CARGAS_BR.filter(it => {
                if (!t) return true;
                const n = it.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const g = it.grupo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const d = (it.desc || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return n.includes(t) || g.includes(t) || d.includes(t);
            });

            if (itensFiltrados.length === 0) {
                container.innerHTML = '<p class="text-slate-500 italic p-4 text-center">Nenhum aparelho encontrado com este termo.</p>';
                return;
            }

            const grupos = {};
            itensFiltrados.forEach((item, index) => {
                if (!grupos[item.grupo]) grupos[item.grupo] = [];
                grupos[item.grupo].push({ ...item, globalIndex: SUGESTOES_CARGAS_BR.indexOf(item) });
            });

            for (const [nomeGrupo, itens] of Object.entries(grupos)) {
                const groupTitle = document.createElement('h4');
                groupTitle.className = 'font-black text-amber-400 text-xs uppercase tracking-wider pt-2 border-b border-slate-800 pb-1 flex items-center gap-1.5';
                groupTitle.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${nomeGrupo} (${itens.length})`;
                container.appendChild(groupTitle);

                const grid = document.createElement('div');
                grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-1';

                itens.forEach(it => {
                    const card = document.createElement('div');
                    card.className = 'p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-blue-500/60 hover:bg-slate-900 transition flex items-center justify-between gap-2';
                    card.innerHTML = `
                        <div class="min-w-0 flex-1">
                            <span class="font-bold text-white text-xs truncate block flex items-center gap-1">
                                <i class="fa-solid ${it.icon || 'fa-bolt'} text-blue-400 text-xs"></i> ${it.nome}
                            </span>
                            <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                <span class="text-amber-300 font-bold">${it.pot} W</span>
                                <span>•</span>
                                <span class="text-sky-300">${it.tensao} V</span>
                                <span>•</span>
                                <span class="uppercase">${it.tipo}</span>
                            </div>
                        </div>
                        <button type="button" onclick="inserirTueDoCatalogo(${it.globalIndex})" class="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold text-[10px] transition shrink-0 flex items-center gap-1 shadow">
                            <i class="fa-solid fa-plus"></i> Inserir
                        </button>
                    `;
                    grid.appendChild(card);
                });
                container.appendChild(grid);
            }
        }

        function inserirTueDoCatalogo(index) {
            const it = SUGESTOES_CARGAS_BR[index];
            if (!it) return;
            fecharCatalogoCompletoTuesModal();
            inserirPontoRapido(it.tipo || 'TUE', it.pot, it.tensao || 220, it.altura || 'alta', it.nome);
        }

        // =========================================================================
        // PREENCHIMENTO RÁPIDO NO MODAL DE PONTO ELÉTRICO INDIVIDUAL
        // =========================================================================
        function popularSelectModalPontoPredefinido() {
            const sel = document.getElementById('selModalPontoPredefinido');
            if (!sel) return;
            sel.innerHTML = '<option value="">-- Escolha um aparelho do catálogo para auto-preencher --</option>';

            const grupos = {};
            SUGESTOES_CARGAS_BR.forEach((item, index) => {
                if (!grupos[item.grupo]) grupos[item.grupo] = [];
                grupos[item.grupo].push({ ...item, index });
            });

            for (const [nomeGrupo, itens] of Object.entries(grupos)) {
                const optGroup = document.createElement('optgroup');
                optGroup.label = nomeGrupo;
                itens.forEach(it => {
                    const opt = document.createElement('option');
                    opt.value = it.index;
                    opt.textContent = `${it.nome} (${it.pot}W - ${it.tensao}V - ${it.tipo})`;
                    optGroup.appendChild(opt);
                });
                sel.appendChild(optGroup);
            }
        }

        function aoSelecionarAparelhoModalPonto(indexStr) {
            if (indexStr === '') return;
            const item = SUGESTOES_CARGAS_BR[parseInt(indexStr, 10)];
            if (!item) return;

            document.getElementById('txtModalPontoNome').value = item.nome;
            document.getElementById('selModalPontoTipo').value = item.tipo;
            document.getElementById('selModalPontoTensao').value = String(item.tensao);
            document.getElementById('numModalPontoPot').value = item.pot;
            if (item.altura) {
                document.getElementById('selModalPontoAltura').value = item.altura;
            }
            mostrarNotificacaoToast(`Dados de "${item.nome}" preenchidos!`, 'sucesso');
        }

        // =========================================================================
        // ATALHOS DE TECLADO PROFISSIONAIS (HOTKEYS CAD)
        // =========================================================================
        window.addEventListener('keydown', (e) => {
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
                return;
            }

            // Atalhos de Desfazer e Refazer (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
                e.preventDefault();
                desfazerAcao();
                return;
            }
            if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
                e.preventDefault();
                refazerAcao();
                return;
            }

            // Atalhos de inserção: executam a mesma ação dos botões da aba Instalações
            // (antes colocavam a ferramenta em modos inexistentes e nada acontecia)
            const _atalhosInsercao = { t: ['TUG', 'Tomada (TUG)'], l: ['ILUM', 'Iluminação'], i: ['INTERRUPTOR', 'Interruptor'] };
            const _tecla = (e.key || '').toLowerCase();
            if (!e.ctrlKey && !e.metaKey && !e.altKey && _atalhosInsercao[_tecla]) {
                e.preventDefault();
                trocarAba('instalacoes');
                abrirModalPontoNovo(_atalhosInsercao[_tecla][0]);
                mostrarNotificacaoToast(`Atalho [${_tecla.toUpperCase()}]: inserir ${_atalhosInsercao[_tecla][1]}`, 'sucesso');
            }
            // Tecla E: ferramenta de curvas/traçado de eletrodutos
            else if (!e.ctrlKey && !e.metaKey && !e.altKey && _tecla === 'e') {
                trocarAba('instalacoes');
                const btnCurvas = document.getElementById('btnToolCurvasEletroduto');
                if (btnCurvas) btnCurvas.click();
                mostrarNotificacaoToast('Atalho [E]: traçado de eletrodutos', 'sucesso');
            }
            // Tecla Delete / Backspace: Excluir ponto elétrico ou cômodo em edição
            else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
                if (state.pontoSelecionadoId) {
                    const idx = state.pontosEletricos.findIndex(p => String(p.id) === String(state.pontoSelecionadoId));
                    if (idx !== -1) {
                        const pt = state.pontosEletricos[idx];
                        state.pontosEletricos.splice(idx, 1);
                        state.pontoSelecionadoId = null;
                        atualizarTudo();
                        reconstruirCena3D();
                        salvarProjetoSilencioso();
                        salvarProjetoAtualNoLocalStorage();
                        mostrarNotificacaoToast(`Ponto "${pt.nome}" excluído via tecla [Delete]`, 'aviso');
                    }
                } else if (state.comodoEmEdicaoId !== null) {
                    removerComodoId(state.comodoEmEdicaoId);
                }
            }
        });

        function removerComodoId(id) {
            if (id === null || id === undefined) return;
            const idx = state.comodos.findIndex(c => String(c.id) === String(id));
            if (idx !== -1) {
                const comodoRemovido = state.comodos[idx];

                // Se o cômodo estava em edição, fechar o modal e limpar o estado
                if (String(state.comodoEmEdicaoId) === String(id)) {
                    state.comodoEmEdicaoId = null;
                    if (typeof fecharModalComodo === 'function') fecharModalComodo();
                    else if (typeof cancelarEdicao === 'function') cancelarEdicao();
                }

                // Identificar e remover pontos pertencentes a este cômodo
                const pontosRemovidos = state.pontosEletricos.filter(pt => String(pt.comodoId) === String(id));
                const idsPontosRemovidos = new Set(pontosRemovidos.map(p => String(p.id)));
                state.pontosEletricos = state.pontosEletricos.filter(pt => String(pt.comodoId) !== String(id));

                // Se o ponto selecionado pertencia ao cômodo removido, limpa seleção
                if (state.pontoSelecionadoId && idsPontosRemovidos.has(String(state.pontoSelecionadoId))) {
                    state.pontoSelecionadoId = null;
                }

                // Remover eletrodutos conectados aos pontos do cômodo removido
                if (Array.isArray(state.eletrodutos)) {
                    state.eletrodutos = state.eletrodutos.filter(el => {
                        const orig = String(el.origemId || el.de || '');
                        const dest = String(el.destinoId || el.para || '');
                        return !idsPontosRemovidos.has(orig) && !idsPontosRemovidos.has(dest);
                    });
                }

                // Remover escadas vinculadas a este cômodo
                if (Array.isArray(state.escadas)) {
                    state.escadas = state.escadas.filter(esc => String(esc.comodoId) !== String(id));
                }

                // Remover o cômodo do array
                state.comodos.splice(idx, 1);

                detectarProximidadeComodos();
                atualizarTudo();
                desenharCAD();
                desenharInstalacoes();
                reconstruirCena3D(true);
                renderListaComodosSidebar();
                salvarProjetoSilencioso();
                salvarProjetoAtualNoLocalStorage();
                mostrarNotificacaoToast(`Cômodo "${comodoRemovido.nome}" excluído com sucesso!`, 'aviso');
            }
        }

        // TOGGLE UNDERLAY VETORIAL AUTOCAD / BIM
        function toggleCadUnderlay(ativo) {
            state.exibirCadUnderlay = !!ativo;
            const chk = document.getElementById('chkCadUnderlay');
            if (chk) chk.checked = state.exibirCadUnderlay;
            desenharCAD();
            desenharInstalacoes();
        }


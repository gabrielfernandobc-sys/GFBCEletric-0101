/* PRO-ELÉTRICA CAD — 05-instalacoes-pontos.js
   Aba de instalações: legenda, pontos elétricos (seleção/modal) e atualizarTudo().
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        // ==========================================
        // GERENCIAMENTO DA LEGENDA LATERAL & RÓTULOS (NBR 5410)
        // ==========================================
        function alternarExibicaoRotulosInstalacoes() {
            state.exibirRotulosInstalacoes = !state.exibirRotulosInstalacoes;
            const lbl = document.getElementById('lblStatusRotulosInstalacoes');
            const btn = document.getElementById('btnToggleRotulosInstalacoes');
            if (lbl) {
                lbl.textContent = state.exibirRotulosInstalacoes ? 'Visíveis' : 'Ocultos';
                lbl.className = state.exibirRotulosInstalacoes ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold';
            }
            if (btn) {
                const icon = btn.querySelector('i');
                if (icon) icon.className = state.exibirRotulosInstalacoes ? 'fa-solid fa-eye text-emerald-400' : 'fa-solid fa-eye-slash text-amber-400';
            }
            desenharInstalacoes();
        }

        function atualizarLegendaLateralInstalacoes() {
            const badgePav = document.getElementById('badgeLegendaPavimento');
            const countTotal = document.getElementById('countLegendaTotalPontos');
            const txtPot = document.getElementById('txtLegendaPotenciaTotal');
            const listaContainer = document.getElementById('listaPontosLegendaLateral');

            const pavAtivo = state.pavimentos.find(p => p.id === state.pavimentoAtivoId);
            if (badgePav && pavAtivo) {
                badgePav.textContent = pavAtivo.nome ? pavAtivo.nome.toUpperCase() : state.pavimentoAtivoId.toUpperCase();
            }

            const pontosAndar = state.pontosEletricos.filter(p => p.pavimentoId === state.pavimentoAtivoId);
            if (countTotal) countTotal.textContent = pontosAndar.length;

            let potTotal = 0;
            pontosAndar.forEach(p => potTotal += (Number(p.pot) || 0));
            if (txtPot) {
                if (potTotal >= 1000) {
                    txtPot.textContent = `${(potTotal / 1000).toFixed(1)} kW`;
                } else {
                    txtPot.textContent = `${potTotal} W`;
                }
            }

            if (!listaContainer) return;

            if (pontosAndar.length === 0) {
                listaContainer.innerHTML = '<div class="p-3 text-center text-slate-500 italic text-[11px]">Nenhum ponto elétrico cadastrado neste pavimento.</div>';
                return;
            }

            // Ordena por cômodo e tipo
            const pontosOrdenados = [...pontosAndar].sort((a, b) => {
                const ca = state.comodos.find(c => String(c.id) === String(a.comodoId))?.nome || '';
                const cb = state.comodos.find(c => String(c.id) === String(b.comodoId))?.nome || '';
                if (ca !== cb) return ca.localeCompare(cb);
                return a.tipo.localeCompare(b.tipo);
            });

            let html = '';
            pontosOrdenados.forEach(pt => {
                const isSel = (String(state.pontoSelecionadoId) === String(pt.id));
                const comodo = state.comodos.find(c => String(c.id) === String(pt.comodoId));
                const comodoNome = comodo ? comodo.nome : 'Geral';

                let badgeIcon = '';
                let badgeColor = '';
                if (pt.tipo === 'ILUM') {
                    badgeIcon = '<span class="w-3.5 h-3.5 rounded-full border border-amber-400 bg-amber-400/40 flex items-center justify-center text-[8px]">💡</span>';
                    badgeColor = 'text-amber-300';
                } else if (pt.tipo === 'TUE') {
                    badgeIcon = '<span class="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[7px] font-black">▲</span>';
                    badgeColor = 'text-blue-300';
                } else if (pt.tipo === 'INTERRUPTOR') {
                    badgeIcon = '<span class="w-3.5 h-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[7px] font-bold">S</span>';
                    badgeColor = 'text-purple-300';
                } else {
                    // TUG
                    const altClass = pt.altura === 'baixa' ? 'bg-white' : (pt.altura === 'alta' ? 'bg-emerald-500' : 'bg-emerald-500/50');
                    badgeIcon = `<span class="w-3.5 h-3.5 rounded-full border border-emerald-500 ${altClass} flex items-center justify-center"></span>`;
                    badgeColor = 'text-emerald-300';
                }

                const selClass = isSel ? 'bg-amber-500/20 border-amber-500/70 shadow-sm ring-1 ring-amber-400/50' : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800 hover:border-slate-700';

                html += `
                    <div onclick="focarESelecionarPontoPelaLegenda('${pt.id}')" class="group flex items-center justify-between p-1.5 rounded-lg border cursor-pointer transition ${selClass}">
                        <div class="flex items-center gap-2 min-w-0 pr-1">
                            ${badgeIcon}
                            <div class="truncate">
                                <span class="font-semibold text-white block truncate text-[11px]">${pt.nome}</span>
                                <span class="text-[9px] text-slate-400 block truncate">${comodoNome} • ${pt.altura || 'média'}</span>
                            </div>
                        </div>
                        <div class="text-right shrink-0">
                            <span class="font-mono text-[10px] font-bold ${badgeColor} block">${pt.pot}W</span>
                            <span class="text-[9px] text-slate-400 block">${pt.tensao}V</span>
                        </div>
                    </div>
                `;
            });

            listaContainer.innerHTML = html;
        }

        function focarESelecionarPontoPelaLegenda(pontoId) {
            const pt = state.pontosEletricos.find(p => p.id === pontoId);
            if (!pt) return;
            selecionarPontoEletrico(pt);
        }

        function setupInstalacoesCanvasEvents() {
            const canvas = document.getElementById('instalacoesCanvas');
            if (!canvas) return;

            canvas.addEventListener('mousedown', (e) => {
                // o balão de informação (elemento da página) não acompanha o arraste: esconde
                document.getElementById('tooltipInstalacoesCanvas')?.classList.add('hidden');
                const rect = canvas.getBoundingClientRect();
                const scaleX = larguraLogicaCanvas(canvas) / rect.width;
                const scaleY = alturaLogicaCanvas(canvas) / rect.height;
                const mx = (e.clientX - rect.left) * scaleX;
                const my = (e.clientY - rect.top) * scaleY;

                const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);
                const pontosAndar = state.pontosEletricos.filter(p => p.pavimentoId === state.pavimentoAtivoId);

                // Verifica clique no botão [✕] de exclusão rápida se algum cômodo estiver selecionado
                for (let c of comodosAndar) {
                    const cw = c.largura * state.escala;
                    const ch = c.comprimento * state.escala;
                    if (String(state.comodoEmEdicaoId) === String(c.id)) {
                        const btnSize = 22;
                        const btnX = c.x + cw - btnSize - 2;
                        const btnY = c.y + 2;
                        if (mx >= btnX && mx <= btnX + btnSize && my >= btnY && my <= btnY + btnSize) {
                            removerComodoId(c.id);
                            return;
                        }
                    }
                }

                // 1. Ferramenta Mover ou Redimensionar Cômodos (Aba 2)
                if (state.ferramentaInstalacoes === 'mover_comodos') {
                    // Testa primeiro alça de redimensionamento SE
                    for (let c of comodosAndar) {
                        if (c.fixado || state.comodosFixados) continue;
                        const cw = c.largura * state.escala;
                        const ch = c.comprimento * state.escala;
                        const seX = c.x + cw;
                        const seY = c.y + ch;
                        if (Math.abs(mx - seX) <= 14 && Math.abs(my - seY) <= 14) {
                            state.arrastandoInstalacoes = {
                                tipo: 'resize_comodo',
                                comodo: c,
                                startMx: mx,
                                startMy: my,
                                startW: c.largura,
                                startH: c.comprimento
                            };
                            return;
                        }
                    }

                    // Testa corpo do cômodo para arrasto
                    for (let c of comodosAndar) {
                        const cw = c.largura * state.escala;
                        const ch = c.comprimento * state.escala;
                        if (mx >= c.x && mx <= c.x + cw && my >= c.y && my <= c.y + ch) {
                            if (c.fixado || state.comodosFixados) {
                                mostrarNotificacaoToast(`🔒 Cômodo "${c.nome}" está fixado! Destrave para mover.`, 'aviso');
                                return;
                            }

                            // Verifica se já iniciou dentro do perímetro do lote
                            let iniciouNoLote = false;
                            if (state.terreno && state.terreno.ativo) {
                                const t = state.terreno;
                                const tw = (t.largura || 12.0) * state.escala;
                                const th = (t.comprimento || 25.0) * state.escala;
                                const tLeft = t.x !== undefined ? t.x : 40;
                                const tTop = t.y !== undefined ? t.y : 40;
                                const tRight = tLeft + tw;
                                const tBottom = tTop + th;
                                iniciouNoLote = (c.x >= tLeft - 2 && c.y >= tTop - 2 && (c.x + cw) <= tRight + 2 && (c.y + ch) <= tBottom + 2);
                            }

                            state.arrastandoInstalacoes = {
                                tipo: 'move_comodo',
                                comodo: c,
                                iniciouNoLote: iniciouNoLote
                            };
                            state.offsetArrasto = { x: mx - c.x, y: my - c.y };
                            return;
                        }
                    }
                }

                // 2. Mover Tomadas e Pontos Elétricos
                if (state.ferramentaInstalacoes === 'mover_pontos') {
                    for (let pt of pontosAndar) {
                        const dist = Math.sqrt(Math.pow(mx - pt.x, 2) + Math.pow(my - pt.y, 2));
                        if (dist <= 14) {
                            state.arrastandoInstalacoes = { tipo: 'ponto', ref: pt };
                            state.offsetArrasto = { x: mx - pt.x, y: my - pt.y };
                            selecionarPontoEletrico(pt);
                            return;
                        }
                    }

                    if (mx >= state.qdtPos.x && mx <= state.qdtPos.x + state.qdtPos.w && my >= state.qdtPos.y && my <= state.qdtPos.y + state.qdtPos.h) {
                        state.arrastandoInstalacoes = { tipo: 'qdt' };
                        state.offsetArrasto = { x: mx - state.qdtPos.x, y: my - state.qdtPos.y };
                        return;
                    }

                    limparSelecaoPonto();
                }

                // 3. Curvas de Eletrodutos
                if (state.ferramentaInstalacoes === 'curvas_eletroduto') {
                    for (let circNum in state.eletrodutoWaypoints) {
                        const wps = state.eletrodutoWaypoints[circNum] || [];
                        for (let i = 0; i < wps.length; i++) {
                            const wp = wps[i];
                            const dist = Math.sqrt(Math.pow(mx - wp.x, 2) + Math.pow(my - wp.y, 2));
                            if (dist <= 12) {
                                state.arrastandoInstalacoes = { tipo: 'waypoint', circNum: parseInt(circNum, 10), index: i };
                                state.offsetArrasto = { x: mx - wp.x, y: my - wp.y };
                                return;
                            }
                        }
                    }

                    const qdtCx = state.qdtPos.x + state.qdtPos.w / 2;
                    const qdtCy = state.qdtPos.y + state.qdtPos.h / 2;

                    comodosAndar.forEach((c, idx) => {
                        const luzX = c.x + (c.largura * state.escala) / 2;
                        const luzY = c.y + (c.comprimento * state.escala) / 2;
                        const circNum = idx + 1;

                        const wps = state.eletrodutoWaypoints[circNum] || [];
                        const pontosRota = [{ x: qdtCx, y: qdtCy }, ...wps, { x: luzX, y: luzY }];

                        for (let s = 0; s < pontosRota.length - 1; s++) {
                            const p1 = pontosRota[s];
                            const p2 = pontosRota[s + 1];
                            const distSeg = distPontoParaSegmento(mx, my, p1.x, p1.y, p2.x, p2.y);
                            if (distSeg <= 15) {
                                if (!state.eletrodutoWaypoints[circNum]) state.eletrodutoWaypoints[circNum] = [];
                                state.eletrodutoWaypoints[circNum].splice(s, 0, { x: mx, y: my });
                                state.arrastandoInstalacoes = { tipo: 'waypoint', circNum, index: s };
                                state.offsetArrasto = { x: 0, y: 0 };
                                desenharInstalacoes();
                                atualizarTabelas();
                                return;
                            }
                        }
                    });
                }
            
                // Clicou com botão esquerdo no espaço vazio: mover livremente a representação (Pan)
                if (e.button === 0) {
                    state.arrastandoInstalacoes = {
                        tipo: 'pan_canvas',
                        lastMx: mx,
                        lastMy: my
                    };
                    canvas.style.cursor = 'grabbing';
                }
            });

            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = larguraLogicaCanvas(canvas) / rect.width;
                const scaleY = alturaLogicaCanvas(canvas) / rect.height;
                const mx = (e.clientX - rect.left) * scaleX;
                const my = (e.clientY - rect.top) * scaleY;

                // Cursor hover styling
                if (!state.arrastandoInstalacoes) {
                    const pontosAndar = state.pontosEletricos.filter(p => p.pavimentoId === state.pavimentoAtivoId);
                    const pontoHover = pontosAndar.find(p => Math.sqrt(Math.pow(mx - p.x, 2) + Math.pow(my - p.y, 2)) <= 15);
                    const tooltip = document.getElementById('tooltipInstalacoesCanvas');

                    if (pontoHover) {
                        canvas.style.cursor = (state.ferramentaInstalacoes === 'mover_pontos') ? 'grab' : 'pointer';
                        if (tooltip) {
                            const comodo = state.comodos.find(c => c.id === pontoHover.comodoId);
                            const comodoNome = comodo ? comodo.nome : '';
                            const tit = document.getElementById('tooltipInstalacoesTitulo');
                            const sub = document.getElementById('tooltipInstalacoesSub');
                            let icone = '🔌';
                            if (pontoHover.tipo === 'ILUM') icone = '💡';
                            else if (pontoHover.tipo === 'TUE') icone = '⚡';
                            else if (pontoHover.tipo === 'INTERRUPTOR') icone = '🔘';
                            if (tit) tit.innerHTML = `${icone} ${pontoHover.nome}`;
                            if (sub) sub.innerHTML = `<span class="font-mono text-amber-300 font-bold">${pontoHover.pot}W</span> • ${pontoHover.tensao}V • ${pontoHover.tipo} • Altura: ${pontoHover.altura || 'média'}${comodoNome ? ' • <span class="text-slate-400">' + comodoNome + '</span>' : ''}`;
                            
                            tooltip.style.left = Math.min(rect.width - 240, Math.max(10, e.clientX - rect.left + 16)) + 'px';
                            tooltip.style.top = Math.min(rect.height - 70, Math.max(10, e.clientY - rect.top + 16)) + 'px';
                            tooltip.classList.remove('hidden');
                        }
                        if (state.caboHoverInstalacoes) {
                            state.caboHoverInstalacoes = null;
                            desenharInstalacoes();
                        }
                        return;
                    }

                    // Hover sobre cabos virtuais e eletrodutos (Desktop / Mouse com cursor pointer e tooltip)
                    const caboHover = (typeof detectarCaboHoverInstalacoes === 'function') ? detectarCaboHoverInstalacoes(mx, my) : null;
                    const mudouHoverCabo = ((state.caboHoverInstalacoes && state.caboHoverInstalacoes.id) !== (caboHover && caboHover.id));
                    state.caboHoverInstalacoes = caboHover;

                    if (caboHover) {
                        canvas.style.cursor = 'pointer';
                        if (tooltip) {
                            const tit = document.getElementById('tooltipInstalacoesTitulo');
                            const sub = document.getElementById('tooltipInstalacoesSub');
                            if (tit) tit.innerHTML = `⚡ ${caboHover.nome}`;
                            if (sub) sub.innerHTML = `<span class="font-mono text-cyan-300 font-bold">${caboHover.circuito}</span> • ${caboHover.detalhes}`;
                            tooltip.style.left = Math.min(rect.width - 270, Math.max(10, e.clientX - rect.left + 16)) + 'px';
                            tooltip.style.top = Math.min(rect.height - 70, Math.max(10, e.clientY - rect.top + 16)) + 'px';
                            tooltip.classList.remove('hidden');
                        }
                        if (mudouHoverCabo) {
                            desenharInstalacoes();
                        }
                        return;
                    }

                    if (mudouHoverCabo) {
                        desenharInstalacoes();
                    }

                    if (tooltip) {
                        tooltip.classList.add('hidden');
                    }

                    if (state.ferramentaInstalacoes === 'mover_comodos') {
                        const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);
                        let sobreAlca = false;
                        let sobreComodo = false;
                        for (let c of comodosAndar) {
                            const cw = c.largura * state.escala;
                            const ch = c.comprimento * state.escala;
                            const seX = c.x + cw;
                            const seY = c.y + ch;
                            if (Math.abs(mx - seX) <= 14 && Math.abs(my - seY) <= 14) {
                                sobreAlca = true;
                                break;
                            }
                            if (mx >= c.x && mx <= c.x + cw && my >= c.y && my <= c.y + ch) {
                                sobreComodo = true;
                            }
                        }
                        canvas.style.cursor = sobreAlca ? 'nwse-resize' : (sobreComodo ? 'move' : 'default');
                    } else if (state.ferramentaInstalacoes === 'mover_pontos') {
                        canvas.style.cursor = 'crosshair';
                    } else {
                        canvas.style.cursor = 'grab';
                    }
                    return;
                }

                const arr = state.arrastandoInstalacoes;
                if (arr.tipo === 'pan_canvas') {
                    const dx = mx - arr.lastMx;
                    const dy = my - arr.lastMy;
                    arr.lastMx = mx;
                    arr.lastMy = my;
                    moverProjetoOffset(dx, dy);
                    desenharCAD();
                    desenharInstalacoes();
                    return;
                } else if (arr.tipo === 'ponto' && arr.ref) {
                    arr.ref.x = mx - state.offsetArrasto.x;
                    arr.ref.y = my - state.offsetArrasto.y;
                    desenharInstalacoes();
                } else if (arr.tipo === 'resize_comodo') {
                    const c = arr.comodo;
                    if (c.fixado || state.comodosFixados) return;

                    const deltaW = (mx - arr.startMx) / state.escala;
                    const deltaH = (my - arr.startMy) / state.escala;
                    const snapRes = calcularEncaixeResizeMagnetico(c, arr.startW + deltaW, arr.startH + deltaH, state.escala);
                    let novaLarg = snapRes.largura;
                    let novoComp = snapRes.comprimento;
                    state.linhasGuiaMagnetica = snapRes.guias;

                    // Restrição ao perímetro do lote: não permitir expandir para fora se estiver dentro
                    if (state.terreno && state.terreno.ativo) {
                        const t = state.terreno;
                        const tw = (t.largura || 12.0) * state.escala;
                        const th = (t.comprimento || 25.0) * state.escala;
                        const tLeft = t.x !== undefined ? t.x : 40;
                        const tTop = t.y !== undefined ? t.y : 40;
                        const tRight = tLeft + tw;
                        const tBottom = tTop + th;
                        if (c.x >= tLeft - 2 && c.y >= tTop - 2) {
                            const maxLarg = Math.max(0.5, (tRight - c.x) / state.escala);
                            const maxComp = Math.max(0.5, (tBottom - c.y) / state.escala);
                            novaLarg = Math.min(novaLarg, maxLarg);
                            novoComp = Math.min(novoComp, maxComp);
                        }
                    }

                    const oldW = c.largura;
                    const oldH = c.comprimento;

                    if (novaLarg !== c.largura || novoComp !== c.comprimento) {
                        const propX = novaLarg / oldW;
                        const propY = novoComp / oldH;
                        c.largura = novaLarg;
                        c.comprimento = novoComp;
                        c.area = parseFloat((novaLarg * novoComp).toFixed(2));
                        c.perimetro = parseFloat((2 * (novaLarg + novoComp)).toFixed(2));

                        state.pontosEletricos.forEach(pt => {
                            if (pt.comodoId === c.id) {
                                pt.x = c.x + (pt.x - c.x) * propX;
                                pt.y = c.y + (pt.y - c.y) * propY;
                            }
                        });

                        detectarProximidadeComodos();
                        desenharCAD();
                        desenharInstalacoes();
                        atualizarTabelas();
                        renderListaComodosSidebar();
                    } else if (state.linhasGuiaMagnetica.length > 0) {
                        desenharInstalacoes();
                    }
                } else if (arr.tipo === 'move_comodo') {
                    const c = arr.comodo;
                    if (c.fixado || state.comodosFixados) return;

                    const snapPos = calcularEncaixeMagnetico(c, mx - state.offsetArrasto.x, my - state.offsetArrasto.y, c.largura, c.comprimento, state.escala);
                    let novoX = snapPos.x;
                    let novoY = snapPos.y;
                    state.linhasGuiaMagnetica = snapPos.guias;

                    // Restrição estrita ao perímetro do lote:
                    // "Após o cômodo estar dentro do perímetro não permitir movimentação para fora"
                    if (state.terreno && state.terreno.ativo) {
                        const t = state.terreno;
                        const tw = (t.largura || 12.0) * state.escala;
                        const th = (t.comprimento || 25.0) * state.escala;
                        const tLeft = t.x !== undefined ? t.x : 40;
                        const tTop = t.y !== undefined ? t.y : 40;
                        const tRight = tLeft + tw;
                        const tBottom = tTop + th;
                        const cw = c.largura * state.escala;
                        const ch = c.comprimento * state.escala;

                        // Se o cômodo entrou no perímetro do lote ou já iniciou nele, retém estritamente dentro
                        if (!arr.iniciouNoLote) {
                            if (novoX >= tLeft - 2 && novoY >= tTop - 2 && (novoX + cw) <= tRight + 2 && (novoY + ch) <= tBottom + 2) {
                                arr.iniciouNoLote = true;
                            }
                        }

                        if (arr.iniciouNoLote) {
                            if (cw <= tw) {
                                novoX = Math.max(tLeft, Math.min(tRight - cw, novoX));
                            }
                            if (ch <= th) {
                                novoY = Math.max(tTop, Math.min(tBottom - ch, novoY));
                            }
                        }
                    }

                    const diffX = novoX - c.x;
                    const diffY = novoY - c.y;

                    if (diffX !== 0 || diffY !== 0) {
                        c.x = novoX;
                        c.y = novoY;

                        state.pontosEletricos.forEach(pt => {
                            if (pt.comodoId === c.id) {
                                pt.x += diffX;
                                pt.y += diffY;
                            }
                        });

                        detectarProximidadeComodos();
                        desenharCAD();
                        desenharInstalacoes();
                        atualizarTabelas();
                    } else if (state.linhasGuiaMagnetica.length > 0) {
                        desenharInstalacoes();
                    }
                } else if (arr.tipo === 'waypoint') {
                    const wp = state.eletrodutoWaypoints[arr.circNum][arr.index];
                    if (wp) {
                        wp.x = mx - state.offsetArrasto.x;
                        wp.y = my - state.offsetArrasto.y;
                        desenharInstalacoes();
                        atualizarTabelas();
                    }
                } else if (arr.tipo === 'qdt') {
                    state.qdtPos.x = mx - state.offsetArrasto.x;
                    state.qdtPos.y = my - state.offsetArrasto.y;
                    desenharCAD();
                    desenharInstalacoes();
                    atualizarTabelas();
                }
            });

            canvas.addEventListener('mouseup', () => {
                state.linhasGuiaMagnetica = [];
                if (state.arrastandoInstalacoes) {
                    const eraPan = (state.arrastandoInstalacoes.tipo === 'pan_canvas');
                    state.arrastandoInstalacoes = null;
                    if (!eraPan) {
                        reconstruirCena3D();
                        salvarProjetoSilencioso();
                    }
                    desenharCAD();
                    desenharInstalacoes();
                }
            });

            canvas.addEventListener('mouseleave', () => {
                if (state.caboHoverInstalacoes) {
                    state.caboHoverInstalacoes = null;
                    desenharInstalacoes();
                }
                const tooltip = document.getElementById('tooltipInstalacoesCanvas');
                if (tooltip) tooltip.classList.add('hidden');
            });

            canvas.addEventListener('dblclick', (e) => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = larguraLogicaCanvas(canvas) / rect.width;
                const scaleY = alturaLogicaCanvas(canvas) / rect.height;
                const mx = (e.clientX - rect.left) * scaleX;
                const my = (e.clientY - rect.top) * scaleY;

                // 1. Verifica se clicou diretamente sobre um ponto existente
                const pontosAndar = state.pontosEletricos.filter(p => p.pavimentoId === state.pavimentoAtivoId);
                for (let pt of pontosAndar) {
                    const dist = Math.sqrt(Math.pow(mx - pt.x, 2) + Math.pow(my - pt.y, 2));
                    if (dist <= 16) {
                        abrirModalPontoEdicao(pt);
                        return;
                    }
                }

                // 2. Se clicou dentro de um cômodo, abre pop-up para adicionar novo ponto
                const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);
                for (let c of comodosAndar) {
                    const cw = c.largura * state.escala;
                    const ch = c.comprimento * state.escala;
                    if (mx >= c.x && mx <= c.x + cw && my >= c.y && my <= c.y + ch) {
                        abrirModalAdicionarPontoRapido(c, mx, my);
                        return;
                    }
                }
            });

            // Menu de contexto com botão direito do mouse no canvas de instalações
            canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const scaleX = larguraLogicaCanvas(canvas) / rect.width;
                const scaleY = alturaLogicaCanvas(canvas) / rect.height;
                const mx = (e.clientX - rect.left) * scaleX;
                const my = (e.clientY - rect.top) * scaleY;

                const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);
                for (let i = comodosAndar.length - 1; i >= 0; i--) {
                    const c = comodosAndar[i];
                    const cw = c.largura * state.escala;
                    const ch = c.comprimento * state.escala;
                    if (mx >= c.x && mx <= c.x + cw && my >= c.y && my <= c.y + ch) {
                        abrirMenuContextoComodo(c, e.clientX, e.clientY);
                        return;
                    }
                }
                fecharMenuContextoComodo();
            });
        }

        function selecionarPontoEletrico(pt) {
            state.pontoSelecionadoId = pt.id;
            const painel = document.getElementById('painelPontoSelecionado');
            const badge = document.getElementById('badgeTipoPontoSel');
            const nome = document.getElementById('txtNomePontoSel');
            const det = document.getElementById('txtDetalhesPontoSel');

            if (painel) painel.classList.remove('hidden');
            if (badge) {
                badge.textContent = pt.tipo;
                badge.className = `px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${pt.tipo === 'TUE' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}`;
            }
            if (nome) nome.textContent = pt.nome;
            if (det) det.textContent = `${pt.pot} Watts • ${pt.tensao}V • Altura: ${pt.altura || 'média'}`;
            desenharInstalacoes();
        }

        function limparSelecaoPonto() {
            state.pontoSelecionadoId = null;
            const painel = document.getElementById('painelPontoSelecionado');
            if (painel) painel.classList.add('hidden');
            desenharInstalacoes();
        }

        // MODAL DE PONTOS ELÉTRICOS
        let pontoEmEdicaoModal = null;

        function setupModalPontoEletrico() {
            const form = document.getElementById('formPontoEletrico');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const nome = document.getElementById('txtModalPontoNome').value.trim();
                const tipo = document.getElementById('selModalPontoTipo').value;
                const tensao = parseInt(document.getElementById('selModalPontoTensao').value, 10);
                const pot = parseFloat(document.getElementById('numModalPontoPot').value) || 0;
                const altura = document.getElementById('selModalPontoAltura').value;

                if (pontoEmEdicaoModal && pontoEmEdicaoModal.id) {
                    const p = state.pontosEletricos.find(item => item.id === pontoEmEdicaoModal.id);
                    if (p) {
                        p.nome = nome;
                        p.tipo = tipo;
                        p.tensao = tensao;
                        p.pot = pot;
                        p.altura = altura;
                    }
                } else {
                    const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);
                    let comodo = comodosAndar[0];
                    if (!comodo) {
                        alert('Cadastre um cômodo primeiro neste pavimento para adicionar pontos elétricos!');
                        fecharModalPonto();
                        return;
                    }

                    let posX = comodo.x + (comodo.largura * state.escala) / 2;
                    let posY = comodo.y + (comodo.comprimento * state.escala) / 2;

                    if (tipo === 'ILUM') {
                        const luzesExistentes = state.pontosEletricos.filter(p => p.comodoId === comodo.id && p.tipo === 'ILUM');
                        if (luzesExistentes.length > 0) {
                            posX += (luzesExistentes.length % 2 === 0 ? 30 : -30);
                            posY += (luzesExistentes.length > 1 ? 30 : -30);
                        }
                    } else {
                        const m = 25;
                        posX = comodo.x + m + Math.random() * Math.max(20, (comodo.largura * state.escala - m * 2));
                        posY = comodo.y + m + Math.random() * Math.max(20, (comodo.comprimento * state.escala - m * 2));
                    }

                    state.pontosEletricos.push({
                        id: 'pt_' + tipo.toLowerCase() + '_' + Date.now(),
                        comodoId: comodo.id,
                        pavimentoId: state.pavimentoAtivoId,
                        tipo,
                        nome,
                        pot,
                        tensao,
                        altura,
                        x: posX,
                        y: posY
                    });
                }

                fecharModalPonto();
                atualizarTudo();
                reconstruirCena3D();
                mostrarNotificacaoToast(`Ponto "${nome}" (${tipo}) salvo!`, 'sucesso');
            });
        }

        function abrirModalPontoNovo(tipoPadrao = 'TUG') {
            pontoEmEdicaoModal = null;
            const andarTxt = state.pavimentoAtivoId.toUpperCase();
            const titulo = document.getElementById('tituloModalPonto');
            const txtNome = document.getElementById('txtModalPontoNome');
            const selTipo = document.getElementById('selModalPontoTipo');
            const selTensao = document.getElementById('selModalPontoTensao');
            const numPot = document.getElementById('numModalPontoPot');
            const selAltura = document.getElementById('selModalPontoAltura');

            selTipo.value = tipoPadrao;

            if (tipoPadrao === 'ILUM') {
                titulo.innerHTML = `<i class="fa-solid fa-lightbulb text-amber-400"></i> Novo Ponto de Iluminação (${andarTxt})`;
                txtNome.value = 'Plafon LED de Teto';
                selTensao.value = '127';
                numPot.value = '100';
                selAltura.value = 'teto';
            } else if (tipoPadrao === 'INTERRUPTOR') {
                titulo.innerHTML = `<i class="fa-solid fa-toggle-on text-purple-400"></i> Novo Interruptor (${andarTxt})`;
                txtNome.value = 'Interruptor Simples';
                selTensao.value = '127';
                numPot.value = '0';
                selAltura.value = 'media';
            } else if (tipoPadrao === 'TUE') {
                titulo.innerHTML = `<i class="fa-solid fa-bolt text-blue-400"></i> Nova Tomada TUE (${andarTxt})`;
                txtNome.value = 'Chuveiro / Ar Condicionado';
                selTensao.value = '220';
                numPot.value = '2200';
                selAltura.value = 'alta';
            } else {
                titulo.innerHTML = `<i class="fa-solid fa-plug text-emerald-400"></i> Nova Tomada TUG (${andarTxt})`;
                txtNome.value = 'Tomada Uso Geral 10A';
                selTensao.value = '127';
                numPot.value = '100';
                selAltura.value = 'baixa';
            }

            document.getElementById('btnModalExcluirPonto').classList.add('hidden');
            document.getElementById('modalPontoEletrico').classList.remove('hidden');
        }

        function abrirModalPontoEdicao(pt) {
            pontoEmEdicaoModal = pt;
            const titulo = document.getElementById('tituloModalPonto');
            const iconTipo = pt.tipo === 'ILUM' ? 'fa-lightbulb text-amber-400' : (pt.tipo === 'INTERRUPTOR' ? 'fa-toggle-on text-purple-400' : (pt.tipo === 'TUE' ? 'fa-bolt text-blue-400' : 'fa-plug text-emerald-400'));
            titulo.innerHTML = `<i class="fa-solid ${iconTipo}"></i> Editar Ponto (${pt.tipo})`;
            document.getElementById('txtModalPontoNome').value = pt.nome;
            document.getElementById('selModalPontoTipo').value = pt.tipo;
            document.getElementById('selModalPontoTensao').value = pt.tensao;
            document.getElementById('numModalPontoPot').value = pt.pot;
            document.getElementById('selModalPontoAltura').value = pt.altura || (pt.tipo === 'ILUM' ? 'teto' : 'media');
            document.getElementById('btnModalExcluirPonto').classList.remove('hidden');
            document.getElementById('modalPontoEletrico').classList.remove('hidden');
        }

        function fecharModalPonto() {
            document.getElementById('modalPontoEletrico').classList.add('hidden');
            pontoEmEdicaoModal = null;
        }

        function excluirPontoDoModal() {
            if (pontoEmEdicaoModal) {
                state.pontosEletricos = state.pontosEletricos.filter(p => p.id !== pontoEmEdicaoModal.id);
                fecharModalPonto();
                limparSelecaoPonto();
                atualizarTudo();
                reconstruirCena3D();
            }
        }

        function editarPontoSelecionado() {
            const pt = state.pontosEletricos.find(p => p.id === state.pontoSelecionadoId);
            if (pt) abrirModalPontoEdicao(pt);
        }

        function excluirPontoSelecionado() {
            if (state.pontoSelecionadoId) {
                state.pontosEletricos = state.pontosEletricos.filter(p => p.id !== state.pontoSelecionadoId);
                limparSelecaoPonto();
                atualizarTudo();
                reconstruirCena3D();
            }
        }

        function atualizarTudo() {
            sanitizarNomesEstado();
            renderListaComodosSidebar();
            desenharCAD();
            atualizarTabelas();      // antes do desenho: o diagrama unifilar usa o circuito de cada ponto
            desenharInstalacoes();
            renderizarMemorialAba6(); // depois do cálculo, para refletir os circuitos atuais
        }

        function renderListaComodosSidebar() {
            const cont = document.getElementById('listaComodos');
            const lblCount = document.getElementById('lblContagemComodos');
            const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);
            const areaAndar = comodosAndar.reduce((acc, curr) => acc + curr.area, 0);
            const pontosAndar = state.pontosEletricos.filter(p => p.pavimentoId === state.pavimentoAtivoId);
            
            if (lblCount) lblCount.textContent = comodosAndar.length;

            const lblArea = document.getElementById('lblResumoAreaAndar');
            if (lblArea) lblArea.textContent = `${areaAndar.toFixed(1)} m²`;

            const lblQtd = document.getElementById('lblResumoQtdComodos');
            if (lblQtd) lblQtd.textContent = comodosAndar.length;

            const lblPts = document.getElementById('lblResumoPontosAndar');
            if (lblPts) lblPts.textContent = pontosAndar.length;

            // =====================================================================
            // CÁLCULO DAS ÁREAS: TERRENO TOTAL VS ÁREA CONSTRUÍDA
            // =====================================================================
            const areaConstruidaTotal = (state.comodos || []).reduce((acc, curr) => acc + (curr.area || 0), 0);
            const comodosTerreo = (state.comodos || []).filter(c => c.pavimentoId === 'terreo');
            const areaProjecaoTerreo = comodosTerreo.reduce((acc, curr) => acc + (curr.area || 0), 0);
            const t = state.terreno || { largura: 12.0, comprimento: 25.0, recuoFrontal: 4.0, recuoLateral: 1.5, recuoFundos: 3.0 };
            const areaTerrenoTotal = (t.largura * t.comprimento) || 300.0;
            const taxaOcupacao = areaTerrenoTotal > 0 ? (areaProjecaoTerreo / areaTerrenoTotal) * 100.0 : 0;
            const areaPermeavel = Math.max(0, areaTerrenoTotal - areaProjecaoTerreo);
            const taxaPermeavel = areaTerrenoTotal > 0 ? (areaPermeavel / areaTerrenoTotal) * 100.0 : 0;

            const elTerrenoArea = document.getElementById('lblTerrenoTotalArea');
            const elTerrenoDim = document.getElementById('lblTerrenoDimensoes');
            const elAreaTotal = document.getElementById('lblAreaConstruidaTotal');
            const elAreaProj = document.getElementById('lblAreaProjecaoTerreo');
            const elTaxaOcup = document.getElementById('lblTaxaOcupacao');
            const elAreaPerm = document.getElementById('lblAreaPermeavel');

            if (elTerrenoArea) elTerrenoArea.textContent = `${areaTerrenoTotal.toFixed(1)} m²`;
            if (elTerrenoDim) elTerrenoDim.textContent = `${t.largura.toFixed(1)}m × ${t.comprimento.toFixed(1)}m`;
            if (elAreaTotal) elAreaTotal.textContent = `${areaConstruidaTotal.toFixed(1)} m²`;
            if (elAreaProj) elAreaProj.textContent = `${areaProjecaoTerreo.toFixed(1)} m²`;
            if (elTaxaOcup) elTaxaOcup.textContent = `${taxaOcupacao.toFixed(1)}%`;
            if (elAreaPerm) elAreaPerm.textContent = `${areaPermeavel.toFixed(1)} m² (${taxaPermeavel.toFixed(0)}%)`;

            const lblImovel = document.getElementById('lblResumoImovelAndar');
            if (lblImovel) {
                if (state.regimeImovel === 'mesmo_imovel') {
                    lblImovel.textContent = 'Mesmo Imóvel';
                    lblImovel.className = 'text-emerald-400 font-mono font-bold text-[10px]';
                } else {
                    const imovelAndar = state.imoveis.find(im => im.pavimentos && im.pavimentos.includes(state.pavimentoAtivoId));
                    lblImovel.textContent = imovelAndar ? imovelAndar.nome : 'Individual';
                    lblImovel.className = 'text-sky-400 font-mono font-bold text-[10px]';
                }
            }

            if (!cont) return;

            cont.innerHTML = '';
            if (comodosAndar.length === 0) {
                cont.innerHTML = `<p class="text-[11px] text-slate-500 italic py-2 text-center">Nenhum cômodo cadastrado neste pavimento.</p>`;
                return;
            }

            comodosAndar.forEach(c => {
                const isEditing = (String(state.comodoEmEdicaoId) === String(c.id));
                const ptsDoComodo = state.pontosEletricos.filter(pt => String(pt.comodoId) === String(c.id));
                const qtdTue = ptsDoComodo.filter(pt => pt.tipo === 'TUE').length;
                const qtdTug = ptsDoComodo.filter(pt => pt.tipo === 'TUG').length;

                const estaFixado = !!(c.fixado || state.comodosFixados);
                const item = document.createElement('div');
                item.className = `flex flex-col bg-slate-950 p-2.5 rounded-xl border transition gap-1.5 cursor-pointer ${isEditing ? 'border-amber-400 ring-2 ring-amber-400/40 bg-slate-900 shadow-md shadow-amber-500/10' : 'border-slate-800 hover:border-slate-700'}`;
                item.onclick = (e) => {
                    state.comodoEmEdicaoId = c.id;
                    desenharCAD();
                    desenharInstalacoes();
                    renderListaComodosSidebar();
                };
                
                item.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="flex items-center gap-1.5">
                                <span class="font-bold text-white text-xs">${c.nome}</span>
                                ${estaFixado ? '<span class="text-amber-400 text-[10px]" title="Cômodo Fixado na Planta"><i class="fa-solid fa-lock"></i></span>' : ''}
                                ${isEditing ? '<span class="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">Selecionado</span>' : ''}
                            </div>
                            <span class="text-[10px] text-slate-400">${c.area.toFixed(1)}m² (Perím: ${c.perimetro.toFixed(1)}m) • <span class="uppercase">${c.tipo}</span></span>
                        </div>
                        <div class="flex items-center gap-1" onclick="event.stopPropagation()">
                            <button onclick="event.stopPropagation(); toggleFixarComodos('${c.id}')" class="p-1.5 rounded-lg hover:bg-slate-800 transition ${estaFixado ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-slate-500 hover:text-slate-300'}" title="${estaFixado ? 'Cômodo Fixado (Clique para destravar posição)' : 'Fixar Cômodo (Travar posição)'}">
                                <i class="fa-solid ${estaFixado ? 'fa-lock' : 'fa-lock-open'}"></i>
                            </button>
                            <button onclick="event.stopPropagation(); abrirModalAutoLancamentoPontos('${c.id}')" class="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-lg hover:bg-slate-800 transition" title="Auto-Lançamento NBR 5410 com Sugestão de TUEs para este cômodo">
                                <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
                            </button>
                            <button onclick="event.stopPropagation(); iniciarEdicaoComodo('${c.id}')" class="text-amber-400 hover:text-amber-300 p-1.5 rounded-lg hover:bg-slate-800 transition" title="Editar Cômodo">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="event.stopPropagation(); removerComodoId('${c.id}')" class="text-rose-400 hover:text-white hover:bg-rose-600/30 p-1.5 rounded-lg transition active:scale-95" title="Excluir este cômodo do projeto">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-1 pt-1 border-t border-slate-900 text-[9px] font-mono">
                        <span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">${qtdTug} TUG${qtdTug > 1 ? 's' : ''}</span>
                        ${qtdTue > 0 ? `<span class="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold">${qtdTue} TUE${qtdTue > 1 ? 's' : ''}</span>` : ''}
                    </div>
                `;
                cont.appendChild(item);
            });
        }


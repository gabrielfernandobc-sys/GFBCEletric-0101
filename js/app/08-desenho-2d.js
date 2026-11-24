/* PRO-ELÉTRICA CAD — 08-desenho-2d.js
   Renderização 2D: terreno, planta (desenharCAD), instalações, cabos e escadas.
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        // =========================================================================
        function desenharTerreno(ctx, isInstalacoes = false) {
            if (!state.terreno || !state.terreno.ativo) return;
            ajustarTerrenoAosComodos(false);
            const t = state.terreno;
            const tw = t.largura * state.escala;
            const th = t.comprimento * state.escala;

            ctx.save();

            // 1. ÁREA TOTAL DO LOTE (Fundo sutil de lote / gramado)
            ctx.fillStyle = isInstalacoes ? 'rgba(16, 185, 129, 0.03)' : 'rgba(16, 185, 129, 0.04)';
            ctx.fillRect(t.x, t.y, tw, th);

            // 2. LIMITES / DIVISAS CADASTRAIS DO LOTE (Linha traço-ponto NBR)
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.0;
            ctx.setLineDash([12, 4, 3, 4]);
            ctx.strokeRect(t.x, t.y, tw, th);
            ctx.setLineDash([]);

            // 3. FAIXA DE PASSEIO PÚBLICO / CALÇADA (TESTADA FRONTAL)
            const calcadaH = 2.0 * state.escala;
            ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
            ctx.fillRect(t.x, t.y + th, tw, calcadaH);
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(t.x, t.y + th, tw, calcadaH);

            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'left';
            const calcadaLabel = tw < 180 ? 'TESTADA FRONTAL' : (tw < 260 ? 'PASSEIO (TESTADA FRONTAL)' : 'PASSEIO PÚBLICO / CALÇADA (TESTADA FRONTAL)');
            ctx.fillText(calcadaLabel, t.x + 6, t.y + th + calcadaH - 6);

            // 4. LINHAS DE RECUOS REGULAMENTARES (FRONTAL, LATERAL, FUNDOS)
            const rf = (t.recuoFrontal !== undefined ? t.recuoFrontal : 4.0) * state.escala;
            const rl = (t.recuoLateral !== undefined ? t.recuoLateral : 1.5) * state.escala;
            const rfun = (t.recuoFundos !== undefined ? t.recuoFundos : 3.0) * state.escala;

            const edifX = t.x + rl;
            const edifY = t.y + rfun;
            const edifW = Math.max(0, tw - (rl * 2));
            const edifH = Math.max(0, th - rfun - rf);

            if (edifW > 0 && edifH > 0 && (rf > 0 || rl > 0 || rfun > 0)) {
                ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
                ctx.lineWidth = 1.2;
                ctx.setLineDash([5, 4]);
                ctx.strokeRect(edifX, edifY, edifW, edifH);
                ctx.setLineDash([]);
            }

            // 5. TEXTO TÉCNICO DE IDENTIFICAÇÃO DO TERRENO
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 11px monospace';
            const tituloTerreno = tw < 220 ? `LOTE: ${t.largura.toFixed(1)}m×${t.comprimento.toFixed(1)}m` : `TERRENO TOTAL: ${t.largura.toFixed(1)}m × ${t.comprimento.toFixed(1)}m (${(t.largura * t.comprimento).toFixed(1)} m²)`;
            ctx.fillText(tituloTerreno, t.x + 8, t.y + 16);

            if (rf > 0 || rl > 0 || rfun > 0) {
                ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
                ctx.font = '9px sans-serif';
                ctx.fillText(`Recuos: F:${t.recuoFrontal !== undefined ? t.recuoFrontal : 4}m • L:${t.recuoLateral !== undefined ? t.recuoLateral : 1.5}m • Fundos:${t.recuoFundos !== undefined ? t.recuoFundos : 3}m`, t.x + 8, t.y + 28);
            }

            // 6. COTAS DE MEDIDA NOS EIXOS DO LOTE (CENTRALIZADAS)
            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            // Cota da Frente / Testada
            ctx.fillText(`◄ ${t.largura.toFixed(1)}m (Frente) ►`, t.x + tw / 2, t.y + th + calcadaH + 14);
            // Cota da Lateral / Profundidade
            ctx.save();
            ctx.translate(t.x - 8, t.y + th / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`◄ ${t.comprimento.toFixed(1)}m (Profundidade) ►`, 0, 0);
            ctx.restore();
            ctx.textAlign = 'start';

            ctx.restore();
        }

        


        function toggleTemaWoca() {
            const isCurrentlyLight = document.body.classList.contains('theme-woca-light');
            if (isCurrentlyLight) {
                document.body.classList.remove('theme-woca-light');
                document.body.classList.add('theme-woca-dark', 'bg-slate-950', 'text-slate-100');
                state.temaWoca = 'dark';
                try { localStorage.setItem('proeletrica_tema', 'dark'); } catch(e){}
            } else {
                document.body.classList.remove('theme-woca-dark');
                document.body.classList.add('theme-woca-light');
                document.body.classList.remove('bg-slate-950', 'text-slate-100');
                state.temaWoca = 'light';
                try { localStorage.setItem('proeletrica_tema', 'light'); } catch(e){}
            }
            atualizarIconeTema();
            desenharCAD();
            desenharInstalacoes();
            mostrarNotificacaoToast(state.temaWoca === 'dark' ? '🌙 Modo Escuro CAD ativado' : '☀️ Modo Claro CAD ativado', 'info');
        }

        function atualizarIconeTema() {
            const btn = document.getElementById('btnAlternarTema');
            if (!btn) return;
            const isLight = document.body.classList.contains('theme-woca-light');
            btn.innerHTML = isLight 
                ? '<i class="fa-solid fa-moon text-indigo-500 text-xs"></i> <span class="hidden sm:inline text-xs font-bold text-slate-700">Escuro</span>' 
                : '<i class="fa-solid fa-sun text-amber-400 text-xs"></i> <span class="hidden sm:inline text-xs font-bold text-slate-300">Claro</span>';
            btn.title = isLight ? 'Alternar para Modo Escuro CAD' : 'Alternar para Modo Claro CAD';
        }

        function togglePainelLayersHUD() {
            const painel = document.getElementById('painelLayersHUD');
            if (!painel) return;
            const fechar = !painel.classList.contains('hidden');
            if (fechar) {
                painel.classList.add('hidden');
            } else {
                painel.classList.remove('hidden');
                const pEdit = document.getElementById('painelEditarHUD');
                if (pEdit) pEdit.classList.add('hidden');
            }
        }

        function togglePainelEditarHUD() {
            const painel = document.getElementById('painelEditarHUD');
            if (!painel) return;
            const fechar = !painel.classList.contains('hidden');
            if (fechar) {
                painel.classList.add('hidden');
            } else {
                painel.classList.remove('hidden');
                const pLayers = document.getElementById('painelLayersHUD');
                if (pLayers) pLayers.classList.add('hidden');
                renderizarListaComodosHUD();
            }
        }

        function renderizarListaComodosHUD() {
            const lista = document.getElementById('listaComodosHUD');
            const lblTotal = document.getElementById('lblContagemComodosHUD');
            if (!lista) return;
            const comodos = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);
            if (lblTotal) lblTotal.textContent = comodos.length;
            lista.innerHTML = '';
            comodos.forEach(c => {
                const item = document.createElement('div');
                item.className = 'p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between text-xs';
                item.innerHTML = `
                    <div>
                        <b class="text-slate-800 dark:text-white block">${c.nome}</b>
                        <span class="text-[10px] text-slate-500">${c.largura}m × ${c.comprimento}m (${c.area}m²)</span>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="iniciarEdicaoComodo('${c.id}')" class="p-1 rounded text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="removerComodoId('${c.id}')" class="p-1 rounded text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
                lista.appendChild(item);
            });
        }

        function toggleCamada(camada, ativo) {
            if (!state.camadas) state.camadas = {};
            state.camadas[camada] = ativo;
            desenharCAD();
            desenharInstalacoes();
        }

        function atualizarNomeProjeto(val) {
            if (!val) val = 'chácara';
            if (!state.projetoAtual) state.projetoAtual = {};
            if (!state.projetoAtual) state.projetoAtual = {}; state.projetoAtual.nome = val;
            const inp = document.getElementById('inputNomeProjetoHeader');
            if (inp && inp.value !== val) inp.value = val;
            salvarProjetoSilencioso();
        }


        function toggleGradeCotas() {
            if (!state.camadas) state.camadas = {};
            state.camadas.cotas = !state.camadas.cotas;
            const chk = document.getElementById('layerChkCotas');
            if (chk) chk.checked = state.camadas.cotas;
            desenharCAD();
            desenharInstalacoes();
            mostrarNotificacaoToast(state.camadas.cotas ? 'Cotas e medições visíveis' : 'Cotas ocultadas', 'info');
        }




    
        // =========================================================================
        // CANVAS NÍTIDO EM TELAS DE ALTA DENSIDADE (celular, retina)
        // O canvas tem largura × devicePixelRatio pixels reais; o desenho e as
        // coordenadas continuam em pixels CSS ("lógicos") com ctx.setTransform(dpr).
        // =========================================================================
        function dprCanvas() {
            return Math.min(3, Math.max(1, window.devicePixelRatio || 1));
        }
        function larguraLogicaCanvas(canvas) {
            return canvas.width / (Number(canvas.dataset.dpr) || 1);
        }
        function alturaLogicaCanvas(canvas) {
            return canvas.height / (Number(canvas.dataset.dpr) || 1);
        }
        /** Ajusta a resolução real do canvas ao tamanho exibido (cssW × cssH) e à densidade da tela. */
        function ajustarResolucaoCanvas(canvas, cssW, cssH) {
            const dpr = dprCanvas();
            const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
            if (canvas.width !== w || canvas.height !== h || Number(canvas.dataset.dpr) !== dpr) {
                canvas.width = w;
                canvas.height = h;
                canvas.dataset.dpr = String(dpr);
            }
        }
        /** Contexto 2D já escalado para desenhar em pixels lógicos. */
        function contextoCanvasNitido(canvas) {
            const ctx = canvas.getContext('2d');
            const dpr = Number(canvas.dataset.dpr) || 1;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            return ctx;
        }

        function desenharCAD() {
            const _telemetryStart = performance.now();
            const canvas = document.getElementById('cadCanvas');
            if (!canvas) return;
            const container = canvas.parentElement;
            if (container) {
                // tamanho exibido do próprio canvas (o container tem borda: usar a caixa dele
                // deslocava os toques/cliques em ~1%)
                const rect = canvas.getBoundingClientRect();
                const displayW = rect.width;
                const displayH = rect.height;
                if (displayW > 100 && displayH > 100) ajustarResolucaoCanvas(canvas, displayW, displayH);
            }
            const ctx = contextoCanvasNitido(canvas);
            const larguraCanvas = larguraLogicaCanvas(canvas), alturaCanvas = alturaLogicaCanvas(canvas);
            ctx.clearRect(0, 0, larguraCanvas, alturaCanvas);

            // 1. Grid
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            for (let x = 0; x < larguraCanvas; x += 40) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, alturaCanvas); ctx.stroke();
            }
            for (let y = 0; y < alturaCanvas; y += 40) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(larguraCanvas, y); ctx.stroke();
            }

            // 1.1 DESENHO DO TERRENO TOTAL (LOTE)
            desenharTerreno(ctx, false);
            // [REMOVIDO: Diagrama Unifilar QGBT removido das Abas 1 e 2 a pedido do usuário]

            // Underlay AutoCAD / BIM (Planta Vetorial de Fundo)
            if (state.exibirCadUnderlay && state.cadUnderlay && state.cadUnderlay.length > 0) {
                ctx.save();
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
                ctx.lineWidth = 1.2;
                state.cadUnderlay.forEach(item => {
                    if (item.tipo === 'linha') {
                        ctx.beginPath();
                        ctx.moveTo(item.x1, item.y1);
                        ctx.lineTo(item.x2, item.y2);
                        ctx.stroke();
                    } else if (item.tipo === 'texto') {
                        ctx.fillStyle = 'rgba(125, 211, 252, 0.7)';
                        ctx.font = '10px monospace';
                        ctx.fillText(item.texto, item.x, item.y);
                    } else if (item.tipo === 'circulo') {
                        ctx.beginPath();
                        ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                });
                ctx.restore();
            }

            // 2. GABARITO FANTASMA DO TÉRREO (se estiver no andar superior)
            if (state.pavimentoAtivoId !== 'terreo' && state.exibirGabaritoFantasma) {
                const comodosTerreo = state.comodos.filter(c => c.pavimentoId === 'terreo');
                comodosTerreo.forEach(c => {
                    const w = c.largura * state.escala;
                    const h = c.comprimento * state.escala;
                    ctx.fillStyle = 'rgba(30, 41, 59, 0.25)';
                    ctx.fillRect(c.x, c.y, w, h);
                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(c.x, c.y, w, h);
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
                    ctx.font = 'italic 10px sans-serif';
                    ctx.fillText(`[Térreo: ${c.nome}]`, c.x + 8, c.y + 18);
                });
            }

            const qdtCx = state.qdtPos.x + state.qdtPos.w / 2;
            const qdtCy = state.qdtPos.y + state.qdtPos.h / 2;
            const alimCx = state.alimentacaoExterna.x + state.alimentacaoExterna.w / 2;
            const alimCy = state.alimentacaoExterna.y + state.alimentacaoExterna.h / 2;

            // 3. Alimentador Geral (apenas no térreo)
            if (state.pavimentoAtivoId === 'terreo') {
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 3.5;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.moveTo(alimCx, alimCy);
                ctx.lineTo(qdtCx, qdtCy);
                ctx.stroke();
                ctx.setLineDash([]);

                const distPxAlim = Math.sqrt(Math.pow(qdtCx - alimCx, 2) + Math.pow(qdtCy - alimCy, 2));
                const metrosAlimCad = (distPxAlim / state.escala) + 3.0;
                const distAlimReal = state.alimentacaoExterna.distanciaManual || Math.ceil(metrosAlimCad);

                const midAlimX = (alimCx + qdtCx) / 2;
                const midAlimY = (alimCy + qdtCy) / 2;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                ctx.fillRect(midAlimX - 45, midAlimY - 10, 90, 20);
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 1;
                ctx.strokeRect(midAlimX - 45, midAlimY - 10, 90, 20);
                ctx.fillStyle = '#34d399';
                ctx.font = 'bold 9px monospace';
                ctx.fillText(`⚡ ${distAlimReal}m (Alimentador)`, midAlimX - 40, midAlimY + 4);
            }

            const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);

            // 4. Eletrodutos dos circuitos do pavimento ativo
            comodosAndar.forEach(c => {
                const luzX = c.x + (c.largura * state.escala) / 2;
                const luzY = c.y + (c.comprimento * state.escala) / 2;
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(qdtCx, qdtCy);
                ctx.lineTo(luzX, luzY);
                ctx.stroke();
                ctx.setLineDash([]);
            });

            // 5. Linhas a mão livre
            const todasLinhas = [...state.linhasMaoLivre.filter(l => l[0] && l[0].pavimentoId === state.pavimentoAtivoId)];
            if (state.linhaAtual) todasLinhas.push(state.linhaAtual);
            todasLinhas.forEach(linha => {
                if (linha.length < 2) return;
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(linha[0].x, linha[0].y);
                for (let i = 1; i < linha.length; i++) ctx.lineTo(linha[i].x, linha[i].y);
                ctx.stroke();
            });

            // 5b. Anotações de texto (botão "Texto"): antes eram filtradas junto com os traços e nunca apareciam
            (state.linhasMaoLivre || []).filter(a => a && !Array.isArray(a) && a.tipo === 'texto' && a.pavimentoId === state.pavimentoAtivoId).forEach(a => {
                ctx.save();
                ctx.font = `bold ${a.tamanho || 14}px sans-serif`;
                ctx.textBaseline = 'middle';
                ctx.fillStyle = a.cor || '#38bdf8';
                ctx.fillText(a.texto, a.x, a.y);
                ctx.restore();
            });

            // 6. Desenho dos Cômodos do Andar Ativo
            comodosAndar.forEach(c => {
                const w = c.largura * state.escala;
                const h = c.comprimento * state.escala;
                const isEditing = (String(state.comodoEmEdicaoId) === String(c.id));

                ctx.fillStyle = isEditing ? 'rgba(51, 65, 85, 0.9)' : 'rgba(30, 41, 59, 0.85)';
                ctx.fillRect(c.x, c.y, w, h);

                // Parede Arquitetônica com espessura técnica normativa (NBR 15575 / 15270 / 16868)
                const espM = c.espessuraParede || state.espessuraParede || 0.15;
                const espPx = Math.max(2, espM * state.escala);
                ctx.strokeStyle = isEditing ? '#f59e0b' : '#cbd5e1';
                ctx.lineWidth = isEditing ? 3.5 : 2.5;
                ctx.strokeRect(c.x, c.y, w, h);

                // Linha interna de espessura de alvenaria se o espaço comportar
                if (w > espPx * 2.2 && h > espPx * 2.2) {
                    ctx.strokeStyle = isEditing ? 'rgba(245, 158, 11, 0.45)' : 'rgba(148, 163, 184, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(c.x + espPx, c.y + espPx, w - 2 * espPx, h - 2 * espPx);
                }

                // Rótulos e textos adaptados para ambientes compactos (< 0.90m)
                const isCompacto = (w < 55 || h < 42);
                const estaFixado = !!(c.fixado || state.comodosFixados);
                ctx.fillStyle = isEditing ? '#fef08a' : (estaFixado ? '#fde68a' : '#ffffff');
                ctx.font = isCompacto ? 'bold 9px sans-serif' : 'bold 11px sans-serif';
                const labelX = c.x + (isCompacto ? 4 : 8);
                const labelY = c.y + (isCompacto ? 12 : 18);
                const txtComodo = isEditing ? `✏️ ${c.nome}` : (estaFixado ? `🔒 ${c.nome}` : c.nome);
                ctx.fillText(txtComodo, labelX, labelY);

                if (h >= 32) {
                    ctx.fillStyle = '#94a3b8';
                    ctx.font = isCompacto ? '8px sans-serif' : '10px sans-serif';
                    ctx.fillText(isCompacto ? `${c.area.toFixed(1)}m²` : `${c.area.toFixed(1)}m² (${c.perimetro.toFixed(1)}m)`, labelX, labelY + (isCompacto ? 11 : 14));
                }

                const luzX = c.x + w / 2;
                const luzY = c.y + h / 2;
                const raioLuz = isCompacto ? 9 : 13;
                ctx.beginPath();
                ctx.arc(luzX, luzY, raioLuz, 0, 2 * Math.PI);
                ctx.fillStyle = '#f59e0b';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                const ilumVa = 100 + (c.area >= 6 ? Math.floor((c.area - 6) / 4) * 60 : 0);
                ctx.fillStyle = '#000000';
                ctx.font = isCompacto ? 'bold 7px sans-serif' : 'bold 9px sans-serif';
                ctx.fillText(`${ilumVa}VA`, luzX - (isCompacto ? 11 : 14), luzY + 3);

                // Alça de Redimensionamento Interativo (Canto Inferior Direito SE) - Oculta se o cômodo estiver fixado
                if (!estaFixado) {
                    const seX = c.x + w;
                    const seY = c.y + h;
                    ctx.fillStyle = isEditing ? '#f59e0b' : '#38bdf8';
                    ctx.fillRect(seX - 11, seY - 11, 11, 11);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(seX - 11, seY - 11, 11, 11);
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(seX - 9, seY - 2); ctx.lineTo(seX - 2, seY - 9);
                    ctx.moveTo(seX - 5, seY - 2); ctx.lineTo(seX - 2, seY - 5);
                    ctx.stroke();
                }

                // Botão de Exclusão Rápida [✕] no Topo-Direito do Cômodo Selecionado
                if (isEditing) {
                    const btnSize = 18;
                    const btnX = c.x + w - btnSize - 4;
                    const btnY = c.y + 4;
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(btnX, btnY, btnSize, btnSize, 4);
                    else ctx.rect(btnX, btnY, btnSize, btnSize);
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('✕', btnX + btnSize / 2, btnY + btnSize / 2);
                    ctx.textAlign = 'start';
                    ctx.textBaseline = 'alphabetic';
                }
            });

            // 7. Transições (Portas / Corredores)
            desenharTransicoes(ctx);

            // 7b. Escadas Arquitetônicas NBR 6492
            desenharEscadas(ctx);

            // 8. QDT
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(state.qdtPos.x, state.qdtPos.y, state.qdtPos.w, state.qdtPos.h);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(state.qdtPos.x, state.qdtPos.y, state.qdtPos.w, state.qdtPos.h);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(state.pavimentoAtivoId === 'terreo' ? 'QDT-G' : 'QDT-P', state.qdtPos.x + 4, state.qdtPos.y + 17);

            // 9. Símbolo Técnico de Prumada Elétrica (Shaft Vertical)
            if (state.prumadaAtiva !== false) {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(state.prumadaPos.x, state.prumadaPos.y, 11, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#000000';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(state.pavimentoAtivoId === 'terreo' ? '▲' : '▼', state.prumadaPos.x - 5, state.prumadaPos.y + 4);

            ctx.fillStyle = '#fde68a';
            ctx.font = 'bold 8px monospace';
            ctx.fillText(state.pavimentoAtivoId === 'terreo' ? 'PRUMADA ▲' : 'PRUMADA ▼', state.prumadaPos.x + 14, state.prumadaPos.y + 3);
            }

            // 10. Alimentação Externa (no térreo)
            if (state.pavimentoAtivoId === 'terreo') {
                const alim = state.alimentacaoExterna;
                ctx.fillStyle = '#059669';
                ctx.fillRect(alim.x, alim.y, alim.w, alim.h);
                ctx.strokeStyle = '#34d399';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(alim.x, alim.y, alim.w, alim.h);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 9px sans-serif';
                ctx.fillText('⚡ ALIM. EXT.', alim.x + 6, alim.y + 15);
                ctx.fillStyle = '#a7f3d0';
                ctx.font = 'bold 8px monospace';
                ctx.fillText('CONCESSIONÁRIA', alim.x + 3, alim.y + 27);
            }
        }

        // FUNÇÕES DE GEOMETRIA E DETECÇÃO DE CABOS VIRTUAIS NO CANVAS (MOUSE HOVER NO COMPUTADOR)
        function distPontoParaSegmento(px, py, x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const lenSq = dx * dx + dy * dy;
            if (lenSq === 0) return Math.hypot(px - x1, py - y1);
            let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            const projX = x1 + t * dx;
            const projY = y1 + t * dy;
            return Math.hypot(px - projX, py - projY);
        }

        function distPontoParaPolyline(px, py, pts) {
            let minDist = Infinity;
            for (let i = 0; i < pts.length - 1; i++) {
                const d = distPontoParaSegmento(px, py, pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
                if (d < minDist) minDist = d;
            }
            return minDist;
        }

        function obterCabosVirtuaisInstalacoes(state) {
            const cabos = [];
            const qdtCx = state.qdtPos.x + state.qdtPos.w / 2;
            const qdtCy = state.qdtPos.y + state.qdtPos.h / 2;
            const alimCx = state.alimentacaoExterna.x + state.alimentacaoExterna.w / 2;
            const alimCy = state.alimentacaoExterna.y + state.alimentacaoExterna.h / 2;

            // 1. Alimentador Geral
            if (state.pavimentoAtivoId === 'terreo') {
                cabos.push({
                    id: 'cabo_alim_geral',
                    tipo: 'alimentador',
                    nome: 'Alimentador Geral (Padrão de Entrada -> QDT)',
                    circuito: 'Entrada Concessionária',
                    detalhes: 'Ramal Bifásico/Trifásico • NBR 5410',
                    corHover: '#10b981',
                    pts: [{ x: alimCx, y: alimCy }, { x: qdtCx, y: qdtCy }]
                });
            }

            const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);
            const pavAtivoObj = state.pavimentos.find(p => p.id === state.pavimentoAtivoId);
            const ehPassagemChao = (pavAtivoObj && pavAtivoObj.tipoPassagemCabos === 'chao');

            comodosAndar.forEach((c, idx) => {
                const w = c.largura * state.escala;
                const h = c.comprimento * state.escala;
                const luzX = c.x + w / 2;
                const luzY = c.y + h / 2;
                const circNum = idx + 1;

                // 2. Eletroduto Principal (QDT -> Cômodo)
                const wps = state.eletrodutoWaypoints[circNum] || [];
                const pontosRota = [{ x: qdtCx, y: qdtCy }, ...wps, { x: luzX, y: luzY }];
                cabos.push({
                    id: `cabo_principal_comodo_${c.id}`,
                    tipo: 'principal',
                    nome: `Eletroduto Principal - ${c.nome}`,
                    circuito: `Circuito ${circNum} (Distribuição)`,
                    detalhes: `${ehPassagemChao ? 'Piso (Traço-ponto)' : 'Teto (Tracejado)'}${(state.trechoAgrupadoNBR) ? ' • trecho agrupado ' + state.trechoAgrupadoNBR.rotulo : ''}`,
                    corHover: ehPassagemChao ? '#f97316' : '#38bdf8',
                    pts: pontosRota
                });

                const ptsDoComodo = state.pontosEletricos.filter(pt => pt.comodoId === c.id);
                const tugsDoComodo = ptsDoComodo.filter(pt => pt.tipo === 'TUG');
                const tuesDoComodo = ptsDoComodo.filter(pt => pt.tipo === 'TUE');
                const interrDoComodo = ptsDoComodo.filter(pt => pt.tipo === 'INTERRUPTOR');
                const ilumExtras = ptsDoComodo.filter(pt => pt.tipo === 'ILUM' && (Math.abs(pt.x - luzX) > 10 || Math.abs(pt.y - luzY) > 10));

                const ehRoteamentoHorizontal = (c.passagemTomadas === 'horizontal' || (!c.passagemTomadas && tugsDoComodo.length > 1));

                // 3. Tomadas TUG
                if (tugsDoComodo.length > 0) {
                    if (ehRoteamentoHorizontal && tugsDoComodo.length > 1) {
                        const tugsOrdenadas = [...tugsDoComodo].sort((a, b) => (a.x + a.y) - (b.x + b.y));
                        cabos.push({
                            id: `cabo_tug_descida_${c.id}`,
                            tipo: 'tug',
                            nome: `Descida TUG - ${c.nome}`,
                            circuito: 'Circuito TUG (Tomadas Gerais)',
                            detalhes: 'Cabo 2.5 mm² • 127V • Fase, Neutro e Terra',
                            corHover: '#10b981',
                            pts: [{ x: luzX, y: luzY }, { x: tugsOrdenadas[0].x, y: tugsOrdenadas[0].y }]
                        });
                        for (let t = 0; t < tugsOrdenadas.length - 1; t++) {
                            const pt1 = tugsOrdenadas[t];
                            const pt2 = tugsOrdenadas[t + 1];
                            const ptsInter = [{ x: pt1.x, y: pt1.y }];
                            if (Math.abs(pt1.x - pt2.x) > 30 && Math.abs(pt1.y - pt2.y) > 30) {
                                ptsInter.push({ x: pt2.x, y: pt1.y });
                            }
                            ptsInter.push({ x: pt2.x, y: pt2.y });
                            cabos.push({
                                id: `cabo_tug_inter_${pt1.id}_${pt2.id}`,
                                tipo: 'tug',
                                nome: `Ramal Parede TUG (${pt1.nome} -> ${pt2.nome})`,
                                circuito: 'Circuito TUG (Tomadas Gerais)',
                                detalhes: 'Cabo 2.5 mm² • 127V • NBR 5410',
                                corHover: '#10b981',
                                pts: ptsInter
                            });
                        }
                    } else {
                        tugsDoComodo.forEach(pt => {
                            cabos.push({
                                id: `cabo_tug_radial_${pt.id}`,
                                tipo: 'tug',
                                nome: `Ramal TUG - ${pt.nome} (${c.nome})`,
                                circuito: 'Circuito TUG (Tomadas Gerais)',
                                detalhes: 'Cabo 2.5 mm² • 127V • NBR 5410',
                                corHover: '#10b981',
                                pts: [{ x: luzX, y: luzY }, { x: pt.x, y: pt.y }]
                            });
                        });
                    }
                }

                // 4. Tomadas TUE
                tuesDoComodo.forEach(pt => {
                    cabos.push({
                        id: `cabo_tue_${pt.id}`,
                        tipo: 'tue',
                        nome: `Circuito Dedicado TUE - ${pt.nome} (${c.nome})`,
                        circuito: `Circuito TUE Dedicado (${pt.pot}W)`,
                        detalhes: `Tensão ${pt.tensao || 220}V • Proteção IDR 30mA Obrigatória`,
                        corHover: '#3b82f6',
                        pts: [{ x: luzX, y: luzY }, { x: pt.x, y: pt.y }]
                    });
                });

                // 5. Interruptores & Retornos
                let listaInterr = interrDoComodo;
                if (listaInterr.length === 0) {
                    const margemInt = Math.max(8, Math.min(18, Math.min(w, h) * 0.2));
                    listaInterr = [{
                        id: 'virt_int_' + c.id,
                        x: c.x + margemInt,
                        y: c.y + h - margemInt,
                        comando: String.fromCharCode(97 + (idx % 26)),
                        tipo: 'INTERRUPTOR',
                        virtual: true
                    }];
                }
                listaInterr.forEach(pt => {
                    const letra = pt.comando || String.fromCharCode(97 + (idx % 26));
                    cabos.push({
                        id: `cabo_interr_${pt.id}`,
                        tipo: 'interruptor',
                        nome: `Comando Iluminação (${letra}) - ${c.nome}`,
                        circuito: 'Circuito Iluminação',
                        detalhes: `Fase + Retorno (${letra}) • Cabo 1.5 mm² • NBR 5444`,
                        corHover: '#a855f7',
                        pts: [{ x: pt.x, y: pt.y }, { x: luzX, y: luzY }]
                    });
                });

                // 6. Lâmpadas adicionais
                ilumExtras.forEach(pt => {
                    cabos.push({
                        id: `cabo_ilum_extra_${pt.id}`,
                        tipo: 'ilum_extra',
                        nome: `Extensão Iluminação - ${c.nome}`,
                        circuito: 'Circuito Iluminação',
                        detalhes: `Cabo 1.5 mm² • ${pt.pot || 100}W`,
                        corHover: '#f59e0b',
                        pts: [{ x: luzX, y: luzY }, { x: pt.x, y: pt.y }]
                    });
                });
            });

            return cabos;
        }

        function detectarCaboHoverInstalacoes(mx, my) {
            const cabos = obterCabosVirtuaisInstalacoes(state);
            let maisProximo = null;
            let minDist = 11; // raio de detecção confortável para uso do mouse no computador

            const unifilar = typeof ajustarCaboParaUnifilar === 'function';
            for (let cabo of cabos) {
                if (!cabo.pts || cabo.pts.length < 2) continue;
                const pts = unifilar ? ajustarCaboParaUnifilar(cabo).pts : cabo.pts;   // no unifilar o eletroduto é curvo
                const d = distPontoParaPolyline(mx, my, pts);
                if (d < minDist) {
                    minDist = d;
                    maisProximo = cabo;
                }
            }
            return maisProximo;
        }

        // DESENHO DO CANVAS DE INSTALAÇÕES 2D (Aba 2)
        function desenharInstalacoes() {
            const _telemetryStart = performance.now();
            if (typeof atualizarSeletorCircuitosLancamento === 'function') {
                atualizarSeletorCircuitosLancamento();
            }
            const canvas = document.getElementById('instalacoesCanvas');
            if (!canvas) return;
            const container = canvas.parentElement;
            if (container) {
                // tamanho exibido do próprio canvas (o container tem borda: usar a caixa dele
                // deslocava os toques/cliques em ~1%)
                const rect = canvas.getBoundingClientRect();
                const displayW = rect.width;
                const displayH = rect.height;
                if (displayW > 100 && displayH > 100) ajustarResolucaoCanvas(canvas, displayW, displayH);
            }
            const ctx = contextoCanvasNitido(canvas);
            const larguraCanvas = larguraLogicaCanvas(canvas), alturaCanvas = alturaLogicaCanvas(canvas);
            ctx.clearRect(0, 0, larguraCanvas, alturaCanvas);
            // Diagrama unifilar NBR 5444 (padrão) ou representação colorida por tipo
            const usarUnifilar = typeof Unifilar !== 'undefined' && typeof usarDiagramaUnifilar === 'function' && usarDiagramaUnifilar();
            const claroUni = usarUnifilar && document.body.classList.contains('theme-woca-light');

            // Grid
            ctx.strokeStyle = claroUni ? '#e2e8f0' : '#1e293b';
            ctx.lineWidth = 1;
            for (let x = 0; x < larguraCanvas; x += 40) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, alturaCanvas); ctx.stroke();
            }
            for (let y = 0; y < alturaCanvas; y += 40) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(larguraCanvas, y); ctx.stroke();
            }

            // DESENHO DO TERRENO TOTAL (LOTE) NA REPRESENTAÇÃO DE CABOS
            desenharTerreno(ctx, true);
            // [REMOVIDO: Diagrama Unifilar QGBT removido das Abas 1 e 2 a pedido do usuário]

            // Underlay AutoCAD / BIM (Planta Vetorial de Fundo)
            if (state.exibirCadUnderlay && state.cadUnderlay && state.cadUnderlay.length > 0) {
                ctx.save();
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
                ctx.lineWidth = 1.2;
                state.cadUnderlay.forEach(item => {
                    if (item.tipo === 'linha') {
                        ctx.beginPath();
                        ctx.moveTo(item.x1, item.y1);
                        ctx.lineTo(item.x2, item.y2);
                        ctx.stroke();
                    } else if (item.tipo === 'texto') {
                        ctx.fillStyle = 'rgba(125, 211, 252, 0.7)';
                        ctx.font = '10px monospace';
                        ctx.fillText(item.texto, item.x, item.y);
                    } else if (item.tipo === 'circulo') {
                        ctx.beginPath();
                        ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                });
                ctx.restore();
            }

            // Gabarito Fantasma do Térreo
            if (state.pavimentoAtivoId !== 'terreo' && state.exibirGabaritoFantasma) {
                const comodosTerreo = state.comodos.filter(c => c.pavimentoId === 'terreo');
                comodosTerreo.forEach(c => {
                    const w = c.largura * state.escala;
                    const h = c.comprimento * state.escala;
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
                    ctx.fillRect(c.x, c.y, w, h);
                    ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(c.x, c.y, w, h);
                    ctx.setLineDash([]);
                });
            }

            const qdtCx = state.qdtPos.x + state.qdtPos.w / 2;
            const qdtCy = state.qdtPos.y + state.qdtPos.h / 2;
            const alimCx = state.alimentacaoExterna.x + state.alimentacaoExterna.w / 2;
            const alimCy = state.alimentacaoExterna.y + state.alimentacaoExterna.h / 2;

            if (state.pavimentoAtivoId === 'terreo') {
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 3.5;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.moveTo(alimCx, alimCy);
                ctx.lineTo(qdtCx, qdtCy);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);

            // Cômodos
            comodosAndar.forEach(c => {
                const w = c.largura * state.escala;
                const h = c.comprimento * state.escala;
                const isEditing = (String(state.comodoEmEdicaoId) === String(c.id));

                ctx.fillStyle = claroUni ? (isEditing ? '#fef3c7' : '#ffffff') : (isEditing ? 'rgba(51, 65, 85, 0.9)' : 'rgba(15, 23, 42, 0.75)');
                ctx.fillRect(c.x, c.y, w, h);

                ctx.strokeStyle = isEditing ? '#f59e0b' : (claroUni ? '#334155' : '#475569');
                ctx.lineWidth = isEditing ? 3.5 : 3;
                ctx.strokeRect(c.x, c.y, w, h);

                ctx.fillStyle = isEditing ? (claroUni ? '#b45309' : '#fef08a') : (claroUni ? '#334155' : '#64748b');
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText(c.nome.toUpperCase(), c.x + 10, c.y + 20);

                const luzX = c.x + w / 2;
                const luzY = c.y + h / 2;
                ctx.beginPath();
                ctx.arc(luzX, luzY, 8.5, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
                ctx.fill();
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(luzX, luzY, 2, 0, 2 * Math.PI);
                ctx.fillStyle = '#f59e0b';
                ctx.fill();

                // Alça de Redimensionamento Interativo (Aba 2)
                const estaFixado = !!(c.fixado || state.comodosFixados);
                if (!estaFixado) {
                    const seX = c.x + w;
                    const seY = c.y + h;
                    ctx.fillStyle = (state.ferramentaInstalacoes === 'mover_comodos') ? '#f59e0b' : '#38bdf8';
                    ctx.fillRect(seX - 11, seY - 11, 11, 11);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(seX - 11, seY - 11, 11, 11);
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(seX - 9, seY - 2); ctx.lineTo(seX - 2, seY - 9);
                    ctx.moveTo(seX - 5, seY - 2); ctx.lineTo(seX - 2, seY - 5);
                    ctx.stroke();
                }

                // Botão de Exclusão Rápida [✕] no Topo-Direito do Cômodo Selecionado
                if (isEditing) {
                    const btnSize = 18;
                    const btnX = c.x + w - btnSize - 4;
                    const btnY = c.y + 4;
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(btnX, btnY, btnSize, btnSize, 4);
                    else ctx.rect(btnX, btnY, btnSize, btnSize);
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('✕', btnX + btnSize / 2, btnY + btnSize / 2);
                    ctx.textAlign = 'start';
                    ctx.textBaseline = 'alphabetic';
                }
            });

            desenharTransicoes(ctx);
            desenharEscadas(ctx);

            // 1. INFRAESTRUTURA PRINCIPAL (ELETRODUTOS QDT -> CÔMODOS)
            const pavAtivoObj = state.pavimentos.find(p => p.id === state.pavimentoAtivoId);
            const ehPassagemChao = (pavAtivoObj && pavAtivoObj.tipoPassagemCabos === 'chao');
            const ehMultiPavMesclado = (ehPassagemChao && state.pavimentos.length > 1);

            if (usarUnifilar) {
                desenharUnifilarInstalacoes(ctx, comodosAndar, ehPassagemChao);
            } else {
            comodosAndar.forEach((c, idx) => {
                const w = c.largura * state.escala;
                const h = c.comprimento * state.escala;
                const luzX = c.x + w / 2;
                const luzY = c.y + h / 2;
                const circNum = idx + 1;

                const wps = state.eletrodutoWaypoints[circNum] || [];
                const pontosRota = [{ x: qdtCx, y: qdtCy }, ...wps, { x: luzX, y: luzY }];

                // VERIFICAÇÃO DE VISIBILIDADE / DESTAQUE DO ELETRODUTO PRINCIPAL (CIRCUITO CÔMODO)
                const statusMain = (typeof obterStatusVisibilidadeCircuito === 'function') 
                    ? obterStatusVisibilidadeCircuito(`comodo_${circNum}`, idx)
                    : { visivel: true, destacado: false, opacidade: 1.0 };

                if (statusMain.visivel) {
                    ctx.save();
                    ctx.globalAlpha = statusMain.opacidade;

                    if (statusMain.destacado) {
                        ctx.shadowColor = ehPassagemChao ? '#f97316' : '#38bdf8';
                        ctx.shadowBlur = 12;
                    }

                    // COR DA INFRAESTRUTURA:
                    // Teto: Azul Celeste (#38bdf8) tracejado NBR
                    // Chão: Laranja (#f97316) traço-ponto NBR
                    if (ehPassagemChao) {
                        ctx.strokeStyle = statusMain.destacado ? '#ffedd5' : '#f97316';
                        ctx.lineWidth = statusMain.destacado ? 4.5 : 3.0;
                        ctx.setLineDash([8, 4, 2, 4]); // Traço-ponto regulamentar NBR 5444 para piso
                    } else {
                        ctx.strokeStyle = statusMain.destacado ? '#bae6fd' : '#38bdf8';
                        ctx.lineWidth = statusMain.destacado ? 4.0 : 2.5;
                        ctx.setLineDash([6, 3]); // Tracejado para teto
                    }

                    ctx.beginPath();
                    ctx.moveTo(pontosRota[0].x, pontosRota[0].y);
                    for (let i = 1; i < pontosRota.length; i++) {
                        ctx.lineTo(pontosRota[i].x, pontosRota[i].y);
                    }
                    ctx.stroke();
                    ctx.setLineDash([]);

                    if (ehMultiPavMesclado && idx === 0) {
                        if (state.exibirRotulosInstalacoes) {
                            ctx.fillStyle = '#ea580c';
                            ctx.font = 'bold 9px monospace';
                            ctx.fillText('⚡ INFRA MESCLADA (PISO)', (qdtCx + luzX) / 2, (qdtCy + luzY) / 2 - 8);
                        }
                    }

                    if (state.ferramentaInstalacoes === 'curvas_eletroduto') {
                        wps.forEach(wp => {
                            ctx.beginPath();
                            ctx.arc(wp.x, wp.y, 6.5, 0, 2 * Math.PI);
                            ctx.fillStyle = ehPassagemChao ? '#f97316' : '#38bdf8';
                            ctx.fill();
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        });
                    }

                    ctx.restore();
                }

                // 2. FIAÇÃO INTERNA DO CÔMODO COM CORES DISTINTAS POR CIRCUITO (NBR 5410):
                // • TUG: Verde Esmeralda (#10b981) - Horizontal na parede ou radial
                // • TUE: Azul Royal (#3b82f6) - Individual dedicado
                // • Lâmpadas: Amarelo Ouro (#f59e0b)
                // • Retorno: Roxo / Violeta (#a855f7)
                const ptsDoComodo = state.pontosEletricos.filter(pt => pt.comodoId === c.id);
                const tugsDoComodo = ptsDoComodo.filter(pt => pt.tipo === 'TUG');
                const tuesDoComodo = ptsDoComodo.filter(pt => pt.tipo === 'TUE');
                const interrDoComodo = ptsDoComodo.filter(pt => pt.tipo === 'INTERRUPTOR');
                const ilumExtras = ptsDoComodo.filter(pt => pt.tipo === 'ILUM' && (Math.abs(pt.x - luzX) > 10 || Math.abs(pt.y - luzY) > 10));

                const ehRoteamentoHorizontal = (c.passagemTomadas === 'horizontal' || (!c.passagemTomadas && tugsDoComodo.length > 1));

                // A) TOMADAS TUG:
                const statusTug = (typeof obterStatusVisibilidadeCircuito === 'function')
                    ? obterStatusVisibilidadeCircuito('tugs', idx)
                    : { visivel: true, destacado: false, opacidade: 1.0 };

                if (statusTug.visivel && tugsDoComodo.length > 0) {
                    ctx.save();
                    ctx.globalAlpha = statusTug.opacidade;
                    if (statusTug.destacado) {
                        ctx.shadowColor = '#10b981';
                        ctx.shadowBlur = 10;
                    }

                    if (ehRoteamentoHorizontal && tugsDoComodo.length > 1) {
                        const tugsOrdenadas = [...tugsDoComodo].sort((a, b) => (a.x + a.y) - (b.x + b.y));

                        ctx.strokeStyle = statusTug.destacado ? '#34d399' : '#10b981';
                        ctx.lineWidth = statusTug.destacado ? 3.2 : 2.0;
                        ctx.setLineDash([4, 3]);
                        ctx.beginPath();
                        ctx.moveTo(luzX, luzY);
                        ctx.lineTo(tugsOrdenadas[0].x, tugsOrdenadas[0].y);
                        ctx.stroke();
                        ctx.setLineDash([]);

                        ctx.lineWidth = statusTug.destacado ? 3.6 : 2.6;
                        for (let t = 0; t < tugsOrdenadas.length - 1; t++) {
                            const pt1 = tugsOrdenadas[t];
                            const pt2 = tugsOrdenadas[t + 1];

                            ctx.beginPath();
                            ctx.moveTo(pt1.x, pt1.y);
                            if (Math.abs(pt1.x - pt2.x) > 30 && Math.abs(pt1.y - pt2.y) > 30) {
                                ctx.lineTo(pt2.x, pt1.y);
                                ctx.lineTo(pt2.x, pt2.y);
                            } else {
                                ctx.lineTo(pt2.x, pt2.y);
                            }
                            ctx.stroke();

                            ctx.fillStyle = '#10b981';
                            ctx.beginPath();
                            ctx.arc((pt1.x + pt2.x) / 2, (pt1.y + pt2.y) / 2, 2.5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    } else {
                        tugsDoComodo.forEach(pt => {
                            ctx.strokeStyle = statusTug.destacado ? '#34d399' : '#10b981';
                            ctx.lineWidth = statusTug.destacado ? 3.0 : 1.8;
                            ctx.setLineDash([4, 3]);
                            ctx.beginPath();
                            ctx.moveTo(luzX, luzY);
                            ctx.lineTo(pt.x, pt.y);
                            ctx.stroke();
                            ctx.setLineDash([]);
                        });
                    }
                    ctx.restore();
                }

                // B) TOMADAS TUE: LINHAS DEDICADAS EM AZUL ROYAL (#3b82f6)
                const statusTue = (typeof obterStatusVisibilidadeCircuito === 'function')
                    ? obterStatusVisibilidadeCircuito('tues', idx)
                    : { visivel: true, destacado: false, opacidade: 1.0 };

                if (statusTue.visivel && tuesDoComodo.length > 0) {
                    ctx.save();
                    ctx.globalAlpha = statusTue.opacidade;
                    if (statusTue.destacado) {
                        ctx.shadowColor = '#3b82f6';
                        ctx.shadowBlur = 10;
                    }
                    tuesDoComodo.forEach(pt => {
                        ctx.strokeStyle = statusTue.destacado ? '#60a5fa' : '#3b82f6';
                        ctx.lineWidth = statusTue.destacado ? 3.5 : 2.2;
                        ctx.setLineDash([6, 2]);
                        ctx.beginPath();
                        ctx.moveTo(luzX, luzY);
                        ctx.lineTo(pt.x, pt.y);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    });
                    ctx.restore();
                }

                // C) INTERRUPTOR & CONDUTOR DE RETORNO (NBR 5444 / NBR 5410): ROXO / VIOLETA (#a855f7)
                const statusInt = (typeof obterStatusVisibilidadeCircuito === 'function')
                    ? obterStatusVisibilidadeCircuito('ilum', idx)
                    : { visivel: true, destacado: false, opacidade: 1.0 };

                // Lista de interruptores do cômodo. Se nenhum foi colocado manualmente, define um ponto padrão na parede próxima ao canto para representar o retorno da lâmpada
                let listaInterr = interrDoComodo;
                let ehVirtual = false;
                if (listaInterr.length === 0) {
                    ehVirtual = true;
                    const margemInt = Math.max(8, Math.min(18, Math.min(w, h) * 0.2));
                    listaInterr = [{
                        id: 'virt_int_' + c.id,
                        x: c.x + margemInt,
                        y: c.y + h - margemInt,
                        comando: String.fromCharCode(97 + (idx % 26)),
                        tipo: 'INTERRUPTOR',
                        virtual: true
                    }];
                }

                if (statusInt.visivel && listaInterr.length > 0) {
                    ctx.save();
                    ctx.globalAlpha = statusInt.opacidade;
                    if (statusInt.destacado) {
                        ctx.shadowColor = '#a855f7';
                        ctx.shadowBlur = 10;
                    }
                    listaInterr.forEach(pt => {
                        const letraComando = pt.comando || String.fromCharCode(97 + (idx % 26));

                        // 1. Linha do eletroduto ligando interruptor ao ponto de luz no teto
                        ctx.strokeStyle = statusInt.destacado ? '#c084fc' : '#a855f7';
                        ctx.lineWidth = statusInt.destacado ? 3.0 : 1.8;
                        ctx.beginPath();
                        ctx.moveTo(pt.x, pt.y);
                        ctx.lineTo(luzX, luzY);
                        ctx.stroke();

                        // 2. REPRESENTAÇÃO TÉCNICA NBR 5444 DOS CONDUTORES (FASE + RETORNO):
                        // Cálculo dos vetores unitários na reta do eletroduto
                        const dx = luzX - pt.x;
                        const dy = luzY - pt.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist > 15) {
                            const ux = dx / dist;
                            const uy = dy / dist;
                            // Normal perpendicular
                            const nx = -uy;
                            const ny = ux;

                            // Ponto médio da reta onde desenhamos os condutores
                            const midX = pt.x + dx * 0.45;
                            const midY = pt.y + dy * 0.45;

                            ctx.strokeStyle = '#c084fc';
                            ctx.lineWidth = 1.4;

                            // A) CONDUTOR DE FASE: Traço cheio atravessando a linha perpendicularmente (comprimento total 10px)
                            ctx.beginPath();
                            ctx.moveTo(midX - nx * 5, midY - ny * 5);
                            ctx.lineTo(midX + nx * 5, midY + ny * 5);
                            ctx.stroke();

                            // B) CONDUTOR DE RETORNO (NBR 5444): Semi-traço perpendicular (meio-traço de 6px apenas de um lado da linha)
                            const retX = midX + ux * 4.5;
                            const retY = midY + uy * 4.5;
                            ctx.beginPath();
                            ctx.moveTo(retX, retY);
                            ctx.lineTo(retX + nx * 6, retY + ny * 6);
                            ctx.stroke();

                            // C) LETRA DE IDENTIFICAÇÃO DO COMANDO DO RETORNO (NBR 5444: letra minúscula junto ao retorno)
                            ctx.fillStyle = '#e9d5ff';
                            ctx.font = 'bold 8px monospace';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(letraComando, retX + nx * 11, retY + ny * 11);

                            // D) Rótulo textual "retorno" se rótulos estiverem ativados
                            if (state.exibirRotulosInstalacoes) {
                                ctx.fillStyle = '#c084fc';
                                ctx.font = 'bold 7.5px sans-serif';
                                ctx.fillText(`retorno (${letraComando})`, midX + nx * 14, midY + ny * 14 - 4);
                            }
                        }

                        // 3. Letra do comando na lâmpada no teto
                        ctx.fillStyle = '#c084fc';
                        ctx.font = 'bold 8px monospace';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(letraComando, luzX + 7, luzY - 4);

                        // 4. Se o interruptor for virtual (gerado para garantir visualização do retorno), desenha o símbolo discreto
                        if (pt.virtual) {
                            ctx.save();
                            ctx.translate(pt.x, pt.y);
                            ctx.beginPath();
                            ctx.arc(0, 0, 5, 0, 2 * Math.PI);
                            ctx.fillStyle = '#7c3aed';
                            ctx.fill();
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 1.0;
                            ctx.stroke();

                            ctx.beginPath();
                            ctx.moveTo(0, 0);
                            ctx.lineTo(7, -7);
                            ctx.strokeStyle = '#a78bfa';
                            ctx.lineWidth = 1.4;
                            ctx.stroke();

                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 6px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('S', 0, 0);

                            ctx.fillStyle = '#e9d5ff';
                            ctx.font = 'bold 7px monospace';
                            ctx.fillText(letraComando, 8, 3);
                            ctx.restore();
                        }
                    });
                    ctx.restore();
                }

                // D) LÂMPADAS ADICIONAIS: AMARELO OURO (#f59e0b)
                if (statusInt.visivel && ilumExtras.length > 0) {
                    ctx.save();
                    ctx.globalAlpha = statusInt.opacidade;
                    if (statusInt.destacado) {
                        ctx.shadowColor = '#f59e0b';
                        ctx.shadowBlur = 10;
                    }
                    ilumExtras.forEach(pt => {
                        ctx.strokeStyle = statusInt.destacado ? '#fde047' : '#f59e0b';
                        ctx.lineWidth = statusInt.destacado ? 3.5 : 2.2;
                        ctx.setLineDash([4, 2]);
                        ctx.beginPath();
                        ctx.moveTo(luzX, luzY);
                        ctx.lineTo(pt.x, pt.y);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    });
                    ctx.restore();
                }
            });

            } // fim da representação colorida

            // DESTAQUE DE CABO VIRTUAL AO PASSAR O MOUSE / TOCAR
            // Recalculado a cada desenho pelo id: antes o destaque guardava as coordenadas do
            // momento do hover e, ao arrastar a tela, dar zoom ou mover cômodos/pontos, ficava
            // parado fora do circuito (no celular ficava preso, pois não há "mouseleave").
            const caboHoverAtual = state.caboHoverInstalacoes
                ? obterCabosVirtuaisInstalacoes(state).find(c => c.id === state.caboHoverInstalacoes.id) || null
                : null;
            if (state.caboHoverInstalacoes && !caboHoverAtual) state.caboHoverInstalacoes = null;   // circuito não existe mais
            if (caboHoverAtual && caboHoverAtual.pts && caboHoverAtual.pts.length >= 2) {
                state.caboHoverInstalacoes = caboHoverAtual;
                const ch = usarUnifilar ? ajustarCaboParaUnifilar(caboHoverAtual) : caboHoverAtual;
                ctx.save();
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Halo Externo Brilhante Neon
                ctx.strokeStyle = ch.corHover || '#38bdf8';
                ctx.lineWidth = 7.5;
                ctx.shadowColor = ch.corHover || '#38bdf8';
                ctx.shadowBlur = 18;
                ctx.beginPath();
                ctx.moveTo(ch.pts[0].x, ch.pts[0].y);
                for (let i = 1; i < ch.pts.length; i++) {
                    ctx.lineTo(ch.pts[i].x, ch.pts[i].y);
                }
                ctx.stroke();

                // Núcleo Interno Branco Intenso
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.8;
                ctx.shadowBlur = 0;
                ctx.stroke();

                // Marcador circular nos nós do cabo
                ch.pts.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 4.0, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    ctx.strokeStyle = ch.corHover || '#38bdf8';
                    ctx.lineWidth = 2.0;
                    ctx.stroke();
                });

                ctx.restore();
            }

            // Pontos Elétricos (ILUM, TUG, TUE, INTERRUPTOR) do andar ativo com escala visual proporcional ao zoom
            // (no unifilar os símbolos NBR 5444 já foram desenhados)
            if (!usarUnifilar) {
            const scaleVisual = Math.min(1.5, Math.max(0.75, (state.escala || 35.0) / 35.0));
            const pontosAndar = state.pontosEletricos.filter(p => p.pavimentoId === state.pavimentoAtivoId);
            pontosAndar.forEach(pt => {
                const isSelected = (state.pontoSelecionadoId === pt.id);

                if (isSelected) {
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 10.5 * scaleVisual, 0, 2 * Math.PI);
                    ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
                    ctx.fill();
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 1.6 * scaleVisual;
                    ctx.stroke();
                }

                ctx.save();
                ctx.translate(pt.x, pt.y);

                if (pt.tipo === 'ILUM') {
                    // SÍMBOLO NBR 5410: PONTO DE ILUMINAÇÃO NO TETO (TAMANHO COMPACTO)
                    const rLuz = 7.5 * scaleVisual;
                    ctx.beginPath();
                    ctx.arc(0, 0, rLuz, 0, 2 * Math.PI);
                    ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
                    ctx.fill();
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 1.6 * scaleVisual;
                    ctx.stroke();

                    // Ponto central emissivo
                    ctx.beginPath();
                    ctx.arc(0, 0, 2.2 * scaleVisual, 0, 2 * Math.PI);
                    ctx.fillStyle = '#fbbf24';
                    ctx.fill();

                    // Rótulo da potência
                    if (state.exibirRotulosInstalacoes || isSelected) {
                        ctx.fillStyle = '#fef08a';
                        ctx.font = `bold ${Math.round(8 * scaleVisual)}px monospace`;
                        ctx.textAlign = 'center';
                        ctx.fillText(`${pt.pot}W`, 0, 13 * scaleVisual);
                    }
                } else if (pt.tipo === 'INTERRUPTOR') {
                    // SÍMBOLO NBR 5410: INTERRUPTOR SIMPLES DE PAREDE COM COMANDO
                    const rInt = 5.5 * scaleVisual;
                    ctx.beginPath();
                    ctx.arc(0, 0, rInt, 0, 2 * Math.PI);
                    ctx.fillStyle = '#7c3aed';
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.2 * scaleVisual;
                    ctx.stroke();

                    // Haste / linha do interruptor NBR
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(8 * scaleVisual, -8 * scaleVisual);
                    ctx.strokeStyle = '#a78bfa';
                    ctx.lineWidth = 1.5 * scaleVisual;
                    ctx.stroke();

                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${Math.round(6.5 * scaleVisual)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('S', 0, 0);

                    // Letra de comando do interruptor (ex: "a")
                    const cmdLetra = pt.comando || 'a';
                    ctx.fillStyle = '#e9d5ff';
                    ctx.font = `bold ${Math.round(7 * scaleVisual)}px monospace`;
                    ctx.textAlign = 'left';
                    ctx.fillText(cmdLetra, 7 * scaleVisual, 2 * scaleVisual);
                } else if (pt.tipo === 'TUE') {
                    // TOMADA TUE (USO ESPECÍFICO) - ESCALA COMPACTA
                    const rTue = 6.0 * scaleVisual;
                    ctx.beginPath();
                    ctx.arc(0, 0, rTue, 0, 2 * Math.PI);
                    ctx.fillStyle = '#2563eb';
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.4 * scaleVisual;
                    ctx.stroke();

                    // Triângulo preenchido / símbolo de tomada alta NBR proporcional
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.moveTo(0, -3.8 * scaleVisual);
                    ctx.lineTo(3.8 * scaleVisual, 2.5 * scaleVisual);
                    ctx.lineTo(-3.8 * scaleVisual, 2.5 * scaleVisual);
                    ctx.closePath();
                    ctx.fill();

                    if (state.exibirRotulosInstalacoes || isSelected) {
                        ctx.fillStyle = '#93c5fd';
                        ctx.font = `bold ${Math.round(8 * scaleVisual)}px monospace`;
                        ctx.textAlign = 'center';
                        ctx.fillText(`${pt.pot}W`, 0, 12 * scaleVisual);
                    }
                } else {
                    // TOMADA TUG (USO GERAL) - ESCALA COMPACTA E NÍTIDA
                    const rTug = 5.5 * scaleVisual;
                    const ehBaixa = (pt.altura === 'baixa');
                    const ehAlta = (pt.altura === 'alta');

                    ctx.beginPath();
                    ctx.arc(0, 0, rTug, 0, 2 * Math.PI);
                    ctx.fillStyle = ehBaixa ? '#ffffff' : (ehAlta ? '#10b981' : 'transparent');
                    ctx.fill();
                    ctx.strokeStyle = '#10b981';
                    ctx.lineWidth = 1.4 * scaleVisual;
                    ctx.stroke();

                    if (!ehBaixa && !ehAlta) {
                        ctx.beginPath();
                        ctx.arc(0, 0, rTug, 0, Math.PI);
                        ctx.fillStyle = '#10b981';
                        ctx.fill();
                    }

                    if (state.exibirRotulosInstalacoes || isSelected) {
                        ctx.fillStyle = '#6ee7b7';
                        ctx.font = `bold ${Math.round(8 * scaleVisual)}px monospace`;
                        ctx.textAlign = 'center';
                        ctx.fillText(`${pt.pot}W`, 0, 11 * scaleVisual);
                    }
                }

                ctx.restore();

                // Rótulo descritivo lateral
                if (state.exibirRotulosInstalacoes || isSelected) {
                    const ehTue = (pt.tipo === 'TUE');
                    const offsetLabelX = 8 * scaleVisual;
                    ctx.fillStyle = ehTue ? '#93c5fd' : '#a7f3d0';
                    ctx.font = `bold ${Math.round(8 * scaleVisual)}px sans-serif`;
                    ctx.fillText(pt.nome, pt.x + offsetLabelX, pt.y - 2);

                    ctx.fillStyle = '#94a3b8';
                    ctx.font = `${Math.round(7.5 * scaleVisual)}px monospace`;
                    ctx.fillText(`${pt.pot}W (${pt.tensao}V)`, pt.x + offsetLabelX, pt.y + 7 * scaleVisual);
                }
            });

            } // fim dos símbolos da representação colorida

            // QDT e Prumada (no unifilar o quadro é desenhado com o símbolo NBR 5444)
            if (!usarUnifilar) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(state.qdtPos.x, state.qdtPos.y, state.qdtPos.w, state.qdtPos.h);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(state.qdtPos.x, state.qdtPos.y, state.qdtPos.w, state.qdtPos.h);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(state.pavimentoAtivoId === 'terreo' ? 'QDT-G' : 'QDT-P', state.qdtPos.x + 4, state.qdtPos.y + 17);
            }

            // Prumada
            if (state.prumadaAtiva !== false) {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(state.prumadaPos.x, state.prumadaPos.y, 11, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(state.pavimentoAtivoId === 'terreo' ? '▲' : '▼', state.prumadaPos.x - 5, state.prumadaPos.y + 4);
            }

            if (state.pavimentoAtivoId === 'terreo') {
                const alim = state.alimentacaoExterna;
                ctx.fillStyle = '#059669';
                ctx.fillRect(alim.x, alim.y, alim.w, alim.h);
                ctx.strokeStyle = '#34d399';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(alim.x, alim.y, alim.w, alim.h);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 9px sans-serif';
                ctx.fillText('⚡ ALIM. EXT.', alim.x + 6, alim.y + 15);
            }
            if (window.hardwareTelemetry) {
                window.hardwareTelemetry.cpuBusyTime += (performance.now() - _telemetryStart);
            }
        }

        function desenharTransicoes(ctx) {
            const transDoAndar = state.transicoes.filter(t => t.pavimentoId === state.pavimentoAtivoId);
            transDoAndar.forEach(t => {
                const tx = t.x;
                const ty = t.y;

                if (t.tipo === 'porta') {
                    // DESENHO ARQUITETÔNICO LIMPO DE PORTA (NBR 6492)
                    ctx.save();
                    ctx.translate(tx, ty);
                    if (t.orientacao === 'V') ctx.rotate(Math.PI / 2);

                    // Abertura no vão da alvenaria (recorte limpo)
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(-14, -3, 28, 6);

                    // Batentes / Ticks das extremidades
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 2.0;
                    ctx.beginPath();
                    ctx.moveTo(-14, -4); ctx.lineTo(-14, 4);
                    ctx.moveTo(14, -4); ctx.lineTo(14, 4);
                    ctx.stroke();

                    // Folha da porta aberta (linha sólida)
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    ctx.moveTo(-14, 0);
                    ctx.lineTo(-14, -18);
                    ctx.stroke();

                    // Arco de giro / abertura da porta (linha suave tracejada NBR)
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 1.2;
                    ctx.setLineDash([2, 2]);
                    ctx.beginPath();
                    ctx.arc(-14, 0, 18, -Math.PI / 2, 0);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Ponto pivô discreto
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath();
                    ctx.arc(-14, 0, 2.5, 0, Math.PI * 2);
                    ctx.fill();

                    if (state.exibirRotulosTransicoesTexto) {
                        ctx.fillStyle = '#fbbf24';
                        ctx.font = 'bold 8px sans-serif';
                        ctx.fillText('PORTA', -12, 10);
                    }
                    ctx.restore();

                } else if (t.tipo === 'corredor') {
                    // DESENHO ARQUITETÔNICO DE CORREDOR / PASSAGEM
                    ctx.save();
                    ctx.translate(tx, ty);
                    if (t.orientacao === 'V') ctx.rotate(Math.PI / 2);

                    // Recorte sutil de passagem
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                    ctx.fillRect(-14, -3, 28, 6);

                    // Guias de passagem em ciano
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 1.6;
                    ctx.setLineDash([3, 2]);
                    ctx.beginPath();
                    ctx.moveTo(-14, -2); ctx.lineTo(-14, 2);
                    ctx.moveTo(14, -2); ctx.lineTo(14, 2);
                    ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    if (state.exibirRotulosTransicoesTexto) {
                        ctx.fillStyle = '#38bdf8';
                        ctx.font = 'bold 8px sans-serif';
                        ctx.fillText('CORREDOR', -20, 10);
                    }
                    ctx.restore();

                } else if (t.tipo === 'vao_livre') {
                    // DESENHO ARQUITETÔNICO DE VÃO LIVRE
                    ctx.save();
                    ctx.translate(tx, ty);
                    if (t.orientacao === 'V') ctx.rotate(Math.PI / 2);

                    // Recorte do vão
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(-15, -3, 30, 6);

                    // Traço de abertura (tracejado fino verde esmeralda)
                    ctx.strokeStyle = '#10b981';
                    ctx.lineWidth = 1.8;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.moveTo(-15, 0);
                    ctx.lineTo(15, 0);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Batentes discretos
                    ctx.strokeStyle = '#34d399';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-15, -3); ctx.lineTo(-15, 3);
                    ctx.moveTo(15, -3); ctx.lineTo(15, 3);
                    ctx.stroke();

                    if (state.exibirRotulosTransicoesTexto) {
                        ctx.fillStyle = '#10b981';
                        ctx.font = 'bold 8px sans-serif';
                        ctx.fillText('VÃO LIVRE', -20, 10);
                    }
                    ctx.restore();

                } else if (t.tipo === 'parede') {
                    // PAREDE (ALVENARIA DIVISÓRIA):
                    // Em planta baixa limpa, a parede contínua é apenas a costura divisória sólida
                    ctx.save();
                    ctx.translate(tx, ty);
                    if (t.orientacao === 'V') ctx.rotate(Math.PI / 2);

                    ctx.strokeStyle = '#64748b';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(-15, 0);
                    ctx.lineTo(15, 0);
                    ctx.stroke();

                    if (state.exibirRotulosTransicoesTexto) {
                        ctx.fillStyle = '#94a3b8';
                        ctx.font = 'bold 8px monospace';
                        ctx.textAlign = 'center';
                        ctx.fillText('PAREDE', 0, 10);
                    }
                    ctx.restore();
                }
            });

            // Linhas guias magnéticas dinâmicas (exibidas enquanto o cômodo é arrastado com o ímã)
            desenharLinhasGuiaMagnetica(ctx);

            // Sincroniza a Legenda Técnica Lateral e lista interativa de pontos
            if (typeof atualizarLegendaLateralInstalacoes === 'function') {
                atualizarLegendaLateralInstalacoes();
            }
        }

        // =========================================================================
        // DESENHO TÉCNICO DE ESCADAS ARQUITETÔNICAS (NBR 6492) - 2D CAD
        // =========================================================================
        function desenharEscadas(ctx) {
            if (!state.escadas || state.escadas.length === 0) return;
            const escala = state.escala || 35.0;

            state.escadas.forEach(esc => {
                const ehOrigem = (esc.pavimentoOrigemId === state.pavimentoAtivoId);
                const ehDestino = (esc.pavimentoDestinoId === state.pavimentoAtivoId);
                if (!ehOrigem && !ehDestino) return;

                const isVert = (esc.orientacao === 'V');
                const wPx = (isVert ? esc.largura : esc.comprimento) * escala;
                const hPx = (isVert ? esc.comprimento : esc.largura) * escala;
                const numDeg = esc.numDegraus || 16;
                const dir = esc.direcao || 'H_DIR';

                ctx.save();

                if (ehOrigem) {
                    // PLANTA BAIXA DO PAVIMENTO DE ORIGEM (TÉRREO)
                    // Fundo arquitetônico
                    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
                    ctx.fillRect(esc.x, esc.y, wPx, hPx);

                    // Contorno do vão da escada
                    ctx.strokeStyle = '#818cf8';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(esc.x, esc.y, wPx, hPx);

                    // Desenho dos degraus com corte a 45° na metade do lance (NBR 6492)
                    const corteIdx = Math.floor(numDeg / 2);

                    if (!isVert) {
                        const stepW = wPx / numDeg;
                        for (let i = 1; i < numDeg; i++) {
                            const sx = dir === 'H_ESQ' ? (esc.x + wPx - i * stepW) : (esc.x + i * stepW);
                            const acimaDoCorte = (i > corteIdx);

                            ctx.beginPath();
                            ctx.strokeStyle = acimaDoCorte ? '#64748b' : '#cbd5e1';
                            ctx.lineWidth = acimaDoCorte ? 1.0 : 1.2;
                            if (acimaDoCorte) ctx.setLineDash([3, 3]);
                            else ctx.setLineDash([]);
                            ctx.moveTo(sx, esc.y);
                            ctx.lineTo(sx, esc.y + hPx);
                            ctx.stroke();
                            ctx.setLineDash([]);
                        }

                        // Linha de corte/interrupção a 45°
                        const cutX = dir === 'H_ESQ' ? (esc.x + wPx - corteIdx * stepW) : (esc.x + corteIdx * stepW);
                        ctx.strokeStyle = '#a855f7';
                        ctx.lineWidth = 2.0;
                        ctx.beginPath();
                        ctx.moveTo(cutX - 8, esc.y);
                        ctx.lineTo(cutX + 8, esc.y + hPx);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(cutX - 4, esc.y);
                        ctx.lineTo(cutX + 12, esc.y + hPx);
                        ctx.stroke();

                        // Seta de subida central com círculo na base
                        const midY = esc.y + hPx / 2;
                        const startX = dir === 'H_ESQ' ? (esc.x + wPx - 10) : (esc.x + 10);
                        const endX = dir === 'H_ESQ' ? (esc.x + 10) : (esc.x + wPx - 10);

                        ctx.fillStyle = '#a855f7';
                        ctx.beginPath();
                        ctx.arc(startX, midY, 3.5, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.strokeStyle = '#c084fc';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(startX, midY);
                        ctx.lineTo(endX, midY);
                        ctx.stroke();

                        const arrowDir = dir === 'H_ESQ' ? 1 : -1;
                        ctx.beginPath();
                        ctx.moveTo(endX, midY);
                        ctx.lineTo(endX + arrowDir * 8, midY - 4);
                        ctx.moveTo(endX, midY);
                        ctx.lineTo(endX + arrowDir * 8, midY + 4);
                        ctx.stroke();

                        ctx.fillStyle = '#f8fafc';
                        ctx.font = 'bold 9px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('SOBE ➔ 1º PAV.', (startX + endX) / 2, midY - 6);

                    } else {
                        // Orientação Vertical
                        const stepH = hPx / numDeg;
                        for (let i = 1; i < numDeg; i++) {
                            const sy = dir === 'V_CIMA' ? (esc.y + hPx - i * stepH) : (esc.y + i * stepH);
                            const acimaDoCorte = (i > corteIdx);

                            ctx.beginPath();
                            ctx.strokeStyle = acimaDoCorte ? '#64748b' : '#cbd5e1';
                            ctx.lineWidth = acimaDoCorte ? 1.0 : 1.2;
                            if (acimaDoCorte) ctx.setLineDash([3, 3]);
                            else ctx.setLineDash([]);
                            ctx.moveTo(esc.x, sy);
                            ctx.lineTo(esc.x + wPx, sy);
                            ctx.stroke();
                            ctx.setLineDash([]);
                        }

                        // Linha de corte vertical
                        const cutY = dir === 'V_CIMA' ? (esc.y + hPx - corteIdx * stepH) : (esc.y + corteIdx * stepH);
                        ctx.strokeStyle = '#a855f7';
                        ctx.lineWidth = 2.0;
                        ctx.beginPath();
                        ctx.moveTo(esc.x, cutY - 8);
                        ctx.lineTo(esc.x + wPx, cutY + 8);
                        ctx.stroke();

                        const midX = esc.x + wPx / 2;
                        const startY = dir === 'V_CIMA' ? (esc.y + hPx - 10) : (esc.y + 10);
                        const endY = dir === 'V_CIMA' ? (esc.y + 10) : (esc.y + hPx - 10);

                        ctx.fillStyle = '#a855f7';
                        ctx.beginPath();
                        ctx.arc(midX, startY, 3.5, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.strokeStyle = '#c084fc';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(midX, startY);
                        ctx.lineTo(midX, endY);
                        ctx.stroke();

                        const arrowDirY = dir === 'V_CIMA' ? 1 : -1;
                        ctx.beginPath();
                        ctx.moveTo(midX, endY);
                        ctx.lineTo(midX - 4, endY + arrowDirY * 8);
                        ctx.moveTo(midX, endY);
                        ctx.lineTo(midX + 4, endY + arrowDirY * 8);
                        ctx.stroke();

                        ctx.fillStyle = '#f8fafc';
                        ctx.font = 'bold 9px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('SOBE ➔', midX, (startY + endY) / 2);
                    }

                    // Rótulo da escada
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                    ctx.fillRect(esc.x + 3, esc.y + hPx - 16, Math.min(115, wPx - 6), 14);
                    ctx.strokeStyle = '#818cf8';
                    ctx.lineWidth = 0.8;
                    ctx.strokeRect(esc.x + 3, esc.y + hPx - 16, Math.min(115, wPx - 6), 14);
                    ctx.fillStyle = '#c7d2fe';
                    ctx.font = 'bold 8px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText(`🪜 ESCADA (${numDeg} deg.)`, esc.x + 6, esc.y + hPx - 6);

                } else {
                    // PLANTA BAIXA DO PAVIMENTO DE CHEGADA (SUPERIOR)
                    // Fundo translúcido do vão na laje
                    ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
                    ctx.fillRect(esc.x, esc.y, wPx, hPx);

                    // Guarda-corpo e abertura no piso
                    ctx.strokeStyle = '#a855f7';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 3]);
                    ctx.strokeRect(esc.x, esc.y, wPx, hPx);
                    ctx.setLineDash([]);

                    // Seta indicando descida para o térreo
                    const midX = esc.x + wPx / 2;
                    const midY = esc.y + hPx / 2;

                    ctx.fillStyle = '#c084fc';
                    ctx.font = 'bold 9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('DESCE ➔ TÉRREO', midX, midY - 4);
                    ctx.fillStyle = '#e9d5ff';
                    ctx.font = '8px monospace';
                    ctx.fillText('(Vão de Escada / Guarda-corpo)', midX, midY + 10);
                }

                // Botão de exclusão rápida (badge '×' no canto superior direito)
                const btnBx = esc.x + wPx - 9;
                const btnBy = esc.y + 9;
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(btnBx, btnBy, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 9px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('×', btnBx, btnBy + 3);

                ctx.restore();
            });
        }


/* PRO-ELÉTRICA CAD — 03-editor-planta.js
   Editor 2D da planta: celular/toque, zoom, pan, terreno, paredes, fixação, ímã, menu de contexto.
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        // =====================================================================
        // CONTROLADORES DE INTERFACE MOBILE & TOUCH
        // =====================================================================
        function abrirDrawerMobile() {
            const drawer = document.getElementById('drawerMenuMobile');
            if (drawer) drawer.classList.remove('hidden');
        }

        function fecharDrawerMobile() {
            const drawer = document.getElementById('drawerMenuMobile');
            if (drawer) drawer.classList.add('hidden');
        }

        function toggleSpeedDialMobile() {
            const items = document.getElementById('mobileSpeedDialItems');
            const icon = document.getElementById('iconeFabPrincipal');
            if (!items) return;
            const isHidden = items.classList.contains('hidden');
            if (isHidden) {
                items.classList.remove('hidden');
                items.classList.add('flex');
                if (icon) icon.className = 'fa-solid fa-xmark text-xl transition transform rotate-90';
            } else {
                items.classList.add('hidden');
                items.classList.remove('flex');
                if (icon) icon.className = 'fa-solid fa-plus text-xl transition transform';
            }
        }

        function alternarPavimentoMobile() {
            if (!state.pavimentos || state.pavimentos.length <= 1) return;
            const pIdx = state.pavimentos.findIndex(p => p.id === state.pavimentoAtivoId);
            const proxIdx = (pIdx + 1) % state.pavimentos.length;
            selecionarPavimento(state.pavimentos[proxIdx].id);

            const lbl = document.getElementById('lblNomePavimentoMobile');
            if (lbl) lbl.textContent = state.pavimentos[proxIdx].nome.replace('Pavimento ', '');
        }

        // =========================================================================
        // ZOOM COM AJUSTE PROPORCIONAL DE TODOS OS LANÇAMENTOS (CÔMODOS, PONTOS, CABOS E TERRENO)
        // =========================================================================
        function ajustarZoomCad(fator, centroX = null, centroY = null) {
            const antigaEscala = state.escala || 35.0;
            // Limites: até 90 px/m ao aproximar; ao afastar, 15 px/m ou menos se for
            // preciso para ver o lote inteiro (chácaras e lotes grandes no celular)
            const caber = escalaParaCaberNaTela();
            const escalaMinima = Math.max(2, Math.min(15, caber ? caber * 0.85 : 15));
            const novaEscala = Math.max(escalaMinima, Math.min(90, Math.round(antigaEscala * fator * 100) / 100));
            const ratio = novaEscala / antigaEscala;

            if (Math.abs(ratio - 1.0) < 0.001) return;

            // Determina o ponto de ancoragem / pivô do zoom
            let pivotX = 40;
            let pivotY = 40;

            if (centroX !== null && centroY !== null) {
                pivotX = centroX;
                pivotY = centroY;
            } else if (state.terreno && state.terreno.x !== undefined) {
                pivotX = state.terreno.x;
                pivotY = state.terreno.y;
            } else if (state.comodos && state.comodos.length > 0) {
                let minX = Infinity, minY = Infinity;
                state.comodos.forEach(c => {
                    if (c.x < minX) minX = c.x;
                    if (c.y < minY) minY = c.y;
                });
                if (minX !== Infinity) {
                    pivotX = minX;
                    pivotY = minY;
                }
            }

            // As coordenadas NÃO são arredondadas: no celular o gesto de pinça chama esta
            // função dezenas de vezes por gesto, e arredondar cada cômodo a cada passo
            // acumulava erro e desalinhava os cômodos entre si (visível na maquete 3D).

            // 1. AJUSTA CÔMODOS (POSIÇÃO X, Y RELATIVA AO PIVÔ)
            if (state.comodos) {
                state.comodos.forEach(c => {
                    c.x = (pivotX + (c.x - pivotX) * ratio);
                    c.y = (pivotY + (c.y - pivotY) * ratio);
                });
            }

            // 2. AJUSTA TODOS OS LANÇAMENTOS ELÉTRICOS (PONTOS: ILUM, TUG, TUE, INTERRUPTORES)
            if (state.pontosEletricos) {
                state.pontosEletricos.forEach(pt => {
                    pt.x = (pivotX + (pt.x - pivotX) * ratio);
                    pt.y = (pivotY + (pt.y - pivotY) * ratio);
                });
            }

            // 3. AJUSTA TRAÇADOS E WAYPOINTS DOS ELETRODUTOS / CABOS
            if (state.eletrodutoWaypoints) {
                Object.keys(state.eletrodutoWaypoints).forEach(k => {
                    const wps = state.eletrodutoWaypoints[k];
                    if (Array.isArray(wps)) {
                        wps.forEach(wp => {
                            wp.x = (pivotX + (wp.x - pivotX) * ratio);
                            wp.y = (pivotY + (wp.y - pivotY) * ratio);
                        });
                    }
                });
            }

            // 4. AJUSTA ELEMENTOS DE INFRAESTRUTURA GERAL (QDT, PRUMADA, ENTRADA DA CONCESSIONÁRIA)
            if (state.qdtPos) {
                state.qdtPos.x = (pivotX + (state.qdtPos.x - pivotX) * ratio);
                state.qdtPos.y = (pivotY + (state.qdtPos.y - pivotY) * ratio);
            }
            if (state.prumadaPos) {
                state.prumadaPos.x = (pivotX + (state.prumadaPos.x - pivotX) * ratio);
                state.prumadaPos.y = (pivotY + (state.prumadaPos.y - pivotY) * ratio);
            }
            if (state.alimentacaoExterna) {
                state.alimentacaoExterna.x = (pivotX + (state.alimentacaoExterna.x - pivotX) * ratio);
                state.alimentacaoExterna.y = (pivotY + (state.alimentacaoExterna.y - pivotY) * ratio);
            }

            // 5. AJUSTA LINHAS A MÃO LIVRE
            if (state.linhasMaoLivre) {
                state.linhasMaoLivre.forEach(linha => {
                    if (Array.isArray(linha)) {
                        linha.forEach(p => {
                            p.x = (pivotX + (p.x - pivotX) * ratio);
                            p.y = (pivotY + (p.y - pivotY) * ratio);
                        });
                    } else if (linha && linha.tipo === 'texto') {      // anotação de texto
                        linha.x = (pivotX + (linha.x - pivotX) * ratio);
                        linha.y = (pivotY + (linha.y - pivotY) * ratio);
                    }
                });
            }

            // 6. AJUSTA TRANSIÇÕES (PORTAS E CORREDORES)
            if (state.transicoes) {
                state.transicoes.forEach(tr => {
                    if (tr.x !== undefined) tr.x = (pivotX + (tr.x - pivotX) * ratio);
                    if (tr.y !== undefined) tr.y = (pivotY + (tr.y - pivotY) * ratio);
                });
            }

            // 6b. AJUSTA ESCADAS
            if (state.escadas) {
                state.escadas.forEach(esc => {
                    esc.x = (pivotX + (esc.x - pivotX) * ratio);
                    esc.y = (pivotY + (esc.y - pivotY) * ratio);
                });
            }

            // 6c. AJUSTA A PLANTA DXF DE FUNDO (UNDERLAY) — antes não acompanhava o zoom
            if (Array.isArray(state.cadUnderlay)) {
                state.cadUnderlay.forEach(item => {
                    if (item.tipo === 'linha') {
                        item.x1 = pivotX + (item.x1 - pivotX) * ratio; item.y1 = pivotY + (item.y1 - pivotY) * ratio;
                        item.x2 = pivotX + (item.x2 - pivotX) * ratio; item.y2 = pivotY + (item.y2 - pivotY) * ratio;
                    } else if (item.x !== undefined && item.y !== undefined) {
                        item.x = pivotX + (item.x - pivotX) * ratio; item.y = pivotY + (item.y - pivotY) * ratio;
                        if (item.r !== undefined) item.r = item.r * ratio;
                    }
                });
            }

            // 7. AJUSTA COORDENADAS DO TERRENO TOTAL
            if (state.terreno) {
                state.terreno.x = (pivotX + (state.terreno.x - pivotX) * ratio);
                state.terreno.y = (pivotY + (state.terreno.y - pivotY) * ratio);
            }

            // Atualiza escala global
            state.escala = novaEscala;

            // Atualiza indicadores de zoom nas duas representações
            const pct = Math.round((novaEscala / 35.0) * 100);
            document.querySelectorAll('.lbl-zoom-cad-pct').forEach(el => el.innerText = pct + '%');

            desenharCAD();
            desenharInstalacoes();
        }

        
        // =========================================================================
        // PAN (MOVER LIVREMENTE) E CENTRALIZAÇÃO DAS REPRESENTAÇÕES 2D
        // =========================================================================
        function moverProjetoOffset(dx, dy) {
            if (!dx && !dy) return;

            // 1. Cômodos
            if (state.comodos) {
                state.comodos.forEach(c => {
                    c.x += dx;
                    c.y += dy;
                });
            }

            // 2. Pontos Elétricos
            if (state.pontosEletricos) {
                state.pontosEletricos.forEach(pt => {
                    pt.x += dx;
                    pt.y += dy;
                });
            }

            // 3. Eletrodutos Waypoints
            if (state.eletrodutoWaypoints) {
                Object.keys(state.eletrodutoWaypoints).forEach(k => {
                    const wps = state.eletrodutoWaypoints[k];
                    if (Array.isArray(wps)) {
                        wps.forEach(wp => {
                            wp.x += dx;
                            wp.y += dy;
                        });
                    }
                });
            }

            // 4. QDT e Prumada
            if (state.qdtPos) {
                state.qdtPos.x += dx;
                state.qdtPos.y += dy;
            }
            if (state.prumadaPos) {
                state.prumadaPos.x += dx;
                state.prumadaPos.y += dy;
            }

            // 5. Alimentação Externa
            if (state.alimentacaoExterna) {
                state.alimentacaoExterna.x += dx;
                state.alimentacaoExterna.y += dy;
            }

            // 6. Terreno (Lote)
            if (state.terreno) {
                state.terreno.x += dx;
                state.terreno.y += dy;
            }

            // 7. Linhas a mão livre
            if (state.linhasMaoLivre) {
                state.linhasMaoLivre.forEach(linha => {
                    if (Array.isArray(linha)) {
                        linha.forEach(p => {
                            p.x += dx;
                            p.y += dy;
                        });
                    } else if (linha && linha.tipo === 'texto') {      // anotação de texto
                        linha.x += dx;
                        linha.y += dy;
                    }
                });
            }

            // 8. Transições (Portas)
            if (state.transicoes) {
                state.transicoes.forEach(t => {
                    t.x += dx;
                    t.y += dy;
                });
            }

            // 8b. Escadas
            if (state.escadas) {
                state.escadas.forEach(esc => {
                    esc.x += dx;
                    esc.y += dy;
                });
            }

            // 8c. Planta AutoCAD / DXF de Fundo (Underlay)
            if (state.cadUnderlay && Array.isArray(state.cadUnderlay)) {
                state.cadUnderlay.forEach(item => {
                    if (item.tipo === 'linha') {
                        item.x1 += dx;
                        item.y1 += dy;
                        item.x2 += dx;
                        item.y2 += dy;
                    } else if (item.x !== undefined && item.y !== undefined) {
                        item.x += dx;
                        item.y += dy;
                    }
                });
            }
        }

        // Retângulo (px) ocupado pelo lote, cômodos do andar e quadro na escala atual
        function caixaConteudoProjeto() {

            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;

            // 1. Considera o terreno (lote) se ativo
            if (state.terreno && state.terreno.ativo) {
                const tw = (state.terreno.largura || 12.0) * (state.escala || 35.0);
                const th = (state.terreno.comprimento || 25.0) * (state.escala || 35.0);
                const tx = state.terreno.x !== undefined ? state.terreno.x : 40;
                const ty = state.terreno.y !== undefined ? state.terreno.y : 40;
                minX = Math.min(minX, tx);
                minY = Math.min(minY, ty);
                maxX = Math.max(maxX, tx + tw);
                maxY = Math.max(maxY, ty + th);
            }

            // 2. Considera os cômodos
            const comodosAndar = (state.comodos || []).filter(c => c.pavimentoId === state.pavimentoAtivoId);
            if (comodosAndar.length > 0) {
                comodosAndar.forEach(c => {
                    const cw = c.largura * (state.escala || 35.0);
                    const ch = c.comprimento * (state.escala || 35.0);
                    minX = Math.min(minX, c.x);
                    minY = Math.min(minY, c.y);
                    maxX = Math.max(maxX, c.x + cw);
                    maxY = Math.max(maxY, c.y + ch);
                });
            }

            // 3. Considera QDT e Prumada
            if (state.qdtPos) {
                minX = Math.min(minX, state.qdtPos.x);
                minY = Math.min(minY, state.qdtPos.y);
                maxX = Math.max(maxX, state.qdtPos.x + (state.qdtPos.w || 40));
                maxY = Math.max(maxY, state.qdtPos.y + (state.qdtPos.h || 26));
            }

            if (minX === Infinity || maxX === -Infinity) return null;
            return { minX, minY, maxX, maxY };
        }

        /**
         * Escala (px/m) em que o projeto inteiro cabe no canvas visível (com margem).
         * Usada como limite do zoom mínimo e para enquadrar a planta no celular.
         */
        function escalaParaCaberNaTela(canvasId) {
            const ids = canvasId ? [canvasId] : ['cadCanvas', 'instalacoesCanvas'];
            const canvas = ids.map(id => document.getElementById(id)).find(c => c && c.offsetParent) || document.getElementById(ids[0]);
            const cx = caixaConteudoProjeto();
            if (!canvas || !cx) return null;
            const w = larguraLogicaCanvas(canvas), h = alturaLogicaCanvas(canvas);
            if (w < 100 || h < 100) return null;
            const margem = 24;
            const larg = Math.max(1, cx.maxX - cx.minX), alt = Math.max(1, cx.maxY - cx.minY);
            // altura: desconta também a barra flutuante de zoom sobre o canvas
            const fator = Math.min((w - 2 * margem) / larg, (h - 2 * margem - 56) / alt);
            return (state.escala || 35) * fator;
        }

        function centralizarProjetoNoCanvas(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;

            // 1. Considera o terreno (lote) se ativo
            if (state.terreno && state.terreno.ativo) {
                const tw = (state.terreno.largura || 12.0) * (state.escala || 35.0);
                const th = (state.terreno.comprimento || 25.0) * (state.escala || 35.0);
                const tx = state.terreno.x !== undefined ? state.terreno.x : 40;
                const ty = state.terreno.y !== undefined ? state.terreno.y : 40;
                minX = Math.min(minX, tx);
                minY = Math.min(minY, ty);
                maxX = Math.max(maxX, tx + tw);
                maxY = Math.max(maxY, ty + th);
            }

            // 2. Considera os cômodos
            const comodosAndar = (state.comodos || []).filter(c => c.pavimentoId === state.pavimentoAtivoId);
            if (comodosAndar.length > 0) {
                comodosAndar.forEach(c => {
                    const cw = c.largura * (state.escala || 35.0);
                    const ch = c.comprimento * (state.escala || 35.0);
                    minX = Math.min(minX, c.x);
                    minY = Math.min(minY, c.y);
                    maxX = Math.max(maxX, c.x + cw);
                    maxY = Math.max(maxY, c.y + ch);
                });
            }

            // 3. Considera QDT e Prumada
            if (state.qdtPos) {
                minX = Math.min(minX, state.qdtPos.x);
                minY = Math.min(minY, state.qdtPos.y);
                maxX = Math.max(maxX, state.qdtPos.x + (state.qdtPos.w || 40));
                maxY = Math.max(maxY, state.qdtPos.y + (state.qdtPos.h || 26));
            }

            if (minX === Infinity || maxX === -Infinity) return;

            const projCenterX = (minX + maxX) / 2;
            const projCenterY = (minY + maxY) / 2;

            const canvasCenterX = larguraLogicaCanvas(canvas) / 2;
            const canvasCenterY = alturaLogicaCanvas(canvas) / 2;

            const shiftX = Math.round(canvasCenterX - projCenterX);
            const shiftY = Math.round(canvasCenterY - projCenterY);

            if (shiftX !== 0 || shiftY !== 0) {
                moverProjetoOffset(shiftX, shiftY);
            }
        }

        function resetarZoomCad(enquadrar) {
            // computador: escala padrão (35 px/m); celular/tablet (ou enquadrar = true, ao
            // criar um projeto): enquadra o projeto inteiro na tela
            let alvo = 35;
            if (enquadrar === true || window.innerWidth < 1024) {
                const caber = escalaParaCaberNaTela();
                if (caber) alvo = Math.max(2, Math.min(35, caber));
            }
            if (state.escala && Math.abs(state.escala - alvo) > 0.01) {
                ajustarZoomCad(alvo / state.escala);
            }
            // centraliza no canvas visível (as duas abas compartilham as coordenadas; o
            // canvas da aba escondida tem outro tamanho e deslocava o projeto para fora)
            const visivel = ['cadCanvas', 'instalacoesCanvas'].find(id => document.getElementById(id)?.offsetParent) || 'cadCanvas';
            centralizarProjetoNoCanvas(visivel);
            desenharCAD();
            desenharInstalacoes();
        }

        // SUPORTE A ZOOM COM SCROLL DO MOUSE (WHEEL) NOS CANVASES
        // Conforme solicitado: apenas dá zoom em tela cheia E se a tecla CTRL estiver apertada (CTRL + Scroll)
        function habilitarZoomMouseWheel(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            canvas.addEventListener('wheel', (e) => {
                // Verifica se o canvas está em modo de tela cheia (variável global ou classe no container)
                const container = canvas.closest('.viewport-fullscreen-mode');
                const ehFullscreen = !!(typeof viewportFullscreenAtivo !== 'undefined' && viewportFullscreenAtivo) || !!container;
                const segurandoCtrl = e.ctrlKey || e.metaKey;

                // Se NÃO estiver em tela cheia, permite rolagem natural da página sem travar
                if (!ehFullscreen) {
                    return;
                }

                // Se estiver em tela cheia, só aplica zoom se CTRL estiver apertado
                if (!segurandoCtrl) {
                    e.preventDefault();
                    mostrarDicaZoomFullscreen(canvas, 'Pressione CTRL + Scroll para aproximar/afastar');
                    return;
                }

                // Em tela cheia + CTRL: executa o zoom suave centrado no cursor do mouse
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const scaleX = larguraLogicaCanvas(canvas) / rect.width;
                const scaleY = alturaLogicaCanvas(canvas) / rect.height;
                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;

                const fator = e.deltaY < 0 ? 1.12 : 0.89;
                ajustarZoomCad(fator, mouseX, mouseY);
            }, { passive: false });
        }

        function mostrarDicaZoomFullscreen(canvas, mensagem) {
            let dica = document.getElementById('dicaZoomFullscreenOverlay');
            if (!dica) {
                dica = document.createElement('div');
                dica.id = 'dicaZoomFullscreenOverlay';
                dica.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100000] bg-slate-900/95 text-amber-300 font-bold text-sm px-5 py-3 rounded-2xl border border-amber-500/50 shadow-2xl backdrop-blur pointer-events-none transition-all duration-300 opacity-0 flex items-center gap-3';
                dica.innerHTML = '<i class="fa-solid fa-keyboard text-xl text-amber-400"></i> <span id="txtDicaZoomFullscreen"></span>';
                document.body.appendChild(dica);
            }
            const txt = document.getElementById('txtDicaZoomFullscreen');
            if (txt) txt.textContent = mensagem;

            dica.classList.remove('opacity-0');
            dica.classList.add('opacity-100');

            if (canvas._dicaZoomTimeout) clearTimeout(canvas._dicaZoomTimeout);
            canvas._dicaZoomTimeout = setTimeout(() => {
                dica.classList.remove('opacity-100');
                dica.classList.add('opacity-0');
            }, 1300);
        }


        // =========================================================================
        // CONTROLES E MODAL DO TERRENO TOTAL (LOTE)
        // =========================================================================
        function abrirModalConfigTerreno() {
            const t = state.terreno || { largura: 12.0, comprimento: 25.0, recuoFrontal: 4.0, recuoLateral: 1.5, recuoFundos: 3.0 };
            document.getElementById('numTerrenoLargura').value = t.largura !== undefined ? t.largura : 12.0;
            document.getElementById('numTerrenoComprimento').value = t.comprimento !== undefined ? t.comprimento : 25.0;
            document.getElementById('numTerrenoRecuoFrontal').value = t.recuoFrontal !== undefined ? t.recuoFrontal : 4.0;
            document.getElementById('numTerrenoRecuoLateral').value = t.recuoLateral !== undefined ? t.recuoLateral : 1.5;
            document.getElementById('numTerrenoRecuoFundos').value = t.recuoFundos !== undefined ? t.recuoFundos : 3.0;

            atualizarPreviewTerreno();

            const modal = document.getElementById('modalConfigTerreno');
            if (modal) modal.classList.remove('hidden');
        }

        function fecharModalConfigTerreno() {
            const modal = document.getElementById('modalConfigTerreno');
            if (modal) modal.classList.add('hidden');
        }

        function aplicarPresetTerreno(larg, comp, rf, rl, rfun) {
            document.getElementById('numTerrenoLargura').value = larg;
            document.getElementById('numTerrenoComprimento').value = comp;
            document.getElementById('numTerrenoRecuoFrontal').value = rf;
            document.getElementById('numTerrenoRecuoLateral').value = rl;
            document.getElementById('numTerrenoRecuoFundos').value = rfun;
            atualizarPreviewTerreno();
        }

        function atualizarPreviewTerreno() {
            const largVal = document.getElementById('numTerrenoLargura')?.value;
            const compVal = document.getElementById('numTerrenoComprimento')?.value;
            const rfVal = document.getElementById('numTerrenoRecuoFrontal')?.value;
            const rlVal = document.getElementById('numTerrenoRecuoLateral')?.value;
            const rfunVal = document.getElementById('numTerrenoRecuoFundos')?.value;

            const larg = (largVal !== '' && !isNaN(parseFloat(largVal))) ? Math.max(1.0, parseFloat(largVal)) : 12.0;
            const comp = (compVal !== '' && !isNaN(parseFloat(compVal))) ? Math.max(1.0, parseFloat(compVal)) : 25.0;
            const rf = (rfVal !== '' && !isNaN(parseFloat(rfVal))) ? Math.max(0.0, parseFloat(rfVal)) : 4.0;
            const rl = (rlVal !== '' && !isNaN(parseFloat(rlVal))) ? Math.max(0.0, parseFloat(rlVal)) : 1.5;
            const rfun = (rfunVal !== '' && !isNaN(parseFloat(rfunVal))) ? Math.max(0.0, parseFloat(rfunVal)) : 3.0;

            const areaLote = larg * comp;
            const edifLarg = Math.max(0, larg - (rl * 2));
            const edifComp = Math.max(0, comp - rf - rfun);
            const areaEdif = edifLarg * edifComp;

            const elLote = document.getElementById('lblPreviewAreaTerreno');
            const elEdif = document.getElementById('lblPreviewAreaEdificavel');
            if (elLote) elLote.innerText = areaLote.toFixed(1) + ' m²';
            if (elEdif) elEdif.innerText = areaEdif.toFixed(1) + ' m²';
        }

        function salvarConfigTerreno() {
            const largVal = document.getElementById('numTerrenoLargura')?.value;
            const compVal = document.getElementById('numTerrenoComprimento')?.value;
            const rfVal = document.getElementById('numTerrenoRecuoFrontal')?.value;
            const rlVal = document.getElementById('numTerrenoRecuoLateral')?.value;
            const rfunVal = document.getElementById('numTerrenoRecuoFundos')?.value;

            const larg = (largVal !== '' && !isNaN(parseFloat(largVal))) ? Math.max(1.0, parseFloat(largVal)) : 12.0;
            const comp = (compVal !== '' && !isNaN(parseFloat(compVal))) ? Math.max(1.0, parseFloat(compVal)) : 25.0;
            const rf = (rfVal !== '' && !isNaN(parseFloat(rfVal))) ? Math.max(0.0, parseFloat(rfVal)) : 4.0;
            const rl = (rlVal !== '' && !isNaN(parseFloat(rlVal))) ? Math.max(0.0, parseFloat(rlVal)) : 1.5;
            const rfun = (rfunVal !== '' && !isNaN(parseFloat(rfunVal))) ? Math.max(0.0, parseFloat(rfunVal)) : 3.0;

            if (!state.terreno) {
                state.terreno = { ativo: true, x: 40, y: 40 };
            }

            state.terreno.largura = larg;
            state.terreno.comprimento = comp;
            state.terreno.recuoFrontal = rf;
            state.terreno.recuoLateral = rl;
            state.terreno.recuoFundos = rfun;
            state.terreno.area = Math.round(larg * comp * 10) / 10;
            state.terreno.customizado = true;

            ajustarTerrenoAosComodos(true);
            fecharModalConfigTerreno();
            renderListaComodosSidebar();
            desenharCAD();
            desenharInstalacoes();
            reconstruirCena3D();
            salvarProjetoSilencioso();
            mostrarNotificacaoToast(`Terreno atualizado: ${larg}m × ${comp}m (${state.terreno.area} m²)`, 'sucesso');
        }

        // Anexar perímetro do terreno à edificação (auto-enquadramento aos cômodos existentes)
        function anexarLoteAEdificacao() {
            if (!state.comodos || state.comodos.length === 0) {
                mostrarNotificacaoToast('Nenhum cômodo cadastrado para anexar o lote', 'aviso');
                return;
            }

            const escala = state.escala || 40.0;
            const comodosBase = state.comodos.filter(c => c.pavimentoId === 'terreo');
            const comodosAlvo = comodosBase.length > 0 ? comodosBase : state.comodos;

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            comodosAlvo.forEach(c => {
                const cw = (c.largura || 4) * escala;
                const ch = (c.comprimento || 4) * escala;
                minX = Math.min(minX, c.x);
                maxX = Math.max(maxX, c.x + cw);
                minY = Math.min(minY, c.y);
                maxY = Math.max(maxY, c.y + ch);
            });

            if (!isFinite(minX)) return;

            const houseWMetros = (maxX - minX) / escala;
            const houseHMetros = (maxY - minY) / escala;

            if (!state.terreno) {
                state.terreno = { ativo: true, largura: 12.0, comprimento: 25.0, recuoFrontal: 4.0, recuoLateral: 1.5, recuoFundos: 3.0, x: 40, y: 40 };
            }

            const rf = state.terreno.recuoFrontal !== undefined ? state.terreno.recuoFrontal : 4.0;
            const rl = state.terreno.recuoLateral !== undefined ? state.terreno.recuoLateral : 1.5;
            const rfun = state.terreno.recuoFundos !== undefined ? state.terreno.recuoFundos : 3.0;

            const novaLargura = Math.max(2.0, Math.round((houseWMetros + rl * 2) * 10) / 10);
            const novoComprimento = Math.max(5.0, Math.round((houseHMetros + rf + rfun) * 10) / 10);

            state.terreno.largura = novaLargura;
            state.terreno.comprimento = novoComprimento;
            state.terreno.area = Math.round(novaLargura * novoComprimento * 10) / 10;
            state.terreno.customizado = true;

            ajustarTerrenoAosComodos(true);

            renderListaComodosSidebar();
            desenharCAD();
            desenharInstalacoes();
            reconstruirCena3D();
            salvarProjetoSilencioso();

            mostrarNotificacaoToast(`Lote anexado à representação CAD: ${novaLargura}m × ${novoComprimento}m (${state.terreno.area} m²)`, 'sucesso');
        }

        // Função de anexar chamada a partir do modal de configuração do lote
        function anexarLoteAEdificacaoModal() {
            if (!state.comodos || state.comodos.length === 0) {
                mostrarNotificacaoToast('Nenhum cômodo cadastrado para calcular', 'aviso');
                return;
            }

            const escala = state.escala || 40.0;
            const comodosBase = state.comodos.filter(c => c.pavimentoId === 'terreo');
            const comodosAlvo = comodosBase.length > 0 ? comodosBase : state.comodos;

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            comodosAlvo.forEach(c => {
                const cw = (c.largura || 4) * escala;
                const ch = (c.comprimento || 4) * escala;
                minX = Math.min(minX, c.x);
                maxX = Math.max(maxX, c.x + cw);
                minY = Math.min(minY, c.y);
                maxY = Math.max(maxY, c.y + ch);
            });

            if (!isFinite(minX)) return;

            const houseWMetros = (maxX - minX) / escala;
            const houseHMetros = (maxY - minY) / escala;

            const rfVal = document.getElementById('numTerrenoRecuoFrontal')?.value;
            const rlVal = document.getElementById('numTerrenoRecuoLateral')?.value;
            const rfunVal = document.getElementById('numTerrenoRecuoFundos')?.value;

            const rf = (rfVal !== '' && !isNaN(parseFloat(rfVal))) ? Math.max(0, parseFloat(rfVal)) : 4.0;
            const rl = (rlVal !== '' && !isNaN(parseFloat(rlVal))) ? Math.max(0, parseFloat(rlVal)) : 1.5;
            const rfun = (rfunVal !== '' && !isNaN(parseFloat(rfunVal))) ? Math.max(0, parseFloat(rfunVal)) : 3.0;

            const novaLargura = Math.max(2.0, Math.round((houseWMetros + rl * 2) * 10) / 10);
            const novoComprimento = Math.max(5.0, Math.round((houseHMetros + rf + rfun) * 10) / 10);

            const inputLarg = document.getElementById('numTerrenoLargura');
            const inputComp = document.getElementById('numTerrenoComprimento');
            if (inputLarg) inputLarg.value = novaLargura;
            if (inputComp) inputComp.value = novoComprimento;

            atualizarPreviewTerreno();
            mostrarNotificacaoToast(`Dimensões enquadradas aos cômodos: ${novaLargura}m × ${novoComprimento}m`, 'sucesso');
        }


        // =====================================================================
        // CONTROLE DE ESPESSURA DE PAREDES (NORMAS TÉCNICAS NBR 15575 / 15270 / 16868)
        // =====================================================================
        let _espessuraSelecionadaTemp = 0.15;

        function abrirModalConfigParedes() {
            const modal = document.getElementById('modalConfigParedes');
            if (!modal) return;
            const espAtual = state.espessuraParede || 0.15;
            selecionarPresetEspessura(espAtual);
            const inputManual = document.getElementById('numEspessuraParedeManual');
            if (inputManual) inputManual.value = espAtual.toFixed(2);
            modal.classList.remove('hidden');
        }

        function fecharModalConfigParedes() {
            const modal = document.getElementById('modalConfigParedes');
            if (modal) modal.classList.add('hidden');
        }

        function selecionarPresetEspessura(valor) {
            _espessuraSelecionadaTemp = parseFloat(valor) || 0.15;
            document.querySelectorAll('.card-espessura').forEach(el => {
                el.classList.remove('border-sky-500', 'bg-sky-950/20');
                el.classList.add('border-slate-800', 'bg-slate-950/60');
            });
            const card = document.getElementById(`cardEsp_${_espessuraSelecionadaTemp.toFixed(2)}`);
            if (card) {
                card.classList.remove('border-slate-800', 'bg-slate-950/60');
                card.classList.add('border-sky-500', 'bg-sky-950/20');
            }
            const inputManual = document.getElementById('numEspessuraParedeManual');
            if (inputManual) inputManual.value = _espessuraSelecionadaTemp.toFixed(2);
        }

        function atualizarManualEspessura(valor) {
            const val = parseFloat(valor);
            if (!isNaN(val) && val >= 0.05 && val <= 0.60) {
                _espessuraSelecionadaTemp = val;
                document.querySelectorAll('.card-espessura').forEach(el => {
                    el.classList.remove('border-sky-500', 'bg-sky-950/20');
                    el.classList.add('border-slate-800', 'bg-slate-950/60');
                });
                const card = document.getElementById(`cardEsp_${_espessuraSelecionadaTemp.toFixed(2)}`);
                if (card) {
                    card.classList.remove('border-slate-800', 'bg-slate-950/60');
                    card.classList.add('border-sky-500', 'bg-sky-950/20');
                }
            }
        }

        function salvarConfigParedes() {
            const inputManual = document.getElementById('numEspessuraParedeManual');
            const valorFinal = inputManual ? (parseFloat(inputManual.value) || _espessuraSelecionadaTemp) : _espessuraSelecionadaTemp;
            state.espessuraParede = Math.max(0.05, Math.min(0.60, Math.round(valorFinal * 100) / 100));

            const chkAplicarTodos = document.getElementById('chkAplicarTodosComodos');
            if (chkAplicarTodos && chkAplicarTodos.checked) {
                (state.comodos || []).forEach(c => {
                    c.espessuraParede = state.espessuraParede;
                });
            }

            // Atualiza indicadores visuais da interface
            const txtEspCm = `${Math.round(state.espessuraParede * 100)} cm`;
            const lblToolbar = document.getElementById('lblEspessuraParedeCadToolbar');
            if (lblToolbar) lblToolbar.innerText = txtEspCm;
            const lblToolbarInst = document.getElementById('lblEspessuraParedeInstToolbar');
            if (lblToolbarInst) lblToolbarInst.innerText = txtEspCm;
            const lblComodoPreview = document.getElementById('lblEspessuraComodoPreview');
            if (lblComodoPreview) lblComodoPreview.innerText = `${txtEspCm} (Padrão)`;

            fecharModalConfigParedes();
            desenharCAD();
            desenharInstalacoes();
            reconstruirCena3D();
            salvarProjetoSilencioso();
            mostrarNotificacaoToast(`Espessura padrão NBR das paredes definida para ${txtEspCm}!`, 'sucesso');
        }

        function aplicarDimensoesComodo(w, h, nome) {
            const inW = document.getElementById('numLargura');
            const inH = document.getElementById('numComprimento');
            const inNome = document.getElementById('txtNome');
            if (inW) inW.value = w;
            if (inH) inH.value = h;
            if (inNome && (!inNome.value.trim() || inNome.value.startsWith('Novo') || inNome.value.startsWith('Ambiente'))) {
                inNome.value = nome;
            }
        }

        function atualizarPreviewEspessuraComodo(valor) {
            const lbl = document.getElementById('lblEspessuraComodoPreview');
            if (!lbl) return;
            if (valor === 'padrao') {
                lbl.innerText = `${Math.round((state.espessuraParede || 0.15) * 100)} cm (Padrão)`;
                lbl.className = 'text-[10px] text-emerald-400 font-mono font-bold';
            } else {
                const valM = parseFloat(valor) || 0.15;
                lbl.innerText = `${Math.round(valM * 100)} cm (Individual)`;
                lbl.className = 'text-[10px] text-sky-400 font-mono font-bold';
            }
        }

        // SUPORTE A TOQUE (TOUCH EVENTS) EM CANVASES 2D
        function vincularEventosTouchCanvas(canvasId, isInstalacoes = false) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            let lastTouchTime = 0;
            let pinchInitialDist = null;
            let lastTouchDist = null;
            let touchPanLastPos = null;

            canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    // PINCH-TO-ZOOM & PAN COM 2 DEDOS (MOBILE / TABLET)
                    e.preventDefault();
                    const t1 = e.touches[0];
                    const t2 = e.touches[1];
                    pinchInitialDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                    lastTouchDist = pinchInitialDist;
                    touchPanLastPos = {
                        x: (t1.clientX + t2.clientX) / 2,
                        y: (t1.clientY + t2.clientY) / 2
                    };
                    return;
                }
                if (e.touches.length === 1) {
                    const t = e.touches[0];
                    const rect = canvas.getBoundingClientRect();
                    const scaleX = larguraLogicaCanvas(canvas) / rect.width;
                    const scaleY = alturaLogicaCanvas(canvas) / rect.height;
                    const mx = (t.clientX - rect.left) * scaleX;
                    const my = (t.clientY - rect.top) * scaleY;

                    // Detecção de Duplo Toque no Mobile
                    const now = Date.now();
                    if (now - lastTouchTime < 320) {
                        // Trata como Double Click
                        const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);
                        for (let c of comodosAndar) {
                            const cw = c.largura * state.escala;
                            const ch = c.comprimento * state.escala;
                            if (mx >= c.x && mx <= c.x + cw && my >= c.y && my <= c.y + ch) {
                                e.preventDefault();
                                abrirModalAdicionarPontoRapido(c, mx, my);
                                return;
                            }
                        }
                    }
                    lastTouchTime = now;

                    // Dispara mousedown simulado
                    const simulatedEvent = new MouseEvent('mousedown', {
                        clientX: t.clientX,
                        clientY: t.clientY,
                        bubbles: true
                    });
                    canvas.dispatchEvent(simulatedEvent);
                    e.preventDefault();
                }
            }, { passive: false });

            canvas.addEventListener('touchmove', (e) => {
                if (e.touches.length === 2 && lastTouchDist && touchPanLastPos) {
                    // EXECUTA PINCH TO ZOOM & PAN PROPORCIONAL COM 2 DEDOS
                    e.preventDefault();
                    const t1 = e.touches[0];
                    const t2 = e.touches[1];
                    const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                    const currentMid = {
                        x: (t1.clientX + t2.clientX) / 2,
                        y: (t1.clientY + t2.clientY) / 2
                    };

                    const rect = canvas.getBoundingClientRect();
                    const scaleX = larguraLogicaCanvas(canvas) / rect.width;
                    const scaleY = alturaLogicaCanvas(canvas) / rect.height;
                    const midX = (currentMid.x - rect.left) * scaleX;
                    const midY = (currentMid.y - rect.top) * scaleY;

                    // 1. Zoom proporcional e matemático (idêntico aos botões + e -)
                    if (lastTouchDist > 10 && currentDist > 10) {
                        const fator = currentDist / lastTouchDist;
                        if (Math.abs(fator - 1.0) > 0.006) {
                            ajustarZoomCad(fator, midX, midY);
                            lastTouchDist = currentDist;
                        }
                    }

                    // 2. Pan com 2 dedos movendo toda a cena em conjunto (cômodos, lote, pontos, prumada, etc.)
                    const dx = (currentMid.x - touchPanLastPos.x) * scaleX;
                    const dy = (currentMid.y - touchPanLastPos.y) * scaleY;
                    if (Math.abs(dx) >= 0.8 || Math.abs(dy) >= 0.8) {
                        moverProjetoOffset(dx, dy);
                        touchPanLastPos = currentMid;
                        desenharCAD();
                        desenharInstalacoes();
                    }
                    return;
                }
                if (e.touches.length === 1) {
                    const t = e.touches[0];
                    const simulatedEvent = new MouseEvent('mousemove', {
                        clientX: t.clientX,
                        clientY: t.clientY,
                        bubbles: true
                    });
                    canvas.dispatchEvent(simulatedEvent);
                    e.preventDefault(); // Impede o scroll indesejado durante arraste
                }
            }, { passive: false });

            canvas.addEventListener('touchend', (e) => {
                pinchInitialDist = null;
                lastTouchDist = null;
                touchPanLastPos = null;
                const simulatedEvent = new MouseEvent('mouseup', { bubbles: true });
                canvas.dispatchEvent(simulatedEvent);
            }, { passive: false });
        }

        // =========================================================================
        // GESTÃO DE FIXAÇÃO DE CÔMODOS (SALVAR & TRAVAR POSIÇÕES)
        // =========================================================================
        function toggleFixarComodos(comodoId = null) {
            if (comodoId) {
                const c = (state.comodos || []).find(x => String(x.id) === String(comodoId));
                if (!c) return;
                c.fixado = !c.fixado;
                mostrarNotificacaoToast(c.fixado ? `🔒 Cômodo "${c.nome}" fixado na planta!` : `🔓 Cômodo "${c.nome}" destravado para edição.`, 'sucesso');
            } else {
                state.comodosFixados = !state.comodosFixados;
                (state.comodos || []).forEach(c => {
                    c.fixado = state.comodosFixados;
                });
                mostrarNotificacaoToast(state.comodosFixados ? '🔒 Todos os cômodos fixados e salvos com sucesso!' : '🔓 Cômodos liberados para movimentação e edição.', 'sucesso');
            }
            atualizarBotaoFixarComodos();
            renderListaComodosSidebar();
            desenharCAD();
            desenharInstalacoes();
            salvarProjetoSilencioso();
            salvarProjetoAtualNoLocalStorage();
        }

        function atualizarBotaoFixarComodos() {
            const btn = document.getElementById('btnFixarComodosToolbar');
            const icone = document.getElementById('iconeFixarComodosToolbar');
            const lbl = document.getElementById('lblFixarComodosToolbar');

            if (btn) {
                if (state.comodosFixados) {
                    btn.className = 'px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition active:scale-95';
                    if (icone) icone.className = 'fa-solid fa-lock text-amber-400';
                    if (lbl) lbl.textContent = 'Cômodos Fixados';
                    btn.title = 'Cômodos FIXADOS (bloqueados contra movimentação acidental). Clique para destravar.';
                } else {
                    btn.className = 'px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 flex items-center gap-1.5 transition active:scale-95 shadow-sm';
                    if (icone) icone.className = 'fa-solid fa-lock-open text-slate-400';
                    if (lbl) lbl.textContent = 'Fixar Cômodos';
                    btn.title = 'Fixar/Travar posição de todos os cômodos para evitar deslocamento acidental e salvar';
                }
            }
        }

        // FUNÇÃO CENTRAL DE TROCA DE ABAS (DESKTOP & MOBILE BOTTOM NAV)
        function trocarAba(tabTarget) {
            // Suporte retrocompatível a índices numéricos de 0 a 6
            const mapAbasIndice = ['planta', 'instalacoes', 'visualizacao3d', 'alimentador', 'materiais', 'arquivos', 'duvidas', 'automacao'];
            if (typeof tabTarget === 'number') {
                tabTarget = mapAbasIndice[tabTarget] || 'planta';
            }
            // Abas inexistentes (ex.: a antiga aba 'testes') voltam para a planta
            if (!document.getElementById('tab-' + tabTarget)) tabTarget = 'planta';
            document.body.dataset.aba = tabTarget;
            const btns = document.querySelectorAll('.tab-btn');
            btns.forEach(b => {
                // a aba inicial vem do HTML com bg-slate-950/font-bold/shadow-sm: limpa tudo
                const ativa = b.getAttribute('data-tab') === tabTarget;
                b.classList.toggle('border-amber-400', ativa);
                b.classList.toggle('text-amber-400', ativa);
                b.classList.toggle('bg-slate-950', ativa);
                b.classList.toggle('shadow-sm', ativa);
                b.classList.toggle('font-bold', ativa);
                b.classList.toggle('font-medium', !ativa);
                b.classList.toggle('border-transparent', !ativa);
                b.classList.toggle('text-slate-400', !ativa);
                b.classList.remove('bg-slate-900');
                b.setAttribute('aria-selected', ativa ? 'true' : 'false');
            });

            const btnsMobile = document.querySelectorAll('.tab-btn-mobile');
            btnsMobile.forEach(b => {
                if (b.getAttribute('data-tab') === tabTarget) {
                    b.classList.add('text-amber-400', 'border-t-2', 'border-amber-400', 'bg-slate-850');
                    b.classList.remove('text-slate-400', 'border-transparent');
                } else {
                    b.classList.remove('text-amber-400', 'border-t-2', 'border-amber-400', 'bg-slate-850');
                    b.classList.add('text-slate-400', 'border-transparent');
                }
            });

            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            const targetEl = document.getElementById('tab-' + tabTarget);
            if (targetEl) {
                targetEl.classList.add('active');
                // barras com rolagem lateral (celular) começam do início ao entrar na aba
                targetEl.querySelectorAll('.mob-trilho').forEach(t => {
                    t.scrollLeft = 0;
                    if (typeof atualizarIndicadoresRolagem === 'function') atualizarIndicadoresRolagem(t);
                });
            }

            state.abaAtiva = tabTarget;

            if (tabTarget === 'planta') desenharCAD();
            if (tabTarget === 'instalacoes') desenharInstalacoes();
            if (tabTarget === 'visualizacao3d') {
                if (!state.renderer3d || !state.scene3d) {
                    initThreeEngine();
                }
                setTimeout(() => {
                    onWindowResize3d();
                    if (state.cena3dDesatualizada || !state.meshGroup3d || state.meshGroup3d.children.length === 0) {
                        reconstruirCena3D(true);
                        resetarCamera3D();
                    }
                    iniciarLoop3D();
                    pedirRenderizacao3D(35);
                }, 60);
            } else {
                pausarLoop3D();
            }
            if (tabTarget === 'alimentador') renderizarQuadroDIN(state.circuitosCalculados);
            if (tabTarget === 'arquivos') {
                if (typeof carregarListaProjetosPastaServidor === 'function') carregarListaProjetosPastaServidor();
                if (typeof renderizarListaCheckpoints === 'function') renderizarListaCheckpoints();
                if (typeof atualizarCabecalhoAbaArquivos === 'function') atualizarCabecalhoAbaArquivos();
            }
            if (tabTarget === 'duvidas') renderizarMemorialAba6();
            if (tabTarget === 'automacao' && typeof renderizarAbaAutomacao === 'function') renderizarAbaAutomacao();

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function setupNavegacaoAbas() {
            // Vincula touch nos canvases
            vincularEventosTouchCanvas('cadCanvas', false);
            vincularEventosTouchCanvas('instalacoesCanvas', true);
    
            const btns = document.querySelectorAll('.tab-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tabTarget = btn.getAttribute('data-tab');
                    trocarAba(tabTarget);
                });
            });
        }

        // GESTÃO DE PAVIMENTOS (TÉRREO / SUPERIOR / NOVOS)
        function cancelarEdicao() {
            state.comodoEmEdicaoId = null;
            if (typeof limparCamposFormulario === 'function') limparCamposFormulario();
            if (typeof atualizarModoFormulario === 'function') atualizarModoFormulario(false);
        }

        // PRUMADA VERTICAL (SHAFT): liga/desliga a interligação vertical entre andares
        function alternarPrumada() {
            state.prumadaAtiva = (state.prumadaAtiva === false);
            atualizarIndicadoresPrumada();
            atualizarTudo();
            if (typeof reconstruirCena3D === 'function') reconstruirCena3D();
            mostrarNotificacaoToast(state.prumadaAtiva ? 'Prumada vertical ativada' : 'Prumada vertical desativada (andares com alimentação independente)', 'sucesso');
        }

        // Sugestão de proteção e bitola para um aparelho, calculada pela NBR 5410 com as
        // premissas do projeto (FCA/FCT) e trecho curto (a queda de tensão real depende da rota)
        function sugestaoProtecaoAparelho(pot, tensao, fases) {
            const tri = Number(fases) === 3;
            const rede = redeAtivaProjeto();
            const v = NBR5410.tensaoNaRede({ tipo: 'TUE', tensao: Number(tensao) || 220, fases }, rede);
            const c = NBR5410.dimensionarCircuito({ tipo: 'TUE', nome: '', tensao: v, ibVal: NBR5410.correnteDaCarga(pot, v, tri ? 3 : 1), rota: 10, ehManual: true, polos: NBR5410.polosDaCarga(v, fases, rede) }, obterParametrosNBR());
            return `Cabo ${c.cabo} • Disj. ${c.disjuntor}A${tri ? ' 3P' : ''}`;
        }

        function atualizarIndicadoresPrumada() {
            const ativa = state.prumadaAtiva !== false;
            const lbl = document.getElementById('lblStatusPrumada');
            const btn = document.getElementById('btnTogglePrumada');
            const lblMob = document.getElementById('lblStatusPrumadaMobile');
            const btnMob = document.getElementById('btnTogglePrumadaMobile');
            if (lbl) lbl.textContent = ativa ? 'Ativa' : 'Desativada';
            if (btn) btn.className = 'px-2 py-1 text-xs font-bold rounded-lg border flex items-center gap-1 ' +
                (ativa ? 'text-amber-300 bg-amber-950/60 border-amber-500/40 hover:text-amber-200' : 'text-slate-500 bg-slate-950 border-slate-800 line-through');
            if (lblMob) lblMob.textContent = ativa ? 'Ativa' : 'Desativada';
            if (btnMob) btnMob.className = 'text-[10px] px-2 py-1 rounded font-bold ' + (ativa ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400');
            const chk = document.getElementById('cfgPrumadaAtiva');
            if (chk) chk.checked = ativa;
        }

        function renderizarSeletorPavimentos() {
            atualizarIndicadoresPrumada();
            const container = document.getElementById('containerBotoesPavimentos');
            const containerMob = document.getElementById('containerBotoesPavimentosMobile');
            
            if (container) {
                container.innerHTML = '';
                state.pavimentos.forEach(pav => {
                    const isActive = (state.pavimentoAtivoId === pav.id);
                    const btn = document.createElement('button');
                    btn.className = `px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${isActive ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'}`;
                    btn.innerHTML = `<i class="fa-solid fa-building"></i> ${pav.nome}`;
                    btn.onclick = () => selecionarPavimento(pav.id);
                    container.appendChild(btn);
                });
            }

            if (containerMob) {
                containerMob.innerHTML = '';
                state.pavimentos.forEach(pav => {
                    const isActive = (state.pavimentoAtivoId === pav.id);
                    const btn = document.createElement('button');
                    btn.className = `px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${isActive ? 'bg-sky-500 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`;
                    btn.innerHTML = `<i class="fa-solid fa-building text-[10px]"></i> ${pav.nome.replace('Pavimento ', '')}`;
                    btn.onclick = () => selecionarPavimento(pav.id);
                    containerMob.appendChild(btn);
                });
            }

            const pavAtivo = obterPavimentoAtivo();
            const nomeAtivo = pavAtivo ? pavAtivo.nome.toUpperCase() : 'PAVIMENTO TÉRREO';
            
            const bCad = document.getElementById('badgeIndicadorPavimento');
            if (bCad) bCad.textContent = `🏢 ${nomeAtivo}`;

            const bInst = document.getElementById('badgeInstalacoesPavimento');
            if (bInst) bInst.textContent = nomeAtivo;

            const lblMob = document.getElementById('lblNomePavimentoMobile');
            if (lblMob && pavAtivo) lblMob.textContent = pavAtivo.nome.replace('Pavimento ', '');

            // Atualiza botões rápidos de Lajes do Andar Ativo
            if (pavAtivo) {
                const temPiso = (pavAtivo.temLajePiso !== false);
                const temTeto = (pavAtivo.temLajeTeto !== false);
                const tipoPassagem = pavAtivo.tipoPassagemCabos || state.tipoPassagemCabos || 'teto';

                const lblPiso = document.getElementById('lblStatusLajePisoAtivo');
                const btnPiso = document.getElementById('btnToggleLajePisoAtivo');
                if (lblPiso) {
                    lblPiso.textContent = temPiso ? 'SIM' : 'NÃO';
                    lblPiso.className = temPiso ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
                }
                if (btnPiso) {
                    btnPiso.className = temPiso ? 
                        'px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 bg-emerald-500/10 text-slate-200 border border-emerald-500/40' :
                        'px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 bg-slate-950 text-slate-500 border border-slate-800 line-through';
                }

                const lblTeto = document.getElementById('lblStatusLajeTetoAtivo');
                const btnTeto = document.getElementById('btnToggleLajeTetoAtivo');
                if (lblTeto) {
                    lblTeto.textContent = temTeto ? 'SIM' : 'NÃO';
                    lblTeto.className = temTeto ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
                }
                if (btnTeto) {
                    btnTeto.className = temTeto ? 
                        'px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 bg-sky-500/10 text-slate-200 border border-sky-500/40' :
                        'px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 bg-slate-950 text-slate-500 border border-slate-800 line-through';
                }

                // Atualiza botões de passagem do andar
                const btnPassTeto = document.getElementById('btnPassagemTeto');
                const btnPassChao = document.getElementById('btnPassagemChao');
                const badgeInfra = document.getElementById('badgeInfraUnica');

                if (tipoPassagem === 'teto') {
                    if (btnPassTeto) btnPassTeto.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition bg-sky-500 text-slate-950 shadow';
                    if (btnPassChao) btnPassChao.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white';
                } else {
                    if (btnPassTeto) btnPassTeto.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white';
                    if (btnPassChao) btnPassChao.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition bg-sky-500 text-slate-950 shadow';
                }

                const qtdChao = state.pavimentos.filter(p => (p.tipoPassagemCabos === 'chao' || (!p.tipoPassagemCabos && state.tipoPassagemCabos === 'chao'))).length;
                if (badgeInfra) {
                    if (qtdChao > 1 || (qtdChao >= 1 && state.pavimentos.length > 1)) {
                        badgeInfra.classList.remove('hidden');
                        badgeInfra.innerHTML = '⚡ Infra Compartilhada';
                    } else {
                        badgeInfra.classList.add('hidden');
                    }
                }
            }
        }

        function selecionarPavimento(pavId) {
            state.pavimentoAtivoId = pavId;
            const pavAtualObj = state.pavimentos.find(p => p.id === pavId);
            if (pavAtualObj) {
                const lblMob = document.getElementById('lblNomePavimentoMobile');
                if (lblMob) lblMob.textContent = pavAtualObj.nome.replace('Pavimento ', '');
            }
            cancelarEdicao();
            limparSelecaoPonto();
            renderizarSeletorPavimentos();
            detectarProximidadeComodos();
            atualizarTudo();
            reconstruirCena3D();
        }

        function abrirModalNovoPavimento() {
            const ehSegundo = (state.pavimentos.length === 1);
            document.getElementById('txtNomeNovoPavimento').value = ehSegundo ? '1º Pavimento (Superior)' : `Pavimento ${state.pavimentos.length + 1}`;
            document.getElementById('modalNovoPavimento').classList.remove('hidden');
        }

        function fecharModalNovoPavimento() {
            document.getElementById('modalNovoPavimento').classList.add('hidden');
        }

        function confirmarNovoPavimento() {
            const txtNome = document.getElementById('txtNomeNovoPavimento');
            const numPe = document.getElementById('numPeDireitoNovoPav');
            const chkCopiar = document.getElementById('chkCopiarParedesTerreo');
            const chkPiso = document.getElementById('chkNovoPavLajePiso');
            const chkTeto = document.getElementById('chkNovoPavLajeTeto');
            const selPassagem = document.getElementById('selNovoPavPassagem');

            const ehSegundo = (state.pavimentos.length === 1);
            const nomePadrao = ehSegundo ? '1º Pavimento (Superior)' : `Pavimento ${state.pavimentos.length + 1}`;
            const nome = (txtNome && txtNome.value.trim()) ? txtNome.value.trim() : nomePadrao;
            const peDireito = parseFloat(numPe.value) || 2.8;
            const novoId = ehSegundo ? 'superior' : ('pav_' + Date.now());

            state.pavimentos.push({
                id: novoId,
                nome,
                nivel: state.pavimentos.length,
                alturaPeDireito: peDireito,
                temLajePiso: chkPiso ? chkPiso.checked : true,
                tipoLajePiso: 'concreto',
                espessuraLajePiso: 0.20,
                temLajeTeto: chkTeto ? chkTeto.checked : true,
                tipoLajeTeto: 'concreto',
                espessuraLajeTeto: 0.15,
                tipoPassagemCabos: selPassagem ? selPassagem.value : 'teto'
            });

            // Se solicitado, copiar os cômodos do térreo para o novo andar
            if (chkCopiar && chkCopiar.checked) {
                const comodosTerreo = state.comodos.filter(c => c.pavimentoId === 'terreo');
                comodosTerreo.forEach(orig => {
                    const copia = JSON.parse(JSON.stringify(orig));
                    copia.id = Date.now() + Math.floor(Math.random() * 10000);
                    copia.pavimentoId = novoId;
                    copia.nome = `${orig.nome} (Superior)`;
                    state.comodos.push(copia);
                    gerarPontosEletricosParaComodo(copia);
                });
            }

            fecharModalNovoPavimento();
            selecionarPavimento(novoId);
        }

        function toggleGabaritoFantasma(ativo) {
            state.exibirGabaritoFantasma = ativo;
            desenharCAD();
            desenharInstalacoes();
        }

        function setupModoCalculo() {
            const btnCad = document.getElementById('btnModoCad');
            const btnMan = document.getElementById('btnModoManual');
            const pCad = document.getElementById('painelDimensionamentoCad');
            const pMan = document.getElementById('painelDimensionamentoManual');
            const badge = document.getElementById('badgeModoUtilizado');
            const lblOrigem = document.getElementById('lblOrigemMetragem');

            btnCad.addEventListener('click', () => {
                state.modoCalculo = 'cad';
                btnCad.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-amber-500 text-slate-950 shadow';
                btnMan.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white';
                pCad.classList.remove('hidden');
                pMan.classList.add('hidden');
                badge.innerText = 'MODO CAD AUTOMÁTICO';
                lblOrigem.innerText = 'Metragens calculadas via CAD / Prumadas';
                atualizarTudo();
            });

            btnMan.addEventListener('click', () => {
                state.modoCalculo = 'manual';
                btnMan.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-amber-500 text-slate-950 shadow';
                btnCad.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white';
                pMan.classList.remove('hidden');
                pCad.classList.add('hidden');
                badge.innerText = 'MODO INSERÇÃO MANUAL';
                lblOrigem.innerText = 'Valores digitados manualmente';
                atualizarTudo();
            });
        }

        function setupFerramentasCAD() {
            const btnSelect = document.getElementById('btnToolSelect');
            const btnDraw = document.getElementById('btnToolDraw');
            const btnClear = document.getElementById('btnClearFreehand');

            btnSelect.addEventListener('click', () => {
                state.ferramentaAtiva = 'select';
                btnSelect.className = 'px-3 py-1.5 rounded-lg font-bold text-[11px] bg-amber-500 text-slate-950 flex items-center gap-1';
                btnDraw.className = 'px-3 py-1.5 rounded-lg font-bold text-[11px] text-slate-400 hover:text-white flex items-center gap-1';
            });

            btnDraw.addEventListener('click', () => {
                state.ferramentaAtiva = 'draw';
                btnDraw.className = 'px-3 py-1.5 rounded-lg font-bold text-[11px] bg-amber-500 text-slate-950 flex items-center gap-1';
                btnSelect.className = 'px-3 py-1.5 rounded-lg font-bold text-[11px] text-slate-400 hover:text-white flex items-center gap-1';
            });

            btnClear.addEventListener('click', () => {
                // traços são listas de pontos (pavimento no 1º ponto); anotações são objetos.
                // Antes o filtro olhava l.pavimentoId nos traços e não removia nada.
                const doAndar = l => (Array.isArray(l) ? (l[0] && l[0].pavimentoId) : (l && l.pavimentoId)) === state.pavimentoAtivoId;
                const qtd = state.linhasMaoLivre.filter(doAndar).length;
                state.linhasMaoLivre = state.linhasMaoLivre.filter(l => !doAndar(l));
                desenharCAD();
                mostrarNotificacaoToast(qtd ? `${qtd} traço(s)/anotação(ões) removidos deste andar.` : 'Não há traços a mão livre neste andar.', qtd ? 'sucesso' : 'info');
            });
        }

        function setupFerramentasInstalacoes() {
            const btnMoverComodos = document.getElementById('btnToolMoverComodosInst');
            const btnMover = document.getElementById('btnToolMoverPontos');
            const btnCurvas = document.getElementById('btnToolCurvasEletroduto');
            const btnAddTug = document.getElementById('btnAdicionarTugRapida');
            const btnAddTue = document.getElementById('btnAdicionarTueRapida');
            const txtDica = document.getElementById('txtDicaInstalacoes');

            if (btnMoverComodos) {
                btnMoverComodos.addEventListener('click', () => {
                    state.ferramentaInstalacoes = 'mover_comodos';
                    btnMoverComodos.className = 'px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow';
                    btnMover.className = 'px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center gap-1.5';
                    btnCurvas.className = 'px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 flex items-center gap-1.5';
                    if (txtDica) txtDica.innerHTML = 'Clique e arraste os cômodos pelo corpo para mover, ou arraste o canto inferior direito para redimensionar!';
                    desenharInstalacoes();
                });
            }

            btnMover.addEventListener('click', () => {
                state.ferramentaInstalacoes = 'mover_pontos';
                if (btnMoverComodos) btnMoverComodos.className = 'px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center gap-1.5';
                btnMover.className = 'px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow';
                btnCurvas.className = 'px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 flex items-center gap-1.5';
                if (txtDica) txtDica.innerHTML = 'Clique e arraste as tomadas pelas paredes do andar selecionado!';
                desenharInstalacoes();
            });

            btnCurvas.addEventListener('click', () => {
                state.ferramentaInstalacoes = 'curvas_eletroduto';
                if (btnMoverComodos) btnMoverComodos.className = 'px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center gap-1.5';
                btnCurvas.className = 'px-3 py-1.5 rounded-xl font-bold text-xs bg-sky-500 text-slate-950 flex items-center gap-1.5 shadow';
                btnMover.className = 'px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center gap-1.5';
                if (txtDica) txtDica.innerHTML = 'Clique na linha tracejada do eletroduto para inserir uma curva e arraste a alça azul!';
                desenharInstalacoes();
            });

            btnAddTug.addEventListener('click', () => abrirModalPontoNovo('TUG'));
            btnAddTue.addEventListener('click', () => abrirModalPontoNovo('TUE'));
        }

        function resetarTodasCurvasEletrodutos() {
            state.eletrodutoWaypoints = {};
            desenharInstalacoes();
            reconstruirCena3D();
            atualizarTabelas();
        }

        function setupAlimentacaoExternaInputs() {
            const selSistema = document.getElementById('selSistemaEntrada');
            const numDist = document.getElementById('numDistAlimExterna');

            if (selSistema) {
                selSistema.addEventListener('change', () => {
                    state.alimentacaoExterna.sistema = selSistema.value;
                    atualizarTabelas();
                    desenharInstalacoes();
                    reconstruirCena3D();
                });
            }

            if (numDist) {
                numDist.addEventListener('input', () => {
                    const val = parseFloat(numDist.value);
                    const btnRest = document.getElementById('btnRestaurarDistAlim');
                    const lblOrigem = document.getElementById('lblOrigemAlimDist');

                    if (!isNaN(val) && val > 0) {
                        state.alimentacaoExterna.distanciaManual = val;
                        if (btnRest) btnRest.classList.remove('hidden');
                        if (lblOrigem) {
                            lblOrigem.textContent = 'MANUAL';
                            lblOrigem.className = 'text-[9px] text-amber-400 bg-amber-500/20 px-1 py-0.5 rounded font-mono font-bold';
                        }
                    } else {
                        state.alimentacaoExterna.distanciaManual = null;
                        if (btnRest) btnRest.classList.add('hidden');
                        if (lblOrigem) {
                            lblOrigem.textContent = 'CAD';
                            lblOrigem.className = 'text-[9px] text-emerald-400 bg-emerald-500/20 px-1 py-0.5 rounded font-mono';
                        }
                    }
                    atualizarTabelas();
                    desenharCAD();
                    desenharInstalacoes();
                });
            }
        }

        function restaurarDistanciaAlimCad() {
            state.alimentacaoExterna.distanciaManual = null;
            const numDist = document.getElementById('numDistAlimExterna');
            const btnRest = document.getElementById('btnRestaurarDistAlim');
            const lblOrigem = document.getElementById('lblOrigemAlimDist');

            if (numDist) numDist.value = '';
            if (btnRest) btnRest.classList.add('hidden');
            if (lblOrigem) {
                lblOrigem.textContent = 'CAD';
                lblOrigem.className = 'text-[9px] text-emerald-400 bg-emerald-500/20 px-1 py-0.5 rounded font-mono';
            }
            atualizarTabelas();
            desenharCAD();
            desenharInstalacoes();
        }

        function definirComprimentoManualCircuito(circNum, valor) {
            const val = parseFloat(valor);
            if (!isNaN(val) && val > 0) {
                state.comprimentosManuaisCircuitos[circNum] = val;
            } else {
                delete state.comprimentosManuaisCircuitos[circNum];
            }
            atualizarTabelas();
        }

        function restaurarComprimentoCadCircuito(circNum) {
            delete state.comprimentosManuaisCircuitos[circNum];
            atualizarTabelas();
        }

        function restaurarTodosComprimentosCad() {
            state.comprimentosManuaisCircuitos = {};
            atualizarTabelas();
        }

        // =========================================================================
        // MOTOR DE ENCAIXE MAGNÉTICO (ÍMÃ DE CÔMODOS) E ALINHAMENTO DE LAYOUT
        // =========================================================================
        function alternarSnapMagnetico() {
            state.snapMagnetico = !state.snapMagnetico;
            const lbl = document.getElementById('lblStatusSnapMagnetico');
            const btn = document.getElementById('btnToggleSnapMagnetico');
            if (lbl) lbl.textContent = state.snapMagnetico ? 'Ativo' : 'Desativado';
            if (btn) {
                btn.className = state.snapMagnetico
                    ? 'px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 flex items-center gap-1.5 transition active:scale-95'
                    : 'px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-slate-800 text-slate-400 border border-slate-700 hover:text-white flex items-center gap-1.5 transition active:scale-95';
            }
            if (typeof exibirToastAlerta === 'function') {
                exibirToastAlerta(state.snapMagnetico ? '🧲 Encaixe Magnético (Ímã) ATIVADO' : 'Ímã DESATIVADO (Movimento Livre)', 'sucesso');
            }
        }

        function alternarRotulosTransicoes(checked) {
            state.exibirRotulosTransicoesTexto = !!checked;
            desenharCAD();
            desenharInstalacoes();
        }

        function calcularEncaixeMagnetico(comodoAlvo, rawX, rawY, larguraM, comprimentoM, escala) {
            if (!state.snapMagnetico) {
                return {
                    x: Math.max(10, Math.round(rawX / 5) * 5),
                    y: Math.max(10, Math.round(rawY / 5) * 5),
                    guias: []
                };
            }

            const outros = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId && c.id !== comodoAlvo.id);
            if (outros.length === 0) {
                return {
                    x: Math.max(10, Math.round(rawX / 5) * 5),
                    y: Math.max(10, Math.round(rawY / 5) * 5),
                    guias: []
                };
            }

            const w = larguraM * escala;
            const h = comprimentoM * escala;
            const SNAP_DIST = 16; // Tolerância magnética em pixels para atração

            let bestX = Math.round(rawX / 5) * 5;
            let minDiffX = SNAP_DIST + 1;
            let guiaX = null;

            let bestY = Math.round(rawY / 5) * 5;
            let minDiffY = SNAP_DIST + 1;
            let guiaY = null;

            outros.forEach(o => {
                const ow = o.largura * escala;
                const oh = o.comprimento * escala;

                // Candidatos para o eixo X:
                // 1. Encostar parede esquerda do alvo na parede direita do vizinho (o.x + ow) -> UNIDOS
                // 2. Encostar parede direita do alvo na parede esquerda do vizinho (o.x - w) -> UNIDOS
                // 3. Alinhar parede esquerda do alvo com parede esquerda do vizinho (o.x) -> ALINHADOS
                // 4. Alinhar parede direita do alvo com parede direita do vizinho (o.x + ow - w) -> ALINHADOS
                const candX = [
                    { val: o.x + ow, tipo: 'colar_dir', snapLine: o.x + ow },
                    { val: o.x - w, tipo: 'colar_esq', snapLine: o.x },
                    { val: o.x, tipo: 'alinhar_esq', snapLine: o.x },
                    { val: o.x + ow - w, tipo: 'alinhar_dir', snapLine: o.x + ow }
                ];

                candX.forEach(cx => {
                    const diff = Math.abs(cx.val - rawX);
                    if (diff <= SNAP_DIST && diff < minDiffX) {
                        minDiffX = diff;
                        bestX = cx.val;
                        guiaX = {
                            x: cx.snapLine,
                            y1: Math.min(rawY, o.y) - 15,
                            y2: Math.max(rawY + h, o.y + oh) + 15
                        };
                    }
                });

                // Candidatos para o eixo Y:
                // 1. Encostar parede superior do alvo na parede inferior do vizinho (o.y + oh) -> UNIDOS
                // 2. Encostar parede inferior do alvo na parede superior do vizinho (o.y - h) -> UNIDOS
                // 3. Alinhar parede superior do alvo com parede superior do vizinho (o.y) -> ALINHADOS
                // 4. Alinhar parede inferior do alvo com parede inferior do vizinho (o.y + oh - h) -> ALINHADOS
                const candY = [
                    { val: o.y + oh, tipo: 'colar_abaixo', snapLine: o.y + oh },
                    { val: o.y - h, tipo: 'colar_acima', snapLine: o.y },
                    { val: o.y, tipo: 'alinhar_topo', snapLine: o.y },
                    { val: o.y + oh - h, tipo: 'alinhar_base', snapLine: o.y + oh }
                ];

                candY.forEach(cy => {
                    const diff = Math.abs(cy.val - rawY);
                    if (diff <= SNAP_DIST && diff < minDiffY) {
                        minDiffY = diff;
                        bestY = cy.val;
                        guiaY = {
                            y: cy.snapLine,
                            x1: Math.min(rawX, o.x) - 15,
                            x2: Math.max(rawX + w, o.x + ow) + 15
                        };
                    }
                });
            });

            const guias = [];
            if (guiaX) guias.push({ tipo: 'V', ...guiaX });
            if (guiaY) guias.push({ tipo: 'H', ...guiaY });

            return {
                x: Math.max(5, Math.round(bestX * 10) / 10),
                y: Math.max(5, Math.round(bestY * 10) / 10),
                guias
            };
        }

        function calcularEncaixeResizeMagnetico(comodoAlvo, rawW, rawH, escala) {
            if (!state.snapMagnetico) {
                return {
                    largura: Math.max(0.25, Math.round(rawW * 4) / 4),
                    comprimento: Math.max(0.25, Math.round(rawH * 4) / 4),
                    guias: []
                };
            }

            const outros = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId && c.id !== comodoAlvo.id);
            const SNAP_DIST = 16;
            const rightEdge = comodoAlvo.x + rawW * escala;
            const bottomEdge = comodoAlvo.y + rawH * escala;

            let bestRight = rightEdge;
            let minDiffX = SNAP_DIST + 1;
            let guiaX = null;

            let bestBottom = bottomEdge;
            let minDiffY = SNAP_DIST + 1;
            let guiaY = null;

            outros.forEach(o => {
                const ow = o.largura * escala;
                const oh = o.comprimento * escala;

                [o.x, o.x + ow].forEach(edgeX => {
                    const diff = Math.abs(edgeX - rightEdge);
                    if (diff <= SNAP_DIST && diff < minDiffX) {
                        minDiffX = diff;
                        bestRight = edgeX;
                        guiaX = {
                            x: edgeX,
                            y1: Math.min(comodoAlvo.y, o.y) - 15,
                            y2: Math.max(bottomEdge, o.y + oh) + 15
                        };
                    }
                });

                [o.y, o.y + oh].forEach(edgeY => {
                    const diff = Math.abs(edgeY - bottomEdge);
                    if (diff <= SNAP_DIST && diff < minDiffY) {
                        minDiffY = diff;
                        bestBottom = edgeY;
                        guiaY = {
                            y: edgeY,
                            x1: Math.min(comodoAlvo.x, o.x) - 15,
                            x2: Math.max(rightEdge, o.x + ow) + 15
                        };
                    }
                });
            });

            let novaLargura = (bestRight - comodoAlvo.x) / escala;
            let novoComprimento = (bestBottom - comodoAlvo.y) / escala;

            if (minDiffX > SNAP_DIST) {
                novaLargura = Math.round(rawW * 4) / 4;
            } else {
                novaLargura = Math.round(novaLargura * 100) / 100;
            }

            if (minDiffY > SNAP_DIST) {
                novoComprimento = Math.round(rawH * 4) / 4;
            } else {
                novoComprimento = Math.round(novoComprimento * 100) / 100;
            }

            novaLargura = Math.max(0.25, novaLargura);
            novoComprimento = Math.max(0.25, novoComprimento);

            const guias = [];
            if (guiaX) guias.push({ tipo: 'V', ...guiaX });
            if (guiaY) guias.push({ tipo: 'H', ...guiaY });

            return {
                largura: novaLargura,
                comprimento: novoComprimento,
                guias
            };
        }

        function desenharLinhasGuiaMagnetica(ctx) {
            if (!state.linhasGuiaMagnetica || state.linhasGuiaMagnetica.length === 0) return;

            ctx.save();
            state.linhasGuiaMagnetica.forEach(g => {
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 1.8;
                ctx.setLineDash([4, 3]);
                ctx.beginPath();
                if (g.tipo === 'V') {
                    ctx.moveTo(g.x, Math.max(0, g.y1));
                    ctx.lineTo(g.x, g.y2);
                    ctx.stroke();

                    ctx.fillStyle = '#34d399';
                    ctx.beginPath();
                    ctx.arc(g.x, (g.y1 + g.y2) / 2, 4.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                } else if (g.tipo === 'H') {
                    ctx.moveTo(Math.max(0, g.x1), g.y);
                    ctx.lineTo(g.x2, g.y);
                    ctx.stroke();

                    ctx.fillStyle = '#34d399';
                    ctx.beginPath();
                    ctx.arc((g.x1 + g.x2) / 2, g.y, 4.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                }
            });
            ctx.restore();
        }

        function autoUnirEAlinharComodos() {
            const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);
            if (comodosAndar.length < 2) {
                if (typeof exibirToastAlerta === 'function') {
                    exibirToastAlerta('Adicione pelo menos 2 cômodos no mesmo pavimento para unir e alinhar!', 'aviso');
                }
                return;
            }

            if (typeof salvarPontoRapido === 'function') {
                salvarPontoRapido('Antes de Unir e Alinhar Cômodos');
            }

            let alteracoes = 0;
            const TOL_UNIR = 28; // tolerância para unir paredes paralelas próximas
            const TOL_ALINHAR = 18; // tolerância para alinhar bordas colineares

            for (let pass = 0; pass < 3; pass++) {
                for (let i = 0; i < comodosAndar.length; i++) {
                    for (let j = 0; j < comodosAndar.length; j++) {
                        if (i === j) continue;
                        const A = comodosAndar[i];
                        const B = comodosAndar[j];
                        const Aw = A.largura * state.escala;
                        const Ah = A.comprimento * state.escala;
                        const Bw = B.largura * state.escala;
                        const Bh = B.comprimento * state.escala;

                        // 1. Unir horizontalmente: B à direita de A
                        const overY = Math.min(A.y + Ah, B.y + Bh) - Math.max(A.y, B.y);
                        if (overY > 15) {
                            const gapDir = Math.abs(B.x - (A.x + Aw));
                            if (gapDir > 0.05 && gapDir <= TOL_UNIR) {
                                const diffX = (A.x + Aw) - B.x;
                                B.x += diffX;
                                state.pontosEletricos.filter(p => p.comodoId === B.id).forEach(p => p.x += diffX);
                                alteracoes++;
                            }
                        }

                        // 2. Unir verticalmente: B abaixo de A
                        const overX = Math.min(A.x + Aw, B.x + Bw) - Math.max(A.x, B.x);
                        if (overX > 15) {
                            const gapBaixo = Math.abs(B.y - (A.y + Ah));
                            if (gapBaixo > 0.05 && gapBaixo <= TOL_UNIR) {
                                const diffY = (A.y + Ah) - B.y;
                                B.y += diffY;
                                state.pontosEletricos.filter(p => p.comodoId === B.id).forEach(p => p.y += diffY);
                                alteracoes++;
                            }
                        }

                        // 3. Alinhar topos colineares (A.y com B.y)
                        const diffTopo = Math.abs(B.y - A.y);
                        if (diffTopo > 0.05 && diffTopo <= TOL_ALINHAR) {
                            if (Math.abs(B.x - (A.x + Aw)) <= 5 || Math.abs(A.x - (B.x + Bw)) <= 5) {
                                const diffY = A.y - B.y;
                                B.y += diffY;
                                state.pontosEletricos.filter(p => p.comodoId === B.id).forEach(p => p.y += diffY);
                                alteracoes++;
                            }
                        }

                        // 4. Alinhar laterais esquerdas colineares (A.x com B.x)
                        const diffEsq = Math.abs(B.x - A.x);
                        if (diffEsq > 0.05 && diffEsq <= TOL_ALINHAR) {
                            if (Math.abs(B.y - (A.y + Ah)) <= 5 || Math.abs(A.y - (B.y + Bh)) <= 5) {
                                const diffX = A.x - B.x;
                                B.x += diffX;
                                state.pontosEletricos.filter(p => p.comodoId === B.id).forEach(p => p.x += diffX);
                                alteracoes++;
                            }
                        }

                        // 5. Alinhar bases inferiores colineares (A.y + Ah com B.y + Bh)
                        const diffBase = Math.abs((B.y + Bh) - (A.y + Ah));
                        if (diffBase > 0.05 && diffBase <= TOL_ALINHAR) {
                            if (Math.abs(B.x - (A.x + Aw)) <= 5 || Math.abs(A.x - (B.x + Bw)) <= 5) {
                                const diffY = (A.y + Ah) - (B.y + Bh);
                                B.y += diffY;
                                state.pontosEletricos.filter(p => p.comodoId === B.id).forEach(p => p.y += diffY);
                                alteracoes++;
                            }
                        }

                        // 6. Alinhar laterais direitas colineares (A.x + Aw com B.x + Bw)
                        const diffDir = Math.abs((B.x + Bw) - (A.x + Aw));
                        if (diffDir > 0.05 && diffDir <= TOL_ALINHAR) {
                            if (Math.abs(B.y - (A.y + Ah)) <= 5 || Math.abs(A.y - (B.y + Bh)) <= 5) {
                                const diffX = (A.x + Aw) - (B.x + Bw);
                                B.x += diffX;
                                state.pontosEletricos.filter(p => p.comodoId === B.id).forEach(p => p.x += diffX);
                                alteracoes++;
                            }
                        }
                    }
                }
            }

            detectarProximidadeComodos();
            desenharCAD();
            desenharInstalacoes();
            atualizarTabelas();
            reconstruirCena3D();

            if (typeof exibirToastAlerta === 'function') {
                if (alteracoes > 0) {
                    exibirToastAlerta(`🧲 ${alteracoes} ajustes realizados! Cômodos perfeitamente unidos e alinhados como ímã.`, 'sucesso');
                } else {
                    exibirToastAlerta('Os cômodos já estão perfeitamente unidos e alinhados!', 'sucesso');
                }
            }
        }

        // DETECÇÃO DE TRANSIÇÕES ENTRE CÔMODOS
        function detectarProximidadeComodos() {
            const novasTransicoes = [];
            // Limites em METROS (antes 22 px / 25 px: dependiam do zoom e, no zoom menor
            // do celular, paredes comuns de 1 m deixavam de gerar porta)
            const E = state.escala || 40;
            const tol = 0.5 * E;                 // folga entre as faces das paredes
            const sobreposicaoMin = 0.7 * E;     // parede em comum suficiente para uma porta
            const comodosAtivos = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);

            for (let i = 0; i < comodosAtivos.length; i++) {
                for (let j = i + 1; j < comodosAtivos.length; j++) {
                    const A = comodosAtivos[i];
                    const B = comodosAtivos[j];

                    const Aw = A.largura * state.escala;
                    const Ah = A.comprimento * state.escala;
                    const Bw = B.largura * state.escala;
                    const Bh = B.comprimento * state.escala;

                    let adjacente = false;
                    let orientacao = 'H';
                    let posX = 0, posY = 0;

                    const overY = Math.min(A.y + Ah, B.y + Bh) - Math.max(A.y, B.y);
                    if (overY >= sobreposicaoMin) {
                        const distDir = Math.abs(B.x - (A.x + Aw));
                        const distEsq = Math.abs(A.x - (B.x + Bw));
                        if (distDir <= tol) {
                            adjacente = true;
                            orientacao = 'V';
                            posX = (A.x + Aw + B.x) / 2;
                            posY = (Math.max(A.y, B.y) + Math.min(A.y + Ah, B.y + Bh)) / 2;
                        } else if (distEsq <= tol) {
                            adjacente = true;
                            orientacao = 'V';
                            posX = (B.x + Bw + A.x) / 2;
                            posY = (Math.max(A.y, B.y) + Math.min(A.y + Ah, B.y + Bh)) / 2;
                        }
                    }

                    if (!adjacente) {
                        const overX = Math.min(A.x + Aw, B.x + Bw) - Math.max(A.x, B.x);
                        if (overX >= sobreposicaoMin) {
                            const distAbaixo = Math.abs(B.y - (A.y + Ah));
                            const distAcima = Math.abs(A.y - (B.y + Bh));
                            if (distAbaixo <= tol) {
                                adjacente = true;
                                orientacao = 'H';
                                posX = (Math.max(A.x, B.x) + Math.min(A.x + Aw, B.x + Bw)) / 2;
                                posY = (A.y + Ah + B.y) / 2;
                            } else if (distAcima <= tol) {
                                adjacente = true;
                                orientacao = 'H';
                                posX = (Math.max(A.x, B.x) + Math.min(A.x + Aw, B.x + Bw)) / 2;
                                posY = (B.y + Bh + A.y) / 2;
                            }
                        }
                    }

                    if (adjacente) {
                        const key = `${Math.min(A.id, B.id)}_${Math.max(A.id, B.id)}`;
                        const transExistente = state.transicoes.find(t => t.key === key);
                        const tipo = transExistente ? transExistente.tipo : 'porta';

                        novasTransicoes.push({
                            key,
                            pavimentoId: state.pavimentoAtivoId,
                            comodoAId: A.id,
                            comodoBId: B.id,
                            nomeA: A.nome,
                            nomeB: B.nome,
                            tipo,
                            x: posX,
                            y: posY,
                            orientacao
                        });
                    }
                }
            }

            // mantém as transições dos outros andares (antes eram descartadas)
            state.transicoes = (state.transicoes || []).filter(t => t.pavimentoId !== state.pavimentoAtivoId).concat(novasTransicoes);
            renderizarBarraTransicoes();
        }

        function abrirModalTransicao(key, nomeA, nomeB) {
            state.transicaoAtiva = { key, nomeA, nomeB };
            const modal = document.getElementById('modalTransicao');
            const desc = document.getElementById('txtDescricaoTransicao');
            if (desc) desc.textContent = `Cômodos próximos detectados: "${nomeA}" ↔ "${nomeB}". Defina se a ligação é uma Porta, Corredor ou Vão Livre:`;
            if (modal) modal.classList.remove('hidden');
        }

        function fecharModalTransicao() {
            const modal = document.getElementById('modalTransicao');
            if (modal) modal.classList.add('hidden');
            state.transicaoAtiva = null;
        }

        function definirTipoTransicaoAtiva(tipoEscolhido) {
            if (!state.transicaoAtiva) return;
            const t = state.transicoes.find(item => item.key === state.transicaoAtiva.key);
            if (t) t.tipo = tipoEscolhido;
            fecharModalTransicao();
            renderizarBarraTransicoes();
            desenharCAD();
            desenharInstalacoes();
            reconstruirCena3D();
        }

        function alterarTipoTransicao(key, novoTipo) {
            const t = state.transicoes.find(item => item.key === key);
            if (t) {
                t.tipo = novoTipo;
                renderizarBarraTransicoes();
                desenharCAD();
                desenharInstalacoes();
                reconstruirCena3D();
            }
        }

        function renderizarBarraTransicoes() {
            const container = document.getElementById('listaBotoesTransicoes');
            const resumo = document.getElementById('lblResumoTransicoes');
            if (!container) return;
            container.innerHTML = '';

            const transDoAndar = state.transicoes.filter(t => t.pavimentoId === state.pavimentoAtivoId);

            if (transDoAndar.length === 0) {
                if (resumo) resumo.textContent = 'Aproxime cômodos no mesmo andar para conectar com Portas ou Vãos!';
                return;
            }

            if (resumo) resumo.textContent = `${transDoAndar.length} conexões entre cômodos detectadas:`;

            transDoAndar.forEach(t => {
                const div = document.createElement('div');
                div.className = 'flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px]';
                div.innerHTML = `
                    <span class="text-slate-300 font-bold truncate max-w-[130px]" title="${t.nomeA} ↔ ${t.nomeB}">${t.nomeA} ↔ ${t.nomeB}:</span>
                    <select onchange="alterarTipoTransicao('${t.key}', this.value)" class="bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded px-1.5 py-0.5 text-[10px] outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer">
                        <option value="porta" ${t.tipo === 'porta' ? 'selected' : ''}>🚪 Porta</option>
                        <option value="corredor" ${t.tipo === 'corredor' ? 'selected' : ''}>🚶 Corredor</option>
                        <option value="vao_livre" ${t.tipo === 'vao_livre' ? 'selected' : ''}>🔲 Vão Livre</option>
                        <option value="escada" ${t.tipo === 'escada' ? 'selected' : ''}>🪜 Escada</option>
                        <option value="parede" ${t.tipo === 'parede' ? 'selected' : ''}>🧱 Parede (Alvenaria)</option>
                    </select>
                `;
                container.appendChild(div);
            });
        }

        function setupSugestoesBR() {
            const sel = document.getElementById('selSugestaoBR');
            if (!sel) return;

            const grupos = {};
            SUGESTOES_CARGAS_BR.forEach((item, index) => {
                if (!itemCatalogoVisivelNaRede(item)) return;
                if (!grupos[item.grupo]) grupos[item.grupo] = [];
                grupos[item.grupo].push({ ...itemCatalogoNaRede(item), index });
            });

            sel.innerHTML = '<option value="">-- Escolha um equipamento sugerido --</option>';
            for (const [nomeGrupo, itens] of Object.entries(grupos)) {
                const optGroup = document.createElement('optgroup');
                optGroup.label = nomeGrupo;
                itens.forEach(it => {
                    const opt = document.createElement('option');
                    opt.value = it.index;
                    opt.textContent = `${it.nome} (${it.pot}W - ${rotuloTensao(it)} - ${it.tipo})`;
                    optGroup.appendChild(opt);
                });
                sel.appendChild(optGroup);
            }

            if (sel.dataset.ligado) return;        // recriado na troca da rede: o evento já está ligado
            sel.dataset.ligado = '1';
            sel.addEventListener('change', () => {
                const val = sel.value;
                if (val === '') return;
                const item = itemCatalogoNaRede(SUGESTOES_CARGAS_BR[parseInt(val, 10)]);
                if (!item) return;

                document.getElementById('txtCargaNome').value = item.nome;
                document.getElementById('selCargaTipo').value = item.tipo;
                document.getElementById('numCargaPot').value = item.pot;
                document.getElementById('selCargaTensao').value = valorTensaoSelect(item.tipo, item.tensao, item.fases);
            });
        }

        function setupSubFormCargas() {
            const btnAddCarga = document.getElementById('btnAdicionarCarga');
            if (!btnAddCarga) return;

            btnAddCarga.addEventListener('click', () => {
                const txtNome = document.getElementById('txtCargaNome');
                const selTipo = document.getElementById('selCargaTipo');
                const numPot = document.getElementById('numCargaPot');
                const selTensao = document.getElementById('selCargaTensao');

                const nome = txtNome.value.trim();
                const tipo = selTipo.value;
                const pot = parseFloat(numPot.value);
                const { tensao, fases } = lerTensaoSelect(selTensao.value);      // trifásico 3F+N: "220-3F" / "380-3F"

                if (!nome) {
                    alert('Por favor, informe o nome do equipamento.');
                    txtNome.focus();
                    return;
                }
                if (!pot || pot <= 0) {
                    alert('Por favor, informe a potência nominal em Watts (W).');
                    numPot.focus();
                    return;
                }

                state.cargasFormulario.push({
                    id: 'cg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                    nome,
                    tipo,
                    potencia: pot,
                    tensao,
                    ...(fases ? { fases } : {}),
                    altura: tipo === 'TUE' ? 'alta' : 'media'
                });

                txtNome.value = '';
                numPot.value = '';
                document.getElementById('selSugestaoBR').value = '';
                renderizarCargasFormulario();
            });
        }

        function renderizarCargasFormulario() {
            const cont = document.getElementById('listaCargasComodo');
            if (!cont) return;
            cont.innerHTML = '';

            if (!state.cargasFormulario || state.cargasFormulario.length === 0) {
                cont.innerHTML = '<p class="text-[11px] text-slate-500 italic py-1 text-center bg-slate-950/40 rounded-lg border border-dashed border-slate-800">Nenhuma carga individual adicionada.</p>';
                return;
            }

            state.cargasFormulario.forEach(cg => {
                const isTue = cg.tipo === 'TUE';
                const el = document.createElement('div');
                el.className = 'flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] gap-2 hover:border-slate-700 transition';
                el.innerHTML = `
                    <div class="flex items-center gap-1.5 overflow-hidden min-w-0">
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${isTue ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}">${cg.tipo}</span>
                        <span class="text-slate-200 truncate font-medium" title="${cg.nome}">${cg.nome}</span>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="font-mono text-amber-300 font-bold">${cg.potencia}W</span>
                        <span class="text-[9px] text-slate-400 font-mono">${rotuloTensao(cg)}</span>
                        <button type="button" onclick="removerCargaDoFormulario('${cg.id}')" class="text-slate-500 hover:text-red-400 p-0.5 transition" title="Remover esta carga">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                `;
                cont.appendChild(el);
            });
        }

        function removerCargaDoFormulario(cargaId) {
            state.cargasFormulario = state.cargasFormulario.filter(cg => cg.id !== cargaId);
            renderizarCargasFormulario();
        }

        // ATUALIZAR MODO DO FORMULÁRIO (INSERIR VS EDITAR CÔMODO)
        function atualizarModoFormulario(isEdicao) {
            const titulo = document.getElementById('tituloModalComodo');
            const badge = document.getElementById('badgeModalEdicao');
            const btnSubmit = document.getElementById('btnSubmitComodo');
            const pCad = document.getElementById('painelDimensionamentoCad');
            const pMan = document.getElementById('painelDimensionamentoManual');

            if (isEdicao) {
                if (titulo) {
                    const spans = titulo.getElementsByTagName('span');
                    if (spans.length > 0) spans[0].textContent = 'Editar Cômodo';
                }
                if (badge) badge.classList.remove('hidden');
                if (btnSubmit) btnSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Alterações';
            } else {
                if (titulo) {
                    const spans = titulo.getElementsByTagName('span');
                    if (spans.length > 0) spans[0].textContent = 'Inserir Cômodo';
                }
                if (badge) badge.classList.add('hidden');
                if (btnSubmit) btnSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Cômodo';
            }

            if (state.modoCalculo === 'manual') {
                if (pCad) pCad.classList.add('hidden');
                if (pMan) pMan.classList.remove('hidden');
            } else {
                if (pCad) pCad.classList.remove('hidden');
                if (pMan) pMan.classList.add('hidden');
            }
        }

        // INICIAR EDIÇÃO DE CÔMODO
        function iniciarEdicaoComodo(id) {
            const c = (state.comodos || []).find(cmd => String(cmd.id) === String(id));
            if (!c) return;
            state.comodoEmEdicaoId = c.id;

            document.getElementById('txtNome').value = c.nome;
            document.getElementById('selTipo').value = c.tipo;
            document.getElementById('numLargura').value = c.largura;
            document.getElementById('numComprimento').value = c.comprimento;
            document.getElementById('numAreaManual').value = c.area.toFixed(1);
            document.getElementById('numPerimManual').value = c.perimetro.toFixed(1);

            const selPass = document.getElementById('selPassagemTomadasComodo');
            if (selPass) selPass.value = c.passagemTomadas || 'horizontal';

            const selEsp = document.getElementById('selEspessuraParedeComodo');
            if (selEsp) {
                selEsp.value = c.espessuraParede ? String(c.espessuraParede) : 'padrao';
                atualizarPreviewEspessuraComodo(selEsp.value);
            }

            const selPav = document.getElementById('selComodoPavimento');
            if (selPav) {
                selPav.innerHTML = '';
                state.pavimentos.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.nome;
                    if (String(p.id) === String(c.pavimentoId)) opt.selected = true;
                    selPav.appendChild(opt);
                });
            }

            state.cargasFormulario = c.cargas ? JSON.parse(JSON.stringify(c.cargas)) : [];
            renderizarCargasFormulario();

            atualizarModoFormulario(true);
            const btnExc = document.getElementById('btnExcluirComodoModal');
            if (btnExc) btnExc.classList.remove('hidden');

            const modal = document.getElementById('modalComodo');
            if (modal) modal.classList.remove('hidden');
        }

        function abrirModalNovoComodo() {
            state.comodoEmEdicaoId = null;
            limparCamposFormulario();
            state.cargasFormulario = [];
            renderizarCargasFormulario();

            const selPass = document.getElementById('selPassagemTomadasComodo');
            if (selPass) selPass.value = 'horizontal';

            const selEsp = document.getElementById('selEspessuraParedeComodo');
            if (selEsp) {
                selEsp.value = 'padrao';
                atualizarPreviewEspessuraComodo('padrao');
            }

            // Popula seletor de pavimentos no modal
            const selPav = document.getElementById('selComodoPavimento');
            if (selPav) {
                selPav.innerHTML = '';
                state.pavimentos.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.nome;
                    if (String(p.id) === String(state.pavimentoAtivoId)) opt.selected = true;
                    selPav.appendChild(opt);
                });
            }

            atualizarModoFormulario(false);
            const btnExc = document.getElementById('btnExcluirComodoModal');
            if (btnExc) btnExc.classList.add('hidden');

            const modal = document.getElementById('modalComodo');
            if (modal) modal.classList.remove('hidden');
        }

        function fecharModalComodo() {
            const modal = document.getElementById('modalComodo');
            if (modal) modal.classList.add('hidden');
            const btnExc = document.getElementById('btnExcluirComodoModal');
            if (btnExc) btnExc.classList.add('hidden');
            state.comodoEmEdicaoId = null;
            limparCamposFormulario();
            state.cargasFormulario = [];
            renderizarCargasFormulario();
            renderListaComodosSidebar();
        }

        function excluirComodoEmEdicao() {
            if (state.comodoEmEdicaoId !== null) {
                const idParaRemover = state.comodoEmEdicaoId;
                fecharModalComodo();
                removerComodoId(idParaRemover);
            }
        }

        function excluirComodoAlvoRapido() {
            const c = _pontoRapidoAlvo.comodo;
            if (c) {
                fecharModalAdicionarPontoRapido();
                removerComodoId(c.id);
            }
        }

        // =====================================================================
        // MENU DE CONTEXTO RÁPIDO DO CÔMODO (BOTÃO DIREITO DO MOUSE)
        // =====================================================================
        let _comodoContextoAlvo = null;

        function abrirMenuContextoComodo(comodo, clientX, clientY) {
            if (!comodo) return;
            _comodoContextoAlvo = comodo;
            state.comodoEmEdicaoId = comodo.id;
            desenharCAD();
            desenharInstalacoes();
            renderListaComodosSidebar();

            const menu = document.getElementById('menuContextoComodo');
            if (!menu) return;

            const lblNome = document.getElementById('menuContextoNomeComodo');
            if (lblNome) lblNome.textContent = comodo.nome;

            const badgeLock = document.getElementById('menuContextoLockBadge');
            const iconeLock = document.getElementById('menuContextoIconeLock');
            const txtLock = document.getElementById('menuContextoTextoLock');
            const estaFixado = !!(comodo.fixado || state.comodosFixados);

            if (badgeLock) badgeLock.innerHTML = estaFixado ? '<i class="fa-solid fa-lock" title="Travado"></i>' : '';
            if (iconeLock) iconeLock.className = estaFixado ? 'fa-solid fa-lock-open w-4 text-slate-400' : 'fa-solid fa-lock w-4 text-amber-400';
            if (txtLock) txtLock.textContent = estaFixado ? 'Destravar Posição' : 'Travar Posição';

            menu.classList.remove('hidden');
            const menuW = 220;
            const menuH = 190;
            let posX = clientX;
            let posY = clientY;
            if (posX + menuW > window.innerWidth) posX = window.innerWidth - menuW - 10;
            if (posY + menuH > window.innerHeight) posY = window.innerHeight - menuH - 10;
            menu.style.left = posX + 'px';
            menu.style.top = posY + 'px';
        }

        function fecharMenuContextoComodo() {
            const menu = document.getElementById('menuContextoComodo');
            if (menu) menu.classList.add('hidden');
            _comodoContextoAlvo = null;
        }

        function menuContextoAcaoExcluir() {
            if (_comodoContextoAlvo) {
                const id = _comodoContextoAlvo.id;
                fecharMenuContextoComodo();
                removerComodoId(id);
            }
        }

        function menuContextoAcaoEditar() {
            if (_comodoContextoAlvo) {
                const id = _comodoContextoAlvo.id;
                fecharMenuContextoComodo();
                iniciarEdicaoComodo(id);
            }
        }

        function menuContextoAcaoFixar() {
            if (_comodoContextoAlvo) {
                const id = _comodoContextoAlvo.id;
                fecharMenuContextoComodo();
                toggleFixarComodos(id);
            }
        }

        function menuContextoAcaoNBR() {
            if (_comodoContextoAlvo) {
                const id = _comodoContextoAlvo.id;
                fecharMenuContextoComodo();
                autoLancarPontosNBR5410(id);
            }
        }

        window.addEventListener('click', (e) => {
            const menu = document.getElementById('menuContextoComodo');
            if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target)) {
                fecharMenuContextoComodo();
            }
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') fecharMenuContextoComodo();
        });

        
        // =====================================================================
        // POP-UP DE INSERÇÃO RÁPIDA NO DUPLO CLIQUE (TUG, TUE, LUZ, RETORNO)
        // =====================================================================
        let _pontoRapidoAlvo = { comodo: null, x: 0, y: 0 };

        function abrirModalAdicionarPontoRapido(comodo, clickX, clickY) {
            _pontoRapidoAlvo = { comodo, x: clickX, y: clickY };
            const badge = document.getElementById('badgeComodoAlvoRapido');
            if (badge) badge.textContent = comodo.nome;
            const modal = document.getElementById('modalAdicionarPontoRapido');
            if (modal) modal.classList.remove('hidden');
        }

        function fecharModalAdicionarPontoRapido() {
            const modal = document.getElementById('modalAdicionarPontoRapido');
            if (modal) modal.classList.add('hidden');
            _pontoRapidoAlvo = { comodo: null, x: 0, y: 0 };
        }

        function editarComodoAlvoRapido() {
            const c = _pontoRapidoAlvo.comodo;
            fecharModalAdicionarPontoRapido();
            if (c) iniciarEdicaoComodo(c.id);
        }

        function inserirPontoRapido(tipo, pot, tensao, altura, nomeExtra, fases) {
            const c = _pontoRapidoAlvo.comodo;
            if (!c) return;

            const novoPonto = {
                id: 'pt_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
                comodoId: c.id,
                pavimentoId: c.pavimentoId || state.pavimentoAtivoId,
                tipo: tipo,
                nome: nomeExtra || `${tipo} ${c.nome}`,
                pot: pot,
                tensao: tensao,
                ...(Number(fases) === 3 ? { fases: 3 } : {}),
                altura: altura,
                x: _pontoRapidoAlvo.x,
                y: _pontoRapidoAlvo.y
            };

            state.pontosEletricos.push(novoPonto);
            fecharModalAdicionarPontoRapido();

            // Atualiza renders
            atualizarTudo();
            desenharCAD();
            desenharInstalacoes();
            reconstruirCena3D();

            console.log("Ponto inserido com sucesso via duplo clique:", novoPonto);
        }

        function inserirEscadaRapida(direcao = 'H_DIR') {
            const c = _pontoRapidoAlvo.comodo;
            if (!c) return;

            if (!state.escadas) state.escadas = [];

            // Garante que exista o 1º Pavimento (Superior) no projeto para interligar!
            if (state.pavimentos.length < 2) {
                state.pavimentos.push({
                    id: 'superior',
                    nome: '1º Pavimento (Superior)',
                    nivel: 1,
                    alturaPeDireito: 2.8,
                    temLajePiso: true,
                    tipoLajePiso: 'concreto',
                    espessuraLajePiso: 0.20,
                    temLajeTeto: true,
                    tipoLajeTeto: 'concreto',
                    espessuraLajeTeto: 0.15,
                    tipoPassagemCabos: 'teto'
                });
                renderizarSeletorPavimentos();
            }

            const larguraMetros = 0.95; // Largura do lance de escada regulamentar (95cm)
            const comprimentoMetros = 2.60; // Comprimento em projeção horizontal (~16 degraus)
            const escala = state.escala || 35.0;

            let orientacao = 'H';
            let wPx = comprimentoMetros * escala;
            let hPx = larguraMetros * escala;

            if (direcao.startsWith('V_')) {
                orientacao = 'V';
                wPx = larguraMetros * escala;
                hPx = comprimentoMetros * escala;
            }

            // Centraliza no ponto do clique contido dentro do cômodo
            const cw = c.largura * escala;
            const ch = c.comprimento * escala;
            let x = _pontoRapidoAlvo.x - wPx / 2;
            let y = _pontoRapidoAlvo.y - hPx / 2;

            x = Math.max(c.x + 4, Math.min(c.x + cw - wPx - 4, x));
            y = Math.max(c.y + 4, Math.min(c.y + ch - hPx - 4, y));

            const novaEscada = {
                id: 'escada_' + Date.now(),
                comodoId: c.id,
                comodoNome: c.nome,
                pavimentoOrigemId: c.pavimentoId || state.pavimentoAtivoId || 'terreo',
                pavimentoDestinoId: 'superior',
                x: x,
                y: y,
                largura: larguraMetros,
                comprimento: comprimentoMetros,
                direcao: direcao, // 'H_DIR', 'H_ESQ', 'V_CIMA', 'V_BAIXO'
                orientacao: orientacao,
                numDegraus: 16
            };

            state.escadas.push(novaEscada);
            fecharModalAdicionarPontoRapido();

            mostrarNotificacaoToast(`Escada adicionada em "${c.nome}" unindo ao 1º Pavimento!`, 'sucesso');

            atualizarTudo();
            reconstruirCena3D();
        }

        function removerEscadaId(escadaId) {
            if (!state.escadas) return;
            state.escadas = state.escadas.filter(e => e.id !== escadaId);
            atualizarTudo();
            reconstruirCena3D();
            mostrarNotificacaoToast('Escada removida.', 'aviso');
        }

        // =====================================================================
        // ALTERNÂNCIA RÁPIDA DE ROTEAMENTO DE TOMADAS (HORIZONTAL VS RADIAL)
        // =====================================================================
        function alternarPassagemTomadasComodo(comodoId = null) {
            const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);
            if (comodosAndar.length === 0) return;

            let c = null;
            if (comodoId) {
                c = state.comodos.find(cmd => String(cmd.id) === String(comodoId));
            } else if (state.pontoSelecionadoId) {
                const pt = state.pontosEletricos.find(p => String(p.id) === String(state.pontoSelecionadoId));
                if (pt) c = state.comodos.find(cmd => String(cmd.id) === String(pt.comodoId));
            }
            if (!c) c = comodosAndar[0];

            if (c) {
                const atual = c.passagemTomadas || 'horizontal';
                c.passagemTomadas = (atual === 'horizontal') ? 'radial' : 'horizontal';

                const lbl = document.getElementById('lblStatusPassagemTomadaToolbar');
                if (lbl) {
                    lbl.textContent = (c.passagemTomadas === 'horizontal') ? 'Horizontal (Parede)' : 'Radial (Teto)';
                }

                desenharInstalacoes();
                reconstruirCena3D();
            }
        }


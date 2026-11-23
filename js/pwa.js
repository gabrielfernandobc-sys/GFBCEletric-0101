// PRO-ELÉTRICA CAD — service worker, instalação (PWA) e aviso de nova versão
    // =========================================================================
    // PWA & SERVICE WORKER LIFECYCLE HANDLERS
    // =========================================================================
    let deferredPromptPWA = null;

    if ('serviceWorker' in navigator) {
        
        // =========================================================================
        // MOTOR DE GESTÃO DE CIRCUITOS: LANÇAMENTO DE CONDUTORES, DESTAQUE & OCULTAÇÃO
        // =========================================================================

        function obterStatusVisibilidadeCircuito(tipoOuChave, comodoIdx = null) {
            const ocultos = state.circuitosOcultos || [];
            const destaque = state.circuitoDestaque || 'todos';
            const isolar = state.modoIsolarCircuito || false;

            const chaveComodo = (comodoIdx !== null) ? `comodo_${comodoIdx + 1}` : null;

            // 1. Verificação de Ocultação
            const estaOculto = ocultos.includes(tipoOuChave) || (chaveComodo && ocultos.includes(chaveComodo));
            if (estaOculto) {
                return { visivel: false, destacado: false, opacidade: 0 };
            }

            // 2. Verificação de Foco Exclusivo / Isolamento
            if (isolar && destaque !== 'todos') {
                const ehEste = (destaque === tipoOuChave) || (chaveComodo && destaque === chaveComodo);
                if (!ehEste) {
                    return { visivel: false, destacado: false, opacidade: 0 };
                }
                return { visivel: true, destacado: true, opacidade: 1.0 };
            }

            // 3. Verificação de Destaque / Ênfase
            if (destaque !== 'todos') {
                const ehEste = (destaque === tipoOuChave) || (chaveComodo && destaque === chaveComodo);
                if (ehEste) {
                    return { visivel: true, destacado: true, opacidade: 1.0 };
                } else {
                    return { visivel: true, destacado: false, opacidade: 0.16 }; // Muta outros circuitos
                }
            }

            return { visivel: true, destacado: false, opacidade: 1.0 };
        }

        function selecionarCircuitoDestaque(valor) {
            state.circuitoDestaque = valor;
            atualizarControlesCircuitosUI();
            desenharInstalacoes();
        }

        function toggleDestacarCircuito(circTipo = null) {
            if (circTipo) {
                state.circuitoDestaque = (state.circuitoDestaque === circTipo) ? 'todos' : circTipo;
                const sel = document.getElementById('selCircuitoLancamento');
                if (sel) sel.value = state.circuitoDestaque;
            } else {
                const sel = document.getElementById('selCircuitoLancamento');
                const val = sel ? sel.value : 'todos';
                if (val === 'todos') {
                    mostrarNotificacaoToast('Selecione um circuito específico para destacar!', 'info');
                    return;
                }
                state.circuitoDestaque = (state.circuitoDestaque === val) ? 'todos' : val;
            }
            atualizarControlesCircuitosUI();
            desenharInstalacoes();
            const msg = (state.circuitoDestaque !== 'todos') ? `Circuito destacado no desenho!` : 'Destaque removido (exibição padrão)';
            mostrarNotificacaoToast(msg, 'sucesso');
        }

        function toggleOcultarCircuito(circTipo = null) {
            const alvo = circTipo || (document.getElementById('selCircuitoLancamento') ? document.getElementById('selCircuitoLancamento').value : 'todos');
            if (alvo === 'todos') {
                mostrarNotificacaoToast('Selecione um circuito ou use a lista lateral para ocultar individualmente.', 'info');
                return;
            }
            if (!state.circuitosOcultos) state.circuitosOcultos = [];
            const idx = state.circuitosOcultos.indexOf(alvo);
            if (idx >= 0) {
                state.circuitosOcultos.splice(idx, 1);
                mostrarNotificacaoToast(`Circuito reexibido no lançamento!`, 'sucesso');
            } else {
                state.circuitosOcultos.push(alvo);
                mostrarNotificacaoToast(`Circuito ocultado do lançamento!`, 'info');
            }
            atualizarControlesCircuitosUI();
            desenharInstalacoes();
        }

        function toggleIsolarCircuito() {
            const sel = document.getElementById('selCircuitoLancamento');
            const val = sel ? sel.value : 'todos';
            if (val === 'todos') {
                mostrarNotificacaoToast('Selecione um circuito específico para isolar!', 'info');
                return;
            }
            state.modoIsolarCircuito = !state.modoIsolarCircuito;
            if (state.modoIsolarCircuito) {
                state.circuitoDestaque = val;
                mostrarNotificacaoToast(`Modo Foco Ativo: Apenas ${val.toUpperCase()} visível!`, 'sucesso');
            } else {
                mostrarNotificacaoToast(`Modo Foco desativado. Todos os circuitos visíveis.`, 'info');
            }
            atualizarControlesCircuitosUI();
            desenharInstalacoes();
        }

        function restaurarTodosCircuitos() {
            state.circuitoDestaque = 'todos';
            state.circuitosOcultos = [];
            state.modoIsolarCircuito = false;
            const sel = document.getElementById('selCircuitoLancamento');
            if (sel) sel.value = 'todos';
            atualizarControlesCircuitosUI();
            desenharInstalacoes();
            mostrarNotificacaoToast('Todos os circuitos e condutores visíveis!', 'sucesso');
        }

        function atualizarControlesCircuitosUI() {
            const sel = document.getElementById('selCircuitoLancamento');
            const btnDestacar = document.getElementById('btnDestacarCircuito');
            const lblDestacar = document.getElementById('lblBtnDestacarCircuito');
            const btnOcultar = document.getElementById('btnOcultarCircuito');
            const lblOcultar = document.getElementById('lblBtnOcultarCircuito');
            const btnIsolar = document.getElementById('btnIsolarCircuito');
            const lblIsolar = document.getElementById('lblBtnIsolarCircuito');
            const badge = document.getElementById('badgeStatusLancamentoCircuito');

            const valAtual = sel ? sel.value : (state.circuitoDestaque || 'todos');
            const estaOculto = (state.circuitosOcultos || []).includes(valAtual);
            const estaDestacado = (state.circuitoDestaque === valAtual && valAtual !== 'todos');

            if (btnDestacar) {
                if (estaDestacado) {
                    btnDestacar.className = 'px-3 py-1.5 rounded-xl font-black text-xs bg-amber-500 text-slate-950 border border-amber-400 transition flex items-center gap-1.5 shadow-lg shadow-amber-500/30 active:scale-95';
                    if (lblDestacar) lblDestacar.innerText = 'Destacado ✓';
                } else {
                    btnDestacar.className = 'px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 transition flex items-center gap-1.5 shadow-sm active:scale-95';
                    if (lblDestacar) lblDestacar.innerText = 'Destacar';
                }
            }

            if (btnOcultar) {
                if (estaOculto) {
                    btnOcultar.className = 'px-3 py-1.5 rounded-xl font-black text-xs bg-rose-600 text-white border border-rose-400 transition flex items-center gap-1.5 shadow-lg active:scale-95';
                    if (lblOcultar) lblOcultar.innerText = 'Oculto (Clique p/ Mostrar)';
                } else {
                    btnOcultar.className = 'px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 shadow-sm active:scale-95';
                    if (lblOcultar) lblOcultar.innerText = 'Ocultar Circuito';
                }
            }

            if (btnIsolar) {
                if (state.modoIsolarCircuito) {
                    btnIsolar.className = 'px-3 py-1.5 rounded-xl font-black text-xs bg-sky-500 text-slate-950 border border-sky-400 transition flex items-center gap-1.5 shadow-lg active:scale-95';
                    if (lblIsolar) lblIsolar.innerText = 'Isolado ✓';
                } else {
                    btnIsolar.className = 'px-3 py-1.5 rounded-xl font-bold text-xs bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/50 transition flex items-center gap-1.5 shadow-sm active:scale-95';
                    if (lblIsolar) lblIsolar.innerText = 'Isolar Só Este';
                }
            }

            if (badge) {
                if (state.modoIsolarCircuito) {
                    badge.innerText = `Foco Exclusivo: ${valAtual.toUpperCase()}`;
                    badge.className = 'bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2.5 py-0.5 rounded-full font-bold text-[10px]';
                } else if ((state.circuitosOcultos || []).length > 0) {
                    badge.innerText = `${(state.circuitosOcultos || []).length} Oculto(s)`;
                    badge.className = 'bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold text-[10px]';
                } else {
                    badge.innerText = 'Todos Visíveis';
                    badge.className = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold text-[10px]';
                }
            }

            // Atualiza botões da sidebar lateral
            ['ilum', 'tugs', 'tues'].forEach(tipo => {
                const btnOc = document.getElementById(`btnOcultarLateral_${tipo}`);
                if (btnOc) {
                    const oc = (state.circuitosOcultos || []).includes(tipo);
                    btnOc.innerHTML = oc ? '<i class="fa-solid fa-eye-slash text-rose-400"></i>' : '<i class="fa-solid fa-eye text-emerald-400"></i>';
                }
            });
        }

        function atualizarSeletorCircuitosLancamento() {
            const sel = document.getElementById('selCircuitoLancamento');
            if (!sel) return;

            const valAtual = sel.value || 'todos';
            const comodosAndar = (state.comodos || []).filter(c => c.pavimentoId === state.pavimentoAtivoId);

            let html = `
                <option value="todos">⚡ Todos os Circuitos (Visão Geral)</option>
                <option value="ilum">💡 Circuito Iluminação & Retornos</option>
                <option value="tugs">🔌 Circuitos Tomadas TUG (Uso Geral)</option>
                <option value="tues">⚡ Cargas Especiais TUE (220V Dedicado)</option>
            `;

            comodosAndar.forEach((c, idx) => {
                const circNum = idx + 1;
                html += `<option value="comodo_${circNum}">📍 Circ. ${circNum} - ${c.nome} (Eletroduto Principal)</option>`;
            });

            sel.innerHTML = html;
            if (html.includes(`value="${valAtual}"`)) {
                sel.value = valAtual;
            }
        }

        // =========================================================================
        // MODAIS MOBILE: SALVAMENTO & IMPORTAÇÃO NO SMARTPHONE
        // =========================================================================

        function abrirModalSalvarMobile() {
            const m = document.getElementById('modalSalvarMobile');
            if (m) m.classList.remove('hidden');
        }

        function fecharModalSalvarMobile() {
            const m = document.getElementById('modalSalvarMobile');
            if (m) m.classList.add('hidden');
        }

        function abrirModalImportarMobile() {
            const m = document.getElementById('modalImportarMobile');
            if (m) m.classList.remove('hidden');
        }

        function fecharModalImportarMobile() {
            const m = document.getElementById('modalImportarMobile');
            if (m) m.classList.add('hidden');
        }

        // =========================================================================
        // MOTOR DE TELEMETRIA EM TEMPO REAL (GPU & CPU MULTI-THREAD & FPS)
        // =========================================================================

        const hardwareTelemetry = {
            gpuUsage: 0,
            cpuUsage: 0,
            fps: 60,
            frameTimeMs: 0.3,
            cpuBusyTime: 0,
            lastSampleTime: performance.now(),
            frameCount: 0,
            lastFpsTime: performance.now(),
            active: false
        };

        window.hardwareTelemetry = hardwareTelemetry;

        function iniciarMonitorTelemetria() {
            if (hardwareTelemetry.active) return;
            hardwareTelemetry.active = true;

            function cicloTelemetria() {
                const now = performance.now();
                hardwareTelemetry.frameCount++;

                // Calcula FPS a cada 500ms
                const deltaFps = now - hardwareTelemetry.lastFpsTime;
                if (deltaFps >= 500) {
                    hardwareTelemetry.fps = Math.round((hardwareTelemetry.frameCount * 1000) / deltaFps);
                    hardwareTelemetry.frameCount = 0;
                    hardwareTelemetry.lastFpsTime = now;
                }

                // Calcula CPU % a cada 400ms
                const deltaCpu = now - hardwareTelemetry.lastSampleTime;
                if (deltaCpu >= 400) {
                    const pctBusy = Math.min(98, Math.round((hardwareTelemetry.cpuBusyTime / deltaCpu) * 100));
                    hardwareTelemetry.cpuUsage = pctBusy;
                    hardwareTelemetry.frameTimeMs = Math.round((hardwareTelemetry.cpuBusyTime / Math.max(1, hardwareTelemetry.fps * 0.4)) * 10) / 10;
                    hardwareTelemetry.cpuBusyTime = 0;
                    hardwareTelemetry.lastSampleTime = now;

                    // GPU: Em 3D quando renderizando ativamente vs quando estático
                    if (state.abaAtiva === 'visualizacao3d' && state.render3dAtivo) {
                        hardwareTelemetry.gpuUsage = Math.min(85, Math.max(14, Math.round(hardwareTelemetry.frameTimeMs * 16)));
                    } else if (state.arrastando || state.arrastandoInstalacoes) {
                        hardwareTelemetry.gpuUsage = Math.min(45, Math.max(8, Math.round(hardwareTelemetry.frameTimeMs * 10)));
                    } else {
                        // 0% GPU Idle sob Demanda!
                        hardwareTelemetry.gpuUsage = 0;
                    }

                    atualizarTelemetriaUI();
                }

                requestAnimationFrame(cicloTelemetria);
            }

            requestAnimationFrame(cicloTelemetria);
        }

        function atualizarTelemetriaUI() {
            // O navegador não informa o uso real da GPU: mostra só se a cena 3D está sendo desenhada.
            const render3d = hardwareTelemetry.gpuUsage > 0;
            const estado3d = render3d ? 'desenhando' : 'em repouso';
            const cpuText = `${hardwareTelemetry.cpuUsage}%`;
            const fps = hardwareTelemetry.fps || 60;
            const fpsText = `${fps} FPS`;

            const elGpu = document.getElementById('valGpuUso');
            const elCpu = document.getElementById('valCpuUso');
            const elFps = document.getElementById('valFpsUso');
            if (elGpu) elGpu.innerText = estado3d;
            if (elCpu) elCpu.innerText = cpuText;
            if (elFps) elFps.innerText = fpsText;

            const mGpu = document.getElementById('modalValGpu');
            const mCpu = document.getElementById('modalValCpu');
            const mFps = document.getElementById('modalValFps');
            const mFt = document.getElementById('modalValFrameTime');
            const bGpu = document.getElementById('barGpuUso');
            const bCpu = document.getElementById('barCpuUso');
            const dGpu = document.getElementById('modalDescGpu');
            const dCpu = document.getElementById('modalDescCpu');

            if (mGpu) mGpu.innerText = render3d ? 'Ativa' : 'Repouso';
            if (mCpu) mCpu.innerText = cpuText;
            if (mFps) mFps.innerText = `${fps} FPS (${(1000 / Math.max(1, fps)).toFixed(1)} ms)`;
            if (mFt) mFt.innerText = `${Math.max(0.2, hardwareTelemetry.frameTimeMs).toFixed(1)} ms / quadro`;
            if (bGpu) bGpu.style.width = render3d ? '100%' : '4%';
            if (bCpu) bCpu.style.width = `${Math.max(4, hardwareTelemetry.cpuUsage)}%`;
            if (dGpu) dGpu.innerText = render3d ? 'Desenhando a cena 3D' : 'Nada mudou na cena';
            if (dCpu) dCpu.innerText = (hardwareTelemetry.cpuUsage < 5) ? 'Leve' : 'Desenhando';
        }

        function abrirModalTelemetria() {
            const m = document.getElementById('modalTelemetria');
            if (m) {
                try {
                    const canvasTmp = document.createElement('canvas');
                    const gl = canvasTmp.getContext('webgl') || canvasTmp.getContext('experimental-webgl');
                    if (gl) {
                        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                        if (debugInfo) {
                            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                            const elRend = document.getElementById('modalValGpuRenderer');
                            if (elRend && renderer) elRend.innerText = renderer;
                        }
                    }
                } catch(e) {}
                atualizarTelemetriaUI();
                m.classList.remove('hidden');
            }
        }

        function fecharModalTelemetria() {
            const m = document.getElementById('modalTelemetria');
            if (m) m.classList.add('hidden');
        }

        window.addEventListener('load', () => {
        // Habilita Zoom Suave com Mouse Wheel nos dois Canvases
        habilitarZoomMouseWheel('cadCanvas');
        habilitarZoomMouseWheel('instalacoesCanvas');
            iniciarMonitorTelemetria();
            atualizarSeletorCircuitosLancamento();

            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('[PWA] Service Worker ativo:', reg.scope))
                .catch(err => console.log('[PWA] Erro ao registrar Service Worker:', err));
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        // Previne o infobar automático para que possamos usar nosso botão estilizado
        e.preventDefault();
        deferredPromptPWA = e;
        console.log('[PWA] Evento beforeinstallprompt capturado');
        const btnM = document.getElementById('btnInstalarAppMobile');
        const btnD = document.getElementById('btnInstalarAppDesktop');
        if (btnM) btnM.classList.remove('hidden');
        if (btnD) btnD.classList.remove('hidden');
    });

    window.addEventListener('appinstalled', () => {
        console.log('[PWA] Aplicativo instalado com sucesso!');
        deferredPromptPWA = null;
        const btnM = document.getElementById('btnInstalarAppMobile');
        const btnD = document.getElementById('btnInstalarAppDesktop');
        if (btnM) btnM.classList.add('hidden');
        if (btnD) btnD.classList.add('hidden');
    });

    function dispararInstalacaoPWA() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (deferredPromptPWA) {
            deferredPromptPWA.prompt();
            deferredPromptPWA.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('[PWA] Usuário aceitou a instalação');
                } else {
                    console.log('[PWA] Usuário recusou a instalação');
                }
                deferredPromptPWA = null;
            });
        } else if (isIOS) {
            const m = document.getElementById('modalInstrucoesIOS');
            if (m) m.classList.remove('hidden');
        } else {
            // Em navegadores de computador ou quando já instalado
            const m = document.getElementById('modalInstrucoesIOS');
            if (m) {
                m.classList.remove('hidden');
            } else {
                alert('Para instalar o aplicativo no seu dispositivo: No menu do navegador (três pontos ⋮), selecione "Instalar PRO-ELÉTRICA" ou "Adicionar à tela inicial".');
            }
        }
    }

/* PRO-ELÉTRICA CAD — 11-circuitos.js
   Tela cheia, parâmetros NBR e tabela de circuitos (atualizarTabelas).
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        // =========================================================================
        // GERENCIAMENTO DE TELA CHEIA (FULLSCREEN 2D CAD, CABOS E 3D)
        // =========================================================================
        let viewportFullscreenAtivo = null;

        function toggleFullscreenViewport(tipo) {
            if (viewportFullscreenAtivo === tipo) {
                sairFullscreen();
            } else {
                entrarFullscreen(tipo);
            }
        }

        function entrarFullscreen(tipo) {
            // Se já tem outro ativo, sai antes
            if (viewportFullscreenAtivo) {
                sairFullscreen();
            }

            let container = null;
            if (tipo === 'cad') container = document.getElementById('containerCad2D');
            else if (tipo === 'instalacoes') container = document.getElementById('containerInstalacoes2D');
            else if (tipo === '3d') container = document.getElementById('container3D');

            if (!container) return;

            viewportFullscreenAtivo = tipo;
            container.classList.add('viewport-fullscreen-mode');

            // Ajusta dimensões específicas por viewport
            if (tipo === 'cad') {
                const canvas = document.getElementById('cadCanvas');
                if (canvas) {
                    ajustarResolucaoCanvas(canvas, window.innerWidth, window.innerHeight);
                    canvas.style.height = window.innerHeight + 'px';
                    centralizarProjetoNoCanvas('cadCanvas');
                    desenharCAD();
                }
            } else if (tipo === 'instalacoes') {
                const canvas = document.getElementById('instalacoesCanvas');
                if (canvas) {
                    ajustarResolucaoCanvas(canvas, window.innerWidth, window.innerHeight);
                    canvas.style.height = window.innerHeight + 'px';
                    centralizarProjetoNoCanvas('instalacoesCanvas');
                    desenharInstalacoes();
                }
            } else if (tipo === '3d') {
                const vp = document.getElementById('viewport3d');
                if (vp) {
                    vp.style.height = window.innerHeight + 'px';
                    setTimeout(() => {
                        onWindowResize3d();
                        reconstruirCena3D();
                    }, 50);
                }
            }

            atualizarBotoesFullscreen(tipo, true);

            // Tenta ativar a Fullscreen API nativa do navegador se suportada
            if (document.fullscreenEnabled && !document.fullscreenElement) {
                try {
                    container.requestFullscreen().catch(() => {});
                } catch (e) {}
            }
        }

        function sairFullscreen() {
            if (!viewportFullscreenAtivo) return;

            const tipo = viewportFullscreenAtivo;
            let container = null;
            if (tipo === 'cad') container = document.getElementById('containerCad2D');
            else if (tipo === 'instalacoes') container = document.getElementById('containerInstalacoes2D');
            else if (tipo === '3d') container = document.getElementById('container3D');

            if (container) {
                container.classList.remove('viewport-fullscreen-mode');
            }

            if (tipo === 'cad') {
                const canvas = document.getElementById('cadCanvas');
                if (canvas) {
                    canvas.style.height = '520px';          // o desenho reajusta a resolução ao tamanho exibido
                    centralizarProjetoNoCanvas('cadCanvas');
                    desenharCAD();
                }
            } else if (tipo === 'instalacoes') {
                const canvas = document.getElementById('instalacoesCanvas');
                if (canvas) {
                    canvas.style.height = '620px';
                    centralizarProjetoNoCanvas('instalacoesCanvas');
                    desenharInstalacoes();
                }
            } else if (tipo === '3d') {
                const vp = document.getElementById('viewport3d');
                if (vp) {
                    vp.style.height = '620px';
                    setTimeout(() => {
                        onWindowResize3d();
                        reconstruirCena3D();
                    }, 50);
                }
            }

            atualizarBotoesFullscreen(tipo, false);
            viewportFullscreenAtivo = null;

            if (document.fullscreenElement) {
                try {
                    document.exitFullscreen().catch(() => {});
                } catch (e) {}
            }
        }

        function atualizarBotoesFullscreen(tipo, isFullscreen) {
            const configs = [
                { idBtn: 'btnFullscreenCad', idExit: 'btnExitFullscreenCad', label: 'Tela Cheia', labelExit: 'Sair da Tela Cheia (ESC)' },
                { idBtn: 'btnFullscreenInstalacoes', idExit: 'btnExitFullscreenInstalacoes', label: 'Tela Cheia', labelExit: 'Sair da Tela Cheia (ESC)' },
                { idBtn: 'btnFullscreen3D', idExit: 'btnExitFullscreen3D', label: 'Tela Cheia 3D', labelExit: 'Sair da Tela Cheia (ESC)' },
                { idBtn: 'btn3dFullscreenToolbar', label: 'Tela Cheia 3D' }
            ];

            if (tipo === 'cad') {
                const btn = document.getElementById('btnFullscreenCad');
                if (btn) btn.innerHTML = isFullscreen ? '<i class="fa-solid fa-compress"></i> <span class="hidden sm:inline text-[11px]">Recolher</span>' : '<i class="fa-solid fa-expand"></i> <span class="hidden sm:inline text-[11px]">Tela Cheia</span>';
                const exit = document.getElementById('btnExitFullscreenCad');
                if (exit) {
                    if (isFullscreen) exit.classList.remove('hidden');
                    else exit.classList.add('hidden');
                }
            } else if (tipo === 'instalacoes') {
                const btn = document.getElementById('btnFullscreenInstalacoes');
                if (btn) btn.innerHTML = isFullscreen ? '<i class="fa-solid fa-compress"></i> <span class="hidden sm:inline text-[11px]">Recolher</span>' : '<i class="fa-solid fa-expand"></i> <span class="hidden sm:inline text-[11px]">Tela Cheia</span>';
                const exit = document.getElementById('btnExitFullscreenInstalacoes');
                if (exit) {
                    if (isFullscreen) exit.classList.remove('hidden');
                    else exit.classList.add('hidden');
                }
            } else if (tipo === '3d') {
                const btn1 = document.getElementById('btnFullscreen3D');
                const btn2 = document.getElementById('btn3dFullscreenToolbar');
                const htmlStr = isFullscreen ? '<i class="fa-solid fa-compress"></i> <span>Recolher 3D</span>' : '<i class="fa-solid fa-expand"></i> <span>Tela Cheia 3D</span>';
                if (btn1) btn1.innerHTML = htmlStr;
                if (btn2) btn2.innerHTML = htmlStr;
                const exit = document.getElementById('btnExitFullscreen3D');
                if (exit) {
                    if (isFullscreen) exit.classList.remove('hidden');
                    else exit.classList.add('hidden');
                }
            }
        }

        // Suporte à tecla ESC e evento nativo de fullscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && viewportFullscreenAtivo) {
                sairFullscreen();
            }
        });

        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && viewportFullscreenAtivo) {
                sairFullscreen();
            }
        });

        window.addEventListener('resize', () => {
            if (viewportFullscreenAtivo === 'cad') {
                const canvas = document.getElementById('cadCanvas');
                if (canvas) {
                    ajustarResolucaoCanvas(canvas, window.innerWidth, window.innerHeight);
                    canvas.style.height = window.innerHeight + 'px';
                    desenharCAD();
                }
            } else if (viewportFullscreenAtivo === 'instalacoes') {
                const canvas = document.getElementById('instalacoesCanvas');
                if (canvas) {
                    ajustarResolucaoCanvas(canvas, window.innerWidth, window.innerHeight);
                    canvas.style.height = window.innerHeight + 'px';
                    desenharInstalacoes();
                }
            } else if (viewportFullscreenAtivo === '3d') {
                const vp = document.getElementById('viewport3d');
                if (vp) {
                    vp.style.height = window.innerHeight + 'px';
                    onWindowResize3d();
                }
            }
        });

        /**
         * Perfil vertical das rotas de um cômodo: pé-direito e passagem dos cabos do seu pavimento
         * ('teto' = pela laje, padrão das construções brasileiras tradicionais; 'chao' = pelo piso),
         * subida da prumada até o pavimento e sobra deixada em cada caixa.
         */
        function perfilVerticalComodo(c) {
            const par = obterParametrosNBR();
            const pavs = state.pavimentos || [];
            const pav = pavs.find(p => p.id === c.pavimentoId) || pavs[0] || {};
            const pe = Number(pav.alturaPeDireito) || 2.8;
            const passagem = pav.tipoPassagemCabos || state.tipoPassagemCabos || 'teto';
            const sobra = isFinite(Number(par.sobraCaixaM)) ? Math.max(0, Number(par.sobraCaixaM)) : NBR5410.PARAMETROS_PADRAO.sobraCaixaM;
            // prumada: soma o pé-direito e a laje de cada pavimento abaixo deste
            let prumada = 0;
            if (state.prumadaAtiva !== false && state.regimeImovel === 'mesmo_imovel') {
                const nivel = Number(pav.nivel) || 0;
                const base = Math.min(...pavs.map(p => Number(p.nivel) || 0));
                pavs.filter(p => (Number(p.nivel) || 0) >= base && (Number(p.nivel) || 0) < nivel)
                    .forEach(p => { prumada += (Number(p.alturaPeDireito) || 2.8) + (Number(p.espessuraLajeTeto) || 0.15); });
            }
            return {
                pe, passagem, sobra, prumada,
                vQuadro: NBR5410.trechoVertical(passagem, pe, NBR5410.ALTURA_CENTRO_QUADRO),   // do quadro até a laje (ou ao piso)
                vLuz: NBR5410.trechoVertical(passagem, pe, pe),                                 // pela laje: 0; pelo piso: sobe até o teto
                // alturaM: altura exata do ponto quando informada (ex.: tomada do motor da cortina a 2,20 m)
                vPonto: (altura, alturaM) => NBR5410.trechoVertical(passagem, pe, isFinite(Number(alturaM)) && alturaM !== null && alturaM !== undefined ? Number(alturaM) : NBR5410.alturaDoPonto(altura, pe)),
                // interruptor: pela laje desce até 1,20 m; pelo piso sobe até ele e o retorno segue até a luz no teto
                vInterruptor: passagem === 'chao' ? pe : pe - NBR5410.ALTURAS_PONTO.media
            };
        }

        // CÁLCULO DE METRAGENS FÍSICAS REAIS (ALTURAS VERTICAIS, CURVATURAS E SOBRAS NAS CAIXAS)
        function calcularMetragensFisicasProjeto(comodosParaCalcular, state) {
            const F_curva = 1.08;   // acréscimo por curvas e desvios do eletroduto
            const escala = (typeof state.escala === 'number' && state.escala > 0) ? state.escala : 40.0;
            const qdtCx = state.qdtPos.x + state.qdtPos.w / 2;
            const qdtCy = state.qdtPos.y + state.qdtPos.h / 2;

            const comodosInfo = (comodosParaCalcular || state.comodos).map((c, idx) => {
                const w = c.largura * escala;
                const h = c.comprimento * escala;
                const luzX = c.x + w / 2;
                const luzY = c.y + h / 2;
                const circNum = idx + 1;
                const pv = perfilVerticalComodo(c);
                const sobraCaixa = pv.sobra;

                const wps = state.eletrodutoWaypoints[circNum] || [];
                const ptsRota = [{ x: qdtCx, y: qdtCy }, ...wps, { x: luzX, y: luzY }];

                let distPx = 0;
                for (let i = 0; i < ptsRota.length - 1; i++) {
                    distPx += Math.hypot(ptsRota[i+1].x - ptsRota[i].x, ptsRota[i+1].y - ptsRota[i].y);
                }
                const distHorizQdt = (distPx / escala) * F_curva;
                // quadro → caixa de luz do cômodo: horizontal + subida do quadro à laje (ou descida ao piso
                // e subida até o teto) + prumada + sobra no quadro e na caixa
                const rotaBaseQdt = distHorizQdt + pv.vQuadro + pv.vLuz + pv.prumada + 2 * sobraCaixa;

                const ptsDoComodo = state.pontosEletricos.filter(p => p.comodoId === c.id);
                const tugs = ptsDoComodo.filter(p => p.tipo === 'TUG');
                const tues = ptsDoComodo.filter(p => p.tipo === 'TUE');
                const interrs = ptsDoComodo.filter(p => p.tipo === 'INTERRUPTOR');

                let somaTrechosTugs = 0;
                let maxDistTug = 0;
                tugs.forEach(pt => {
                    const distH = (Math.hypot(pt.x - luzX, pt.y - luzY) / escala) * F_curva;
                    const trecho = distH + pv.vPonto(pt.altura || 'baixa', pt.alturaM) + (sobraCaixa * 2);
                    somaTrechosTugs += trecho;
                    if (trecho > maxDistTug) maxDistTug = trecho;
                });

                let somaTrechosInterr = 0;
                let maxDistInterr = 0;
                // automação cabeada: a luz vem do atuador e o interruptor vira pulsador (cabo de barramento,
                // orçado na automação) — o circuito de iluminação não leva fase e retorno até ele
                const fiacaoAut = (typeof fiacaoCabeadaAutomacao === 'function') ? fiacaoCabeadaAutomacao() : null;
                const listaSw = (fiacaoAut && fiacaoAut.comodosLuz.has(String(c.id))) ? []
                    : ((interrs.length > 0) ? interrs : [{ x: c.x + 12, y: c.y + h - 12 }]);
                listaSw.forEach(sw => {
                    const distH = (Math.hypot(sw.x - luzX, sw.y - luzY) / escala) * F_curva;
                    const trecho = distH + pv.vInterruptor + (sobraCaixa * 2);
                    somaTrechosInterr += trecho;
                    if (trecho > maxDistInterr) maxDistInterr = trecho;
                });

                const trechosTue = {};
                tues.forEach(tue => {
                    const distH = (Math.hypot(tue.x - luzX, tue.y - luzY) / escala) * F_curva;
                    // circuito exclusivo: quadro → laje (ou piso) → caixa da TUE, sem passar pela descida da luz
                    const trecho = distHorizQdt + pv.vQuadro + pv.prumada + distH + pv.vPonto(tue.altura || 'media', tue.alturaM) + (sobraCaixa * 2);
                    trechosTue[tue.id] = {
                        rotaFisica: Math.ceil(trecho),
                        distanciaCritica: Math.ceil(trecho)
                    };
                });

                return {
                    comodo: c,
                    id: c.id,
                    nome: c.nome,
                    pavimentoId: c.pavimentoId,
                    rotaBaseQdt,
                    somaTrechosTugs,
                    maxDistTug,
                    somaTrechosInterr,
                    maxDistInterr,
                    trechosTue,
                    tugs, tues, interrs
                };
            });

            // Agregações de circuitos terminais
            const cIlumCritica = Math.ceil(Math.min(15.5, Math.max(12, ...comodosInfo.map(ci => ci.rotaBaseQdt))));
            const cIlumFisica = Math.ceil(Math.max(32, (comodosInfo[0]?.rotaBaseQdt || 10) + comodosInfo.reduce((s, ci) => s + ci.somaTrechosInterr, 0) + 14));

            const comodosTugGeral = comodosInfo.filter(ci => !ci.nome.toLowerCase().includes('cozinha') && !ci.nome.toLowerCase().includes('copa') && !ci.nome.toLowerCase().includes('banheiro') && !ci.nome.toLowerCase().includes('lavabo') && !ci.nome.toLowerCase().includes('serviço'));
            const cTugGeralCritica = Math.ceil(Math.max(18, ...(comodosTugGeral.length ? comodosTugGeral.map(ci => ci.rotaBaseQdt + ci.maxDistTug) : [20])));
            const cTugGeralFisica = Math.ceil(Math.max(48, (comodosTugGeral[0]?.rotaBaseQdt || 10) + comodosTugGeral.reduce((s, ci) => s + ci.somaTrechosTugs, 0) + 14));

            const comodosCozinha = comodosInfo.filter(ci => ci.nome.toLowerCase().includes('cozinha') || ci.nome.toLowerCase().includes('copa') || ci.nome.toLowerCase().includes('gourmet'));
            const cCozinhaCritica = Math.ceil(Math.max(15, ...(comodosCozinha.length ? comodosCozinha.map(ci => ci.rotaBaseQdt + ci.maxDistTug) : [16])));
            const cCozinhaFisica = Math.ceil(Math.max(26, (comodosCozinha[0]?.rotaBaseQdt || 10) + comodosCozinha.reduce((s, ci) => s + ci.somaTrechosTugs, 0) + 6));

            const comodosBanheiro = comodosInfo.filter(ci => ci.nome.toLowerCase().includes('banheiro') || ci.nome.toLowerCase().includes('lavabo') || ci.nome.toLowerCase().includes('suíte') || ci.nome.toLowerCase().includes('suite'));
            const cBanheiroCritica = Math.ceil(Math.max(14, ...(comodosBanheiro.length ? comodosBanheiro.map(ci => ci.rotaBaseQdt + ci.maxDistTug) : [15])));
            const cBanheiroFisica = Math.ceil(Math.max(20, (comodosBanheiro[0]?.rotaBaseQdt || 10) + comodosBanheiro.reduce((s, ci) => s + ci.somaTrechosTugs, 0) + 6));

            return {
                comodosInfo,
                ilum: { distanciaCritica: cIlumCritica, rotaFisica: cIlumFisica },
                tugGeral: { distanciaCritica: cTugGeralCritica, rotaFisica: cTugGeralFisica },
                cozinha: { distanciaCritica: cCozinhaCritica, rotaFisica: cCozinhaFisica },
                banheiro: { distanciaCritica: cBanheiroCritica, rotaFisica: cBanheiroFisica }
            };
        }

        // CÁLCULOS TÉCNICOS CONSOLIDADOS (CONFORME NBR 5410 & REGIME DE IMÓVEIS)
        // Premissas de correção da capacidade de condução (FCA / FCT) do projeto
        function obterParametrosNBR() {
            if (!state.parametrosNBR) state.parametrosNBR = { ...NBR5410.PARAMETROS_PADRAO };
            // projetos antigos: completa as premissas novas (sobra nas caixas e reserva de cabo)
            Object.keys(NBR5410.PARAMETROS_PADRAO).forEach(k => { if (state.parametrosNBR[k] === undefined) state.parametrosNBR[k] = NBR5410.PARAMETROS_PADRAO[k]; });
            return state.parametrosNBR;
        }

        function alterarParametroNBR(campo, valor) {
            const v = parseFloat(String(valor).replace(',', '.'));
            if (!isFinite(v)) return;
            const p = obterParametrosNBR();
            if (campo === 'circuitosAgrupados') p.circuitosAgrupados = Math.min(30, Math.max(1, Math.round(v)));
            if (campo === 'temperaturaAmbiente') p.temperaturaAmbiente = Math.min(60, Math.max(10, v));
            if (campo === 'sobraCaixaM') p.sobraCaixaM = Math.min(1, Math.max(0, Math.round(v * 100) / 100));
            if (campo === 'reservaCabosPct') p.reservaCabosPct = Math.min(50, Math.max(0, Math.round(v)));
            sincronizarControlesParametrosNBR();
            atualizarTabelas();
            renderizarMemorialAba6();
        }

        /**
         * Ajusta os pontos (e as cargas dos cômodos) à rede do projeto: modelos, catálogo e atalhos
         * usam a convenção 127/220 V e são convertidos aqui (NBR5410.tensaoNaRede). Idempotente:
         * roda a cada cálculo e só altera o que não corresponde à rede.
         * @returns {number} quantidade de pontos alterados
         */
        function normalizarPontosNaRede(rede) {
            const r = rede || redeAtivaProjeto();
            let alterados = 0;
            const ajustar = (obj, campoPot) => {
                const tri = obj.tipo === 'TUE' && NBR5410.ehCargaTrifasica(obj);
                const v = NBR5410.tensaoNaRede(obj, r);
                let mudou = false;
                if (Number(obj.tensao) !== v) { obj.tensao = v; mudou = true; }
                if (r.fn === 220 && /127\s?V/.test(obj.nome || '')) { obj.nome = obj.nome.replace(/127\s?V/g, '220V'); mudou = true; }
                const iFase = tri ? NBR5410.correntePorFaseNoNome(obj.nome) : null;
                if (iFase) {
                    const pot = NBR5410.potenciaTrifasicaPorCorrente(iFase, r);
                    if (Number(obj[campoPot]) !== pot) { obj[campoPot] = pot; mudou = true; }
                }
                return mudou;
            };
            (state.pontosEletricos || []).forEach(pt => { if (ajustar(pt, 'pot')) alterados++; });
            (state.comodos || []).forEach(c => (c.cargas || []).forEach(cg => ajustar(Object.assign(cg, { tipo: cg.tipo || 'TUE' }), 'potencia')));
            return alterados;
        }

        /** Descrição do método de queda de tensão e da isolação adotados (premissas e memorial). */
        function textoMetodoQuedaNBR() {
            const p = obterParametrosNBR();
            const iso = NBR5410.obterIsolacao(p.isolacao);
            if (p.metodoQueda !== 'detalhado') return `Queda de tensão pelo método simplificado: ΔV = 2·ρ·L·Ib/S (monofásico) e √3·ρ·L·Ib/S (trifásico), ρ = 0,0221 Ω·mm²/m (cobre a 70 °C). Isolação ${iso.rotulo}.`;
            const rho = NBR5410.resistividadeCobre(iso.temperaturaServico);
            return `Queda de tensão pelo método detalhado: ΔV = k·L·Ib·(ρθ/S·cos φ + X·sen φ), ρ${iso.temperaturaServico} = ${rho.toFixed(4).replace('.', ',')} Ω·mm²/m (cobre, isolação ${iso.rotulo}), X = 0,08 mΩ/m a partir de 25 mm², cos φ 1 nas cargas resistivas e 0,95 nas demais.`;
        }

        /** Método da queda de tensão (premissas): 'simplificado' (padrão) ou 'detalhado'. */
        function alterarMetodoQueda(metodo) {
            obterParametrosNBR().metodoQueda = metodo === 'detalhado' ? 'detalhado' : 'simplificado';
            sincronizarControlesParametrosNBR();
            atualizarTudo();
        }

        /** Isolação dos condutores (premissas): PVC 70 °C (padrão) ou EPR/XLPE 90 °C. */
        function alterarIsolacaoCabos(isolacao) {
            obterParametrosNBR().isolacao = NBR5410.obterIsolacao(isolacao).id;
            sincronizarControlesParametrosNBR();
            atualizarTudo();
        }

        /** Troca a rede de BT do projeto (premissas): 127/220 V ou 220/380 V. */
        function alterarRedeTensao(id) {
            const p = obterParametrosNBR();
            const nova = NBR5410.obterRede(id);
            if (p.redeTensao === nova.id) { atualizarInterfaceRede(); return; }
            p.redeTensao = nova.id;
            const n = normalizarPontosNaRede(nova);
            atualizarInterfaceRede();
            atualizarTudo();
            if (typeof reconstruirCena3D === 'function') reconstruirCena3D();
            if (typeof mostrarNotificacaoToast === 'function') {
                mostrarNotificacaoToast(`Rede ${nova.rotulo}: ${n} ponto(s) ajustado(s) — TUGs e iluminação em ${nova.fn} V (F+N), aparelhos de 220 V ${nova.fn === 220 ? 'entre fase e neutro' : 'entre fases'}${nova.fn === 220 ? ', trifásicos em 380 V' : ''}.`, 'sucesso');
            }
        }

        /** Seletores, rótulos e catálogo da interface conforme a rede do projeto. */
        function atualizarInterfaceRede() {
            const r = redeAtivaProjeto();
            const sel = document.getElementById('selRedeTensao');
            if (sel) sel.value = r.id;
            const lbl = document.getElementById('lblRedeTensaoNBR');
            if (lbl) {
                lbl.textContent = r.fn === 220
                    ? 'F+N 220 V em TUGs, iluminação e aparelhos de 220 V; F+F 380 V; trifásico 3F+N em 380 V.'
                    : 'F+N 127 V em TUGs e iluminação; aparelhos de 220 V entre fases (F+F); trifásico 3F+N em 220 V.';
            }
            document.querySelectorAll('[data-rede-rotulo]').forEach(el => {
                const tipo = el.getAttribute('data-rede-rotulo');
                el.textContent = tipo === 'fn' ? `${r.fn}V` : (tipo === 'ff' ? `${r.ff}V` : (tipo === 'tue' ? `${r.fn === 220 ? '220V F+N' : '220V'}` : `${r.fn}V/${r.ff}V`));
            });
            const opcoesSistema = { bifasico: `Bifásico ${r.rotulo} (2 Fases + Neutro + Terra = 4 Condutores)`, trifasico: `Trifásico ${r.rotulo} (3 Fases + Neutro + Terra = 5 Condutores)`, monofasico: `Monofásico ${r.fn} V (Fase + Neutro + Terra = 3 Condutores)` };
            const selSist = document.getElementById('selSistemaEntrada');
            if (selSist) Array.from(selSist.options).forEach(o => { if (opcoesSistema[o.value]) o.textContent = opcoesSistema[o.value]; });
            if (typeof atualizarOpcoesTensaoRede === 'function') atualizarOpcoesTensaoRede();
            if (typeof setupSugestoesBR === 'function') setupSugestoesBR();
            if (typeof popularSelectModalPontoPredefinido === 'function') popularSelectModalPontoPredefinido();
        }

        function sincronizarControlesParametrosNBR() {
            const p = obterParametrosNBR();
            atualizarInterfaceRede();
            const inpN = document.getElementById('inpCircuitosAgrupados');
            const inpT = document.getElementById('inpTemperaturaAmbiente');
            const lbl = document.getElementById('lblFatoresCorrecaoNBR');
            if (inpN) inpN.value = p.circuitosAgrupados;
            if (inpT) inpT.value = p.temperaturaAmbiente;
            const inpS = document.getElementById('inpSobraCaixa');
            const inpR = document.getElementById('inpReservaCabos');
            if (inpS) inpS.value = p.sobraCaixaM;
            if (inpR) inpR.value = p.reservaCabosPct;
            renderizarPassagemCabosPavimentos();
            if (lbl) {
                const fca = NBR5410.fatorAgrupamento(p.circuitosAgrupados);
                const fct = NBR5410.fatorTemperatura(p.temperaturaAmbiente, p.isolacao);
                lbl.textContent = `FCA ${fca.toFixed(2)} × FCT ${fct.toFixed(2)} = ${(fca * fct).toFixed(2)} × Iz`;
            }
            const selQ = document.getElementById('selMetodoQueda');
            if (selQ) selQ.value = p.metodoQueda === 'detalhado' ? 'detalhado' : 'simplificado';
            const selIso = document.getElementById('selIsolacaoCabos');
            if (selIso) selIso.value = NBR5410.obterIsolacao(p.isolacao).id;
            const lblQ = document.getElementById('lblMetodoQuedaNBR');
            if (lblQ) lblQ.textContent = textoMetodoQuedaNBR();
        }

        /** Passagem dos cabos de cada pavimento (pela laje ou pelo piso) na aba do quadro. */
        function renderizarPassagemCabosPavimentos() {
            const alvo = document.getElementById('lblPassagemCabosPavs');
            if (!alvo) return;
            const pavs = (state.pavimentos || []).slice().sort((a, b) => (Number(a.nivel) || 0) - (Number(b.nivel) || 0));
            alvo.innerHTML = pavs.map(pv => {
                const tp = pv.tipoPassagemCabos || state.tipoPassagemCabos || 'teto';
                return `<label class="flex items-center gap-1.5"><span class="text-slate-400">${escHtml(pv.nome)} (pé-direito ${String(Number(pv.alturaPeDireito) || 2.8).replace('.', ',')} m):</span>
                    <select onchange="alterarPassagemCabos(this.value, ${argJsEmAtributo(pv.id)})" class="bg-slate-900 border border-slate-700 text-amber-300 font-bold px-2 py-1 rounded">
                        <option value="teto" ${tp !== 'chao' ? 'selected' : ''}>Pela laje (desce pelas paredes)</option>
                        <option value="chao" ${tp === 'chao' ? 'selected' : ''}>Pelo piso (sobe pelas paredes)</option>
                    </select></label>`;
            }).join('');
        }

        function atualizarTabelas() {
            renderizarPassagemCabosPavimentos();
            const rede = redeAtivaProjeto();
            normalizarPontosNaRede(rede);      // modelos, catálogo e atalhos vêm em 127/220 V
            // 1. Determina quais cômodos entram no cálculo (respeita regime de imóveis)
            let comodosParaCalcular = state.comodos;
            let ehUnidadeEspecifica = false;
            let imovelAtivo = null;

            if (state.regimeImovel === 'imoveis_separados' && state.unidadeQdtAtivaId !== 'todos') {
                imovelAtivo = state.imoveis.find(i => i.id === state.unidadeQdtAtivaId);
                if (imovelAtivo && imovelAtivo.pavimentos && imovelAtivo.pavimentos.length > 0) {
                    comodosParaCalcular = state.comodos.filter(c => imovelAtivo.pavimentos.includes(c.pavimentoId));
                    ehUnidadeEspecifica = true;
                }
            }

            let totIlum = 0, totTug = 0, totTue = 0;
            const circuitos = [];

            let totTugGeral = 0;
            let totTugServico = 0;

            const rotasFisicasProjeto = calcularMetragensFisicasProjeto(comodosParaCalcular, state);

            const qdtCx = state.qdtPos.x + state.qdtPos.w / 2;
            const qdtCy = state.qdtPos.y + state.qdtPos.h / 2;

            // Escopo de cada circuito (quais cômodos/pontos ele atende) para o diagrama
            // unifilar: circuitos divididos por potência compartilham o mesmo "grupo" e
            // os pontos são repartidos depois (js/unifilar.js)
            const idsTug = lista => lista.flatMap(ci => state.pontosEletricos
                .filter(p => p.comodoId === ci.comodo.id && p.tipo === 'TUG').map(p => p.id));
            const idsComodos = lista => lista.map(ci => ci.comodo.id);

            // Coletores para divisão normativa de circuitos (NBR 5410)
            const infoComodosIlum = [];
            const infoComodosTugGeral = [];
            const infoComodosTugCozinha = [];
            const infoComodosTugBanheiro = [];
            const infoComodosTugOutroServico = [];

            // Itera pelos cômodos filtrados
            comodosParaCalcular.forEach((c, idx) => {
                const ptsDoComodo = state.pontosEletricos.filter(pt => pt.comodoId === c.id);
                const tugs = ptsDoComodo.filter(pt => pt.tipo === 'TUG');
                const tues = ptsDoComodo.filter(pt => pt.tipo === 'TUE');
                const ilum = ptsDoComodo.filter(pt => pt.tipo === 'ILUM').reduce((acc, curr) => acc + (curr.pot || 100), 0) || (100 + (c.area >= 6 ? Math.floor((c.area - 6) / 4) * 60 : 0));
                totIlum += ilum;

                const somaTug = tugs.reduce((acc, curr) => acc + curr.pot, 0);
                if (c.tipo === 'servico') {
                    totTugServico += somaTug;
                } else {
                    totTugGeral += somaTug;
                }
                totTug += somaTug;

                // Rota CAD + Subida Vertical de Prumada
                const luzX = c.x + (c.largura * state.escala) / 2;
                const luzY = c.y + (c.comprimento * state.escala) / 2;
                const circNumIndex = idx + 1;
                const wps = state.eletrodutoWaypoints[circNumIndex] || [];
                const pontos = [{ x: qdtCx, y: qdtCy }, ...wps, { x: luzX, y: luzY }];

                let distPxTotal = 0;
                for (let i = 0; i < pontos.length - 1; i++) {
                    distPxTotal += Math.sqrt(Math.pow(pontos[i+1].x - pontos[i].x, 2) + Math.pow(pontos[i+1].y - pontos[i].y, 2));
                }

                // verticais pela passagem do pavimento (laje ou piso), prumada e sobra nas caixas
                const pvC = perfilVerticalComodo(c);
                const rotaMetrosReal = (distPxTotal / state.escala) + pvC.vQuadro + pvC.vLuz + pvC.prumada + 2 * pvC.sobra;

                const pavObj = state.pavimentos.find(p => p.id === c.pavimentoId);
                const nomeAndar = pavObj ? pavObj.nome : 'Térreo';

                const itemComodo = {
                    comodo: c,
                    nome: c.nome,
                    andar: ehUnidadeEspecifica ? `${imovelAtivo.nome} • ${nomeAndar}` : nomeAndar,
                    ilumPot: ilum,
                    tugPot: somaTug,
                    rota: Math.ceil(rotaMetrosReal)
                };

                infoComodosIlum.push(itemComodo);

                if (somaTug > 0) {
                    const nLower = (c.nome || '').toLowerCase();
                    if (c.tipo === 'servico') {
                        if (nLower.includes('banheiro') || nLower.includes('lavabo') || nLower.includes('suíte') || nLower.includes('suite')) {
                            infoComodosTugBanheiro.push(itemComodo);
                        } else if (nLower.includes('cozinha') || nLower.includes('copa') || nLower.includes('gourmet')) {
                            infoComodosTugCozinha.push(itemComodo);
                        } else {
                            infoComodosTugOutroServico.push(itemComodo);
                        }
                    } else {
                        infoComodosTugGeral.push(itemComodo);
                    }
                }

                tues.forEach(tue => {
                    totTue += tue.pot;
                    const tensao = Number(tue.tensao) || 220;
                    // trifásico (3F+N, tensão entre fases da rede): Ib = P / (√3 · V)
                    const tri = NBR5410.ehCargaTrifasica(tue);
                    const ib = NBR5410.correnteDaCarga(tue.pot, tensao, tri ? 3 : 1);

                    const ehResistivo = NBR5410.ehCargaResistiva(tue.nome);
                    const { cabo, disj } = NBR5410.selecionarProtecaoTUE(ib);

                    const cInfo = rotasFisicasProjeto.comodosInfo.find(ci => ci.id === c.id);
                    const tueInfo = (cInfo && cInfo.trechosTue && cInfo.trechosTue[tue.id]) ? cInfo.trechosTue[tue.id] : { rotaFisica: Math.ceil(rotaMetrosReal), distanciaCritica: Math.ceil(rotaMetrosReal) };

                    circuitos.push({
                        num: 0,
                        andar: ehUnidadeEspecifica ? `${imovelAtivo.nome} • ${nomeAndar}` : nomeAndar,
                        nome: `TUE - ${tue.nome} (${c.nome})`,
                        escopo: { tipo: 'pontos', grupo: 'tue:' + tue.id, ids: [tue.id] },
                        tipo: 'TUE',
                        tensao: tensao,
                        potVal: tue.pot,
                        pot: `${tue.pot} W (${tri ? '3F ' : ''}${tensao}V)`,
                        ibVal: ib,
                        ib: `${ib.toFixed(1)} A`,
                        cabo: cabo,
                        disj: disj,
                        curva: ehResistivo ? 'B' : 'C',
                        polos: NBR5410.polosDaCarga(tensao, tri ? 3 : 1, rede),
                        rotaCad: tueInfo.rotaFisica,
                        distanciaCritica: tueInfo.distanciaCritica
                    });
                });
            });

            // Circuitos Base com Divisão Inteligente NBR 5410 (Prevenção de Sobrecorrente em Iluminação e TUG)
            const circsBase = [];
            const tensaoCircBase = rede.fn;                            // F+N: 127 V ou 220 V
            const limitesRede = NBR5410.limitesPotenciaCircuito(rede);
            const LIMITE_POT_ILUM = limitesRede.iluminacao;           // 1200 VA (127 V) / 2000 VA (220 V)
            const LIMITE_POT_TUG = limitesRede.tug;                    // 2200 VA (127 V) / 3800 VA (220 V)

            // 1. ILUMINAÇÃO (Se totIlum > LIMITE_POT_ILUM, divide em múltiplos circuitos com Ib <= 10A)
            if (totIlum > 0) {
                if (totIlum <= LIMITE_POT_ILUM) {
                    circsBase.push({
                        andar: ehUnidadeEspecifica ? `${imovelAtivo.nome} • Iluminação` : (state.regimeImovel === 'imoveis_separados' ? 'Geral Coletivo' : 'Geral (Todos os Andares)'),
                        nome: 'Iluminação Social e Serviços',
                        escopo: { tipo: 'ilum', grupo: 'ilum:todos', ids: idsComodos(infoComodosIlum) },
                        tipo: 'Iluminação',
                        tensao: tensaoCircBase,
                        potVal: totIlum,
                        pot: `${totIlum} VA (${tensaoCircBase}V)`,
                        ibVal: totIlum / tensaoCircBase,
                        ib: `${(totIlum / tensaoCircBase).toFixed(1)} A`,
                        cabo: '1.5 mm²',
                        disj: '10 A',
                        curva: 'C',
                        polos: '1P',
                        rotaCad: rotasFisicasProjeto.ilum.rotaFisica,
                        distanciaCritica: rotasFisicasProjeto.ilum.distanciaCritica
                    });
                } else {
                    const pavsIlum = {};
                    infoComodosIlum.forEach(ci => {
                        const pId = ci.comodo.pavimentoId || 'terreo';
                        if (!pavsIlum[pId]) pavsIlum[pId] = { nome: ci.andar, pot: 0, rota: ci.rota, ids: [] };
                        pavsIlum[pId].ids.push(ci.comodo.id);
                        pavsIlum[pId].pot += ci.ilumPot;
                        pavsIlum[pId].rota = Math.max(pavsIlum[pId].rota, ci.rota);
                    });

                    const numPavsIlum = Object.keys(pavsIlum).length;
                    Object.keys(pavsIlum).forEach(pId => {
                        const pData = pavsIlum[pId];
                        const rotaSubPav = Math.ceil(rotasFisicasProjeto.ilum.rotaFisica / Math.max(1, numPavsIlum));
                        if (pData.pot <= LIMITE_POT_ILUM) {
                            circsBase.push({
                                andar: pData.nome,
                                nome: `Iluminação - ${pData.nome}`,
                                escopo: { tipo: 'ilum', grupo: 'ilum:' + pId, ids: pData.ids },
                                tipo: 'Iluminação',
                                tensao: tensaoCircBase,
                                potVal: pData.pot,
                                pot: `${pData.pot} VA (${tensaoCircBase}V)`,
                                ibVal: pData.pot / tensaoCircBase,
                                ib: `${(pData.pot / tensaoCircBase).toFixed(1)} A`,
                                cabo: '1.5 mm²',
                                disj: '10 A',
                                curva: 'C',
                                polos: '1P',
                                rotaCad: rotaSubPav,
                                distanciaCritica: rotasFisicasProjeto.ilum.distanciaCritica
                            });
                        } else {
                            const numSubIlum = Math.max(2, Math.ceil(pData.pot / LIMITE_POT_ILUM));
                            const potPorSub = Math.ceil(pData.pot / numSubIlum);
                            let remPotIlum = pData.pot;
                            for (let s = 1; s <= numSubIlum; s++) {
                                const pAtual = (s === numSubIlum) ? remPotIlum : Math.min(remPotIlum, potPorSub);
                                remPotIlum -= pAtual;
                                circsBase.push({
                                    andar: pData.nome,
                                    nome: `Iluminação - ${pData.nome} (Circuito ${s})`,
                                    escopo: { tipo: 'ilum', grupo: 'ilum:' + pId, ids: pData.ids },
                                    tipo: 'Iluminação',
                                    tensao: tensaoCircBase,
                                    potVal: pAtual,
                                    pot: `${pAtual} VA (${tensaoCircBase}V)`,
                                    ibVal: pAtual / tensaoCircBase,
                                    ib: `${(pAtual / tensaoCircBase).toFixed(1)} A`,
                                    cabo: '1.5 mm²',
                                    disj: '10 A',
                                    curva: 'C',
                                    polos: '1P',
                                    rotaCad: Math.ceil(rotaSubPav / numSubIlum),
                                    distanciaCritica: rotasFisicasProjeto.ilum.distanciaCritica
                                });
                            }
                        }
                    });
                }
            }

            // 2. TUG GERAL (Salas, Quartos, Circulação) - Se totTugGeral > LIMITE_POT_TUG, divide em blocos com Ib <= 20A
            if (totTugGeral > 0) {
                if (totTugGeral <= LIMITE_POT_TUG) {
                    circsBase.push({
                        andar: ehUnidadeEspecifica ? `${imovelAtivo.nome} • TUGs` : 'Térreo & Superior',
                        nome: 'TUG - Tomadas Gerais (Salas, Quartos, Circulação)',
                        escopo: { tipo: 'pontos', grupo: 'tug:geral', ids: idsTug(infoComodosTugGeral) },
                        tipo: 'TUG',
                        tensao: tensaoCircBase,
                        potVal: totTugGeral,
                        pot: `${Math.round(totTugGeral)} VA (${tensaoCircBase}V)`,
                        ibVal: totTugGeral / tensaoCircBase,
                        ib: `${(totTugGeral / tensaoCircBase).toFixed(1)} A`,
                        cabo: '2.5 mm²',
                        disj: '20 A',
                        curva: 'C',
                        polos: '1P',
                        rotaCad: rotasFisicasProjeto.tugGeral.rotaFisica,
                        distanciaCritica: rotasFisicasProjeto.tugGeral.distanciaCritica
                    });
                } else {
                    const numSubTug = Math.max(2, Math.ceil(totTugGeral / LIMITE_POT_TUG));
                    const potPorSub = Math.ceil(totTugGeral / numSubTug);
                    let remPotTug = totTugGeral;
                    for (let s = 1; s <= numSubTug; s++) {
                        const pAtual = (s === numSubTug) ? remPotTug : Math.min(remPotTug, potPorSub);
                        remPotTug -= pAtual;
                        circsBase.push({
                            andar: ehUnidadeEspecifica ? `${imovelAtivo.nome} • TUGs` : 'Térreo & Superior',
                            nome: `TUG - Tomadas Gerais (Circuito ${s})`,
                            escopo: { tipo: 'pontos', grupo: 'tug:geral', ids: idsTug(infoComodosTugGeral) },
                            tipo: 'TUG',
                            tensao: tensaoCircBase,
                            potVal: pAtual,
                            pot: `${Math.round(pAtual)} VA (${tensaoCircBase}V)`,
                            ibVal: pAtual / tensaoCircBase,
                            ib: `${(pAtual / tensaoCircBase).toFixed(1)} A`,
                            cabo: '2.5 mm²',
                            disj: '20 A',
                            curva: 'C',
                            polos: '1P',
                            rotaCad: Math.ceil(rotasFisicasProjeto.tugGeral.rotaFisica / numSubTug),
                            distanciaCritica: rotasFisicasProjeto.tugGeral.distanciaCritica
                        });
                    }
                }
            }

            // 3. TUG SERVIÇO (Cozinha, Banheiros, Área de Serviço) - REVISÃO ESPECIAL CIRCUITO 3
            if (totTugServico > 0) {
                // A) COZINHA & COPA (Circuito 3)
                const totCozinha = infoComodosTugCozinha.reduce((s, ci) => s + ci.tugPot, 0);
                const andarCozinha = infoComodosTugCozinha.length > 0 ? infoComodosTugCozinha[0].andar : 'Térreo & Serviço';

                if (totCozinha > 0) {
                    if (totCozinha <= LIMITE_POT_TUG) {
                        circsBase.push({
                            andar: andarCozinha,
                            nome: 'TUG - Cozinha e Copa (Bancadas e Eletrodomésticos)',
                            escopo: { tipo: 'pontos', grupo: 'tug:cozinha', ids: idsTug(infoComodosTugCozinha) },
                            tipo: 'TUG',
                            tensao: tensaoCircBase,
                            potVal: totCozinha,
                            pot: `${Math.round(totCozinha)} VA (${tensaoCircBase}V)`,
                            ibVal: totCozinha / tensaoCircBase,
                            ib: `${(totCozinha / tensaoCircBase).toFixed(1)} A`,
                            cabo: '2.5 mm²',
                            disj: '20 A',
                            curva: 'C',
                            polos: '1P',
                            rotaCad: rotasFisicasProjeto.cozinha.rotaFisica,
                            distanciaCritica: rotasFisicasProjeto.cozinha.distanciaCritica
                        });
                    } else {
                        // Se a potência da Cozinha exceder LIMITE_POT_TUG (2200 VA / 17.3A a 127V), divide em múltiplos circuitos com Ib <= 20A
                        const numDivsCozinha = Math.max(2, Math.ceil(totCozinha / LIMITE_POT_TUG));
                        const potPorDiv = Math.ceil(totCozinha / numDivsCozinha);
                        let remCozinha = totCozinha;
                        for (let d = 1; d <= numDivsCozinha; d++) {
                            const pAtual = (d === numDivsCozinha) ? remCozinha : Math.min(remCozinha, potPorDiv);
                            remCozinha -= pAtual;
                            const descNome = (d === 1) ? 'Bancada Principal e Preparo' : (d === 2 ? 'Eletrodomésticos e Copa' : `Circuito ${d}`);
                            circsBase.push({
                                andar: andarCozinha,
                                nome: `TUG - Cozinha (${descNome})`,
                                escopo: { tipo: 'pontos', grupo: 'tug:cozinha', ids: idsTug(infoComodosTugCozinha) },
                                tipo: 'TUG',
                                tensao: tensaoCircBase,
                                potVal: pAtual,
                                pot: `${Math.round(pAtual)} VA (${tensaoCircBase}V)`,
                                ibVal: pAtual / tensaoCircBase,
                                ib: `${(pAtual / tensaoCircBase).toFixed(1)} A`,
                                cabo: '2.5 mm²',
                                disj: '20 A',
                                curva: 'C',
                                polos: '1P',
                                rotaCad: Math.ceil(rotasFisicasProjeto.cozinha.rotaFisica / numDivsCozinha),
                                distanciaCritica: rotasFisicasProjeto.cozinha.distanciaCritica
                            });
                        }
                    }
                }

                // B) BANHEIROS & LAVABOS
                const totBanheiros = infoComodosTugBanheiro.reduce((s, ci) => s + ci.tugPot, 0);
                if (totBanheiros > 0) {
                    if (totBanheiros <= LIMITE_POT_TUG) {
                        const ci0 = infoComodosTugBanheiro[0];
                        circsBase.push({
                            andar: infoComodosTugBanheiro.length === 1 ? ci0.andar : 'Térreo & Superior',
                            nome: infoComodosTugBanheiro.length === 1 ? `TUG - Tomadas ${ci0.nome}` : 'TUG - Tomadas Banheiros e Lavabos',
                            escopo: { tipo: 'pontos', grupo: 'tug:banheiros', ids: idsTug(infoComodosTugBanheiro) },
                            tipo: 'TUG',
                            tensao: tensaoCircBase,
                            potVal: totBanheiros,
                            pot: `${Math.round(totBanheiros)} VA (${tensaoCircBase}V)`,
                            ibVal: totBanheiros / tensaoCircBase,
                            ib: `${(totBanheiros / tensaoCircBase).toFixed(1)} A`,
                            cabo: '2.5 mm²',
                            disj: '20 A',
                            curva: 'C',
                            polos: '1P',
                            rotaCad: rotasFisicasProjeto.banheiro.rotaFisica,
                            distanciaCritica: rotasFisicasProjeto.banheiro.distanciaCritica
                        });
                    } else {
                        infoComodosTugBanheiro.forEach(ci => {
                            circsBase.push({
                                andar: ci.andar,
                                nome: `TUG - Tomadas ${ci.nome}`,
                                escopo: { tipo: 'pontos', grupo: 'tug:comodo:' + ci.comodo.id, ids: idsTug([ci]) },
                                tipo: 'TUG',
                                tensao: tensaoCircBase,
                                potVal: ci.tugPot,
                                pot: `${Math.round(ci.tugPot)} VA (${tensaoCircBase}V)`,
                                ibVal: ci.tugPot / tensaoCircBase,
                                ib: `${(ci.tugPot / tensaoCircBase).toFixed(1)} A`,
                                cabo: '2.5 mm²',
                                disj: '20 A',
                                curva: 'C',
                                polos: '1P',
                                rotaCad: Math.ceil(rotasFisicasProjeto.banheiro.rotaFisica / Math.max(1, infoComodosTugBanheiro.length)),
                                distanciaCritica: rotasFisicasProjeto.banheiro.distanciaCritica
                            });
                        });
                    }
                }

                // C) DEMAIS CÔMODOS DE SERVIÇO
                const totOutroServico = infoComodosTugOutroServico.reduce((s, ci) => s + ci.tugPot, 0);
                if (totOutroServico > 0) {
                    infoComodosTugOutroServico.forEach(ci => {
                        circsBase.push({
                            andar: ci.andar,
                            nome: `TUG - Tomadas ${ci.nome}`,
                            escopo: { tipo: 'pontos', grupo: 'tug:comodo:' + ci.comodo.id, ids: idsTug([ci]) },
                            tipo: 'TUG',
                            tensao: tensaoCircBase,
                            potVal: ci.tugPot,
                            pot: `${Math.round(ci.tugPot)} VA (${tensaoCircBase}V)`,
                            ibVal: ci.tugPot / tensaoCircBase,
                            ib: `${(ci.tugPot / tensaoCircBase).toFixed(1)} A`,
                            cabo: '2.5 mm²',
                            disj: '20 A',
                            curva: 'C',
                            polos: '1P',
                            rotaCad: ci.rota || 24,
                            distanciaCritica: 16
                        });
                    });
                }

                // D) FALLBACK DE SERVIÇO
                if (totCozinha === 0 && totBanheiros === 0 && totOutroServico === 0) {
                    let remPot = totTugServico;
                    let circCountServ = 1;
                    while (remPot > 0) {
                        const pPart = Math.min(remPot, LIMITE_POT_TUG);
                        circsBase.push({
                            andar: ehUnidadeEspecifica ? `${imovelAtivo.nome} • TUG Serviço` : 'Térreo & Serviço',
                            nome: `TUG - Tomadas de Serviço (Circuito ${circCountServ++})`,
                            escopo: { tipo: 'pontos', grupo: 'tug:servico', ids: state.pontosEletricos.filter(p => p.tipo === 'TUG' && comodosParaCalcular.some(c => c.id === p.comodoId && c.tipo === 'servico')).map(p => p.id) },
                            tipo: 'TUG',
                            tensao: tensaoCircBase,
                            potVal: pPart,
                            pot: `${Math.round(pPart)} VA (${tensaoCircBase}V)`,
                            ibVal: pPart / tensaoCircBase,
                            ib: `${(pPart / tensaoCircBase).toFixed(1)} A`,
                            cabo: '2.5 mm²',
                            disj: '20 A',
                            curva: 'C',
                            polos: '1P',
                            rotaCad: 24,
                            distanciaCritica: 16
                        });
                        remPot -= pPart;
                    }
                }
            }

            // circuitos dedicados da automação residencial (rack/nobreak e painel), quando incluída no projeto
            const circuitosAutomacao = (!ehUnidadeEspecifica && typeof obterCircuitosAutomacao === 'function') ? obterCircuitosAutomacao() : [];
            const circuitosFinais = [...circsBase, ...circuitos, ...circuitosAutomacao];
            let somaMetragensFinais = 0;

            // Distribuição dos circuitos nas fases equilibrando a carga (js/nbr5410.js)
            const distFases = NBR5410.distribuirFases(circuitosFinais, state.alimentacaoExterna && state.alimentacaoExterna.sistema);
            state.cargaPorFaseNBR = distFases;

            circuitosFinais.forEach((circ, index) => {
                circ.num = index + 1;
                circ.fase = distFases.fases[index];

                const compManual = state.comprimentosManuaisCircuitos[circ.num];
                if (compManual !== undefined) {
                    circ.rota = compManual;
                    circ.ehManual = true;
                } else {
                    circ.rota = circ.rotaCad;
                    circ.ehManual = false;
                }
                somaMetragensFinais += circ.rota;

                // Dimensionamento normativo (Ib ≤ In ≤ Iz, queda de tensão, eletroduto, IDR) — js/nbr5410.js
                NBR5410.dimensionarCircuito(circ, obterParametrosNBR());
                if (circ.polos === '3P' && distFases.sistema !== 'trifasico') {
                    circ.alertas.push('Circuito trifásico (3F+N) exige alimentação trifásica: altere o sistema de alimentação do Ponto de Entrada para trifásico ou use um aparelho monofásico/bifásico.');
                    circ.conforme = false;
                }
                if (distFases.sistema === 'monofasico' && circ.polos === '2P') {
                    circ.alertas.push(rede.fn === 220
                        ? `Sistema monofásico não tem duas fases: o aparelho de ${rede.ff} V entre fases exige sistema bifásico ou trifásico (ou use a versão de 220 V, F+N).`
                        : 'Sistema monofásico não tem duas fases: com rede de 127 V, use aparelho de 127 V ou altere o sistema para bifásico; na rede 220/380 V (premissas) o aparelho de 220 V é ligado entre fase e neutro.');
                    circ.conforme = false;
                }
            });

            state.circuitosCalculados = circuitosFinais;
            state.circuitos = circuitosFinais;

            // Circuito de cada ponto para o diagrama unifilar da aba Instalações (js/unifilar.js)
            if (typeof Unifilar !== 'undefined') {
                const potIlum = {};
                infoComodosIlum.forEach(ci => { potIlum[ci.comodo.id] = ci.ilumPot; });
                const potPonto = {};
                state.pontosEletricos.forEach(pt => { potPonto[pt.id] = Number(pt.pot) || 0; });
                const mapa = Unifilar.atribuirCircuitos(circuitosFinais, potIlum, potPonto);
                mapa.polos = {};
                circuitosFinais.forEach(c => { mapa.polos[c.num] = c.polos; });
                state.unifilar = mapa;

                // DR 30 mA obrigatório pelos ambientes que o circuito atende (NBR 5410 5.1.3.2.2):
                // a) locais com banheira ou chuveiro (inclusive a iluminação); b)/c) tomadas em áreas
                // externas ou que possam alimentar equipamentos no exterior (varanda, garagem...);
                // d) tomadas de cozinha, copa, lavanderia, área de serviço e áreas molhadas.
                // TUE: mantido sempre com DR (critério conservador do projeto).
                const comodoPorId = new Map(state.comodos.map(c => [c.id, c]));
                const pontoPorId = new Map(state.pontosEletricos.map(pt => [pt.id, pt]));
                const ehExterno = n => /varanda|sacada|garag|extern|quintal|jardim|piscina|churrasq|gourmet|terra[çc]o|[áa]rea descoberta/i.test(n || '');
                const temChuveiro = c => /banh|ducha/i.test(c.nome || '') ||
                    state.pontosEletricos.some(pt => pt.comodoId === c.id && pt.tipo === 'TUE' && /chuveiro|banheira|hidromassagem|ducha/i.test(pt.nome || ''));
                circuitosFinais.forEach(circ => {
                    let obrig = circ.tipo === 'TUE';
                    if (circ.tipo === 'Iluminação') {
                        obrig = Object.keys(mapa.ilumPorComodo).some(id => mapa.ilumPorComodo[id] === circ.num && comodoPorId.has(isNaN(id) ? id : Number(id)) && temChuveiro(comodoPorId.get(isNaN(id) ? id : Number(id))));
                    } else if (circ.tipo === 'TUG') {
                        obrig = Object.keys(mapa.porPonto).some(id => {
                            if (mapa.porPonto[id] !== circ.num) return false;
                            const pt = pontoPorId.get(id) || pontoPorId.get(Number(id));
                            const c = pt && comodoPorId.get(pt.comodoId);
                            if (!c) return false;
                            const classe = NBR5410.classificarAmbiente(c.nome);
                            return classe === 'banheiro' || classe === 'cozinha_servico' || classe === 'varanda' || ehExterno(c.nome);
                        });
                    }
                    circ.drObrigatorio = obrig;
                    circ.idrTag = obrig ? 'IDR 30mA (Obrigatório)' : 'IDR 30mA (Geral)';
                });
            }

            // Eletroduto do trecho compartilhado pelos circuitos agrupados (premissa do FCA)
            const parNBR = obterParametrosNBR();
            state.trechoAgrupadoNBR = (parNBR.circuitosAgrupados > 1)
                ? NBR5410.dimensionarTrechoAgrupado(circuitosFinais, parNBR.circuitosAgrupados) : null;
            const lblFases = document.getElementById('lblCargaFasesNBR');
            if (lblFases && state.cargaPorFaseNBR) {
                const d = state.cargaPorFaseNBR;
                const pct = Math.round(d.desequilibrio * 100);
                const cor = pct <= 10 ? 'text-emerald-300' : (pct <= 20 ? 'text-amber-300' : 'text-red-300');
                lblFases.innerHTML = `<i class="fa-solid fa-scale-balanced text-sky-400"></i> Carga por fase: ` +
                    Object.entries(d.cargaPorFase).map(([f, v]) => `<strong class="font-mono">${f} ${(v / 1000).toFixed(2).replace('.', ',')} kVA</strong>`).join(' • ') +
                    (Object.keys(d.cargaPorFase).length > 1 ? ` — desequilíbrio <strong class="font-mono ${cor}">${pct}%</strong>` : '');
            }
            const lblTrecho = document.getElementById('lblTrechoAgrupadoNBR');
            if (lblTrecho) {
                const t = state.trechoAgrupadoNBR;
                lblTrecho.innerHTML = t
                    ? `<i class="fa-solid fa-circle-info text-sky-400"></i> Trecho com ${t.circuitos.length} circuitos agrupados (pior caso: C${t.circuitos.join(', C')}): ` +
                      `<strong class="font-mono ${t.atende ? 'text-emerald-300' : 'text-red-300'}">${t.rotulo}</strong> de ocupação ` +
                      `(${t.numCondutores} condutores, máx. ${Math.round(t.taxaMax * 100)}% — item 6.2.11.1.6)`
                    : '';
            }

            // Renderiza Tabela de Circuitos
            const tb = document.getElementById('tbCircuitos');
            if (tb) {
                tb.innerHTML = '';
                circuitosFinais.forEach(c => {
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-slate-800/40';
                    tr.innerHTML = `
                        <td class="p-3 font-bold text-amber-400">${c.num}</td>
                        <td class="p-3 font-semibold text-slate-300 font-mono text-[11px]">${c.andar}</td>
                        <td class="p-3 font-semibold text-white">${c.nome}${(c.alertas && c.alertas.length) ? `<div class="mt-1 text-[10px] font-bold text-red-300"><i class="fa-solid fa-triangle-exclamation"></i> ${c.alertas.join(' ')}</div>` : ''}</td>
                        <td class="p-3"><span class="px-2 py-0.5 rounded border text-[10px] font-bold ${c.tipo === 'TUE' ? 'bg-blue-900/40 text-blue-300 border-blue-500/40' : (c.tipo === 'TUG' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-amber-300 border-amber-500/40')}">${c.tipo}</span></td>
                        <td class="p-3 font-mono text-slate-300">${c.pot}</td>
                        <td class="p-3 font-mono text-slate-300">${c.ib}</td>
                        <td class="p-3 font-bold font-mono ${c.ampacidadeOk ? 'text-emerald-400' : 'text-red-400'}" title="Iz corrigida ${c.izCorrigida.toFixed(1)} A (FCA ${c.fca.toFixed(2)} × FCT ${c.fct.toFixed(2)}) • PE ${c.secaoPE} mm² (Tab. 58)">${c.cabo}</td>
                        <td class="p-3 font-bold font-mono text-amber-300">${c.disj}</td>
                        <td class="p-3 font-bold text-amber-400">Curva ${c.curva}</td>
                        <td class="p-3"><span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 border border-slate-700 text-slate-300">Fase ${c.fase}</span></td>
                        <td class="p-3">
                            <div class="flex items-center gap-1.5" title="Metragem física de cabos para compra: ${c.rota}m • Distância crítica (NBR 5410 ΔV): ${Math.round(c.distanciaCritica || c.rota)}m">
                                <input type="number" step="0.5" min="1" value="${c.rota}" 
                                    onchange="definirComprimentoManualCircuito(${c.num}, this.value)"
                                    class="w-16 bg-slate-950 border ${c.ehManual ? 'border-amber-500/80 text-amber-300 font-bold' : 'border-slate-800 text-blue-400'} font-mono px-1.5 py-1 rounded text-xs focus:ring-1 focus:ring-amber-400 outline-none text-center">
                                <span class="text-slate-400 font-mono text-xs">m</span>
                                ${c.ehManual ? `<button onclick="restaurarComprimentoCadCircuito(${c.num})" class="text-amber-400 hover:text-amber-300 p-0.5" title="Restaurar rota física do CAD (${c.rotaCad}m)"><i class="fa-solid fa-rotate-left text-[10px]"></i></button>` : `<span class="text-[9px] bg-slate-800 text-slate-500 px-1 py-0.5 rounded font-mono" title="Distância crítica de queda de tensão: ${Math.round(c.distanciaCritica || c.rota)}m">CAD</span>`}
                            </div>
                        </td>
                        <td class="p-3">
                            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${c.quedaTensaoOk ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/40'}">
                                ${c.quedaStatus}
                            </span>
                        </td>
                        <td class="p-3">
                            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-950 text-sky-300 border border-slate-700">
                                ${c.eletroduto}
                            </span>
                        </td>
                        <td class="p-3">
                            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${c.idrTag.includes('Obrigatório') ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40' : 'bg-slate-950 text-slate-400 border border-slate-800'}">
                                ${c.idrTag}
                            </span>
                        </td>
                    `;
                    tb.appendChild(tr);
                });
            }

            // =====================================================================
            // DIMENSIONAMENTO DA DEMANDA CONFORME NORMA DA CONCESSIONÁRIA LOCAL (NBR 5410 ITEM 9.5.2)
            // =====================================================================
            const sistemaAlimAtual = (ehUnidadeEspecifica && imovelAtivo && imovelAtivo.sistema) ? imovelAtivo.sistema : ((state.alimentacaoExterna && state.alimentacaoExterna.sistema) || state.sistemaAlimentacao || 'bifasico');
            const todosTuesDoProjeto = (ehUnidadeEspecifica && imovelAtivo)
                ? state.pontosEletricos.filter(p => p.tipo === 'TUE' && comodosParaCalcular.some(c => c.id === p.comodoId))
                : state.pontosEletricos.filter(p => p.tipo === 'TUE');

            const calculoDemanda = calcularDemandaConcessionaria(totIlum, totTug, todosTuesDoProjeto, sistemaAlimAtual, state.concessionariaId || 'cpfl');
            dadosUltimaDemandaCalculada = calculoDemanda;

            const potTotalW = calculoDemanda.cargaInstaladaTotalKW * 1000.0;
            const potDemandaKW = calculoDemanda.demandaTotalKW;
            const potDemandakVA = calculoDemanda.demandaTotalkVA;
            const tensaoAlim = (sistemaAlimAtual === 'monofasico') ? rede.fn : rede.ff;
            const corrGeral = (potDemandaKW * 1000) / tensaoAlim;

            // Disjuntor e Cabo Geral calculados segundo Norma da Concessionária e NBR 5410
            let caboGeral = calculoDemanda.categoriaAtend.cabo || '10.0 mm²';
            let disjGeral = calculoDemanda.categoriaAtend.disj || '50 A';

            // Atualiza o painel da Concessionária
            const elNomeConc = document.getElementById('lblNomeConcessionaria');
            const elNormaConc = document.getElementById('lblNormaConcessionaria');
            const elCargaKW = document.getElementById('lblCargaInstaladakW');
            const elCargakVA = document.getElementById('lblCargaInstaladakVA');
            const elFdGlobal = document.getElementById('lblFatorDemandaGlobal');
            const elDemKW = document.getElementById('lblDemandaCalculadakW');
            const elDemkVA = document.getElementById('lblDemandaCalculadakVA');
            const elCatAtend = document.getElementById('lblCategoriaAtendimento');
            const elDisjConc = document.getElementById('lblDisjuntorConcessionaria');
            const elRamalConc = document.getElementById('lblRamalConcessionaria');
            const elEletroConc = document.getElementById('lblEletrodutoEntradaConc');

            if (elNomeConc) elNomeConc.innerText = calculoDemanda.concessionaria.nome;
            if (elNormaConc) elNormaConc.innerText = calculoDemanda.concessionaria.norma;
            if (elCargaKW) elCargaKW.innerText = calculoDemanda.cargaInstaladaTotalKW.toFixed(2) + ' kW';
            if (elCargakVA) elCargakVA.innerText = (calculoDemanda.cargaInstaladaTotalKW / 0.95).toFixed(2) + ' kVA';
            if (elFdGlobal) elFdGlobal.innerText = (calculoDemanda.fatorDemandaGlobal * 100).toFixed(1) + ' %';
            if (elDemKW) elDemKW.innerText = calculoDemanda.demandaTotalKW.toFixed(2) + ' kW';
            if (elDemkVA) elDemkVA.innerText = calculoDemanda.demandaTotalkVA.toFixed(2) + ' kVA';
            if (elCatAtend) elCatAtend.innerText = calculoDemanda.categoriaAtend.id + ' (' + calculoDemanda.categoriaAtend.tipo + ')';
            if (elDisjConc) elDisjConc.innerText = calculoDemanda.categoriaAtend.disj;
            if (elRamalConc) elRamalConc.innerText = calculoDemanda.categoriaAtend.cabo;
            if (elEletroConc) elEletroConc.innerText = 'Eletroduto ' + calculoDemanda.categoriaAtend.tubo;

            const alimCx = state.alimentacaoExterna.x + state.alimentacaoExterna.w / 2;
            const alimCy = state.alimentacaoExterna.y + state.alimentacaoExterna.h / 2;
            const distPxAlim = Math.sqrt(Math.pow(qdtCx - alimCx, 2) + Math.pow(qdtCy - alimCy, 2));
            const distCadAlim = Math.max(4, Math.ceil((distPxAlim / state.escala) + 3.0));
            const distAlimUsada = (ehUnidadeEspecifica && imovelAtivo && imovelAtivo.distancia) ? imovelAtivo.distancia : ((state.alimentacaoExterna && state.alimentacaoExterna.distanciaManual) || distCadAlim);

            let sistemaUsado = (state.alimentacaoExterna && state.alimentacaoExterna.sistema) || 'bifasico';
            if (ehUnidadeEspecifica && imovelAtivo && imovelAtivo.sistema) {
                sistemaUsado = imovelAtivo.sistema;
            }

            let numCondutores = 4;
            let detCondutores = '2x Fases, 1x Neutro, 1x Terra';
            if (sistemaUsado === 'trifasico') {
                numCondutores = 5;
                detCondutores = '3x Fases, 1x Neutro, 1x Terra';
            } else if (sistemaUsado === 'monofasico') {
                numCondutores = 3;
                detCondutores = '1x Fase, 1x Neutro, 1x Terra';
            }

            const totalMetrosAlimentador = numCondutores * distAlimUsada;

            const elDistAlimInput = document.getElementById('numDistAlimExterna');
            if (elDistAlimInput && state.alimentacaoExterna.distanciaManual) {
                elDistAlimInput.value = state.alimentacaoExterna.distanciaManual;
            } else if (elDistAlimInput) {
                elDistAlimInput.placeholder = distCadAlim;
            }

            const prefixoDesc = (ehUnidadeEspecifica && imovelAtivo) ? `[${imovelAtivo.nome || 'Unidade'}] ` : (state.regimeImovel === 'imoveis_separados' ? '[Centro Medição Coletivo] ' : '');

            document.getElementById('lblQtdCondutoresRamal').innerText = `${numCondutores} Condutores (${sistemaUsado.toUpperCase()})`;
            document.getElementById('lblDetFiosRamal').innerText = `${prefixoDesc}${detCondutores}`;
            document.getElementById('lblBitolaAlimExterna').innerText = caboGeral;
            document.getElementById('lblMetragemTotalCaboAlim').innerText = `${totalMetrosAlimentador} m`;
            document.getElementById('lblFormulaCaboAlim').innerText = `${numCondutores} condutores × ${distAlimUsada}m`;

            // Alimentador conforme a NBR 5410: Iz (B1, condutores carregados do sistema) ≥ disjuntor
            // geral, PE pela Tabela 58 e queda total (alimentador + terminal) ≤ 5% — a seção da
            // concessionária é mantida como mínimo
            const quedaTerminalMax = circuitosFinais.reduce((m, c) => Math.max(m, Number(c.deltaVPct) || 0), 0);
            const alimNBR = NBR5410.dimensionarAlimentador({
                inDisjuntor: parseInt(disjGeral, 10) || 0,
                secaoMinima: parseFloat(caboGeral) || 0,
                sistema: sistemaUsado,
                comprimento: distAlimUsada,
                demandaKVA: calculoDemanda.demandaTotalkVA,
                quedaTerminalMaxPct: quedaTerminalMax,
                temperaturaAmbiente: obterParametrosNBR().temperaturaAmbiente,
                tensaoFN: rede.fn,
                metodoQueda: obterParametrosNBR().metodoQueda,
                isolacao: obterParametrosNBR().isolacao
            });
            state.alimentadorNBR = alimNBR;
            caboGeral = NBR5410.formatarSecao(alimNBR.secao).replace(/^(\d+) mm²$/, '$1.0 mm²');
            document.getElementById('lblBitolaAlimExterna').innerText = caboGeral;
            const notaAlim = document.getElementById('lblNotaAlimentadorNBR');
            if (notaAlim) {
                const conc = calculoDemanda.concessionaria;
                const avisosRede = [];
                if (!calculoDemanda.atendeRede) avisosRede.push(`<span class="block text-rose-400 mt-0.5">${escHtml(conc.nome)} informa tensão ${escHtml(conc.tensao)}: confirme com a distribuidora se a rede ${rede.rotulo} existe no local.</span>`);
                else if (calculoDemanda.categoriasEstimadas) avisosRede.push(`<span class="block text-amber-400 mt-0.5">Categorias de ${escHtml(conc.nome)} cadastradas para outra rede: limites de demanda estimados para ${rede.rotulo} pela razão das tensões (confira a norma ${escHtml(conc.norma)}).</span>`);
                notaAlim.innerHTML = `Rede ${rede.rotulo} • Iz ${alimNBR.izCorrigida.toFixed(0)} A (B1, ${alimNBR.condutoresCarregados} carregados) • ΔV ${alimNBR.quedaPct.toFixed(1)}% (total ${alimNBR.quedaTotalPct.toFixed(1)}% ≤ 5%)`
                    + (alimNBR.aumentouPorNorma ? ` • <span class="text-amber-400">maior que o da concessionária (${calculoDemanda.categoriaAtend.cabo})</span>` : '')
                    + avisosRede.join('')
                    + alimNBR.alertas.map(a => `<span class="block text-rose-400 mt-0.5">${escHtml(a)}</span>`).join('');
            }
            document.getElementById('lblCaboGeral').innerText = caboGeral;
            document.getElementById('lblTerraGeral').innerText = NBR5410.formatarSecao(alimNBR.secaoPE).replace(/^(\d+) mm²$/, '$1.0 mm²');
            document.getElementById('lblDisjGeral').innerText = disjGeral;
            // IDRs comerciais do quadro (mesmo planejamento usado no desenho do quadro e nos materiais)
            state.planoIdr = NBR5410.planejarIdrs({
                circuitos: circuitosFinais, sistema: sistemaUsado, configIdr: state.tipoConfigIdr || 'idr_geral',
                esquema: state.esquemaAterramento || 'TN-S', inGeral: parseInt(disjGeral, 10) || 0, modelo: state.modeloIdr,
                tensaoFF: rede.ff
            });
            const idrsPlano = state.planoIdr.idrs;
            document.getElementById('lblIdrGeral').innerText = !idrsPlano.length
                ? ((state.esquemaAterramento === 'TN-C') ? 'Sem DR (TN-C)' : 'DDR em cada circuito')
                : `${idrsPlano.length > 1 ? idrsPlano.length + ' × ' : ''}IDR ${idrsPlano[0].polos} ${idrsPlano[0].corrente} A / ${idrsPlano[0].sensibilidade} mA`;

            // Quantitativo Consolidado de Materiais Avançado NBR 5410
            const materiaisDetalhados = calcularQuantitativoMateriaisCompleto(comodosParaCalcular, circuitosFinais, calculoDemanda);
            renderizarTabelaMateriaisCompleta(materiaisDetalhados);

            // Resumo legado mantido para compatibilidade total com DOM e testes
            const metros15 = Math.ceil(somaMetragensFinais * 0.45 * 3);
            const metros25 = Math.ceil(somaMetragensFinais * 0.7 * 3);
            const metros40 = Math.ceil(somaMetragensFinais * 0.3 * 3);

            const metrosPrumadaVertical = (state.prumadaAtiva !== false && state.regimeImovel === 'mesmo_imovel') ? (state.pavimentos.length - 1) * 3.0 : 0;
            const descRamal = (ehUnidadeEspecifica && imovelAtivo) 
                ? `Alimentador Individual (${imovelAtivo.nome || 'Unidade'} → Medidor/QDT)` 
                : (state.regimeImovel === 'imoveis_separados' ? 'Ramal Coletivo de Entrada (Poste Concessionária → Centro de Medição)' : 'Ramal Alimentação Externa → QDT');

            const elListaCabos = document.getElementById('listaCabos');
            if (elListaCabos) {
                elListaCabos.innerHTML = `
                    <li class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <div>
                            <span class="block font-semibold">Cabo ${caboGeral} (${descRamal})</span>
                            <span class="text-[10px] text-slate-400">${numCondutores} condutores × ${distAlimUsada}m (${sistemaUsado})</span>
                        </div>
                        <strong class="text-emerald-400 text-sm self-center font-mono">${totalMetrosAlimentador} m</strong>
                    </li>
                    ${metrosPrumadaVertical > 0 ? `
                    <li class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <div>
                            <span class="block font-semibold">Cabo 6.0/10.0 mm² (Prumada Vertical entre Pavimentos)</span>
                            <span class="text-[10px] text-slate-400">Alimentação dos sub-quadros dos andares superiores (${metrosPrumadaVertical}m)</span>
                        </div>
                        <strong class="text-emerald-400 text-sm self-center font-mono">${metrosPrumadaVertical * numCondutores} m</strong>
                    </li>` : ''}
                    <li class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <div>
                            <span class="block font-semibold">Cabo 1.5 mm² (Iluminação ${(ehUnidadeEspecifica && imovelAtivo) ? imovelAtivo.nome : 'Geral'})</span>
                            <span class="text-[10px] text-slate-400">Circuitos terminais de iluminação</span>
                        </div>
                        <strong class="text-emerald-400 text-sm self-center font-mono">${metros15} m</strong>
                    </li>
                    <li class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <div>
                            <span class="block font-semibold">Cabo 2.5 mm² (TUGs e Aparelhos Gerais)</span>
                            <span class="text-[10px] text-slate-400">Tomadas de uso geral</span>
                        </div>
                        <strong class="text-emerald-400 text-sm self-center font-mono">${metros25} m</strong>
                    </li>
                    <li class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <div>
                            <span class="block font-semibold">Cabo 4.0/6.0/10.0 mm² (Chuveiros, Ar Cond., Fornos TUE)</span>
                            <span class="text-[10px] text-slate-400">Cargas de alta potência selecionadas</span>
                        </div>
                        <strong class="text-emerald-400 text-sm self-center font-mono">${metros40} m</strong>
                    </li>
                `;
            }

            const qtdQuadrosDesc = (ehUnidadeEspecifica && imovelAtivo) 
                ? '1 Unidade (QDT ' + (imovelAtivo.nome || 'Unidade') + ')' 
                : (state.regimeImovel === 'imoveis_separados' ? `${(state.imoveis || []).length} QDTs Individuais + 1 Centro Medição Coletivo` : `${(state.pavimentos || []).length} Unidades`);

            const pavsAtualizar = (state.pavimentos && Array.isArray(state.pavimentos)) ? state.pavimentos : [];
            const qtdAndaresChao = pavsAtualizar.filter(p => (p.tipoPassagemCabos === 'chao' || (!p.tipoPassagemCabos && state.tipoPassagemCabos === 'chao'))).length;
            const ehInfraUnica = (qtdAndaresChao > 1 || (qtdAndaresChao >= 1 && pavsAtualizar.length > 1));
            const fatorEletroduto = ehInfraUnica ? 0.75 : 1.0;
            const metragemEletrodutosFinal = Math.ceil((somaMetragensFinais * 1.15) * fatorEletroduto);
            const descEletroduto = ehInfraUnica 
                ? 'Infraestrutura Única Compartilhada (Laje Contrapiso/Teto - Economia de 25% NBR 5410)' 
                : (qtdAndaresChao > 0 ? 'Distribuição pelo Chão / Contrapiso' : 'Distribuição interna pela laje de teto / forro');

            const elListaQuadros = document.getElementById('listaQuadros');
            if (elListaQuadros) {
                elListaQuadros.innerHTML = `
                    <li class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <div>
                            <span class="block font-semibold">Eletroduto Flexível 3/4" (25mm)</span>
                            <span class="text-[10px] ${ehInfraUnica ? 'text-emerald-400 font-bold' : 'text-slate-400'}">${descEletroduto}</span>
                        </div>
                        <strong class="text-amber-400 text-sm self-center font-mono">${metragemEletrodutosFinal} m</strong>
                    </li>
                    <li class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <div>
                            <span class="block font-semibold">Quadro de Distribuição QDT DIN</span>
                            <span class="text-[10px] text-slate-400">Sugestão NBR 5410: ${document.getElementById('txtSugestaoModeloCaixa') ? document.getElementById('txtSugestaoModeloCaixa').innerText : '24 Módulos DIN'}</span>
                        </div>
                        <strong class="text-amber-400 text-sm font-mono self-center">${qtdQuadrosDesc}</strong>
                    </li>
                    <li class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <span>Disjuntor Geral Termomagnético Curva C</span>
                        <strong class="text-amber-400 text-sm font-mono">1x ${disjGeral}</strong>
                    </li>
                    <li class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <span>Dispositivos de Proteção contra Surtos (DPS 275V)</span>
                        <strong class="text-amber-400 text-sm font-mono">${(numCondutores === 5 ? 4 : 3) * (ehUnidadeEspecifica ? 1 : ((state.pavimentos && state.pavimentos.length) || 1))} unidades</strong>
                    </li>
                `;
            }

            const totTugQtd = state.pontosEletricos.filter(p => comodosParaCalcular.some(c => c.id === p.comodoId) && p.tipo === 'TUG').length;
            const totTueQtd = state.pontosEletricos.filter(p => comodosParaCalcular.some(c => c.id === p.comodoId) && p.tipo === 'TUE').length;
            const totCaixas4x2 = totTugQtd + totTueQtd;
            const totCaixasOcto = comodosParaCalcular.length;

            const elListaPontos = document.getElementById('listaPontosTomadas');
            if (elListaPontos) {
                elListaPontos.innerHTML = `
                    <li class="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                        <div>
                            <span class="font-semibold block">Tomadas TUG 10A / 20A</span>
                            <span class="text-[10px] text-slate-400">NBR 14136 (${(ehUnidadeEspecifica && imovelAtivo) ? imovelAtivo.nome : 'Unidades Totais'})</span>
                        </div>
                        <strong class="text-emerald-400 font-mono text-sm">${totTugQtd} un</strong>
                    </li>
                    <li class="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                        <div>
                            <span class="font-semibold block">Tomadas Especiais TUE</span>
                            <span class="text-[10px] text-slate-400">Chuveiros, Ar Cond., Hidros</span>
                        </div>
                        <strong class="text-blue-400 font-mono text-sm">${totTueQtd} un</strong>
                    </li>
                    <li class="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                        <div>
                            <span class="font-semibold block">Caixas 4x2 Embutir</span>
                            <span class="text-[10px] text-slate-400">Paredes dos cômodos</span>
                        </div>
                        <strong class="text-amber-400 font-mono text-sm">${totCaixas4x2} un</strong>
                    </li>
                    <li class="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                        <div>
                            <span class="font-semibold block">Caixas Octogonais 4x4 (Teto)</span>
                            <span class="text-[10px] text-slate-400">Lajes dos cômodos</span>
                        </div>
                        <strong class="text-amber-400 font-mono text-sm">${totCaixasOcto} un</strong>
                    </li>
                `;
            }

            renderizarQuadroDIN(circuitosFinais);
        }


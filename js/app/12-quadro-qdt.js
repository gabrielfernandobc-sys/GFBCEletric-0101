/* PRO-ELÉTRICA CAD — 12-quadro-qdt.js
   Simulação visual do quadro de distribuição e fiação virtual.
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        // =========================================================================
        // SIMULAÇÃO REAL DO QUADRO DE DISTRIBUIÇÃO (NBR 5410, IEC 60439 & DIN 43880)
        // FILEIRAS DE 12 PÓLOS, ESQUEMAS DE ATERRAMENTO, CONFIGURAÇÃO IDR & FIAÇÃO VIRTUAL
        // =========================================================================

        function alterarEsquemaAterramento(novoEsquema) {
            state.esquemaAterramento = novoEsquema;
            renderizarQuadroDIN(state.circuitosCalculados);
        }

        function alterarTipoConfigIdr(novoTipo) {
            state.tipoConfigIdr = novoTipo;
            renderizarQuadroDIN(state.circuitosCalculados);
        }

        function alternarFiacaoVirtualQuadro() {
            state.modoFiacaoQuadro = !state.modoFiacaoQuadro;
            const svg = document.getElementById('svgFiacaoQuadro');
            const btn = document.getElementById('btnToggleFiacaoQuadro');
            if (svg) {
                svg.style.display = state.modoFiacaoQuadro ? 'block' : 'none';
            }
            if (btn) {
                btn.className = state.modoFiacaoQuadro 
                    ? 'px-3 py-1.5 rounded-lg font-bold border transition flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'px-3 py-1.5 rounded-lg font-bold border transition flex items-center gap-1.5 bg-slate-800 text-slate-400 border-slate-700 hover:text-white';
                btn.innerHTML = `<i class="fa-solid fa-bezier-curve"></i> <span>Fiação Virtual: <strong>${state.modoFiacaoQuadro ? 'Ativa' : 'Oculta'}</strong></span>`;
            }
        }

        function alternarCanaletasQuadro() {
            state.modoCanaletasQuadro = (state.modoCanaletasQuadro === 'abertas') ? 'fechadas' : 'abertas';
            const lbl = document.getElementById('lblModoCanaletas');
            if (lbl) {
                lbl.innerText = (state.modoCanaletasQuadro === 'abertas') ? 'Abertas (Fios Visíveis)' : 'Fechadas (Tampadas)';
            }
            renderizarQuadroDIN(state.circuitosCalculados);
        }

        function alternarVisualQuadro() {
            state.modoVisualQuadro = (state.modoVisualQuadro === 'interno') ? 'espelho' : 'interno';
            const lbl = document.getElementById('lblModoVisual');
            if (lbl) {
                lbl.innerText = (state.modoVisualQuadro === 'interno') ? 'Quadro Interno' : 'Espelho Protetor';
            }
            renderizarQuadroDIN(state.circuitosCalculados);
        }

        function abrirModalAjudaEsquemas() {
            const m = document.getElementById('modalAjudaEsquemas');
            if (m) m.classList.remove('hidden');
        }

        function fecharModalAjudaEsquemas() {
            const m = document.getElementById('modalAjudaEsquemas');
            if (m) m.classList.add('hidden');
        }

        function destacarCircuitoQuadro(cNum) {
            state.circuitoDestaqueQuadro = cNum;
            const lbl = document.getElementById('lblStatusInspecaoCircuito');
            if (lbl) {
                lbl.innerHTML = `<i class="fa-solid fa-bolt text-amber-400 animate-pulse"></i> Inspecionando Circuito C${cNum} (Cabos Ativos no Quadro)`;
            }

            const svg = document.getElementById('svgFiacaoQuadro');
            if (!svg) return;
            const paths = svg.querySelectorAll('.svg-cabo-fiacao');
            paths.forEach(p => {
                const circ = p.getAttribute('data-circuito');
                if (circ === `C${cNum}` || circ === 'geral' || circ === 'idr' || circ === 'dps') {
                    p.classList.remove('cabo-dimmed');
                    if (circ === `C${cNum}`) p.classList.add('cabo-ativo');
                } else {
                    p.classList.remove('cabo-ativo');
                    p.classList.add('cabo-dimmed');
                }
            });
        }

        function limparDestaqueQuadro() {
            state.circuitoDestaqueQuadro = null;
            const lbl = document.getElementById('lblStatusInspecaoCircuito');
            if (lbl) {
                lbl.innerHTML = `<i class="fa-solid fa-magnifying-glass text-amber-400"></i> Passe o mouse nos disjuntores para rastrear o circuito`;
            }

            const svg = document.getElementById('svgFiacaoQuadro');
            if (!svg) return;
            const paths = svg.querySelectorAll('.svg-cabo-fiacao');
            paths.forEach(p => {
                p.classList.remove('cabo-dimmed');
                p.classList.remove('cabo-ativo');
            });
        }

        function qdtDestacarCaboHover(circuito, tipo, titulo, ev) {
            const cStr = String(circuito || '');
            if (cStr.startsWith('C')) {
                const cNum = parseInt(cStr.replace('C', ''), 10);
                if (!isNaN(cNum)) {
                    destacarCircuitoQuadro(cNum);
                }
            } else {
                const svg = document.getElementById('svgFiacaoQuadro');
                if (svg) {
                    svg.querySelectorAll('.svg-cabo-fiacao').forEach(p => {
                        const circ = p.getAttribute('data-circuito');
                        if (circ === cStr) {
                            p.classList.remove('cabo-dimmed');
                            p.classList.add('cabo-ativo');
                        } else {
                            p.classList.remove('cabo-ativo');
                            p.classList.add('cabo-dimmed');
                        }
                    });
                }
                const lbl = document.getElementById('lblStatusInspecaoCircuito');
                if (lbl) {
                    lbl.innerHTML = `<i class="fa-solid fa-bolt text-amber-400 animate-pulse"></i> Inspecionando: ${titulo || cStr} (${tipo})`;
                }
            }

            let tip = document.getElementById('tooltipCaboQdt');
            if (!tip) {
                tip = document.createElement('div');
                tip.id = 'tooltipCaboQdt';
                tip.className = 'fixed z-50 pointer-events-none bg-slate-950/95 border border-amber-400/80 shadow-2xl rounded-xl p-3 text-xs text-white backdrop-blur-md transition-opacity duration-150';
                document.body.appendChild(tip);
            }
            const cObj = (state.circuitosCalculados || state.circuitos || []).find(x => `C${x.num}` === cStr) || {};
            const bitolaStr = cObj.cabo ? ` • Cabo: ${cObj.cabo}` : '';
            const disjStr = cObj.disj ? ` • Disjuntor: ${cObj.disj}` : '';
            const tensaoStr = cObj.tensao ? ` • ${cObj.tensao}V` : '';
            const potStr = cObj.pot ? ` • ${cObj.pot}` : '';
            const rotaStr = cObj.rota ? ` • Extensão Real: ${cObj.rota}m` : '';

            tip.innerHTML = `
                <div class="flex items-center gap-2 mb-1.5 border-b border-slate-800 pb-1">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                    <span class="font-black text-amber-300 text-xs">${titulo || 'Cabo Virtual QDT'}</span>
                </div>
                <div class="text-[11px] text-slate-200 font-mono space-y-0.5">
                    <div><span class="text-slate-400">Condutor:</span> <strong class="text-emerald-400">${tipo}</strong> (${cStr})${bitolaStr}</div>
                    ${cObj.nome ? `<div><span class="text-slate-400">Destino:</span> <span class="text-white">${cObj.nome}</span></div>` : ''}
                    <div><span class="text-slate-400">Parâmetros:</span> <span class="text-sky-300">${tensaoStr}${disjStr}${potStr}${rotaStr}</span></div>
                </div>
                <div class="text-[10px] text-amber-400/90 font-mono mt-1 pt-1 border-t border-slate-800/80 flex items-center gap-1">
                    <i class="fa-solid fa-check text-[9px]"></i> NBR 5410 • Dimensionamento Normativo
                </div>
            `;
            if (ev) {
                tip.style.left = Math.min(window.innerWidth - 300, ev.clientX + 16) + 'px';
                tip.style.top = Math.min(window.innerHeight - 120, ev.clientY + 16) + 'px';
            }
            tip.style.display = 'block';
            tip.style.opacity = '1';
        }

        function qdtMoverTooltipCaboHover(ev) {
            const tip = document.getElementById('tooltipCaboQdt');
            if (tip && tip.style.display !== 'none' && ev) {
                tip.style.left = Math.min(window.innerWidth - 300, ev.clientX + 16) + 'px';
                tip.style.top = Math.min(window.innerHeight - 120, ev.clientY + 16) + 'px';
            }
        }

        function qdtLimparCaboHover() {
            limparDestaqueQuadro();
            const tip = document.getElementById('tooltipCaboQdt');
            if (tip) {
                tip.style.display = 'none';
                tip.style.opacity = '0';
            }
        }
        const qdtRestaurarCabosHover = qdtLimparCaboHover;

        function atualizarControlesPainelQuadro(esquema, configIdr) {
            // Atualiza botões de Esquema de Aterramento
            const btnTNS = document.getElementById('btnAterr_TNS');
            const btnTNCS = document.getElementById('btnAterr_TNCS');
            const btnTT = document.getElementById('btnAterr_TT');
            const btnTNC = document.getElementById('btnAterr_TNC');
            const badgeAterr = document.getElementById('badgeEsquemaAterramentoAtivo');

            const btnBaseClass = 'btn-aterr p-2 rounded-lg border text-left transition text-[10px] font-bold bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-400/50';
            const btnActiveTNS = 'btn-aterr p-2 rounded-lg border text-left transition text-[10px] font-bold bg-amber-500/20 border-amber-400 text-white shadow ring-1 ring-amber-400/40';
            const btnActiveTNCS = 'btn-aterr p-2 rounded-lg border text-left transition text-[10px] font-bold bg-sky-500/20 border-sky-400 text-white shadow ring-1 ring-sky-400/40';
            const btnActiveTT = 'btn-aterr p-2 rounded-lg border text-left transition text-[10px] font-bold bg-emerald-500/20 border-emerald-400 text-white shadow ring-1 ring-emerald-400/40';
            const btnActiveTNC = 'btn-aterr p-2 rounded-lg border text-left transition text-[10px] font-bold bg-rose-500/20 border-rose-400 text-white shadow ring-1 ring-rose-400/40';

            if (btnTNS) btnTNS.className = (esquema === 'TN-S') ? btnActiveTNS : btnBaseClass;
            if (btnTNCS) btnTNCS.className = (esquema === 'TN-C-S') ? btnActiveTNCS : btnBaseClass;
            if (btnTT) btnTT.className = (esquema === 'TT') ? btnActiveTT : btnBaseClass;
            if (btnTNC) btnTNC.className = (esquema === 'TN-C') ? btnActiveTNC : btnBaseClass;

            if (badgeAterr) {
                if (esquema === 'TN-S') badgeAterr.innerText = 'TN-S (Recomendado NBR 5410)';
                else if (esquema === 'TN-C-S') badgeAterr.innerText = 'TN-C-S (PEN + Jumper BEP)';
                else if (esquema === 'TT') badgeAterr.innerText = 'TT (Terra Local Independente)';
                else if (esquema === 'TN-C') badgeAterr.innerText = 'TN-C (PEN Contínuo / Vedação DR)';
            }

            // Atualiza botões de Configuração de IDR
            const btnIdrGeral = document.getElementById('btnIdr_Geral');
            const btnIdrGrupos = document.getElementById('btnIdr_Grupos');
            const btnIdrParcial = document.getElementById('btnIdr_Parcial');
            const btnIdrDdr = document.getElementById('btnIdr_Ddr');
            const badgeIdr = document.getElementById('badgeConfigIdrAtivo');

            const btnIdrBase = 'btn-idr p-2 rounded-lg border text-left transition text-[10px] font-bold bg-slate-900 border-slate-700 text-slate-300 hover:border-blue-400/50';
            const btnIdrActive = 'btn-idr p-2 rounded-lg border text-left transition text-[10px] font-bold bg-blue-500/20 border-blue-400 text-white shadow ring-1 ring-blue-400/40';

            if (btnIdrGeral) btnIdrGeral.className = (configIdr === 'idr_geral') ? btnIdrActive : btnIdrBase;
            if (btnIdrGrupos) btnIdrGrupos.className = (configIdr === 'idr_grupos') ? btnIdrActive : btnIdrBase;
            if (btnIdrParcial) btnIdrParcial.className = (configIdr === 'idr_parcial') ? btnIdrActive : btnIdrBase;
            if (btnIdrDdr) btnIdrDdr.className = (configIdr === 'ddr_individual') ? btnIdrActive : btnIdrBase;

            if (badgeIdr) {
                if (esquema === 'TN-C') {
                    badgeIdr.innerText = 'Desativado (Vedado NBR 5410 5.1.3.2.3)';
                    badgeIdr.className = 'text-[9px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold';
                } else {
                    badgeIdr.className = 'text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold';
                    if (configIdr === 'idr_geral') badgeIdr.innerText = 'IDR Geral (Proteção Total 30mA)';
                    else if (configIdr === 'idr_grupos') badgeIdr.innerText = 'Múltiplos IDRs (2 Barramentos Neutro)';
                    else if (configIdr === 'idr_parcial') badgeIdr.innerText = 'IDR Parcial (Áreas Molhadas)';
                    else if (configIdr === 'ddr_individual') badgeIdr.innerText = 'DDRs Individuais (RCBO por circuito)';
                }
            }

            // Banner dinâmico de impacto
            const txtImpacto = document.getElementById('txtImpactoEsquemaQuadro');
            if (txtImpacto) {
                let msg = '';
                if (esquema === 'TN-S') {
                    msg = `<strong>Esquema TN-S:</strong> Condutores Neutro (Azul) e Terra (Verde/Amarelo) separados desde a entrada. Os DPS conectam as Fases e o Neutro ao Barramento PE. `;
                } else if (esquema === 'TN-C-S') {
                    msg = `<strong>Esquema TN-C-S:</strong> Entrada combinada PEN. No quadro, o PEN chega ao Barramento PE (BEP) e uma barra/jumper de cobre equipotencializa o Neutro de entrada antes do IDR. A partir do IDR, N e PE não se unem mais. `;
                } else if (esquema === 'TT') {
                    msg = `<strong>Esquema TT:</strong> Aterramento PE por eletrodo local independente. O <strong>IDR é 100% Obrigatório</strong> pela NBR 5410 (alta impedância de malha). DPS em esquema 3+1 com centelhador Neutro-Terra. `;
                } else if (esquema === 'TN-C') {
                    msg = `<strong class="text-rose-400">Esquema TN-C (Atenção NBR 5410 item 5.1.3.2.3):</strong> O condutor PEN único impede o uso de dispositivo DR, pois a corrente residual pelo PEN anula o desequilíbrio magnético. Disjuntores comuns com Barramento PEN. `;
                }

                if (esquema !== 'TN-C') {
                    if (configIdr === 'idr_geral') {
                        msg += `<strong>IDR Geral:</strong> 1 IDR tetrapolar ou bipolar no Trilho 1 alimentando o Barramento de Neutro Protegido para todos os circuitos terminais.`;
                    } else if (configIdr === 'idr_grupos') {
                        msg += `<strong>Múltiplos IDRs:</strong> IDR 1 para circuitos sociais e IDR 2 para áreas molhadas/TUEs. O quadro possui <strong>2 Barramentos de Neutro Isolados</strong> (Social e Molhado) totalmente independentes.`;
                    } else if (configIdr === 'idr_parcial') {
                        msg += `<strong>IDR Parcial Normativo:</strong> Circuitos secos ligam no Neutro da Rede. Circuitos de cozinha, banheiros e TUEs passam pelo IDR e ligam no Neutro Protegido DR.`;
                    } else if (configIdr === 'ddr_individual') {
                        msg += `<strong>DDRs Individuais:</strong> Cada disjuntor possui sensor residual próprio (RCBO), eliminando o IDR central em bloco nos trilhos.`;
                    }
                }
                txtImpacto.innerHTML = msg;
            }
        }

        // RENDERIZAÇÃO PRINCIPAL DO QUADRO DIN (NBR 5410 & NBR IEC 60898)
        function renderizarQuadroDIN(circuitos) {
            const trilho = document.getElementById('trilhoDinContainer');
            if (!trilho) return;
            trilho.innerHTML = '';

            if (!circuitos || !Array.isArray(circuitos)) {
                circuitos = state.circuitosCalculados || state.circuitos || [];
            }

            const lblDisj = document.getElementById('lblDisjGeral');
            const disjGeralTxt = lblDisj ? lblDisj.innerText : '50 A';
            const ehColetivo = (state.regimeImovel === 'imoveis_separados' && state.unidadeQdtAtivaId === 'todos');
            const sistemaEntrada = (state.alimentacaoExterna && state.alimentacaoExterna.sistema) ? state.alimentacaoExterna.sistema : (state.sistemaAlimentacao || 'bifasico');

            const esquemaAterramento = state.esquemaAterramento || 'TN-S';
            const tipoConfigIdr = state.tipoConfigIdr || 'idr_geral';
            const modoFiacao = state.modoFiacaoQuadro !== false;
            const modoCanaletas = state.modoCanaletasQuadro || 'abertas';
            const modoVisual = state.modoVisualQuadro || 'interno';

            atualizarControlesPainelQuadro(esquemaAterramento, tipoConfigIdr);

            let modulosUsados = 0;

            if (ehColetivo) {
                // CENTRO DE MEDIÇÃO COLETIVO (NBR 5410)
                const elGeralCol = document.createElement('div');
                elGeralCol.className = 'bg-slate-900 border-2 border-emerald-500 rounded-lg p-2 flex flex-col items-center justify-between text-center shrink-0 w-24 h-40 shadow-xl relative';
                elGeralCol.innerHTML = `
                    <span class="text-[8px] font-black text-emerald-400 uppercase tracking-tighter">RAMAL COLETIVO</span>
                    <div class="w-10 h-10 bg-slate-950 border border-emerald-500/40 rounded flex flex-col items-center justify-center">
                        <div class="w-6 h-5 bg-emerald-500 rounded-sm shadow-md flex items-center justify-center text-[7px] font-black text-slate-950">3P</div>
                        <span class="text-[6px] font-bold text-white mt-0.5">CONCESS.</span>
                    </div>
                    <div>
                        <span class="block text-xs font-black text-white font-mono">${disjGeralTxt}</span>
                        <span class="block text-[7px] font-bold text-emerald-300">Geral CMC</span>
                    </div>
                    <span class="text-[7px] text-slate-400 font-mono">Trifásico (3 Módulos)</span>
                `;
                trilho.appendChild(elGeralCol);
                modulosUsados += 3;

                state.imoveis.forEach((imovel, i) => {
                    const elMed = document.createElement('div');
                    elMed.className = 'bg-slate-900 border-2 border-sky-500/80 rounded-lg p-1.5 flex flex-col items-center justify-between text-center shrink-0 w-20 h-40 shadow-lg';
                    elMed.innerHTML = `
                        <span class="text-[8px] font-black text-sky-400 uppercase tracking-tighter">MEDIDOR ${i+1}</span>
                        <div class="w-10 h-8 bg-slate-950 border border-sky-500/40 rounded flex flex-col items-center justify-center">
                            <i class="fa-solid fa-gauge-high text-sky-400 text-xs"></i>
                            <span class="text-[6px] font-bold text-slate-300 mt-0.5 font-mono">kWh</span>
                        </div>
                        <div>
                            <span class="block text-[10px] font-black text-white font-mono">40 A</span>
                            <span class="block text-[7px] font-bold text-sky-300 truncate w-16" title="${imovel.nome}">${imovel.nome}</span>
                        </div>
                        <span class="text-[6px] text-slate-400 font-mono">${imovel.sistema.slice(0,4)} (2 Mód.)</span>
                    `;
                    trilho.appendChild(elMed);
                    modulosUsados += 2;
                });
                return;
            }

            // 1. CONSTRÓI LISTA DE DISPOSITIVOS FÍSICOS CONFORME ESQUEMA DE ATERRAMENTO E IDR
            const dispositivos = [];

            // A. Disjuntor Geral Termomagnético Modular DIN
            const polosGeral = (sistemaEntrada === 'trifasico') ? 3 : (sistemaEntrada === 'bifasico' ? 2 : 1);
            dispositivos.push({
                id: 'geral',
                tipo: 'geral',
                nome: `GERAL ${polosGeral}P`,
                polos: polosGeral,
                amperagem: disjGeralTxt,
                curva: 'Curva C',
                sistema: sistemaEntrada
            });
            modulosUsados += polosGeral;

            // B. Dispositivos de Proteção contra Surtos (DPS Classe II 275V)
            if (esquemaAterramento === 'TN-S') {
                const numDPS = sistemaEntrada === 'trifasico' ? 4 : (sistemaEntrada === 'bifasico' ? 3 : 2);
                for (let i = 0; i < numDPS; i++) {
                    const poloNome = (i === numDPS - 1) ? 'Neutro' : `Fase ${i + 1}`;
                    dispositivos.push({
                        id: `dps_${i}`,
                        tipo: 'dps',
                        nome: 'DPS',
                        subnome: poloNome,
                        polos: 1,
                        volts: '275V',
                        ka: '20kA/40kA'
                    });
                    modulosUsados += 1;
                }
            } else if (esquemaAterramento === 'TN-C-S') {
                const numDPS = sistemaEntrada === 'trifasico' ? 3 : (sistemaEntrada === 'bifasico' ? 2 : 1);
                for (let i = 0; i < numDPS; i++) {
                    dispositivos.push({
                        id: `dps_${i}`,
                        tipo: 'dps',
                        nome: 'DPS',
                        subnome: `Fase ${i + 1} (PEN)`,
                        polos: 1,
                        volts: '275V',
                        ka: '20kA/40kA'
                    });
                    modulosUsados += 1;
                }
            } else if (esquemaAterramento === 'TT') {
                const numFases = sistemaEntrada === 'trifasico' ? 3 : (sistemaEntrada === 'bifasico' ? 2 : 1);
                for (let i = 0; i < numFases; i++) {
                    dispositivos.push({
                        id: `dps_fase_${i}`,
                        tipo: 'dps',
                        nome: 'DPS',
                        subnome: `Fase ${i + 1}-N`,
                        polos: 1,
                        volts: '275V',
                        ka: '20kA/40kA'
                    });
                    modulosUsados += 1;
                }
                dispositivos.push({
                    id: 'dps_centelhador',
                    tipo: 'dps',
                    nome: 'DPS N-PE',
                    subnome: 'Centelhador',
                    polos: 1,
                    volts: '255V',
                    ka: '40kA (GDT)'
                });
                modulosUsados += 1;
            } else if (esquemaAterramento === 'TN-C') {
                const numDPS = sistemaEntrada === 'trifasico' ? 3 : (sistemaEntrada === 'bifasico' ? 2 : 1);
                for (let i = 0; i < numDPS; i++) {
                    dispositivos.push({
                        id: `dps_${i}`,
                        tipo: 'dps',
                        nome: 'DPS',
                        subnome: `Fase ${i + 1}`,
                        polos: 1,
                        volts: '275V',
                        ka: '20kA/40kA'
                    });
                    modulosUsados += 1;
                }
            }

            // C/D. IDRs (modelos comerciais escolhidos no painel — NBR5410.planejarIdrs) e
            // circuitos terminais, cada um logo após o IDR que o protege
            const inGeral = parseInt(disjGeralTxt, 10) || 0;
            const planoIdr = NBR5410.planejarIdrs({
                circuitos, sistema: sistemaEntrada, configIdr: tipoConfigIdr,
                esquema: esquemaAterramento, inGeral, modelo: state.modeloIdr
            });
            state.planoIdr = planoIdr;
            atualizarPainelModeloIdr(planoIdr);
            const circPorNum = new Map(circuitos.map(c => [c.num, c]));
            const incluirCircuito = (c, fonteIdr, grupoIdr) => {
                if (!c) return;
                const p = (c.polos === '3P') ? 3 : ((c.polos === '2P') ? 2 : 1);
                modulosUsados += p;
                dispositivos.push({
                    id: `c_${c.num}`, tipo: 'circuito', dados: c, polos: p,
                    isDdr: (tipoConfigIdr === 'ddr_individual' && esquemaAterramento !== 'TN-C'),
                    grupoIdr, fonteIdr
                });
            };
            if (!planoIdr.idrs.length) {
                circuitos.forEach(c => incluirCircuito(c, null, (tipoConfigIdr === 'ddr_individual' && esquemaAterramento !== 'TN-C') ? 'ddr' : 'geral'));
            } else {
                planoIdr.direto.forEach(n => incluirCircuito(circPorNum.get(n), null, 'direto'));
                planoIdr.idrs.forEach(idr => {
                    dispositivos.push({
                        id: idr.id,
                        tipo: 'idr',
                        nome: idr.polos === '4P' ? 'IDR 4P' : `IDR 2P ${idr.polosLetras.filter(l => l !== 'N').join('+')}${idr.polosLetras.includes('N') ? '+N' : ''}`,
                        subnome: idr.nome,
                        polos: idr.polosLetras.length,
                        polosLetras: idr.polosLetras,
                        amperagem: `${idr.corrente} A`,
                        sensibilidade: `IΔn ${idr.sensibilidade} mA`,
                        tipoDR: idr.tipo,
                        grupo: idr.grupo
                    });
                    modulosUsados += idr.polosLetras.length;
                    idr.circuitos.forEach(n => incluirCircuito(circPorNum.get(n), idr.id, idr.grupo));
                });
            }

            // E. Automação residencial: contatores das cargas > 16 A e, com o painel integrado,
            // atuadores, fontes e proteção do painel (js/app/17-automacao.js)
            const dinAutomacao = (typeof obterDispositivosDinAutomacaoQdc === 'function') ? obterDispositivosDinAutomacaoQdc() : [];
            dinAutomacao.forEach(it => { dispositivos.push(it); modulosUsados += it.polos; });

            // =========================================================================
            // CÁLCULO NORMATIVO DE RESERVA (NBR 5410 ITEM 6.5.4.7) & CAIXA COMERCIAL
            // =========================================================================
            const numCirc = circuitos.length;
            let modulosReservaNorma = 2;
            if (numCirc <= 6) {
                modulosReservaNorma = 2;
            } else if (numCirc <= 12) {
                modulosReservaNorma = 3;
            } else if (numCirc <= 30) {
                modulosReservaNorma = 4;
            } else {
                modulosReservaNorma = Math.ceil(modulosUsados * 0.15);
            }

            const capacidadeMinima = modulosUsados + modulosReservaNorma;

            // Caixas Comerciais padronizadas em múltiplos de 12 pólos (12, 24, 36, 48, 60, 72)
            const TAMANHOS_COMERCIAIS_12 = [12, 24, 36, 48, 60, 72];
            let tamanhoSugerido = TAMANHOS_COMERCIAIS_12.find(t => t >= capacidadeMinima);
            if (!tamanhoSugerido) {
                tamanhoSugerido = Math.ceil(capacidadeMinima / 12) * 12;
            }
            const numTrilhos = Math.max(1, Math.ceil(tamanhoSugerido / 12));
            const modulosLivres = Math.max(0, tamanhoSugerido - modulosUsados);

            // Atualiza os dados no Card de Sugestão Comercial (IDs originais mantidos intactos)
            const txtModelo = document.getElementById('txtSugestaoModeloCaixa');
            const txtDesc = document.getElementById('txtSugestaoDescricaoCaixa');
            const bOcup = document.getElementById('badgeModulosOcupados');
            const bRes = document.getElementById('badgeModulosReserva');
            const bLivres = document.getElementById('badgeModulosLivres');

            const textoCaixaDesc = `Quadro de Distribuição para ${tamanhoSugerido} Módulos DIN (${numTrilhos} Fileiras de 12 Pólos - Embutir / Sobrepor)`;
            if (txtModelo) txtModelo.innerText = textoCaixaDesc;
            if (txtDesc) {
                txtDesc.innerHTML = `Recomendação técnica: Caixa comercial de <strong>${tamanhoSugerido} módulos DIN (${numTrilhos} fileiras de 12 pólos)</strong> atende aos <strong>${modulosUsados} módulos ocupados</strong> (Geral, IDR, DPS, Monopolares e Bipolares${dinAutomacao.length ? `, ${dinAutomacao.reduce((s, i) => s + i.polos, 0)} da automação` : ''}) + <strong>${modulosReservaNorma} de reserva mínima NBR 5410</strong>.`;
            }
            if (bOcup) bOcup.innerText = `${modulosUsados} Módulos`;
            if (bRes) bRes.innerText = `+${modulosReservaNorma} NBR 5410`;
            if (bLivres) bLivres.innerText = `${modulosLivres} Livres`;

            // =========================================================================
            // DISTRIBUIÇÃO FÍSICA RIGOROSA EM FILEIRAS DE 12 PÓLOS (TRILHOS DIN)
            // =========================================================================
            const trilhosArray = [];
            let trilhoAtual = [];
            let polosNoTrilho = 0;

            for (let i = 0; i < dispositivos.length; i++) {
                const item = dispositivos[i];
                const w = item.polos || 1;

                // Em quadros reais, se um bipolar/tetrapolar não cabe no final da fileira,
                // preenche com tampa cega e inicia no trilho seguinte!
                if (polosNoTrilho + w > 12) {
                    const sobra = 12 - polosNoTrilho;
                    for (let s = 0; s < sobra; s++) {
                        trilhoAtual.push({
                            id: `res_fill_${trilhosArray.length}_${s}`,
                            tipo: 'reserva',
                            nome: 'RESERVA',
                            subnome: '18mm DIN',
                            polos: 1
                        });
                    }
                    trilhosArray.push(trilhoAtual);
                    trilhoAtual = [];
                    polosNoTrilho = 0;
                }

                trilhoAtual.push(item);
                polosNoTrilho += w;
            }

            if (trilhoAtual.length > 0) {
                const sobra = 12 - polosNoTrilho;
                for (let s = 0; s < sobra; s++) {
                    trilhoAtual.push({
                        id: `res_fill_${trilhosArray.length}_${s}`,
                        tipo: 'reserva',
                        nome: 'RESERVA',
                        subnome: '18mm DIN',
                        polos: 1
                    });
                }
                trilhosArray.push(trilhoAtual);
            }

            // Garante que o número de trilhos bata com a caixa comercial (ex: 3 trilhos de 12 para 36 módulos)
            while (trilhosArray.length < numTrilhos) {
                const trilhoVazio = [];
                for (let s = 0; s < 12; s++) {
                    trilhoVazio.push({
                        id: `res_full_${trilhosArray.length}_${s}`,
                        tipo: 'reserva',
                        nome: 'RESERVA',
                        subnome: '18mm DIN',
                        polos: 1
                    });
                }
                trilhosArray.push(trilhoVazio);
            }

            // RENDERIZAÇÃO REALISTA DO CHASSI, TRILHOS E FIAÇÃO VIRTUAL
            renderizarEnclosureChassiQuadro(trilho, trilhosArray, {
                esquemaAterramento,
                tipoConfigIdr,
                modoFiacao,
                modoCanaletas,
                modoVisual,
                sistemaEntrada,
                disjGeralTxt,
                tamanhoSugerido,
                numTrilhos
            });
        }

        // MONTAGEM REALISTA DO CHASSI DO QUADRO, TRILHOS DE 12 POLOS & BARRAMENTOS
        // Escala física: 1 módulo DIN (18 mm) = 48 px  →  fileira de 12 pólos = 576 px (216 mm)
        const QDT_MOD_PX = 48;
        const QDT_DEV_H = 150;
        const QDT_ROW_W = QDT_MOD_PX * 12;
        const QDT_TERM_OFF = 11; // centro do parafuso do borne a partir da borda do dispositivo

        // Representação dos condutores (convenção do diagrama de referência)
        const QDT_CORES_FIO = {
            R:   { cor: '#ef4444', contorno: '#450a0a', nome: 'Fase R (vermelho)' },
            S:   { cor: '#111827', contorno: '#94a3b8', nome: 'Fase S (preto)' },
            T:   { cor: '#f1f5f9', contorno: '#334155', nome: 'Fase T (branco)' },
            N:   { cor: '#3b82f6', contorno: '#0c1a3a', nome: 'Neutro (azul)' },
            PE:  { cor: '#22c55e', contorno: '#052e16', listra: '#facc15', nome: 'Terra PE (verde/amarelo)' },
            PEN: { cor: '#3b82f6', contorno: '#0c1a3a', listra: '#22c55e', nome: 'PEN (azul/verde)' }
        };

        function qdtFasesSistema(sistema) {
            if (sistema === 'trifasico') return ['R', 'S', 'T'];
            if (sistema === 'monofasico') return ['R'];
            return ['R', 'S'];
        }

        // Pólos do IDR: tetrapolar = N, R, S, T  |  bipolar = N, R
        function qdtPolosIdr(item) {
            if (Array.isArray(item.polosLetras)) return item.polosLetras;
            return (item.polos === 4) ? ['N', 'R', 'S', 'T'] : ['N', 'R'];
        }

        function qdtFasesDoCircuito(c) {
            const txt = String((c && c.fase) || '').replace(/fase/ig, '').toUpperCase();
            const f = txt.match(/[RST]/g) || [];
            if (c && c.polos === '3P') return f.length >= 3 ? f.slice(0, 3) : ['R', 'S', 'T'];
            if (c && c.polos === '2P') return f.length >= 2 ? f.slice(0, 2) : ['R', 'S'];
            return f.length ? [f[0]] : ['R'];
        }

        function qdtFonteCircuito(item, idrIds, esquema) {
            if (esquema === 'TN-C') return 'geral';
            if (item.fonteIdr) return idrIds.includes(item.fonteIdr) ? item.fonteIdr : 'geral';
            if (item.grupoIdr === 'direto') return 'geral';
            const g = item.grupoIdr;
            if (g === 'geral') return idrIds.includes('idr_geral') ? 'idr_geral' : 'geral';
            if (g === 'social') return idrIds.includes('idr_grupo_1') ? 'idr_grupo_1' : 'geral';
            if (g === 'molhadas') {
                if (idrIds.includes('idr_grupo_2')) return 'idr_grupo_2';
                if (idrIds.includes('idr_parcial')) return 'idr_parcial';
            }
            return 'geral';
        }

        function qdtBarrasNecessarias(trilhosArray, config) {
            const esq = config.esquemaAterramento;
            if (esq === 'TN-C') return [{ id: 'pen', nome: 'Barramento PEN', tipo: 'PEN' }];
            const itens = trilhosArray.flat();
            const idrs = itens.filter(i => i.tipo === 'idr');
            const idrIds = idrs.map(i => i.id);
            const barras = [{ id: 'pe', nome: esq === 'TN-C-S' ? 'Barra PE / BEP' : (esq === 'TT' ? 'Barra PE (haste local)' : 'Barra PE (Terra)'), tipo: 'PE' }];
            // cada IDR com pólo de neutro tem sua barra de neutro (IDR F+F de 220 V não tem)
            idrs.forEach(i => { if (qdtPolosIdr(i).includes('N')) barras.push({ id: 'n_' + i.id, nome: 'Neutro ' + (i.subnome || 'IDR'), tipo: 'N' }); });
            const precisaDireto = idrs.length === 0 || itens.some(i => i.tipo === 'circuito' && qdtFonteCircuito(i, idrIds, esq) === 'geral');
            if (precisaDireto) barras.push({ id: 'n_direto', nome: 'Neutro direto (sem DR)', tipo: 'N' });
            return barras;
        }

        function qdtCanaletaH(cls, canal, texto, altura) {
            const el = document.createElement('div');
            el.className = `w-full ${cls} flex items-center justify-center text-[8px] font-mono text-slate-500/80`;
            el.style.height = (altura || 30) + 'px';
            el.dataset.canal = String(canal);
            el.innerText = texto || '';
            return el;
        }

        function renderizarEnclosureChassiQuadro(container, trilhosArray, config) {
            container.innerHTML = '';
            const isEspelho = (config.modoVisual === 'espelho');
            const fechadas = (config.modoCanaletas === 'fechadas');
            const clsV = fechadas ? 'canaleta-tampa-fechada' : 'canaleta-ranhurada';
            const clsH = fechadas ? 'canaleta-tampa-fechada' : 'canaleta-ranhurada-h';
            const nRows = trilhosArray.length;
            const LARG_CANAL_V = 44;
            const PAD_AREA = 14;

            const quadro = document.createElement('div');
            quadro.id = 'quadroRealInner';
            quadro.className = 'relative mx-auto select-none';
            quadro.style.width = (LARG_CANAL_V * 2 + PAD_AREA * 2 + QDT_ROW_W) + 'px';
            quadro.style.paddingTop = '30px'; // chegada do ramal (eletroduto superior)

            quadro.appendChild(qdtCanaletaH(clsH, 0, 'Canaleta superior • chegada do ramal', 34));

            const miolo = document.createElement('div');
            miolo.className = 'flex';

            const cEsq = document.createElement('div');
            cEsq.className = `shrink-0 ${clsV}`;
            cEsq.style.width = LARG_CANAL_V + 'px';
            cEsq.dataset.lado = 'L';

            const cDir = document.createElement('div');
            cDir.className = `shrink-0 ${clsV}`;
            cDir.style.width = LARG_CANAL_V + 'px';
            cDir.dataset.lado = 'R';

            const area = document.createElement('div');
            area.className = 'bg-slate-950/80';
            area.style.width = (QDT_ROW_W + PAD_AREA * 2) + 'px';
            area.style.padding = `0 ${PAD_AREA}px`;

            const registro = [];

            trilhosArray.forEach((itens, r) => {
                const box = document.createElement('div');
                box.className = 'relative';
                box.dataset.linha = String(r);
                const titulo = (r === 0) ? `Fileira 1 • Entrada e proteção` : `Fileira ${r + 1} • Circuitos terminais`;
                box.innerHTML = `
                    <div class="flex justify-between text-[9px] font-mono text-slate-500 px-0.5 pt-1 pb-0.5">
                        <span class="text-amber-400/80 font-bold">${titulo}</span>
                        <span>12 pólos • 216 mm</span>
                    </div>`;

                // Placa de montagem + perfil ômega 35 mm atrás dos dispositivos
                const corpo = document.createElement('div');
                corpo.className = 'relative bg-slate-900/70 rounded-sm';
                corpo.style.width = QDT_ROW_W + 'px';
                corpo.style.height = (QDT_DEV_H + 22) + 'px';
                corpo.style.paddingTop = '16px'; // espaço do barramento pente

                const perfil = document.createElement('div');
                perfil.className = 'trilho-omega-din absolute left-0 right-0';
                perfil.style.height = '34px';
                perfil.style.top = (16 + QDT_DEV_H / 2 - 17) + 'px';
                corpo.appendChild(perfil);

                const linha = document.createElement('div');
                linha.className = 'relative flex items-start';
                linha.style.zIndex = '2';
                itens.forEach(item => {
                    const el = criarElementoDispositivoReal(item, config);
                    linha.appendChild(el);
                    registro.push({ item, el, row: r });
                });
                corpo.appendChild(linha);
                box.appendChild(corpo);

                const regua = document.createElement('div');
                regua.className = 'grid text-center text-[7px] font-mono text-slate-600 py-0.5';
                regua.style.width = QDT_ROW_W + 'px';
                regua.style.gridTemplateColumns = 'repeat(12, 1fr)';
                for (let p = 1; p <= 12; p++) regua.innerHTML += `<span>${p}</span>`;
                box.appendChild(regua);

                area.appendChild(box);
                area.appendChild(qdtCanaletaH(clsH, r + 1, r < nRows - 1 ? 'Passagem horizontal de cabos' : 'Canaleta inferior • derivação aos barramentos', 30));
            });

            // Barramentos de Neutro / Terra montados na placa (abaixo da última fileira)
            const barras = qdtBarrasNecessarias(trilhosArray, config);
            const areaBarras = document.createElement('div');
            areaBarras.className = 'flex items-start gap-3 py-3';
            barras.forEach(b => {
                const wrap = document.createElement('div');
                wrap.className = 'flex-1 min-w-0';
                const isPE = b.tipo === 'PE', isPEN = b.tipo === 'PEN';
                const faixa = isPE ? 'bg-emerald-500' : (isPEN ? 'bg-gradient-to-r from-blue-500 to-emerald-500' : 'bg-blue-500');
                let parafusos = '';
                for (let k = 0; k < 14; k++) parafusos += `<span class="w-[7px] h-[7px] rounded-full bg-slate-300 border border-slate-500"></span>`;
                wrap.innerHTML = `
                    <div data-barra="${b.id}" class="relative h-5 rounded-sm bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border border-amber-800 flex items-center justify-around px-1 shadow">
                        ${parafusos}
                        <span class="absolute -bottom-1 left-0 right-0 h-1 ${faixa} rounded-b-sm"></span>
                    </div>
                    <span class="block text-[8px] font-mono mt-1.5 truncate ${isPE ? 'text-emerald-400' : (isPEN ? 'text-sky-300' : 'text-blue-400')}">${b.nome}</span>`;
                areaBarras.appendChild(wrap);
            });
            area.appendChild(areaBarras);

            miolo.appendChild(cEsq);
            miolo.appendChild(area);
            miolo.appendChild(cDir);
            quadro.appendChild(miolo);

            quadro.appendChild(qdtCanaletaH(clsH, nRows + 1, 'Saída dos circuitos para as cargas', 34));

            container.appendChild(quadro);

            const desenhar = () => qdtDesenharFiacao(quadro, registro, trilhosArray, config);
            state._qdtRedesenharFiacao = desenhar;
            requestAnimationFrame(desenhar);
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (quadro.isConnected) desenhar(); });

            renderizarBarramentosDinamicos(config);
        }

        // DISPOSITIVO MODULAR COM LARGURA FÍSICA EXATA (pólos × 18 mm) E BORNES POR PÓLO
        function criarElementoDispositivoReal(item, config) {
            const w = item.polos || 1;
            const L = w * QDT_MOD_PX;
            const el = document.createElement('div');
            el.style.width = L + 'px';
            el.style.height = QDT_DEV_H + 'px';
            el.dataset.dev = item.id;

            const parafuso = (k, pos, cor) => `<span class="absolute w-[11px] h-[11px] rounded-full bg-slate-300 border border-slate-500 shadow-inner flex items-center justify-center" style="left:${(k + 0.5) * QDT_MOD_PX - 5.5}px;${pos}:${QDT_TERM_OFF - 5.5}px"><span class="block w-[7px] h-[1.5px] ${cor || 'bg-slate-600'} rotate-45"></span></span>`;
            let bornes = '';
            if (item.tipo !== 'reserva') {
                for (let k = 0; k < w; k++) bornes += parafuso(k, 'top') + parafuso(k, 'bottom');
            }
            // Divisões verticais entre módulos (fendas reais da carcaça)
            let divisoes = '';
            for (let k = 1; k < w; k++) divisoes += `<span class="absolute top-6 bottom-6 w-px bg-slate-700/60" style="left:${k * QDT_MOD_PX}px"></span>`;

            const manopla = (cor, largura) => `
                <div class="relative mx-auto my-1 rounded-sm bg-slate-950 border border-slate-700 flex items-center justify-center" style="width:${largura}px;height:26px">
                    <div class="rounded-[2px] shadow ${cor}" style="width:${Math.max(10, largura - 12)}px;height:11px"></div>
                </div>`;

            const base = 'disjuntor-modular-real relative shrink-0 rounded-[3px] border flex flex-col items-center text-center overflow-hidden';
            let miolo = '';

            if (item.tipo === 'geral') {
                el.className = `${base} border-amber-500/80`;
                miolo = `
                    <span class="text-[8px] font-black text-amber-400 tracking-tight">GERAL ${w}P</span>
                    ${manopla('bg-red-600', L - 16)}
                    <span class="text-[12px] font-black text-white font-mono leading-none">${item.amperagem}</span>
                    <span class="text-[7px] font-bold text-amber-300">Curva C • 4,5 kA</span>`;
            } else if (item.tipo === 'dps') {
                const gdt = item.id === 'dps_centelhador';
                el.className = `${base} ${gdt ? 'border-amber-500/70' : 'border-rose-500/60'}`;
                miolo = `
                    <span class="text-[7px] font-black ${gdt ? 'text-amber-400' : 'text-rose-400'}">${gdt ? 'DPS N-PE' : 'DPS'}</span>
                    <div class="w-6 h-6 my-1 rounded-sm border flex items-center justify-center text-[7px] font-black text-white ${gdt ? 'bg-amber-600 border-amber-400' : 'bg-emerald-600 border-emerald-400'}">${gdt ? 'GDT' : 'OK'}</div>
                    <span class="text-[8px] font-black text-white leading-none">${item.volts || '275V'}</span>
                    <span class="text-[6px] text-slate-400 font-mono leading-tight">${item.ka || '20/40kA'}</span>
                    <span class="text-[6px] text-slate-400 font-mono truncate w-full px-0.5" title="${item.subnome}">${item.subnome}</span>`;
            } else if (item.tipo === 'idr') {
                el.className = `${base} border-blue-500`;
                const polos = qdtPolosIdr(item);
                const fasesSist = qdtFasesSistema(config.sistemaEntrada);
                let letras = '';
                polos.forEach((p, k) => {
                    const usado = (p === 'N') || fasesSist.includes(p);
                    letras += `<span class="absolute text-[7px] font-mono font-bold ${p === 'N' ? 'text-blue-400' : (usado ? 'text-slate-300' : 'text-slate-600')}" style="left:${k * QDT_MOD_PX}px;width:${QDT_MOD_PX}px;top:24px">${usado ? p : '—'}</span>`;
                });
                miolo = `
                    ${letras}
                    <span class="text-[8px] font-black text-blue-400 mt-3">${w === 4 ? 'IDR TETRAPOLAR' : 'IDR BIPOLAR'}</span>
                    <div class="flex items-center justify-center gap-2 my-1">
                        <div class="w-7 h-7 bg-slate-950 border border-blue-500/40 rounded-sm flex flex-col items-center justify-center">
                            <span class="w-4 h-3 bg-sky-400 rounded-[2px] text-[6px] font-black text-slate-950 leading-3">T</span>
                            <span class="text-[5px] text-slate-400 mt-0.5">TESTE</span>
                        </div>
                        ${manopla('bg-blue-500', Math.min(90, L - 60))}
                    </div>
                    <span class="text-[12px] font-black text-white font-mono leading-none">${item.amperagem}</span>
                    <span class="text-[7px] font-bold text-blue-300">${item.sensibilidade || 'IΔn 30 mA'}${item.tipoDR ? ' • tipo ' + item.tipoDR : ''}</span>
                    <span class="text-[6px] text-slate-400 font-mono truncate w-full px-0.5" title="${item.subnome || ''}">${item.subnome || ''}</span>`;
            } else if (item.tipo === 'circuito') {
                const c = item.dados;
                const isTue = c.tipo === 'TUE';
                el.className = `${base} ${isTue ? 'border-sky-500/60' : 'border-slate-600'} hover:border-amber-400 cursor-pointer`;
                el.setAttribute('onmouseenter', `destacarCircuitoQuadro('${c.num}')`);
                el.setAttribute('onmouseleave', 'limparDestaqueQuadro()');
                el.title = `C${c.num} • ${c.nome} • ${c.disj} curva ${c.curva} • ${c.fase}`;
                miolo = `
                    <span class="px-1 rounded text-[8px] font-black ${isTue ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'}">C${c.num}</span>
                    ${manopla('bg-slate-300', L - 16)}
                    <span class="text-[11px] font-black text-white font-mono leading-none">${c.disj}</span>
                    <span class="text-[7px] font-bold text-amber-400">Curva ${c.curva}</span>
                    <span class="text-[6px] text-slate-400 font-mono truncate w-full px-0.5">${w >= 2 ? w + 'P • ' : ''}${qdtFasesDoCircuito(c).join('+')}</span>`;
            } else if (item.tipo === 'automacao') {
                el.className = `${base} border-violet-500/70`;
                el.title = item.nome || 'Automação';
                miolo = (typeof mioloDispositivoAutomacao === 'function') ? mioloDispositivoAutomacao(item, w)
                    : `<span class="text-[7px] font-black text-violet-300">AUTOMAÇÃO</span>`;
            } else {
                el.className = 'relative shrink-0 rounded-[3px] border border-dashed border-slate-700 bg-slate-800/40 flex items-center justify-center';
                miolo = `<span class="text-[7px] text-slate-500 font-bold tracking-widest" style="writing-mode:vertical-rl">RESERVA</span>`;
            }

            el.innerHTML = `${bornes}${divisoes}<div class="flex flex-col items-center w-full" style="padding-top:22px">${miolo}</div>`;
            if (item.tipo === 'reserva') el.innerHTML = miolo;
            return el;
        }

        // =========================================================================
        // MOTOR DE FIAÇÃO VIRTUAL: rotas ortogonais medidas nos bornes reais,
        // percorrendo canaletas horizontais (canais) e verticais (laterais)
        // =========================================================================
        function qdtPtsParaPath(pts, raio) {
            const r = raio || 4;
            let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
            for (let i = 1; i < pts.length - 1; i++) {
                const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
                const d1 = Math.hypot(x1 - x0, y1 - y0), d2 = Math.hypot(x2 - x1, y2 - y1);
                const rr = Math.min(r, d1 / 2, d2 / 2);
                if (rr < 0.5) { d += ` L ${x1.toFixed(1)} ${y1.toFixed(1)}`; continue; }
                const ax = x1 - (x1 - x0) / d1 * rr, ay = y1 - (y1 - y0) / d1 * rr;
                const bx = x1 + (x2 - x1) / d2 * rr, by = y1 + (y2 - y1) / d2 * rr;
                d += ` L ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${x1.toFixed(1)} ${y1.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
            }
            const l = pts[pts.length - 1];
            return d + ` L ${l[0].toFixed(1)} ${l[1].toFixed(1)}`;
        }

        function qdtDesenharFiacao(quadro, registro, trilhosArray, config) {
            if (!quadro.isConnected) return;
            const baseRect = quadro.getBoundingClientRect();
            if (!baseRect.width) { state._qdtFiacaoPendente = true; return; }
            state._qdtFiacaoPendente = false;

            quadro.querySelectorAll('svg[data-qdt-svg]').forEach(s => s.remove());
            if (config.modoVisual === 'espelho') return;

            const NS = 'http://www.w3.org/2000/svg';
            const W = quadro.offsetWidth, H = quadro.offsetHeight;
            const nRows = trilhosArray.length;
            const rel = el => { const b = el.getBoundingClientRect(); return { x: b.left - baseRect.left, y: b.top - baseRect.top, w: b.width, h: b.height }; };

            const chanY = {};
            quadro.querySelectorAll('[data-canal]').forEach(e => { const b = rel(e); chanY[e.dataset.canal] = b.y + b.h / 2; });
            const sideX = {};
            quadro.querySelectorAll('[data-lado]').forEach(e => { const b = rel(e); sideX[e.dataset.lado] = b.x + b.w / 2; });

            const novoSvg = (id, z) => {
                const s = document.createElementNS(NS, 'svg');
                s.setAttribute('data-qdt-svg', '1');
                if (id) s.setAttribute('id', id);
                s.setAttribute('width', W); s.setAttribute('height', H);
                s.setAttribute('viewBox', `0 0 ${W} ${H}`);
                s.style.cssText = `position:absolute;left:0;top:0;pointer-events:none;z-index:${z};overflow:visible`;
                quadro.appendChild(s);
                return s;
            };
            const svgPente = novoSvg('svgPenteQuadro', 20);
            const svg = novoSvg('svgFiacaoQuadro', 25);
            if (!config.modoFiacao) svg.style.display = 'none';

            // Alocação de "pistas" para que cabos paralelos não se sobreponham
            const contPista = {};
            const pista = (chave, faixa, passo) => {
                const i = (contPista[chave] = (contPista[chave] || 0) + 1) - 1;
                const n = Math.max(1, Math.floor(faixa / passo));
                const k = i % (n + 1);
                return (k - n / 2) * passo;
            };

            const fio = (alvo, pts, tipo, circuito, largura, titulo) => {
                const c = QDT_CORES_FIO[tipo] || QDT_CORES_FIO.R;
                const g = document.createElementNS(NS, 'g');
                g.setAttribute('class', 'svg-cabo-fiacao');
                g.setAttribute('data-circuito', circuito);
                g.style.pointerEvents = 'stroke';
                g.style.cursor = 'pointer';
                const d = qdtPtsParaPath(pts);
                const lw = largura || 2.4;
                const mk = (stroke, sw, dash) => {
                    const p = document.createElementNS(NS, 'path');
                    p.setAttribute('d', d);
                    p.setAttribute('fill', 'none');
                    p.setAttribute('stroke', stroke);
                    p.setAttribute('stroke-width', sw);
                    p.setAttribute('stroke-linecap', 'round');
                    p.setAttribute('stroke-linejoin', 'round');
                    p.style.pointerEvents = 'stroke';
                    p.style.cursor = 'pointer';
                    if (dash) p.setAttribute('stroke-dasharray', dash);
                    g.appendChild(p);
                };
                mk(c.contorno, lw + 1.8);
                mk(c.cor, lw);
                if (c.listra) mk(c.listra, lw * 0.45, '6 6');
                const t = document.createElementNS(NS, 'title');
                t.textContent = titulo || c.nome;
                g.appendChild(t);

                // Hover listeners interativos para fiação virtual desktop
                g.addEventListener('mouseenter', (ev) => {
                    if (typeof qdtDestacarCaboHover === 'function') {
                        qdtDestacarCaboHover(circuito, tipo, titulo || c.nome, ev);
                    }
                });
                g.addEventListener('mousemove', (ev) => {
                    if (typeof qdtMoverTooltipCaboHover === 'function') {
                        qdtMoverTooltipCaboHover(ev);
                    }
                });
                g.addEventListener('mouseleave', () => {
                    if (typeof qdtLimparCaboHover === 'function') {
                        qdtLimparCaboHover();
                    }
                });

                alvo.appendChild(g);
            };

            // Rota ortogonal: borne → canal horizontal → canaleta lateral → canal destino → borne
            const rota = (a, b, lado) => {
                const ya = chanY[a.ch] + pista('c' + a.ch, 20, 2.6);
                if (a.ch === b.ch && !lado) {
                    return [[a.x, a.y], [a.x, ya], [b.x, ya], [b.x, b.y]];
                }
                const ladoUsado = lado || (((a.x + b.x) / 2) < W / 2 ? 'L' : 'R');
                const yb = chanY[b.ch] + pista('c' + b.ch, 20, 2.6);
                const sx = sideX[ladoUsado] + pista('s' + ladoUsado, 32, 2.3);
                return [[a.x, a.y], [a.x, ya], [sx, ya], [sx, yb], [b.x, yb], [b.x, b.y]];
            };

            // Bornes medidos no DOM
            const borne = (reg, polo, pos) => {
                const b = rel(reg.el);
                const escala = b.w / ((reg.item.polos || 1) * QDT_MOD_PX);
                return {
                    x: b.x + (polo + 0.5) * QDT_MOD_PX * escala,
                    y: pos === 'top' ? b.y + QDT_TERM_OFF : b.y + b.h - QDT_TERM_OFF,
                    ch: pos === 'top' ? reg.row : reg.row + 1
                };
            };
            const contBarra = {};
            const borneBarra = (id) => {
                const el = quadro.querySelector(`[data-barra="${id}"]`);
                if (!el) return null;
                const b = rel(el);
                const k = contBarra[id] = (contBarra[id] || 0) + 1;
                const passo = Math.max(6, (b.w - 16) / 13);
                return { x: b.x + 8 + ((k - 1) % 14) * passo, y: b.y + 3, ch: nRows };
            };

            const esq = config.esquemaAterramento;
            const fasesSist = qdtFasesSistema(config.sistemaEntrada);
            const geral = registro.find(r => r.item.tipo === 'geral');
            const dpsList = registro.filter(r => r.item.tipo === 'dps');
            const idrs = registro.filter(r => r.item.tipo === 'idr');
            const idrIds = idrs.map(r => r.item.id);
            const circs = registro.filter(r => r.item.tipo === 'circuito');
            if (!geral) return;

            // ---------- 1. Chegada do ramal (eletroduto superior) ----------
            const entradas = [];
            if (esq === 'TN-S' || esq === 'TT') entradas.push({ id: 'T', tipo: 'PE', rot: esq === 'TT' ? 'T (haste)' : 'T' });
            fasesSist.forEach((f, i) => entradas.push({ id: f, tipo: f, rot: 'F' + (i + 1) }));
            entradas.push(esq === 'TN-C' || esq === 'TN-C-S' ? { id: 'N', tipo: 'PEN', rot: 'PEN' } : { id: 'N', tipo: 'N', rot: 'N' });

            const xGeral = rel(geral.el).x;
            const x0Entr = Math.max(sideX.L + 30, xGeral - 4);
            const ent = {};
            entradas.forEach((e, i) => {
                const x = x0Entr + i * 16;
                ent[e.id] = { x, y: 12, ch: 0, tipo: e.tipo };
                const txt = document.createElementNS(NS, 'text');
                txt.setAttribute('x', x); txt.setAttribute('y', 8);
                txt.setAttribute('text-anchor', 'middle');
                txt.setAttribute('font-size', '9'); txt.setAttribute('font-weight', '800');
                txt.setAttribute('font-family', 'monospace');
                txt.setAttribute('fill', e.tipo === 'S' ? '#cbd5e1' : (QDT_CORES_FIO[e.tipo].cor));
                txt.textContent = e.rot;
                svg.appendChild(txt);
            });

            // Fases do ramal → bornes superiores do Disjuntor Geral
            fasesSist.forEach((f, i) => {
                const b = borne(geral, i, 'top');
                fio(svg, rota(ent[f], b), f, 'geral', 3.2, `Ramal ${f} → Disjuntor Geral`);
            });

            const saidaGeral = (f) => { const i = fasesSist.indexOf(f); return i >= 0 ? borne(geral, i, 'bottom') : null; };

            // ---------- 2. Barras PE / PEN ----------
            const idBarraTerra = esq === 'TN-C' ? 'pen' : 'pe';
            if (ent.T) { const b = borneBarra('pe'); if (b) fio(svg, rota(ent.T, b, 'L'), 'PE', 'geral', 3.2, 'Condutor de proteção do ramal → Barra PE'); }
            if (esq === 'TN-C-S' || esq === 'TN-C') {
                const b = borneBarra(idBarraTerra);
                if (b) fio(svg, rota(ent.N, b, 'L'), 'PEN', 'geral', 3.2, 'PEN do ramal → ' + (esq === 'TN-C' ? 'Barra PEN' : 'Barra PE / BEP'));
            }
            // Origem do neutro para IDRs e barra de neutro direto
            const origemNeutro = () => {
                if (esq === 'TN-C-S') {
                    const b = borneBarra('pe');
                    return b ? { ...b, ch: nRows, deBarra: true } : ent.N;
                }
                return ent.N;
            };

            // ---------- 3. DPS ----------
            const centelhador = dpsList.find(d => d.item.id === 'dps_centelhador');
            dpsList.forEach(d => {
                if (d === centelhador) return;
                const sub = String(d.item.subnome || '');
                const topo = borne(d, 0, 'top');
                if (/neutro/i.test(sub)) {
                    fio(svg, rota(ent.N, topo), 'N', 'dps', 2.2, 'Neutro → DPS N');
                } else {
                    const m = sub.match(/Fase\s*(\d)/i);
                    const f = fasesSist[m ? (parseInt(m[1], 10) - 1) : 0] || 'R';
                    const sg = saidaGeral(f);
                    if (sg) fio(svg, rota(sg, topo, 'L'), f, 'dps', 2.2, `Saída Geral ${f} → DPS`);
                }
                const baseD = borne(d, 0, 'bottom');
                if (centelhador) {
                    fio(svg, rota(baseD, borne(centelhador, 0, 'top'), 'L'), 'N', 'dps', 2.2, 'DPS fase → barramento N do centelhador (TT 3+1)');
                } else {
                    const bt = borneBarra(idBarraTerra);
                    if (bt) fio(svg, rota(baseD, bt, 'L'), esq === 'TN-C' ? 'PEN' : 'PE', 'dps', 2.2, 'DPS → ' + (esq === 'TN-C' ? 'Barra PEN' : 'Barra PE'));
                }
            });
            if (centelhador) {
                fio(svg, rota(ent.N, borne(centelhador, 0, 'top')), 'N', 'dps', 2.2, 'Neutro → centelhador N-PE');
                const bt = borneBarra('pe');
                if (bt) fio(svg, rota(borne(centelhador, 0, 'bottom'), bt, 'L'), 'PE', 'dps', 2.2, 'Centelhador → Barra PE');
            }

            // ---------- 4. IDRs (tetrapolar: N, R, S, T) ----------
            idrs.forEach((idr, n) => {
                const polos = qdtPolosIdr(idr.item);
                polos.forEach((p, k) => {
                    const entIdr = borne(idr, k, 'top');
                    if (p === 'N') {
                        const origem = origemNeutro();
                        fio(svg, rota(origem, entIdr, origem.deBarra ? 'L' : null), 'N', 'idr',
                            2.8, esq === 'TN-C-S' ? 'Neutro derivado do BEP (jumper PEN) → IDR' : 'Neutro do ramal → IDR');
                    } else if (fasesSist.includes(p)) {
                        const sg = saidaGeral(p);
                        if (sg) fio(svg, rota(sg, entIdr, 'L'), p, 'idr', 2.8, `Saída Geral ${p} → entrada IDR`);
                    }
                });
                // Saída de neutro do IDR → sua barra de neutro exclusiva
                const kN = polos.indexOf('N');
                const bn = kN >= 0 ? borneBarra('n_' + idr.item.id) : null;
                if (bn) fio(svg, rota(borne(idr, kN, 'bottom'), bn, 'R'), 'N', 'idr', 2.8, `Neutro protegido (${idr.item.subnome}) → barra de neutro`);
            });

            // Barra de neutro direto (circuitos sem DR)
            if (quadro.querySelector('[data-barra="n_direto"]')) {
                const origem = origemNeutro();
                const bn = borneBarra('n_direto');
                if (bn) fio(svg, rota(origem, bn, 'L'), 'N', 'geral', 2.8, 'Neutro direto → barra sem DR');
            }

            // ---------- 5. Barramento pente + alimentação por grupo ----------
            const saidaFonte = (fonteId, f) => {
                if (fonteId === 'geral') return saidaGeral(f);
                const idr = idrs.find(r => r.item.id === fonteId);
                if (!idr) return saidaGeral(f);
                const k = qdtPolosIdr(idr.item).indexOf(f);
                return k >= 0 ? borne(idr, k, 'bottom') : null;
            };
            const nomePente = fasesSist.length === 3 ? 'PENTE TRIFÁSICO' : (fasesSist.length === 2 ? 'PENTE BIFÁSICO' : 'PENTE MONOFÁSICO');

            for (let r = 0; r < nRows; r++) {
                const daLinha = circs.filter(c => c.row === r);
                const segmentos = [];
                daLinha.forEach(c => {
                    const fonte = qdtFonteCircuito(c.item, idrIds, esq);
                    const ult = segmentos[segmentos.length - 1];
                    if (ult && ult.fonte === fonte) ult.regs.push(c); else segmentos.push({ fonte, regs: [c] });
                });

                segmentos.forEach(seg => {
                    const r0 = rel(seg.regs[0].el), r1 = rel(seg.regs[seg.regs.length - 1].el);
                    const x1 = r0.x + 3, x2 = r1.x + r1.w - 3;
                    const yBar = r0.y - 11;

                    // Dentes do pente: cada pólo pega a fase atribuída ao circuito
                    const fasesUsadas = new Set();
                    seg.regs.forEach(c => {
                        const fs = qdtFasesDoCircuito(c.item.dados);
                        fs.forEach((f, k) => {
                            fasesUsadas.add(f);
                            const t = borne(c, k, 'top');
                            fio(svgPente, [[t.x, yBar + 3], [t.x, t.y]], f, `C${c.item.dados.num}`, 2.4, `Dente do pente (${f}) → C${c.item.dados.num}`);
                        });
                    });

                    const rect = document.createElementNS(NS, 'rect');
                    rect.setAttribute('x', x1); rect.setAttribute('y', yBar - 3);
                    rect.setAttribute('width', Math.max(10, x2 - x1)); rect.setAttribute('height', 8);
                    rect.setAttribute('rx', 2);
                    rect.setAttribute('fill', '#e7d3a8'); rect.setAttribute('stroke', '#92400e'); rect.setAttribute('stroke-width', '1');
                    svgPente.appendChild(rect);
                    const lbl = document.createElementNS(NS, 'text');
                    lbl.setAttribute('x', (x1 + x2) / 2); lbl.setAttribute('y', yBar + 3.3);
                    lbl.setAttribute('text-anchor', 'middle'); lbl.setAttribute('font-size', '6.5');
                    lbl.setAttribute('font-weight', '800'); lbl.setAttribute('font-family', 'monospace');
                    lbl.setAttribute('fill', '#78350f');
                    const fonteNome = seg.fonte === 'geral' ? 'via Geral' : ('via ' + (idrs.find(i => i.item.id === seg.fonte)?.item.nome || 'IDR'));
                    lbl.textContent = `${nomePente} • ${fonteNome}`;
                    svgPente.appendChild(lbl);

                    // Alimentação do pente a partir da fonte (Geral ou IDR)
                    Array.from(fasesUsadas).sort().forEach((f, i) => {
                        const origem = saidaFonte(seg.fonte, f);
                        if (!origem) return;
                        const destino = { x: x1 + 6 + i * 7, y: yBar - 3, ch: r };
                        fio(svg, rota(origem, destino, 'L'), f, 'idr', 2.8, `Alimentação do pente (${f}) ${fonteNome}`);
                    });
                });
            }

            // ---------- 6. Saídas dos circuitos para as cargas ----------
            const contSaida = { L: 0, R: 0 };
            const yFundo = chanY[String(nRows + 1)];
            circs.forEach(c => {
                const dc = c.item.dados;
                const fs = qdtFasesDoCircuito(dc);
                const lw = (dc.secaoMm2 >= 6) ? 2.6 : (dc.secaoMm2 >= 4 ? 2.2 : 1.7);
                fs.forEach((f, k) => {
                    const a = borne(c, k, 'bottom');
                    const lado = a.x < W / 2 ? 'L' : 'R';
                    const ya = chanY[a.ch] + pista('c' + a.ch, 20, 2.6);
                    const sx = sideX[lado] + pista('s' + lado, 32, 2.3);
                    const i = contSaida[lado]++;
                    const xs = lado === 'L' ? sideX.L + 26 + i * 4.5 : sideX.R - 26 - i * 4.5;
                    const yf = yFundo + pista('c' + (nRows + 1), 22, 2.4);
                    const pts = [[a.x, a.y], [a.x, ya], [sx, ya], [sx, yf], [xs, yf], [xs, H + 6]];
                    fio(svg, pts, f, `C${dc.num}`, lw, `C${dc.num} • ${dc.nome} • ${f}`);
                });
            });
        }

        // RENDERIZA OS BARRAMENTOS DINÂMICOS NA BASE DO QUADRO (NEUTRO E TERRA)
        function renderizarBarramentosDinamicos(config) {
            const container = document.getElementById('containerBarramentosQuadro');
            if (!container) return;
            container.innerHTML = '';

            const esq = config.esquemaAterramento;
            const cfgIdr = config.tipoConfigIdr;

            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono';

            if (cfgIdr === 'idr_grupos' && esq !== 'TN-C') {
                // Dois barramentos de neutro isolados independentes!
                grid.innerHTML = `
                    <div class="space-y-2">
                        <div class="bg-blue-950/40 border border-blue-500/50 p-2.5 rounded-xl flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full bg-blue-400"></span>
                                <div>
                                    <span class="font-bold text-blue-200 block">Barramento Neutro 1 (Social / Ilum.)</span>
                                    <span class="text-[9px] text-blue-400">Protegido por IDR 1 (30mA)</span>
                                </div>
                            </div>
                            <span class="text-blue-300 font-bold bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700/60">12 Bornes</span>
                        </div>

                        <div class="bg-indigo-950/40 border border-indigo-500/50 p-2.5 rounded-xl flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full bg-indigo-400"></span>
                                <div>
                                    <span class="font-bold text-indigo-200 block">Barramento Neutro 2 (Áreas Molhadas)</span>
                                    <span class="text-[9px] text-indigo-400">Protegido por IDR 2 (30mA)</span>
                                </div>
                            </div>
                            <span class="text-indigo-300 font-bold bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/60">12 Bornes</span>
                        </div>
                    </div>

                    <div class="bg-emerald-950/40 border border-emerald-600/40 p-2.5 rounded-xl flex flex-col justify-between">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full bg-emerald-500 border border-yellow-400"></span>
                                <span class="font-bold text-emerald-300">Barramento de Proteção PE / Terra (Verde/Amarelo)</span>
                            </div>
                            <span class="text-emerald-400 font-bold">18 Bornes Aterrados</span>
                        </div>
                        <p class="text-[9px] text-slate-400">Condutor PE equipotencializado. Recebe o terra de entrada, DPS e todos os condutores de proteção dos circuitos.</p>
                    </div>
                `;
            } else if (cfgIdr === 'idr_parcial' && esq !== 'TN-C') {
                grid.innerHTML = `
                    <div class="space-y-2">
                        <div class="bg-slate-900 border border-slate-700 p-2.5 rounded-xl flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full bg-slate-400"></span>
                                <div>
                                    <span class="font-bold text-slate-200 block">Barramento Neutro Direto (Rede)</span>
                                    <span class="text-[9px] text-slate-400">Circuitos secos sem DR</span>
                                </div>
                            </div>
                            <span class="text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">8 Bornes</span>
                        </div>

                        <div class="bg-blue-950/40 border border-blue-500/50 p-2.5 rounded-xl flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full bg-blue-400"></span>
                                <div>
                                    <span class="font-bold text-blue-200 block">Barramento Neutro Protegido (IDR Parcial)</span>
                                    <span class="text-[9px] text-blue-400">Banheiros, Cozinhas, TUEs</span>
                                </div>
                            </div>
                            <span class="text-blue-300 font-bold bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700/60">12 Bornes</span>
                        </div>
                    </div>

                    <div class="bg-emerald-950/40 border border-emerald-600/40 p-2.5 rounded-xl flex flex-col justify-between">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full bg-emerald-500 border border-yellow-400"></span>
                                <span class="font-bold text-emerald-300">Barramento de Proteção PE / Terra</span>
                            </div>
                            <span class="text-emerald-400 font-bold">18 Bornes</span>
                        </div>
                        <p class="text-[9px] text-slate-400">Condutor PE contínuo para todos os circuitos terminais (NBR 5410 Tabela 54).</p>
                    </div>
                `;
            } else if (esq === 'TN-C-S') {
                grid.innerHTML = `
                    <div class="bg-blue-950/40 border border-blue-600/40 p-2.5 rounded-xl flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                            <div>
                                <span class="font-bold text-blue-300 block">Barramento de Neutro Isolado (Após IDR)</span>
                                <span class="text-[9px] text-slate-400">Separado do PE a partir do IDR</span>
                            </div>
                        </div>
                        <span class="text-blue-400 font-bold">16 Bornes</span>
                    </div>

                    <div class="bg-emerald-950/40 border border-emerald-600/40 p-2.5 rounded-xl flex items-center justify-between relative overflow-hidden">
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-emerald-500 border border-yellow-400"></span>
                            <div>
                                <span class="font-bold text-emerald-300 block">Barramento PE / BEP (Entrada PEN)</span>
                                <span class="text-[9px] text-amber-300 font-bold flex items-center gap-1">
                                    <i class="fa-solid fa-link text-[8px]"></i> Jumper Equipotencial em Cobre
                                </span>
                            </div>
                        </div>
                        <span class="text-emerald-400 font-bold">16 Bornes (BEP)</span>
                    </div>
                `;
            } else if (esq === 'TN-C') {
                grid.innerHTML = `
                    <div class="bg-slate-900 border border-rose-500/50 p-2.5 rounded-xl flex items-center justify-between md:col-span-2">
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-blue-500 border border-emerald-400"></span>
                            <div>
                                <span class="font-bold text-rose-300 block">Barramento Único PEN (Condutor Neutro de Proteção Combinado)</span>
                                <span class="text-[9px] text-slate-400">Esquema TN-C: Proteção contra choques exclusivamente por seccionamento automático via disjuntor termomagnético.</span>
                            </div>
                        </div>
                        <span class="text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">24 Bornes PEN</span>
                    </div>
                `;
            } else {
                // TN-S Padrão ou TT
                grid.innerHTML = `
                    <div class="bg-blue-950/40 border border-blue-600/40 p-2.5 rounded-xl flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                            <div>
                                <span class="font-bold text-blue-300 block">Barramento de Neutro Isolado (Azul)</span>
                                <span class="text-[9px] text-slate-400">Alimentado pela saída do IDR Geral</span>
                            </div>
                        </div>
                        <span class="text-blue-400 font-bold">16 Bornes de Conexão</span>
                    </div>

                    <div class="bg-emerald-950/40 border border-emerald-600/40 p-2.5 rounded-xl flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-emerald-500 border border-yellow-400"></span>
                            <div>
                                <span class="font-bold text-emerald-300 block">Barramento de Proteção PE / Terra (Verde/Amarelo)</span>
                                <span class="text-[9px] text-slate-400">${esq === 'TT' ? 'Aterramento local independente' : 'Condutor PE independente'}</span>
                            </div>
                        </div>
                        <span class="text-emerald-400 font-bold">16 Bornes Aterrados</span>
                    </div>
                `;
            }

            container.appendChild(grid);
        }



        // ---------------------------------------------------------------
        // MODELO COMERCIAL DO IDR (polos, corrente, sensibilidade e tipo)
        // ---------------------------------------------------------------
        function alterarModeloIdr(campo, valor) {
            state.modeloIdr = Object.assign({ polos: 'auto', corrente: 'auto', sensibilidade: 30, tipo: 'AC' }, state.modeloIdr || {});
            state.modeloIdr[campo] = (campo === 'sensibilidade' || (campo === 'corrente' && valor !== 'auto')) ? Number(valor) : valor;
            // corrente fixa que não existe no novo número de polos volta para automática
            if (campo === 'polos' && state.modeloIdr.corrente !== 'auto') {
                const pol = valor === '2P' ? '2P' : '4P';
                if (!NBR5410.IDR_CORRENTES_COMERCIAIS[pol].includes(state.modeloIdr.corrente)) state.modeloIdr.corrente = 'auto';
            }
            if (typeof atualizarTudo === 'function') atualizarTudo();
            renderizarQuadroDIN(state.circuitosCalculados);
        }

        function atualizarPainelModeloIdr(plano) {
            const m = Object.assign({ polos: 'auto', corrente: 'auto', sensibilidade: 30, tipo: 'AC' }, state.modeloIdr || {});
            const selP = document.getElementById('selIdrPolos');
            const selC = document.getElementById('selIdrCorrente');
            const selS = document.getElementById('selIdrSensibilidade');
            const selT = document.getElementById('selIdrTipo');
            const polosEfetivos = (plano && plano.idrs[0] && plano.idrs[0].polos) || (m.polos === '2P' ? '2P' : '4P');
            if (selP) selP.value = m.polos;
            if (selC) {
                const lista = NBR5410.IDR_CORRENTES_COMERCIAIS[polosEfetivos];
                selC.innerHTML = '<option value="auto">Automática</option>' + lista.map(a => `<option value="${a}">${a} A</option>`).join('');
                selC.value = String(m.corrente);
            }
            if (selS) selS.value = String(m.sensibilidade);
            if (selT) selT.value = m.tipo;
            const resumo = document.getElementById('txtResumoModeloIdr');
            const alertas = document.getElementById('listaAlertasModeloIdr');
            const desativado = !plano || !plano.idrs.length;
            ['selIdrPolos', 'selIdrCorrente', 'selIdrSensibilidade', 'selIdrTipo'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = desativado; });
            if (resumo) {
                if (desativado) {
                    resumo.textContent = (state.esquemaAterramento === 'TN-C') ? 'Esquema TN-C: dispositivo DR não pode ser usado (NBR 5410 5.1.3.2.3).'
                        : 'DDR individual: cada circuito tem disjuntor com DR próprio (RCBO), sem IDR no quadro.';
                } else {
                    const qtd = {};
                    plano.idrs.forEach(i => { const k = `IDR ${i.polos === '4P' ? 'tetrapolar' : 'bipolar'} ${i.corrente} A ${i.sensibilidade} mA tipo ${i.tipo}`; qtd[k] = (qtd[k] || 0) + 1; });
                    resumo.textContent = 'No quadro: ' + Object.entries(qtd).map(([k, n]) => `${n} × ${k}`).join(' + ')
                        + '. Comerciais: bipolar 25/40/63/80/100 A; tetrapolar 25/40/63/80/100/125 A.';
                }
            }
            if (alertas) alertas.innerHTML = (plano && plano.alertas || []).map(a => `<li>${escHtml(a)}</li>`).join('');
        }

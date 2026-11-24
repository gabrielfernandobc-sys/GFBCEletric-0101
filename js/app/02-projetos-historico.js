/* PRO-ELÉTRICA CAD — 02-projetos-historico.js
   Projetos, checkpoints, sanitização de textos, desfazer/refazer, aba Arquivos e pasta projetos/.
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        // =========================================================================
        // SISTEMA DE PROJETOS, PONTOS DE SALVAMENTO (CHECKPOINTS) & ARQUIVOS
        // =========================================================================

        let _timerToast = null;
        function mostrarNotificacaoToast(mensagem, tipo = 'sucesso') {
            const toast = document.getElementById('toastNotificacao');
            const txt = document.getElementById('toastMensagem');
            const icone = document.getElementById('toastIcone');
            if (!toast || !txt) return;

            // no celular fica acima da barra de abas inferior
            const base = 'fixed bottom-20 lg:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-[60] bg-slate-900 border text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs transition-all duration-300';
            const estilos = {
                sucesso: ['border-emerald-500', 'fa-circle-check text-emerald-400'],
                aviso: ['border-amber-500', 'fa-triangle-exclamation text-amber-400'],
                info: ['border-sky-500', 'fa-circle-info text-sky-400'],
                erro: ['border-red-500', 'fa-circle-xmark text-red-400']
            };
            const [borda, ic] = estilos[tipo] || estilos.erro;
            txt.textContent = mensagem;
            toast.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
            toast.className = `${base} ${borda} opacity-100 translate-y-0`;
            if (icone) icone.innerHTML = `<i class="fa-solid ${ic} text-base"></i>`;

            clearTimeout(_timerToast);
            _timerToast = setTimeout(() => {
                toast.className = `${base} ${borda} pointer-events-none opacity-0 translate-y-4`;
            }, 3500);
        }

        // =========================================================================
        // SEGURANÇA: TEXTOS VINDOS DE ARQUIVOS, SERVIDOR OU NAVEGADOR
        // Nomes de cômodos, pontos e projetos são exibidos via innerHTML em vários
        // pontos do app. Para que um arquivo .proeletrica (ou DXF) de terceiros não
        // consiga injetar HTML/JavaScript, os caracteres que abrem tags, atributos e
        // strings são trocados por equivalentes tipográficos visualmente iguais.
        // =========================================================================
        // Escapa texto para inserir em HTML (títulos de anúncios, nomes de itens com aspas...)
        function escHtml(v) {
            return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
        }

        const _MAPA_TEXTO_SEGURO = { '<': '‹', '>': '›', '"': '”', "'": '’', '`': 'ˋ' };
        function textoSeguro(v) {
            if (typeof v !== 'string' || v.startsWith('data:')) return v;
            return v.replace(/[<>"'`]/g, c => _MAPA_TEXTO_SEGURO[c]);
        }
        function sanitizarTextosProfundo(v) {
            if (typeof v === 'string') return textoSeguro(v);
            if (Array.isArray(v)) return v.map(sanitizarTextosProfundo);
            if (v && typeof v === 'object') {
                const o = {};
                Object.keys(v).forEach(k => { o[textoSeguro(k)] = sanitizarTextosProfundo(v[k]); });
                return o;
            }
            return v;
        }
        // Argumento de função para uso dentro de onclick="...": string JS com aspas escapadas para HTML
        function argJsEmAtributo(v) {
            return JSON.stringify(String(v)).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        // Varredura leve dos nomes editáveis (cobre também o que o usuário digita)
        function sanitizarNomesEstado() {
            const limpar = lista => (lista || []).forEach(o => { if (o && typeof o.nome === 'string') o.nome = textoSeguro(o.nome); });
            limpar(state.comodos); limpar(state.pontosEletricos); limpar(state.pavimentos);
            limpar(state.imoveis); limpar(state.escadas); limpar(state.anotacoes);
            (state.transicoes || []).forEach(t => { if (t) { t.nomeA = textoSeguro(t.nomeA); t.nomeB = textoSeguro(t.nomeB); } });
            if (state.projetoAtual && typeof state.projetoAtual.nome === 'string') state.projetoAtual.nome = textoSeguro(state.projetoAtual.nome);
        }

        function exportarSnapshotEstado() {
            return {
                projetoAtual: JSON.parse(JSON.stringify(state.projetoAtual)),
                pavimentos: JSON.parse(JSON.stringify(state.pavimentos)),
                pavimentoAtivoId: state.pavimentoAtivoId,
                comodos: JSON.parse(JSON.stringify(state.comodos)),
                pontosEletricos: JSON.parse(JSON.stringify(state.pontosEletricos)),
                eletrodutoWaypoints: JSON.parse(JSON.stringify(state.eletrodutoWaypoints || {})),
                transicoes: JSON.parse(JSON.stringify(state.transicoes || [])),
                escadas: JSON.parse(JSON.stringify(state.escadas || [])),
                imoveis: JSON.parse(JSON.stringify(state.imoveis || [])),
                regimeImovel: state.regimeImovel || 'mesmo_imovel',
                unidadeQdtAtivaId: state.unidadeQdtAtivaId || 'todos',
                qdtPos: { ...state.qdtPos },
                prumadaPos: { ...state.prumadaPos },
                prumadaAtiva: state.prumadaAtiva !== false,
                alimentacaoExterna: { ...state.alimentacaoExterna },
                parametrosNBR: { ...obterParametrosNBR() },

                // Configurações do Terreno Total (Lote)
                terreno: state.terreno ? JSON.parse(JSON.stringify(state.terreno)) : null,

                // Escala de Desenho CAD
                escala: state.escala || 40,

                // Desenhos Vetoriais e Underlay
                linhasMaoLivre: JSON.parse(JSON.stringify(state.linhasMaoLivre || [])),
                cadUnderlay: JSON.parse(JSON.stringify(state.cadUnderlay || [])),
                exibirCadUnderlay: state.exibirCadUnderlay !== false,

                // Infraestrutura Elétrica e Concessionária
                tipoPassagemCabos: state.tipoPassagemCabos || 'teto',
                concessionariaId: state.concessionariaId || 'cpfl',
                comprimentosManuaisCircuitos: JSON.parse(JSON.stringify(state.comprimentosManuaisCircuitos || {})),
                cargasFormulario: JSON.parse(JSON.stringify(state.cargasFormulario || [])),

                // Espessura Normativa das Paredes (NBR 15575)
                espessuraParede: state.espessuraParede || 0.15,

                // Parâmetros do Quadro Real de Distribuição (NBR 5410)
                esquemaAterramento: state.esquemaAterramento || 'TN-S',
                tipoConfigIdr: state.tipoConfigIdr || 'idr_geral',
                modeloIdr: state.modeloIdr || null,
                maoDeObra: state.maoDeObra ? JSON.parse(JSON.stringify(state.maoDeObra)) : null,
                // Automação residencial (aba Automação): nível, tecnologia, lista editada, hub, painel e nobreak
                automacao: state.automacao ? JSON.parse(JSON.stringify(state.automacao)) : null,
                estiloInstalacoes: state.estiloInstalacoes || 'unifilar',
                modoFiacaoQuadro: state.modoFiacaoQuadro !== false,
                modoCanaletasQuadro: state.modoCanaletasQuadro || 'abertas',
                modoVisualQuadro: state.modoVisualQuadro || 'interno',

                // Modos de CAD, Snapping e Legenda
                snapMagnetico: state.snapMagnetico !== false,
                exibirLegendaTransicoes: state.exibirLegendaTransicoes !== false,
                exibirRotulosTransicoesTexto: !!state.exibirRotulosTransicoesTexto,
                exibirRotulosInstalacoes: !!state.exibirRotulosInstalacoes,
                exibirGabaritoFantasma: state.exibirGabaritoFantasma !== false,

                // Modos e Visualizações 3D
                exibirLajesPiso3D: state.exibirLajesPiso3D !== false,
                exibirLajesTeto3D: state.exibirLajesTeto3D !== false,
                filtroPavimento3d: state.filtroPavimento3d || 'todos',
                filtroElemento3d: state.filtroElemento3d || 'todos',
                raioX3d: !!state.raioX3d,
                explodido3d: !!state.explodido3d,

                // Estado de Fixação dos Cômodos (Trava contra movimentação acidental)
                comodosFixados: !!state.comodosFixados,

                // Tabela de Preços e Cotações Personalizadas (Metros & Rolos)
                tabelaPrecos: state.tabelaPrecos ? JSON.parse(JSON.stringify(state.tabelaPrecos)) : null,

                // Onde o usuário parou (aba e ferramentas ativas)
                abaAtiva: state.abaAtiva || 'planta',
                ferramentaAtiva: state.ferramentaAtiva || 'select',
                ferramentaInstalacoes: state.ferramentaInstalacoes || 'mover_pontos'
            };
        }

        function restaurarSnapshotEstado(snapshot) {
            if (!snapshot) return;
            snapshot = sanitizarTextosProfundo(snapshot);
            if (snapshot.projetoAtual) state.projetoAtual = JSON.parse(JSON.stringify(snapshot.projetoAtual));
            if (snapshot.pavimentos) state.pavimentos = JSON.parse(JSON.stringify(snapshot.pavimentos));
            if (snapshot.pavimentoAtivoId) state.pavimentoAtivoId = snapshot.pavimentoAtivoId;
            if (snapshot.comodos) state.comodos = JSON.parse(JSON.stringify(snapshot.comodos));
            if (snapshot.pontosEletricos) state.pontosEletricos = JSON.parse(JSON.stringify(snapshot.pontosEletricos));
            if (snapshot.eletrodutoWaypoints) state.eletrodutoWaypoints = JSON.parse(JSON.stringify(snapshot.eletrodutoWaypoints));
            if (snapshot.transicoes) state.transicoes = JSON.parse(JSON.stringify(snapshot.transicoes));
            state.escadas = snapshot.escadas ? JSON.parse(JSON.stringify(snapshot.escadas)) : [];
            if (snapshot.imoveis) state.imoveis = JSON.parse(JSON.stringify(snapshot.imoveis));
            if (snapshot.regimeImovel) state.regimeImovel = snapshot.regimeImovel;
            if (snapshot.unidadeQdtAtivaId) state.unidadeQdtAtivaId = snapshot.unidadeQdtAtivaId;
            if (snapshot.qdtPos) state.qdtPos = { ...snapshot.qdtPos };
            if (snapshot.prumadaPos) state.prumadaPos = { ...snapshot.prumadaPos };
            if (snapshot.prumadaAtiva !== undefined) state.prumadaAtiva = snapshot.prumadaAtiva;
            if (snapshot.esquemaAterramento) state.esquemaAterramento = snapshot.esquemaAterramento;
            if (snapshot.tipoConfigIdr) state.tipoConfigIdr = snapshot.tipoConfigIdr;
            state.modeloIdr = (snapshot.modeloIdr && typeof snapshot.modeloIdr === 'object') ? {
                polos: ['auto', '2P', '4P'].includes(snapshot.modeloIdr.polos) ? snapshot.modeloIdr.polos : 'auto',
                corrente: Number(snapshot.modeloIdr.corrente) > 0 ? Number(snapshot.modeloIdr.corrente) : 'auto',
                sensibilidade: Number(snapshot.modeloIdr.sensibilidade) === 300 ? 300 : 30,
                tipo: snapshot.modeloIdr.tipo === 'A' ? 'A' : 'AC'
            } : null;
            if (snapshot.estiloInstalacoes === 'colorido' || snapshot.estiloInstalacoes === 'unifilar') state.estiloInstalacoes = snapshot.estiloInstalacoes;
            // Mão de obra: modo, valores editados, horas, BDI e opções (só números e chaves conhecidas)
            const mo = snapshot.maoDeObra;
            if (mo && typeof mo === 'object') {
                const numeros = o => { const r = {}; Object.keys(o || {}).forEach(k => { if (/^[A-Za-z]{1,40}$/.test(k) && isFinite(Number(o[k])) && Number(o[k]) >= 0) r[k] = Number(o[k]); }); return r; };
                state.maoDeObra = {
                    modo: ['ponto', 'percentual', 'm2', 'horas'].includes(mo.modo) ? mo.modo : 'ponto',
                    tabela: numeros(mo.tabela), horas: numeros(mo.horas),
                    bdiPct: Math.max(0, Math.min(200, Number(mo.bdiPct) || 0)),
                    incluirAterramento: mo.incluirAterramento !== false, incluirPadrao: !!mo.incluirPadrao,
                    regiao: typeof mo.regiao === 'string' ? textoSeguro(mo.regiao).slice(0, 60) : ''
                };
            } else {
                state.maoDeObra = null;
            }
            // Automação residencial: só chaves e valores conhecidos (js/app/17-automacao.js)
            state.automacao = (snapshot.automacao && typeof sanitizarConfigAutomacao === 'function') ? sanitizarConfigAutomacao(snapshot.automacao) : null;
            if (snapshot.modoFiacaoQuadro !== undefined) state.modoFiacaoQuadro = snapshot.modoFiacaoQuadro;
            if (snapshot.modoCanaletasQuadro) state.modoCanaletasQuadro = snapshot.modoCanaletasQuadro;
            if (snapshot.modoVisualQuadro) state.modoVisualQuadro = snapshot.modoVisualQuadro;
            if (snapshot.alimentacaoExterna) state.alimentacaoExterna = { ...snapshot.alimentacaoExterna };
            // Projetos antigos (sem parâmetros) passam a usar a premissa padrão de 3 circuitos / 30 °C
            state.parametrosNBR = { ...NBR5410.PARAMETROS_PADRAO, ...(snapshot.parametrosNBR || {}) };
            if (typeof sincronizarControlesParametrosNBR === 'function') sincronizarControlesParametrosNBR();
            if (snapshot.tabelaPrecos) state.tabelaPrecos = JSON.parse(JSON.stringify(snapshot.tabelaPrecos));

            // Terreno Total (Lote) - Preserva fielmente as medidas e configurações salvas
            if (snapshot.terreno) {
                state.terreno = JSON.parse(JSON.stringify(snapshot.terreno));
                if (state.terreno.largura && state.terreno.comprimento) {
                    state.terreno.customizado = true;
                }
            } else if (!state.terreno) {
                if (typeof ajustarTerrenoAosComodos === 'function') ajustarTerrenoAosComodos();
            }

            // Escala de Desenho CAD
            if (snapshot.escala) {
                state.escala = snapshot.escala;
                const selEscala = document.getElementById('selEscalaProporcao');
                if (selEscala) selEscala.value = String(snapshot.escala);
                const lblEscala = document.getElementById('lblEscalaAtual');
                if (lblEscala) lblEscala.innerText = `${snapshot.escala}px/m`;
                const pct = Math.round((snapshot.escala / 35.0) * 100);
                document.querySelectorAll('.lbl-zoom-cad-pct').forEach(el => el.innerText = pct + '%');
            }

            // Linhas Livres e CAD Underlay
            if (snapshot.linhasMaoLivre) state.linhasMaoLivre = JSON.parse(JSON.stringify(snapshot.linhasMaoLivre));
            if (snapshot.cadUnderlay) state.cadUnderlay = JSON.parse(JSON.stringify(snapshot.cadUnderlay));
            if (snapshot.exibirCadUnderlay !== undefined) {
                state.exibirCadUnderlay = snapshot.exibirCadUnderlay;
                const chkUnderlay = document.getElementById('chkExibirUnderlay');
                if (chkUnderlay) chkUnderlay.checked = snapshot.exibirCadUnderlay;
            }

            // Infraestrutura Elétrica e Concessionária
            if (snapshot.tipoPassagemCabos) state.tipoPassagemCabos = snapshot.tipoPassagemCabos;
            if (snapshot.concessionariaId) {
                state.concessionariaId = snapshot.concessionariaId;
            } else if (snapshot.concessionaria) {
                state.concessionariaId = snapshot.concessionaria;
            } else if (snapshot.projeto && snapshot.projeto.concessionaria) {
                state.concessionariaId = snapshot.projeto.concessionaria;
            }
            if (snapshot.comprimentosManuaisCircuitos) state.comprimentosManuaisCircuitos = JSON.parse(JSON.stringify(snapshot.comprimentosManuaisCircuitos));
            if (snapshot.cargasFormulario) state.cargasFormulario = JSON.parse(JSON.stringify(snapshot.cargasFormulario));

            // Espessura Normativa das Paredes
            if (snapshot.espessuraParede !== undefined) {
                state.espessuraParede = snapshot.espessuraParede;
                const txtCm = `${Math.round(state.espessuraParede * 100)} cm`;
                const lblEsp = document.getElementById('lblEspessuraParedeAtual');
                if (lblEsp) lblEsp.innerText = txtCm;
                const lblToolbar = document.getElementById('lblEspessuraParedeCadToolbar');
                if (lblToolbar) lblToolbar.innerText = txtCm;
                const lblToolbarInst = document.getElementById('lblEspessuraParedeInstToolbar');
                if (lblToolbarInst) lblToolbarInst.innerText = txtCm;
                const selEsp = document.getElementById('selPresetEspessuraParede');
                if (selEsp) selEsp.value = String(state.espessuraParede);
            }

            // Snapping Magnético
            if (snapshot.snapMagnetico !== undefined) {
                state.snapMagnetico = snapshot.snapMagnetico;
                const btnSnap = document.getElementById('btnToggleSnapMagnetico');
                if (btnSnap) {
                    if (state.snapMagnetico) {
                        btnSnap.classList.add('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40');
                        btnSnap.classList.remove('bg-slate-900', 'text-slate-400', 'border-slate-800');
                        btnSnap.title = 'Snap Magnético: LIGADO';
                    } else {
                        btnSnap.classList.remove('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40');
                        btnSnap.classList.add('bg-slate-900', 'text-slate-400', 'border-slate-800');
                        btnSnap.title = 'Snap Magnético: DESLIGADO';
                    }
                }
            }

            // Legenda e Rótulos de Transições
            if (snapshot.exibirLegendaTransicoes !== undefined) {
                state.exibirLegendaTransicoes = snapshot.exibirLegendaTransicoes;
                const chkLeg = document.getElementById('chkLegendaTransicoes');
                if (chkLeg) chkLeg.checked = snapshot.exibirLegendaTransicoes;
                const legEl = document.getElementById('legendaTransicoesLinha');
                if (legEl) legEl.style.display = snapshot.exibirLegendaTransicoes ? 'flex' : 'none';
            }
            if (snapshot.exibirRotulosTransicoesTexto !== undefined) {
                state.exibirRotulosTransicoesTexto = snapshot.exibirRotulosTransicoesTexto;
                const chkRot = document.getElementById('chkRotulosTransicoes');
                if (chkRot) chkRot.checked = snapshot.exibirRotulosTransicoesTexto;
            }
            if (snapshot.exibirRotulosInstalacoes !== undefined) state.exibirRotulosInstalacoes = snapshot.exibirRotulosInstalacoes;
            if (snapshot.exibirGabaritoFantasma !== undefined) state.exibirGabaritoFantasma = snapshot.exibirGabaritoFantasma;

            // Modos 3D
            if (snapshot.exibirLajesPiso3D !== undefined) state.exibirLajesPiso3D = snapshot.exibirLajesPiso3D;
            if (snapshot.exibirLajesTeto3D !== undefined) state.exibirLajesTeto3D = snapshot.exibirLajesTeto3D;
            if (snapshot.filtroPavimento3d) {
                state.filtroPavimento3d = snapshot.filtroPavimento3d;
                const btnTodos = document.getElementById('btn3dVerTodos');
                const btnTerreo = document.getElementById('btn3dVerTerreo');
                const btnSup = document.getElementById('btn3dVerSuperior');
                if (btnTodos) btnTodos.className = state.filtroPavimento3d === 'todos' ? 'px-3 py-1.5 rounded-lg font-bold bg-emerald-500 text-slate-950 shadow' : 'px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white';
                if (btnTerreo) btnTerreo.className = state.filtroPavimento3d === 'terreo' ? 'px-3 py-1.5 rounded-lg font-bold bg-emerald-500 text-slate-950 shadow' : 'px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white';
                if (btnSup) btnSup.className = state.filtroPavimento3d === 'superior' ? 'px-3 py-1.5 rounded-lg font-bold bg-emerald-500 text-slate-950 shadow' : 'px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white';
            }
            if (snapshot.filtroElemento3d) state.filtroElemento3d = snapshot.filtroElemento3d;
            if (snapshot.raioX3d !== undefined) {
                state.raioX3d = snapshot.raioX3d;
                const btnX = document.getElementById('btn3dRaioX');
                if (btnX) btnX.className = state.raioX3d ? 'px-3 py-1.5 rounded-xl font-bold bg-sky-500 text-slate-950 flex items-center gap-1.5 shadow' : 'px-3 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 flex items-center gap-1.5';
            }
            if (snapshot.explodido3d !== undefined) {
                state.explodido3d = snapshot.explodido3d;
                const btnExp = document.getElementById('btn3dExplodir');
                if (btnExp) btnExp.className = state.explodido3d ? 'px-3 py-1.5 rounded-xl font-bold bg-purple-500 text-white flex items-center gap-1.5 shadow' : 'px-3 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 flex items-center gap-1.5';
            }

            if (snapshot.ferramentaAtiva) state.ferramentaAtiva = snapshot.ferramentaAtiva;
            if (snapshot.ferramentaInstalacoes) state.ferramentaInstalacoes = snapshot.ferramentaInstalacoes;

            // Sincroniza alinhamento do terreno apenas se ele não tiver coordenadas x, y válidas
            if ((!state.terreno || state.terreno.x === undefined || state.terreno.y === undefined) && typeof ajustarTerrenoAosComodos === 'function') {
                ajustarTerrenoAosComodos();
            }

            // Restaura Estado de Fixação dos Cômodos
            state.comodosFixados = !!snapshot.comodosFixados;
            if (typeof atualizarBotaoFixarComodos === 'function') {
                atualizarBotaoFixarComodos();
            }

            renderizarSeletorPavimentos();
            renderListaComodosSidebar();
            renderizarBarraTransicoes();
            renderizarBotoesUnidadesQDT();
            atualizarTudo();
            reconstruirCena3D(true);
            if (typeof resetarCamera3D === 'function') {
                resetarCamera3D();
            }

            // Grava silenciosamente como estado ativo
            if (typeof salvarProjetoSilencioso === 'function') {
                salvarProjetoSilencioso();
            }

            // Volta literalmente onde o usuário parou (aba ativa)
            if (snapshot.abaAtiva && typeof trocarAba === 'function') {
                setTimeout(() => {
                    trocarAba(snapshot.abaAtiva);
                }, 60);
            }
        }

        // =========================================================================
        // MOTOR DE HISTÓRICO: DESFAZER E REFAZER (UNDO / REDO) & AUXILIARES
        // =========================================================================
        const _historicoUndo = [];
        const _historicoRedo = [];
        const HISTORICO_MAXIMO = 50;

        // Campos de navegação/visualização: mudar zoom, aba, filtros etc. não é uma "edição"
        const _CHAVES_FORA_DO_HISTORICO = new Set([
            'escala', 'abaAtiva', 'ferramentaAtiva', 'ferramentaInstalacoes', 'pavimentoAtivoId', 'unidadeQdtAtivaId',
            'exibirCadUnderlay', 'exibirLegendaTransicoes', 'exibirRotulosTransicoesTexto', 'exibirRotulosInstalacoes',
            'exibirGabaritoFantasma', 'exibirLajesPiso3D', 'exibirLajesTeto3D', 'filtroPavimento3d', 'filtroElemento3d',
            'raioX3d', 'explodido3d', 'modoVisualQuadro', 'modoFiacaoQuadro', 'modoCanaletasQuadro', 'snapMagnetico',
            'comodosFixados', 'ultimaModificacao', 'dataExportacao'
        ]);

        // Assinatura do CONTEÚDO do projeto: posições em metros relativas ao terreno,
        // para que zoom e pan (que movem todas as coordenadas em pixels) não contem como edição.
        function assinaturaConteudoProjeto(snap) {
            const e = snap.escala || 40;
            const ref = (snap.terreno && typeof snap.terreno.x === 'number') ? snap.terreno
                : ((snap.comodos && snap.comodos[0]) || { x: 0, y: 0 });
            const rx = ref.x || 0, ry = ref.y || 0;
            return JSON.stringify(snap, (k, v) => {
                if (_CHAVES_FORA_DO_HISTORICO.has(k)) return undefined;
                if (typeof v === 'number') {
                    if (/^x\d?$/.test(k)) return Math.round((v - rx) / e * 1000) / 1000;
                    if (/^y\d?$/.test(k)) return Math.round((v - ry) / e * 1000) / 1000;
                }
                return v;
            });
        }

        let _assinaturaConfirmada = null;
        let _snapshotConfirmado = null;
        let _historicoSuspensoAte = 0;
        let _timerHistorico = null;
        let _ponteiroPressionado = false;

        // Compara o projeto atual com o último estado confirmado; se o conteúdo mudou,
        // o estado anterior vai para a pilha de desfazer.
        function verificarAlteracaoHistorico() {
            if (Date.now() < _historicoSuspensoAte || typeof exportarSnapshotEstado !== 'function') return;
            let snap;
            try { snap = exportarSnapshotEstado(); } catch (e) { return; }
            const ass = assinaturaConteudoProjeto(snap);
            const json = JSON.stringify(snap);
            if (_assinaturaConfirmada !== null && ass !== _assinaturaConfirmada) {
                _historicoUndo.push(_snapshotConfirmado);
                if (_historicoUndo.length > HISTORICO_MAXIMO) _historicoUndo.shift();
                _historicoRedo.length = 0;
            }
            _assinaturaConfirmada = ass;
            _snapshotConfirmado = json;   // mantém também a visualização mais recente
        }

        function agendarVerificacaoHistorico(atrasoMs = 250) {
            clearTimeout(_timerHistorico);
            _timerHistorico = setTimeout(() => {
                if (_ponteiroPressionado) { agendarVerificacaoHistorico(300); return; }  // arraste em andamento
                verificarAlteracaoHistorico();
            }, atrasoMs);
        }

        // Fim de cada interação do usuário → verifica se houve edição
        document.addEventListener('pointerdown', () => { _ponteiroPressionado = true; }, true);
        document.addEventListener('pointerup', () => { _ponteiroPressionado = false; agendarVerificacaoHistorico(); }, true);
        document.addEventListener('pointercancel', () => { _ponteiroPressionado = false; agendarVerificacaoHistorico(); }, true);
        ['click', 'change', 'keyup'].forEach(ev => document.addEventListener(ev, () => agendarVerificacaoHistorico()));
        // operações assíncronas (abrir projeto do servidor, importações) — verificação periódica leve
        setInterval(() => { if (!_ponteiroPressionado && !document.hidden) verificarAlteracaoHistorico(); }, 1500);
        // estado inicial (após o app carregar o projeto salvo)
        window.addEventListener('load', () => setTimeout(verificarAlteracaoHistorico, 1200));

        // Mantida por compatibilidade: confirma alterações pendentes antes de uma ação
        function salvarEstadoParaHistorico() {
            verificarAlteracaoHistorico();
        }

        function restaurarDoHistorico(origem, destino, mensagem) {
            verificarAlteracaoHistorico();               // confirma o que estiver pendente
            if (origem.length === 0) return false;
            destino.push(_snapshotConfirmado);
            const alvo = JSON.parse(origem.pop());
            _historicoSuspensoAte = Date.now() + 600;     // a própria restauração não vira edição
            restaurarSnapshotEstado(alvo);
            const snap = exportarSnapshotEstado();
            _assinaturaConfirmada = assinaturaConteudoProjeto(snap);
            _snapshotConfirmado = JSON.stringify(snap);
            mostrarNotificacaoToast(mensagem, 'sucesso');
            return true;
        }

        function desfazerAcao() {
            try {
                if (!restaurarDoHistorico(_historicoUndo, _historicoRedo, 'Ação desfeita (Ctrl+Z)')) {
                    mostrarNotificacaoToast('Nenhuma ação anterior para desfazer.', 'aviso');
                }
            } catch (e) {
                console.warn('Erro ao desfazer:', e);
            }
        }

        function refazerAcao() {
            try {
                if (!restaurarDoHistorico(_historicoRedo, _historicoUndo, 'Ação refeita (Ctrl+Y)')) {
                    mostrarNotificacaoToast('Nenhuma ação para refazer.', 'aviso');
                }
            } catch (e) {
                console.warn('Erro ao refazer:', e);
            }
        }

        function duplicarProjetoAtual() {
            salvarEstadoParaHistorico();
            const novoId = 'proj_' + Date.now();
            const clone = JSON.parse(JSON.stringify(state.projetoAtual || {}));
            clone.id = novoId;
            clone.nome = ((clone.nome || 'Projeto')) + ' (Cópia)';
            clone.ultimaModificacao = new Date().toISOString();
            state.projetoAtual = clone;
            const inputNome = document.getElementById('inputNomeProjeto');
            if (inputNome) inputNome.value = clone.nome;
            if (typeof salvarProjetoSilencioso === 'function') salvarProjetoSilencioso();
            if (typeof mostrarNotificacaoToast === 'function') {
                mostrarNotificacaoToast(`Projeto duplicado: "${clone.nome}"`, 'sucesso');
            }
        }

        function limparProjetoConfirmacao() {
            if (confirm('Deseja realmente limpar todos os cômodos e instalações do projeto?')) {
                salvarEstadoParaHistorico();
                state.comodos = [];
                state.pontosEletricos = [];
                state.transicoes = [];
                state.escadas = [];
                state.eletrodutoWaypoints = {};
                state.linhasMaoLivre = [];
                state.circuitosCalculados = [];
                state.pontoSelecionadoId = null;
                state.comodoEmEdicaoId = null;
                atualizarTudo();
                if (typeof reconstruirCena3D === 'function') reconstruirCena3D();
                if (typeof salvarProjetoSilencioso === 'function') salvarProjetoSilencioso();
                if (typeof mostrarNotificacaoToast === 'function') {
                    mostrarNotificacaoToast('Projeto limpo com sucesso.', 'aviso');
                }
            }
        }

        function confirmarCriacaoNovoProjeto() {
            if (typeof confirmarIniciarNovoProjeto === 'function') {
                confirmarIniciarNovoProjeto();
            }
        }

        function abrirModalTransicaoTipo(tipo) {
            const modal = document.getElementById('modalTransicao');
            if (modal) {
                const desc = document.getElementById('txtDescricaoTransicao');
                if (desc) desc.textContent = `Definição de Transição (${tipo === 'janela' ? 'Janela' : 'Porta'}): selecione uma transição ou vincule cômodos adjacentes.`;
                modal.classList.remove('hidden');
            }
        }

        function toggleCotasExibicao() {
            if (typeof toggleGradeCotas === 'function') {
                toggleGradeCotas();
            }
        }


        function abrirModalAnotacao() {
            const texto = prompt('Digite a anotação para inserir no CAD:');
            if (texto && texto.trim()) {
                salvarEstadoParaHistorico();
                if (!state.linhasMaoLivre) state.linhasMaoLivre = [];
                state.linhasMaoLivre.push({
                    tipo: 'texto',
                    texto: texto.trim(),
                    // no centro da área visível da planta
                    x: (() => { const cv = document.getElementById('cadCanvas'); return cv ? larguraLogicaCanvas(cv) / 2 - 40 : 120; })(),
                    y: (() => { const cv = document.getElementById('cadCanvas'); return cv ? alturaLogicaCanvas(cv) / 2 : 120; })(),
                    cor: '#38bdf8',
                    tamanho: 14,
                    pavimentoId: state.pavimentoAtivoId
                });
                desenharCAD();
                desenharInstalacoes();
                if (typeof mostrarNotificacaoToast === 'function') {
                    mostrarNotificacaoToast('Anotação adicionada ao desenho!', 'sucesso');
                }
            }
        }

        function salvarPontoRapido(nomePonto = null) {
            const agora = new Date();
            const dataHoraStr = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const nome = nomePonto || `Ponto ${dataHoraStr}`;

            let totalWatts = 0;
            state.pontosEletricos.forEach(p => totalWatts += (p.pot || 0));

            const novoCheckpoint = {
                id: 'ckpt_' + Date.now(),
                projetoId: state.projetoAtual.id,
                nome: nome,
                dataHora: dataHoraStr,
                timestamp: Date.now(),
                resumo: {
                    pavimentos: state.pavimentos.length,
                    comodos: state.comodos.length,
                    pontos: state.pontosEletricos.length,
                    potenciaKva: (totalWatts / 1000).toFixed(2)
                },
                estado: exportarSnapshotEstado()
            };

            // Carrega checkpoints existentes de LocalStorage
            let lista = [];
            try {
                const salvo = localStorage.getItem('proeletrica_checkpoints_' + state.projetoAtual.id);
                if (salvo) lista = JSON.parse(salvo);
            } catch(e) {}

            lista.unshift(novoCheckpoint);
            if (lista.length > 30) lista = lista.slice(0, 30); // Guarda os últimos 30 checkpoints

            try {
                localStorage.setItem('proeletrica_checkpoints_' + state.projetoAtual.id, JSON.stringify(lista));
                // Atualiza lista geral de checkpoints
                localStorage.setItem('proeletrica_checkpoints_recente', JSON.stringify(lista));
            } catch(e) {
                console.warn('LocalStorage cheio ao salvar checkpoint', e);
            }

            atualizarBadgePontosSalvos();
            renderizarListaCheckpoints();
            mostrarNotificacaoToast(`Ponto de restauração "${nome}" salvo!`, 'sucesso');
        }

        function salvarPontoRapidoComNome() {
            const agora = new Date();
            const padrao = 'Versão ' + agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const nome = prompt('Digite um nome ou descrição para este Ponto de Salvamento:', padrao);
            if (nome && nome.trim()) {
                salvarPontoRapido(nome.trim());
            }
        }

        function restaurarCheckpoint(ckptId) {
            let lista = [];
            try {
                const salvo = localStorage.getItem('proeletrica_checkpoints_' + state.projetoAtual.id) || localStorage.getItem('proeletrica_checkpoints_recente');
                if (salvo) lista = JSON.parse(salvo);
            } catch(e) {}

            const ckpt = lista.find(c => c.id === ckptId);
            if (!ckpt) {
                alert('Ponto de salvamento não encontrado!');
                return;
            }

            if (confirm(`Deseja restaurar o projeto para "${ckpt.nome}" (${ckpt.dataHora})?\nAs alterações não salvas serão substituídas.`)) {
                restaurarSnapshotEstado(ckpt.estado);
                mostrarNotificacaoToast(`Projeto restaurado para: "${ckpt.nome}"`, 'sucesso');
                fecharModalGerenciarProjetos();
            }
        }

        function excluirCheckpoint(ckptId) {
            if (!confirm('Tem certeza que deseja excluir este Ponto de Salvamento?')) return;
            let lista = [];
            try {
                const chave = 'proeletrica_checkpoints_' + state.projetoAtual.id;
                const salvo = localStorage.getItem(chave) || localStorage.getItem('proeletrica_checkpoints_recente');
                if (salvo) lista = JSON.parse(salvo);
                lista = lista.filter(c => c.id !== ckptId);
                localStorage.setItem(chave, JSON.stringify(lista));
                localStorage.setItem('proeletrica_checkpoints_recente', JSON.stringify(lista));
            } catch(e) {}
            atualizarBadgePontosSalvos();
            renderizarListaCheckpoints();
            mostrarNotificacaoToast('Ponto de salvamento excluído.', 'aviso');
        }

        function atualizarBadgePontosSalvos() {
            const badge = document.getElementById('badgeContagemSalvos');
            if (!badge) return;
            let count = 0;
            try {
                const salvo = localStorage.getItem('proeletrica_checkpoints_' + state.projetoAtual.id) || localStorage.getItem('proeletrica_checkpoints_recente');
                if (salvo) count = JSON.parse(salvo).length;
            } catch(e) {}
            badge.textContent = count;
        }

        function renderizarListaCheckpoints() {
            const container = document.getElementById('listaCheckpointsContainer');
            if (!container) return;

            let lista = [];
            try {
                const salvo = localStorage.getItem('proeletrica_checkpoints_' + state.projetoAtual.id) || localStorage.getItem('proeletrica_checkpoints_recente');
                if (salvo) lista = JSON.parse(salvo);
            } catch(e) {}

            if (lista.length === 0) {
                container.innerHTML = `
                    <div class="p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 space-y-2">
                        <i class="fa-regular fa-bookmark text-3xl text-slate-600 block"></i>
                        <p class="font-bold text-slate-400">Nenhum ponto de salvamento criado ainda.</p>
                        <p class="text-[11px]">Clique em "Criar Novo Ponto Agora" acima ou no botão "Salvar Ponto" no topo para criar sua primeira versão gravada.</p>
                    </div>`;
                return;
            }

            container.innerHTML = lista.map((ckpt, idx) => `
                <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-mono font-bold">
                                ${idx + 1}
                            </span>
                            <span class="font-bold text-white text-sm">${textoSeguro(ckpt.nome)}</span>
                            <span class="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                                <i class="fa-regular fa-clock"></i> ${ckpt.dataHora}
                            </span>
                        </div>
                        <div class="flex items-center gap-3 text-slate-400 text-[11px]">
                            <span><i class="fa-solid fa-layer-group text-sky-400"></i> ${ckpt.resumo.pavimentos} Pavimento(s)</span>
                            <span><i class="fa-solid fa-door-open text-amber-400"></i> ${ckpt.resumo.comodos} Cômodo(s)</span>
                            <span><i class="fa-solid fa-plug text-emerald-400"></i> ${ckpt.resumo.pontos} Ponto(s)</span>
                            <span><i class="fa-solid fa-bolt text-yellow-400"></i> ${ckpt.resumo.potenciaKva} kVA</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button onclick="restaurarCheckpoint('${ckpt.id}')" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow" title="Restaurar projeto para este estado">
                            <i class="fa-solid fa-rotate-left"></i> Restaurar
                        </button>
                        <button onclick="excluirCheckpoint('${ckpt.id}')" class="bg-slate-900 hover:bg-red-950/80 hover:text-red-400 text-slate-400 p-2 rounded-lg border border-slate-800 transition" title="Excluir este ponto">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // --- GESTÃO DE PROJETOS SALVOS (LOCALSTORAGE) ---

        function salvarProjetoAtualNoLocalStorage() {
            let lista = [];
            try {
                const salvo = localStorage.getItem('proeletrica_projetos');
                if (salvo) lista = JSON.parse(salvo);
            } catch(e) {}

            state.projetoAtual.ultimaModificacao = new Date().toISOString();

            let totalWatts = 0;
            state.pontosEletricos.forEach(p => totalWatts += (p.pot || 0));

            const registro = {
                id: state.projetoAtual.id,
                nome: (state.projetoAtual && state.projetoAtual.nome) || 'Projeto Sem Nome',
                template: state.projetoAtual.template || 'personalizado',
                dataCriacao: state.projetoAtual.dataCriacao || new Date().toISOString(),
                ultimaModificacao: state.projetoAtual.ultimaModificacao,
                resumo: {
                    pavimentos: state.pavimentos.length,
                    comodos: state.comodos.length,
                    pontos: state.pontosEletricos.length,
                    potenciaKva: (totalWatts / 1000).toFixed(2)
                },
                estado: exportarSnapshotEstado()
            };

            const idx = lista.findIndex(p => p.id === registro.id);
            if (idx >= 0) {
                lista[idx] = registro;
            } else {
                lista.unshift(registro);
            }

            try {
                localStorage.setItem('proeletrica_projetos', JSON.stringify(lista));
            } catch(e) {
                console.warn('Erro ao salvar em localStorage', e);
            }

            renderizarListaProjetosSalvos();
            salvarProjetoSilencioso();
            mostrarNotificacaoToast(`Projeto "${registro.nome}" gravado no navegador!`, 'sucesso');
        }

        function atualizarIndicadorSalvamento(texto = null) {
            const el = document.getElementById('txtStatusSalvamento');
            if (el) {
                const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                el.textContent = texto || ('Salvo às ' + hora);
            }
        }

        function salvarProjetoSilencioso() {
            try {
                const snapshot = exportarSnapshotEstado();
                localStorage.setItem('proeletrica_projeto_ativo', JSON.stringify({
                    id: state.projetoAtual?.id || 'proj_ativo',
                    nome: state.projetoAtual?.nome || 'Projeto Residencial',
                    timestamp: Date.now(),
                    estado: snapshot
                }));
                atualizarIndicadorSalvamento();
            } catch(e) {
                // Silencioso caso cota de storage local esteja cheia
            }
        }

        function carregarProjetoSalvo(projId) {
            let lista = [];
            try {
                const salvo = localStorage.getItem('proeletrica_projetos');
                if (salvo) lista = JSON.parse(salvo);
            } catch(e) {}

            const proj = lista.find(p => p.id === projId);
            if (!proj) {
                alert('Projeto não encontrado!');
                return;
            }

            if (confirm(`Deseja abrir o projeto "${proj.nome}"?\nO trabalho atual será substituído.`)) {
                restaurarSnapshotEstado(proj.estado);
                mostrarNotificacaoToast(`Projeto "${proj.nome}" carregado com sucesso!`, 'sucesso');
                fecharModalGerenciarProjetos();
            }
        }

        function excluirProjetoSalvo(projId) {
            if (!confirm('Deseja realmente apagar este projeto salvo da memória do navegador?')) return;
            let lista = [];
            try {
                const salvo = localStorage.getItem('proeletrica_projetos');
                if (salvo) lista = JSON.parse(salvo);
                lista = lista.filter(p => p.id !== projId);
                localStorage.setItem('proeletrica_projetos', JSON.stringify(lista));
            } catch(e) {}
            renderizarListaProjetosSalvos();
            mostrarNotificacaoToast('Projeto excluído da memória.', 'aviso');
        }

        function renderizarListaProjetosSalvos() {
            const container = document.getElementById('listaProjetosLocalStorageContainer');
            if (!container) return;

            let lista = [];
            try {
                const salvo = localStorage.getItem('proeletrica_projetos');
                if (salvo) lista = JSON.parse(salvo);
            } catch(e) {}

            if (lista.length === 0) {
                container.innerHTML = `
                    <div class="p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 space-y-2">
                        <i class="fa-regular fa-folder text-3xl text-slate-600 block"></i>
                        <p class="font-bold text-slate-400">Nenhum projeto salvo no navegador ainda.</p>
                        <p class="text-[11px]">Clique em "Salvar Projeto Atual" acima para guardar uma cópia persistente nesta máquina.</p>
                    </div>`;
                return;
            }

            container.innerHTML = lista.map(proj => {
                const dataFormatada = new Date(proj.ultimaModificacao).toLocaleString('pt-BR');
                const ehOAtual = (proj.id === state.projetoAtual.id);
                return `
                <div class="bg-slate-950 p-4 rounded-xl border ${ehOAtual ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' : 'border-slate-800'} hover:border-slate-700 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-white text-sm">${textoSeguro(proj.nome)}</span>
                            ${ehOAtual ? '<span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/40">Em Edição</span>' : ''}
                        </div>
                        <div class="flex items-center gap-3 text-slate-400 text-[11px]">
                            <span><i class="fa-regular fa-clock"></i> ${dataFormatada}</span>
                            <span><i class="fa-solid fa-layer-group text-sky-400"></i> ${proj.resumo.pavimentos} Pav.</span>
                            <span><i class="fa-solid fa-door-open text-amber-400"></i> ${proj.resumo.comodos} Cômodos</span>
                            <span><i class="fa-solid fa-plug text-emerald-400"></i> ${proj.resumo.pontos} Pontos</span>
                            <span><i class="fa-solid fa-bolt text-yellow-400"></i> ${proj.resumo.potenciaKva} kVA</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button onclick="carregarProjetoSalvo('${proj.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow">
                            <i class="fa-solid fa-folder-open"></i> Abrir
                        </button>
                        <button onclick="excluirProjetoSalvo('${proj.id}')" class="bg-slate-900 hover:bg-red-950/80 hover:text-red-400 text-slate-400 p-2 rounded-lg border border-slate-800 transition" title="Excluir projeto">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>`;
            }).join('');
        }

        // --- EXPORTAR E IMPORTAR ARQUIVOS .PROELETRICA ---

        function exportarArquivoProjeto() {
            const dadosCompletos = {
                software: 'PRO-ELÉTRICA CAD NBR 5410',
                versao: '2.5',
                dataExportacao: new Date().toISOString(),
                projeto: state.projetoAtual,
                estado: exportarSnapshotEstado()
            };

            const jsonStr = JSON.stringify(dadosCompletos, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const nomeArquivo = ((state.projetoAtual && state.projetoAtual.nome) || 'projeto_eletrico').replace(/[^a-zA-Z0-9_-]/g, '_') + '.proeletrica';
            a.href = url;
            a.download = nomeArquivo;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            mostrarNotificacaoToast(`Arquivo "${nomeArquivo}" baixado com sucesso!`, 'sucesso');
        }

        function importarArquivoProjeto(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const dados = JSON.parse(e.target.result);
                    if (dados.projeto) {
                        state.projetoAtual = sanitizarTextosProfundo(dados.projeto);
                        if (dados.projeto.concessionaria) {
                            state.concessionariaId = dados.projeto.concessionaria;
                        }
                    }
                    const estadoParaCarregar = dados.estado || dados;
                    restaurarSnapshotEstado(estadoParaCarregar);
                    salvarPontoRapido('Importado de arquivo: ' + file.name);
                    mostrarNotificacaoToast(`Projeto carregado do arquivo "${file.name}"!`, 'sucesso');
                    fecharModalGerenciarProjetos();
                } catch(err) {
                    alert('Erro ao ler arquivo de projeto: ' + err.message);
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }

        // --- NOVO PROJETO COM MODELOS PRÉ-DEFINIDOS ---

        function abrirModalNovoProjeto() {
            const modal = document.getElementById('modalNovoProjeto');
            if (modal) modal.classList.remove('hidden');
        }

        function fecharModalNovoProjeto() {
            const modal = document.getElementById('modalNovoProjeto');
            if (modal) modal.classList.add('hidden');
        }

        function selecionarTemplateNovoProjeto(tpl) {
            state.templateNovoProjetoSelecionado = tpl;
            document.querySelectorAll('.template-card').forEach(c => {
                c.className = 'template-card border border-slate-800 bg-slate-950/60 p-4 rounded-xl cursor-pointer hover:border-slate-700 transition space-y-1.5';
            });
            const selCard = document.getElementById('cardTpl_' + tpl);
            if (selCard) {
                selCard.className = 'template-card border-2 border-emerald-500 bg-emerald-950/20 p-4 rounded-xl cursor-pointer hover:border-emerald-400 transition space-y-1.5 relative';
            }
        }

        function confirmarIniciarNovoProjeto() {
            const nome = document.getElementById('txtNovoProjetoNome').value.trim() || 'Novo Projeto Elétrico';
            const tpl = state.templateNovoProjetoSelecionado || 'em_branco';

            // Salva um ponto automático do projeto anterior se tiver cômodos
            if (state.comodos.length > 0) {
                salvarPontoRapido('Ponto Automático antes de iniciar ' + nome);
            }

            state.projetoAtual = {
                id: 'proj_' + Date.now(),
                nome: nome,
                template: tpl,
                dataCriacao: new Date().toISOString(),
                ultimaModificacao: new Date().toISOString()
            };

            // Modelo montado em metros (js/modelos-projeto.js): terreno e recuos do próprio
            // modelo, cômodos encostados dentro da área construível, cargas específicas em
            // posição relativa ao cômodo — na escala atual. Antes as posições eram pixels
            // fixos (pensados para 40 px/m) e o lote do projeto anterior permanecia.
            const modelo = ModelosProjeto.montar(tpl, { escala: state.escala || 40, origem: { x: 40, y: 40 } });
            state.terreno = modelo.terreno;
            state.pavimentos = modelo.pavimentos;
            state.pavimentoAtivoId = 'terreo';
            state.comodos = modelo.comodos;
            state.pontosEletricos = modelo.pontos;
            state.escadas = modelo.escadas;
            state.qdtPos = modelo.qdtPos;
            state.prumadaPos = modelo.prumadaPos;
            state.prumadaAtiva = modelo.pavimentos.length > 1;
            state.alimentacaoExterna = Object.assign({}, state.alimentacaoExterna || {}, modelo.alimentacao, { distanciaManual: null });
            // nada do projeto anterior permanece no desenho
            state.eletrodutoWaypoints = {};
            state.transicoes = [];
            state.linhasMaoLivre = [];
            state.linhaAtual = null;
            state.cadUnderlay = [];
            state.comprimentosManuaisCircuitos = {};
            state.circuitosOcultos = [];
            state.circuitoDestaque = 'todos';
            state.modoIsolarCircuito = false;
            state.comodoEmEdicaoId = null;
            state.pontoSelecionadoId = null;
            state.caboHoverInstalacoes = null;
            state.comodosFixados = false;
            state.automacao = null;               // automação do projeto anterior não vale para o novo
            // pontos mínimos da NBR 5410 (luz, interruptor e tomadas) e portas entre cômodos vizinhos
            state.comodos.forEach(c => gerarPontosEletricosParaComodo(c));
            if (typeof detectarProximidadeComodos === 'function') {
                state.pavimentos.forEach(pv => { state.pavimentoAtivoId = pv.id; detectarProximidadeComodos(); });
                state.pavimentoAtivoId = 'terreo';
            }

            setFiltro3d('todos');
            fecharModalNovoProjeto();
            renderizarSeletorPavimentos();
            renderListaComodosSidebar();
            renderizarBotoesUnidadesQDT();
            atualizarTudo();
            if (typeof resetarZoomCad === 'function') resetarZoomCad(true);   // enquadra o novo lote inteiro
            reconstruirCena3D();
            resetarCamera3D();
            salvarProjetoAtualNoLocalStorage();
            salvarPontoRapido('Início do Projeto: ' + nome);
            mostrarNotificacaoToast(`Projeto "${nome}" iniciado com sucesso!`, 'sucesso');
        }

        function abrirModalGerenciarProjetos() {
            carregarListaProjetosPastaServidor();
            renderizarListaCheckpoints();
            renderizarListaProjetosSalvos();
            const modal = document.getElementById('modalGerenciarProjetos');
            if (modal) modal.classList.remove('hidden');
        }

        function fecharModalGerenciarProjetos() {
            const modal = document.getElementById('modalGerenciarProjetos');
            if (modal) modal.classList.add('hidden');
        }

        
        // =========================================================================
        // CONTROLE DA ABA CENTRAL DE ARQUIVOS, IMPORTAÇÕES & SALVAMENTOS
        // =========================================================================

        function trocarSubAbaArquivos(sub) {
            const subs = ['salvar', 'importar', 'historico', 'modelos'];
            subs.forEach(s => {
                const painel = document.getElementById('subpainel-' + s);
                const btn = document.getElementById('btnSubAba' + s.charAt(0).toUpperCase() + s.slice(1));
                if (painel) {
                    if (s === sub) painel.classList.remove('hidden');
                    else painel.classList.add('hidden');
                }
                if (btn) {
                    if (s === sub) {
                        btn.className = 'px-4 py-2.5 border-b-2 border-amber-400 text-amber-400 font-bold flex items-center gap-2 whitespace-nowrap transition';
                    } else {
                        btn.className = 'px-4 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 font-bold flex items-center gap-2 whitespace-nowrap transition';
                    }
                }
            });

            if (sub === 'historico') {
                if (typeof carregarListaProjetosPastaServidor === 'function') carregarListaProjetosPastaServidor();
                if (typeof renderizarListaCheckpoints === 'function') renderizarListaCheckpoints();
            }
        }

        function atualizarCabecalhoAbaArquivos() {
            const lbl = document.getElementById('lblNomeProjAba');
            if (lbl && state.projetoAtual && (state.projetoAtual && state.projetoAtual.nome)) {
                lbl.textContent = (state.projetoAtual && state.projetoAtual.nome);
            }
            // Sincroniza containers da aba com os do modal
            const contPasta = document.getElementById('listaProjetosPastaServidorContainer');
            const contPastaAba = document.getElementById('listaProjetosPastaServidorContainerAba');
            if (contPasta && contPastaAba && contPasta.innerHTML) {
                contPastaAba.innerHTML = contPasta.innerHTML;
            }

            const contCheck = document.getElementById('listaCheckpointsContainer');
            const contCheckAba = document.getElementById('listaCheckpointsContainerAba');
            if (contCheck && contCheckAba && contCheck.innerHTML) {
                contCheckAba.innerHTML = contCheck.innerHTML;
            }
        }

        function trocarAbaGerenciador(aba) {
            const painelPasta = document.getElementById('painelTabPastaProjetos');
            const painelCheck = document.getElementById('painelTabCheckpoints');
            const painelProj = document.getElementById('painelTabProjetos');
            const painelArq = document.getElementById('painelTabArquivos');

            if (painelPasta) painelPasta.classList.add('hidden');
            if (painelCheck) painelCheck.classList.add('hidden');
            if (painelProj) painelProj.classList.add('hidden');
            if (painelArq) painelArq.classList.add('hidden');

            const btnPasta = document.getElementById('btnTabPastaProjetos');
            const btnCheck = document.getElementById('btnTabCheckpoints');
            const btnProj = document.getElementById('btnTabProjetos');
            const btnArq = document.getElementById('btnTabArquivos');

            const classeInativa = 'px-4 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 whitespace-nowrap';
            if (btnPasta) btnPasta.className = classeInativa;
            if (btnCheck) btnCheck.className = classeInativa;
            if (btnProj) btnProj.className = classeInativa;
            if (btnArq) btnArq.className = classeInativa;

            if (aba === 'pasta') {
                if (painelPasta) painelPasta.classList.remove('hidden');
                if (btnPasta) btnPasta.className = 'px-4 py-2.5 border-b-2 border-sky-400 text-sky-400 flex items-center gap-2 whitespace-nowrap';
                carregarListaProjetosPastaServidor();
            } else if (aba === 'checkpoints') {
                if (painelCheck) painelCheck.classList.remove('hidden');
                if (btnCheck) btnCheck.className = 'px-4 py-2.5 border-b-2 border-amber-400 text-amber-400 flex items-center gap-2 whitespace-nowrap';
                renderizarListaCheckpoints();
            } else if (aba === 'projetos') {
                if (painelProj) painelProj.classList.remove('hidden');
                if (btnProj) btnProj.className = 'px-4 py-2.5 border-b-2 border-emerald-400 text-emerald-400 flex items-center gap-2 whitespace-nowrap';
                renderizarListaProjetosSalvos();
            } else if (aba === 'arquivos') {
                if (painelArq) painelArq.classList.remove('hidden');
                if (btnArq) btnArq.className = 'px-4 py-2.5 border-b-2 border-sky-400 text-sky-400 flex items-center gap-2 whitespace-nowrap';
            }
        }

        // =========================================================================
        // GESTÃO DA PASTA DE PROJETOS NO DISCO (PASTA 'projetos/')
        // =========================================================================

        async function carregarListaProjetosPastaServidor() {
            const container = document.getElementById('listaProjetosPastaServidorContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="p-6 text-center text-slate-400">
                    <i class="fa-solid fa-spinner fa-spin text-2xl text-sky-400 mb-2"></i>
                    <p>Carregando projetos da pasta 'projetos/'...</p>
                </div>`;

            try {
                const resp = await fetch('/api/projetos');
                if (!resp.ok) throw new Error('Servidor retornou status ' + resp.status);
                const data = await resp.json();

                if (!data.sucesso || !data.projetos || data.projetos.length === 0) {
                    container.innerHTML = `
                        <div class="p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 space-y-2">
                            <i class="fa-solid fa-folder-open text-3xl text-slate-600 block"></i>
                            <p class="font-bold text-slate-400">Nenhum projeto salvo na pasta 'projetos/' ainda.</p>
                            <p class="text-[11px]">Clique no botão "Salvar Projeto Atual na Pasta" acima para gravar seu projeto diretamente no computador.</p>
                        </div>`;
                    return;
                }

                const htmlCardsProjetos = data.projetos.map(proj => {
                    const tamKb = (proj.tamanho_bytes / 1024).toFixed(1);
                    const resumo = proj.resumo || {};
                    return `
                    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
                        <div class="space-y-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <i class="fa-solid fa-file-shield text-sky-400 text-sm"></i>
                                <span class="font-bold text-white text-sm">${textoSeguro(proj.nome)}</span>
                                <span class="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded font-mono">${textoSeguro(proj.arquivo)}</span>
                            </div>
                            <div class="flex flex-wrap items-center gap-3 text-slate-400 text-[11px]">
                                <span><i class="fa-regular fa-clock text-amber-400"></i> ${proj.modificado_em}</span>
                                <span><i class="fa-solid fa-hard-drive text-slate-500"></i> ${tamKb} KB</span>
                                ${resumo.pavimentos ? `<span><i class="fa-solid fa-layer-group text-sky-400"></i> ${resumo.pavimentos} Pav.</span>` : ''}
                                ${resumo.comodos ? `<span><i class="fa-solid fa-door-open text-amber-400"></i> ${resumo.comodos} Cômodos</span>` : ''}
                                ${resumo.pontos ? `<span><i class="fa-solid fa-plug text-emerald-400"></i> ${resumo.pontos} Pontos</span>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button onclick="carregarProjetoDaPastaServidor(${argJsEmAtributo(proj.arquivo)})" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow text-xs">
                                <i class="fa-solid fa-folder-open"></i> Abrir
                            </button>
                            <button onclick="excluirProjetoDaPastaServidor(${argJsEmAtributo(proj.arquivo)})" class="bg-slate-900 hover:bg-red-950/80 hover:text-red-400 text-slate-400 p-2 rounded-lg border border-slate-800 transition" title="Excluir da pasta">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>`;
                }).join('');
                container.innerHTML = htmlCardsProjetos;
            } catch (err) {
                container.innerHTML = `
                    <div class="p-5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                        <div class="flex items-center gap-2 text-sky-400 font-bold">
                            <i class="fa-solid fa-folder-tree"></i>
                            <span>Pasta Local de Projetos Ativa</span>
                        </div>
                        <p class="text-slate-300 text-xs leading-relaxed">
                            A pasta para armazenamento físico no seu computador é:
                            <code class="bg-slate-900 px-2 py-1 rounded text-emerald-300 font-mono text-[11px] block mt-1.5 border border-slate-800">projeto_eletrico/projetos/</code>
                        </p>
                        <div class="pt-2 flex flex-wrap gap-2">
                            <button onclick="salvarProjetoNaPastaServidor()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                                <i class="fa-solid fa-download"></i> Salvar Agora
                            </button>
                            <button onclick="carregarListaProjetosPastaServidor()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                                <i class="fa-solid fa-rotate-right"></i> Atualizar
                            </button>
                        </div>
                    </div>`;
            }
        }

        async function salvarProjetoNaPastaServidor() {
            const nomePadrao = ((state.projetoAtual && state.projetoAtual.nome) || 'Projeto_Residencial').replace(/[^a-zA-Z0-9_\- áàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]/g, '_');
            const nome = prompt('Digite o nome do arquivo para salvar na pasta "projetos/":', nomePadrao);
            if (!nome || !nome.trim()) return;

            if (!state.projetoAtual) state.projetoAtual = {}; state.projetoAtual.nome = nome.trim();
            state.projetoAtual.ultimaModificacao = new Date().toISOString();

            const dadosCompletos = {
                software: 'PRO-ELÉTRICA CAD NBR 5410',
                versao: '2.5',
                dataExportacao: new Date().toISOString(),
                nomeArquivo: nome.trim(),
                projeto: state.projetoAtual,
                estado: exportarSnapshotEstado()
            };

            try {
                const resp = await fetch('/api/projetos/salvar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosCompletos)
                });

                if (resp.ok) {
                    const res = await resp.json();
                    mostrarNotificacaoToast(`Projeto "${res.arquivo}" salvo na pasta "projetos/"!`, 'sucesso');
                    salvarPontoRapido('Salvo na pasta projetos: ' + res.arquivo);
                    salvarProjetoAtualNoLocalStorage();
                    carregarListaProjetosPastaServidor();
                    return;
                }
            } catch (e) {
                console.warn('Servidor local não respondeu, usando download direto para a pasta:', e);
            }

            // Fallback de download direto
            exportarArquivoProjeto();
            mostrarNotificacaoToast(`Arquivo baixado. Salve-o na pasta "projetos/" do software!`, 'aviso');
        }

        async function carregarProjetoDaPastaServidor(arquivo) {
            if (!confirm(`Deseja carregar o projeto "${arquivo}" da pasta?\nO trabalho atual não salvo será substituído.`)) return;

            try {
                const resp = await fetch('/api/projetos/carregar?arquivo=' + encodeURIComponent(arquivo));
                if (!resp.ok) throw new Error('Não foi possível carregar o arquivo');
                const res = await resp.json();
                if (res.sucesso && res.dados) {
                    const dados = res.dados;
                    const estadoParaCarregar = dados.estado || dados;
                    restaurarSnapshotEstado(estadoParaCarregar);
                    if (dados.projeto) {
                        state.projetoAtual = sanitizarTextosProfundo(dados.projeto);
                    }
                    salvarPontoRapido('Carregado da pasta: ' + arquivo);
                    mostrarNotificacaoToast(`Projeto "${arquivo}" aberto com sucesso!`, 'sucesso');
                    fecharModalGerenciarProjetos();
                }
            } catch (e) {
                alert('Erro ao carregar projeto: ' + e.message);
            }
        }

        async function excluirProjetoDaPastaServidor(arquivo) {
            if (!confirm(`Tem certeza que deseja excluir o arquivo "${arquivo}" da pasta de projetos?`)) return;

            try {
                const resp = await fetch('/api/projetos/excluir', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ arquivo: arquivo })
                });
                const res = await resp.json();
                if (res.sucesso) {
                    mostrarNotificacaoToast(`Arquivo "${arquivo}" excluído da pasta.`, 'aviso');
                    carregarListaProjetosPastaServidor();
                } else {
                    alert('Erro ao excluir: ' + (res.erro || 'Falha'));
                }
            } catch (e) {
                alert('Erro ao comunicar com o servidor: ' + e.message);
            }
        }

        async function abrirPastaProjetosNoExplorer() {
            try {
                const resp = await fetch('/api/projetos/abrir_pasta', { method: 'POST' });
                if (resp.ok) {
                    mostrarNotificacaoToast('Pasta "projetos/" aberta no Explorador de Arquivos do Windows!', 'sucesso');
                } else {
                    mostrarNotificacaoToast('A pasta está localizada em: projeto_eletrico/projetos/', 'aviso');
                }
            } catch (e) {
                mostrarNotificacaoToast('A pasta está localizada em: projeto_eletrico/projetos/', 'aviso');
            }
        }

        // =========================================================================
        // CONTROLE VISUAL 3D: FILTROS DE ELEMENTOS (ILUMINAÇÃO, TOMADAS, TUBULAÇÕES)
        // =========================================================================

        // Aplica o filtro de elementos (state.filtroElemento3d) aos meshes da cena 3D.
        // Chamado ao final de reconstruirCena3D(), para o filtro persistir entre reconstruções.
        function aplicarFiltroElemento3d() {
            const tipo = state.filtroElemento3d || 'todos';
            if (!state.meshGroup3d) return;

            state.meshGroup3d.traverse(child => {
                if (child.userData && child.userData.elementoTipo) {
                    const elTipo = child.userData.elementoTipo;
                    if (tipo === 'todos') {
                        child.visible = true;
                    } else if (tipo === 'ilum') {
                        child.visible = (elTipo === 'ilum');
                    } else if (tipo === 'tomadas') {
                        child.visible = (elTipo === 'tomada');
                    } else if (tipo === 'tubos') {
                        child.visible = (elTipo === 'tubo' || elTipo === 'prumada');
                    }
                }
            });
        }

        // =========================================================================
        // AJUSTE DINÂMICO DO FORMULÁRIO DE PONTOS ELÉTRICOS (ILUMINAÇÃO VS TOMADAS)
        // =========================================================================

        function aoMudarTipoPontoModal(tipo) {
            if (typeof atualizarDestinoTomadaModal === 'function') atualizarDestinoTomadaModal(tipo);
            const txtNome = document.getElementById('txtModalPontoNome');
            const numPot = document.getElementById('numModalPontoPot');
            const selTensao = document.getElementById('selModalPontoTensao');
            const selAltura = document.getElementById('selModalPontoAltura');

            if (tipo === 'ILUM') {
                if (txtNome && (!txtNome.value || txtNome.value.includes('Tomada') || txtNome.value.includes('Chuveiro'))) {
                    txtNome.value = 'Plafon LED de Teto';
                }
                if (numPot && (numPot.value === '100' || numPot.value === '2200')) numPot.value = '100';
                if (selAltura) selAltura.value = 'teto';
            } else if (tipo === 'INTERRUPTOR') {
                if (txtNome) txtNome.value = 'Interruptor Simples';
                if (numPot) numPot.value = '0';
                if (selAltura) selAltura.value = 'media';
            } else if (tipo === 'TUE') {
                if (txtNome && (!txtNome.value || txtNome.value.includes('Tomada') || txtNome.value.includes('Plafon'))) {
                    txtNome.value = 'Chuveiro Elétrico / Ar Condicionado';
                }
                if (numPot) numPot.value = '2200';
                if (selTensao) selTensao.value = '220';
                if (selAltura) selAltura.value = 'alta';
            } else {
                if (txtNome && (!txtNome.value || txtNome.value.includes('Chuveiro') || txtNome.value.includes('Plafon'))) {
                    txtNome.value = 'Tomada Uso Geral 10A';
                }
                if (numPot) numPot.value = '100';
                if (selTensao) selTensao.value = '127';
                if (selAltura) selAltura.value = 'baixa';
            }
        }

// TOGGLE DO MODO DE EDIÇÃO E ARRASTE 3D
        function toggleModoEdicao3D() {
            state.modoEdicao3D = !state.modoEdicao3D;
            const btn = document.getElementById('btn3dModoEdicao');
            const hud = document.getElementById('hudEdicao3D');
            const txt = document.getElementById('txtInfoObjeto3D');

            if (state.modoEdicao3D) {
                if (btn) {
                    btn.className = 'px-3 py-1.5 rounded-xl font-bold bg-emerald-500 text-slate-950 flex items-center gap-1.5 shadow-lg ring-2 ring-emerald-400/50';
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> Modo Edição 3D ATIVO';
                }
                if (hud) hud.classList.remove('hidden');
                if (txt) txt.textContent = 'Passe o cursor sobre tomadas ou lâmpadas e arraste para reposicionar em 3D!';
                if (state.renderer3d && state.renderer3d.domElement) {
                    state.renderer3d.domElement.style.cursor = 'grab';
                }
            } else {
                if (btn) {
                    btn.className = 'px-3 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex items-center gap-1.5 shadow';
                    btn.innerHTML = '<i class="fa-solid fa-hand-pointer"></i> Arrastar / Mover Objetos 3D';
                }
                if (hud) hud.classList.add('hidden');
                if (state.renderer3d && state.renderer3d.domElement) {
                    state.renderer3d.domElement.style.cursor = 'default';
                }
            }
            if (typeof pedirRenderizacao3D === 'function') pedirRenderizacao3D(20);
        }

        document.addEventListener('DOMContentLoaded', () => {
            setupNavegacaoAbas();
            setupModoCalculo();
            setupFerramentasCAD();
            setupFerramentasInstalacoes();
            setupSugestoesBR(); popularSelectModalPontoPredefinido();
            setupSubFormCargas();
            setupAlimentacaoExternaInputs();
            sincronizarControlesParametrosNBR();
            setupFormulario();
            setupCanvasEvents();
            setupInstalacoesCanvasEvents();
            setupModalPontoEletrico();
            initThreeEngine();

            // Restaura automaticamente a última sessão ativa para literalmente voltar de onde parou
            let restaurouSessao = false;
            try {
                const salvoAtivo = localStorage.getItem('proeletrica_projeto_ativo');
                if (salvoAtivo) {
                    const parsed = JSON.parse(salvoAtivo);
                    if (parsed && parsed.estado) {
                        restaurarSnapshotEstado(parsed.estado);
                        restaurouSessao = true;
                    }
                }
            } catch(e) {
                console.warn('Não foi possível restaurar sessão salva anterior:', e);
            }

            if (!restaurouSessao) {
                carregarExemploInicial();
                renderizarBotoesUnidadesQDT();
                atualizarTudo();
            }

            setupImportDragAndDrop();
        });

        // NAVEGAÇÃO DE ABAS
        

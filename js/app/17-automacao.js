/* PRO-ELÉTRICA CAD — 17-automacao.js
   Aba "Automação": levantamento por cômodo, comparação e sugestão de tecnologia,
   simulação de alcance com mapa de calor sobre a planta, painel de automação,
   nobreak opcional, orçamento, impacto na parte elétrica e entregáveis.
   O cálculo fica em js/automacao.js (window.Automacao); aqui só a tela e a
   integração com o quadro, os circuitos, o orçamento e o memorial.
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */

        // =========================================================================
        // CONFIGURAÇÃO (persistida no projeto: state.automacao)
        // =========================================================================
        const CONFIG_AUTOMACAO_PADRAO = {
            incluirNoProjeto: false,
            nivel: 'intermediario',
            tecnologia: 'auto',
            ecossistema: 'nenhum',
            prioridades: null,            // null = automáticas pelo projeto
            materialParede: 'alvenaria',
            servidorLocal: false,
            dispositivos: null,           // null = levantamento automático pelo nível
            hub: null,                    // null = posição sugerida {x, y (m), pavId}
            repetidores: null,            // null = sugeridos pela simulação
            painel: { modo: 'auto', tipoLampada: 'led_corte' },
            nobreak: { exigido: false, autonomiaMin: 60, tipo: 'interativo', desmarcadas: [] },
            mapa: { pavimentoId: null, camada: 'calor' },
            tipoGas: 'glp',                // detector de gás: 'glp' (0,30 m do piso) | 'gn' (alto)
            cameraAlimentacao: 'poe',      // câmeras e vídeo-porteiro: 'poe' (switch do rack) | 'tomada'
            origensDescartadas: [],        // pontos cujo dispositivo o usuário removeu da lista editada
            avisoRemovidos: 0              // dispositivos que saíram porque o ponto de origem foi apagado
        };

        function obterConfigAutomacao() {
            if (!state.automacao || typeof state.automacao !== 'object') state.automacao = JSON.parse(JSON.stringify(CONFIG_AUTOMACAO_PADRAO));
            const c = state.automacao;
            Object.keys(CONFIG_AUTOMACAO_PADRAO).forEach(k => { if (c[k] === undefined) c[k] = JSON.parse(JSON.stringify(CONFIG_AUTOMACAO_PADRAO[k])); });
            c.painel = Object.assign({}, CONFIG_AUTOMACAO_PADRAO.painel, c.painel || {});
            c.nobreak = Object.assign({}, CONFIG_AUTOMACAO_PADRAO.nobreak, c.nobreak || {});
            c.mapa = Object.assign({}, CONFIG_AUTOMACAO_PADRAO.mapa, c.mapa || {});
            return c;
        }

        /** Saneia a configuração vinda de um arquivo/projeto salvo (só chaves e valores conhecidos). */
        function sanitizarConfigAutomacao(o) {
            if (!o || typeof o !== 'object') return null;
            const A = Automacao;
            const num = (v, a, b, d) => { const n = Number(v); return isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
            const pos = q => (q && isFinite(Number(q.x)) && isFinite(Number(q.y))) ? { x: Number(q.x), y: Number(q.y), pavId: String(q.pavId || 'terreo').slice(0, 60) } : null;
            const prio = o.prioridades && typeof o.prioridades === 'object' ? (() => {
                const r = {}; Object.keys(A.CRITERIOS).forEach(k => { r[k] = num(o.prioridades[k], 0, 5, 3); }); return r;
            })() : null;
            const devs = Array.isArray(o.dispositivos) ? o.dispositivos.filter(d => d && A.TIPOS[d.tipo]).slice(0, 500).map(d => ({
                id: String(d.id).slice(0, 120), tipo: d.tipo, comodoId: d.comodoId, pavimentoId: String(d.pavimentoId || 'terreo').slice(0, 60),
                x: Number(d.x) || 0, y: Number(d.y) || 0, origemPontoId: d.origemPontoId == null ? null : d.origemPontoId,
                detalhe: textoSeguro(String(d.detalhe || '')).slice(0, 160), ib: isFinite(Number(d.ib)) ? Number(d.ib) : undefined,
                tensao: isFinite(Number(d.tensao)) ? Number(d.tensao) : undefined
            })) : null;
            const nb = o.nobreak || {};
            return {
                incluirNoProjeto: !!o.incluirNoProjeto,
                nivel: A.NIVEIS[o.nivel] ? o.nivel : 'intermediario',
                tecnologia: (o.tecnologia === 'auto' || A.tecnologia(o.tecnologia)) ? o.tecnologia : 'auto',
                ecossistema: A.ECOSSISTEMAS[o.ecossistema] ? o.ecossistema : 'nenhum',
                prioridades: prio,
                materialParede: A.MATERIAIS_PAREDE[o.materialParede] ? o.materialParede : 'alvenaria',
                servidorLocal: !!o.servidorLocal,
                dispositivos: devs,
                hub: pos(o.hub),
                repetidores: Array.isArray(o.repetidores) ? o.repetidores.map(pos).filter(Boolean).slice(0, 20) : null,
                painel: {
                    modo: ['auto', 'integrado', 'separado'].includes(o.painel && o.painel.modo) ? o.painel.modo : 'auto',
                    tipoLampada: A.TIPOS_LAMPADA[o.painel && o.painel.tipoLampada] ? o.painel.tipoLampada : 'led_corte'
                },
                nobreak: {
                    exigido: !!nb.exigido, autonomiaMin: num(nb.autonomiaMin, 5, 600, 60), tipo: nb.tipo === 'online' ? 'online' : 'interativo',
                    desmarcadas: Array.isArray(nb.desmarcadas) ? nb.desmarcadas.filter(x => /^[A-Za-z]{1,30}$/.test(x)) : []
                },
                mapa: { pavimentoId: null, camada: (o.mapa && o.mapa.camada === 'pontos') ? 'pontos' : 'calor' },
                tipoGas: o.tipoGas === 'gn' ? 'gn' : 'glp',
                cameraAlimentacao: o.cameraAlimentacao === 'tomada' ? 'tomada' : 'poe',
                origensDescartadas: Array.isArray(o.origensDescartadas) ? o.origensDescartadas.filter(x => x != null).map(x => String(x).slice(0, 120)).slice(0, 1000) : [],
                avisoRemovidos: Math.max(0, Math.min(9999, Math.round(Number(o.avisoRemovidos) || 0)))
            };
        }

        // =========================================================================
        // CÁLCULO (com cache pela assinatura dos dados)
        // =========================================================================
        let _cacheAutomacao = { chave: null, resultado: null };

        function pavimentoBaseAutomacao() {
            const pavs = (state.pavimentos || []).slice().sort((a, b) => (Number(a.nivel) || 0) - (Number(b.nivel) || 0));
            return pavs[0] ? pavs[0].id : 'terreo';
        }

        function nomeComodoAutomacao(id) {
            const c = (state.comodos || []).find(x => String(x.id) === String(id));
            return c ? c.nome : '—';
        }

        function calcularAutomacao() {
            const A = Automacao;
            const cfg = obterConfigAutomacao();
            const esc = state.escala || 40;
            const comodos = state.comodos || [];
            const pontos = state.pontosEletricos || [];
            const pavs = state.pavimentos || [];
            const cfgChave = Object.assign({}, cfg, { mapa: null });     // trocar a camada do mapa não refaz a simulação
            const chave = JSON.stringify([cfgChave, esc, state.qdtPos, pavs.map(p => [p.id, p.nivel, p.alturaPeDireito, p.espessuraLajePiso]),
                comodos.map(c => [c.id, c.nome, c.x, c.y, c.largura, c.comprimento, c.pavimentoId]),
                pontos.map(p => [p.id, p.tipo, p.nome, p.destino, p.pot, p.tensao, p.fases, p.altura, p.alturaM, Math.round(p.x), Math.round(p.y), p.comodoId]),
                state.unifilar ? [state.unifilar.ilumPorComodo, state.unifilar.porPonto] : null]);
            if (_cacheAutomacao.chave === chave) return _cacheAutomacao.resultado;

            // lista automática pelo nível, ou a editada à mão sincronizada com os pontos atuais
            const automaticos = A.levantarDispositivos({ comodos, pontos, pavimentos: pavs, escala: esc, nivel: cfg.nivel });
            let sugestoesNovas = [];
            let listaBase = automaticos;
            if (cfg.dispositivos) {
                const sinc = A.sincronizarDispositivos(cfg.dispositivos, pontos, automaticos, cfg.origensDescartadas);
                if (sinc.mudou) {
                    cfg.dispositivos = sinc.lista;                        // posições atuais e pontos apagados fora
                    cfg.avisoRemovidos = (cfg.avisoRemovidos || 0) + sinc.removidos.length;
                }
                listaBase = sinc.lista;
                sugestoesNovas = sinc.novos;
            }
            const dispositivos = listaBase.filter(d => comodos.some(c => String(c.id) === String(d.comodoId)));
            const geo = A.geometriaPlanta({ comodos, pavimentos: pavs, escala: esc });
            const pavBase = pavimentoBaseAutomacao();
            const qdc = { x: ((state.qdtPos.x || 0) + (state.qdtPos.w || 0) / 2) / esc, y: ((state.qdtPos.y || 0) + (state.qdtPos.h || 0) / 2) / esc, pavId: pavBase };

            // dispositivos de rádio em metros (câmeras e vídeo-porteiro vão pela rede IP)
            const radio = dispositivos.filter(d => A.TIPOS[d.tipo].dados !== 'ip').map(d => ({
                id: d.id, x: d.x / esc, y: d.y / esc, pavId: d.pavimentoId || pavBase, roteador: !!A.TIPOS[d.tipo].roteador
            }));
            // contexto do projeto para as prioridades
            const pavsUsados = [...new Set(comodos.map(c => c.pavimentoId || pavBase))];
            const centro = {};
            pavsUsados.forEach(pid => {
                const s = geo.salas.filter(x => x.pavId === pid);
                if (!s.length) return;
                const x0 = Math.min(...s.map(q => q.x0)), x1 = Math.max(...s.map(q => q.x1)), y0 = Math.min(...s.map(q => q.y0)), y1 = Math.max(...s.map(q => q.y1));
                centro[pid] = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
            });
            const paredesMedias = radio.length ? radio.reduce((s, d) => s + (centro[d.pavId] ? A.paredesNoSegmento(geo, d.pavId, centro[d.pavId], d) : 0), 0) / radio.length : 0;
            const ctx = {
                qtdDispositivos: radio.length, areaM2: comodos.reduce((s, c) => s + (Number(c.area) || (Number(c.largura) || 0) * (Number(c.comprimento) || 0)), 0),
                numPavimentos: Math.max(1, pavsUsados.length), paredesMedias, ecossistema: cfg.ecossistema
            };
            const prioridades = cfg.prioridades || A.prioridadesAutomaticas(ctx);
            const ranking = A.pontuarTecnologias(prioridades, ctx);
            const tecId = cfg.tecnologia === 'auto' ? ranking[0].id : cfg.tecnologia;
            const tec = A.tecnologia(tecId);
            const cabeada = A.ehCabeada(tec);

            // rede sem fio: hub e repetidores
            const sim = A.criarSimulador(tecId, geo, cfg.materialParede);
            const candidatos = geo.salas.map(s => ({ x: Math.round((s.x0 + s.x1) / 2 * 10) / 10, y: Math.round((s.y0 + s.y1) / 2 * 10) / 10, pavId: s.pavId })).concat([qdc]);
            let hub = cabeada ? qdc : (cfg.hub || (radio.length ? (A.sugerirHub(sim, candidatos, radio) || {}).hub : null) || qdc);
            let repetidores = [];
            if (!cabeada) repetidores = cfg.repetidores || A.sugerirRepetidores(sim, hub, candidatos, radio, 8).repetidores;
            const rede = A.simularRede(sim, hub, repetidores, radio);

            // pontos de alimentação: tomada vinculada, sugerida, PoE, fonte 12 V ou rack
            const alimentacao = A.planejarAlimentacao({
                dispositivos, pontos, comodos, escala: esc, tecnologia: tecId, rack: cabeada ? qdc : hub,
                repetidores: cabeada ? [] : repetidores, servidorLocal: cfg.servidorLocal, tipoGas: cfg.tipoGas,
                cameraAlimentacao: cfg.cameraAlimentacao, incluirNoProjeto: cfg.incluirNoProjeto, niveis: geo.niveis
            });

            // painel, canais e barramento
            const comodoDe = id => comodos.find(c => String(c.id) === String(id));
            const mapa = state.unifilar || {};
            const circuitoDe = d => {
                if (['modulo_rele', 'interruptor', 'dimmer'].includes(d.tipo)) return (mapa.ilumPorComodo || {})[d.comodoId] || null;
                return d.origemPontoId != null ? ((mapa.porPonto || {})[d.origemPontoId] || null) : null;
            };
            const descricao = d => {
                const cm = (comodoDe(d.comodoId) || {}).nome || '';
                if (['modulo_rele', 'interruptor', 'dimmer'].includes(d.tipo)) return `Luz — ${cm}`;
                if (['tomada', 'rele_potencia', 'cortina', 'modulo_portao'].includes(d.tipo)) return `${d.detalhe || A.TIPOS[d.tipo].nome} (${cm})`;
                return `${A.TIPOS[d.tipo].nome} — ${cm}`;
            };
            const painel = A.montarPainel({ tecnologia: tecId, dispositivos, tipoLampada: cfg.painel.tipoLampada, descricao, circuitoDe });
            const localPainel = A.decidirLocalPainel(painel, cfg.painel.modo);
            const nivelZ = pid => (geo.niveis[pid] || { z0: 0 }).z0;
            let barramento = null;
            if (cabeada) {
                const campo = dispositivos.filter(d => { const cb = A.TIPOS[d.tipo].cabeado || {}; return cb.pulsador || cb.barramento || cb.entrada || (tecId !== 'knx' && cb.alternativo); })
                    .map(d => ({ x: d.x / esc, y: d.y / esc, z: nivelZ(d.pavimentoId || pavBase) + 1.2 }));
                barramento = A.metragemBarramento(tecId, { x: qdc.x, y: qdc.y, z: nivelZ(pavBase) + 1.5 }, campo);
            }
            // neutro até os interruptores/módulos inteligentes (sem fio): da luminária central à caixa
            let metrosNeutro = 0;
            if (!cabeada) {
                dispositivos.filter(d => A.TIPOS[d.tipo].neutro && ['modulo_rele', 'interruptor', 'dimmer'].includes(d.tipo)).forEach(d => {
                    const c = comodoDe(d.comodoId);
                    if (!c) return;
                    const pe = (geo.niveis[c.pavimentoId || pavBase] || { pe: 2.8 }).pe;
                    const lx = c.x / esc + c.largura / 2, ly = c.y / esc + c.comprimento / 2;
                    metrosNeutro += Math.abs(lx - d.x / esc) + Math.abs(ly - d.y / esc) + (pe - 1.2);
                });
                metrosNeutro = Math.ceil(metrosNeutro);
            }
            // nobreak (só quando exigido)
            const cargasNobreak = A.cargasNobreakSugeridas({ tecnologia: tecId, dispositivos, painel, servidorLocal: cfg.servidorLocal })
                .map(c => Object.assign(c, { selecionada: !cfg.nobreak.desmarcadas.includes(c.id) }));
            const nobreak = A.dimensionarNobreak({ exigido: cfg.nobreak.exigido, cargas: cargasNobreak, autonomiaMin: cfg.nobreak.autonomiaMin, tipo: cfg.nobreak.tipo });
            const cenas = A.sugerirCenas(dispositivos, nomeComodoAutomacao);
            const numRep = cabeada ? 0 : repetidores.length;
            const materiais = A.listaMateriais({ tecnologia: tecId, dispositivos, painel, repetidores: numRep, nobreak, metrosBarramento: barramento ? barramento.metros : 0, metrosNeutro, servidorLocal: cfg.servidorLocal, local: localPainel.local, alimentacao });
            const maoDeObra = A.quantidadesMaoDeObra({ tecnologia: tecId, dispositivos, repetidores: numRep, nobreak, metrosBarramento: barramento ? barramento.metros : 0, servidorLocal: cfg.servidorLocal, cenas });
            const memorial = A.gerarMemorial({ tecnologia: tecId, nivel: cfg.nivel, dispositivos, ranking: cfg.tecnologia === 'auto' ? ranking : ranking.filter(r => r.id === tecId), escolhaManual: cfg.tecnologia !== 'auto',
                rede, repetidores: numRep, material: cfg.materialParede, barramento, painel, localPainel, nobreak, cenas, metrosNeutro, local: localPainel.local });
            const impacto = A.impactoEletrico({ tecnologia: tecId, dispositivos, painel, nobreak, metrosNeutro, local: localPainel.local });

            // ponto de força do rack/hub: rota do QDC até o hub (sem fio) ou ao lado do painel (cabeado)
            const rack = cabeada ? qdc : hub;
            const rotaRack = Math.ceil(Math.abs(rack.x - qdc.x) + Math.abs(rack.y - qdc.y) + Math.abs(nivelZ(rack.pavId) - nivelZ(qdc.pavId)) + 2.8);
            const potRack = nobreak ? nobreak.circuito.potVA : Math.max(100, Math.ceil(cargasNobreak.reduce((s, c) => s + c.potW, 0) * 1.25 / 10) * 10);
            const tensaoRack = nobreak ? nobreak.circuito.tensao : 127;

            const resultado = {
                cfg, tec, tecId, cabeada, dispositivos, sugestoesNovas, radio, geo, sim, hub, repetidores, rede, alimentacao, candidatos, qdc, ctx, prioridades, ranking,
                painel, localPainel, barramento, metrosNeutro, cargasNobreak, nobreak, cenas, materiais, maoDeObra, memorial, impacto,
                rack: { pos: rack, rota: rotaRack, potVA: potRack, tensao: tensaoRack },
                painelSupply: cabeada && !(nobreak && cargasNobreak.some(c => c.id === 'fonteBarramento' && c.selecionada))
                    ? Math.max(100, Math.ceil(((tecId === 'knx' ? 30 : 0) + (painel.fonte ? painel.fonte.consumoW / 0.88 : 0)) * 1.25 / 10) * 10) : 0
            };
            _cacheAutomacao = { chave, resultado };
            return resultado;
        }

        /** Resultado para os outros módulos (quadro, circuitos, orçamento, memorial): só se incluída no projeto. */
        function obterResultadoAutomacao() {
            if (typeof Automacao === 'undefined' || !state.automacao || !state.automacao.incluirNoProjeto) return null;
            if (!(state.comodos || []).length) return null;
            try { return calcularAutomacao(); } catch (e) { console.warn('Automação:', e); return null; }
        }

        // =========================================================================
        // INTEGRAÇÃO COM CIRCUITOS, QUADRO, ORÇAMENTO E UNIFILAR
        // =========================================================================
        /** Circuitos dedicados da automação (rack/nobreak e alimentação do painel). */
        function obterCircuitosAutomacao(andarRotulo) {
            const r = obterResultadoAutomacao();
            if (!r) return [];
            const circ = (nome, potVA, tensao, rota, grupo) => {
                const ib = potVA / tensao;
                const { cabo, disj } = NBR5410.selecionarProtecaoTUE(ib);
                return {
                    num: 0, andar: andarRotulo || 'Automação', nome, escopo: { tipo: 'pontos', grupo, ids: [] },
                    tipo: 'TUE', tensao, potVal: potVA, pot: `${potVA} VA (${tensao}V)`, ibVal: ib, ib: `${ib.toFixed(1)} A`,
                    cabo, disj, curva: 'C', polos: tensao === 220 ? '2P' : '1P', rotaCad: r.rack.rota, distanciaCritica: r.rack.rota, automacao: true
                };
            };
            const lista = [circ(r.nobreak ? `TUE - Nobreak ${r.nobreak.va} VA (rack de automação)` : 'TUE - Rack de automação (hub, roteador)', r.rack.potVA, r.rack.tensao, r.rack.rota, 'automacao:rack')];
            if (r.painelSupply) lista.push(Object.assign(circ('TUE - Painel de automação (fontes do barramento)', r.painelSupply, 127, 3, 'automacao:painel'), { rotaCad: 3, distanciaCritica: 3 }));
            return lista;
        }

        /** Dispositivos DIN da automação que entram no QDC (desenho do quadro). */
        function obterDispositivosDinAutomacaoQdc() {
            const r = obterResultadoAutomacao();
            if (!r) return [];
            const itens = Automacao.itensDinDoPainel(r.painel);
            return r.localPainel.local === 'integrado' ? itens : itens.filter(i => i.grupo === 'potencia');
        }

        /** Interruptores com neutro (sem fio): ids dos pontos de interruptor que viraram dispositivos inteligentes. */
        function idsInterruptoresComNeutro() {
            const r = obterResultadoAutomacao();
            if (!r || r.cabeada) return new Set();
            return new Set(r.dispositivos.filter(d => Automacao.TIPOS[d.tipo].neutro && d.origemPontoId != null && ['modulo_rele', 'interruptor', 'dimmer'].includes(d.tipo)).map(d => d.origemPontoId));
        }

        /**
         * Fiação da automação cabeada (KNX, RS-485, relés) incluída no projeto: interruptores que viraram
         * pulsadores, cômodos cuja luz vem do atuador do painel e o rótulo do cabo. null fora desse caso.
         */
        function fiacaoCabeadaAutomacao() {
            const r = obterResultadoAutomacao();
            if (!r || !r.cabeada) return null;
            const luz = ['modulo_rele', 'interruptor', 'dimmer'];
            return {
                pulsadores: new Set(r.dispositivos.filter(d => luz.includes(d.tipo) && d.origemPontoId != null).map(d => d.origemPontoId)),
                comodosLuz: new Set(r.dispositivos.filter(d => luz.includes(d.tipo)).map(d => String(d.comodoId))),
                rotulo: r.tecId === 'knx' ? 'KNX' : (r.tecId === 'rs485' ? 'RS-485' : 'Comando 24 V')
            };
        }

        /** Miolo visual de um dispositivo DIN de automação (quadro e painel). */
        function mioloDispositivoAutomacao(item, w) {
            const curto = String(item.nome || '').replace(/\(.*?\)/g, '').replace(/KNX|RS-485\/Modbus|RS-485/g, m => m).trim();
            const cor = item.grupo === 'potencia' ? 'text-orange-300' : (item.grupo === 'controle' ? 'text-violet-300' : (item.grupo === 'protecao' ? 'text-rose-300' : 'text-sky-300'));
            const sigla = item.grupo === 'potencia' ? 'CONTATOR' : (/Fonte/.test(item.nome) ? 'FONTE' : (/Bornes/.test(item.nome) ? 'BORNES' : (/DPS/.test(item.nome) ? 'DPS' : (/Disjuntor/.test(item.nome) ? 'DISJ.' : (/Interface|Roteador IP|Gateway|Controlador|CLP|Acoplador/.test(item.nome) ? 'CONTROLE' : 'ATUADOR')))));
            return `
                <span class="text-[7px] font-black ${cor} tracking-tight">${sigla}</span>
                <div class="mx-auto my-1 rounded-sm bg-slate-950 border border-violet-500/40 flex items-center justify-center" style="width:${Math.max(26, w * 48 - 14)}px;height:24px">
                    <i class="fa-solid ${sigla === 'CONTATOR' ? 'fa-bolt' : (sigla === 'FONTE' ? 'fa-car-battery' : (sigla === 'CONTROLE' ? 'fa-microchip' : (sigla === 'BORNES' ? 'fa-grip-lines-vertical' : 'fa-toggle-on')))} text-violet-300 text-[10px]"></i>
                </div>
                <span class="text-[6px] text-slate-300 font-mono leading-tight px-0.5 w-full overflow-hidden" style="display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical" title="${escHtml(item.nome)}">${escHtml(curto)}</span>`;
        }

        /** Itens de material da automação para o orçamento (aba Materiais). */
        function obterMateriaisAutomacao() {
            const r = obterResultadoAutomacao();
            return r ? r.materiais : [];
        }

        // =========================================================================
        // AÇÕES DA TELA
        // =========================================================================
        function alterarAutomacao(campo, valor) {
            const cfg = obterConfigAutomacao();
            if (campo === 'incluir') cfg.incluirNoProjeto = !!valor;
            else if (campo === 'nivel') { cfg.nivel = valor; cfg.dispositivos = null; }
            else if (campo === 'tecnologia') { cfg.tecnologia = valor; cfg.hub = null; cfg.repetidores = null; }
            else if (campo === 'ecossistema') cfg.ecossistema = valor;
            else if (campo === 'material') { cfg.materialParede = valor; cfg.repetidores = null; }
            else if (campo === 'servidorLocal') cfg.servidorLocal = !!valor;
            else if (campo === 'painelModo') cfg.painel.modo = valor;
            else if (campo === 'tipoLampada') cfg.painel.tipoLampada = valor;
            else if (campo === 'nobreakExigido') cfg.nobreak.exigido = !!valor;
            else if (campo === 'nobreakAutonomia') cfg.nobreak.autonomiaMin = Math.max(5, Math.min(600, Number(valor) || 60));
            else if (campo === 'nobreakTipo') cfg.nobreak.tipo = valor === 'online' ? 'online' : 'interativo';
            else if (campo === 'mapaPavimento') cfg.mapa.pavimentoId = valor;
            else if (campo === 'mapaCamada') cfg.mapa.camada = valor;
            else if (campo === 'tipoGas') cfg.tipoGas = valor === 'gn' ? 'gn' : 'glp';
            else if (campo === 'cameraAlimentacao') cfg.cameraAlimentacao = valor === 'tomada' ? 'tomada' : 'poe';
            aplicarMudancaAutomacao(['incluir', 'nobreakExigido', 'nobreakAutonomia', 'nobreakTipo', 'painelModo', 'tipoLampada', 'tecnologia', 'nivel', 'servidorLocal', 'tipoGas', 'cameraAlimentacao'].includes(campo));
        }

        function alterarPrioridadeAutomacao(criterio, valor) {
            const cfg = obterConfigAutomacao();
            const r = calcularAutomacao();
            cfg.prioridades = Object.assign({}, r.prioridades, { [criterio]: Math.max(0, Math.min(5, Number(valor) || 0)) });
            aplicarMudancaAutomacao(false);
        }

        function restaurarPrioridadesAutomacao() {
            obterConfigAutomacao().prioridades = null;
            aplicarMudancaAutomacao(false);
        }

        function alternarCargaNobreak(id, marcada) {
            const nb = obterConfigAutomacao().nobreak;
            nb.desmarcadas = nb.desmarcadas.filter(x => x !== id);
            if (!marcada) nb.desmarcadas.push(id);
            aplicarMudancaAutomacao(true);
        }

        /** Torna a lista editável (copia o levantamento automático para a configuração). */
        function listaEditavelAutomacao() {
            const cfg = obterConfigAutomacao();
            if (!cfg.dispositivos) cfg.dispositivos = JSON.parse(JSON.stringify(calcularAutomacao().dispositivos));
            return cfg.dispositivos;
        }

        function removerDispositivoAutomacao(id) {
            const lista = listaEditavelAutomacao();
            const i = lista.findIndex(d => d.id === id);
            if (i >= 0) {
                const d = lista.splice(i, 1)[0];
                // o ponto de origem não volta como "sugestão nova"
                const cfg = obterConfigAutomacao();
                if (d.origemPontoId != null && !cfg.origensDescartadas.includes(String(d.origemPontoId))) cfg.origensDescartadas.push(String(d.origemPontoId));
            }
            aplicarMudancaAutomacao(true);
        }

        /** Inclui na lista editada as sugestões novas (todas ou a de um ponto). */
        function incluirSugestoesNovasAutomacao(origemPontoId) {
            const novas = calcularAutomacao().sugestoesNovas.filter(d => origemPontoId == null || String(d.origemPontoId) === String(origemPontoId));
            if (!novas.length) return;
            const lista = listaEditavelAutomacao();
            novas.forEach(d => { if (!lista.some(x => String(x.origemPontoId) === String(d.origemPontoId))) lista.push(JSON.parse(JSON.stringify(d))); });
            aplicarMudancaAutomacao(true);
            mostrarNotificacaoToast(`${novas.length} dispositivo(s) incluído(s) na lista.`, 'sucesso');
        }

        /** Descarta uma sugestão nova (o ponto não vira dispositivo). */
        function descartarSugestaoNovaAutomacao(origemPontoId) {
            const cfg = obterConfigAutomacao();
            if (!cfg.origensDescartadas.includes(String(origemPontoId))) cfg.origensDescartadas.push(String(origemPontoId));
            aplicarMudancaAutomacao(false);
        }

        function dispensarAvisoRemovidosAutomacao() {
            obterConfigAutomacao().avisoRemovidos = 0;
            aplicarMudancaAutomacao(false);
        }

        function adicionarDispositivoAutomacao(comodoId, tipo) {
            if (!tipo || !Automacao.TIPOS[tipo]) return;
            const c = (state.comodos || []).find(x => String(x.id) === String(comodoId));
            if (!c) return;
            const lista = listaEditavelAutomacao();
            const esc = state.escala || 40;
            const n = lista.filter(d => d.comodoId === c.id).length;
            lista.push({ id: `manual:${tipo}:${c.id}:${Date.now()}`, tipo, comodoId: c.id, pavimentoId: c.pavimentoId || 'terreo',
                x: c.x + (0.25 + (n % 3) * 0.25) * c.largura * esc, y: c.y + (0.3 + (Math.floor(n / 3) % 3) * 0.2) * c.comprimento * esc,
                origemPontoId: null, detalhe: 'Incluído manualmente' });
            aplicarMudancaAutomacao(true);
        }

        function regerarLevantamentoAutomacao() {
            const cfg = obterConfigAutomacao();
            if (cfg.dispositivos && !confirm('Descartar as alterações manuais e refazer o levantamento pelo nível escolhido?')) return;
            cfg.dispositivos = null;
            cfg.repetidores = null;
            cfg.origensDescartadas = [];
            cfg.avisoRemovidos = 0;
            aplicarMudancaAutomacao(true);
        }

        function sugerirPosicoesRedeAutomacao() {
            const cfg = obterConfigAutomacao();
            cfg.hub = null;
            cfg.repetidores = null;
            aplicarMudancaAutomacao(true);
            mostrarNotificacaoToast('Hub e repetidores reposicionados pela simulação.', 'info');
        }

        /** Cria no projeto elétrico as TUGs sugeridas para alimentar os dispositivos. */
        function lancarPontosAlimentacaoAutomacao() {
            const r = calcularAutomacao();
            const sug = r.alimentacao.sugestoes;
            if (!sug.length) { mostrarNotificacaoToast('Todos os dispositivos já têm ponto de alimentação.', 'info'); return; }
            sug.forEach((sp, i) => {
                state.pontosEletricos.push({
                    id: `pt_aut_${Date.now()}_${i}`, tipo: 'TUG', nome: sp.nome, destino: sp.destino, pot: sp.pot, tensao: sp.tensao,
                    altura: sp.altura, ...(sp.alturaM ? { alturaM: sp.alturaM } : {}), x: sp.x, y: sp.y,
                    comodoId: sp.comodoId, pavimentoId: sp.pavimentoId, origemAutomacao: true
                });
            });
            _cacheAutomacao.chave = null;
            if (typeof atualizarTudo === 'function') atualizarTudo();
            if (typeof reconstruirCena3D === 'function') reconstruirCena3D();
            renderizarAbaAutomacao();
            if (typeof salvarProjetoSilencioso === 'function') salvarProjetoSilencioso();
            mostrarNotificacaoToast(`${sug.length} ponto(s) de alimentação lançado(s) no projeto elétrico.`, 'sucesso');
        }

        function aplicarMudancaAutomacao(afetaProjeto) {
            _cacheAutomacao.chave = null;
            if (afetaProjeto && state.automacao && state.automacao.incluirNoProjeto && typeof atualizarTudo === 'function') {
                atualizarTudo();
            } else if (afetaProjeto && typeof atualizarTabelas === 'function') {
                atualizarTabelas();
            }
            renderizarAbaAutomacao();
            if (typeof salvarProjetoSilencioso === 'function') salvarProjetoSilencioso();
        }

        // =========================================================================
        // RENDERIZAÇÃO DA ABA
        // =========================================================================
        const fmtAut = (v, d) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
        const reaisAut = v => 'R$ ' + fmtAut(v, 2);
        const cardAut = (titulo, icone, corpo, extra) => `
            <section class="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4 shadow-lg" ${extra || ''}>
                <h2 class="text-sm md:text-base font-black text-white flex items-center gap-2"><i class="fa-solid ${icone} text-violet-400"></i> ${titulo}</h2>
                ${corpo}
            </section>`;

        function precoItemAutomacao(it) {
            const p = state.tabelaPrecos && state.tabelaPrecos.precosPorItem && state.tabelaPrecos.precosPorItem[it.item];
            if (p && Number(p.valor) > 0) return Number(p.valor);
            return (typeof obterPrecoMaterial === 'function') ? obterPrecoMaterial('automacao', it.chave, it.precoRef) : it.precoRef;
        }

        function renderizarAbaAutomacao() {
            const raiz = document.getElementById('automacaoRaiz');
            if (!raiz || typeof Automacao === 'undefined') return;
            const A = Automacao;
            const cfg = obterConfigAutomacao();
            if (!(state.comodos || []).length) {
                raiz.innerHTML = cardAut('Automação Residencial', 'fa-house-signal', '<p class="text-sm text-slate-400">Cadastre os cômodos e os pontos elétricos na aba Planta para gerar o projeto de automação.</p>');
                return;
            }
            const r = calcularAutomacao();
            const totalMat = r.materiais.reduce((s, it) => s + precoItemAutomacao(it) * it.qtd * (1 + (it.margem || 0)), 0);
            const radioOk = r.rede.aplicavel ? `${r.rede.conectados}/${r.radio.length}` : 'cabeado';

            const cabecalho = `
            <section class="bg-gradient-to-br from-violet-950/60 via-slate-900 to-slate-900 border border-violet-500/30 rounded-2xl p-4 md:p-5 space-y-4 shadow-lg">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div class="flex items-start gap-3">
                        <span class="w-10 h-10 shrink-0 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-300 flex items-center justify-center text-lg"><i class="fa-solid fa-house-signal"></i></span>
                        <div>
                            <h1 class="text-base md:text-lg font-black text-white">Automação Residencial</h1>
                            <p class="text-xs text-slate-400">Gerada a partir dos cômodos, pavimentos, pontos e circuitos do projeto. Edite a lista, compare as tecnologias e confira o alcance antes de incluir no quadro e no orçamento.</p>
                        </div>
                    </div>
                    <label class="flex items-center gap-2 bg-slate-950/70 border ${cfg.incluirNoProjeto ? 'border-emerald-500/50' : 'border-slate-700'} rounded-xl px-3 py-2 cursor-pointer select-none shrink-0">
                        <input type="checkbox" ${cfg.incluirNoProjeto ? 'checked' : ''} onchange="alterarAutomacao('incluir', this.checked)" class="w-4 h-4 accent-emerald-500">
                        <span class="text-xs font-bold ${cfg.incluirNoProjeto ? 'text-emerald-300' : 'text-slate-300'}">Incluir no projeto elétrico<br><span class="font-normal text-[10px] text-slate-400">quadro, circuitos, orçamento e memorial</span></span>
                    </label>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nível:</span>
                    ${Object.entries(A.NIVEIS).map(([k, n]) => `<button onclick="alterarAutomacao('nivel', '${k}')" class="px-3 py-1.5 rounded-lg text-xs font-bold border transition ${cfg.nivel === k ? 'bg-violet-500 text-white border-violet-400' : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-violet-500/60'}">${n}</button>`).join('')}
                    ${cfg.dispositivos ? '<span class="text-[10px] px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">Lista editada manualmente</span>' : ''}
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                    ${[['Dispositivos', r.dispositivos.length, 'fa-microchip'], ['Tecnologia', r.tec.nomeCurto + (cfg.tecnologia === 'auto' ? ' (sugerida)' : ''), 'fa-tower-broadcast'],
                       ['No alcance', radioOk, 'fa-wifi'], ['Painel / DIN', r.painel.cabeado ? `${r.painel.modulosTotal} módulos` : `${r.painel.modulosDispositivos} mód. no QDC`, 'fa-table-cells'],
                       ['Material', reaisAut(totalMat), 'fa-cart-shopping'], ['Nobreak', r.nobreak ? `${r.nobreak.va} VA` : 'Não exigido', 'fa-car-battery']]
                        .map(([t, v, i]) => `<div class="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 min-w-0"><span class="text-[10px] text-slate-400 flex items-center gap-1"><i class="fa-solid ${i} text-violet-400"></i>${t}</span><span class="block text-sm font-black text-white font-mono truncate" title="${escHtml(String(v))}">${escHtml(String(v))}</span></div>`).join('')}
                </div>
                ${cfg.incluirNoProjeto ? '' : '<p class="text-[11px] text-amber-300/90"><i class="fa-solid fa-circle-info"></i> A automação ainda não entra no quadro, nos circuitos, no orçamento nem no memorial. Marque "Incluir no projeto elétrico" quando o levantamento estiver pronto.</p>'}
                ${cfg.incluirNoProjeto && r.alimentacao.semPonto ? `<p class="text-[12px] font-bold text-red-200 bg-red-500/15 border border-red-500/40 rounded-xl p-2.5"><i class="fa-solid fa-plug-circle-xmark"></i> ${r.alimentacao.semPonto} dispositivo(s) ligado(s) na rede elétrica ainda sem ponto de alimentação no projeto: veja "Pontos de alimentação" e lance os pontos sugeridos.</p>` : ''}
            </section>`;

            raiz.innerHTML = cabecalho +
                secaoLevantamentoAutomacao(r) +
                secaoAlimentacaoAutomacao(r) +
                secaoComparacaoAutomacao(r) +
                secaoSugestaoAutomacao(r) +
                secaoAlcanceAutomacao(r) +
                secaoPainelAutomacao(r) +
                secaoNobreakAutomacao(r) +
                secaoOrcamentoAutomacao(r, totalMat) +
                secaoImpactoAutomacao(r) +
                secaoEntregaveisAutomacao(r);

            requestAnimationFrame(() => { desenharMapaAutomacao(); desenharPainelAutomacao(r); });
        }

        // ---------- 1. Levantamento ----------
        function secaoLevantamentoAutomacao(r) {
            const A = Automacao;
            const opcoesTipo = Object.entries(A.TIPOS).map(([k, t]) => `<option value="${k}">${escHtml(t.nome)}</option>`).join('');
            const linhas = (state.comodos || []).map(c => {
                const devs = r.dispositivos.filter(d => String(d.comodoId) === String(c.id));
                const pav = (state.pavimentos || []).find(p => p.id === c.pavimentoId);
                const itens = devs.map(d => {
                    const t = A.TIPOS[d.tipo];
                    const est = r.rede.porDispositivo[d.id];
                    const alc = !r.rede.aplicavel || t.dados === 'ip' ? '' : (est && est.ok ? `<span class="text-emerald-400" title="Margem ${fmtAut(est.margemDb, 0)} dB, ${est.saltos} salto(s)"><i class="fa-solid fa-signal"></i></span>` : '<span class="text-red-400" title="Fora de alcance na simulação"><i class="fa-solid fa-triangle-exclamation"></i></span>');
                    return `<li class="flex items-center justify-between gap-2 py-1 border-b border-slate-800/60 last:border-0">
                        <span class="flex items-center gap-2 min-w-0"><i class="fa-solid ${t.icone} text-violet-300 w-4 text-center"></i>
                            <span class="min-w-0"><span class="block text-[11px] font-semibold text-white truncate">${escHtml(t.nome)}${t.neutro && !r.cabeada ? ' <span class="text-[9px] text-sky-300">(neutro)</span>' : ''}</span><span class="block text-[10px] text-slate-400 truncate">${escHtml(d.detalhe || '')}</span></span></span>
                        <span class="flex items-center gap-2 shrink-0">${alc}<button onclick="removerDispositivoAutomacao(${argJsEmAtributo(d.id)})" class="text-slate-500 hover:text-red-400 p-1" title="Remover"><i class="fa-solid fa-xmark"></i></button></span>
                    </li>`;
                }).join('');
                return `<div class="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div class="flex items-center justify-between gap-2">
                        <h3 class="text-xs font-black text-white truncate">${escHtml(c.nome)} <span class="text-[10px] font-normal text-slate-500">${escHtml(pav ? pav.nome : '')}</span></h3>
                        <span class="text-[10px] font-mono text-violet-300 shrink-0">${devs.length} disp.</span>
                    </div>
                    <ul>${itens || '<li class="text-[11px] text-slate-500 italic">Nenhum dispositivo</li>'}</ul>
                    <select onchange="adicionarDispositivoAutomacao(${argJsEmAtributo(c.id)}, this.value); this.value=''" class="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg p-1.5 text-[11px]"><option value="">+ Adicionar dispositivo…</option>${opcoesTipo}</select>
                </div>`;
            }).join('');
            const cfgL = r.cfg;
            const nomePt = d => { const pt = (state.pontosEletricos || []).find(x => String(x.id) === String(d.origemPontoId)); return pt ? (pt.nome || pt.tipo) : ''; };
            const avisos = `
                ${cfgL.avisoRemovidos ? `<div class="flex flex-wrap items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/40 rounded-xl p-2.5 text-[12px] text-amber-200">
                    <span><i class="fa-solid fa-circle-minus"></i> ${cfgL.avisoRemovidos} dispositivo(s) saíram da lista editada porque o ponto de origem foi apagado do projeto.</span>
                    <button onclick="dispensarAvisoRemovidosAutomacao()" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700">Entendi</button></div>` : ''}
                ${r.sugestoesNovas.length ? `<div class="bg-sky-500/10 border border-sky-500/40 rounded-xl p-3 space-y-2 text-[12px] text-sky-100">
                    <div class="flex flex-wrap items-center justify-between gap-2"><span><i class="fa-solid fa-wand-magic-sparkles"></i> <strong>${r.sugestoesNovas.length} sugestão(ões) nova(s)</strong>: pontos lançados depois da edição que o nível ${escHtml(Automacao.NIVEIS[cfgL.nivel])} transformaria em dispositivo. As suas edições continuam valendo.</span>
                        <button onclick="incluirSugestoesNovasAutomacao()" class="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold">Incluir todas</button></div>
                    <ul class="space-y-1">${r.sugestoesNovas.map(d => `<li class="flex flex-wrap items-center justify-between gap-2 bg-slate-950/50 rounded-lg px-2 py-1"><span><i class="fa-solid ${Automacao.TIPOS[d.tipo].icone} text-sky-300"></i> ${escHtml(Automacao.TIPOS[d.tipo].nome)} — ${escHtml(nomeComodoAutomacao(d.comodoId))} <span class="text-slate-400">(${escHtml(nomePt(d))})</span></span>
                        <span class="flex gap-1.5"><button onclick="incluirSugestoesNovasAutomacao(${argJsEmAtributo(d.origemPontoId)})" class="px-2 py-0.5 rounded bg-sky-700 hover:bg-sky-600 text-white font-bold text-[11px]">Incluir</button><button onclick="descartarSugestaoNovaAutomacao(${argJsEmAtributo(d.origemPontoId)})" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]">Ignorar</button></span></li>`).join('')}</ul>
                </div>` : ''}`;
            const corpo = avisos + `
                <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>Interruptores viram módulos/interruptores inteligentes, tomadas viram tomadas inteligentes e as TUEs ganham controle IR ou relé de potência. Sensores, fechaduras, câmeras e cortinas entram conforme o cômodo e o nível.</span>
                    <button onclick="regerarLevantamentoAutomacao()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700"><i class="fa-solid fa-rotate"></i> Refazer pelo nível</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">${linhas}</div>`;
            return cardAut('1. Levantamento por cômodo', 'fa-list-check', corpo);
        }

        // ---------- 2. Pontos de alimentação ----------
        function secaoAlimentacaoAutomacao(r) {
            const cfg = r.cfg;
            const al = r.alimentacao;
            const ROT = {
                vinculado: ['Tomada vinculada', 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'],
                sugerido: ['Ponto sugerido', 'bg-red-500/15 text-red-200 border-red-500/40'],
                poe: ['PoE do rack', 'bg-sky-500/15 text-sky-300 border-sky-500/40'],
                fonte12v: ['Fonte 12 V', 'bg-sky-500/15 text-sky-300 border-sky-500/40'],
                rack: ['Tomada do rack', 'bg-violet-500/15 text-violet-300 border-violet-500/40']
            };
            const linhas = al.itens.filter(i => ROT[i.situacao]).sort((a, b) => (a.situacao === 'sugerido' ? -1 : 0) - (b.situacao === 'sugerido' ? -1 : 0)).map(i => `
                <tr class="${i.situacao === 'sugerido' ? 'bg-red-500/5' : ''} align-top">
                    <td class="p-2 text-white font-semibold">${escHtml(i.nome)}</td>
                    <td class="p-2 text-slate-300">${escHtml(i.comodo || '—')}</td>
                    <td class="p-2"><span class="inline-block px-2 py-0.5 rounded-lg border text-[10px] font-bold whitespace-nowrap ${ROT[i.situacao][1]}">${ROT[i.situacao][0]}</span><span class="block text-[11px] text-slate-300 mt-1">${escHtml(i.ponto || '')}</span></td>
                    <td class="p-2 text-slate-400">${escHtml(i.motivo || '')}</td>
                </tr>`).join('');
            const res = al.resumo;
            const corpo = `
                <p class="text-[11px] text-slate-400">Todo dispositivo ligado na rede elétrica precisa de um ponto: a tomada do cômodo (até 1,5 m, na altura certa e sem destinação reservada), PoE, a fonte de 12 V ou a tomada do rack. ${res.origem} usam o ponto de origem (interruptor com neutro, TUG ou TUE) e ${res.bateria} funcionam a bateria.</p>
                <div class="flex flex-wrap items-center gap-2 text-[11px]">
                    <label class="text-slate-400">Detector de gás:
                        <select onchange="alterarAutomacao('tipoGas', this.value)" class="ml-1 bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5"><option value="glp" ${cfg.tipoGas !== 'gn' ? 'selected' : ''}>GLP (botijão) — 0,30 m do piso</option><option value="gn" ${cfg.tipoGas === 'gn' ? 'selected' : ''}>Gás natural (rede) — alto</option></select></label>
                    <label class="text-slate-400">Câmeras e vídeo-porteiro:
                        <select onchange="alterarAutomacao('cameraAlimentacao', this.value)" class="ml-1 bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5"><option value="poe" ${cfg.cameraAlimentacao !== 'tomada' ? 'selected' : ''}>PoE pelo switch do rack</option><option value="tomada" ${cfg.cameraAlimentacao === 'tomada' ? 'selected' : ''}>Tomada alta</option></select></label>
                    <span class="flex-1"></span>
                    <button onclick="lancarPontosAlimentacaoAutomacao()" ${al.sugestoes.length ? '' : 'disabled'} class="px-3 py-1.5 rounded-lg font-bold ${al.sugestoes.length ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}"><i class="fa-solid fa-plug-circle-plus"></i> Lançar pontos sugeridos no projeto elétrico (${al.sugestoes.length})</button>
                </div>
                ${al.semPonto ? `<p class="text-[12px] text-red-200"><i class="fa-solid fa-triangle-exclamation"></i> ${al.semPonto} dispositivo(s) sem ponto de alimentação. Lance os pontos sugeridos ou ligue-os numa tomada existente do cômodo.</p>` : '<p class="text-[12px] text-emerald-300"><i class="fa-solid fa-circle-check"></i> Todos os dispositivos ligados na rede elétrica têm ponto previsto.</p>'}
                <div class="overflow-x-auto rounded-xl border border-slate-800"><table class="w-full text-[11px] text-slate-300 min-w-[720px]">
                    <thead class="bg-slate-950 text-[10px] uppercase text-slate-400"><tr><th class="p-2 text-left">Dispositivo</th><th class="p-2 text-left">Cômodo</th><th class="p-2 text-left">Ponto vinculado ou sugerido</th><th class="p-2 text-left">Motivo</th></tr></thead>
                    <tbody class="divide-y divide-slate-800">${linhas || '<tr><td colspan="4" class="p-3 text-slate-500">Nenhum dispositivo precisa de ponto próprio.</td></tr>'}</tbody>
                </table></div>`;
            return cardAut('2. Pontos de alimentação', 'fa-plug-circle-bolt', corpo, 'id="secaoAlimentacaoAutomacao"');
        }

        // ---------- 2. Comparação ----------
        function secaoComparacaoAutomacao(r) {
            const A = Automacao;
            const corCompat = v => v === 'sim' ? 'text-emerald-300' : (v === 'ponte' ? 'text-amber-300' : 'text-red-300');
            const linhas = A.TECNOLOGIAS.map(t => {
                const ativa = t.id === r.tecId;
                return `<tr class="${ativa ? 'bg-violet-500/10' : ''} align-top">
                    <td class="p-2 font-bold text-white whitespace-nowrap">${escHtml(t.nome)}${ativa ? ' <span class="text-[9px] px-1.5 py-0.5 rounded bg-violet-500 text-white">adotada</span>' : ''}<span class="block text-[10px] font-normal text-slate-500">${t.tipo === 'cabeado' ? 'Cabeado' : (t.freqMHz < 1500 ? String(t.freqMHz).replace('.', ',') + ' MHz' : '2,4 GHz')}</span></td>
                    <td class="p-2">${escHtml(t.alcance)}</td><td class="p-2">${escHtml(t.consumo)}</td><td class="p-2">${escHtml(t.malha)}</td>
                    <td class="p-2">${escHtml(t.hub)}</td><td class="p-2">${escHtml(t.semInternet)}</td><td class="p-2 whitespace-nowrap">${escHtml(t.custoPonto)}</td>
                    ${['alexa', 'google', 'apple', 'homeassistant'].map(e => `<td class="p-2 text-center font-bold ${corCompat(t.ecossistemas[e])}">${A.ROTULO_COMPAT[t.ecossistemas[e]]}</td>`).join('')}
                    <td class="p-2 text-slate-400">${escHtml(t.obsBrasil)}</td>
                </tr>`;
            }).join('');
            const corpo = `
                <div class="overflow-x-auto rounded-xl border border-slate-800">
                    <table class="w-full text-[11px] text-slate-300 min-w-[1100px]">
                        <thead class="bg-slate-950 text-[10px] uppercase text-slate-400"><tr>
                            <th class="p-2 text-left">Tecnologia</th><th class="p-2 text-left">Alcance</th><th class="p-2 text-left">Consumo</th><th class="p-2 text-left">Malha</th><th class="p-2 text-left">Hub</th><th class="p-2 text-left">Sem internet</th><th class="p-2 text-left">Custo por ponto</th>
                            <th class="p-2">Alexa</th><th class="p-2">Google</th><th class="p-2">Apple Home</th><th class="p-2">Home Assistant</th><th class="p-2 text-left">Brasil (Anatel, frequência)</th>
                        </tr></thead>
                        <tbody class="divide-y divide-slate-800">${linhas}</tbody>
                    </table>
                </div>
                <p class="text-[10px] text-slate-500">"Via ponte/hub": funciona por meio de um hub, ponte (bridge) ou do Home Assistant. Faixas de custo de referência (${A.DATA_REFERENCIA}).</p>`;
            return cardAut('3. Comparação de tecnologias', 'fa-table-columns', corpo);
        }

        // ---------- 3. Sugestão ----------
        function secaoSugestaoAutomacao(r) {
            const A = Automacao;
            const cfg = r.cfg;
            const sliders = Object.entries(A.CRITERIOS).map(([k, n]) => `
                <label class="block bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
                    <span class="flex justify-between text-[11px] text-slate-300 font-semibold">${n}<span class="font-mono text-violet-300">${r.prioridades[k]}</span></span>
                    <input type="range" min="0" max="5" step="1" value="${r.prioridades[k]}" onchange="alterarPrioridadeAutomacao('${k}', this.value)" class="w-full accent-violet-500">
                </label>`).join('');
            const max = Math.max(...r.ranking.map(x => x.pontuacao), 1);
            const barras = r.ranking.map((x, i) => `
                <div class="flex items-center gap-2 text-[11px]">
                    <span class="w-40 shrink-0 truncate ${x.id === r.tecId ? 'text-violet-300 font-black' : 'text-slate-300'}">${i + 1}. ${escHtml(x.nome)}</span>
                    <div class="flex-1 h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800"><div class="h-full ${i === 0 ? 'bg-violet-500' : 'bg-slate-600'}" style="width:${(x.pontuacao / max * 100).toFixed(0)}%"></div></div>
                    <span class="w-8 text-right font-mono text-white">${x.pontuacao}</span>
                </div>`).join('');
            const top = r.ranking[0];
            const adotada = r.ranking.find(x => x.id === r.tecId);
            const corpo = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div class="space-y-3">
                        <p class="text-[11px] text-slate-400">Prioridades de 0 (não importa) a 5 (muito importante). Os valores iniciais vêm do projeto: ${r.ctx.qtdDispositivos} dispositivos sem fio, ${fmtAut(r.ctx.areaM2, 0)} m², ${r.ctx.numPavimentos} pavimento(s), média de ${fmtAut(r.ctx.paredesMedias, 1)} paredes até o centro da casa.</p>
                        <div class="grid grid-cols-2 gap-2">${sliders}</div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <label class="block"><span class="text-slate-400">Ecossistema que já existe</span>
                                <select onchange="alterarAutomacao('ecossistema', this.value)" class="w-full mt-1 bg-slate-950 border border-slate-700 text-white rounded-lg p-2">${Object.entries(A.ECOSSISTEMAS).map(([k, n]) => `<option value="${k}" ${cfg.ecossistema === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
                            <label class="block"><span class="text-slate-400">Tecnologia do projeto</span>
                                <select onchange="alterarAutomacao('tecnologia', this.value)" class="w-full mt-1 bg-slate-950 border border-slate-700 text-white rounded-lg p-2"><option value="auto" ${cfg.tecnologia === 'auto' ? 'selected' : ''}>Automática: ${escHtml(top.nomeCurto)}</option>${A.TECNOLOGIAS.map(t => `<option value="${t.id}" ${cfg.tecnologia === t.id ? 'selected' : ''}>${escHtml(t.nome)}</option>`).join('')}</select></label>
                        </div>
                        <div class="flex flex-wrap gap-3 items-center text-[11px]">
                            <button onclick="restaurarPrioridadesAutomacao()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700"><i class="fa-solid fa-wand-magic-sparkles"></i> Prioridades do projeto</button>
                            <label class="flex items-center gap-2 text-slate-300"><input type="checkbox" ${cfg.servidorLocal ? 'checked' : ''} onchange="alterarAutomacao('servidorLocal', this.checked)" class="accent-violet-500"> Servidor local (Home Assistant)</label>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <div class="space-y-1.5">${barras}</div>
                        <div class="bg-violet-950/30 border border-violet-500/30 rounded-xl p-3 space-y-1.5 text-[12px] text-slate-200">
                            <p class="font-black text-violet-200"><i class="fa-solid fa-award"></i> ${cfg.tecnologia === 'auto' ? 'Sugestão' : 'Tecnologia escolhida'}: ${escHtml(adotada.nome)}</p>
                            ${adotada.justificativa.map(t => `<p>${escHtml(t)}</p>`).join('')}
                            ${adotada.alertas.map(t => `<p class="text-amber-300"><i class="fa-solid fa-triangle-exclamation"></i> ${escHtml(t)}</p>`).join('')}
                        </div>
                    </div>
                </div>`;
            return cardAut('4. Sugestão da melhor tecnologia', 'fa-scale-balanced', corpo);
        }

        // ---------- 4. Alcance ----------
        function secaoAlcanceAutomacao(r) {
            const A = Automacao;
            const cfg = r.cfg;
            const pavs = (state.pavimentos || []).filter(p => (state.comodos || []).some(c => (c.pavimentoId || 'terreo') === p.id));
            const pavSel = pavs.some(p => p.id === cfg.mapa.pavimentoId) ? cfg.mapa.pavimentoId : (r.hub && pavs.some(p => p.id === r.hub.pavId) ? r.hub.pavId : (pavs[0] || {}).id);
            const fora = r.rede.fora.map(id => r.dispositivos.find(d => d.id === id)).filter(Boolean);
            const aviso = `<div class="flex items-start gap-2 bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 text-[11px] text-amber-200">
                <i class="fa-solid fa-triangle-exclamation mt-0.5"></i>
                <span><strong>Estimativa.</strong> O modelo soma a perda por distância (log-distância, expoente 2,2${r.tec.freqMHz ? `, ${fmtAut(20 * Math.log10(r.tec.freqMHz) - 27.55, 0)} dB no primeiro metro` : ''}), a atenuação de cada parede e de cada laje conforme o material e ${A.MARGEM_DESVANECIMENTO} dB de folga. Móveis, espelhos, eletrodomésticos e interferência não entram: <strong>não substitui a medição de sinal no local</strong>.</span>
            </div>`;
            const controles = `
                <div class="flex flex-wrap items-center gap-2 text-[11px]">
                    <select onchange="alterarAutomacao('mapaPavimento', this.value)" class="bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5">${pavs.map(p => `<option value="${p.id}" ${p.id === pavSel ? 'selected' : ''}>${escHtml(p.nome)}</option>`).join('')}</select>
                    <select onchange="alterarAutomacao('material', this.value)" class="bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5" title="Material das paredes">${Object.entries(A.MATERIAIS_PAREDE).map(([k, m]) => `<option value="${k}" ${cfg.materialParede === k ? 'selected' : ''}>Paredes: ${escHtml(m.nome)}</option>`).join('')}</select>
                    <div class="flex rounded-lg overflow-hidden border border-slate-700">
                        <button onclick="alterarAutomacao('mapaCamada', 'calor')" class="px-2.5 py-1.5 font-bold ${cfg.mapa.camada !== 'pontos' ? 'bg-violet-500 text-white' : 'bg-slate-950 text-slate-300'}">Mapa de calor</button>
                        <button onclick="alterarAutomacao('mapaCamada', 'pontos')" class="px-2.5 py-1.5 font-bold ${cfg.mapa.camada === 'pontos' ? 'bg-violet-500 text-white' : 'bg-slate-950 text-slate-300'}">Planta de automação</button>
                    </div>
                    ${r.cabeada ? '' : `<button onclick="sugerirPosicoesRedeAutomacao()" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700"><i class="fa-solid fa-location-crosshairs"></i> Reposicionar hub e repetidores</button>`}
                </div>`;
            const resumo = r.rede.aplicavel ? `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5"><span class="text-slate-400">${r.cfg.hub ? 'Hub (posição escolhida)' : 'Hub sugerido'}</span><span class="block text-white font-bold">${escHtml(nomeComodoPorPosicaoAutomacao(r, r.hub))}</span><span class="text-[10px] text-slate-500">${r.cfg.hub ? 'posição escolhida na planta' : 'posição que alcança mais dispositivos'} — clique na planta para mover</span></div>
                    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5"><span class="text-slate-400">Repetidores</span><span class="block text-white font-bold">${r.repetidores.length ? r.repetidores.map(q => escHtml(nomeComodoPorPosicaoAutomacao(r, q))).join(', ') : 'Nenhum necessário'}</span><span class="text-[10px] text-slate-500">${r.tec.radio.malha ? 'Na malha, os aparelhos ligados na rede elétrica também repetem o sinal' : 'Pontos de acesso do sistema mesh'}</span></div>
                    <div class="bg-slate-950/60 border ${fora.length ? 'border-red-500/50' : 'border-emerald-500/40'} rounded-xl p-2.5"><span class="text-slate-400">Fora de alcance</span><span class="block font-bold ${fora.length ? 'text-red-300' : 'text-emerald-300'}">${fora.length ? fora.length + ' dispositivo(s)' : 'Todos alcançam o hub'}</span><span class="text-[10px] text-slate-500">${fora.slice(0, 6).map(d => escHtml(`${A.TIPOS[d.tipo].nome} (${nomeComodoAutomacao(d.comodoId)})`)).join('; ')}</span></div>
                </div>` : `<p class="text-[12px] text-slate-300 bg-slate-950/60 border border-slate-800 rounded-xl p-3"><i class="fa-solid fa-network-wired text-violet-400"></i> ${escHtml(r.tec.nome)} é cabeado: não há teste de alcance de rádio. ${r.barramento ? `Cabo de barramento estimado em <strong>${r.barramento.metros} m</strong> pelas rotas da planta (${escHtml(r.barramento.topologia.charAt(0).toLowerCase() + r.barramento.topologia.slice(1))})${r.barramento.limiteM ? `, ${r.barramento.ok ? 'dentro' : 'ACIMA'} do limite de ${r.barramento.limiteM} m por linha` : ''}.` : ''} A planta mostra os pontos de automação e o painel.</p>`;
            const corpo = `${aviso}${controles}${resumo}
                <div class="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <canvas id="canvasMapaAutomacao" data-pav="${escHtml(pavSel || '')}" class="w-full block cursor-crosshair" style="height:460px"></canvas>
                </div>
                <div class="flex flex-wrap gap-3 text-[10px] text-slate-400">
                    ${r.rede.aplicavel ? '<span class="flex items-center gap-1"><span class="w-16 h-3 rounded-sm" style="background:linear-gradient(90deg,rgba(234,179,8,.7),rgba(132,204,22,.7),rgba(22,163,74,.7))"></span>Folga do sinal: 0 → 15 → 30 dB ou mais</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm" style="background:rgba(239,68,68,.45)"></span>Sem sinal</span>' : ''}
                    <span class="flex items-center gap-1"><span class="text-violet-300">★</span>Hub / rack</span><span class="flex items-center gap-1"><span class="text-sky-300">◆</span>Repetidor</span>
                    <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>No alcance</span><span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>Fora de alcance</span><span class="flex items-center gap-1"><span class="w-2.5 h-2.5 bg-amber-400"></span>Quadro (QDC)</span>
                </div>`;
            return cardAut('5. Teste de alcance de sensores e hubs (simulação)', 'fa-tower-broadcast', corpo);
        }

        function nomeComodoPorPosicaoAutomacao(r, q) {
            if (!q) return '—';
            const s = r.geo.salas.find(x => x.pavId === q.pavId && q.x >= x.x0 && q.x <= x.x1 && q.y >= x.y0 && q.y <= x.y1);
            if (s) return nomeComodoAutomacao(s.id);
            return (Math.abs(q.x - r.qdc.x) < 0.01 && Math.abs(q.y - r.qdc.y) < 0.01) ? 'Junto ao quadro (QDC)' : 'Área externa';
        }

        /** Cor RGBA da folga do enlace: verde forte ≥ 30 dB, verde-claro 15, amarelo 0, vermelho sem sinal. */
        function corMargemAutomacao(m) {
            if (!isFinite(m) || m < 0) return [239, 68, 68, 105];
            const paradas = [[0, [234, 179, 8]], [15, [132, 204, 22]], [30, [22, 163, 74]]];
            const v = Math.min(30, m);
            let i = 0;
            while (i < paradas.length - 2 && v > paradas[i + 1][0]) i++;
            const [a0, c0] = paradas[i], [a1, c1] = paradas[i + 1];
            const t = (v - a0) / (a1 - a0);
            return [0, 1, 2].map(j => Math.round(c0[j] + (c1[j] - c0[j]) * t)).concat([125]);
        }

        /** Desenha a planta do pavimento escolhido com o mapa de calor ou os pontos de automação. */
        function desenharMapaAutomacao() {
            const cv = document.getElementById('canvasMapaAutomacao');
            if (!cv || typeof Automacao === 'undefined') return;
            const A = Automacao;
            const r = calcularAutomacao();
            const pavId = cv.dataset.pav || pavimentoBaseAutomacao();
            const dpr = window.devicePixelRatio || 1;
            const W = cv.clientWidth || 800, H = cv.clientHeight || 460;
            cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
            const ctx = cv.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, W, H);
            const salas = r.geo.salas.filter(s => s.pavId === pavId);
            if (!salas.length) return;
            const x0 = Math.min(...salas.map(s => s.x0), r.qdc.x) - 1, x1 = Math.max(...salas.map(s => s.x1), r.qdc.x) + 1;
            const y0 = Math.min(...salas.map(s => s.y0), r.qdc.y) - 1, y1 = Math.max(...salas.map(s => s.y1), r.qdc.y) + 1;
            const k = Math.min((W - 20) / (x1 - x0), (H - 20) / (y1 - y0));
            const ox = (W - (x1 - x0) * k) / 2 - x0 * k, oy = (H - (y1 - y0) * k) / 2 - y0 * k;
            const P = (x, y) => [ox + x * k, oy + y * k];
            cv._aut = { ox, oy, k, pavId };

            // mapa de calor (sem fio)
            const camadaCalor = r.cfg.mapa.camada !== 'pontos';
            if (camadaCalor && r.rede.aplicavel) {
                // fontes de sinal: hub e repetidores; na malha, também os aparelhos que repetem e estão conectados
                const nos = r.rede.nos.filter(n => !n.semSinal).concat(r.tec.radio.malha
                    ? r.radio.filter(d => d.roteador && r.rede.porDispositivo[d.id] && r.rede.porDispositivo[d.id].ok) : []);
                const passo = Math.max(0.35, Math.min(0.8, (x1 - x0) / 60));
                const mapa = A.mapaDeCalor(r.sim, nos, pavId, { x0, y0, x1, y1 }, passo);
                // uma célula por pixel numa imagem pequena, ampliada com suavização (gradiente contínuo)
                const off = document.createElement('canvas');
                off.width = mapa.nx; off.height = mapa.ny;
                const octx = off.getContext('2d');
                const img = octx.createImageData(mapa.nx, mapa.ny);
                mapa.valores.forEach((m, i) => {
                    const [cr, cg, cb, ca] = corMargemAutomacao(m);
                    img.data[i * 4] = cr; img.data[i * 4 + 1] = cg; img.data[i * 4 + 2] = cb; img.data[i * 4 + 3] = ca;
                });
                octx.putImageData(img, 0, 0);
                ctx.imageSmoothingEnabled = true;
                const [hx0, hy0] = P(mapa.x0, mapa.y0);
                ctx.drawImage(off, hx0, hy0, mapa.nx * mapa.passo * k, mapa.ny * mapa.passo * k);
            }
            // cômodos
            ctx.lineWidth = 2; ctx.strokeStyle = '#cbd5e1';
            ctx.font = `bold ${Math.max(9, Math.min(13, k * 0.32))}px sans-serif`; ctx.textAlign = 'center';
            salas.forEach(s => {
                const [a, b] = P(s.x0, s.y0), [c, d] = P(s.x1, s.y1);
                if (!camadaCalor || !r.rede.aplicavel) { ctx.fillStyle = 'rgba(30,41,59,0.55)'; ctx.fillRect(a, b, c - a, d - b); }
                ctx.strokeRect(a, b, c - a, d - b);
            });
            // QDC
            if (r.qdc.pavId === pavId) { const [qx, qy] = P(r.qdc.x, r.qdc.y); ctx.fillStyle = '#fbbf24'; ctx.fillRect(qx - 7, qy - 5, 14, 10); ctx.fillStyle = '#0f172a'; ctx.font = 'bold 7px sans-serif'; ctx.fillText('QDC', qx, qy + 2.5); }
            // enlaces
            const esc = state.escala || 40;
            const posNo = id => {
                if (id === 'hub') return r.hub;
                const rep = r.rede.nos.find(n => n.id === id); if (rep) return rep;
                const d = r.radio.find(q => q.id === id); return d;
            };
            if (r.rede.aplicavel) {
                ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
                r.rede.enlaces.forEach(e => {
                    const a = posNo(e.de), b = posNo(e.para);
                    if (!a || !b || a.pavId !== pavId || b.pavId !== pavId) return;
                    ctx.strokeStyle = e.margemDb >= 15 ? 'rgba(134,239,172,0.55)' : 'rgba(253,224,71,0.6)';
                    const [ax, ay] = P(a.x, a.y), [bx, by] = P(b.x, b.y);
                    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
                });
                ctx.setLineDash([]);
            }
            // dispositivos
            ctx.textAlign = 'center';
            r.dispositivos.filter(d => (d.pavimentoId || pavimentoBaseAutomacao()) === pavId).forEach(d => {
                const t = A.TIPOS[d.tipo];
                const est = r.rede.porDispositivo[d.id];
                const ok = !r.rede.aplicavel || t.dados === 'ip' || (est && est.ok);
                const [px, py] = P(d.x / esc, d.y / esc);
                ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2);
                ctx.fillStyle = t.dados === 'ip' ? '#38bdf8' : (ok ? '#34d399' : '#ef4444'); ctx.fill();
                ctx.lineWidth = 1.5; ctx.strokeStyle = '#020617'; ctx.stroke();
                ctx.fillStyle = '#020617'; ctx.font = 'bold 7px sans-serif';
                ctx.fillText(({ modulo_rele: 'M', interruptor: 'I', dimmer: 'D', tomada: 'T', controle_ir: 'IR', rele_potencia: 'R', sensor_presenca: 'P', sensor_abertura: 'A', sensor_fumaca: 'F', sensor_gas: 'G', sensor_vazamento: 'V', fechadura: 'L', camera: 'C', videoporteiro: 'VP', cortina: 'CT', modulo_portao: 'PT', sirene: 'S' })[d.tipo] || '•', px, py + 2.5);
                if (!ok) { ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.stroke(); }
            });
            // hub (rack) e repetidores
            const estrela = (x, y, raio, cor) => {
                ctx.beginPath();
                for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? raio * 0.45 : raio; ctx.lineTo(x + rr * Math.cos(ang), y + rr * Math.sin(ang)); }
                ctx.closePath(); ctx.fillStyle = cor; ctx.fill(); ctx.strokeStyle = '#020617'; ctx.lineWidth = 1.5; ctx.stroke();
            };
            if (r.hub && r.hub.pavId === pavId) { const [hx, hy] = P(r.hub.x, r.hub.y); estrela(hx, hy, 11, '#a78bfa'); }
            r.repetidores.forEach(q => {
                if (q.pavId !== pavId) return;
                const [rx, ry] = P(q.x, q.y);
                ctx.beginPath(); ctx.moveTo(rx, ry - 9); ctx.lineTo(rx + 9, ry); ctx.lineTo(rx, ry + 9); ctx.lineTo(rx - 9, ry); ctx.closePath();
                ctx.fillStyle = '#7dd3fc'; ctx.fill(); ctx.strokeStyle = '#020617'; ctx.stroke();
            });
            // nomes dos cômodos por cima de tudo, numa etiqueta no canto do cômodo
            ctx.textAlign = 'left';
            ctx.font = `bold ${Math.max(9, Math.min(12, k * 0.3))}px sans-serif`;
            salas.forEach(s => {
                const [a, b] = P(s.x0, s.y0);
                const nome = nomeComodoAutomacao(s.id);
                const tw = ctx.measureText(nome).width;
                ctx.fillStyle = 'rgba(2,6,23,0.78)';
                ctx.fillRect(a + 3, b + 3, tw + 8, 15);
                ctx.fillStyle = '#e2e8f0';
                ctx.fillText(nome, a + 7, b + 14);
            });
            ctx.fillStyle = 'rgba(148,163,184,0.85)'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
            ctx.fillText(`${r.tec.nome} • ${camadaCalor && r.rede.aplicavel ? 'mapa de calor estimado' : 'planta de automação'} • ${((state.pavimentos || []).find(p => p.id === pavId) || {}).nome || ''}`, 8, H - 8);

            if (!cv._autClique) {
                cv._autClique = true;
                cv.addEventListener('click', ev => {
                    const rr = calcularAutomacao();
                    if (rr.cabeada || !cv._aut) return;
                    const b = cv.getBoundingClientRect();
                    const x = ((ev.clientX - b.left) - cv._aut.ox) / cv._aut.k, y = ((ev.clientY - b.top) - cv._aut.oy) / cv._aut.k;
                    const cfg = obterConfigAutomacao();
                    cfg.hub = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, pavId: cv._aut.pavId };
                    cfg.repetidores = null;
                    aplicarMudancaAutomacao(true);
                });
            }
        }

        // ---------- 5. Painel ----------
        function secaoPainelAutomacao(r) {
            const A = Automacao;
            const cfg = r.cfg;
            const p = r.painel;
            const tabelaItens = p.itens.map(i => `<tr><td class="p-2 text-white">${escHtml(i.nome)}</td><td class="p-2 text-center font-mono">${fmtAut(i.qtd, i.unidade === 'm' ? 1 : 0)}${i.unidade === 'm' ? ' m' : ''}</td><td class="p-2 text-center font-mono">${i.modulos ? i.modulos : '—'}</td><td class="p-2 text-center font-mono text-violet-300">${i.modulos ? i.qtd * i.modulos : '—'}</td></tr>`).join('');
            const tabelaCanais = p.canais.map(c => `<tr class="${c.reserva ? 'text-slate-500' : ''}"><td class="p-1.5">${escHtml(c.atuador)}</td><td class="p-1.5 text-center font-mono">${escHtml(c.canal)}</td><td class="p-1.5">${escHtml(c.funcao)}</td><td class="p-1.5 text-center font-mono text-amber-300">${c.circuito ? 'C' + c.circuito : '—'}</td></tr>`).join('');
            const controles = `
                <div class="flex flex-wrap gap-2 text-[11px] items-center">
                    <label class="text-slate-400">Local:
                        <select onchange="alterarAutomacao('painelModo', this.value)" class="ml-1 bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5">
                            <option value="auto" ${cfg.painel.modo === 'auto' ? 'selected' : ''}>Automático</option><option value="integrado" ${cfg.painel.modo === 'integrado' ? 'selected' : ''}>Integrado ao QDC</option><option value="separado" ${cfg.painel.modo === 'separado' ? 'selected' : ''}>Quadro de automação separado</option>
                        </select></label>
                    ${p.cabeado ? `<label class="text-slate-400">Lâmpadas dimerizáveis:
                        <select onchange="alterarAutomacao('tipoLampada', this.value)" class="ml-1 bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5">${Object.entries(A.TIPOS_LAMPADA).map(([k, t]) => `<option value="${k}" ${cfg.painel.tipoLampada === k ? 'selected' : ''}>${escHtml(t.nome)}</option>`).join('')}</select></label>` : ''}
                </div>`;
            const decisao = `<p class="text-[12px] text-slate-200 bg-slate-950/60 border border-slate-800 rounded-xl p-3"><i class="fa-solid fa-diagram-project text-violet-400"></i> <strong>${r.localPainel.local === 'integrado' ? 'Painel integrado ao QDC' : 'Quadro de automação separado'}.</strong> ${escHtml(r.localPainel.justificativa)}</p>`;
            if (!p.cabeado && !p.itens.length) {
                return cardAut('6. Painel de automação', 'fa-table-cells', controles + decisao + `<p class="text-[12px] text-slate-400">Com ${escHtml(r.tec.nome)} não há painel: módulos, sensores e tomadas inteligentes ficam nas caixas dos pontos. O painel com atuadores, fonte do barramento e entradas aparece quando a tecnologia é cabeada (KNX, RS-485 ou relés).</p>`);
            }
            const resumo = p.cabeado ? `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5"><span class="text-slate-400">Módulos ocupados</span><span class="block text-white font-black font-mono">${p.modulosDispositivos}</span></div>
                    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5"><span class="text-slate-400">Reserva (mín. 20%)</span><span class="block text-white font-black font-mono">${p.modulosReserva}</span></div>
                    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5"><span class="text-slate-400">Caixa comercial</span><span class="block text-white font-black font-mono">${p.caixa.modulos} módulos (${p.caixa.fileiras} fileiras)</span></div>
                    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5"><span class="text-slate-400">Cabo do barramento</span><span class="block text-white font-black font-mono">${r.barramento ? r.barramento.metros + ' m' : '—'}</span></div>
                </div>
                ${p.fonte ? `<p class="text-[11px] text-slate-400">Fonte 24 Vcc: consumo ${fmtAut(p.fonte.consumoW, 1)} W × 1,25 = ${fmtAut(p.fonte.necessariaW, 1)} W → <strong class="text-white">${p.fonte.potenciaW} W</strong>.${p.linhasKnx ? ` KNX: ${p.dispositivosBarramento} aparelhos no barramento em ${p.linhasKnx} linha(s), ~${p.consumoBusMa} mA (fonte de 640 mA por linha${p.linhasKnx > 1 ? ' e acopladores de linha' : ''}).` : ''}</p>` : (p.linhasKnx ? `<p class="text-[11px] text-slate-400">KNX: ${p.dispositivosBarramento} aparelhos no barramento em ${p.linhasKnx} linha(s), ~${p.consumoBusMa} mA.</p>` : '')}
                ${(p.alertas || []).map(a => `<p class="text-[11px] text-amber-300"><i class="fa-solid fa-triangle-exclamation"></i> ${escHtml(a)}</p>`).join('')}` : '';
            const corpo = `${controles}${decisao}${resumo}
                <div class="overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl p-3"><div id="painelAutomacaoDesenho" class="min-w-max"></div></div>
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div class="overflow-x-auto rounded-xl border border-slate-800"><table class="w-full text-[11px] text-slate-300"><thead class="bg-slate-950 text-[10px] uppercase text-slate-400"><tr><th class="p-2 text-left">Composição</th><th class="p-2">Qtd</th><th class="p-2">Mód. cada</th><th class="p-2">Mód. total</th></tr></thead><tbody class="divide-y divide-slate-800">${tabelaItens}</tbody></table></div>
                    <div class="overflow-x-auto rounded-xl border border-slate-800 max-h-96"><table class="w-full text-[11px] text-slate-300"><thead class="bg-slate-950 text-[10px] uppercase text-slate-400 sticky top-0"><tr><th class="p-1.5 text-left">Atuador</th><th class="p-1.5">Canal</th><th class="p-1.5 text-left">Carga / ponto da planta</th><th class="p-1.5">Circuito</th></tr></thead><tbody class="divide-y divide-slate-800">${tabelaCanais || '<tr><td colspan="4" class="p-2 text-slate-500">Sem canais.</td></tr>'}</tbody></table></div>
                </div>`;
            return cardAut('6. Painel de automação', 'fa-table-cells', corpo);
        }

        /** Desenho do painel com os mesmos trilhos DIN e dispositivos do desenho do quadro. */
        function desenharPainelAutomacao(r) {
            const alvo = document.getElementById('painelAutomacaoDesenho');
            if (!alvo || typeof criarElementoDispositivoReal !== 'function') return;
            const A = Automacao;
            const itens = A.itensDinDoPainel(r.painel);
            if (!itens.length) { alvo.innerHTML = ''; return; }
            const modOcup = itens.reduce((s, i) => s + i.polos, 0);
            const caixa = r.painel.cabeado ? r.painel.caixa : A.caixaComercial(modOcup);
            const fileiras = A.distribuirEmFileiras(itens, 12);
            while (fileiras.length < caixa.fileiras) fileiras.push([]);
            const MOD = (typeof QDT_MOD_PX !== 'undefined') ? QDT_MOD_PX : 48;
            const ALT = (typeof QDT_DEV_H !== 'undefined') ? QDT_DEV_H : 150;
            const titulo = r.painel.cabeado ? `${r.localPainel.local === 'integrado' ? 'Fileira(s) de automação no QDC' : 'Quadro de automação'} • caixa de ${caixa.modulos} módulos` : 'Módulos DIN da automação no QDC';
            const wrap = document.createElement('div');
            wrap.className = 'relative mx-auto';
            wrap.innerHTML = `<div class="text-[10px] font-mono text-violet-300 font-bold mb-1">${escHtml(titulo)}</div>`;
            const caixaEl = document.createElement('div');
            caixaEl.className = 'border-4 border-slate-700 rounded-lg bg-slate-900/80 p-2';
            caixaEl.style.width = (MOD * 12 + 28) + 'px';
            const canal = txt => { const e = document.createElement('div'); e.className = 'canaleta-ranhurada-h w-full flex items-center justify-center text-[8px] font-mono text-slate-500/80'; e.style.height = '24px'; e.textContent = txt || ''; return e; };
            caixaEl.appendChild(canal(r.painel.cabeado ? 'Canaleta • cabos de força e barramento em lados separados' : 'Canaleta superior'));
            fileiras.forEach((lin, k) => {
                const corpo = document.createElement('div');
                corpo.className = 'relative bg-slate-900/70 rounded-sm mx-auto';
                corpo.style.width = (MOD * 12) + 'px';
                corpo.style.height = (ALT + 22) + 'px';
                corpo.style.paddingTop = '16px';
                const perfil = document.createElement('div');
                perfil.className = 'trilho-omega-din absolute left-0 right-0';
                perfil.style.height = '34px';
                perfil.style.top = (16 + ALT / 2 - 17) + 'px';
                corpo.appendChild(perfil);
                const linha = document.createElement('div');
                linha.className = 'relative flex items-start';
                linha.style.zIndex = '2';
                let ocup = 0;
                lin.forEach(it => { linha.appendChild(criarElementoDispositivoReal(it, {})); ocup += it.polos; });
                for (let s = ocup; s < 12; s++) linha.appendChild(criarElementoDispositivoReal({ id: `aut_res_${k}_${s}`, tipo: 'reserva', polos: 1 }, {}));
                corpo.appendChild(linha);
                caixaEl.appendChild(corpo);
                caixaEl.appendChild(canal(k < fileiras.length - 1 ? '' : 'Saída para os pontos (força) • barramento em eletroduto próprio'));
            });
            wrap.appendChild(caixaEl);
            alvo.innerHTML = '';
            alvo.appendChild(wrap);
        }

        // ---------- 6. Nobreak ----------
        function secaoNobreakAutomacao(r) {
            const cfg = r.cfg;
            const opc = `
                <div class="flex flex-wrap gap-2 text-[12px]">
                    <label class="flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer ${!cfg.nobreak.exigido ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-slate-700 text-slate-300'}"><input type="radio" name="radNobreakAut" ${!cfg.nobreak.exigido ? 'checked' : ''} onchange="alterarAutomacao('nobreakExigido', false)" class="accent-violet-500"> Não exigido <span class="text-[10px] text-slate-400">(padrão)</span></label>
                    <label class="flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer ${cfg.nobreak.exigido ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-slate-700 text-slate-300'}"><input type="radio" name="radNobreakAut" ${cfg.nobreak.exigido ? 'checked' : ''} onchange="alterarAutomacao('nobreakExigido', true)" class="accent-violet-500"> Exigido pela especificação</label>
                </div>`;
            if (!cfg.nobreak.exigido) {
                return cardAut('7. Nobreak', 'fa-car-battery', opc + '<p class="text-[12px] text-slate-400">Sem nobreak: ele não entra no orçamento, no memorial nem no quadro.</p>');
            }
            const nb = r.nobreak;
            const cargas = r.cargasNobreak.map(c => `<label class="flex items-center justify-between gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px]"><span class="flex items-center gap-2"><input type="checkbox" ${c.selecionada ? 'checked' : ''} onchange="alternarCargaNobreak('${c.id}', this.checked)" class="accent-violet-500">${escHtml(c.nome)}</span><span class="font-mono text-slate-300">${c.potW} W</span></label>`).join('');
            const corpo = `${opc}
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <p class="text-[11px] text-slate-400">Cargas protegidas:</p>
                        <div class="space-y-1.5">${cargas}</div>
                        <div class="flex flex-wrap gap-2 text-[11px]">
                            <label class="text-slate-400">Autonomia (min): <input type="number" min="5" max="600" step="5" value="${cfg.nobreak.autonomiaMin}" onchange="alterarAutomacao('nobreakAutonomia', this.value)" class="ml-1 w-20 bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5 font-mono"></label>
                            <label class="text-slate-400">Tipo: <select onchange="alterarAutomacao('nobreakTipo', this.value)" class="ml-1 bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5"><option value="interativo" ${cfg.nobreak.tipo !== 'online' ? 'selected' : ''}>Interativo (FP 0,6)</option><option value="online" ${cfg.nobreak.tipo === 'online' ? 'selected' : ''}>Online senoidal (FP 0,9)</option></select></label>
                        </div>
                    </div>
                    <div class="space-y-2 text-[12px] text-slate-200">
                        <div class="grid grid-cols-2 gap-2 text-[11px]">
                            <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5"><span class="text-slate-400">Nobreak</span><span class="block text-white font-black font-mono">${nb.va} VA / ${nb.wNominal} W</span></div>
                            <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5"><span class="text-slate-400">Banco de baterias</span><span class="block text-white font-black font-mono">${nb.banco.total} × 12 V ${nb.banco.ah} Ah (${nb.banco.tensaoV} V)</span></div>
                            <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 col-span-2"><span class="text-slate-400">Circuito dedicado no QDC</span><span class="block text-white font-bold">${nb.circuito.potVA} VA em ${nb.circuito.tensao} V — Ib ${fmtAut(nb.circuito.ib, 1)} A ${state.automacao.incluirNoProjeto ? '(disjuntor e cabo na tabela de circuitos)' : '(entra no quadro ao incluir a automação no projeto)'}</span></div>
                        </div>
                        <p class="text-[11px] text-slate-300">${escHtml(nb.justificativa)}</p>
                        ${nb.alternativaDC ? `<p class="text-[11px] text-sky-300"><i class="fa-solid fa-lightbulb"></i> Alternativa: ${escHtml(nb.alternativaDC.texto)}</p>` : ''}
                        ${(nb.alertas || []).map(a => `<p class="text-[11px] text-amber-300">${escHtml(a)}</p>`).join('')}
                    </div>
                </div>`;
            return cardAut('7. Nobreak', 'fa-car-battery', corpo);
        }

        // ---------- 7. Orçamento ----------
        function secaoOrcamentoAutomacao(r, totalMat) {
            const linhas = r.materiais.map(it => {
                const preco = precoItemAutomacao(it);
                const qtd = it.qtd * (1 + (it.margem || 0));
                return `<tr><td class="p-2 text-white">${escHtml(it.item)}<span class="block text-[10px] text-slate-500">${escHtml(it.especificacao || '')}</span></td><td class="p-2 text-center font-mono">${fmtAut(it.unidade === 'm' ? Math.ceil(qtd) : it.qtd, 0)} ${escHtml(it.unidade)}</td><td class="p-2 text-right font-mono">${reaisAut(preco)}</td><td class="p-2 text-right font-mono text-emerald-300">${reaisAut(preco * (it.unidade === 'm' ? Math.ceil(qtd) : it.qtd))}</td></tr>`;
            }).join('');
            let mo = '', totalMo = 0;
            if (typeof MaoDeObra !== 'undefined') {
                const cfgMo = (typeof configMaoDeObra === 'function') ? configMaoDeObra() : {};
                const tab = MaoDeObra.mesclarTabela(cfgMo.tabela);
                const q = Object.assign({ quadros: 0, incluirAterramento: false }, r.maoDeObra);
                const ls = MaoDeObra.linhasDeServico(q).filter(l => /^automacao/.test(l.id));
                totalMo = ls.reduce((s, l) => s + l.qtd * tab[l.id], 0);
                mo = ls.map(l => `<tr><td class="p-2 text-white">${escHtml(MaoDeObra.servico(l.id).nome)}</td><td class="p-2 text-center font-mono">${l.qtd} ${escHtml(MaoDeObra.servico(l.id).unidade)}</td><td class="p-2 text-right font-mono">${reaisAut(tab[l.id])}</td><td class="p-2 text-right font-mono text-emerald-300">${reaisAut(l.qtd * tab[l.id])}</td></tr>`).join('');
            }
            const corpo = `
                <p class="text-[11px] text-slate-400">Preços de referência (${Automacao.DATA_REFERENCIA}), substituídos pelos da pesquisa de preços quando houver. ${r.cfg.incluirNoProjeto ? 'Estes itens já estão no orçamento da aba Materiais (categoria Automação).' : 'Inclua a automação no projeto para lançar estes itens no orçamento da aba Materiais.'}</p>
                <div class="overflow-x-auto rounded-xl border border-slate-800"><table class="w-full text-[11px] text-slate-300 min-w-[640px]">
                    <thead class="bg-slate-950 text-[10px] uppercase text-slate-400"><tr><th class="p-2 text-left">Material</th><th class="p-2">Qtd</th><th class="p-2 text-right">Unitário</th><th class="p-2 text-right">Subtotal</th></tr></thead>
                    <tbody class="divide-y divide-slate-800">${linhas}</tbody>
                    <tfoot class="bg-slate-950"><tr><td colspan="3" class="p-2 text-right font-bold text-slate-300">Material da automação</td><td class="p-2 text-right font-mono font-black text-emerald-300">${reaisAut(totalMat)}</td></tr></tfoot>
                </table></div>
                ${mo ? `<div class="overflow-x-auto rounded-xl border border-slate-800"><table class="w-full text-[11px] text-slate-300 min-w-[640px]">
                    <thead class="bg-slate-950 text-[10px] uppercase text-slate-400"><tr><th class="p-2 text-left">Mão de obra (instalação e configuração)</th><th class="p-2">Qtd</th><th class="p-2 text-right">Unitário</th><th class="p-2 text-right">Subtotal</th></tr></thead>
                    <tbody class="divide-y divide-slate-800">${mo}</tbody>
                    <tfoot class="bg-slate-950"><tr><td colspan="3" class="p-2 text-right font-bold text-slate-300">Mão de obra da automação (modo por serviço)</td><td class="p-2 text-right font-mono font-black text-emerald-300">${reaisAut(totalMo)}</td></tr></tfoot>
                </table></div>` : ''}
                <div class="flex flex-wrap gap-2 text-[11px]">
                    <button onclick="trocarAba('materiais'); setTimeout(() => { if (typeof filtrarTabelaMateriais === 'function') filtrarTabelaMateriais('automacao'); }, 80)" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700"><i class="fa-solid fa-boxes-stacked"></i> Ver no orçamento</button>
                    <button onclick="trocarAba('materiais'); setTimeout(() => { if (typeof abrirModalPesquisaPrecosInternet === 'function') abrirModalPesquisaPrecosInternet(); }, 80)" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700"><i class="fa-solid fa-magnifying-glass-dollar"></i> Pesquisar preços</button>
                </div>`;
            return cardAut('8. Orçamento da automação', 'fa-cart-shopping', corpo);
        }

        // ---------- 8. Impacto ----------
        function secaoImpactoAutomacao(r) {
            const corpo = `<ul class="space-y-2 text-[12px] text-slate-200">${r.impacto.linhas.map(l => `<li class="flex gap-2"><i class="fa-solid fa-plug-circle-bolt text-amber-400 mt-0.5"></i><span>${escHtml(l)}</span></li>`).join('')}</ul>
                <p class="text-[11px] text-slate-400">${r.cfg.incluirNoProjeto ? 'Refletido no projeto: o neutro aparece no trecho luminária → interruptor da aba Instalações, os circuitos do rack/painel entram na tabela de circuitos e os módulos DIN no desenho do quadro.' : 'Inclua a automação no projeto para refletir estas mudanças no quadro, nos circuitos e na fiação.'}</p>`;
            return cardAut('9. Impacto na parte elétrica', 'fa-plug-circle-bolt', corpo);
        }

        // ---------- 9. Entregáveis ----------
        function secaoEntregaveisAutomacao(r) {
            const cenas = r.cenas.map(c => `<div class="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5"><h4 class="text-xs font-black text-white flex items-center gap-2"><i class="fa-solid ${c.icone} text-violet-300"></i>${escHtml(c.nome)}</h4><p class="text-[10px] text-slate-400">${escHtml(c.gatilho)}</p><ul class="text-[11px] text-slate-300 list-disc pl-4 space-y-0.5">${c.acoes.map(a => `<li>${escHtml(a)}</li>`).join('')}</ul></div>`).join('');
            const memorial = r.memorial.map(s => `<div><h4 class="text-xs font-black text-violet-200 mb-1">${escHtml(s.titulo)}</h4>${s.paragrafos.map(p => `<p class="text-[12px] text-slate-300 mb-1">${escHtml(p)}</p>`).join('')}</div>`).join('');
            const corpo = `
                <div class="flex flex-wrap gap-2 text-[11px]">
                    <button onclick="copiarMemorialAutomacao()" class="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold"><i class="fa-solid fa-copy"></i> Copiar memorial e lista</button>
                    <button onclick="imprimirAutomacao()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700"><i class="fa-solid fa-print"></i> Imprimir (memorial, lista, planta e cenas)</button>
                </div>
                <h3 class="text-xs font-black text-white">Cenas sugeridas</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">${cenas}</div>
                <h3 class="text-xs font-black text-white">Memorial de automação</h3>
                <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">${memorial}</div>`;
            return cardAut('10. Entregáveis', 'fa-file-signature', corpo);
        }

        function textoMemorialAutomacao(r) {
            let t = 'MEMORIAL DE AUTOMAÇÃO RESIDENCIAL\n\n';
            r.memorial.forEach(s => { t += s.titulo.toUpperCase() + '\n' + s.paragrafos.map(p => '  ' + p).join('\n') + '\n\n'; });
            t += 'LISTA DE DISPOSITIVOS POR CÔMODO\n';
            (state.comodos || []).forEach(c => {
                const devs = r.dispositivos.filter(d => String(d.comodoId) === String(c.id));
                if (!devs.length) return;
                t += `  ${c.nome}:\n` + devs.map(d => `    - ${Automacao.TIPOS[d.tipo].nome}${d.detalhe ? ' (' + d.detalhe + ')' : ''}`).join('\n') + '\n';
            });
            t += '\nCENAS SUGERIDAS\n' + r.cenas.map(c => `  ${c.nome}: ${c.acoes.join('; ')}`).join('\n') + '\n';
            return t;
        }

        function copiarMemorialAutomacao() {
            const txt = textoMemorialAutomacao(calcularAutomacao());
            const ok = () => mostrarNotificacaoToast('Memorial de automação copiado.', 'sucesso');
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok).catch(() => { prompt('Copie o memorial:', txt); });
            else prompt('Copie o memorial:', txt);
        }

        /** HTML da prancha de automação (memorial, lista por cômodo, planta e cenas) para impressão. */
        function htmlPranchaAutomacao(r, cabecalho) {
            // a planta de automação vem do canvas da aba (montado agora se a aba ainda não foi aberta)
            if (!document.getElementById('canvasMapaAutomacao')) renderizarAbaAutomacao();
            desenharMapaAutomacao();
            const cv = document.getElementById('canvasMapaAutomacao');
            let img = '';
            try { img = cv ? cv.toDataURL('image/png') : ''; } catch (e) { img = ''; }
            const lista = (state.comodos || []).map(c => {
                const devs = r.dispositivos.filter(d => String(d.comodoId) === String(c.id));
                if (!devs.length) return '';
                const cont = {};
                devs.forEach(d => { cont[d.tipo] = (cont[d.tipo] || 0) + 1; });
                return `<tr><td style="padding:3px 6px;border:1px solid #cbd5e1;font-weight:bold">${escHtml(c.nome)}</td><td style="padding:3px 6px;border:1px solid #cbd5e1">${Object.keys(cont).map(k => `${cont[k]} × ${escHtml(Automacao.TIPOS[k].nome)}`).join('; ')}</td></tr>`;
            }).join('');
            return `
                ${cabecalho || ''}
                ${img ? `<div style="text-align:center;margin:8px 0"><img src="${img}" style="max-width:100%;max-height:330px;border:1px solid #cbd5e1;border-radius:4px"></div>` : ''}
                <table style="width:100%;border-collapse:collapse;font-size:7.5pt;margin:6px 0"><thead><tr><th style="padding:3px 6px;border:1px solid #cbd5e1;background:#f1f5f9;text-align:left">Cômodo</th><th style="padding:3px 6px;border:1px solid #cbd5e1;background:#f1f5f9;text-align:left">Dispositivos de automação</th></tr></thead><tbody>${lista}</tbody></table>
                <div style="font-size:7.5pt;line-height:1.45;color:#1e293b">${r.memorial.map(s => `<h4 style="font-size:8.5pt;margin:6px 0 2px;color:#0f172a">${escHtml(s.titulo)}</h4>${s.paragrafos.map(p => `<p style="margin:0 0 2px">${escHtml(p)}</p>`).join('')}`).join('')}</div>`;
        }

        function imprimirAutomacao() {
            const r = calcularAutomacao();
            const w = window.open('', '_blank');
            if (!w) { mostrarNotificacaoToast('Libere as janelas pop-up para imprimir.', 'erro'); return; }
            w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Automação residencial</title></head><body style="font-family:sans-serif;margin:16px;color:#0f172a">
                ${htmlPranchaAutomacao(r, `<h1 style="font-size:14pt;margin:0">Automação residencial — ${escHtml((state.projetoAtual && state.projetoAtual.nome) || '')}</h1><p style="font-size:8pt;color:#475569;margin:2px 0 8px">${escHtml(r.tec.nome)} • nível ${escHtml(Automacao.NIVEIS[r.cfg.nivel])} • ${r.dispositivos.length} dispositivos</p>`)}
                <h3 style="font-size:9pt">Cenas sugeridas</h3><ul style="font-size:7.5pt">${r.cenas.map(c => `<li><strong>${escHtml(c.nome)}</strong>: ${escHtml(c.acoes.join('; '))}</li>`).join('')}</ul>
                <script>window.onload = () => window.print();<\/script></body></html>`);
            w.document.close();
        }

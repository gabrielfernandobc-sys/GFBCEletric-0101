/* PRO-ELÉTRICA CAD — 15-unifilar-desenho.js
   Desenho do diagrama unifilar (NBR 5444) na aba Instalações: eletrodutos em
   linha única e curva, traços dos condutores com o número do circuito em cada
   trecho, e simbologia dos pontos (luminária, interruptor, tomadas, quadro).
   Regras (circuito de cada ponto, condutores por trecho) em js/unifilar.js.
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */

        function usarDiagramaUnifilar() {
            return state.estiloInstalacoes !== 'colorido';
        }

        function alternarEstiloInstalacoes() {
            state.estiloInstalacoes = usarDiagramaUnifilar() ? 'colorido' : 'unifilar';
            atualizarControlesEstiloInstalacoes();
            desenharInstalacoes();
            mostrarNotificacaoToast(usarDiagramaUnifilar() ? 'Diagrama unifilar (NBR 5444)' : 'Representação colorida por tipo de circuito', 'info');
        }

        function atualizarControlesEstiloInstalacoes() {
            const uni = usarDiagramaUnifilar();
            const lbl = document.getElementById('lblEstiloInstalacoes');
            if (lbl) lbl.textContent = uni ? 'Unifilar NBR 5444' : 'Colorido';
            document.getElementById('legendaUnifilar')?.classList.toggle('hidden', !uni);
            document.getElementById('legendaSimbolosColorido')?.classList.toggle('hidden', uni);
        }

        function paletaUnifilar() {
            const claro = document.body.classList.contains('theme-woca-light');
            return claro
                ? { linha: '#0f172a', texto: '#0f172a', suave: '#475569', fundo: '#ffffff', destaque: '#0369a1', piso: '#c2410c' }
                : { linha: '#e2e8f0', texto: '#f8fafc', suave: '#94a3b8', fundo: '#0f172a', destaque: '#38bdf8', piso: '#fb923c' };
        }

        /** Curva com sentido independente da ordem das pontas (desenho e mouse usam a mesma). */
        function curvaUnifilar(a, b) {
            const inverter = (a.x > b.x) || (a.x === b.x && a.y > b.y);
            return inverter ? Unifilar.curva(b, a, 1) : Unifilar.curva(a, b, 1);
        }

        function pontosTrechoUnifilar(de, para, via) {
            if (via && via.length) return [de, ...via, para];
            const c = curvaUnifilar(de, para);
            const pts = [];
            for (let i = 0; i <= 14; i++) { const q = Unifilar.pontoNaCurva(de, c, para, i / 14); pts.push({ x: q.x, y: q.y }); }
            return pts;
        }

        /** Para o destaque do mouse: cabos de 2 pontos viram a curva desenhada. */
        function ajustarCaboParaUnifilar(cabo) {
            if (!cabo || !usarDiagramaUnifilar() || typeof Unifilar === 'undefined' || !cabo.pts || cabo.pts.length !== 2) return cabo;
            return Object.assign({}, cabo, { pts: pontosTrechoUnifilar(cabo.pts[0], cabo.pts[1]) });
        }

        // ------------------------------------------------------------------
        // Traços dos condutores (NBR 5444): neutro = traço simples; fase = traço
        // com bandeira; retorno = meio traço; proteção = traço com barra (T)
        // ------------------------------------------------------------------
        function desenharCondutoresUnifilar(ctx, pos, condutores, cor, escalaV) {
            if (!condutores || !condutores.length) return;
            const passo = 5 * escalaV, meio = 6 * escalaV;
            const nx = -pos.ty, ny = pos.tx;                       // normal à linha
            // traço levemente inclinado, como no desenho à mão
            const dx = nx * 0.9 + pos.tx * 0.45, dy = ny * 0.9 + pos.ty * 0.45;
            const n = condutores.length;
            ctx.save();
            ctx.strokeStyle = cor;
            ctx.lineWidth = 1.3 * escalaV;
            ctx.lineCap = 'round';
            condutores.forEach((c, i) => {
                const k = (i - (n - 1) / 2) * passo;
                const cx = pos.x + pos.tx * k, cy = pos.y + pos.ty * k;
                const topoX = cx + dx * meio, topoY = cy + dy * meio;
                ctx.beginPath();
                if (c.tipo === 'R') { ctx.moveTo(cx, cy); ctx.lineTo(topoX, topoY); }
                else { ctx.moveTo(cx - dx * meio, cy - dy * meio); ctx.lineTo(topoX, topoY); }
                if (c.tipo === 'F') { ctx.moveTo(topoX, topoY); ctx.lineTo(topoX + pos.tx * 3.5 * escalaV, topoY + pos.ty * 3.5 * escalaV); }
                if (c.tipo === 'T') { ctx.moveTo(topoX - pos.tx * 2.5 * escalaV, topoY - pos.ty * 2.5 * escalaV); ctx.lineTo(topoX + pos.tx * 2.5 * escalaV, topoY + pos.ty * 2.5 * escalaV); }
                ctx.stroke();
            });
            // número(s) do(s) circuito(s) e letra(s) de comando do retorno
            const circs = Unifilar.rotuloCircuitos(condutores);
            const letras = [...new Set(condutores.filter(c => c.tipo === 'R' && c.letra).map(c => c.letra))].join(',');
            const texto = [circs, letras].filter(Boolean).join(' ');
            if (texto) {
                ctx.fillStyle = cor;
                ctx.font = `bold ${Math.round(8.5 * escalaV)}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(texto, pos.x + nx * 15 * escalaV, pos.y + ny * 15 * escalaV);
            }
            ctx.restore();
        }

        function desenharTrechoUnifilar(ctx, tr, pal, ehPiso, status, escalaV, mostrarAlcas) {
            if (!status.visivel) return;
            ctx.save();
            ctx.globalAlpha = status.opacidade;
            const cor = status.destacado ? pal.destaque : (ehPiso ? pal.piso : pal.linha);
            ctx.strokeStyle = cor;
            ctx.lineWidth = (status.destacado ? 2.6 : 1.5) * escalaV;
            ctx.setLineDash(ehPiso ? [7, 4] : []);             // piso: tracejado; teto/parede: contínuo
            let meio;
            ctx.beginPath();
            if (tr.via && tr.via.length) {
                const pts = [tr.de, ...tr.via, tr.para];
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
                // traços no meio do trecho mais longo
                let melhor = 0, iMelhor = 0;
                for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y); if (d > melhor) { melhor = d; iMelhor = i; } }
                const a = pts[iMelhor], b = pts[iMelhor + 1], d = melhor || 1;
                meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, tx: (b.x - a.x) / d, ty: (b.y - a.y) / d };
            } else {
                const c = curvaUnifilar(tr.de, tr.para);
                ctx.moveTo(tr.de.x, tr.de.y);
                ctx.quadraticCurveTo(c.x, c.y, tr.para.x, tr.para.y);
                meio = Unifilar.pontoNaCurva(tr.de, c, tr.para, 0.5);
            }
            ctx.stroke();
            ctx.setLineDash([]);
            if (Math.hypot(tr.para.x - tr.de.x, tr.para.y - tr.de.y) > 28) {
                desenharCondutoresUnifilar(ctx, meio, tr.condutores, cor, escalaV);
            }
            if (mostrarAlcas && tr.via) {
                tr.via.forEach(wp => {
                    ctx.beginPath();
                    ctx.arc(wp.x, wp.y, 6, 0, 2 * Math.PI);
                    ctx.fillStyle = pal.destaque;
                    ctx.fill();
                    ctx.strokeStyle = pal.fundo;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                });
            }
            ctx.restore();
        }

        // ------------------------------------------------------------------
        // Símbolos dos pontos
        // ------------------------------------------------------------------
        function desenharLuminariaUnifilar(ctx, x, y, pot, circ, letra, pal, escalaV, selecionado) {
            const r = 11 * escalaV;
            ctx.save();
            if (selecionado) {
                ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(245, 158, 11, 0.35)'; ctx.fill();
            }
            ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fillStyle = pal.fundo; ctx.fill();
            ctx.strokeStyle = pal.linha; ctx.lineWidth = 1.5 * escalaV; ctx.stroke();
            // divisões: potência em cima; circuito à esquerda e comando à direita embaixo
            ctx.beginPath();
            ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
            ctx.moveTo(x, y); ctx.lineTo(x, y + r);
            ctx.lineWidth = 1 * escalaV; ctx.stroke();
            ctx.fillStyle = pal.texto;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = `bold ${Math.round(6.5 * escalaV)}px monospace`;
            ctx.fillText(String(pot), x, y - r * 0.45);
            ctx.font = `bold ${Math.round(7 * escalaV)}px monospace`;
            ctx.fillText(circ != null ? String(circ) : '–', x - r * 0.45, y + r * 0.5);
            ctx.fillText(letra || '', x + r * 0.45, y + r * 0.5);
            ctx.restore();
        }

        function desenharInterruptorUnifilar(ctx, pt, letra, pal, escalaV, selecionado) {
            const r = 4.2 * escalaV;
            ctx.save();
            if (selecionado) { ctx.beginPath(); ctx.arc(pt.x, pt.y, r + 6, 0, 2 * Math.PI); ctx.fillStyle = 'rgba(245, 158, 11, 0.35)'; ctx.fill(); }
            ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = pal.linha; ctx.fill();
            if (Unifilar.ehThreeWay(pt)) {                     // paralelo (three-way): anel externo
                ctx.beginPath(); ctx.arc(pt.x, pt.y, r + 3 * escalaV, 0, 2 * Math.PI);
                ctx.strokeStyle = pal.linha; ctx.lineWidth = 1.1 * escalaV; ctx.stroke();
            }
            ctx.fillStyle = pal.texto;
            ctx.font = `bold ${Math.round(9 * escalaV)}px monospace`;
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(letra, pt.x + r + 4 * escalaV, pt.y);
            ctx.restore();
        }

        function desenharTomadaUnifilar(ctx, pt, circ, pal, escalaV, selecionado, mostrarRotulo, alvo) {
            const s = 8 * escalaV;
            // triângulo apontando para dentro do cômodo (para a luminária)
            const ang = Math.atan2(alvo.y - pt.y, alvo.x - pt.x);
            const v = (a, d) => ({ x: pt.x + Math.cos(ang + a) * d, y: pt.y + Math.sin(ang + a) * d });
            const p1 = v(0, s), p2 = v(2.3, s * 0.8), p3 = v(-2.3, s * 0.8);
            ctx.save();
            if (selecionado) { ctx.beginPath(); ctx.arc(pt.x, pt.y, s + 5, 0, 2 * Math.PI); ctx.fillStyle = 'rgba(245, 158, 11, 0.35)'; ctx.fill(); }
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath();
            ctx.fillStyle = pal.fundo; ctx.fill();
            ctx.strokeStyle = pal.linha; ctx.lineWidth = 1.4 * escalaV; ctx.stroke();
            const ehTue = pt.tipo === 'TUE';
            // baixa: vazado; média: metade preenchida; alta e TUE: cheio (NBR 5444)
            if (ehTue || pt.altura === 'alta') {
                ctx.fillStyle = pal.linha; ctx.fill();
            } else if (pt.altura !== 'baixa') {
                const m = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(m.x, m.y); ctx.closePath();
                ctx.fillStyle = pal.linha; ctx.fill();
            }
            ctx.fillStyle = pal.texto;
            ctx.font = `bold ${Math.round(8.5 * escalaV)}px monospace`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const tx = pt.x - Math.cos(ang) * (s + 7 * escalaV), ty = pt.y - Math.sin(ang) * (s + 7 * escalaV);
            ctx.fillText(circ != null ? String(circ) : '', tx, ty);
            if (ehTue || mostrarRotulo) {
                ctx.font = `${Math.round(7.5 * escalaV)}px monospace`;
                ctx.fillStyle = pal.suave;
                ctx.fillText(ehTue ? `${pt.pot}W` : `${pt.pot}VA`, tx, ty + 10 * escalaV);
            }
            ctx.restore();
        }

        function desenharQuadroUnifilar(ctx, q, rotulo, pal) {
            ctx.save();
            ctx.fillStyle = pal.fundo;
            ctx.fillRect(q.x, q.y, q.w, q.h);
            ctx.beginPath();                                   // metade preenchida (quadro de distribuição)
            ctx.moveTo(q.x, q.y + q.h); ctx.lineTo(q.x + q.w, q.y); ctx.lineTo(q.x + q.w, q.y + q.h); ctx.closePath();
            ctx.fillStyle = pal.linha; ctx.fill();
            ctx.strokeStyle = pal.linha; ctx.lineWidth = 2;
            ctx.strokeRect(q.x, q.y, q.w, q.h);
            ctx.fillStyle = pal.texto;
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
            ctx.fillText(rotulo, q.x, q.y - 3);
            ctx.restore();
        }

        /** Desenha a fiação do andar como diagrama unifilar. */
        function desenharUnifilarInstalacoes(ctx, comodosAndar, ehPassagemChao) {
            const pal = paletaUnifilar();
            const escalaV = Math.min(1.4, Math.max(0.8, (state.escala || 35) / 35));
            const mapa = state.unifilar || { ilumPorComodo: {}, porPonto: {}, polos: {} };
            // interruptores inteligentes (automação incluída no projeto) recebem neutro
            const neutroInterruptores = (typeof idsInterruptoresComNeutro === 'function') ? idsInterruptoresComNeutro() : new Set();
            const quadro = { x: state.qdtPos.x + state.qdtPos.w / 2, y: state.qdtPos.y + state.qdtPos.h / 2 };
            const status = (chave, idx) => (typeof obterStatusVisibilidadeCircuito === 'function')
                ? obterStatusVisibilidadeCircuito(chave, idx) : { visivel: true, destacado: false, opacidade: 1 };
            const chaveStatus = { principal: null, tug: 'tugs', tue: 'tues', interruptor: 'ilum', ilum: 'ilum' };
            const simbolos = [];

            comodosAndar.forEach((c, idx) => {
                const w = c.largura * state.escala, h = c.comprimento * state.escala;
                const luzCentro = { x: c.x + w / 2, y: c.y + h / 2 };
                const pontos = state.pontosEletricos.filter(pt => pt.comodoId === c.id);
                const ilumCentral = pontos.find(pt => pt.tipo === 'ILUM' && Math.hypot(pt.x - luzCentro.x, pt.y - luzCentro.y) <= 10);
                const letraComodo = (pontos.find(pt => pt.tipo === 'INTERRUPTOR' && pt.comando) || {}).comando || String.fromCharCode(97 + (idx % 26));
                const circIlum = mapa.ilumPorComodo[c.id];
                const trechos = Unifilar.montarTrechosComodo({
                    luz: luzCentro, quadro,
                    rotaQuadro: state.eletrodutoWaypoints[idx + 1] || [],
                    pontos, letra: letraComodo, circIlum,
                    circPorPonto: mapa.porPonto, polosPorCircuito: mapa.polos,
                    encadearTugs: c.passagemTomadas === 'horizontal' || (!c.passagemTomadas && pontos.filter(pt => pt.tipo === 'TUG').length > 1),
                    interruptoresComNeutro: neutroInterruptores
                });
                trechos.forEach(tr => {
                    const st = tr.tipo === 'principal' ? status(`comodo_${idx + 1}`, idx) : status(chaveStatus[tr.tipo], idx);
                    desenharTrechoUnifilar(ctx, tr, pal, ehPassagemChao, st, escalaV, tr.tipo === 'principal' && state.ferramentaInstalacoes === 'curvas_eletroduto');
                });

                // luminária principal (do ponto de luz central ou do cômodo)
                simbolos.push(() => desenharLuminariaUnifilar(ctx, luzCentro.x, luzCentro.y,
                    ilumCentral ? (ilumCentral.pot || 100) : (c.potIlum || 100), circIlum, letraComodo, pal, escalaV,
                    !!ilumCentral && state.pontoSelecionadoId === ilumCentral.id));
                pontos.forEach(pt => {
                    const sel = state.pontoSelecionadoId === pt.id;
                    if (pt === ilumCentral) return;
                    if (pt.tipo === 'ILUM') simbolos.push(() => desenharLuminariaUnifilar(ctx, pt.x, pt.y, pt.pot || 100, circIlum, pt.comando || letraComodo, pal, escalaV * 0.85, sel));
                    else if (pt.tipo === 'INTERRUPTOR') simbolos.push(() => desenharInterruptorUnifilar(ctx, pt, pt.comando || letraComodo, pal, escalaV, sel));
                    else simbolos.push(() => desenharTomadaUnifilar(ctx, pt, mapa.porPonto[pt.id], pal, escalaV, sel, state.exibirRotulosInstalacoes, luzCentro));
                });
            });
            // pontos do andar que não pertencem a nenhum cômodo
            const idsComodos = new Set(comodosAndar.map(c => c.id));
            state.pontosEletricos.filter(pt => pt.pavimentoId === state.pavimentoAtivoId && !idsComodos.has(pt.comodoId)).forEach(pt => {
                const sel = state.pontoSelecionadoId === pt.id;
                if (pt.tipo === 'ILUM') simbolos.push(() => desenharLuminariaUnifilar(ctx, pt.x, pt.y, pt.pot || 100, null, pt.comando || '', pal, escalaV * 0.85, sel));
                else if (pt.tipo === 'INTERRUPTOR') simbolos.push(() => desenharInterruptorUnifilar(ctx, pt, pt.comando || '', pal, escalaV, sel));
                else simbolos.push(() => desenharTomadaUnifilar(ctx, pt, mapa.porPonto[pt.id], pal, escalaV, sel, state.exibirRotulosInstalacoes, { x: pt.x, y: pt.y - 1 }));
            });
            simbolos.forEach(f => f());
            desenharQuadroUnifilar(ctx, state.qdtPos, state.pavimentoAtivoId === 'terreo' ? 'QD' : 'QD-P', pal);
        }

        document.addEventListener('DOMContentLoaded', atualizarControlesEstiloInstalacoes);

        // Celular/tablet: ao abrir, enquadra o projeto na tela se ele não couber
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (window.innerWidth >= 1024 || typeof escalaParaCaberNaTela !== 'function') return;
                const caber = escalaParaCaberNaTela('cadCanvas');
                if (caber && caber < (state.escala || 35) * 0.98) resetarZoomCad();
            }, 350);
        });

/* PRO-ELÉTRICA CAD — 14-pesquisa-internet.js
   Pesquisa de preços dos materiais na internet: busca automática no Mercado
   Livre (pelo servidor local) e links de busca nas lojas; aplica os valores
   escolhidos ao orçamento. Regras de cálculo em js/pesquisa-precos.js.
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        const _pesquisaInternet = { grupos: [], resultados: {}, buscando: false, cancelar: false };

        function formatarReais(v) {
            return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function unidadePrecoGrupo(g) {
            return (g.tipo === 'unidade') ? (g.unidade || 'un') : 'm';
        }

        /** Abre o modal. `chaveFoco` (opcional) mostra só um item e já pesquisa. */
        function abrirPesquisaInternet(chaveFoco) {
            if (typeof PesquisaPrecos === 'undefined') { mostrarNotificacaoToast('Módulo de pesquisa não carregado.', 'erro'); return; }
            const materiais = state.quantitativoMateriaisDetalhado || [];
            if (!materiais.length) recalcularOrcamentoComPrecos();
            _pesquisaInternet.grupos = PesquisaPrecos.agruparMateriais(state.quantitativoMateriaisDetalhado || []);
            const modal = document.getElementById('modalPesquisaInternet');
            if (!modal) return;
            const filtro = document.getElementById('inputFiltroPesquisaInternet');
            let foco = null;
            if (chaveFoco) {
                foco = _pesquisaInternet.grupos.find(g => g.chave === chaveFoco) || null;
            }
            if (filtro) filtro.value = foco ? foco.nome : '';
            modal.classList.remove('hidden');
            renderizarPesquisaInternet();
            atualizarStatusPesquisaInternet();
            if (foco && !_pesquisaInternet.resultados[foco.chave]) pesquisarGrupoInternet(foco.chave);
        }

        function fecharPesquisaInternet() {
            _pesquisaInternet.cancelar = true;
            const modal = document.getElementById('modalPesquisaInternet');
            if (modal) modal.classList.add('hidden');
        }

        /** Atalho usado pela tabela de materiais (botão "Pesquisar" de cada linha). */
        function pesquisarMaterialNaInternet(idx) {
            const m = (state.quantitativoMateriaisDetalhado || [])[idx];
            if (!m) return;
            abrirPesquisaInternet(PesquisaPrecos.chaveGrupo(m));
        }

        function pesquisarBitolaNaInternet(secao) {
            abrirPesquisaInternet('cabo:' + normalizarChaveBitola(secao));
        }

        function gruposVisiveisPesquisaInternet() {
            const termo = (document.getElementById('inputFiltroPesquisaInternet')?.value || '').trim().toLowerCase();
            if (!termo) return _pesquisaInternet.grupos;
            return _pesquisaInternet.grupos.filter(g => g.nome.toLowerCase().includes(termo) || g.consulta.toLowerCase().includes(termo));
        }

        function renderizarPesquisaInternet() {
            const lista = document.getElementById('listaPesquisaInternet');
            if (!lista) return;
            const grupos = gruposVisiveisPesquisaInternet();
            if (!grupos.length) {
                lista.innerHTML = '<p class="p-6 text-center text-slate-500 text-xs">Nenhum material encontrado.</p>';
                return;
            }
            lista.innerHTML = grupos.map(g => htmlGrupoPesquisaInternet(g)).join('');
            atualizarBotaoAplicarPesquisaInternet();
        }

        function htmlGrupoPesquisaInternet(g) {
            const idx = _pesquisaInternet.grupos.indexOf(g);
            const r = _pesquisaInternet.resultados[g.chave] || {};
            const un = unidadePrecoGrupo(g);
            const links = PesquisaPrecos.linksDeBusca(g.consulta).map(l => `
                <a href="${escHtml(l.url)}" target="_blank" rel="noopener noreferrer" title="Pesquisar em ${escHtml(l.nome)}"
                   class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300 hover:text-white transition">
                    <i class="${l.marca ? 'fa-brands' : 'fa-solid'} ${escHtml(l.icone)}"></i><span class="hidden sm:inline">${escHtml(l.nome)}</span>
                </a>`).join('');

            let status = '<span class="text-slate-500">Ainda não pesquisado.</span>';
            if (r.estado === 'buscando') status = '<span class="text-sky-300"><i class="fa-solid fa-spinner fa-spin"></i> Pesquisando no Mercado Livre...</span>';
            else if (r.estado === 'erro') status = `<span class="text-amber-300"><i class="fa-solid fa-triangle-exclamation"></i> ${escHtml(r.erro)}</span>`;
            else if (r.estado === 'ok' && r.analise && r.analise.estatisticas) {
                const e = r.analise.estatisticas;
                status = `<span class="text-emerald-300 font-bold">Mediana ${formatarReais(e.mediana)}/${un}</span>
                    <span class="text-slate-400"> · ${e.n} anúncio${e.n === 1 ? '' : 's'} · ${formatarReais(e.min)} a ${formatarReais(e.max)}</span>`;
            } else if (r.estado === 'ok') status = '<span class="text-amber-300">Nenhum anúncio aproveitável. Ajuste o texto da busca ou use os links.</span>';

            let anuncios = '';
            if (r.estado === 'ok' && r.analise && r.analise.itens.length) {
                anuncios = `<details class="mt-2 text-[11px]">
                    <summary class="cursor-pointer text-sky-400 hover:text-sky-300 select-none">Ver anúncios (${r.analise.itens.length})</summary>
                    <ul class="mt-1.5 space-y-1 max-h-48 overflow-y-auto pr-1">
                        ${r.analise.itens.slice(0, 15).map(a => `
                        <li class="flex items-start justify-between gap-2 ${a.foraDaCurva ? 'opacity-50 line-through' : ''}">
                            ${a.link ? `<a href="${escHtml(a.link)}" target="_blank" rel="noopener noreferrer" class="text-slate-300 hover:text-white hover:underline">${escHtml(a.titulo)}</a>` : `<span class="text-slate-300">${escHtml(a.titulo)}</span>`}
                            <span class="font-mono text-slate-400 whitespace-nowrap">${formatarReais(a.preco)}${a.metros && a.metros > 1 ? ` <span class="text-emerald-400">(${formatarReais(a.precoUnitario)}/m)</span>` : ''}</span>
                        </li>`).join('')}
                    </ul>
                </details>`;
            }

            const valorSugerido = r.valorEscolhido != null ? r.valorEscolhido : (r.analise && r.analise.estatisticas ? r.analise.estatisticas.mediana : '');
            return `
            <div class="p-3 rounded-xl bg-slate-950/80 border ${r.selecionado ? 'border-emerald-500/50' : 'border-slate-800'}" data-grupo="${idx}">
                <div class="flex flex-col lg:flex-row lg:items-start gap-3">
                    <div class="flex-1 min-w-0 space-y-1.5">
                        <div class="flex items-start justify-between gap-2">
                            <strong class="text-white text-xs leading-snug">${escHtml(g.nome)}</strong>
                            <span class="text-[10px] text-slate-400 font-mono whitespace-nowrap">${g.quantidade.toLocaleString('pt-BR')} ${escHtml(g.unidade)}</span>
                        </div>
                        <div class="text-[11px] text-slate-400">Preço atual: <span class="font-mono text-slate-200">${formatarReais(g.precoAtual)}/${un}</span></div>
                        <div class="flex items-center gap-1.5">
                            <i class="fa-solid fa-magnifying-glass text-slate-500 text-[10px]"></i>
                            <input type="text" value="${escHtml(g.consulta)}" onchange="alterarConsultaPesquisaInternet(${idx}, this.value)"
                                   class="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-sky-500" aria-label="Texto da busca">
                            <button type="button" onclick="pesquisarGrupoInternet(${JSON.stringify(g.chave).replace(/"/g, '&quot;')})" ${r.estado === 'buscando' ? 'disabled' : ''}
                                    class="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-[11px] font-bold whitespace-nowrap transition">
                                <i class="fa-solid fa-bolt"></i> Buscar
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-1">${links}</div>
                        <div class="text-[11px] leading-snug">${status}</div>
                        ${anuncios}
                    </div>
                    <div class="lg:w-52 flex lg:flex-col items-center lg:items-stretch gap-2 lg:border-l lg:border-slate-800 lg:pl-3">
                        <label class="text-[10px] text-slate-400 whitespace-nowrap">Novo preço (R$/${un})</label>
                        <input type="number" min="0" step="0.01" value="${valorSugerido === '' ? '' : Number(valorSugerido).toFixed(2)}" placeholder="0,00"
                               oninput="definirValorPesquisaInternet(${idx}, this.value)"
                               class="w-28 lg:w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-right font-mono text-xs text-emerald-300 outline-none focus:border-emerald-500">
                        <label class="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                            <input type="checkbox" ${r.selecionado ? 'checked' : ''} onchange="selecionarGrupoPesquisaInternet(${idx}, this.checked)" class="accent-emerald-500">
                            Aplicar
                        </label>
                    </div>
                </div>
            </div>`;
        }

        function alterarConsultaPesquisaInternet(idx, texto) {
            const g = _pesquisaInternet.grupos[idx];
            if (g && texto.trim()) { g.consulta = texto.trim(); renderizarGrupoPesquisaInternet(g); }
        }

        function definirValorPesquisaInternet(idx, valor) {
            const g = _pesquisaInternet.grupos[idx];
            if (!g) return;
            const r = _pesquisaInternet.resultados[g.chave] || (_pesquisaInternet.resultados[g.chave] = {});
            const n = parseFloat(String(valor).replace(',', '.'));
            r.valorEscolhido = isFinite(n) && n > 0 ? n : null;
            r.selecionado = r.valorEscolhido != null;
            const card = document.querySelector(`#listaPesquisaInternet [data-grupo="${idx}"]`);
            if (card) {
                const cb = card.querySelector('input[type=checkbox]');
                if (cb) cb.checked = r.selecionado;
                card.classList.toggle('border-emerald-500/50', r.selecionado);
                card.classList.toggle('border-slate-800', !r.selecionado);
            }
            atualizarBotaoAplicarPesquisaInternet();
        }

        function selecionarGrupoPesquisaInternet(idx, marcado) {
            const g = _pesquisaInternet.grupos[idx];
            if (!g) return;
            const r = _pesquisaInternet.resultados[g.chave] || (_pesquisaInternet.resultados[g.chave] = {});
            const valor = r.valorEscolhido != null ? r.valorEscolhido : (r.analise && r.analise.estatisticas ? r.analise.estatisticas.mediana : null);
            if (marcado && !(valor > 0)) {
                mostrarNotificacaoToast('Pesquise ou digite o novo preço antes de marcar.', 'aviso');
                r.selecionado = false;
            } else {
                r.selecionado = marcado;
            }
            renderizarGrupoPesquisaInternet(g);
            atualizarBotaoAplicarPesquisaInternet();
        }

        function renderizarGrupoPesquisaInternet(g) {
            const idx = _pesquisaInternet.grupos.indexOf(g);
            const card = document.querySelector(`#listaPesquisaInternet [data-grupo="${idx}"]`);
            if (!card) return;
            const tmp = document.createElement('div');
            tmp.innerHTML = htmlGrupoPesquisaInternet(g).trim();
            card.replaceWith(tmp.firstElementChild);
        }

        function atualizarBotaoAplicarPesquisaInternet() {
            const n = _pesquisaInternet.grupos.filter(g => (_pesquisaInternet.resultados[g.chave] || {}).selecionado).length;
            const btn = document.getElementById('btnAplicarPesquisaInternet');
            if (btn) {
                btn.disabled = n === 0;
                btn.querySelector('span').textContent = n ? `Aplicar ${n} preço${n === 1 ? '' : 's'} ao orçamento` : 'Aplicar ao orçamento';
            }
        }

        function atualizarStatusPesquisaInternet(texto, tipo) {
            const el = document.getElementById('lblStatusPesquisaInternet');
            if (!el) return;
            if (!texto) {
                const feitos = _pesquisaInternet.grupos.filter(g => (_pesquisaInternet.resultados[g.chave] || {}).estado === 'ok').length;
                texto = `${_pesquisaInternet.grupos.length} itens com preço próprio · ${feitos} pesquisado${feitos === 1 ? '' : 's'}`;
                tipo = 'info';
            }
            const cor = { info: 'text-slate-400', erro: 'text-amber-300', ok: 'text-emerald-300', busy: 'text-sky-300' }[tipo] || 'text-slate-400';
            el.className = 'text-[11px] ' + cor;
            el.textContent = texto;
        }

        /** Busca automática de um item pelo servidor local. Retorna false se a busca não está disponível. */
        async function pesquisarGrupoInternet(chave) {
            const g = _pesquisaInternet.grupos.find(x => x.chave === chave);
            if (!g) return false;
            const r = _pesquisaInternet.resultados[chave] || (_pesquisaInternet.resultados[chave] = {});
            r.estado = 'buscando';
            renderizarGrupoPesquisaInternet(g);
            let resposta = null;
            if (location.protocol === 'file:') {
                resposta = { sucesso: false, erro: 'A busca automática precisa do servidor local (iniciar_servidor.bat). Use os links das lojas.', indisponivel: true };
            } else {
                try {
                    const resp = await fetch('/api/pesquisar-preco?limite=20&q=' + encodeURIComponent(g.consulta), { cache: 'no-store' });
                    resposta = resp.ok ? await resp.json()
                        : { sucesso: false, erro: 'A busca automática precisa do servidor local (iniciar_servidor.bat). Use os links das lojas.', indisponivel: true };
                } catch (err) {
                    resposta = { sucesso: false, erro: 'Sem conexão com o servidor local. Use os links das lojas.', indisponivel: true };
                }
            }
            if (resposta && resposta.sucesso) {
                r.estado = 'ok';
                r.data = resposta.data;
                r.analise = PesquisaPrecos.analisarResultados(resposta.resultados, g.materiais[0]);
                r.valorEscolhido = null;
                if (r.analise.estatisticas) r.selecionado = true;
            } else {
                r.estado = 'erro';
                r.erro = (resposta && resposta.erro) || 'Falha na busca.';
            }
            renderizarGrupoPesquisaInternet(g);
            atualizarBotaoAplicarPesquisaInternet();
            atualizarStatusPesquisaInternet();
            // credencial recusada / sem internet / sem servidor: as próximas buscas também falhariam
            return !(resposta && !resposta.sucesso && (resposta.indisponivel || resposta.codigo === 401 || resposta.codigo === 403 || /conexão/i.test(resposta.erro || '')));
        }

        async function pesquisarTodosInternet() {
            if (_pesquisaInternet.buscando) { _pesquisaInternet.cancelar = true; return; }
            const grupos = gruposVisiveisPesquisaInternet();
            const btn = document.getElementById('btnBuscarTodosInternet');
            _pesquisaInternet.buscando = true;
            _pesquisaInternet.cancelar = false;
            if (btn) btn.innerHTML = '<i class="fa-solid fa-stop"></i> <span>Parar</span>';
            let feitos = 0, interrompido = null;
            for (const g of grupos) {
                if (_pesquisaInternet.cancelar) break;
                atualizarStatusPesquisaInternet(`Pesquisando ${feitos + 1} de ${grupos.length}: ${g.nome}`, 'busy');
                const continuar = await pesquisarGrupoInternet(g.chave);
                feitos++;
                if (!continuar) { interrompido = (_pesquisaInternet.resultados[g.chave] || {}).erro; break; }
                await new Promise(res => setTimeout(res, 350)); // não sobrecarregar a loja
            }
            _pesquisaInternet.buscando = false;
            if (btn) btn.innerHTML = '<i class="fa-solid fa-bolt"></i> <span>Buscar todos automaticamente</span>';
            if (interrompido) atualizarStatusPesquisaInternet('Busca interrompida: ' + interrompido, 'erro');
            else atualizarStatusPesquisaInternet(_pesquisaInternet.cancelar ? `Busca parada após ${feitos} itens.` : `${feitos} itens pesquisados. Confira os anúncios e marque os preços que deseja aplicar.`, 'ok');
        }

        /** Grava os preços marcados na tabela de preços do projeto e recalcula o orçamento. */
        function aplicarPesquisaInternet() {
            inicializarTabelaPrecos();
            const tp = state.tabelaPrecos;
            if (!tp.precosPorItem) tp.precosPorItem = {};
            let aplicados = 0;
            _pesquisaInternet.grupos.forEach(g => {
                const r = _pesquisaInternet.resultados[g.chave];
                if (!r || !r.selecionado) return;
                const est = r.analise && r.analise.estatisticas;
                const valor = r.valorEscolhido != null ? r.valorEscolhido : (est ? est.mediana : null);
                if (!(valor > 0)) return;
                const fonte = (r.valorEscolhido == null && est)
                    ? `Internet: Mercado Livre, mediana de ${est.n} anúncio${est.n === 1 ? '' : 's'} (${r.data || new Date().toLocaleDateString('pt-BR')})`
                    : `Internet: valor informado (${new Date().toLocaleDateString('pt-BR')})`;
                const m0 = g.materiais[0];
                if (g.tipo === 'cabo') {
                    tp.cabos[normalizarChaveBitola(PesquisaPrecos.secaoDoCabo(m0))] = { metro: valor, rolo100: Math.round(valor * 10000) / 100, customizado: true, fonte };
                } else if (g.tipo === 'eletroduto') {
                    tp.eletrodutos[PesquisaPrecos.dnDoEletroduto(m0)] = { metro: valor, rolo50: Math.round(valor * 5000) / 100, customizado: true, fonte };
                } else {
                    g.materiais.forEach(m => { tp.precosPorItem[m.item] = { valor, fonte }; });
                }
                g.precoAtual = valor;
                r.selecionado = false;
                aplicados++;
            });
            if (!aplicados) { mostrarNotificacaoToast('Nenhum preço marcado para aplicar.', 'aviso'); return; }
            tp.fonteAtual = 'Preços pesquisados na internet + tabela de referência';
            recalcularOrcamentoComPrecos();
            renderizarPesquisaInternet();
            atualizarStatusPesquisaInternet(`${aplicados} preço${aplicados === 1 ? '' : 's'} aplicado${aplicados === 1 ? '' : 's'} ao orçamento.`, 'ok');
            mostrarNotificacaoToast(`${aplicados} preço${aplicados === 1 ? '' : 's'} da internet aplicado${aplicados === 1 ? '' : 's'}. Orçamento recalculado.`, 'sucesso');
        }

        // Esc fecha o modal aberto mais à frente (usa o botão de fechar do próprio modal)
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;
            const abertos = [...document.querySelectorAll('[id^="modal"]')]
                .filter(el => !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none' && el.classList.contains('fixed'));
            const modal = abertos[abertos.length - 1];
            if (!modal) return;
            const fechar = modal.querySelector('button[aria-label="Fechar"], button[onclick*="fechar"], button[onclick*="Fechar"]');
            if (fechar) fechar.click(); else modal.classList.add('hidden');
            e.preventDefault();
        });

        // ---------------------------------------------------------------
        // MENU "ARQUIVO" DO CABEÇALHO
        // ---------------------------------------------------------------
        function alternarMenuArquivo(e) {
            if (e) e.stopPropagation();
            const menu = document.getElementById('menuArquivo');
            if (!menu) return;
            const abrir = menu.classList.contains('hidden');
            menu.classList.toggle('hidden', !abrir);
            document.getElementById('btnMenuArquivo')?.setAttribute('aria-expanded', abrir ? 'true' : 'false');
            if (abrir) menu.querySelector('[role=menuitem]')?.focus();
        }

        function fecharMenuArquivo() {
            const menu = document.getElementById('menuArquivo');
            if (menu && !menu.classList.contains('hidden')) {
                menu.classList.add('hidden');
                document.getElementById('btnMenuArquivo')?.setAttribute('aria-expanded', 'false');
            }
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest || !e.target.closest('#menuArquivoWrapper')) fecharMenuArquivo();
        });
        document.addEventListener('keydown', (e) => {
            const menu = document.getElementById('menuArquivo');
            if (!menu || menu.classList.contains('hidden')) return;
            if (e.key === 'Escape') { fecharMenuArquivo(); document.getElementById('btnMenuArquivo')?.focus(); e.preventDefault(); return; }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                const itens = [...menu.querySelectorAll('[role=menuitem]')];
                const i = itens.indexOf(document.activeElement);
                const prox = e.key === 'ArrowDown' ? (i + 1) % itens.length : (i - 1 + itens.length) % itens.length;
                itens[prox].focus();
                e.preventDefault();
            }
        }, true);

        // ---------------------------------------------------------------
        // PAINEL LATERAL DA PLANTA RECOLHÍVEL (preferência guardada no navegador)
        // ---------------------------------------------------------------
        function aplicarPainelLateralPlanta(recolhido) {
            const grid = document.getElementById('gridPlanta');
            const btn = document.getElementById('btnRecolherPainelPlanta');
            if (!grid) return;
            grid.classList.toggle('lateral-recolhida', recolhido);
            if (btn) {
                btn.setAttribute('aria-expanded', recolhido ? 'false' : 'true');
                btn.querySelector('i').className = `fa-solid ${recolhido ? 'fa-angles-right' : 'fa-angles-left'} text-[10px]`;
            }
        }

        function alternarPainelLateralPlanta() {
            const recolhido = !document.getElementById('gridPlanta')?.classList.contains('lateral-recolhida');
            aplicarPainelLateralPlanta(recolhido);
            try { localStorage.setItem('proeletrica_painel_planta', recolhido ? 'recolhido' : 'aberto'); } catch (e) {}
            if (typeof desenharCAD === 'function') requestAnimationFrame(() => desenharCAD());
        }

        document.addEventListener('DOMContentLoaded', () => {
            let pref = null;
            try { pref = localStorage.getItem('proeletrica_painel_planta'); } catch (e) {}
            if (pref === 'recolhido') aplicarPainelLateralPlanta(true);
        });

        // ---------------------------------------------------------------
        // BARRAS COM ROLAGEM LATERAL (celular): degradê só do lado em que há
        // mais botões e uma "espiada" na primeira vez que a barra aparece
        // ---------------------------------------------------------------
        function atualizarIndicadoresRolagem(el) {
            const max = el.scrollWidth - el.clientWidth;
            el.dataset.rolaEsq = el.scrollLeft > 4 ? '1' : '0';
            el.dataset.rolaDir = (max > 4 && el.scrollLeft < max - 4) ? '1' : '0';
        }

        function configurarTrilhosRolagem() {
            const trilhos = document.querySelectorAll('.mob-trilho');
            let espiou = false;
            try { espiou = sessionStorage.getItem('proeletrica_espiada') === '1'; } catch (e) {}
            const observador = ('IntersectionObserver' in window) ? new IntersectionObserver(entradas => {
                entradas.forEach(en => {
                    if (!en.isIntersecting) return;
                    const el = en.target;
                    // espiada interrompida (a aba mudou no meio): volta ao início ao reaparecer
                    if (el.dataset.espiando === '1') { el.scrollLeft = 0; delete el.dataset.espiando; }
                    atualizarIndicadoresRolagem(el);
                    if (!espiou && el.scrollWidth - el.clientWidth > 24 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
                        espiou = true;
                        try { sessionStorage.setItem('proeletrica_espiada', '1'); } catch (e) {}
                        el.dataset.espiando = '1';
                        setTimeout(() => {
                            el.scrollLeft = 56;
                            setTimeout(() => { el.scrollLeft = 0; if (el.offsetParent) delete el.dataset.espiando; }, 650);
                        }, 500);
                    }
                });
            }, { threshold: 0.6 }) : null;
            trilhos.forEach(el => {
                el.addEventListener('scroll', () => atualizarIndicadoresRolagem(el), { passive: true });
                atualizarIndicadoresRolagem(el);
                if (observador) observador.observe(el);
                // botões criados depois (andares, ferramentas) mudam a largura do conteúdo
                if ('MutationObserver' in window) new MutationObserver(() => atualizarIndicadoresRolagem(el)).observe(el, { childList: true, subtree: true });
            });
            window.addEventListener('resize', () => trilhos.forEach(atualizarIndicadoresRolagem));
        }
        document.addEventListener('DOMContentLoaded', configurarTrilhosRolagem);

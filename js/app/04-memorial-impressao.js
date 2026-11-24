/* PRO-ELÉTRICA CAD — 04-memorial-impressao.js
   Memorial técnico, impressão das pranchas, formulário de cômodos e eventos do canvas da planta.
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        // =====================================================================
        // ABA 6: RENDERIZAÇÃO DO MEMORIAL TÉCNICO DE CIRCUITOS NBR 5410
        // =====================================================================
        // Justificativa técnica de um circuito a partir do dimensionamento do módulo NBR5410
        function justificativaCircuitoNBR(c) {
            const fmt = v => String(v).replace('.', ',');
            const secMin = c.tipo === 'Iluminação' ? NBR5410.SECAO_MINIMA_ILUMINACAO : NBR5410.SECAO_MINIMA_FORCA;
            const partes = [
                `I<sub>b</sub> ${fmt(c.ibVal.toFixed(1))} A ≤ I<sub>n</sub> ${c.disjuntor} A ≤ I<sub>z</sub> ${fmt((c.izCorrigida || 0).toFixed(1))} A ` +
                    `(Tab. 36 B1 × FCA ${fmt((c.fca || 1).toFixed(2))} × FCT ${fmt((c.fct || 1).toFixed(2))})`,
                `ΔV ${fmt(c.deltaVPct.toFixed(1))}% em ${Math.round(c.ehManual ? c.rota : (c.distanciaCritica || c.rota))} m (item 6.2.7: ≤ 4%)`,
                `Seção mín. ${fmt(secMin)} mm² (Tab. 47)`,
                `PE ${fmt(c.secaoPE || c.secaoMm2)} mm² (Tab. 58)`
            ];
            let html = partes.join(' • ');
            if (c.alertas && c.alertas.length) {
                html += `<br><span class="text-red-400 font-bold">⚠ ${c.alertas.join(' ')}</span>`;
            }
            return html;
        }

        // Seção 2 do Guia NBR: bitolas com Iz corrigida e circuitos do projeto que as usam
        function renderizarGuiaBitolasNBR() {
            const tbody = document.getElementById('tabelaGuiaBitolasNBR');
            const p = obterParametrosNBR();
            const fca = NBR5410.fatorAgrupamento(p.circuitosAgrupados);
            const fct = NBR5410.fatorTemperatura(p.temperaturaAmbiente);
            const fmt = (v, d = 1) => Number(v).toFixed(d).replace('.', ',');
            const txtFatores = `${p.circuitosAgrupados} circuito(s) → FCA ${fmt(fca, 2)}; ${p.temperaturaAmbiente} °C → FCT ${fmt(fct, 2)}`;
            const l1 = document.getElementById('lblGuiaFatoresNBR');
            const l2 = document.getElementById('lblGuiaCriterioFatores');
            if (l1) l1.textContent = `FCA ${fmt(fca, 2)} × FCT ${fmt(fct, 2)} (${p.circuitosAgrupados} circ., ${p.temperaturaAmbiente} °C)`;
            if (l2) l2.textContent = txtFatores;
            if (!tbody) return;

            const usos = {
                1.5: 'Seção mínima de iluminação (Tab. 47)',
                2.5: 'Seção mínima de força/tomadas (Tab. 47)'
            };
            const circs = state.circuitosCalculados || [];
            tbody.innerHTML = '';
            NBR5410.SECOES_PADRONIZADAS.forEach(sec => {
                const iz = NBR5410.izMetodoB1(sec);
                const izc = NBR5410.izCorrigida(sec, fca, fct);
                const maiorDj = [...NBR5410.DISJUNTORES_PADRONIZADOS].reverse().find(d => d <= izc);
                const doProjeto = circs.filter(c => c.secaoMm2 === sec);
                if (sec > 25 && doProjeto.length === 0) return; // seções grandes só quando usadas
                const cargas = maiorDj ? `${fmt(maiorDj * 127 / 1000)} kW / ${fmt(maiorDj * 220 / 1000)} kW` : '—';
                const lista = doProjeto.length
                    ? doProjeto.map(c => `<span class="inline-block mr-1 mb-0.5 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px]" title="${c.nome}">C${c.num} ${c.disjuntor}A</span>`).join('')
                    : '<span class="text-slate-600">não usada neste projeto</span>';
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-900/60 transition';
                tr.innerHTML = `
                    <td class="p-2.5 font-mono font-bold text-amber-400">${fmt(sec, sec % 1 ? 1 : 0)} mm²</td>
                    <td class="p-2.5 font-mono text-slate-300">${fmt(iz)} A</td>
                    <td class="p-2.5 font-mono font-bold text-sky-300">${fmt(izc)} A</td>
                    <td class="p-2.5 font-mono text-slate-300">${maiorDj ? maiorDj + ' A' : '<span class="text-red-400">nenhum ≥ 10 A</span>'}</td>
                    <td class="p-2.5 font-mono text-slate-400">${cargas}</td>
                    <td class="p-2.5 font-mono text-slate-400">${fmt(NBR5410.secaoProtecao(sec), NBR5410.secaoProtecao(sec) % 1 ? 1 : 0)} mm²</td>
                    <td class="p-2.5 text-slate-400 text-[10px]">${usos[sec] ? `<div class="mb-1">${usos[sec]}</div>` : ''}${lista}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function renderizarMemorialAba6() {
            renderizarGuiaBitolasNBR();
            const tbody = document.getElementById('tabelaMemorialCircuitosAba6');
            if (!tbody) return;
            tbody.innerHTML = '';

            const estilos = {
                'Iluminação': { cor: 'amber', rotulo: 'ILUM' },
                'TUG': { cor: 'emerald', rotulo: 'TUG' },
                'TUE': { cor: 'blue', rotulo: 'TUE' }
            };

            (state.circuitosCalculados || []).forEach(c => {
                const e = estilos[c.tipo] || estilos.TUG;
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-900/60 transition';
                tr.innerHTML = `
                    <td class="p-2.5 font-bold text-${e.cor}-400 font-mono">C${c.num}</td>
                    <td class="p-2.5 text-white font-medium">${c.nome}</td>
                    <td class="p-2.5"><span class="px-2 py-0.5 rounded text-[9px] font-bold bg-${e.cor}-500/20 text-${e.cor}-300 border border-${e.cor}-500/30">${e.rotulo}</span></td>
                    <td class="p-2.5 font-mono text-slate-300">${c.pot}</td>
                    <td class="p-2.5 font-mono text-slate-400">${c.tensao} V</td>
                    <td class="p-2.5 font-mono text-sky-400 font-bold">${c.ibVal.toFixed(1)} A</td>
                    <td class="p-2.5 font-mono text-slate-300">DJ ${c.disjuntor}A</td>
                    <td class="p-2.5 font-mono font-bold text-${e.cor}-400">${c.cabo.replace('.', ',')}</td>
                    <td class="p-2.5 text-slate-400 text-[10px]">${justificativaCircuitoNBR(c)}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        // =====================================================================
        // CENTRAL DE IMPRESSÃO & EXPORTAÇÃO PDF DAS 6 FOLHAS DO PROJETO ABNT
        // =====================================================================
        function abrirModalImpressaoPDF() {
            const modal = document.getElementById('modalImpressaoPDF');
            if (modal) modal.classList.remove('hidden');
        }

        function fecharModalImpressaoPDF() {
            const modal = document.getElementById('modalImpressaoPDF');
            if (modal) modal.classList.add('hidden');
        }

        // Justificativa das bitolas para a prancha 6, gerada a partir dos circuitos calculados
        function htmlJustificativaBitolasImpressao() {
            const p = obterParametrosNBR();
            const fca = NBR5410.fatorAgrupamento(p.circuitosAgrupados);
            const fct = NBR5410.fatorTemperatura(p.temperaturaAmbiente);
            const fmt = (v, d = 1) => Number(v).toFixed(d).replace('.', ',');
            const circs = state.circuitosCalculados || [];
            const secoes = [...new Set(circs.map(c => c.secaoMm2))].sort((a, b) => a - b);
            const td = 'style="border: 1px solid #cbd5e1; padding: 3px 5px;"';
            const linhas = secoes.map(sec => {
                const usam = circs.filter(c => c.secaoMm2 === sec);
                const lista = usam.map(c => `C${c.num} (${c.disjuntor} A)`).join(', ');
                return `<tr><td ${td}><strong>${fmt(sec, sec % 1 ? 1 : 0)} mm²</strong></td><td ${td}>${fmt(NBR5410.izMetodoB1(sec))} A</td>` +
                       `<td ${td}>${fmt(NBR5410.izCorrigida(sec, fca, fct))} A</td><td ${td}>${fmt(NBR5410.secaoProtecao(sec), NBR5410.secaoProtecao(sec) % 1 ? 1 : 0)} mm²</td><td ${td}>${lista}</td></tr>`;
            }).join('');
            const alertas = circs.filter(c => c.alertas && c.alertas.length).map(c => `C${c.num}: ${c.alertas.join(' ')}`);
            return `<p style="margin: 0 0 4px 0;">Critérios: seção mínima da Tabela 47 (1,5 mm² iluminação; 2,5 mm² força); disjuntor = menor corrente nominal comercial ≥ I<sub>b</sub>;
                    seção = menor que atende I<sub>n</sub> ≤ I<sub>z</sub> × FCA × FCT (Tabela 36, método B1, cobre/PVC 70 °C, 2 condutores carregados) e queda de tensão ≤ 4% (item 6.2.7).
                    Premissas deste projeto: ${p.circuitosAgrupados} circuito(s) por eletroduto → FCA ${fmt(fca, 2)} (Tabela 42); ${p.temperaturaAmbiente} °C → FCT ${fmt(fct, 2)} (Tabela 40).
                    Condutor de proteção (PE) pela Tabela 58.</p>
                <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt; margin: 4px 0 6px 0;">
                    <thead><tr style="background: #f1f5f9;"><th ${td}>Bitola</th><th ${td}>I<sub>z</sub> Tab. 36</th><th ${td}>I<sub>z</sub> corrigida</th><th ${td}>PE</th><th ${td}>Circuitos (disjuntor)</th></tr></thead>
                    <tbody>${linhas}</tbody>
                </table>
                ${alertas.length ? `<p style="margin: 0 0 6px 0; color: #b91c1c;"><strong>Atenção:</strong> ${alertas.join(' • ')}</p>` : ''}`;
        }

        // Prancha correspondente à aba aberta (Planta → 01 ... Guia NBR → 06)
        const _PRANCHA_POR_ABA = { planta: 0, instalacoes: 1, visualizacao3d: 2, alimentador: 3, materiais: 4, duvidas: 5 };

        function imprimirPranchas(somenteIndice) {
            fecharModalImpressaoPDF();
            if (!gerarPranchasImpressao()) { window.print(); return; }
            const container = document.getElementById('containerPranchasImpressaoCompleta');
            const folhas = container.querySelectorAll('.folha-prancha-abnt');
            folhas.forEach((f, i) => f.classList.toggle('folha-atual', somenteIndice === i));
            container.classList.toggle('so-folha-atual', somenteIndice !== null && somenteIndice !== undefined);
            const limpar = () => {
                container.classList.remove('so-folha-atual');
                folhas.forEach(f => f.classList.remove('folha-atual'));
                window.removeEventListener('afterprint', limpar);
            };
            window.addEventListener('afterprint', limpar);
            setTimeout(() => window.print(), 300);
        }

        function imprimirApenasFolhaAtual() {
            const idx = _PRANCHA_POR_ABA[state.abaAtiva];
            imprimirPranchas(idx === undefined ? null : idx);   // aba sem prancha própria (Arquivos) → todas
        }

        function imprimirTodasFolhasProjeto() {
            imprimirPranchas(null);
        }

        // Monta as 6 pranchas ABNT no container de impressão (não imprime)
        function gerarPranchasImpressao() {
            const modal = document.getElementById('modalImpressaoPDF');
            if (modal) modal.classList.add('hidden');

            const container = document.getElementById('containerPranchasImpressaoCompleta');
            if (!container) return false;

            const nomeObra = textoSeguro((document.getElementById('txtPdfNomeObra') && document.getElementById('txtPdfNomeObra').value) ? document.getElementById('txtPdfNomeObra').value : 'Projeto Elétrico Residencial NBR 5410');
            const projetista = textoSeguro((document.getElementById('txtPdfProjetista') && document.getElementById('txtPdfProjetista').value) ? document.getElementById('txtPdfProjetista').value : 'Eng. Eletricista Responsável');
            const dataHoje = new Date().toLocaleDateString('pt-BR');

            // Captura imagens dos canvas ativos
            const cadCanvas = document.getElementById('cadCanvas');
            const instCanvas = document.getElementById('instalacoesCanvas');
            const dataUrlCad = cadCanvas ? cadCanvas.toDataURL('image/png') : '';
            const dataUrlInst = instCanvas ? instCanvas.toDataURL('image/png') : '';

            let dataUrl3d = '';
            if (state.renderer3d && state.renderer3d.domElement) {
                try {
                    // A cena só é montada quando a aba 3D é aberta; garante que exista e
                    // renderiza um quadro antes da captura (senão a prancha sai vazia)
                    if (typeof reconstruirCena3D === 'function') reconstruirCena3D(true);
                    if (state.scene3d && state.camera3d) state.renderer3d.render(state.scene3d, state.camera3d);
                    dataUrl3d = state.renderer3d.domElement.toDataURL('image/png');
                } catch(e) {
                    console.log("3D snapshot catch:", e);
                }
            }

            if (!state.circuitosCalculados || state.circuitosCalculados.length === 0) atualizarTabelas();
            // Carga instalada = soma das potências dos circuitos do QDT (mesmo valor da aba QDT)
            const totalPot = (state.circuitosCalculados || []).reduce((s, c) => s + (Number(c.potVal) || 0), 0);

            // GERA AS 6 PRANCHAS ABNT
            container.innerHTML = `
                <!-- ==================== FOLHA 01: PLANTA BAIXA ARQUITETÔNICA CAD 2D ==================== -->
                <div class="folha-prancha-abnt">
                    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h1 style="font-size: 16pt; font-weight: 900; margin: 0; color: #0f172a;">PRO-ELÉTRICA CAD NBR 5410</h1>
                            <p style="font-size: 9pt; margin: 0; color: #475569;">PRANCHA 01/06 — PLANTA BAIXA ARQUITETÔNICA & AMBIENTES</p>
                        </div>
                        <div style="text-align: right; font-size: 8pt; font-family: monospace;">
                            <span>ESCALA: 1:50</span> • <span>SISTEMA: CAD 2D VETORIAL</span>
                        </div>
                    </div>

                    <div style="text-align: center; margin: 15px 0;">
                        ${dataUrlCad ? `<img src="${dataUrlCad}" style="max-width: 100%; max-height: 520px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 4px;" />` : '<p>Planta Baixa CAD</p>'}
                    </div>

                    <!-- CARIMBO TÉCNICO ABNT -->
                    <div class="carimbo-tecnico" style="margin-top: 15px; padding: 10px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; font-size: 8pt;">
                        <div><strong>OBRA:</strong> ${nomeObra}</div>
                        <div><strong>RESP. TÉCNICO:</strong> ${projetista}</div>
                        <div><strong>DATA:</strong> ${dataHoje}</div>
                        <div><strong>FOLHA:</strong> 01 / 06</div>
                    </div>
                </div>

                <!-- ==================== FOLHA 02: PROJETO ELÉTRICO 2D & ELETRODUTOS ==================== -->
                <div class="folha-prancha-abnt">
                    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h1 style="font-size: 16pt; font-weight: 900; margin: 0; color: #0f172a;">PRO-ELÉTRICA CAD NBR 5410</h1>
                            <p style="font-size: 9pt; margin: 0; color: #059669;">PRANCHA 02/06 — INSTALAÇÕES ELÉTRICAS: TUG, TUE, ILUMINAÇÃO & ELETRODUTOS</p>
                        </div>
                        <div style="text-align: right; font-size: 8pt; font-family: monospace;">
                            <span>ROTEAMENTO: NBR 5410 / NBR 5444</span>
                        </div>
                    </div>

                    <div style="text-align: center; margin: 10px 0;">
                        ${dataUrlInst ? `<img src="${dataUrlInst}" style="max-width: 100%; max-height: 480px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 4px;" />` : '<p>Planta Elétrica</p>'}
                    </div>

                    <div style="display: flex; gap: 15px; font-size: 8pt; background: #f1f5f9; padding: 6px; border-radius: 4px; margin-top: 6px;">
                        <span><strong>LEGENDA:</strong></span>
                        <span style="color: #059669;">● TUG (#10b981)</span>
                        <span style="color: #2563eb;">■ TUE (#3b82f6)</span>
                        <span style="color: #d97706;">💡 Iluminação (#f59e0b)</span>
                        <span style="color: #7c3aed;">〰 Retorno (#a855f7)</span>
                        <span style="color: #0284c7;">-- Eletroduto Teto</span>
                        <span style="color: #ea580c;">-·- Eletroduto Chão / Mesclado</span>
                    </div>

                    <div class="carimbo-tecnico" style="margin-top: 10px; padding: 10px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; font-size: 8pt;">
                        <div><strong>OBRA:</strong> ${nomeObra}</div>
                        <div><strong>RESP. TÉCNICO:</strong> ${projetista}</div>
                        <div><strong>DATA:</strong> ${dataHoje}</div>
                        <div><strong>FOLHA:</strong> 02 / 06</div>
                    </div>
                </div>

                <!-- ==================== FOLHA 03: MAQUETE 3D BIM & PRUMADAS VERTICAIS ==================== -->
                <div class="folha-prancha-abnt">
                    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h1 style="font-size: 16pt; font-weight: 900; margin: 0; color: #0f172a;">PRO-ELÉTRICA CAD NBR 5410</h1>
                            <p style="font-size: 9pt; margin: 0; color: #2563eb;">PRANCHA 03/06 — MODELO 3D BIM, ISOMÉTRICO & PRUMADAS VERTICAIS</p>
                        </div>
                        <div style="text-align: right; font-size: 8pt; font-family: monospace;">
                            <span>WEBGL RENDERER</span> • <span>COORDINATES Z/Y EXACT</span>
                        </div>
                    </div>

                    <div style="text-align: center; margin: 15px 0;">
                        ${dataUrl3d ? `<img src="${dataUrl3d}" style="max-width: 100%; max-height: 520px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 4px;" />` : '<p style="padding: 40px; background: #f1f5f9; border-radius: 8px;">Visualização Tridimensional BIM Renderizada</p>'}
                    </div>

                    <div class="carimbo-tecnico" style="margin-top: 15px; padding: 10px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; font-size: 8pt;">
                        <div><strong>OBRA:</strong> ${nomeObra}</div>
                        <div><strong>RESP. TÉCNICO:</strong> ${projetista}</div>
                        <div><strong>DATA:</strong> ${dataHoje}</div>
                        <div><strong>FOLHA:</strong> 03 / 06</div>
                    </div>
                </div>

                <!-- ==================== FOLHA 04: QUADRO DE DISTRIBUIÇÃO & DISJUNTORES ==================== -->
                <div class="folha-prancha-abnt">
                    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h1 style="font-size: 16pt; font-weight: 900; margin: 0; color: #0f172a;">PRO-ELÉTRICA CAD NBR 5410</h1>
                            <p style="font-size: 9pt; margin: 0; color: #d97706;">PRANCHA 04/06 — QUADRO DE CARGAS & DIAGRAMA DE DISJUNTORES (QDT DIN)</p>
                        </div>
                        <div style="text-align: right; font-size: 8pt; font-family: monospace;">
                            <span>CARGA INSTALADA: ${(totalPot/1000).toFixed(2).replace('.', ',')} kVA</span>
                        </div>
                    </div>

                    <div style="margin: 15px 0; overflow-x: auto;">
                        <table style="width: 100%; font-size: 8pt; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="background: #0f172a; color: #ffffff;">
                                    <th style="padding: 6px; border: 1px solid #334155;">Circ.</th>
                                    <th style="padding: 6px; border: 1px solid #334155;">Descrição</th>
                                    <th style="padding: 6px; border: 1px solid #334155;">Tipo</th>
                                    <th style="padding: 6px; border: 1px solid #334155;">Potência</th>
                                    <th style="padding: 6px; border: 1px solid #334155;">Tensão</th>
                                    <th style="padding: 6px; border: 1px solid #334155;">Ib (A)</th>
                                    <th style="padding: 6px; border: 1px solid #334155;">Disjuntor</th>
                                    <th style="padding: 6px; border: 1px solid #334155;">Bitola</th>
                                    <th style="padding: 6px; border: 1px solid #334155;">Proteção DR</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${gerarLinhasTabelaPdfCircuitos()}
                            </tbody>
                        </table>
                    </div>

                    <div class="carimbo-tecnico" style="margin-top: 15px; padding: 10px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; font-size: 8pt;">
                        <div><strong>OBRA:</strong> ${nomeObra}</div>
                        <div><strong>RESP. TÉCNICO:</strong> ${projetista}</div>
                        <div><strong>DATA:</strong> ${dataHoje}</div>
                        <div><strong>FOLHA:</strong> 04 / 06</div>
                    </div>
                </div>

                <!-- ==================== FOLHA 05: LISTA QUANTITATIVA DE MATERIAIS ==================== -->
                <div class="folha-prancha-abnt">
                    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h1 style="font-size: 16pt; font-weight: 900; margin: 0; color: #0f172a;">PRO-ELÉTRICA CAD NBR 5410</h1>
                            <p style="font-size: 9pt; margin: 0; color: #7c3aed;">PRANCHA 05/06 — MEMORIAL QUANTITATIVO DE MATERIAIS & COMPONENTES</p>
                        </div>
                        <div style="text-align: right; font-size: 8pt; font-family: monospace;">
                            <span>LISTA DE COMPRAS & ORÇAMENTO</span>
                        </div>
                    </div>

                    <div style="margin: 15px 0; overflow-x: auto;">
                        <table style="width: 100%; font-size: 8pt; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="background: #0f172a; color: #ffffff;">
                                    <th style="padding: 6px; border: 1px solid #334155;">Categoria</th>
                                    <th style="padding: 6px; border: 1px solid #334155;">Descrição do Material</th>
                                    <th style="padding: 6px; border: 1px solid #334155;">Especificação Técnica</th>
                                    <th style="padding: 6px; border: 1px solid #334155;">Quantidade</th>
                                    <th style="padding: 6px; border: 1px solid #334155;">Unidade</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${gerarLinhasTabelaPdfMateriais()}
                            </tbody>
                        </table>
                        ${typeof htmlMaoDeObraParaImpressao === 'function' ? htmlMaoDeObraParaImpressao() : ''}
                    </div>

                    <div class="carimbo-tecnico" style="margin-top: 15px; padding: 10px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; font-size: 8pt;">
                        <div><strong>OBRA:</strong> ${nomeObra}</div>
                        <div><strong>RESP. TÉCNICO:</strong> ${projetista}</div>
                        <div><strong>DATA:</strong> ${dataHoje}</div>
                        <div><strong>FOLHA:</strong> 05 / 06</div>
                    </div>
                </div>

                <!-- ==================== FOLHA 06: MEMORIAL DE CÁLCULO & JUSTIFICATIVAS NBR 5410 ==================== -->
                <div class="folha-prancha-abnt">
                    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h1 style="font-size: 16pt; font-weight: 900; margin: 0; color: #0f172a;">PRO-ELÉTRICA CAD NBR 5410</h1>
                            <p style="font-size: 9pt; margin: 0; color: #be123c;">PRANCHA 06/06 — MEMORIAL DE CÁLCULO & JUSTIFICATIVA TÉCNICA DAS BITOLAS</p>
                        </div>
                        <div style="text-align: right; font-size: 8pt; font-family: monospace;">
                            <span>CONFORMIDADE LEGAL ABNT NBR 5410</span>
                        </div>
                    </div>

                    <div style="font-size: 8pt; line-height: 1.5; color: #1e293b; space-y-2;">
                        <h4 style="font-size: 9pt; font-weight: bold; margin: 8px 0 4px 0; color: #0f172a;">1. JUSTIFICATIVA TÉCNICA DAS BITOLAS ADOTADAS</h4>
                        ${htmlJustificativaBitolasImpressao()}

                        <h4 style="font-size: 9pt; font-weight: bold; margin: 8px 0 4px 0; color: #0f172a;">2. PADRÃO OBRIGATÓRIO DE CORES DOS CONDUTORES (ITEM 6.1.5.3)</h4>
                        <p style="margin: 0 0 6px 0;">
                            • <strong>Neutro</strong>: Azul-Claro exclusivo.<br>
                            • <strong>Proteção (Terra)</strong>: Verde ou Verde-Amarelo exclusivo.<br>
                            • <strong>Fase</strong>: Preto, Vermelho, Marrom, Branco ou Cinza.<br>
                            • <strong>Retorno de Lâmpada</strong>: Amarelo (distinto de neutro e terra).
                        </p>

                        <h4 style="font-size: 9pt; font-weight: bold; margin: 8px 0 4px 0; color: #0f172a;">3. OCUPAÇÃO DE ELETRODUTOS & PROTEÇÃO DR</h4>
                        <p style="margin: 0 0 6px 0;">
                            • <strong>Taxa de Ocupação (Item 6.2.11.1.6)</strong>: soma das áreas externas dos condutores ≤ 53% (1 condutor), 31% (2) ou 40% (3 ou mais) da área interna do eletroduto; diâmetro calculado por circuito${state.trechoAgrupadoNBR ? ` e no trecho com os circuitos agrupados (${state.trechoAgrupadoNBR.rotulo})` : ''}.<br>
                            • <strong>Dispositivo DR 30mA (Item 5.1.3.2)</strong>: Obrigatório em todos os circuitos de áreas molhadas e tomadas externas.
                        </p>
                    </div>

                    <div class="carimbo-tecnico" style="margin-top: 15px; padding: 10px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; font-size: 8pt;">
                        <div><strong>OBRA:</strong> ${nomeObra}</div>
                        <div><strong>RESP. TÉCNICO:</strong> ${projetista}</div>
                        <div><strong>DATA:</strong> ${dataHoje}</div>
                        <div><strong>FOLHA:</strong> 06 / 06</div>
                    </div>
                </div>
            `;

            // PRANCHA 07: AUTOMAÇÃO RESIDENCIAL (só quando incluída no projeto)
            const autom = (typeof obterResultadoAutomacao === 'function') ? obterResultadoAutomacao() : null;
            if (autom && typeof htmlPranchaAutomacao === 'function') {
                container.innerHTML = container.innerHTML.replace(/(<strong>FOLHA:<\/strong> \d{2}) \/ 06/g, '$1 / 07');
                container.insertAdjacentHTML('beforeend', `
                <div class="folha-prancha-abnt">
                    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h1 style="font-size: 16pt; font-weight: 900; margin: 0; color: #0f172a;">PRO-ELÉTRICA CAD NBR 5410</h1>
                            <p style="font-size: 9pt; margin: 0; color: #475569;">PRANCHA 07/07 — AUTOMAÇÃO RESIDENCIAL (${escHtml(autom.tec.nome)})</p>
                        </div>
                        <div style="text-align: right; font-size: 8pt; font-family: monospace;"><span>${autom.dispositivos.length} DISPOSITIVOS</span></div>
                    </div>
                    ${htmlPranchaAutomacao(autom, '')}
                    <div class="carimbo-tecnico" style="margin-top: 15px; padding: 10px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; font-size: 8pt;">
                        <div><strong>OBRA:</strong> ${nomeObra}</div>
                        <div><strong>RESP. TÉCNICO:</strong> ${projetista}</div>
                        <div><strong>DATA:</strong> ${dataHoje}</div>
                        <div><strong>FOLHA:</strong> 07 / 07</div>
                    </div>
                </div>`);
            }

            return true;
        }

        function gerarLinhasTabelaPdfCircuitos() {
            if (!state.circuitosCalculados || state.circuitosCalculados.length === 0) atualizarTabelas();
            let html = '';
            (state.circuitosCalculados || []).forEach(c => {
                const rotulo = c.tipo === 'Iluminação' ? 'ILUM' : c.tipo;
                const obrigatorio = c.idrTag && c.idrTag.includes('Obrigatório');
                const alerta = (c.alertas && c.alertas.length)
                    ? `<br><span style="color: #dc2626; font-weight: bold;">⚠ ${c.alertas.join(' ')}</span>` : '';
                html += `<tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 5px; font-weight: bold;">C${c.num}</td>
                    <td style="padding: 5px;">${c.nome}${alerta}</td>
                    <td style="padding: 5px;">${rotulo}</td>
                    <td style="padding: 5px;">${c.pot}</td>
                    <td style="padding: 5px;">${c.tensao} V</td>
                    <td style="padding: 5px;">${c.ibVal.toFixed(1)} A</td>
                    <td style="padding: 5px;">DJ ${c.disjuntor}A</td>
                    <td style="padding: 5px; font-weight: bold;">${c.cabo.replace('.', ',')}</td>
                    <td style="padding: 5px; color: ${obrigatorio ? '#dc2626' : '#059669'}; font-weight: bold;">${c.idrTag}</td>
                </tr>`;
            });
            return html;
        }

        function gerarLinhasTabelaPdfMateriais() {
            let html = '';
            const mats = (state && Array.isArray(state.quantitativoMateriaisDetalhado) && state.quantitativoMateriaisDetalhado.length > 0)
                ? state.quantitativoMateriaisDetalhado
                : null;

            if (mats) {
                mats.forEach(it => {
                    const unidDesc = it.unidade === 'm' ? 'metros' : (it.unidade === 'un' ? 'unidades' : (it.unidade || 'un'));
                    html += `<tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 5px; font-weight: bold;">${it.categoria || ''}</td>
                        <td style="padding: 5px;">${it.item || ''}</td>
                        <td style="padding: 5px; color: #475569;">${it.especificacao || ''}</td>
                        <td style="padding: 5px; font-weight: bold; text-align: right;">${it.qtdTotal || it.qtdCalculada || 0}</td>
                        <td style="padding: 5px;">${unidDesc}</td>
                    </tr>`;
                });
                return html;
            }

            const itens = [
                ['Condutores', 'Cabo Flexível de Cobre 750V 1,5 mm²', 'Isolação PVC 70°C Amarelo/Azul (Iluminação)', '150', 'metros'],
                ['Condutores', 'Cabo Flexível de Cobre 750V 2,5 mm²', 'Isolação PVC 70°C Vermelho/Azul/Verde (TUG)', '280', 'metros'],
                ['Condutores', 'Cabo Flexível de Cobre 750V 6,0 mm²', 'Isolação PVC 70°C Vermelho/Azul/Verde (Chuveiro)', '65', 'metros'],
                ['Condutores', 'Cabo Flexível de Cobre 750V 10,0 mm²', 'Prumada Vertical e Alimentador Secundário', '40', 'metros'],
                ['Tubulação', 'Eletroduto Flexível Corrugado 3/4" (25mm)', 'Anti-chamas PVC Amarelo/Laranja', '180', 'metros'],
                ['Tubulação', 'Eletroduto Flexível Reforçado 1" (32mm)', 'Para Prumada Shaft e Alimentador Geral', '45', 'metros'],
                ['Caixas', 'Caixa de Embutir 4x2" Termoplástica', 'Para tomadas e interruptores de parede', '32', 'unidades'],
                ['Caixas', 'Caixa Octogonal de Teto 4x4"', 'Para fixação de luminárias e passagem', '14', 'unidades'],
                ['Aparelhagem', 'Tomada 2P+T 10A / 250V (NBR 14136)', 'Módulos brancos com espelho', '24', 'unidades'],
                ['Aparelhagem', 'Tomada 2P+T 20A / 250V (NBR 14136)', 'Para cozinha, área de serviço e TUEs', '8', 'unidades'],
                ['Aparelhagem', 'Interruptores Simples e Three-Way', 'Com placas e parafusos de fixação', '12', 'unidades'],
                ['Proteção', 'Quadro de Distribuição de Embutir (QDT)', 'Barramento Bifásico/Trifásico DIN', '2', 'unidades'],
                ['Proteção', 'Disjuntores Termomagnéticos DIN', 'Curva C (10A, 16A, 20A, 32A, 50A)', '18', 'unidades'],
                ['Proteção', 'Interruptor Diferencial Residual (IDR)', 'Tetrapolar / Bipolar 40A / 30mA Sensibilidade', '2', 'unidades'],
                ['Proteção', 'Dispositivo de Proteção contra Surtos (DPS)', 'Classe II 20kA/275V com sinalizador', '4', 'unidades']
            ];

            itens.forEach(it => {
                html += `<tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 5px; font-weight: bold;">${it[0]}</td>
                    <td style="padding: 5px;">${it[1]}</td>
                    <td style="padding: 5px; color: #475569;">${it[2]}</td>
                    <td style="padding: 5px; font-weight: bold; text-align: right;">${it[3]}</td>
                    <td style="padding: 5px;">${it[4]}</td>
                </tr>`;
            });
            return html;
        }
    

        function setupFormulario() {
            const form = document.getElementById('formComodo');
            if (!form) return;

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const nome = document.getElementById('txtNome').value.trim() || 'Novo Ambiente';
                const tipo = document.getElementById('selTipo').value;
                const selPav = document.getElementById('selComodoPavimento');
                const destinoPavId = (selPav && selPav.value) ? selPav.value : state.pavimentoAtivoId;

                let largura = 4, comprimento = 4, area = 16, perimetro = 16;

                if (state.modoCalculo === 'cad') {
                    largura = parseFloat(document.getElementById('numLargura').value) || 4;
                    comprimento = parseFloat(document.getElementById('numComprimento').value) || 4;
                    area = largura * comprimento;
                    perimetro = 2 * (largura + comprimento);
                } else {
                    area = parseFloat(document.getElementById('numAreaManual').value) || 16;
                    perimetro = parseFloat(document.getElementById('numPerimManual').value) || 16;
                    largura = Math.sqrt(area);
                    comprimento = area / largura;
                }

                const cargasSalvar = JSON.parse(JSON.stringify(state.cargasFormulario));

                const selPassagem = document.getElementById('selPassagemTomadasComodo');
                const passagemTomadas = selPassagem ? selPassagem.value : 'horizontal';

                const selEspComodo = document.getElementById('selEspessuraParedeComodo');
                let espessuraComodo = null;
                if (selEspComodo && selEspComodo.value !== 'padrao') {
                    espessuraComodo = parseFloat(selEspComodo.value) || null;
                }

                if (state.comodoEmEdicaoId !== null) {
                    const idx = state.comodos.findIndex(c => String(c.id) === String(state.comodoEmEdicaoId));
                    if (idx !== -1) {
                        state.comodos[idx].nome = nome;
                        state.comodos[idx].tipo = tipo;
                        state.comodos[idx].pavimentoId = destinoPavId;
                        state.comodos[idx].largura = largura;
                        state.comodos[idx].comprimento = comprimento;
                        state.comodos[idx].area = area;
                        state.comodos[idx].perimetro = perimetro;
                        state.comodos[idx].cargas = cargasSalvar;
                        state.comodos[idx].passagemTomadas = passagemTomadas;
                        state.comodos[idx].espessuraParede = espessuraComodo;
                    }
                    fecharModalComodo();
                } else {
                    const comodoId = Date.now();
                    const comodosAndar = state.comodos.filter(c => c.pavimentoId === destinoPavId);
                    const novox = 120 + (comodosAndar.length % 3) * 230;
                    const novoy = 80 + Math.floor(comodosAndar.length / 3) * 200;

                    const novoComodo = {
                        id: comodoId,
                        pavimentoId: destinoPavId,
                        nome,
                        tipo,
                        largura,
                        comprimento,
                        area,
                        perimetro,
                        x: novox,
                        y: novoy,
                        cargas: cargasSalvar,
                        passagemTomadas: passagemTomadas,
                        espessuraParede: espessuraComodo
                    };
                    state.comodos.push(novoComodo);
                    gerarPontosEletricosParaComodo(novoComodo);
                    fecharModalComodo();
                }

                detectarProximidadeComodos();
                atualizarTudo();
                reconstruirCena3D();
            });

            const btnEx = document.getElementById('btnExemplo');
            if (btnEx) btnEx.addEventListener('click', carregarExemploInicial);
        }

        function gerarPontosEletricosParaComodo(c) {
            const w = c.largura * state.escala;
            const h = c.comprimento * state.escala;
            // NBR 5410 item 9.5.2.2.1: quantidade mínima de tomadas pela função do ambiente (js/nbr5410.js)
            const qtdTugs = NBR5410.tomadasMinimas(c.nome, c.area, c.perimetro);
            const potsTugs = NBR5410.potenciasTomadas(c.nome, qtdTugs, 0);
            // destinação de cada tomada pelo uso do ambiente (geladeira, cabeceira, TV...)
            const destinosTugs = NBR5410.destinacoesTomadas(c.nome, qtdTugs, 0);
            const margem = Math.max(4, Math.min(14, Math.min(w, h) * 0.25));

            // 1. PONTO DE ILUMINAÇÃO CENTRAL NBR 5410 (PERSISTENTE EM state.pontosEletricos)
            const jaTemIlum = state.pontosEletricos.some(p => p.comodoId === c.id && p.tipo === 'ILUM');
            if (!jaTemIlum) {
                state.pontosEletricos.push({
                    id: 'pt_ilum_' + c.id + '_' + Date.now(),
                    comodoId: c.id,
                    pavimentoId: c.pavimentoId || 'terreo',
                    tipo: 'ILUM',
                    nome: `Iluminação ${c.nome}`,
                    pot: 100 + (c.area >= 6 ? Math.floor((c.area - 6) / 4) * 60 : 0),
                    tensao: 127,
                    altura: 'teto',
                    x: c.x + w / 2,
                    y: c.y + h / 2
                });
            }

            // 1.1 INTERRUPTOR SIMPLES COM RETORNO DE LÂMPADA (NBR 5410 / NBR 5444)
            const jaTemInt = state.pontosEletricos.some(p => p.comodoId === c.id && p.tipo === 'INTERRUPTOR');
            if (!jaTemInt) {
                const letraComando = String.fromCharCode(97 + (state.comodos.findIndex(cm => cm.id === c.id) % 26));
                state.pontosEletricos.push({
                    id: 'pt_int_' + c.id + '_' + Date.now(),
                    comodoId: c.id,
                    pavimentoId: c.pavimentoId || 'terreo',
                    tipo: 'INTERRUPTOR',
                    nome: `Interruptor ${c.nome}`,
                    comando: letraComando,
                    pot: 0,
                    tensao: 127,
                    altura: 'media',
                    x: c.x + margem,
                    y: c.y + h - margem
                });
            }

            // 2. TOMADAS TUG DISTRIBUÍDAS UNIFORMEMENTE PELO PERÍMETRO (item 9.5.2.2.1: "espaçados
            // tão uniformemente quanto possível"; antes havia só 6 posições fixas e cozinhas
            // grandes ficavam abaixo do mínimo)
            const posicoesParede = [];
            const wi = Math.max(1, w - 2 * margem), hi = Math.max(1, h - 2 * margem);
            const perPx = 2 * (wi + hi);
            for (let k = 0; k < qtdTugs; k++) {
                let d = ((k + 0.5) / qtdTugs) * perPx;
                let x, y;
                if (d < wi) { x = c.x + margem + d; y = c.y + h - margem; }
                else if ((d -= wi) < hi) { x = c.x + w - margem; y = c.y + h - margem - d; }
                else if ((d -= hi) < wi) { x = c.x + w - margem - d; y = c.y + margem; }
                else { d -= wi; x = c.x + margem; y = c.y + margem + d; }
                posicoesParede.push({ x, y });
            }

            for (let i = 0; i < posicoesParede.length; i++) {
                const pt = posicoesParede[i];
                state.pontosEletricos.push({
                    id: 'pt_' + Date.now() + '_' + Math.floor(Math.random() * 10000) + '_' + i,
                    comodoId: c.id,
                    pavimentoId: c.pavimentoId || 'terreo',
                    tipo: 'TUG',
                    nome: `TUG ${destinosTugs[i].destino}`,
                    destino: destinosTugs[i].destino,
                    pot: potsTugs[i] || 100,                 // item 9.5.2.2.2
                    tensao: 127,
                    altura: destinosTugs[i].altura,
                    x: pt.x,
                    y: pt.y
                });
            }

            // 3. CARGAS ESPECÍFICAS (TUE)
            if (c.cargas && c.cargas.length > 0) {
                c.cargas.forEach((cg, idx) => {
                    if (cg.tipo === 'TUE') {
                        state.pontosEletricos.push({
                            id: 'pt_tue_' + Date.now() + '_' + idx,
                            comodoId: c.id,
                            pavimentoId: c.pavimentoId || 'terreo',
                            tipo: 'TUE',
                            nome: cg.nome,
                            pot: cg.potencia,
                            tensao: cg.tensao || 220,
                            altura: cg.altura || 'alta',
                            x: c.x + w - 24,
                            y: c.y + 24 + idx * 22
                        });
                    }
                });
            }
        }

        function limparCamposFormulario() {
            document.getElementById('txtNome').value = '';
            document.getElementById('selTipo').value = 'geral';
            document.getElementById('numLargura').value = '4.0';
            document.getElementById('numComprimento').value = '4.0';
            document.getElementById('numAreaManual').value = '';
            document.getElementById('numPerimManual').value = '';
            document.getElementById('txtCargaNome').value = '';
            document.getElementById('numCargaPot').value = '';
            document.getElementById('selSugestaoBR').value = '';
        }

        // CARREGA PLANTA DE EXEMPLO COMPLETA COM 2 PAVIMENTOS (TÉRREO E SUPERIOR)
        function carregarExemploInicial() {
            state.comodoEmEdicaoId = null;
            state.cargasFormulario = [];
            state.pontosEletricos = [];
            state.eletrodutoWaypoints = {};
            atualizarModoFormulario(false);

            state.pavimentos = [
                { id: 'terreo', nome: 'Pavimento Térreo', nivel: 0, alturaPeDireito: 2.8, temLajePiso: true, tipoLajePiso: 'concreto', espessuraLajePiso: 0.20, temLajeTeto: true, tipoLajeTeto: 'concreto', espessuraLajeTeto: 0.15, tipoPassagemCabos: 'teto' },
                { id: 'superior', nome: '1º Pavimento (Superior)', nivel: 1, alturaPeDireito: 2.8, temLajePiso: true, tipoLajePiso: 'concreto', espessuraLajePiso: 0.20, temLajeTeto: true, tipoLajeTeto: 'concreto', espessuraLajeTeto: 0.15, tipoPassagemCabos: 'teto' }
            ];

            state.comodos = [
                // 1. PAVIMENTO TÉRREO
                {
                    id: 1,
                    pavimentoId: 'terreo',
                    nome: 'Sala de Estar',
                    tipo: 'geral',
                    largura: 4.5,
                    comprimento: 4.0,
                    area: 18.0,
                    perimetro: 17.0,
                    x: 120,
                    y: 80,
                    cargas: [
                        { id: 'c1', nome: 'Smart TV 55" LED', tipo: 'TUG', potencia: 120, tensao: 127, altura: 'media' },
                        { id: 'c2', nome: 'Ar Condicionado 12.000 BTU', tipo: 'TUE', potencia: 1150, tensao: 220, altura: 'alta' }
                    ]
                },
                {
                    id: 2,
                    pavimentoId: 'terreo',
                    nome: 'Cozinha',
                    tipo: 'servico',
                    largura: 3.5,
                    comprimento: 4.0,
                    area: 14.0,
                    perimetro: 15.0,
                    x: 300,
                    y: 80,
                    cargas: [
                        { id: 'c3', nome: 'Torneira Elétrica Cozinha', tipo: 'TUE', potencia: 5500, tensao: 220, altura: 'media' },
                        { id: 'c4', nome: 'Forno Elétrico de Embutir', tipo: 'TUE', potencia: 2800, tensao: 220, altura: 'media' },
                        { id: 'c5', nome: 'Geladeira Frost Free', tipo: 'TUG', potencia: 300, tensao: 127, altura: 'media' }
                    ]
                },
                {
                    id: 3,
                    pavimentoId: 'terreo',
                    nome: 'Banheiro Social Térreo',
                    tipo: 'servico',
                    largura: 2.0,
                    comprimento: 3.0,
                    area: 6.0,
                    perimetro: 10.0,
                    x: 440,
                    y: 80,
                    cargas: [
                        { id: 'c6', nome: 'Chuveiro Elétrico Térreo', tipo: 'TUE', potencia: 6800, tensao: 220, altura: 'alta' }
                    ]
                },

                // 2. 1º PAVIMENTO (SUPERIOR)
                {
                    id: 4,
                    pavimentoId: 'superior',
                    nome: 'Suíte Master (Superior)',
                    tipo: 'geral',
                    largura: 4.5,
                    comprimento: 4.0,
                    area: 18.0,
                    perimetro: 17.0,
                    x: 120,
                    y: 80,
                    cargas: [
                        { id: 'c7', nome: 'Ar Condicionado Inverter 18.000 BTU', tipo: 'TUE', potencia: 1700, tensao: 220, altura: 'alta' },
                        { id: 'c8', nome: 'Smart TV Suíte', tipo: 'TUG', potencia: 100, tensao: 127, altura: 'media' }
                    ]
                },
                {
                    id: 5,
                    pavimentoId: 'superior',
                    nome: 'Banheiro da Suíte',
                    tipo: 'servico',
                    largura: 2.5,
                    comprimento: 4.0,
                    area: 10.0,
                    perimetro: 13.0,
                    x: 300,
                    y: 80,
                    cargas: [
                        { id: 'c9', nome: 'Chuveiro Elétrico Turbo Master', tipo: 'TUE', potencia: 7500, tensao: 220, altura: 'alta' },
                        { id: 'c10', nome: 'Hidromassagem', tipo: 'TUE', potencia: 1500, tensao: 220, altura: 'baixa' }
                    ]
                },
                {
                    id: 6,
                    pavimentoId: 'superior',
                    nome: 'Dormitório 2 (Superior)',
                    tipo: 'geral',
                    largura: 3.5,
                    comprimento: 3.5,
                    area: 12.25,
                    perimetro: 14.0,
                    x: 120,
                    y: 240,
                    cargas: [
                        { id: 'c11', nome: 'Ar Condicionado Inverter 9.000 BTU', tipo: 'TUE', potencia: 900, tensao: 220, altura: 'alta' }
                    ]
                }
            ];

            // Gerar tomadas automáticas para todos os cômodos de ambos os pavimentos
            state.comodos.forEach(c => gerarPontosEletricosParaComodo(c));

            // Curvas nos eletrodutos
            state.eletrodutoWaypoints = {
                1: [{ x: 130, y: 55 }],
                3: [{ x: 260, y: 65 }]
            };

            // Escada Arquitetônica interligando Sala de Estar (Térreo) ao Pavimento Superior
            state.escadas = [
                {
                    id: 'escada_exemplo_1',
                    comodoId: 1,
                    comodoNome: 'Sala de Estar',
                    pavimentoOrigemId: 'terreo',
                    pavimentoDestinoId: 'superior',
                    x: 130,
                    y: 110,
                    largura: 0.95,
                    comprimento: 2.60,
                    direcao: 'H_DIR',
                    orientacao: 'H',
                    numDegraus: 16
                }
            ];

            renderizarSeletorPavimentos();
            detectarProximidadeComodos();
            atualizarTudo();
            reconstruirCena3D();
        }

        // EVENTOS NO CANVAS CAD 2D (Aba 1) - ARRASTAR E REDIMENSIONAR CÔMODOS
        function setupCanvasEvents() {
            const canvas = document.getElementById('cadCanvas');
            if (!canvas) return;

            canvas.addEventListener('mousedown', (e) => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = larguraLogicaCanvas(canvas) / rect.width;
                const scaleY = alturaLogicaCanvas(canvas) / rect.height;
                const mx = (e.clientX - rect.left) * scaleX;
                const my = (e.clientY - rect.top) * scaleY;

                if (state.ferramentaAtiva === 'draw') {
                    state.linhaAtual = [{ x: mx, y: my, pavimentoId: state.pavimentoAtivoId }];
                    return;
                }

                // 1. Arrastar Alimentação Externa (visível no térreo)
                if (state.pavimentoAtivoId === 'terreo') {
                    const alim = state.alimentacaoExterna;
                    if (mx >= alim.x && mx <= alim.x + alim.w && my >= alim.y && my <= alim.y + alim.h) {
                        state.arrastando = { tipo: 'alimExterna' };
                        state.offsetArrasto = { x: mx - alim.x, y: my - alim.y };
                        return;
                    }
                }

                // 2. Arrastar QDT ou Prumada
                if (mx >= state.qdtPos.x && mx <= state.qdtPos.x + state.qdtPos.w && my >= state.qdtPos.y && my <= state.qdtPos.y + state.qdtPos.h) {
                    state.arrastando = { tipo: 'qdt' };
                    state.offsetArrasto = { x: mx - state.qdtPos.x, y: my - state.qdtPos.y };
                    return;
                }

                // 2b. Arrastar Prumada (somente se ativa)
                if (state.prumadaAtiva !== false) {
                    const distPru = Math.sqrt(Math.pow(mx - state.prumadaPos.x, 2) + Math.pow(my - state.prumadaPos.y, 2));
                    if (distPru <= 14) {
                        state.arrastando = { tipo: 'prumada' };
                        state.offsetArrasto = { x: mx - state.prumadaPos.x, y: my - state.prumadaPos.y };
                        return;
                    }
                }

                // 2c. Excluir Escada pelo botão [x]
                if (state.escadas && state.escadas.length > 0) {
                    for (let esc of state.escadas) {
                        const ehOrigem = (esc.pavimentoOrigemId === state.pavimentoAtivoId);
                        const ehDestino = (esc.pavimentoDestinoId === state.pavimentoAtivoId);
                        if (!ehOrigem && !ehDestino) continue;

                        const isVert = (esc.orientacao === 'V');
                        const wPx = (isVert ? esc.largura : esc.comprimento) * state.escala;
                        const btnBx = esc.x + wPx - 9;
                        const btnBy = esc.y + 9;
                        const distBtn = Math.sqrt(Math.pow(mx - btnBx, 2) + Math.pow(my - btnBy, 2));
                        if (distBtn <= 14) {
                            if (confirm(`Deseja remover a escada do cômodo "${esc.comodoNome}"?`)) {
                                removerEscadaId(esc.id);
                            }
                            return;
                        }
                    }
                }

                // 3. Clicar em Transições
                for (let t of state.transicoes.filter(tr => tr.pavimentoId === state.pavimentoAtivoId)) {
                    const distTrans = Math.sqrt(Math.pow(mx - t.x, 2) + Math.pow(my - t.y, 2));
                    if (distTrans <= 20) {
                        abrirModalTransicao(t.key, t.nomeA, t.nomeB);
                        return;
                    }
                }

                // 4. Redimensionar ou Arrastar Cômodos do pavimento ativo
                const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);
                
                // Primeiro testa alça de redimensionamento no canto inferior direito (SE)
                for (let c of comodosAndar) {
                    if (c.fixado || state.comodosFixados) continue;
                    const cw = c.largura * state.escala;
                    const ch = c.comprimento * state.escala;
                    const seX = c.x + cw;
                    const seY = c.y + ch;
                    if (Math.abs(mx - seX) <= 14 && Math.abs(my - seY) <= 14) {
                        state.arrastando = {
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

                // Segundo testa o corpo do cômodo para arrastar ou selecionar
                for (let c of comodosAndar) {
                    const cw = c.largura * state.escala;
                    const ch = c.comprimento * state.escala;
                    if (mx >= c.x && mx <= c.x + cw && my >= c.y && my <= c.y + ch) {
                        // 1. Verifica clique no botão [✕] de exclusão rápida se estiver selecionado
                        if (String(state.comodoEmEdicaoId) === String(c.id)) {
                            const btnSize = 22;
                            const btnX = c.x + cw - btnSize - 2;
                            const btnY = c.y + 2;
                            if (mx >= btnX && mx <= btnX + btnSize && my >= btnY && my <= btnY + btnSize) {
                                removerComodoId(c.id);
                                return;
                            }
                        }

                        // 2. Seleciona o cômodo na planta e na barra lateral
                        state.comodoEmEdicaoId = c.id;
                        state.pontoSelecionadoId = null;
                        desenharCAD();
                        desenharInstalacoes();
                        renderListaComodosSidebar();

                        // 3. Se estiver com bloqueio de modificação (fixado), impede arrasto
                        if (c.fixado || state.comodosFixados) {
                            mostrarNotificacaoToast(`🔒 Cômodo "${c.nome}" selecionado (posição travada). Clique no [✕] vermelho ou pressione [Delete] para excluir.`, 'info');
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

                        state.arrastando = {
                            tipo: 'move_comodo',
                            comodo: c,
                            iniciouNoLote: iniciouNoLote
                        };
                        state.offsetArrasto = { x: mx - c.x, y: my - c.y };
                        return;
                    }
                }

                // Clicou com botão esquerdo no espaço vazio: limpa seleção e move canvas (Pan)
                if (e.button === 0) {
                    if (state.comodoEmEdicaoId !== null) {
                        state.comodoEmEdicaoId = null;
                        desenharCAD();
                        desenharInstalacoes();
                        renderListaComodosSidebar();
                    }
                    state.arrastando = {
                        tipo: 'pan_canvas',
                        lastMx: mx,
                        lastMy: my
                    };
                    canvas.style.cursor = 'grabbing';
                }
            });

            canvas.addEventListener('dblclick', (e) => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = larguraLogicaCanvas(canvas) / rect.width;
                const scaleY = alturaLogicaCanvas(canvas) / rect.height;
                const mx = (e.clientX - rect.left) * scaleX;
                const my = (e.clientY - rect.top) * scaleY;

                const comodosAndar = state.comodos.filter(c => c.pavimentoId === state.pavimentoAtivoId);
                for (let c of comodosAndar) {
                    const cw = c.largura * state.escala;
                    const ch = c.comprimento * state.escala;
                    if (mx >= c.x && mx <= c.x + cw && my >= c.y && my <= c.y + ch) {
                        // Abre pop-up para adição rápida de ponto elétrico ou edição
                        abrirModalAdicionarPontoRapido(c, mx, my);
                        return;
                    }
                }
            });

            // Menu de contexto com botão direito do mouse no canvas CAD
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

            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = larguraLogicaCanvas(canvas) / rect.width;
                const scaleY = alturaLogicaCanvas(canvas) / rect.height;
                const mx = (e.clientX - rect.left) * scaleX;
                const my = (e.clientY - rect.top) * scaleY;

                if (state.ferramentaAtiva === 'draw' && state.linhaAtual) {
                    state.linhaAtual.push({ x: mx, y: my, pavimentoId: state.pavimentoAtivoId });
                    desenharCAD();
                    return;
                }

                // Atualização dinâmica de cursor quando não estiver arrastando
                if (!state.arrastando) {
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

                    if (sobreAlca) {
                        canvas.style.cursor = 'nwse-resize';
                    } else if (sobreComodo) {
                        canvas.style.cursor = 'move';
                    } else if (mx >= state.qdtPos.x && mx <= state.qdtPos.x + state.qdtPos.w && my >= state.qdtPos.y && my <= state.qdtPos.y + state.qdtPos.h) {
                        canvas.style.cursor = 'grab';
                    } else {
                        canvas.style.cursor = 'grab';
                    }
                    return;
                }

                const arr = state.arrastando;

                if (arr.tipo === 'pan_canvas') {
                    const dx = mx - arr.lastMx;
                    const dy = my - arr.lastMy;
                    arr.lastMx = mx;
                    arr.lastMy = my;
                    moverProjetoOffset(dx, dy);
                    desenharCAD();
                    desenharInstalacoes();
                    return;
                } else if (arr.tipo === 'alimExterna') {
                    state.alimentacaoExterna.x = mx - state.offsetArrasto.x;
                    state.alimentacaoExterna.y = my - state.offsetArrasto.y;
                    desenharCAD();
                    desenharInstalacoes();
                    atualizarTabelas();
                } else if (arr.tipo === 'qdt') {
                    state.qdtPos.x = mx - state.offsetArrasto.x;
                    state.qdtPos.y = my - state.offsetArrasto.y;
                    desenharCAD();
                    desenharInstalacoes();
                    atualizarTabelas();
                } else if (arr.tipo === 'prumada') {
                    state.prumadaPos.x = mx - state.offsetArrasto.x;
                    state.prumadaPos.y = my - state.offsetArrasto.y;
                    desenharCAD();
                    desenharInstalacoes();
                    atualizarTabelas();
                } else if (arr.tipo === 'resize_comodo') {
                    const c = arr.comodo;
                    if (c.fixado || state.comodosFixados) return;

                    const deltaW = (mx - arr.startMx) / state.escala;
                    const deltaH = (my - arr.startMy) / state.escala;
                    const snapRes = calcularEncaixeResizeMagnetico(c, arr.startW + deltaW, arr.startH + deltaH, state.escala);
                    let novaLarg = snapRes.largura;
                    let novoComp = snapRes.comprimento;
                    state.linhasGuiaMagnetica = snapRes.guias;

                    // Restrição ao perímetro do lote: não permitir expandir para fora do lote se estiver dentro
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

                        // Reposiciona proporcionalmente os pontos elétricos
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
                        desenharCAD();
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
                        desenharCAD();
                    }
                }
            });

            canvas.addEventListener('mouseleave', () => {
                const tooltip = document.getElementById('tooltipInstalacoesCanvas');
                if (tooltip) tooltip.classList.add('hidden');
                if (state.linhasGuiaMagnetica && state.linhasGuiaMagnetica.length > 0) {
                    state.linhasGuiaMagnetica = [];
                    desenharCAD();
                }
            });

            canvas.addEventListener('mouseup', () => {
                state.linhasGuiaMagnetica = [];
                if (state.linhaAtual) {
                    state.linhasMaoLivre.push(state.linhaAtual);
                    state.linhaAtual = null;
                }
                if (state.arrastando) {
                    const eraPan = (state.arrastando.tipo === 'pan_canvas');
                    state.arrastando = null;
                    if (!eraPan) {
                        reconstruirCena3D();
                        salvarProjetoSilencioso();
                    }
                    desenharCAD();
                    desenharInstalacoes();
                }
                canvas.style.cursor = 'grab';
            });
        }

        // EVENTOS NO CANVAS DE INSTALAÇÕES 2D (Aba 2) - SUPORTA ARRASTAR/REDIMENSIONAR CÔMODOS
        

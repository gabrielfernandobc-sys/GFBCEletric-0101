/* PRO-ELÉTRICA CAD — 07-importacao-cad-bim.js
   Importação DXF/DWG/IFC/JSON, regime do imóvel e ajuste do terreno.
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        // ==========================================
        // SISTEMA DE IMPORTAÇÃO AUTOCAD & BIM
        // ==========================================

        function abrirModalImportar() {
            const m = document.getElementById('modalImportarProjeto');
            if (m) m.classList.remove('hidden');
        }

        function fecharModalImportar() {
            const m = document.getElementById('modalImportarProjeto');
            if (m) m.classList.add('hidden');
        }

        function selecionarAbaImport(tipo) {
            state.tipoAbaImport = tipo;
            const btnCad = document.getElementById('btnTabImportCad');
            const btnBim = document.getElementById('btnTabImportBim');
            const lblExt = document.getElementById('lblExtensoesPermitidas');
            const input = document.getElementById('inputArquivoImport');

            if (tipo === 'cad') {
                if (btnCad) {
                    btnCad.className = 'py-2 px-3 rounded-lg font-bold text-xs transition bg-indigo-600 text-white flex items-center justify-center gap-2';
                }
                if (btnBim) {
                    btnBim.className = 'py-2 px-3 rounded-lg font-bold text-xs transition text-slate-400 hover:text-white flex items-center justify-center gap-2';
                }
                if (lblExt) lblExt.innerText = 'Formatos suportados: .DXF, .DWG (AutoCAD 2D)';
                if (input) input.accept = '.dxf,.dwg,.txt';
            } else {
                if (btnCad) {
                    btnCad.className = 'py-2 px-3 rounded-lg font-bold text-xs transition text-slate-400 hover:text-white flex items-center justify-center gap-2';
                }
                if (btnBim) {
                    btnBim.className = 'py-2 px-3 rounded-lg font-bold text-xs transition bg-indigo-600 text-white flex items-center justify-center gap-2';
                }
                if (lblExt) lblExt.innerText = 'Formatos suportados: .IFC, .OBJ, .JSON (Modelos BIM)';
                if (input) input.accept = '.ifc,.obj,.json,.txt';
            }
        }

        function setupImportDragAndDrop() {
            const dropzone = document.getElementById('dropzoneArquivo');
            if (!dropzone) return;

            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.add('border-indigo-400', 'bg-indigo-950/20');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.remove('border-indigo-400', 'bg-indigo-950/20');
                }, false);
            });

            dropzone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                if (files && files.length > 0) {
                    carregarArquivoDoInput(files[0]);
                }
            }, false);
        }

        function arquivoSelecionadoHandler(event) {
            const files = event.target.files;
            if (files && files.length > 0) {
                carregarArquivoDoInput(files[0]);
            }
        }

        function carregarArquivoDoInput(file) {
            const lbl = document.getElementById('lblArquivoSelecionado');
            const nome = file.name.toLowerCase();

            if (lbl) {
                lbl.innerText = `Arquivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                lbl.classList.remove('hidden');
            }

            if (nome.endsWith('.dwg')) {
                // DWG é um formato binário fechado: não dá para lê-lo no navegador
                state.arquivoImportadoCache = null;
                if (lbl) lbl.innerText = `Arquivo: ${file.name} — formato DWG não suportado`;
                alert('Arquivos .DWG (formato binário do AutoCAD) não podem ser lidos diretamente.\n\n' +
                      'Salve a planta como DXF e importe o arquivo .dxf:\n' +
                      '• AutoCAD: Arquivo › Salvar como › AutoCAD DXF (*.dxf)\n' +
                      '• Sem AutoCAD: DWG TrueView ou ODA File Converter (gratuitos) convertem DWG em DXF.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                let text;
                try { text = new TextDecoder('utf-8', { fatal: true }).decode(e.target.result); }
                catch (erroUtf8) { text = new TextDecoder('windows-1252').decode(e.target.result); }
                let tipo = 'dxf';
                if (nome.endsWith('.ifc')) tipo = 'ifc';
                else if (nome.endsWith('.obj')) tipo = 'obj';
                else if (nome.endsWith('.json')) tipo = 'json';
                else if (nome.endsWith('.dxf')) tipo = 'dxf';

                state.arquivoImportadoCache = {
                    nome: file.name,
                    tipo: tipo,
                    conteudo: text
                };
            };
            reader.readAsArrayBuffer(file);
        }

        function processarArquivoImportado() {
            if (!state.arquivoImportadoCache) {
                alert('Por favor, selecione ou arraste um arquivo (.dxf, .ifc, .obj, .json) ou teste com um dos botões demonstrativos!');
                return;
            }

            const opcoes = {
                criarComodos: document.getElementById('chkExtrairComodos') ? document.getElementById('chkExtrairComodos').checked : true,
                projetarUnderlay: document.getElementById('chkProjetarUnderlay') ? document.getElementById('chkProjetarUnderlay').checked : true,
                destino: document.getElementById('selDestinoImport') ? document.getElementById('selDestinoImport').value : 'ativo',
                escala: document.getElementById('selEscalaImport') ? parseFloat(document.getElementById('selEscalaImport').value) : NaN   // NaN = automático
            };

            const cache = state.arquivoImportadoCache;
            if (cache.tipo === 'dxf') {
                if (!cache.conteudo) {
                    alert('O conteúdo do arquivo DXF não pôde ser lido. Selecione o arquivo novamente.');
                    return;
                }
                executarParseDXF(cache.conteudo, opcoes);
            } else if (cache.tipo === 'ifc') {
                if (!cache.conteudo) {
                    carregarExemploIfc();
                    fecharModalImportar();
                    return;
                }
                executarParseIFC(cache.conteudo, opcoes);
            } else {
                executarParseJSONouGenerico(cache.conteudo, opcoes);
            }

            fecharModalImportar();
        }

        // Tipo do ambiente pelo nome (áreas molhadas/serviço usam regras próprias de TUG na NBR 5410)
        function tipoAmbientePorNome(nome) {
            const n = (nome || '').toLowerCase();
            return /cozinha|copa|banh|bwc|wc\b|lavabo|lavand|servi[çc]o|a\.?\s*s\.?$|gourmet|churrasq/.test(n) ? 'servico' : 'geral';
        }

        function executarParseDXF(dxfContent, opcoes) {
            let r;
            try {
                r = ImportadorDXF.analisar(dxfContent, { fatorMetros: isFinite(opcoes.escala) ? opcoes.escala : undefined });
            } catch (err) {
                console.error('Erro no parse DXF:', err);
                alert('Não foi possível ler o arquivo DXF: ' + err.message);
                return;
            }
            if (!r.totalEntidades) {
                alert('Nenhum desenho encontrado no arquivo DXF (a seção ENTITIES está vazia ou o arquivo é um DXF binário).\nSalve como "DXF ASCII" e tente novamente.');
                return;
            }

            // Escala real: 1 m do desenho = state.escala pixels (mesma escala dos cômodos)
            const E = state.escala || 40;
            const baseX = (state.terreno && isFinite(state.terreno.x)) ? state.terreno.x + E : 80;
            const baseY = (state.terreno && isFinite(state.terreno.y)) ? state.terreno.y + E : 60;
            const px = X => baseX + (X - r.ext.minX) * E;
            const py = Y => baseY + (r.ext.maxY - Y) * E;       // DXF tem Y para cima; o canvas, para baixo

            // Desenho de fundo (underlay)
            const underlay = [];
            r.segmentos.forEach(sg => underlay.push({ tipo: 'linha', x1: px(sg.x1), y1: py(sg.y1), x2: px(sg.x2), y2: py(sg.y2) }));
            r.circulos.forEach(c => underlay.push({ tipo: 'circulo', x: px(c.x), y: py(c.y), r: Math.max(1, c.r * E) }));
            r.arcos.forEach(ar => {
                let a1 = ar.a1, a2 = ar.a2; if (a2 < a1) a2 += 360;
                const passos = Math.max(4, Math.ceil((a2 - a1) / 15));
                for (let k = 0; k < passos; k++) {
                    const t1 = (a1 + (a2 - a1) * k / passos) * Math.PI / 180, t2 = (a1 + (a2 - a1) * (k + 1) / passos) * Math.PI / 180;
                    underlay.push({ tipo: 'linha', x1: px(ar.x + ar.r * Math.cos(t1)), y1: py(ar.y + ar.r * Math.sin(t1)), x2: px(ar.x + ar.r * Math.cos(t2)), y2: py(ar.y + ar.r * Math.sin(t2)) });
                }
            });
            r.textos.forEach(t => underlay.push({ tipo: 'texto', x: px(t.x), y: py(t.y), texto: textoSeguro(t.texto) }));
            if (opcoes.projetarUnderlay) {
                state.cadUnderlay = underlay;
                state.exibirCadUnderlay = true;
                const chk = document.getElementById('chkCadUnderlay');
                if (chk) chk.checked = true;
            }

            // Cômodos com as medidas reais da planta
            let criados = [];
            if (opcoes.criarComodos && r.comodos.length > 0) {
                let pavId = state.pavimentoAtivoId;
                if (opcoes.destino === 'novo') {
                    const base = obterPavimentoAtivo() || state.pavimentos[0] || {};
                    const nivel = Math.max(0, ...state.pavimentos.map(pv => pv.nivel || 0)) + 1;
                    const novoPav = Object.assign({}, base, { id: 'pav_' + Date.now(), nome: `Pavimento Importado ${nivel}`, nivel });
                    state.pavimentos.push(novoPav);
                    pavId = novoPav.id;
                    state.pavimentoAtivoId = pavId;
                }
                const agora = Date.now();
                criados = r.comodos.map((cm, i) => {
                    const cmd = {
                        id: agora + i,
                        pavimentoId: pavId,
                        nome: textoSeguro(cm.nome),
                        tipo: tipoAmbientePorNome(cm.nome),
                        largura: cm.largura,
                        comprimento: cm.comprimento,
                        area: Math.round(cm.largura * cm.comprimento * 100) / 100,
                        perimetro: Math.round((cm.largura + cm.comprimento) * 2 * 100) / 100,
                        x: px(cm.xMin),
                        y: py(cm.yMin + cm.comprimento),
                        cargas: []
                    };
                    gerarPontosEletricosParaComodo(cmd);
                    return cmd;
                });
                // substitui os cômodos do pavimento de destino (e os pontos que eram deles)
                const removidos = new Set(state.comodos.filter(c => c.pavimentoId === pavId).map(c => c.id));
                state.comodos = state.comodos.filter(c => c.pavimentoId !== pavId).concat(criados);
                state.pontosEletricos = state.pontosEletricos.filter(p => !removidos.has(p.comodoId));
            }

            renderizarSeletorPavimentos();
            atualizarTudo();
            reconstruirCena3D();

            const resumo = [
                `Unidade do desenho: ${r.unidade} (${r.unidadeDetectadaPor})`,
                `Elementos lidos: ${r.segmentos.length} trechos de linha, ${r.circulos.length + r.arcos.length} círculos/arcos, ${r.textos.length} textos`
            ];
            if (!opcoes.criarComodos) {
                resumo.push('Reconhecimento de cômodos desativado: a planta foi projetada só como desenho de fundo.');
            } else if (criados.length) {
                resumo.push(`Cômodos criados (${criados.length}):`);
                criados.forEach(c => resumo.push(`  • ${c.nome}: ${c.largura.toFixed(2).replace('.', ',')} × ${c.comprimento.toFixed(2).replace('.', ',')} m`));
            } else {
                resumo.push('Nenhum cômodo foi reconhecido: o arquivo não tem polilinhas fechadas com tamanho de ambiente nem nomes de ambientes (ex.: "SALA") cercados por paredes.');
                resumo.push('A planta foi mantida como desenho de fundo para você traçar os cômodos por cima.');
            }
            alert('Importação DXF concluída\n\n' + resumo.join('\n'));
        }

        function executarParseIFC(ifcContent, opcoes) {
            try {
                const linhas = ifcContent.split(/\r\n|\r|\n/);
                const storeys = [];
                const spaces = [];

                linhas.forEach(linha => {
                    const l = linha.trim();
                    if (l.includes('IFCBUILDINGSTOREY')) {
                        const match = l.match(/'([^']+)'/g);
                        if (match && match.length > 0) {
                            const nome = match[0].replace(/'/g, '');
                            storeys.push(textoSeguro(nome));
                        }
                    } else if (l.includes('IFCSPACE')) {
                        const match = l.match(/'([^']+)'/g);
                        if (match && match.length > 0) {
                            const nome = match[0].replace(/'/g, '');
                            spaces.push(textoSeguro(nome));
                        }
                    }
                });

                if (storeys.length > 0 && opcoes.destino === 'novo') {
                    state.pavimentos = storeys.map((st, idx) => ({
                        id: 'pav_ifc_' + (idx + 1),
                        nome: st,
                        nivel: idx,
                        alturaPeDireito: 2.8
                    }));
                    state.pavimentoAtivoId = state.pavimentos[0].id;
                    renderizarSeletorPavimentos();
                }

                if (spaces.length === 0) {
                    carregarExemploIfc();
                    return;
                }

                const nomesParaCriar = spaces.slice(0, 8);
                const novosComodos = [];
                let posX = 120;
                let posY = 80;

                nomesParaCriar.forEach((spNome, idx) => {
                    const id = Date.now() + idx;
                    const nomeLower = spNome.toLowerCase();
                    const ehServico = nomeLower.includes('cozinha') || nomeLower.includes('banheiro') || nomeLower.includes('lavanderia') || nomeLower.includes('área');
                    
                    let w = 4.0, c = 4.0;
                    if (nomeLower.includes('banheiro') || nomeLower.includes('wc')) { w = 2.0; c = 3.0; }
                    else if (nomeLower.includes('sala')) { w = 5.0; c = 4.5; }
                    else if (nomeLower.includes('cozinha')) { w = 3.5; c = 4.0; }

                    const novo = {
                        id: id,
                        pavimentoId: state.pavimentoAtivoId,
                        nome: spNome,
                        tipo: ehServico ? 'servico' : 'geral',
                        largura: w,
                        comprimento: c,
                        area: w * c,
                        perimetro: (w + c) * 2,
                        x: posX,
                        y: posY,
                        cargas: []
                    };

                    gerarPontosEletricosParaComodo(novo);
                    novosComodos.push(novo);

                    posX += (w * state.escala) + 20;
                    if (posX > 550) {
                        posX = 120;
                        posY += (c * state.escala) + 20;
                    }
                });

                state.comodos = state.comodos.filter(c => c.pavimentoId !== state.pavimentoAtivoId).concat(novosComodos);

                atualizarTudo();
                reconstruirCena3D();
                alert(`Modelo BIM (.IFC) importado com sucesso!\n• Espaços IFC (IfcSpace) convertidos em cômodos: ${novosComodos.length}\n• Infraestrutura elétrica gerada automaticamente.`);
            } catch (err) {
                console.error('Erro no parse IFC:', err);
                carregarExemploIfc();
            }
        }

        function executarParseJSONouGenerico(content, opcoes) {
            try {
                const data = JSON.parse(content);
                if (data.estado || data.comodos) {
                    if (data.projeto) {
                        state.projetoAtual = sanitizarTextosProfundo(data.projeto);
                    }
                    const estadoParaCarregar = data.estado || data;
                    restaurarSnapshotEstado(estadoParaCarregar);
                    salvarPontoRapido('Importação de arquivo JSON');
                    mostrarNotificacaoToast('Projeto importado com sucesso!', 'sucesso');
                    return;
                }
            } catch(e) {}
            alert('Arquivo não reconhecido. Importe um projeto (.proeletrica / .json do PRO-ELÉTRICA), uma planta DXF ou um modelo IFC.');
        }


        // PRESETS DEMONSTRATIVOS 1-CLIQUE (DXF & IFC)
        function carregarExemploDxf() {
            state.cadUnderlay = [
                { tipo: 'linha', x1: 100, y1: 60, x2: 560, y2: 60 },
                { tipo: 'linha', x1: 560, y1: 60, x2: 560, y2: 380 },
                { tipo: 'linha', x1: 560, y1: 380, x2: 100, y2: 380 },
                { tipo: 'linha', x1: 100, y1: 380, x2: 100, y2: 60 },
                { tipo: 'linha', x1: 320, y1: 60, x2: 320, y2: 260 },
                { tipo: 'linha', x1: 440, y1: 60, x2: 440, y2: 200 },
                { tipo: 'linha', x1: 320, y1: 200, x2: 560, y2: 200 },
                { tipo: 'linha', x1: 100, y1: 220, x2: 320, y2: 220 },
                { tipo: 'linha', x1: 100, y1: 260, x2: 140, y2: 260 },
                { tipo: 'circulo', x: 140, y: 260, r: 25 },
                { tipo: 'linha', x1: 320, y1: 140, x2: 320, y2: 170 },
                { tipo: 'texto', x: 190, y: 140, texto: 'SALA DE ESTAR' },
                { tipo: 'texto', x: 360, y: 130, texto: 'COZINHA' },
                { tipo: 'texto', x: 475, y: 130, texto: 'BANHEIRO' },
                { tipo: 'texto', x: 190, y: 300, texto: 'DORMITÓRIO' },
                { tipo: 'texto', x: 420, y: 290, texto: 'ÁREA SERVIÇO' }
            ];

            state.exibirCadUnderlay = true;
            const chk = document.getElementById('chkCadUnderlay');
            if (chk) chk.checked = true;

            state.comodos = [
                {
                    id: 101,
                    pavimentoId: state.pavimentoAtivoId,
                    nome: 'Sala de Estar (CAD)',
                    tipo: 'geral',
                    largura: 5.5,
                    comprimento: 4.0,
                    area: 22.0,
                    perimetro: 19.0,
                    x: 100,
                    y: 60,
                    cargas: [
                        { id: 'cdxf1', nome: 'Smart TV 65"', tipo: 'TUG', potencia: 150, tensao: 127, altura: 'media' },
                        { id: 'cdxf2', nome: 'Ar Condicionado 18.000 BTU', tipo: 'TUE', potencia: 1700, tensao: 220, altura: 'alta' }
                    ]
                },
                {
                    id: 102,
                    pavimentoId: state.pavimentoAtivoId,
                    nome: 'Cozinha Americana (CAD)',
                    tipo: 'servico',
                    largura: 3.0,
                    comprimento: 3.5,
                    area: 10.5,
                    perimetro: 13.0,
                    x: 320,
                    y: 60,
                    cargas: [
                        { id: 'cdxf3', nome: 'Cooktop Indução', tipo: 'TUE', potencia: 7200, tensao: 220, altura: 'baixa' },
                        { id: 'cdxf4', nome: 'Forno Elétrico', tipo: 'TUE', potencia: 2800, tensao: 220, altura: 'media' },
                        { id: 'cdxf5', nome: 'Torneira Elétrica Cozinha', tipo: 'TUE', potencia: 5500, tensao: 220, altura: 'media' }
                    ]
                },
                {
                    id: 103,
                    pavimentoId: state.pavimentoAtivoId,
                    nome: 'Banheiro Social (CAD)',
                    tipo: 'servico',
                    largura: 3.0,
                    comprimento: 3.5,
                    area: 10.5,
                    perimetro: 13.0,
                    x: 440,
                    y: 60,
                    cargas: [
                        { id: 'cdxf6', nome: 'Chuveiro Elétrico Turbo', tipo: 'TUE', potencia: 7500, tensao: 220, altura: 'alta' }
                    ]
                },
                {
                    id: 104,
                    pavimentoId: state.pavimentoAtivoId,
                    nome: 'Dormitório Master (CAD)',
                    tipo: 'geral',
                    largura: 5.5,
                    comprimento: 4.0,
                    area: 22.0,
                    perimetro: 19.0,
                    x: 100,
                    y: 220,
                    cargas: [
                        { id: 'cdxf7', nome: 'Ar Condicionado 12.000 BTU', tipo: 'TUE', potencia: 1150, tensao: 220, altura: 'alta' }
                    ]
                }
            ];

            state.comodos.forEach(c => gerarPontosEletricosParaComodo(c));
            fecharModalImportar();
            atualizarTudo();
            reconstruirCena3D();
        }

        function carregarExemploIfc() {
            state.pavimentos = [
                { id: 'terreo', nome: 'Pavimento Térreo (BIM)', nivel: 0, alturaPeDireito: 2.8, temLajePiso: true, tipoLajePiso: 'concreto', espessuraLajePiso: 0.20, temLajeTeto: true, tipoLajeTeto: 'concreto', espessuraLajeTeto: 0.15, tipoPassagemCabos: 'teto' },
                { id: 'superior', nome: '1º Pavimento Superior (BIM)', nivel: 1, alturaPeDireito: 2.8, temLajePiso: true, tipoLajePiso: 'concreto', espessuraLajePiso: 0.20, temLajeTeto: true, tipoLajeTeto: 'concreto', espessuraLajeTeto: 0.15, tipoPassagemCabos: 'teto' }
            ];

            state.comodos = [
                {
                    id: 201,
                    pavimentoId: 'terreo',
                    nome: 'Living / Jantar (BIM Space)',
                    tipo: 'geral',
                    largura: 5.0,
                    comprimento: 4.0,
                    area: 20.0,
                    perimetro: 18.0,
                    x: 110,
                    y: 70,
                    cargas: [
                        { id: 'b1', nome: 'Home Theater / TV', tipo: 'TUG', potencia: 300, tensao: 127, altura: 'media' },
                        { id: 'b2', nome: 'Ar Condicionado 18k', tipo: 'TUE', potencia: 1700, tensao: 220, altura: 'alta' }
                    ]
                },
                {
                    id: 202,
                    pavimentoId: 'terreo',
                    nome: 'Cozinha Gourmet (BIM)',
                    tipo: 'servico',
                    largura: 3.5,
                    comprimento: 4.0,
                    area: 14.0,
                    perimetro: 15.0,
                    x: 310,
                    y: 70,
                    cargas: [
                        { id: 'b3', nome: 'Cooktop 4 Bocas', tipo: 'TUE', potencia: 7200, tensao: 220, altura: 'baixa' },
                        { id: 'b4', nome: 'Forno Elétrico Embutir', tipo: 'TUE', potencia: 2800, tensao: 220, altura: 'media' },
                        { id: 'b5', nome: 'Lava Louças', tipo: 'TUE', potencia: 1800, tensao: 220, altura: 'baixa' }
                    ]
                },
                {
                    id: 203,
                    pavimentoId: 'terreo',
                    nome: 'Lavabo Térreo (BIM)',
                    tipo: 'servico',
                    largura: 2.0,
                    comprimento: 2.5,
                    area: 5.0,
                    perimetro: 9.0,
                    x: 450,
                    y: 70,
                    cargas: [
                        { id: 'b6', nome: 'Torneira Elétrica', tipo: 'TUE', potencia: 4500, tensao: 220, altura: 'media' }
                    ]
                },
                {
                    id: 204,
                    pavimentoId: 'superior',
                    nome: 'Suíte Presidencial (BIM)',
                    tipo: 'geral',
                    largura: 5.0,
                    comprimento: 4.5,
                    area: 22.5,
                    perimetro: 19.0,
                    x: 110,
                    y: 70,
                    cargas: [
                        { id: 'b7', nome: 'Ar Condicionado Inverter', tipo: 'TUE', potencia: 1700, tensao: 220, altura: 'alta' },
                        { id: 'b8', nome: 'Smart TV Suíte', tipo: 'TUG', potencia: 120, tensao: 127, altura: 'media' }
                    ]
                },
                {
                    id: 205,
                    pavimentoId: 'superior',
                    nome: 'Sala de Banho Suíte (BIM)',
                    tipo: 'servico',
                    largura: 3.0,
                    comprimento: 4.0,
                    area: 12.0,
                    perimetro: 14.0,
                    x: 310,
                    y: 70,
                    cargas: [
                        { id: 'b9', nome: 'Chuveiro Turbo Master', tipo: 'TUE', potencia: 7500, tensao: 220, altura: 'alta' },
                        { id: 'b10', nome: 'Banheira Hidro', tipo: 'TUE', potencia: 1500, tensao: 220, altura: 'baixa' }
                    ]
                },
                {
                    id: 206,
                    pavimentoId: 'superior',
                    nome: 'Dormitório 2 (BIM)',
                    tipo: 'geral',
                    largura: 3.5,
                    comprimento: 3.5,
                    area: 12.25,
                    perimetro: 14.0,
                    x: 110,
                    y: 250,
                    cargas: [
                        { id: 'b11', nome: 'Ar Condicionado 9k', tipo: 'TUE', potencia: 900, tensao: 220, altura: 'alta' }
                    ]
                }
            ];

            state.comodos.forEach(c => gerarPontosEletricosParaComodo(c));
            fecharModalImportar();
            renderizarSeletorPavimentos();
            atualizarTudo();
            reconstruirCena3D();
        }

        // ==========================================
        // GESTÃO DE REGIME DE IMÓVEL (NBR 5410)
        // ==========================================

        function alterarRegimeImovel(novoRegime) {
            state.regimeImovel = novoRegime;

            const btnMesmo = document.getElementById('btnRegimeMesmoImovel');
            const btnSeparados = document.getElementById('btnRegimeImoveisSeparados');
            const barraQdt = document.getElementById('barraSeletorUnidadeQDT');

            if (novoRegime === 'mesmo_imovel') {
                if (btnMesmo) btnMesmo.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition bg-amber-500 text-slate-950 shadow';
                if (btnSeparados) btnSeparados.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white';
                if (barraQdt) barraQdt.classList.add('hidden');
            } else {
                if (btnMesmo) btnMesmo.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white';
                if (btnSeparados) btnSeparados.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition bg-amber-500 text-slate-950 shadow';
                if (barraQdt) barraQdt.classList.remove('hidden');
            }

            renderizarBotoesUnidadesQDT();
            atualizarTudo();
        }




        function renderizarListaConfigUnidades() {
            const container = document.getElementById('listaUnidadesImoveis');
            const contVinculo = document.getElementById('listaVinculoPavimentosImoveis');
            if (!container) return;

            container.innerHTML = '';
            state.imoveis.forEach((imovel, index) => {
                const el = document.createElement('div');
                el.className = 'bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs';
                
                const checkboxesPav = state.pavimentos.map(p => {
                    const checked = imovel.pavimentos && imovel.pavimentos.includes(p.id);
                    return `
                        <label class="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                            <input type="checkbox" onchange="togglePavimentoUnidade('${imovel.id}', '${p.id}', this.checked)" ${checked ? 'checked' : ''} class="rounded text-amber-500 bg-slate-900 border-slate-700">
                            <span>${p.nome}</span>
                        </label>
                    `;
                }).join('');

                el.innerHTML = `
                    <div class="flex-1 space-y-1.5">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
                                ${index + 1}
                            </span>
                            <input type="text" value="${imovel.nome}" onchange="atualizarNomeUnidade('${imovel.id}', this.value)" class="bg-slate-900 border border-slate-700 text-white font-bold px-2 py-1 rounded text-xs outline-none focus:border-amber-400 w-48">
                        </div>
                        <div class="flex flex-wrap items-center gap-3 pt-1">
                            <span class="text-[10px] text-slate-400">Pavimentos Pertencentes:</span>
                            ${checkboxesPav}
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div>
                            <span class="text-[9px] text-slate-400 block">Medição:</span>
                            <select onchange="atualizarSistemaUnidade('${imovel.id}', this.value)" class="bg-slate-900 border border-slate-700 text-white text-[11px] rounded px-2 py-1 outline-none">
                                <option value="monofasico" ${imovel.sistema === 'monofasico' ? 'selected' : ''}>Mono ${redeAtivaProjeto().fn}V</option>
                                <option value="bifasico" ${imovel.sistema === 'bifasico' ? 'selected' : ''}>Bifásico ${redeAtivaProjeto().rotulo.replace(' ', '')}</option>
                                <option value="trifasico" ${imovel.sistema === 'trifasico' ? 'selected' : ''}>Trifásico ${redeAtivaProjeto().rotulo.replace(' ', '')}</option>
                            </select>
                        </div>
                        ${state.imoveis.length > 1 ? `
                            <button onclick="removerUnidadeImovel('${imovel.id}')" class="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-slate-800 transition" title="Excluir Unidade">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        ` : ''}
                    </div>
                `;
                container.appendChild(el);
            });

            if (contVinculo) {
                contVinculo.innerHTML = state.pavimentos.map(p => {
                    const im = state.imoveis.find(i => i.pavimentos && i.pavimentos.includes(p.id));
                    return `
                        <div class="flex justify-between items-center text-slate-300 py-0.5 border-b border-slate-900">
                            <span><strong>${p.nome}</strong>:</span>
                            <span class="font-mono text-amber-300">${im ? im.nome : 'Sem unidade vinculada'}</span>
                        </div>
                    `;
                }).join('');
            }
        }

        function atualizarNomeUnidade(id, novoNome) {
            const im = state.imoveis.find(i => i.id === id);
            if (im) im.nome = novoNome;
        }

        function atualizarSistemaUnidade(id, novoSistema) {
            const im = state.imoveis.find(i => i.id === id);
            if (im) im.sistema = novoSistema;
        }

        function togglePavimentoUnidade(imovelId, pavId, checked) {
            const im = state.imoveis.find(i => i.id === imovelId);
            if (!im) return;
            if (!im.pavimentos) im.pavimentos = [];
            
            if (checked) {
                state.imoveis.forEach(other => {
                    if (other.id !== imovelId && other.pavimentos) {
                        other.pavimentos = other.pavimentos.filter(p => p !== pavId);
                    }
                });
                if (!im.pavimentos.includes(pavId)) im.pavimentos.push(pavId);
            } else {
                im.pavimentos = im.pavimentos.filter(p => p !== pavId);
            }
            renderizarListaConfigUnidades();
        }


        function removerUnidadeImovel(id) {
            if (state.imoveis.length <= 1) {
                alert('É necessário ter ao menos uma unidade consumidora cadastrada!');
                return;
            }
            state.imoveis = state.imoveis.filter(i => i.id !== id);
            renderizarListaConfigUnidades();
        }


        function renderizarBotoesUnidadesQDT() {
            const cont = document.getElementById('containerBotoesUnidadesQDT');
            if (!cont) return;

            cont.innerHTML = '';

            const btnTodos = document.createElement('button');
            const ehTodos = (state.unidadeQdtAtivaId === 'todos');
            btnTodos.className = `px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${ehTodos ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`;
            btnTodos.innerHTML = `<i class="fa-solid fa-boxes-stacked"></i> Centro de Medição Coletivo`;
            btnTodos.onclick = () => selecionarUnidadeQDT('todos');
            cont.appendChild(btnTodos);

            state.imoveis.forEach(imovel => {
                const btn = document.createElement('button');
                const ativo = (state.unidadeQdtAtivaId === imovel.id);
                btn.className = `px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${ativo ? 'bg-sky-500 text-slate-950 shadow' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`;
                btn.innerHTML = `<i class="fa-solid fa-bolt"></i> ${imovel.nome}`;
                btn.onclick = () => selecionarUnidadeQDT(imovel.id);
                cont.appendChild(btn);
            });
        }

        function selecionarUnidadeQDT(unidId) {
            state.unidadeQdtAtivaId = unidId;
            renderizarBotoesUnidadesQDT();
            atualizarTabelas();
        }

        // DESENHO CAD 2D (Aba 1) COM SUPORTE A MULTI-PAVIMENTOS E GABARITO FANTASMA

        // =========================================================================
        // AJUSTE DINÂMICO E ALINHAMENTO DO TERRENO (LOTE) À EDIFICAÇÃO
        // =========================================================================
        function ajustarTerrenoAosComodos(forcar = false) {
            if (!state.terreno) {
                state.terreno = { ativo: true, largura: 12.0, comprimento: 25.0, recuoFrontal: 4.0, recuoLateral: 1.5, recuoFundos: 3.0, x: 40, y: 40 };
            }
            if (!state.comodos || state.comodos.length === 0) return;

            // Mantém a planta/terreno de fundo 100% ESTÁTICO ao ajustar ou mover cômodos!
            if (!forcar && state.terreno.x !== undefined && state.terreno.y !== undefined) {
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

            const rf = (state.terreno.recuoFrontal !== undefined ? state.terreno.recuoFrontal : 4.0) * escala;
            const rl = (state.terreno.recuoLateral !== undefined ? state.terreno.recuoLateral : 1.5) * escala;
            const rfun = (state.terreno.recuoFundos !== undefined ? state.terreno.recuoFundos : 3.0) * escala;

            const houseW = maxX - minX;
            const houseH = maxY - minY;

            // Se as dimensões ainda não foram definidas pelo usuário, calcula dimensões iniciais necessárias
            if (!state.terreno.largura || state.terreno.largura <= 0) {
                state.terreno.largura = Math.max(5.0, Math.ceil((houseW + rl * 2) / escala));
            }
            if (!state.terreno.comprimento || state.terreno.comprimento <= 0) {
                state.terreno.comprimento = Math.max(10.0, Math.ceil((houseH + rf + rfun) / escala));
            }

            const tw = state.terreno.largura * escala;
            const th = state.terreno.comprimento * escala;
            const houseMidX = (minX + maxX) / 2;

            // Centraliza o lote simetricamente no eixo X da residência (se largura igual, anexa perfeitamente às paredes)
            state.terreno.x = Math.round(houseMidX - tw / 2);

            // Alinha o lote no eixo Y:
            // O alinhamento predial situa a testada frontal (passeio) a recuoFrontal da frente da casa (maxY).
            if (th >= houseH + rf) {
                state.terreno.y = Math.round(maxY + rf - th);
            } else {
                state.terreno.y = Math.round(minY - rfun);
            }
            state.terreno.area = Math.round(state.terreno.largura * state.terreno.comprimento * 10) / 10;
        }

        // =========================================================================
        // RENDERIZAÇÃO DO TERRENO TOTAL (LOTE) VS ÁREA CONSTRUÍDA

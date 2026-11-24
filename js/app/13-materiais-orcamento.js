/* PRO-ELÉTRICA CAD — 13-materiais-orcamento.js
   Quantitativo de materiais, tabela de preços de referência, orçamento e exportação Excel.
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        // =========================================================================
        // MOTOR DE QUANTITATIVO AVANÇADO DE MATERIAIS & ORÇAMENTO NBR 5410
        // =========================================================================
        
        // =========================================================================
        // BANCO DE DADOS DE REFERÊNCIA DE PREÇOS, METROS, ROLOS & FONTES DE MERCADO
        // =========================================================================
        const FONTES_MERCADO_INTERNET = [
            {
                id: 'sinapi',
                nome: 'SINAPI / Caixa Econômica Federal & IBGE',
                tipo: 'Referência Governamental Oficial',
                badge: 'Oficial Federal',
                badgeCor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                icone: 'fa-building-columns',
                url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/',
                descricao: 'Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil. Planilhas mensais por estado; referência obrigatória em obras públicas (Lei 14.133/21). Baixe a do seu estado para um orçamento oficial.'
            },
            {
                id: 'leroy',
                nome: 'Leroy Merlin Brasil (Material Elétrico)',
                tipo: 'Grande Varejo & Distribuição',
                badge: 'Varejo Nacional',
                badgeCor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                icone: 'fa-store',
                url: 'https://www.leroymerlin.com.br/materiais-eletricos',
                descricao: 'Varejo nacional: preços de rolos de 100 m de marcas certificadas pelo Inmetro (Sil, Cobrecom, Prysmian) e de disjuntores DIN.'
            },
            {
                id: 'ml',
                nome: 'Mercado Livre Brasil (Lojas Oficiais)',
                tipo: 'Marketplace Nacional',
                badge: 'Marketplace & Atacado',
                badgeCor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                icone: 'fa-cart-shopping',
                url: 'https://www.mercadolivre.com.br/c/construcao/energia/cabos-e-acessorios',
                descricao: 'Lojas oficiais e distribuidores: condutores em rolos de 100 m, disjuntores DIN e quadros de distribuição.'
            },
            {
                id: 'loja_eletrica',
                nome: 'Loja Elétrica Distribuidora',
                tipo: 'Distribuidor Especialista',
                badge: 'Distribuidor Líder',
                badgeCor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                icone: 'fa-bolt',
                url: 'https://www.lojaeletrica.com.br/',
                descricao: 'Maior rede distribuidora especializada do Brasil em cabos flexíveis de baixa tensão, barramentos de cobre, terminais e componentes elétricos industriais.'
            },
            {
                id: 'telhanorte',
                nome: 'Telhanorte / Saint-Gobain',
                tipo: 'Varejo e Atacado da Construção',
                badge: 'Rede Especializada',
                badgeCor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
                icone: 'fa-truck-fast',
                url: 'https://www.telhanorte.com.br/eletrica',
                descricao: 'Tabelas de eletrodutos flexíveis reforçados em rolos de 50m, caixas 4x2 e aparelhagem modular (interruptores e tomadas).'
            },
            {
                id: 'fabricantes_inmetro',
                nome: 'Catálogos Sil Fios e Cabos & Cobrecom',
                tipo: 'Fabricantes Nacionais Homologados',
                badge: 'Fabricantes NBR',
                badgeCor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                icone: 'fa-industry',
                url: 'https://www.sil.com.br/',
                descricao: 'Especificações técnicas normativas e tabelas de conformidade ABNT NBR NM 247-3 / NBR 5410 com embalagens comerciais padronizadas de 100m.'
            }
        ];

        // Mês/ano dos valores da tabela abaixo (exibido no modal de referência).
        const DATA_TABELA_PRECOS_REFERENCIA = 'out/2026';

        const PRECOS_PADRAO_MATERIAIS = {
            cabos: {
                '1.5': { metro: 1.85, rolo100: 185.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 1.70, medio: 1.95, max: 2.30, roloMedio: 195.00, fonte: 'SINAPI / Leroy Merlin / ML', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                '2.5': { metro: 2.85, rolo100: 285.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 2.65, medio: 3.10, max: 3.60, roloMedio: 310.00, fonte: 'SINAPI / Leroy Merlin / ML', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                '4.0': { metro: 4.60, rolo100: 460.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 4.30, medio: 4.95, max: 5.80, roloMedio: 495.00, fonte: 'SINAPI / Leroy Merlin / ML', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                '6.0': { metro: 6.90, rolo100: 690.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 6.50, medio: 7.40, max: 8.60, roloMedio: 740.00, fonte: 'SINAPI / Leroy Merlin / ML', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                '10.0': { metro: 11.50, rolo100: 1150.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 11.20, medio: 12.80, max: 14.90, roloMedio: 1280.00, fonte: 'SINAPI / Loja Elétrica', url: 'https://www.lojaeletrica.com.br/' } },
                '16.0': { metro: 18.00, rolo100: 1800.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 17.50, medio: 19.90, max: 23.50, roloMedio: 1990.00, fonte: 'SINAPI / Loja Elétrica', url: 'https://www.lojaeletrica.com.br/' } },
                '25.0': { metro: 28.00, rolo100: 2800.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 27.00, medio: 31.50, max: 37.00, roloMedio: 3150.00, fonte: 'SINAPI / Loja Elétrica', url: 'https://www.lojaeletrica.com.br/' } }
            },
            eletrodutos: {
                '20': { metro: 2.30, rolo50: 115.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 2.10, medio: 2.45, max: 2.90, roloMedio: 122.50, fonte: 'SINAPI / Telhanorte', url: 'https://www.telhanorte.com.br/eletrica' } },
                '25': { metro: 3.10, rolo50: 155.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 2.85, medio: 3.35, max: 3.95, roloMedio: 167.50, fonte: 'SINAPI / Telhanorte', url: 'https://www.telhanorte.com.br/eletrica' } },
                '32': { metro: 4.50, rolo50: 225.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 4.10, medio: 4.85, max: 5.70, roloMedio: 242.50, fonte: 'SINAPI / Leroy Merlin', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'curva25': { unit: 2.90, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 2.50, medio: 3.20, max: 4.10, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                'luva25': { unit: 1.80, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 1.50, medio: 1.95, max: 2.60, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                'adaptador25': { unit: 1.40, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 1.10, medio: 1.55, max: 2.10, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } }
            },
            caixas: {
                '4x2': { unit: 2.50, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 2.10, medio: 2.70, max: 3.50, fonte: 'SINAPI / Leroy Merlin', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'octogonal': { unit: 4.20, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 3.60, medio: 4.50, max: 5.40, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                '4x4': { unit: 5.80, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 4.90, medio: 6.20, max: 7.50, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                'tampa4x2': { unit: 3.50, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 2.80, medio: 3.80, max: 4.90, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } }
            },
            protecao: {
                'disj1p': { unit: 14.50, customizado: false, fonte: 'Mercado DIN', refInternet: { min: 12.90, medio: 15.80, max: 19.50, fonte: 'Leroy Merlin / Steck / Siemens', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'disj2p': { unit: 32.00, customizado: false, fonte: 'Mercado DIN', refInternet: { min: 28.50, medio: 34.90, max: 42.00, fonte: 'Leroy Merlin / Steck / Siemens', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'disjGeral1p': { unit: 25.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 22.00, medio: 28.00, max: 35.00, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                'disjGeral2p': { unit: 48.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 42.00, medio: 52.00, max: 65.00, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                'disjGeral3p': { unit: 75.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 68.00, medio: 82.00, max: 99.00, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                'qdt': { unit: 145.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 125.00, medio: 158.00, max: 198.00, fonte: 'SINAPI / Tigre / Steck', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                'idr': { unit: 95.00, customizado: false, fonte: 'Mercado DIN 30mA', refInternet: { min: 89.00, medio: 105.00, max: 135.00, fonte: 'SINAPI / Schneider / Steck', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                'idr4p': { unit: 185.00, customizado: false, fonte: 'Tabela de referência', refInternet: { min: 150.00, medio: 195.00, max: 260.00, fonte: 'Leroy Merlin / Steck / Schneider', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'dps': { unit: 38.00, customizado: false, fonte: 'Mercado DIN Classe II', refInternet: { min: 34.00, medio: 42.00, max: 54.00, fonte: 'SINAPI / Clamper', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                'pente12': { unit: 28.00, customizado: false, fonte: 'Mercado DIN Pente', refInternet: { min: 24.00, medio: 31.00, max: 38.00, fonte: 'Loja Elétrica', url: 'https://www.lojaeletrica.com.br/' } },
                'pente18': { unit: 38.00, customizado: false, fonte: 'Mercado DIN Pente', refInternet: { min: 32.00, medio: 41.50, max: 49.00, fonte: 'Loja Elétrica', url: 'https://www.lojaeletrica.com.br/' } },
                'pente24': { unit: 48.00, customizado: false, fonte: 'Mercado DIN Pente', refInternet: { min: 42.00, medio: 53.00, max: 64.00, fonte: 'Loja Elétrica', url: 'https://www.lojaeletrica.com.br/' } },
                'pente54': { unit: 75.00, customizado: false, fonte: 'Mercado DIN Pente', refInternet: { min: 65.00, medio: 82.00, max: 98.00, fonte: 'Loja Elétrica', url: 'https://www.lojaeletrica.com.br/' } }
            },
            aparelhagem: {
                'tomada10a': { unit: 7.50, customizado: false, fonte: 'NBR 14136', refInternet: { min: 6.50, medio: 8.20, max: 10.50, fonte: 'Tramontina / Schneider / Leroy', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'tomada20a': { unit: 9.20, customizado: false, fonte: 'NBR 14136', refInternet: { min: 7.90, medio: 9.90, max: 12.80, fonte: 'Tramontina / Schneider / Leroy', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'chuveiro_conector': { unit: 8.50, customizado: false, fonte: 'Porcelana / WAGO', refInternet: { min: 7.50, medio: 9.50, max: 12.50, fonte: 'WAGO / Leroy Merlin', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'interruptor_simples': { unit: 7.20, customizado: false, fonte: 'NBR NM 60669-1', refInternet: { min: 6.20, medio: 7.90, max: 10.20, fonte: 'Tramontina / Schneider', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'interruptor_paralelo': { unit: 10.50, customizado: false, fonte: 'NBR NM 60669-1', refInternet: { min: 8.90, medio: 11.20, max: 14.50, fonte: 'Tramontina / Schneider', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'placa4x2': { unit: 5.50, customizado: false, fonte: 'Termoplástico', refInternet: { min: 4.50, medio: 5.90, max: 7.80, fonte: 'Tramontina / Schneider', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } }
            },
            iluminacao: {
                'plafon18w': { unit: 26.00, customizado: false, fonte: 'LED Bivolt', refInternet: { min: 22.00, medio: 28.50, max: 36.00, fonte: 'Avant / Philips / Leroy', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'plafon12w': { unit: 18.00, customizado: false, fonte: 'LED Slim Bivolt', refInternet: { min: 15.00, medio: 19.50, max: 25.00, fonte: 'Avant / Philips / Leroy', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'soquete_e27': { unit: 4.50, customizado: false, fonte: 'Porcelana E27', refInternet: { min: 3.50, medio: 4.90, max: 6.50, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } }
            },
            aterramento: {
                'haste': { unit: 42.00, customizado: false, fonte: 'NBR 13571', refInternet: { min: 38.00, medio: 46.00, max: 56.00, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                'grampo': { unit: 8.50, customizado: false, fonte: 'Bronze 5/8"', refInternet: { min: 7.00, medio: 9.20, max: 12.00, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                'caixa_inspecao': { unit: 32.00, customizado: false, fonte: 'PVC/Concreto DN300', refInternet: { min: 28.00, medio: 35.00, max: 44.00, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                'cabo_nu': { metro: 19.50, customizado: false, fonte: 'Cobre Nu 25mm²', refInternet: { min: 18.00, medio: 21.50, max: 26.50, fonte: 'SINAPI / Loja Elétrica', url: 'https://www.lojaeletrica.com.br/' } },
                'bep': { unit: 68.00, customizado: false, fonte: 'Cobre Maciço 150mm', refInternet: { min: 58.00, medio: 74.00, max: 92.00, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } }
            },
            insumos: {
                'fita_isolante': { unit: 7.50, customizado: false, fonte: '3M / Scotch 20m', refInternet: { min: 6.50, medio: 8.20, max: 10.50, fonte: '3M / Scotch / Leroy', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'fita_auto_fusao': { unit: 24.00, customizado: false, fonte: 'EPR 10m', refInternet: { min: 21.00, medio: 26.50, max: 34.00, fonte: '3M / Leroy', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'conector_wago': { unit: 2.80, customizado: false, fonte: 'WAGO 221', refInternet: { min: 2.50, medio: 3.10, max: 3.90, fonte: 'WAGO Oficial / ML', url: 'https://www.mercadolivre.com.br/c/construcao/energia/cabos-e-acessorios' } },
                'terminais_ilhos': { unit: 0.35, customizado: false, fonte: 'Cobre Estanhado', refInternet: { min: 0.28, medio: 0.38, max: 0.50, fonte: 'Mercado Livre', url: 'https://www.mercadolivre.com.br/c/construcao/energia/cabos-e-acessorios' } },
                'kit_buchas': { unit: 0.25, customizado: false, fonte: 'S6 + Parafusos', refInternet: { min: 0.20, medio: 0.28, max: 0.40, fonte: 'SINAPI / CEF', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' } },
                'passa_fio': { unit: 28.00, customizado: false, fonte: 'Aço 20m', refInternet: { min: 24.00, medio: 31.00, max: 39.00, fonte: 'Leroy Merlin', url: 'https://www.leroymerlin.com.br/materiais-eletricos' } },
                'vaselina': { unit: 16.00, customizado: false, fonte: 'Lubrificante 500ml', refInternet: { min: 13.50, medio: 17.50, max: 22.00, fonte: 'Loja Elétrica', url: 'https://www.lojaeletrica.com.br/' } }
            }
        };

        function inicializarTabelaPrecos() {
            if (!state.tabelaPrecos) {
                state.tabelaPrecos = JSON.parse(JSON.stringify(PRECOS_PADRAO_MATERIAIS));
                state.tabelaPrecos.fonteAtual = 'Tabela de referência do app';
            }
        }

        // Chave da tabela de preços: "6 mm²", "6,0" e "6.0" → "6.0"
        function normalizarChaveBitola(bitolaStr) {
            const n = parseFloat((bitolaStr || '2.5').toString().replace(' mm²', '').replace(',', '.').trim());
            return (isFinite(n) ? n : 2.5).toFixed(1);
        }

        function obterPrecoCaboMetro(bitolaStr) {
            inicializarTabelaPrecos();
            const s = normalizarChaveBitola(bitolaStr);
            if (state.tabelaPrecos.cabos && state.tabelaPrecos.cabos[s]) {
                return Number(state.tabelaPrecos.cabos[s].metro) || 2.85;
            }
            if (PRECOS_PADRAO_MATERIAIS.cabos[s]) return PRECOS_PADRAO_MATERIAIS.cabos[s].metro;
            // Seções acima da tabela (35 mm² ou mais): estimativa proporcional à seção,
            // a partir do preço do 25 mm² (revise com cotação real do fornecedor)
            const n = parseFloat(s);
            if (n > 25) {
                const ref = (state.tabelaPrecos.cabos && Number(state.tabelaPrecos.cabos['25.0']?.metro)) || PRECOS_PADRAO_MATERIAIS.cabos['25.0'].metro;
                return Math.round(ref * (n / 25) * 100) / 100;
            }
            return 2.85;
        }

        function obterPrecoCaboRolo(bitolaStr) {
            inicializarTabelaPrecos();
            const s = normalizarChaveBitola(bitolaStr);
            if (state.tabelaPrecos.cabos && state.tabelaPrecos.cabos[s]) {
                return Number(state.tabelaPrecos.cabos[s].rolo100) || (obterPrecoCaboMetro(s) * 100);
            }
            return obterPrecoCaboMetro(s) * 100;
        }

        function obterPrecoMaterial(categoria, chave, valorPadrao) {
            inicializarTabelaPrecos();
            if (state.tabelaPrecos[categoria] && state.tabelaPrecos[categoria][chave]) {
                const item = state.tabelaPrecos[categoria][chave];
                return Number(item.unit !== undefined ? item.unit : (item.metro !== undefined ? item.metro : valorPadrao)) || valorPadrao;
            }
            return valorPadrao;
        }

        function obterFontePrecoMaterial(categoria, chave) {
            inicializarTabelaPrecos();
            if (state.tabelaPrecos[categoria] && state.tabelaPrecos[categoria][chave]) {
                return state.tabelaPrecos[categoria][chave].fonte || state.tabelaPrecos.fonteAtual || 'Tabela de referência';
            }
            return state.tabelaPrecos.fonteAtual || 'Tabela de referência';
        }

        function recalcularOrcamentoComPrecos() {
            const comodosParaCalcular = (state.comodos && Array.isArray(state.comodos)) ? state.comodos : [];
            const circuitosFinais = (state.circuitosCalculados && Array.isArray(state.circuitosCalculados)) ? state.circuitosCalculados : [];
            const calculoDemanda = state.calculoDemanda || null;
            const materiaisDetalhados = calcularQuantitativoMateriaisCompleto(comodosParaCalcular, circuitosFinais, calculoDemanda);
            renderizarTabelaMateriaisCompleta(materiaisDetalhados);
        }

        // -------------------------------------------------------------
        // CONTROLADORES DO MODAL 1: PREÇOS MANUAIS (METROS & ROLOS)
        // -------------------------------------------------------------
        let _subAbaPrecoAtiva = 'cabos';

        function abrirModalPrecosManuais() {
            inicializarTabelaPrecos();
            const modal = document.getElementById('modalPrecosOrcamento');
            if (!modal) return;
            modal.classList.remove('hidden');

            const badge = document.getElementById('badgeFonteModalPrecos');
            if (badge) {
                badge.innerHTML = `<i class="fa-solid fa-tag"></i> <span>${state.tabelaPrecos.fonteAtual || 'Personalizado'}</span>`;
            }

            trocarSubAbaModalPrecos(_subAbaPrecoAtiva || 'cabos');
            atualizarTotalGeralModalPrecos();
        }

        function fecharModalPrecosManuais() {
            const modal = document.getElementById('modalPrecosOrcamento');
            if (modal) modal.classList.add('hidden');
        }

        function trocarSubAbaModalPrecos(aba) {
            _subAbaPrecoAtiva = aba;
            const abas = ['cabos', 'eletrodutos', 'protecao', 'aparelhagem'];
            abas.forEach(a => {
                const painel = document.getElementById(`painelPreco${a.charAt(0).toUpperCase() + a.slice(1)}`);
                const btn = document.getElementById(`btnSubTabPreco${a.charAt(0).toUpperCase() + a.slice(1)}`);
                if (painel) {
                    if (a === aba) painel.classList.remove('hidden');
                    else painel.classList.add('hidden');
                }
                if (btn) {
                    if (a === aba) {
                        btn.className = 'subtab-preco-btn active px-3.5 py-2 rounded-t-lg text-xs font-bold border-b-2 border-amber-400 text-amber-300 bg-slate-900/80 transition flex items-center gap-1.5';
                    } else {
                        btn.className = 'subtab-preco-btn px-3.5 py-2 rounded-t-lg text-xs font-medium border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5';
                    }
                }
            });

            if (aba === 'cabos') renderizarInputsCabosModal();
            else if (aba === 'eletrodutos') renderizarInputsEletrodutosModal();
            else if (aba === 'protecao') renderizarInputsProtecaoModal();
            else if (aba === 'aparelhagem') renderizarInputsAparelhagemModal();
        }

        function renderizarInputsCabosModal() {
            inicializarTabelaPrecos();
            const corpo = document.getElementById('corpoTabelaInputsCabos');
            if (!corpo) return;
            corpo.innerHTML = '';

            const bitolas = ['1.5', '2.5', '4.0', '6.0', '10.0', '16.0', '25.0'];
            const grupos = state.quantitativoCabosAgrupadosPorBitola || [];

            bitolas.forEach(b => {
                const precoInfo = state.tabelaPrecos.cabos[b] || { metro: 2.85, rolo100: 285.00 };
                const grupo = grupos.find(g => parseFloat(g.secao) === parseFloat(b));
                const metrosProj = grupo ? grupo.metrosTotal : 0;
                const rolosProj = grupo ? grupo.rolos100Total : 0;
                const subtotal = metrosProj * precoInfo.metro;

                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-900/70 transition border-b border-slate-850';
                tr.innerHTML = `
                    <td class="p-3 align-middle font-mono font-bold text-amber-300">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs">
                            <i class="fa-solid fa-bolt text-amber-400"></i> ${b} mm²
                        </span>
                    </td>
                    <td class="p-3 align-middle text-right font-mono">
                        <strong class="text-white block text-xs">${metrosProj} m</strong>
                        <span class="text-[10px] text-slate-400 block font-normal">~${rolosProj} rolo(s) 100m</span>
                    </td>
                    <td class="p-3 align-middle">
                        <div class="relative max-w-[150px] mx-auto">
                            <span class="absolute left-2.5 top-2 text-[11px] font-mono text-slate-500">R$</span>
                            <input type="number" step="0.01" min="0.01" value="${precoInfo.metro.toFixed(2)}"
                                oninput="sincronizarPrecoCaboModal('${b}', 'metro', this.value)"
                                id="inputPrecoCaboMetro_${b}"
                                class="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-bold text-xs pl-8 pr-2 py-1.5 rounded-lg outline-none focus:border-amber-400 text-right">
                        </div>
                    </td>
                    <td class="p-3 align-middle text-center text-slate-500 text-sm">
                        <i class="fa-solid fa-arrows-left-right text-amber-400/80"></i>
                    </td>
                    <td class="p-3 align-middle">
                        <div class="relative max-w-[170px] mx-auto">
                            <span class="absolute left-2.5 top-2 text-[11px] font-mono text-slate-500">R$</span>
                            <input type="number" step="0.01" min="0.01" value="${precoInfo.rolo100.toFixed(2)}"
                                oninput="sincronizarPrecoCaboModal('${b}', 'rolo', this.value)"
                                id="inputPrecoCaboRolo_${b}"
                                class="w-full bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs pl-8 pr-2 py-1.5 rounded-lg outline-none focus:border-amber-400 text-right">
                        </div>
                    </td>
                    <td class="p-3 align-middle text-right font-mono font-bold text-emerald-400 text-xs" id="lblSubtotalCabo_${b}">
                        R$ ${subtotal.toFixed(2).replace('.', ',')}
                    </td>
                `;
                corpo.appendChild(tr);
            });
        }

        function sincronizarPrecoCaboModal(bitola, campoAlterado, valor) {
            inicializarTabelaPrecos();
            const v = parseFloat(valor) || 0;
            const inputMetro = document.getElementById(`inputPrecoCaboMetro_${bitola}`);
            const inputRolo = document.getElementById(`inputPrecoCaboRolo_${bitola}`);
            const lblSub = document.getElementById(`lblSubtotalCabo_${bitola}`);

            if (campoAlterado === 'metro') {
                const rolo = v * 100;
                if (inputRolo) inputRolo.value = rolo.toFixed(2);
                state.tabelaPrecos.cabos[bitola] = {
                    metro: v,
                    rolo100: rolo,
                    customizado: true,
                    fonte: 'Inserção Manual'
                };
            } else {
                const metro = v / 100;
                if (inputMetro) inputMetro.value = metro.toFixed(2);
                state.tabelaPrecos.cabos[bitola] = {
                    metro: metro,
                    rolo100: v,
                    customizado: true,
                    fonte: 'Inserção Manual'
                };
            }

            const grupos = state.quantitativoCabosAgrupadosPorBitola || [];
            const grupo = grupos.find(g => parseFloat(g.secao) === parseFloat(bitola));
            const metrosProj = grupo ? grupo.metrosTotal : 0;
            const precoM = state.tabelaPrecos.cabos[bitola].metro;
            if (lblSub) lblSub.textContent = `R$ ${(metrosProj * precoM).toFixed(2).replace('.', ',')}`;

            atualizarTotalGeralModalPrecos();
        }

        function renderizarInputsEletrodutosModal() {
            inicializarTabelaPrecos();
            const corpo = document.getElementById('corpoTabelaInputsEletrodutos');
            if (!corpo) return;
            corpo.innerHTML = '';

            const itensEletro = [
                { id: '20', nome: 'Eletroduto Corrugado DN 20 mm (1/2")', tipo: 'metro_rolo', roloFator: 50, unid: 'm' },
                { id: '25', nome: 'Eletroduto Corrugado DN 25 mm (3/4")', tipo: 'metro_rolo', roloFator: 50, unid: 'm' },
                { id: '32', nome: 'Eletroduto Corrugado DN 32 mm (1")', tipo: 'metro_rolo', roloFator: 50, unid: 'm' },
                { id: 'curva25', nome: 'Curva 90° em PVC para Eletroduto 3/4"', tipo: 'unit', unid: 'un' },
                { id: 'luva25', nome: 'Luva de União para Eletroduto 3/4"', tipo: 'unit', unid: 'un' },
                { id: 'adaptador25', nome: 'Adaptador com Rosca para Caixa 3/4"', tipo: 'unit', unid: 'un' }
            ];

            const materiais = state.quantitativoMateriaisDetalhado || [];

            itensEletro.forEach(it => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-900/70 transition border-b border-slate-850';

                const matItem = materiais.find(m => m.chaveItem === it.id || m.item.includes(it.nome.substring(0, 20)));
                const qtdProj = matItem ? matItem.qtdTotal : 0;

                if (it.tipo === 'metro_rolo') {
                    const preco = state.tabelaPrecos.eletrodutos[it.id] || { metro: 3.10, rolo50: 155.00 };
                    const sub = qtdProj * preco.metro;
                    tr.innerHTML = `
                        <td class="p-3 align-middle font-bold text-white text-xs">
                            ${it.nome}
                        </td>
                        <td class="p-3 align-middle text-right font-mono">
                            ${qtdProj} ${it.unid}
                        </td>
                        <td class="p-3 align-middle">
                            <div class="relative max-w-[150px] mx-auto">
                                <span class="absolute left-2.5 top-2 text-[11px] font-mono text-slate-500">R$</span>
                                <input type="number" step="0.01" min="0.01" value="${preco.metro.toFixed(2)}"
                                    oninput="sincronizarPrecoEletrodutoModal('${it.id}', 'metro', this.value)"
                                    id="inputPrecoEletroMetro_${it.id}"
                                    class="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-bold text-xs pl-8 pr-2 py-1.5 rounded-lg outline-none focus:border-amber-400 text-right">
                            </div>
                        </td>
                        <td class="p-3 align-middle text-center text-slate-500 text-sm">
                            <i class="fa-solid fa-arrows-left-right text-amber-400/80"></i>
                        </td>
                        <td class="p-3 align-middle">
                            <div class="relative max-w-[170px] mx-auto">
                                <span class="absolute left-2.5 top-2 text-[11px] font-mono text-slate-500">R$</span>
                                <input type="number" step="0.01" min="0.01" value="${preco.rolo50.toFixed(2)}"
                                    oninput="sincronizarPrecoEletrodutoModal('${it.id}', 'rolo', this.value)"
                                    id="inputPrecoEletroRolo_${it.id}"
                                    class="w-full bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs pl-8 pr-2 py-1.5 rounded-lg outline-none focus:border-amber-400 text-right">
                            </div>
                        </td>
                        <td class="p-3 align-middle text-right font-mono font-bold text-emerald-400 text-xs" id="lblSubtotalEletro_${it.id}">
                            R$ ${sub.toFixed(2).replace('.', ',')}
                        </td>
                    `;
                } else {
                    const preco = state.tabelaPrecos.eletrodutos[it.id]?.unit || 2.50;
                    const sub = qtdProj * preco;
                    tr.innerHTML = `
                        <td class="p-3 align-middle font-bold text-white text-xs">
                            ${it.nome}
                        </td>
                        <td class="p-3 align-middle text-right font-mono">
                            ${qtdProj} ${it.unid}
                        </td>
                        <td colspan="3" class="p-3 align-middle text-center">
                            <div class="relative max-w-[170px] mx-auto">
                                <span class="absolute left-2.5 top-2 text-[11px] font-mono text-slate-500">R$</span>
                                <input type="number" step="0.01" min="0.01" value="${preco.toFixed(2)}"
                                    oninput="sincronizarPrecoItemModal('eletrodutos', '${it.id}', this.value)"
                                    class="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-bold text-xs pl-8 pr-2 py-1.5 rounded-lg outline-none focus:border-amber-400 text-right">
                            </div>
                        </td>
                        <td class="p-3 align-middle text-right font-mono font-bold text-emerald-400 text-xs">
                            R$ ${sub.toFixed(2).replace('.', ',')}
                        </td>
                    `;
                }
                corpo.appendChild(tr);
            });
        }

        function sincronizarPrecoEletrodutoModal(dn, campoAlterado, valor) {
            inicializarTabelaPrecos();
            const v = parseFloat(valor) || 0;
            const inputMetro = document.getElementById(`inputPrecoEletroMetro_${dn}`);
            const inputRolo = document.getElementById(`inputPrecoEletroRolo_${dn}`);
            const lblSub = document.getElementById(`lblSubtotalEletro_${dn}`);

            if (campoAlterado === 'metro') {
                const rolo50 = v * 50;
                if (inputRolo) inputRolo.value = rolo50.toFixed(2);
                state.tabelaPrecos.eletrodutos[dn] = {
                    metro: v,
                    rolo50: rolo50,
                    customizado: true,
                    fonte: 'Inserção Manual'
                };
            } else {
                const metro = v / 50;
                if (inputMetro) inputMetro.value = metro.toFixed(2);
                state.tabelaPrecos.eletrodutos[dn] = {
                    metro: metro,
                    rolo50: v,
                    customizado: true,
                    fonte: 'Inserção Manual'
                };
            }

            const materiais = state.quantitativoMateriaisDetalhado || [];
            const matItem = materiais.find(m => m.chaveItem === dn || m.item.includes(`DN ${dn}`));
            const qtdProj = matItem ? matItem.qtdTotal : 0;
            const precoM = state.tabelaPrecos.eletrodutos[dn].metro;
            if (lblSub) lblSub.textContent = `R$ ${(qtdProj * precoM).toFixed(2).replace('.', ',')}`;

            atualizarTotalGeralModalPrecos();
        }

        function sincronizarPrecoItemModal(categoria, chave, valor) {
            inicializarTabelaPrecos();
            const v = parseFloat(valor) || 0;
            if (!state.tabelaPrecos[categoria]) state.tabelaPrecos[categoria] = {};
            state.tabelaPrecos[categoria][chave] = {
                unit: v,
                customizado: true,
                fonte: 'Inserção Manual'
            };
            atualizarTotalGeralModalPrecos();
        }

        function renderizarInputsProtecaoModal() {
            inicializarTabelaPrecos();
            const corpo = document.getElementById('corpoTabelaInputsProtecao');
            if (!corpo) return;
            corpo.innerHTML = '';

            const itensProt = [
                { id: 'disj1p', nome: 'Disjuntor DIN Monopolar (1P) Curva C', norma: 'NBR IEC 60898', padrao: 14.50 },
                { id: 'disj2p', nome: 'Disjuntor DIN Bipolar (2P) Curva C', norma: 'NBR IEC 60898', padrao: 32.00 },
                { id: 'disjGeral1p', nome: 'Disjuntor Geral Monopolar (1P)', norma: 'NBR IEC 60898', padrao: 25.00 },
                { id: 'disjGeral2p', nome: 'Disjuntor Geral Bipolar (2P)', norma: 'NBR IEC 60898', padrao: 48.00 },
                { id: 'disjGeral3p', nome: 'Disjuntor Geral Tripolar (3P)', norma: 'NBR IEC 60898', padrao: 75.00 },
                { id: 'qdt', nome: 'Quadro de Distribuição QDT de Embutir', norma: 'NBR IEC 60670', padrao: 145.00 },
                { id: 'idr', nome: 'IDR Bipolar (2P) 30mA', norma: 'NBR NM 61008', padrao: 95.00 },
                { id: 'idr4p', nome: 'IDR Tetrapolar (4P) 30mA', norma: 'NBR NM 61008', padrao: 185.00 },
                { id: 'dps', nome: 'Dispositivo Proteção Contra Surtos (DPS) 275V', norma: 'NBR IEC 61643-1', padrao: 38.00 },
                { id: 'pente18', nome: 'Barramento Tipo Pente DIN (18 Polos)', norma: 'NBR 5410', padrao: 38.00 }
            ];

            const materiais = state.quantitativoMateriaisDetalhado || [];

            itensProt.forEach(it => {
                const preco = state.tabelaPrecos.protecao[it.id]?.unit || it.padrao;
                const matItem = materiais.find(m => m.chaveItem === it.id || m.item.toLowerCase().includes(it.nome.substring(0, 15).toLowerCase()));
                const qtd = matItem ? matItem.qtdTotal : 1;
                const sub = qtd * preco;

                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-900/70 transition border-b border-slate-850';
                tr.innerHTML = `
                    <td class="p-3 align-middle font-bold text-white text-xs">
                        ${it.nome}
                    </td>
                    <td class="p-3 align-middle text-center text-slate-400 font-mono text-[11px]">
                        ${it.norma}
                    </td>
                    <td class="p-3 align-middle text-right font-mono">
                        ${qtd} un
                    </td>
                    <td class="p-3 align-middle">
                        <div class="relative max-w-[160px] ml-auto">
                            <span class="absolute left-2.5 top-2 text-[11px] font-mono text-slate-500">R$</span>
                            <input type="number" step="0.01" min="0.01" value="${preco.toFixed(2)}"
                                oninput="sincronizarPrecoItemModal('protecao', '${it.id}', this.value)"
                                class="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-bold text-xs pl-8 pr-2 py-1.5 rounded-lg outline-none focus:border-amber-400 text-right">
                        </div>
                    </td>
                    <td class="p-3 align-middle text-right font-mono font-bold text-emerald-400 text-xs">
                        R$ ${sub.toFixed(2).replace('.', ',')}
                    </td>
                `;
                corpo.appendChild(tr);
            });
        }

        function renderizarInputsAparelhagemModal() {
            inicializarTabelaPrecos();
            const corpo = document.getElementById('corpoTabelaInputsAparelhagem');
            if (!corpo) return;
            corpo.innerHTML = '';

            const itens = [
                { cat: 'caixas', id: '4x2', nome: 'Caixa de Embutir 4x2" Amarela', unid: 'un', padrao: 2.50 },
                { cat: 'caixas', id: 'octogonal', nome: 'Caixa Octogonal 4x4" Teto/Laje', unid: 'un', padrao: 4.20 },
                { cat: 'aparelhagem', id: 'tomada10a', nome: 'Módulo Tomada 2P+T 10A (NBR 14136)', unid: 'un', padrao: 7.50 },
                { cat: 'aparelhagem', id: 'tomada20a', nome: 'Módulo Tomada 2P+T 20A (NBR 14136)', unid: 'un', padrao: 9.20 },
                { cat: 'aparelhagem', id: 'interruptor_simples', nome: 'Módulo Interruptor Simples 10A', unid: 'un', padrao: 7.20 },
                { cat: 'aparelhagem', id: 'interruptor_paralelo', nome: 'Módulo Interruptor Paralelo (Three-Way)', unid: 'un', padrao: 10.50 },
                { cat: 'aparelhagem', id: 'placa4x2', nome: 'Placa / Espelho 4x2" com Suporte', unid: 'un', padrao: 5.50 },
                { cat: 'iluminacao', id: 'plafon18w', nome: 'Plafon LED Quadrado 18W/24W Bivolt', unid: 'un', padrao: 26.00 },
                { cat: 'iluminacao', id: 'plafon12w', nome: 'Painel Plafon LED Slim Redondo 12W', unid: 'un', padrao: 18.00 },
                { cat: 'aterramento', id: 'haste', nome: 'Haste de Aterramento Aço Cobreado 5/8" × 2,40m', unid: 'un', padrao: 42.00 },
                { cat: 'aterramento', id: 'cabo_nu', nome: 'Cabo de Cobre Nu 25 mm²', unid: 'm', padrao: 19.50 },
                { cat: 'insumos', id: 'fita_isolante', nome: 'Fita Isolante PVC Anti-Chama 20m', unid: 'rolo', padrao: 7.50 },
                { cat: 'insumos', id: 'conector_wago', nome: 'Conector de Emenda Rápida tipo WAGO', unid: 'un', padrao: 2.80 }
            ];

            const materiais = state.quantitativoMateriaisDetalhado || [];

            itens.forEach(it => {
                const preco = state.tabelaPrecos[it.cat]?.[it.id]?.unit ?? state.tabelaPrecos[it.cat]?.[it.id]?.metro ?? it.padrao;
                const matItem = materiais.find(m => m.chaveItem === it.id || m.item.toLowerCase().includes(it.nome.substring(0, 15).toLowerCase()));
                const qtd = matItem ? matItem.qtdTotal : 1;
                const sub = qtd * preco;

                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-900/70 transition border-b border-slate-850';
                tr.innerHTML = `
                    <td class="p-3 align-middle font-bold text-white text-xs">
                        ${it.nome}
                    </td>
                    <td class="p-3 align-middle text-center text-slate-400 font-mono text-[11px]">
                        ${it.unid}
                    </td>
                    <td class="p-3 align-middle text-right font-mono">
                        ${qtd} ${it.unid}
                    </td>
                    <td class="p-3 align-middle">
                        <div class="relative max-w-[160px] ml-auto">
                            <span class="absolute left-2.5 top-2 text-[11px] font-mono text-slate-500">R$</span>
                            <input type="number" step="0.01" min="0.01" value="${preco.toFixed(2)}"
                                oninput="sincronizarPrecoItemModal('${it.cat}', '${it.id}', this.value)"
                                class="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-bold text-xs pl-8 pr-2 py-1.5 rounded-lg outline-none focus:border-amber-400 text-right">
                        </div>
                    </td>
                    <td class="p-3 align-middle text-right font-mono font-bold text-emerald-400 text-xs">
                        R$ ${sub.toFixed(2).replace('.', ',')}
                    </td>
                `;
                corpo.appendChild(tr);
            });
        }

        function atualizarTotalGeralModalPrecos() {
            let total = 0;
            const bitolas = ['1.5', '2.5', '4.0', '6.0', '10.0', '16.0', '25.0'];
            const grupos = state.quantitativoCabosAgrupadosPorBitola || [];

            bitolas.forEach(b => {
                const grupo = grupos.find(g => parseFloat(g.secao) === parseFloat(b));
                const metros = grupo ? grupo.metrosTotal : 0;
                const p = obterPrecoCaboMetro(b);
                total += (metros * p);
            });

            const materiais = state.quantitativoMateriaisDetalhado || [];
            materiais.forEach(m => {
                if (m.categoriaId !== 'condutores') {
                    total += (m.subtotal || 0);
                }
            });

            const lblTot = document.getElementById('lblTotalGeralModalPrecos');
            if (lblTot) lblTot.textContent = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        function salvarPrecosManuaisModal() {
            inicializarTabelaPrecos();
            state.tabelaPrecos.fonteAtual = 'Valores Manuais (Personalizados)';
            recalcularOrcamentoComPrecos();
            fecharModalPrecosManuais();
            mostrarNotificacaoToast('Valores manuais de metros e rolos aplicados com sucesso! Orçamento recalculado.', 'sucesso');
        }

        function restaurarPrecosPadraoModal() {
            state.tabelaPrecos = JSON.parse(JSON.stringify(PRECOS_PADRAO_MATERIAIS));
            state.tabelaPrecos.fonteAtual = 'Tabela de referência do app';
            trocarSubAbaModalPrecos(_subAbaPrecoAtiva || 'cabos');
            atualizarTotalGeralModalPrecos();
            recalcularOrcamentoComPrecos();
            mostrarNotificacaoToast('Valores restaurados para a tabela de referência do app.', 'info');
        }

        // -------------------------------------------------------------
        // CONTROLADORES DO MODAL 2: TABELA DE REFERÊNCIA & ONDE CONFERIR
        // -------------------------------------------------------------
        function abrirModalPesquisaPrecosInternet() {
            inicializarTabelaPrecos();
            const modal = document.getElementById('modalPesquisaPrecosInternet');
            if (!modal) return;
            modal.classList.remove('hidden');
            renderizarCardsFontes();
            executarPesquisaPrecosOnline();
        }

        function fecharModalPesquisaPrecosInternet() {
            const modal = document.getElementById('modalPesquisaPrecosInternet');
            if (modal) modal.classList.add('hidden');
        }

        function renderizarCardsFontes() {
            const container = document.getElementById('gridCardsFontesInternet');
            if (!container) return;
            container.innerHTML = '';

            FONTES_MERCADO_INTERNET.forEach(f => {
                const card = document.createElement('div');
                card.className = 'p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-sky-500/40 transition flex flex-col justify-between';
                card.innerHTML = `
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-1.5">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${f.badgeCor}">
                                ${f.badge}
                            </span>
                            
                        </div>
                        <h5 class="font-bold text-white text-xs flex items-center gap-1.5">
                            <i class="fa-solid ${f.icone} text-sky-400"></i>
                            <span>${f.nome}</span>
                        </h5>
                        <p class="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            ${f.descricao}
                        </p>
                    </div>
                    <div class="mt-2.5 pt-2 border-t border-slate-850 flex items-center justify-between">
                        <span class="text-[10px] text-slate-500 font-mono">${f.tipo}</span>
                        <a href="${f.url}" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 font-mono text-[11px] font-bold inline-flex items-center gap-1 hover:underline">
                            <span>Abrir site</span>
                            <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                        </a>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        // Exibe a tabela de referência embutida no app (PRECOS_PADRAO_MATERIAIS).
        // Não há consulta on-line: os valores são fixos e devem ser conferidos
        // no SINAPI do estado ou com fornecedores antes de um orçamento.
        function executarPesquisaPrecosOnline() {
            renderizarTabelasPesquisaInternet();
            const lblData = document.getElementById('lblDataPesquisaOnline');
            if (lblData) lblData.textContent = DATA_TABELA_PRECOS_REFERENCIA;
        }

        function renderizarTabelasPesquisaInternet() {
            const corpoCabos = document.getElementById('corpoTabelaPesquisaCabos');
            const corpoOutros = document.getElementById('corpoTabelaPesquisaOutros');

            if (corpoCabos) {
                corpoCabos.innerHTML = '';
                const bitolas = ['1.5', '2.5', '4.0', '6.0', '10.0', '16.0', '25.0'];
                bitolas.forEach(b => {
                    const info = PRECOS_PADRAO_MATERIAIS.cabos[b]?.refInternet;
                    if (!info) return;
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-slate-900/70 transition border-b border-slate-850';
                    tr.innerHTML = `
                        <td class="p-3 align-middle font-mono font-bold text-amber-300">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs">
                                <i class="fa-solid fa-bolt text-amber-400"></i> ${b} mm²
                            </span>
                        </td>
                        <td class="p-3 align-middle text-right font-mono font-bold text-emerald-400 text-xs">
                            R$ ${info.medio.toFixed(2).replace('.', ',')} / m
                        </td>
                        <td class="p-3 align-middle text-right font-mono font-bold text-blue-400 text-xs">
                            R$ ${info.roloMedio.toFixed(2).replace('.', ',')} / rolo
                        </td>
                        <td class="p-3 align-middle text-center font-mono text-[11px] text-slate-400">
                            R$ ${info.min.toFixed(2).replace('.', ',')} ~ R$ ${info.max.toFixed(2).replace('.', ',')}
                        </td>
                        <td class="p-3 align-middle">
                            <a href="${info.url}" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 font-mono text-[11px] hover:underline inline-flex items-center gap-1 font-semibold">
                                <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                <span>${info.fonte}</span>
                            </a>
                        </td>
                    `;
                    corpoCabos.appendChild(tr);
                });
            }

            if (corpoOutros) {
                corpoOutros.innerHTML = '';
                const outros = [
                    { nome: 'Eletroduto Corrugado DN 20 mm (1/2")', unid: 'm', ref: PRECOS_PADRAO_MATERIAIS.eletrodutos['20']?.refInternet },
                    { nome: 'Eletroduto Corrugado DN 25 mm (3/4")', unid: 'm', ref: PRECOS_PADRAO_MATERIAIS.eletrodutos['25']?.refInternet },
                    { nome: 'Eletroduto Corrugado DN 32 mm (1")', unid: 'm', ref: PRECOS_PADRAO_MATERIAIS.eletrodutos['32']?.refInternet },
                    { nome: 'Disjuntor DIN Monopolar Curva C', unid: 'un', ref: PRECOS_PADRAO_MATERIAIS.protecao['disj1p']?.refInternet },
                    { nome: 'Disjuntor DIN Bipolar Curva C', unid: 'un', ref: PRECOS_PADRAO_MATERIAIS.protecao['disj2p']?.refInternet },
                    { nome: 'Interruptor Diferencial Residual (IDR) 30mA', unid: 'un', ref: PRECOS_PADRAO_MATERIAIS.protecao['idr']?.refInternet },
                    { nome: 'Dispositivo Contra Surtos (DPS) 275V 20kA', unid: 'un', ref: PRECOS_PADRAO_MATERIAIS.protecao['dps']?.refInternet },
                    { nome: 'Tomada 2P+T 10A / 250V (NBR 14136)', unid: 'un', ref: PRECOS_PADRAO_MATERIAIS.aparelhagem['tomada10a']?.refInternet },
                    { nome: 'Plafon LED Quadrado Bivolt 18W/24W', unid: 'un', ref: PRECOS_PADRAO_MATERIAIS.iluminacao['plafon18w']?.refInternet },
                    { nome: 'Haste Aterramento Aço Cobreado 5/8" 2.40m', unid: 'un', ref: PRECOS_PADRAO_MATERIAIS.aterramento['haste']?.refInternet }
                ];

                outros.forEach(item => {
                    if (!item.ref) return;
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-slate-900/70 transition border-b border-slate-850';
                    tr.innerHTML = `
                        <td class="p-3 align-middle font-bold text-white text-xs">
                            ${item.nome}
                        </td>
                        <td class="p-3 align-middle text-center font-mono text-[11px] text-slate-400">
                            ${item.unid}
                        </td>
                        <td class="p-3 align-middle text-right font-mono font-bold text-emerald-400 text-xs">
                            R$ ${item.ref.medio.toFixed(2).replace('.', ',')} / ${item.unid}
                        </td>
                        <td class="p-3 align-middle text-center font-mono text-[11px] text-slate-400">
                            R$ ${item.ref.min.toFixed(2).replace('.', ',')} ~ R$ ${item.ref.max.toFixed(2).replace('.', ',')}
                        </td>
                        <td class="p-3 align-middle">
                            <a href="${item.ref.url || 'https://www.caixa.gov.br/'}" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 font-mono text-[11px] hover:underline inline-flex items-center gap-1 font-semibold">
                                <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                <span>${item.ref.fonte}</span>
                            </a>
                        </td>
                    `;
                    corpoOutros.appendChild(tr);
                });
            }
        }

        function aplicarPrecosMediosInternetAoProjeto() {
            inicializarTabelaPrecos();
            const bitolas = ['1.5', '2.5', '4.0', '6.0', '10.0', '16.0', '25.0'];
            bitolas.forEach(b => {
                const ref = PRECOS_PADRAO_MATERIAIS.cabos[b]?.refInternet;
                if (ref) {
                    state.tabelaPrecos.cabos[b] = {
                        metro: ref.medio,
                        rolo100: ref.roloMedio,
                        customizado: true,
                        fonte: 'Tabela de referência'
                    };
                }
            });

            ['20', '25', '32'].forEach(dn => {
                const ref = PRECOS_PADRAO_MATERIAIS.eletrodutos[dn]?.refInternet;
                if (ref) {
                    state.tabelaPrecos.eletrodutos[dn] = {
                        metro: ref.medio,
                        rolo50: ref.roloMedio,
                        customizado: true,
                        fonte: 'Tabela de referência'
                    };
                }
            });

            Object.keys(PRECOS_PADRAO_MATERIAIS.protecao).forEach(k => {
                const ref = PRECOS_PADRAO_MATERIAIS.protecao[k]?.refInternet;
                if (ref) {
                    state.tabelaPrecos.protecao[k] = {
                        unit: ref.medio,
                        customizado: true,
                        fonte: 'Tabela de referência'
                    };
                }
            });

            Object.keys(PRECOS_PADRAO_MATERIAIS.aparelhagem).forEach(k => {
                const ref = PRECOS_PADRAO_MATERIAIS.aparelhagem[k]?.refInternet;
                if (ref) {
                    state.tabelaPrecos.aparelhagem[k] = {
                        unit: ref.medio,
                        customizado: true,
                        fonte: 'Tabela de referência'
                    };
                }
            });

            state.tabelaPrecos.fonteAtual = 'Tabela de referência (média, out/2026)';
            delete state.tabelaPrecos.precosPorItem;
            recalcularOrcamentoComPrecos();
            fecharModalPesquisaPrecosInternet();
            mostrarNotificacaoToast('Tabela de referência aplicada e orçamento recalculado. Confira os valores com seus fornecedores.', 'sucesso');
        }

        function transferirPrecosInternetParaModalManual() {
            aplicarPrecosMediosInternetAoProjeto();
            abrirModalPrecosManuais();
        }

        // -------------------------------------------------------------
        // CONTROLADORES DO MODAL 3: EDIÇÃO RÁPIDA INDIVIDUAL
        // -------------------------------------------------------------
        let _itemEmEdicaoRapida = null;

        function editarPrecoRapidoMaterial(itemNome, precoAtual, categoria, unidade) {
            _itemEmEdicaoRapida = { itemNome, precoAtual: parseFloat(precoAtual) || 0, categoria, unidade };
            const modal = document.getElementById('modalEdicaoRapidaPreco');
            const lblNome = document.getElementById('lblEdicaoRapidaNomeItem');
            const blocoMetroRolo = document.getElementById('blocoEdicaoRapidaMetroRolo');
            const blocoUnidade = document.getElementById('blocoEdicaoRapidaUnidade');
            const inMetro = document.getElementById('inputEdicaoRapidaMetro');
            const inRolo = document.getElementById('inputEdicaoRapidaRolo');
            const inUnidade = document.getElementById('inputEdicaoRapidaUnidade');
            const lblRolo = document.getElementById('lblEdicaoRapidaRolo');
            const lblMedia = document.getElementById('lblEdicaoRapidaMediaOnline');

            if (!modal) return;
            if (lblNome) lblNome.textContent = itemNome;

            if (unidade === 'm') {
                if (blocoMetroRolo) blocoMetroRolo.classList.remove('hidden');
                if (blocoUnidade) blocoUnidade.classList.add('hidden');
                const ehCabo = categoria === 'condutores';
                const fatorRolo = ehCabo ? 100 : 50;
                if (lblRolo) lblRolo.textContent = ehCabo ? 'Preço / Rolo 100m (R$):' : 'Preço / Rolo 50m (R$):';
                if (inMetro) inMetro.value = _itemEmEdicaoRapida.precoAtual.toFixed(2);
                if (inRolo) inRolo.value = (_itemEmEdicaoRapida.precoAtual * fatorRolo).toFixed(2);

                let mediaRef = _itemEmEdicaoRapida.precoAtual;
                const matchSecao = itemNome.match(/(\d+(?:\.\d+)?)\s*mm²/);
                if (matchSecao && PRECOS_PADRAO_MATERIAIS.cabos[matchSecao[1]]) {
                    mediaRef = PRECOS_PADRAO_MATERIAIS.cabos[matchSecao[1]].refInternet.medio;
                }
                if (lblMedia) lblMedia.textContent = `R$ ${Number(mediaRef).toFixed(2)}/m (${ehCabo ? 'R$ ' + (mediaRef * 100).toFixed(2) + '/rolo' : 'R$ ' + (mediaRef * 50).toFixed(2) + '/rolo'})`;
                _itemEmEdicaoRapida.mediaRef = mediaRef;
            } else {
                if (blocoMetroRolo) blocoMetroRolo.classList.add('hidden');
                if (blocoUnidade) blocoUnidade.classList.remove('hidden');
                if (inUnidade) inUnidade.value = _itemEmEdicaoRapida.precoAtual.toFixed(2);
                if (lblMedia) lblMedia.textContent = `R$ ${_itemEmEdicaoRapida.precoAtual.toFixed(2)}/un`;
                _itemEmEdicaoRapida.mediaRef = _itemEmEdicaoRapida.precoAtual;
            }

            modal.classList.remove('hidden');
        }

        // "Alterar" na tabela de materiais: pelo índice (o nome do item pode ter aspas, ex. 3/4")
        function editarPrecoMaterialIdx(idx) {
            const m = (state.quantitativoMateriaisDetalhado || [])[idx];
            if (m) editarPrecoRapidoMaterial(m.item, m.precoUnit, m.categoriaId, m.unidade);
        }

        function editarPrecoBitolaRapido(secao) {
            const secaoLimpa = (secao || '2.5').toString().replace(' mm²', '').trim();
            const precoM = obterPrecoCaboMetro(secaoLimpa);
            editarPrecoRapidoMaterial(`Cabo Flexível de Cobre 750V ${secaoLimpa} mm²`, precoM, 'condutores', 'm');
        }

        function fecharModalEdicaoRapidaPreco() {
            const modal = document.getElementById('modalEdicaoRapidaPreco');
            if (modal) modal.classList.add('hidden');
            _itemEmEdicaoRapida = null;
        }

        function sincronizarEdicaoRapida(campoAlterado) {
            if (!_itemEmEdicaoRapida || _itemEmEdicaoRapida.unidade !== 'm') return;
            const inMetro = document.getElementById('inputEdicaoRapidaMetro');
            const inRolo = document.getElementById('inputEdicaoRapidaRolo');
            const ehCabo = _itemEmEdicaoRapida.categoria === 'condutores';
            const fator = ehCabo ? 100 : 50;

            if (campoAlterado === 'metro' && inMetro && inRolo) {
                const m = parseFloat(inMetro.value) || 0;
                inRolo.value = (m * fator).toFixed(2);
            } else if (campoAlterado === 'rolo' && inMetro && inRolo) {
                const r = parseFloat(inRolo.value) || 0;
                inMetro.value = (r / fator).toFixed(2);
            }
        }

        function aplicarMediaOnlineNaEdicaoRapida() {
            if (!_itemEmEdicaoRapida) return;
            const inMetro = document.getElementById('inputEdicaoRapidaMetro');
            const inRolo = document.getElementById('inputEdicaoRapidaRolo');
            const inUnidade = document.getElementById('inputEdicaoRapidaUnidade');
            const med = _itemEmEdicaoRapida.mediaRef || _itemEmEdicaoRapida.precoAtual;
            const ehCabo = _itemEmEdicaoRapida.categoria === 'condutores';
            const fator = ehCabo ? 100 : 50;

            if (_itemEmEdicaoRapida.unidade === 'm') {
                if (inMetro) inMetro.value = Number(med).toFixed(2);
                if (inRolo) inRolo.value = (Number(med) * fator).toFixed(2);
            } else {
                if (inUnidade) inUnidade.value = Number(med).toFixed(2);
            }
        }

        function confirmarEdicaoRapidaPreco() {
            if (!_itemEmEdicaoRapida) return;
            inicializarTabelaPrecos();
            const inMetro = document.getElementById('inputEdicaoRapidaMetro');
            const inUnidade = document.getElementById('inputEdicaoRapidaUnidade');

            let novoPreco = 0;
            if (_itemEmEdicaoRapida.unidade === 'm') {
                novoPreco = parseFloat(inMetro?.value) || _itemEmEdicaoRapida.precoAtual;
                if (_itemEmEdicaoRapida.categoria === 'condutores') {
                    const matchSecao = _itemEmEdicaoRapida.itemNome.match(/(\d+(?:\.\d+)?)\s*mm²/);
                    const b = matchSecao ? matchSecao[1] : '2.5';
                    state.tabelaPrecos.cabos[b] = {
                        metro: novoPreco,
                        rolo100: novoPreco * 100,
                        customizado: true,
                        fonte: 'Inserção Manual'
                    };
                } else if (_itemEmEdicaoRapida.categoria === 'eletrodutos') {
                    const matchDn = _itemEmEdicaoRapida.itemNome.match(/DN\s*(\d+)/i);
                    const dn = matchDn ? matchDn[1] : '25';
                    state.tabelaPrecos.eletrodutos[dn] = {
                        metro: novoPreco,
                        rolo50: novoPreco * 50,
                        customizado: true,
                        fonte: 'Inserção Manual'
                    };
                }
            } else {
                novoPreco = parseFloat(inUnidade?.value) || _itemEmEdicaoRapida.precoAtual;
            }

            const itemNomeSalvo = _itemEmEdicaoRapida.itemNome;

            // Itens sem preço por bitola/DN: guarda o valor do próprio item (antes ele
            // só era trocado na linha e se perdia no recálculo logo em seguida)
            const ehMetroTabelado = _itemEmEdicaoRapida.unidade === 'm' &&
                (_itemEmEdicaoRapida.categoria === 'condutores' || _itemEmEdicaoRapida.categoria === 'eletrodutos');
            if (!ehMetroTabelado && novoPreco > 0) {
                if (!state.tabelaPrecos.precosPorItem) state.tabelaPrecos.precosPorItem = {};
                state.tabelaPrecos.precosPorItem[itemNomeSalvo] = { valor: novoPreco, fonte: 'Inserção Manual' };
            }

            recalcularOrcamentoComPrecos();
            fecharModalEdicaoRapidaPreco();
            mostrarNotificacaoToast(`Valor de "${itemNomeSalvo}" atualizado para R$ ${novoPreco.toFixed(2)}!`, 'sucesso');
        }

        let _categoriaMaterialFiltroAtiva = 'todos';

        function calcularQuantitativoMateriaisCompleto(comodosParaCalcular, circuitosFinais, calculoDemanda) {
            const materiais = [];
            const pavs = (state.pavimentos && Array.isArray(state.pavimentos)) ? state.pavimentos : [];
            const imovs = (state.imoveis && Array.isArray(state.imoveis)) ? state.imoveis : [];
            const pontos = (state.pontosEletricos && Array.isArray(state.pontosEletricos)) ? state.pontosEletricos : [];
            const ehUnidadeEspecifica = !!state.unidadeQdtAtivaId && state.unidadeQdtAtivaId !== 'geral';
            const imovelAtivo = (ehUnidadeEspecifica && imovs.length > 0) ? (imovs.find(i => i.id === state.unidadeQdtAtivaId) || null) : null;

            // 1. DADOS DE ENTRADA & PARÂMETROS GERAIS
            const catAtend = (calculoDemanda && calculoDemanda.categoriaAtend) ? calculoDemanda.categoriaAtend : {};
            // alimentador dimensionado pela NBR 5410 (11-circuitos.js); a seção da concessionária é o mínimo
            const fmtSecao = sec => `${Number(sec).toFixed(1)} mm²`;
            const caboGeral = state.alimentadorNBR ? fmtSecao(state.alimentadorNBR.secao) : (catAtend.cabo || '10.0 mm²');
            const caboPEGeral = state.alimentadorNBR ? fmtSecao(state.alimentadorNBR.secaoPE) : caboGeral;
            const disjGeral = catAtend.disj || '50 A';
            const tuboGeral = catAtend.tubo || 'DN 32 mm (1")';

            let sistemaUsado = (state.alimentacaoExterna && state.alimentacaoExterna.sistema) ? state.alimentacaoExterna.sistema : 'bifasico';
            if (ehUnidadeEspecifica && imovelAtivo && imovelAtivo.sistema) {
                sistemaUsado = imovelAtivo.sistema;
            }

            let numCondutoresAlim = 4;
            let detCondutoresAlim = '2 Fases (Preto/Vermelho) + 1 Neutro (Azul Claro) + 1 Terra (Verde)';
            if (sistemaUsado === 'trifasico') {
                numCondutoresAlim = 5;
                detCondutoresAlim = '3 Fases (Preto/Vermelho/Branco) + 1 Neutro (Azul Claro) + 1 Terra (Verde)';
            } else if (sistemaUsado === 'monofasico') {
                numCondutoresAlim = 3;
                detCondutoresAlim = '1 Fase (Preto) + 1 Neutro (Azul Claro) + 1 Terra (Verde)';
            }

            const qdtX = (state.qdtPos && typeof state.qdtPos.x === 'number') ? state.qdtPos.x : 100;
            const qdtY = (state.qdtPos && typeof state.qdtPos.y === 'number') ? state.qdtPos.y : 100;
            const qdtW = (state.qdtPos && typeof state.qdtPos.w === 'number') ? state.qdtPos.w : 40;
            const qdtH = (state.qdtPos && typeof state.qdtPos.h === 'number') ? state.qdtPos.h : 30;
            const qdtCx = qdtX + qdtW / 2;
            const qdtCy = qdtY + qdtH / 2;

            const alimX = (state.alimentacaoExterna && typeof state.alimentacaoExterna.x === 'number') ? state.alimentacaoExterna.x : 20;
            const alimY = (state.alimentacaoExterna && typeof state.alimentacaoExterna.y === 'number') ? state.alimentacaoExterna.y : 20;
            const alimW = (state.alimentacaoExterna && typeof state.alimentacaoExterna.w === 'number') ? state.alimentacaoExterna.w : 30;
            const alimH = (state.alimentacaoExterna && typeof state.alimentacaoExterna.h === 'number') ? state.alimentacaoExterna.h : 20;
            const alimCx = alimX + alimW / 2;
            const alimCy = alimY + alimH / 2;

            const distPxAlim = Math.sqrt(Math.pow(qdtCx - alimCx, 2) + Math.pow(qdtCy - alimCy, 2));
            const escala = (typeof state.escala === 'number' && state.escala > 0) ? state.escala : 40;
            const distCadAlim = Math.max(4, Math.ceil((distPxAlim / escala) + 3.0));
            const distAlimUsada = (ehUnidadeEspecifica && imovelAtivo && imovelAtivo.distancia) 
                ? imovelAtivo.distancia 
                : ((state.alimentacaoExterna && state.alimentacaoExterna.distanciaManual) || distCadAlim);

            const totalMetrosAlimentador = numCondutoresAlim * distAlimUsada;
            const metrosPrumadaVertical = (state.prumadaAtiva !== false && state.regimeImovel === 'mesmo_imovel') ? Math.max(0, pavs.length - 1) * 3.0 : 0;

            // Helper para adicionar item de material com margem (+10% norma) e preços médios SINAPI/varejo
            function addItem(cat, catId, nome, espec, qtdCalc, unid, precoUnit, aplicacao, margemPct = 0.10, chaveItem = '') {
                const margem = Math.ceil(qtdCalc * margemPct);
                const qtdTotal = qtdCalc + margem;
                let fonte = (typeof obterFontePrecoMaterial === 'function') ? obterFontePrecoMaterial(catId, chaveItem) : 'Tabela de referência';
                // preço definido para este item (pesquisa na internet ou "Alterar") prevalece
                const precoDoItem = state.tabelaPrecos && state.tabelaPrecos.precosPorItem && state.tabelaPrecos.precosPorItem[nome];
                if (precoDoItem && Number(precoDoItem.valor) > 0) {
                    precoUnit = Number(precoDoItem.valor);
                    fonte = precoDoItem.fonte || 'Inserção Manual';
                }
                const subtotal = qtdTotal * precoUnit;
                materiais.push({
                    categoria: cat,
                    categoriaId: catId,
                    chaveItem: chaveItem,
                    item: nome,
                    especificacao: espec,
                    qtdCalculada: qtdCalc,
                    margemSobras: margem,
                    qtdTotal: qtdTotal,
                    unidade: unid,
                    precoUnit: precoUnit,
                    subtotal: subtotal,
                    aplicacao: aplicacao,
                    fontePreco: fonte
                });
            }

            // -------------------------------------------------------------
            // CÁLCULO ESTRUTURADO DE CONDUTORES POR SEÇÃO E COR (NBR 5410)
            // -------------------------------------------------------------
            const mapCabosPorCor = {};
            let somaMetragensFinais = 0;

            function normalizarSecaoBitola(str) {
                if (!str) return '2.5 mm²';
                const n = parseFloat(str.toString().replace(' mm²', '').replace(',', '.').trim()) || 2.5;
                return (n % 1 === 0 ? n.toFixed(1) : n.toString()) + ' mm²';
            }

            function registrarCaboCor(secao, funcao, cor, corHex, metros, circRef, precoUnit, aplicacaoGeral) {
                if (!metros || metros <= 0) return;
                const secaoNorm = normalizarSecaoBitola(secao);
                const key = `${secaoNorm}_${funcao}_${cor}`;
                if (!mapCabosPorCor[key]) {
                    let normaStr = 'NBR NM 247-3 / NBR 5410';
                    if (cor.includes('Azul')) normaStr = 'NBR 5410 Item 6.1.5.3.1 (Obrigatório Azul Claro)';
                    else if (cor.includes('Verde')) normaStr = 'NBR 5410 Item 6.1.5.3.2 (Obrigatório Verde ou Verde-Amarelo)';
                    else if (cor.includes('Amarelo')) normaStr = 'NBR 5410 / NBR NM 247-3 (Retorno de Iluminação)';
                    else normaStr = 'NBR 5410 Item 6.1.5.3.3 (Condutor Fase)';

                    mapCabosPorCor[key] = {
                        secao: secaoNorm,
                        secaoNum: parseFloat(secaoNorm) || 2.5,
                        funcao: funcao,
                        cor: cor,
                        corHex: corHex,
                        norma: normaStr,
                        metrosProjeto: 0,
                        circuitos: [],
                        precoUnit: precoUnit,
                        aplicacao: aplicacaoGeral
                    };
                }
                mapCabosPorCor[key].metrosProjeto += Math.ceil(metros);
                if (circRef && !mapCabosPorCor[key].circuitos.includes(circRef)) {
                    mapCabosPorCor[key].circuitos.push(circRef);
                }
            }

            // Preços de referência de cabos 750V por bitola (R$/m)
            const precosCabos = {
                '1.5': (typeof obterPrecoCaboMetro === 'function' ? obterPrecoCaboMetro('1.5') : 1.85),
                '2.5': (typeof obterPrecoCaboMetro === 'function' ? obterPrecoCaboMetro('2.5') : 2.85),
                '4.0': (typeof obterPrecoCaboMetro === 'function' ? obterPrecoCaboMetro('4.0') : 4.60),
                '6.0': (typeof obterPrecoCaboMetro === 'function' ? obterPrecoCaboMetro('6.0') : 6.90),
                '10.0': (typeof obterPrecoCaboMetro === 'function' ? obterPrecoCaboMetro('10.0') : 11.50),
                '16.0': (typeof obterPrecoCaboMetro === 'function' ? obterPrecoCaboMetro('16.0') : 18.00),
                '25.0': (typeof obterPrecoCaboMetro === 'function' ? obterPrecoCaboMetro('25.0') : 28.00),
                '16': (typeof obterPrecoCaboMetro === 'function' ? obterPrecoCaboMetro('16.0') : 18.00),
                '10': (typeof obterPrecoCaboMetro === 'function' ? obterPrecoCaboMetro('10.0') : 11.50),
                '6': (typeof obterPrecoCaboMetro === 'function' ? obterPrecoCaboMetro('6.0') : 6.90),
                '4': (typeof obterPrecoCaboMetro === 'function' ? obterPrecoCaboMetro('4.0') : 4.60)
            };

            (circuitosFinais || []).forEach(circ => {
                const rota = circ.rota || circ.rotaCad || 15;
                somaMetragensFinais += rota;
                const secaoStr = (circ.cabo || '2.5 mm²').replace(' mm²', '').replace(',', '.').trim();
                const bitola = `${secaoStr} mm²`;
                const prc = (typeof obterPrecoCaboMetro === 'function') ? obterPrecoCaboMetro(secaoStr) : (precosCabos[secaoStr] || 2.85);
                const ref = `C${circ.num} (${circ.nome})`;

                if (circ.tipo === 'Iluminação') {
                    // Neutro (Azul Claro) - NBR 5410 6.1.5.3.1
                    registrarCaboCor(bitola, 'Condutor Neutro (N)', 'Azul Claro', '#3b82f6', rota, ref, prc, 'Retorno de neutro para lâmpadas e luminárias');
                    // Fase (Preto) - NBR 5410 6.1.5.3.3
                    registrarCaboCor(bitola, 'Condutor Fase (F)', 'Preto', '#1e293b', rota, ref, prc, 'Alimentação fase contínua nos interruptores de comando');
                    // Retorno (Amarelo) - NBR 5410
                    registrarCaboCor(bitola, 'Condutor Retorno (R)', 'Amarelo', '#eab308', Math.round(rota * 0.85), ref, prc, 'Comando entre interruptores e pontos de luz');
                    // Terra (Verde) - NBR 5410 6.1.5.3.2
                    registrarCaboCor(bitola, 'Condutor de Proteção (PE)', 'Verde', '#10b981', rota, ref, prc, 'Proteção e aterramento de carcaças e luminárias');
                } else if (circ.tipo === 'TUG') {
                    if (circ.polos === '2P') {
                        // 220V Bifásico
                        registrarCaboCor(bitola, 'Condutor Fase 1 (R)', 'Preto', '#1e293b', rota, ref, prc, 'Fase 1 dos circuitos bifásicos de tomadas 220V');
                        registrarCaboCor(bitola, 'Condutor Fase 2 (S)', 'Vermelho', '#ef4444', rota, ref, prc, 'Fase 2 dos circuitos bifásicos de tomadas 220V');
                        registrarCaboCor(bitola, 'Condutor de Proteção (PE)', 'Verde', '#10b981', rota, ref, prc, 'Pino central de terra das tomadas NBR 14136');
                    } else {
                        // 127V Monofásico
                        registrarCaboCor(bitola, 'Condutor Fase (F)', 'Vermelho', '#ef4444', rota, ref, prc, 'Fase dos circuitos de Tomadas de Uso Geral (TUG)');
                        registrarCaboCor(bitola, 'Condutor Neutro (N)', 'Azul Claro', '#3b82f6', rota, ref, prc, 'Neutro dos circuitos de Tomadas de Uso Geral (TUG)');
                        registrarCaboCor(bitola, 'Condutor de Proteção (PE)', 'Verde', '#10b981', rota, ref, prc, 'Pino de aterramento central (NBR 14136)');
                    }
                } else if (circ.tipo === 'TUE') {
                    if (circ.polos === '2P') {
                        // Cargas 220V bifásicas (Chuveiro, Torneira, Ar, Forno)
                        registrarCaboCor(bitola, 'Condutor Fase 1 (R)', 'Preto', '#1e293b', rota, ref, prc, 'Fase 1 para aparelhos de alta potência 220V');
                        registrarCaboCor(bitola, 'Condutor Fase 2 (S)', 'Vermelho', '#ef4444', rota, ref, prc, 'Fase 2 para aparelhos de alta potência 220V');
                        registrarCaboCor(bitola, 'Condutor de Proteção (PE)', 'Verde', '#10b981', rota, ref, prc, 'Aterramento obrigatório da carcaça do aparelho TUE');
                        if (NBR5410.tueComNeutro(circ.nome)) {
                            registrarCaboCor(bitola, 'Condutor Neutro (N)', 'Azul Claro', '#3b82f6', rota, ref, prc, 'Neutro para placa eletrônica/comando 127V do aparelho');
                        }
                    } else {
                        // 127V Monofásico TUE
                        registrarCaboCor(bitola, 'Condutor Fase (F)', 'Vermelho', '#ef4444', rota, ref, prc, 'Fase para circuito exclusivo TUE');
                        registrarCaboCor(bitola, 'Condutor Neutro (N)', 'Azul Claro', '#3b82f6', rota, ref, prc, 'Neutro para circuito exclusivo TUE');
                        registrarCaboCor(bitola, 'Condutor de Proteção (PE)', 'Verde', '#10b981', rota, ref, prc, 'Aterramento do pino central do aparelho TUE');
                    }
                } else {
                    registrarCaboCor(bitola, 'Condutor Fase (F)', 'Vermelho', '#ef4444', rota, ref, prc, 'Condutor fase do circuito');
                    registrarCaboCor(bitola, 'Condutor Neutro (N)', 'Azul Claro', '#3b82f6', rota, ref, prc, 'Condutor neutro do circuito');
                    registrarCaboCor(bitola, 'Condutor de Proteção (PE)', 'Verde', '#10b981', rota, ref, prc, 'Condutor de proteção (terra)');
                }
            });

            // Condutores do Alimentador Geral (Entrada no QDT)
            const prcAlim = (typeof obterPrecoCaboMetro === 'function') ? obterPrecoCaboMetro(caboGeral) : 14.50;
            if (sistemaUsado === 'trifasico') {
                registrarCaboCor(caboGeral, 'Condutor Fase 1 (R)', 'Preto', '#1e293b', distAlimUsada, 'Alimentador Geral', prcAlim, 'Entrada Fase 1 da Concessionária');
                registrarCaboCor(caboGeral, 'Condutor Fase 2 (S)', 'Vermelho', '#ef4444', distAlimUsada, 'Alimentador Geral', prcAlim, 'Entrada Fase 2 da Concessionária');
                registrarCaboCor(caboGeral, 'Condutor Fase 3 (T)', 'Branco / Cinza', '#94a3b8', distAlimUsada, 'Alimentador Geral', prcAlim, 'Entrada Fase 3 da Concessionária');
                registrarCaboCor(caboGeral, 'Condutor Neutro (N)', 'Azul Claro', '#3b82f6', distAlimUsada, 'Alimentador Geral', prcAlim, 'Entrada Neutro da Concessionária');
                registrarCaboCor(caboPEGeral, 'Condutor de Proteção (PE)', 'Verde', '#10b981', distAlimUsada, 'Alimentador Geral', prcAlim, 'Condutor de aterramento da malha / BEP');
            } else if (sistemaUsado === 'bifasico') {
                registrarCaboCor(caboGeral, 'Condutor Fase 1 (R)', 'Preto', '#1e293b', distAlimUsada, 'Alimentador Geral', prcAlim, 'Entrada Fase 1 da Concessionária');
                registrarCaboCor(caboGeral, 'Condutor Fase 2 (S)', 'Vermelho', '#ef4444', distAlimUsada, 'Alimentador Geral', prcAlim, 'Entrada Fase 2 da Concessionária');
                registrarCaboCor(caboGeral, 'Condutor Neutro (N)', 'Azul Claro', '#3b82f6', distAlimUsada, 'Alimentador Geral', prcAlim, 'Entrada Neutro da Concessionária');
                registrarCaboCor(caboPEGeral, 'Condutor de Proteção (PE)', 'Verde', '#10b981', distAlimUsada, 'Alimentador Geral', prcAlim, 'Condutor de aterramento da malha / BEP');
            } else {
                registrarCaboCor(caboGeral, 'Condutor Fase (F)', 'Preto', '#1e293b', distAlimUsada, 'Alimentador Geral', prcAlim, 'Entrada Fase Monofásica da Concessionária');
                registrarCaboCor(caboGeral, 'Condutor Neutro (N)', 'Azul Claro', '#3b82f6', distAlimUsada, 'Alimentador Geral', prcAlim, 'Entrada Neutro da Concessionária');
                registrarCaboCor(caboPEGeral, 'Condutor de Proteção (PE)', 'Verde', '#10b981', distAlimUsada, 'Alimentador Geral', prcAlim, 'Condutor de aterramento da malha / BEP');
            }

            // Prumada Vertical (se houver)
            if (metrosPrumadaVertical > 0) {
                registrarCaboCor('10.0 mm²', 'Prumada Vertical Fase', 'Vermelho', '#ef4444', metrosPrumadaVertical * (sistemaUsado === 'trifasico' ? 3 : 2), 'Prumada Shaft', 11.50, 'Interligação vertical entre pavimentos');
                registrarCaboCor('10.0 mm²', 'Prumada Vertical Neutro', 'Azul Claro', '#3b82f6', metrosPrumadaVertical, 'Prumada Shaft', 11.50, 'Neutro da prumada vertical');
                registrarCaboCor('10.0 mm²', 'Prumada Vertical Terra', 'Verde', '#10b981', metrosPrumadaVertical, 'Prumada Shaft', 11.50, 'Equipotencialização vertical PE');
            }

            // -------------------------------------------------------------
            // AGRUPAMENTO ESTRUTURADO DE CONDUTORES POR BITOLA & CORES (NBR 5410)
            // -------------------------------------------------------------
            const ordemPrioridadeCores = {
                'Preto': 1,
                'Vermelho': 2,
                'Branco / Cinza': 3,
                'Branco': 3,
                'Cinza': 3,
                'Amarelo': 4,
                'Azul Claro': 5,
                'Verde': 6,
                'Verde / Amarelo': 6
            };

            const quantitativoCabosPorCor = Object.values(mapCabosPorCor);

            quantitativoCabosPorCor.forEach(c => {
                c.sobra = Math.ceil(c.metrosProjeto * 0.10);
                c.metrosTotal = c.metrosProjeto + c.sobra;
                c.subtotal = c.metrosTotal * c.precoUnit;
                
                const rolos100 = Math.floor(c.metrosTotal / 100);
                const sobraMetro = c.metrosTotal % 100;
                if (rolos100 >= 1 && sobraMetro === 0) {
                    c.rolosSugeridos = `${rolos100} rolo(s) de 100m fechado`;
                } else if (rolos100 >= 1 && sobraMetro > 0) {
                    c.rolosSugeridos = `${rolos100} rolo(s) de 100m + ${sobraMetro}m avulso`;
                } else {
                    c.rolosSugeridos = `1 rolo comercial 100m (sobra de ${100 - c.metrosTotal}m)`;
                }
                c.circuitosStr = c.circuitos.join(', ');
            });

            // Agrupa condutores por bitola (secaoNorm)
            const mapGruposBitola = {};
            quantitativoCabosPorCor.forEach(c => {
                if (!mapGruposBitola[c.secao]) {
                    mapGruposBitola[c.secao] = {
                        secao: c.secao,
                        secaoNum: c.secaoNum,
                        metrosProjetoTotal: 0,
                        sobraTotal: 0,
                        metrosTotal: 0,
                        subtotal: 0,
                        rolos100Total: 0,
                        cores: []
                    };
                }
                const gb = mapGruposBitola[c.secao];
                gb.metrosProjetoTotal += c.metrosProjeto;
                gb.sobraTotal += c.sobra;
                gb.metrosTotal += c.metrosTotal;
                gb.subtotal += c.subtotal;
                gb.cores.push(c);
            });

            const quantitativoCabosAgrupadosPorBitola = Object.values(mapGruposBitola).sort((a, b) => a.secaoNum - b.secaoNum);

            quantitativoCabosAgrupadosPorBitola.forEach(gb => {
                gb.rolos100Total = Math.ceil(gb.metrosTotal / 100);
                gb.cores.sort((a, b) => {
                    const pA = ordemPrioridadeCores[a.cor] || 10;
                    const pB = ordemPrioridadeCores[b.cor] || 10;
                    if (pA !== pB) return pA - pB;
                    return a.funcao.localeCompare(b.funcao);
                });
            });

            // Array linear de cabos ordenado por bitola e depois por cor normativa
            const cabosOrdenadosAgrupados = [];
            quantitativoCabosAgrupadosPorBitola.forEach(gb => {
                gb.cores.forEach(c => cabosOrdenadosAgrupados.push(c));
            });

            state.quantitativoCabosAgrupadosPorBitola = quantitativoCabosAgrupadosPorBitola;
            state.quantitativoCabosPorCor = cabosOrdenadosAgrupados;

            // Adiciona cada condutor detalhado por cor à lista geral de materiais (Categoria 1) em ordem de bitola e cor
            cabosOrdenadosAgrupados.forEach(c => {
                addItem(
                    'Condutores Elétricos', 'condutores',
                    `Cabo Flexível de Cobre 750V ${c.secao} - Cor: ${c.cor} (${c.funcao})`,
                    `${c.norma}, Cobre Classe 5, PVC 70°C Anti-chamas BWF-B`,
                    c.metrosProjeto, 'm', c.precoUnit,
                    `${c.aplicacao} - Circuitos: ${c.circuitosStr}`,
                    0.10, c.secao.replace(' mm²', '').trim()
                );
            });

            // -------------------------------------------------------------
            // CATEGORIA 2: ELETRODUTOS, CONEXÕES & INFRAESTRUTURA
            // -------------------------------------------------------------
            const qtdAndaresChao = pavs.filter(p => (p.tipoPassagemCabos === 'chao' || (!p.tipoPassagemCabos && state.tipoPassagemCabos === 'chao'))).length;
            const ehInfraUnica = (qtdAndaresChao > 1 || (qtdAndaresChao >= 1 && pavs.length > 1));
            const fatorEletroduto = ehInfraUnica ? 0.75 : 1.0;
            const metragemEletrodutoBase = Math.ceil((somaMetragensFinais * 1.15) * fatorEletroduto);
            // Distribui a metragem de eletroduto pelo DN calculado de cada circuito
            // (taxa de ocupação, NBR 5410 item 6.2.11.1.6 — js/nbr5410.js)
            const rotaPorDN = {};
            let rotaTotalCirc = 0;
            (circuitosFinais || []).forEach(circ => {
                const dn = circ.eletrodutoDN || 20;
                const r = circ.rota || circ.rotaCad || 0;
                rotaPorDN[dn] = (rotaPorDN[dn] || 0) + r;
                rotaTotalCirc += r;
            });
            if (rotaTotalCirc === 0) { rotaPorDN[20] = 1; rotaTotalCirc = 1; }
            const precoRef32 = (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('eletrodutos', '32', 4.50) : 4.50);
            NBR5410.ELETRODUTOS_DN.forEach(e => {
                const metros = Math.ceil(metragemEletrodutoBase * ((rotaPorDN[e.dn] || 0) / rotaTotalCirc));
                if (metros <= 0) return;
                // DN acima de 32 sem preço cadastrado: estimativa proporcional ao DN 32 (revise com cotação)
                const precoPadrao = { 20: 2.30, 25: 3.10, 32: 4.50 }[e.dn] || Math.round(precoRef32 * (e.dn / 32) * 100) / 100;
                const preco = (typeof obterPrecoMaterial === 'function') ? obterPrecoMaterial('eletrodutos', String(e.dn), precoPadrao) : precoPadrao;
                const circs = (circuitosFinais || []).filter(c => (c.eletrodutoDN || 20) === e.dn).map(c => 'C' + c.num);
                addItem(
                    'Eletrodutos & Conexões', 'eletrodutos',
                    `Eletroduto Corrugado Flexível Reforçado DN ${e.dn} mm (${e.polegadas})`,
                    'NBR 15465, PVC Anti-chamas (dimensionado pela taxa de ocupação, NBR 5410 item 6.2.11.1.6)',
                    metros, 'm', preco,
                    `Circuitos ${circs.join(', ')}`
                );
            });

            const totComodos = (comodosParaCalcular || []).length;
            const totCurvas = Math.max(8, Math.round(totComodos * 3.5));
            const totLuvas = Math.max(10, Math.round(metragemEletrodutoBase / 6));
            const totAdaptadores = Math.max(20, Math.round(totComodos * 8));

            addItem(
                'Eletrodutos & Conexões', 'eletrodutos',
                'Curva 90° em PVC para Eletroduto 3/4" (25mm)',
                'NBR 15465, Raio longo para fácil puxamento de condutores',
                totCurvas, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('eletrodutos', 'curva25', 2.90) : 2.90),
                'Transições suaves de 90° entre teto e paredes embutidas'
            );
            addItem(
                'Eletrodutos & Conexões', 'eletrodutos',
                'Luva de União / Emenda para Eletroduto 3/4" e 1"',
                'NBR 15465, Encaixe com travamento mecânico para corrugados',
                totLuvas, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('eletrodutos', 'luva25', 1.80) : 1.80),
                'Emendas de trechos contínuos de eletrodutos'
            );
            addItem(
                'Eletrodutos & Conexões', 'eletrodutos',
                'Adaptador / Conector para Caixa de Embutir 3/4" (com Bucha e Arruela)',
                'Termoplástico anti-chama, fixação de eletroduto nas caixas 4x2 e 4x4',
                totAdaptadores, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('eletrodutos', 'adaptador25', 1.40) : 1.40),
                'Conexão e vedação das entradas de eletroduto nas caixas de passagem'
            );

            // -------------------------------------------------------------
            // CATEGORIA 3: CAIXAS DE PASSAGEM & DERIVAÇÃO
            // -------------------------------------------------------------
            const pontosNoCalculo = pontos.filter(p => (comodosParaCalcular || []).some(c => c.id === p.comodoId));
            const totTugQtd = pontosNoCalculo.filter(p => p.tipo === 'TUG').length;
            const totTueQtd = pontosNoCalculo.filter(p => p.tipo === 'TUE').length;
            const totIntQtd = pontosNoCalculo.filter(p => p.tipo === 'INTERRUPTOR').length || totComodos;
            const totIlumQtd = pontosNoCalculo.filter(p => p.tipo === 'ILUM').length || totComodos;

            const totCaixas4x2 = totTugQtd + totTueQtd + totIntQtd;
            const totCaixasOcto = Math.max(totIlumQtd, totComodos);
            const totCaixas4x4 = Math.max(2, Math.round(totComodos * 0.5));

            addItem(
                'Caixas de Passagem', 'caixas',
                'Caixa de Embutir 4x2" Termoplástica Amarela',
                'NBR 5431 / NBR 5410, Termoplástico Anti-chamas com orelhas reforçadas para parafusos',
                totCaixas4x2, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('caixas', '4x2', 2.50) : 2.50),
                'Instalação embutida em paredes de alvenaria para tomadas e interruptores'
            );
            addItem(
                'Caixas de Passagem', 'caixas',
                'Caixa Octogonal de Teto 4x4" com Fundo Móvel / Para Laje',
                'NBR 5431, Termoplástico para embutir em lajes de concreto pré-moldadas e maciças',
                totCaixasOcto, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('caixas', 'octogonal', 4.20) : 4.20),
                'Pontos centrais de luz no teto e derivação de circuitos de iluminação'
            );
            addItem(
                'Caixas de Passagem', 'caixas',
                'Caixa Quadrada 4x4" de Parede com Tampa',
                'NBR 5431, Passagem intermediária de condutores e emendas',
                totCaixas4x4, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('caixas', '4x4', 5.80) : 5.80),
                'Derivação em paredes com grande concentração de circuitos terminais'
            );
            addItem(
                'Caixas de Passagem', 'caixas',
                'Tampa Cega Termoplástica 4x2" Branca',
                'Acabamento branco com parafusos de fixação',
                Math.max(4, Math.round(totCaixas4x2 * 0.1)), 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('caixas', 'tampa4x2', 3.50) : 3.50),
                'Fechamento e proteção estética de caixas de passagem sem tomadas'
            );

            // -------------------------------------------------------------
            // CATEGORIA 4: DISJUNTORES INDIVIDUAIS, CURVAS & QDT DIN (NBR IEC 60898)
            // -------------------------------------------------------------
            const mapDisjuntores = {};
            const numQdts = ehUnidadeEspecifica ? 1 : Math.max(1, pavs.length);

            // 1. Disjuntor Geral
            const numPolsGeral = sistemaUsado === 'trifasico' ? '3P' : (sistemaUsado === 'bifasico' ? '2P' : '1P');
            const keyGeral = `GERAL_${numPolsGeral}_${disjGeral}_CurvaC`;
            mapDisjuntores[keyGeral] = {
                tipo: `Disjuntor Geral Termomagnético ${numPolsGeral}`,
                polos: numPolsGeral,
                polosDesc: sistemaUsado === 'trifasico' ? 'Tripolar (3P)' : (sistemaUsado === 'bifasico' ? 'Bipolar (2P)' : 'Monopolar (1P)'),
                curva: 'Curva C (5 a 10×In)',
                correnteStr: disjGeral,
                correnteA: parseInt(disjGeral) || 50,
                tensao: sistemaUsado === 'monofasico' ? '127V / 230V' : '220V / 400V',
                icn: '3 kA / 5 kA a 230/400V (NBR IEC 60898)',
                qtdProjeto: numQdts,
                reserva: 0,
                qtdTotal: numQdts,
                precoUnit: (typeof obterPrecoMaterial === 'function') ? (sistemaUsado === 'trifasico' ? obterPrecoMaterial('protecao', 'disjGeral3p', 75.0) : (sistemaUsado === 'bifasico' ? obterPrecoMaterial('protecao', 'disjGeral2p', 48.0) : obterPrecoMaterial('protecao', 'disjGeral1p', 25.0))) : (sistemaUsado === 'trifasico' ? 75.0 : (sistemaUsado === 'bifasico' ? 48.0 : 25.0)),
                circuitos: ['Entrada Geral do QDT (Alimentador Principal)'],
                funcao: 'Proteção geral de entrada contra sobrecarga e curto-circuito de toda a instalação'
            };

            // 2. Disjuntores dos Circuitos Terminais
            (circuitosFinais || []).forEach(circ => {
                const pol = circ.polos || '1P';
                const ampStr = circ.disj || '20 A';
                const key = `${pol}_${ampStr}_CurvaC`;
                if (!mapDisjuntores[key]) {
                    mapDisjuntores[key] = {
                        tipo: `Disjuntor Termomagnético ${pol === '2P' ? 'Bipolar (2P)' : 'Monopolar (1P)'}`,
                        polos: pol,
                        polosDesc: pol === '2P' ? 'Bipolar (2P)' : 'Monopolar (1P)',
                        curva: 'Curva C (5 a 10×In)',
                        correnteStr: ampStr,
                        correnteA: parseInt(ampStr) || 20,
                        tensao: pol === '2P' ? '220V / 400V' : '127V / 230V',
                        icn: '3 kA (NBR IEC 60898)',
                        qtdProjeto: 0,
                        reserva: 0,
                        qtdTotal: 0,
                        precoUnit: (typeof obterPrecoMaterial === 'function') ? (pol === '2P' ? obterPrecoMaterial('protecao', 'disj2p', 32.0) : obterPrecoMaterial('protecao', 'disj1p', 14.5)) : (pol === '2P' ? 32.0 : 14.5),
                        circuitos: [],
                        funcao: pol === '2P' ? 'Proteção individual de circuitos bifásicos 220V' : 'Proteção individual de circuitos terminais 127V'
                    };
                }
                mapDisjuntores[key].qtdProjeto += 1;
                mapDisjuntores[key].circuitos.push(`C${circ.num} (${circ.nome})`);
            });

            // Finaliza reserva técnica e subtotais
            const quantitativoDisjuntoresIndividuais = Object.values(mapDisjuntores).sort((a, b) => {
                if (a.polos !== b.polos) return a.polos.localeCompare(b.polos);
                return a.correnteA - b.correnteA;
            });

            quantitativoDisjuntoresIndividuais.forEach(d => {
                if (d.tipo.includes('Geral')) {
                    d.qtdTotal = d.qtdProjeto;
                    d.reserva = 0;
                } else {
                    d.reserva = Math.max(1, Math.ceil(d.qtdProjeto * 0.10));
                    d.qtdTotal = d.qtdProjeto + d.reserva;
                }
                d.subtotal = d.qtdTotal * d.precoUnit;
                d.circuitosStr = d.circuitos.join(', ');

                // Adiciona item de disjuntor individual ao BOM principal
                addItem(
                    'Quadros & Proteção DIN', 'protecao',
                    `${d.tipo} ${d.curva} ${d.correnteStr}`,
                    `NBR IEC 60898, Capacidade Ics/Icn: ${d.icn}, Fixação Trilho DIN 35mm (${d.tensao})`,
                    d.qtdProjeto, 'un', d.precoUnit,
                    `${d.funcao} - Circuitos: ${d.circuitosStr}`,
                    0.10
                );
            });

            state.quantitativoDisjuntoresIndividuais = quantitativoDisjuntoresIndividuais;

            // Calcula módulos DIN ocupados
            const totModulosOcupados = quantitativoDisjuntoresIndividuais.reduce((sum, d) => sum + (d.qtdTotal * (d.polos === '3P' ? 3 : (d.polos === '2P' ? 2 : 1))), 0) +
                                       (sistemaUsado === 'trifasico' ? 8 : (sistemaUsado === 'bifasico' ? 6 : 4));

            let modulosQDT = 18;
            if (totModulosOcupados > 30) modulosQDT = 48;
            else if (totModulosOcupados > 20) modulosQDT = 36;
            else if (totModulosOcupados > 12) modulosQDT = 24;

            const qtdQuadrosDesc = ehUnidadeEspecifica 
                ? '1 Unidade' 
                : (state.regimeImovel === 'imoveis_separados' ? `${imovs.length || 1} QDTs` : `${numQdts} Unidades`);

            addItem(
                'Quadros & Proteção DIN', 'protecao',
                `Quadro de Distribuição de Embutir (QDT) para ${modulosQDT} Módulos DIN`,
                `NBR IEC 60670 / NBR 5410, Tampa fumê/branca, trilho DIN metálico e barramento de neutro/terra inclusos`,
                numQdts, 'un', 145.00,
                `Acomodação dos disjuntores, IDR e DPS do imóvel (${qtdQuadrosDesc})`
            );

            // IDR (Interruptor Diferencial Residual): modelos e quantidades do quadro (state.planoIdr)
            const planoIdrMat = state.planoIdr || (typeof NBR5410 !== 'undefined' ? NBR5410.planejarIdrs({ circuitos: circuitosFinais || [], sistema: sistemaUsado, configIdr: state.tipoConfigIdr || 'idr_geral', esquema: state.esquemaAterramento || 'TN-S', inGeral: 0, modelo: state.modeloIdr }) : { idrs: [] });
            const modelosIdr = {};
            planoIdrMat.idrs.forEach(i => {
                const k = `${i.polos}|${i.corrente}|${i.sensibilidade}|${i.tipo}`;
                modelosIdr[k] = modelosIdr[k] || { i, qtd: 0 };
                modelosIdr[k].qtd++;
            });
            Object.values(modelosIdr).forEach(({ i, qtd }) => {
                const ehTetra = i.polos === '4P';
                addItem(
                    'Quadros & Proteção DIN', 'protecao',
                    `Interruptor Diferencial Residual (IDR) ${ehTetra ? 'Tetrapolar' : 'Bipolar'} ${i.corrente} A - ${i.sensibilidade} mA - Tipo ${i.tipo}`,
                    'NBR NM 61008 / NBR 5410 Item 5.1.3.2.2 (proteção complementar contra choques)',
                    qtd * numQdts, 'un',
                    (typeof obterPrecoMaterial === 'function') ? obterPrecoMaterial('protecao', ehTetra ? 'idr4p' : 'idr', ehTetra ? 185.00 : 95.00) : (ehTetra ? 185.00 : 95.00),
                    `Desarme em fuga para terra acima de ${i.sensibilidade} mA • ${ehTetra ? '4 módulos' : '2 módulos'} DIN`,
                    0, ehTetra ? 'idr4p' : 'idr'
                );
            });

            // DPS (Dispositivo de Proteção contra Surtos)
            const numDPS = (sistemaUsado === 'trifasico' ? 4 : (sistemaUsado === 'bifasico' ? 3 : 2)) * numQdts;
            addItem(
                'Quadros & Proteção DIN', 'protecao',
                'Dispositivo de Proteção contra Surtos (DPS) 275V / 20kA ou 45kA Classe II',
                'NBR IEC 61643-1 / NBR 5410, Plugável em trilho DIN com indicador verde/vermelho de vida útil',
                numDPS, 'un', 38.00,
                'Proteção dos eletrodomésticos contra descargas atmosféricas e transientes da rede'
            );

            // -------------------------------------------------------------
            // SUGESTÃO E DIMENSIONAMENTO DE BARRAMENTO PENTE DIN & ACESSÓRIOS
            // -------------------------------------------------------------
            let modeloPenteSugerido = '';
            let precoPenteSugerido = 38.0;
            if (totModulosOcupados <= 12) {
                modeloPenteSugerido = `Barramento Pente ${sistemaUsado === 'trifasico' ? 'Trifásico' : (sistemaUsado === 'bifasico' ? 'Bifásico' : 'Monofásico')} 12 Polos (80A Tipo Pino)`;
                precoPenteSugerido = 28.0;
            } else if (totModulosOcupados <= 18) {
                modeloPenteSugerido = `Barramento Pente ${sistemaUsado === 'trifasico' ? 'Trifásico' : (sistemaUsado === 'bifasico' ? 'Bifásico' : 'Monofásico')} 18 Polos (80A Tipo Pino)`;
                precoPenteSugerido = 38.0;
            } else if (totModulosOcupados <= 24) {
                modeloPenteSugerido = `Barramento Pente ${sistemaUsado === 'trifasico' ? 'Trifásico' : (sistemaUsado === 'bifasico' ? 'Bifásico' : 'Monofásico')} 24 Polos (80A Tipo Pino)`;
                precoPenteSugerido = 48.0;
            } else {
                modeloPenteSugerido = `Barramento Pente ${sistemaUsado === 'trifasico' ? 'Trifásico' : (sistemaUsado === 'bifasico' ? 'Bifásico' : 'Monofásico')} Barra de 1 Metro (54 Polos - 80A Tipo Pino)`;
                precoPenteSugerido = 75.0;
            }

            const kitBarramentoPente = [
                {
                    item: `Barramento Pente de Fase ${sistemaUsado === 'trifasico' ? 'Trifásico (R-S-T)' : (sistemaUsado === 'bifasico' ? 'Bifásico (R-S)' : 'Monofásico (R)')}`,
                    espec: `${modeloPenteSugerido}, Cobre eletrolítico estanhado com perfil isolante auto-extinguível (NBR 5410 Item 6.5.4)`,
                    qtd: numQdts,
                    unid: 'un',
                    precoUnit: precoPenteSugerido,
                    subtotal: numQdts * precoPenteSugerido,
                    motivo: 'Distribuição homogênea de fases entre disjuntores eliminando jumpers manuais'
                },
                {
                    item: 'Tampa Terminal Isolante de Extremidade (End Cap)',
                    espec: 'Termoplástico isolante antichama para fechamento seguro das pontas cortadas do barramento pente',
                    qtd: numQdts * 2,
                    unid: 'un',
                    precoUnit: 3.50,
                    subtotal: numQdts * 2 * 3.50,
                    motivo: 'Isolação contra contato acidental e arcos elétricos (NBR 5410 Item 5.1)'
                },
                {
                    item: 'Conector Genérico de Alimentação Frontal (25 mm² / 35 mm²)',
                    espec: 'Encaixe direto no pino do barramento pente com torque reforçado para cabo alimentador geral',
                    qtd: numQdts * (sistemaUsado === 'trifasico' ? 3 : (sistemaUsado === 'bifasico' ? 2 : 1)),
                    unid: 'un',
                    precoUnit: 8.50,
                    subtotal: numQdts * (sistemaUsado === 'trifasico' ? 3 : (sistemaUsado === 'bifasico' ? 2 : 1)) * 8.50,
                    motivo: 'Fixação firme e segura do cabo de entrada sem danificar bornes do disjuntor'
                },
                {
                    item: 'Barramento de Neutro Isolado com Suporte DIN (8 a 12 Bornes)',
                    espec: 'Latão maciço com parafusos de fenda cruzada montado em suporte termoplástico isolado para trilho DIN',
                    qtd: numQdts,
                    unid: 'un',
                    precoUnit: 16.50,
                    subtotal: numQdts * 16.50,
                    motivo: 'Centralização organizada e segura dos condutores neutros (Azul Claro)'
                },
                {
                    item: 'Barramento de Terra de Proteção (PE) com Suporte DIN (8 a 12 Bornes)',
                    espec: 'Latão maciço para equipotencialização centralizada de todos os condutores de proteção no QDT',
                    qtd: numQdts,
                    unid: 'un',
                    precoUnit: 16.50,
                    subtotal: numQdts * 16.50,
                    motivo: 'Equipotencialização principal e aterramento dos circuitos (Verde)'
                }
            ];

            state.sugestaoBarramentoPente = {
                sistema: sistemaUsado,
                sistemaNome: sistemaUsado === 'trifasico' ? 'Trifásico (Fase R-S-T)' : (sistemaUsado === 'bifasico' ? 'Bifásico (Fase R-S)' : 'Monofásico (Fase R)'),
                polosOcupados: totModulosOcupados,
                modeloSugerido: modeloPenteSugerido,
                itensKit: kitBarramentoPente,
                totalKit: kitBarramentoPente.reduce((s, it) => s + it.subtotal, 0)
            };

            // Adiciona componentes do barramento ao BOM principal
            kitBarramentoPente.forEach(kitItem => {
                addItem(
                    'Quadros & Proteção DIN', 'protecao',
                    kitItem.item,
                    kitItem.espec,
                    kitItem.qtd, kitItem.unid, kitItem.precoUnit,
                    kitItem.motivo
                );
            });

            // -------------------------------------------------------------
            // CATEGORIA 5: APARELHAGEM DE COMANDO, TOMADAS & ACABAMENTOS
            // -------------------------------------------------------------
            const tugsSecasQtd = Math.max(1, Math.round(totTugQtd * 0.65));
            const tugsMolhadasQtd = Math.max(1, totTugQtd - tugsSecasQtd);

            addItem(
                'Aparelhagem & Acabamentos', 'aparelhagem',
                'Módulo de Tomada 2P+T 10A / 250V (Padrão NBR 14136)',
                'NBR 14136 / NBR NM 60884-1, Pinos finos (4.0mm), termoplástico branco anti-chama',
                tugsSecasQtd, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('aparelhagem', 'tomada10a', 7.50) : 7.50),
                'Tomadas de uso geral para salas, dormitórios, escritórios e corredores'
            );
            addItem(
                'Aparelhagem & Acabamentos', 'aparelhagem',
                'Módulo de Tomada 2P+T 20A / 250V (Padrão NBR 14136)',
                'NBR 14136, Orifícios grossos (4.8mm) para aparelhos de maior consumo',
                tugsMolhadasQtd, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('aparelhagem', 'tomada20a', 9.20) : 9.20),
                'Cozinhas, lavanderias, banheiros e bancadas de serviço'
            );
            addItem(
                'Aparelhagem & Acabamentos', 'aparelhagem',
                'Conector de Porcelana Tripolar 50A / Conector WAGO 221-612 para Chuveiros',
                'Cerâmica vitrificada com contatos de latão maciço (resistente a altas temperaturas)',
                totTueQtd, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('aparelhagem', 'chuveiro_conector', 8.50) : 8.50),
                'Conexão segura e sem derretimento de chuveiros e torneiras elétricas'
            );
            addItem(
                'Aparelhagem & Acabamentos', 'aparelhagem',
                'Módulo de Interruptor Simples 10A / 250V',
                'NBR NM 60669-1, Contatos em prata para longa durabilidade e acionamento suave',
                Math.max(1, Math.round(totIntQtd * 0.7)), 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('aparelhagem', 'interruptor_simples', 7.20) : 7.20),
                'Acionamento individual de circuitos de iluminação dos cômodos'
            );
            addItem(
                'Aparelhagem & Acabamentos', 'aparelhagem',
                'Módulo de Interruptor Paralelo (Three-Way) 10A / 250V',
                'NBR NM 60669-1, Comando de iluminação a partir de dois pontos distintos',
                Math.max(2, Math.round(totIntQtd * 0.3)), 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('aparelhagem', 'interruptor_paralelo', 10.50) : 10.50),
                'Controle de luz em cabeceiras de cama, escadarias e extremidades de corredores'
            );

            const totPlacas4x2 = Math.ceil(totCaixas4x2 * 0.95);
            addItem(
                'Aparelhagem & Acabamentos', 'aparelhagem',
                'Placa / Espelho 4x2" com Suporte (1, 2 e 3 Postos Sortidos)',
                'Acabamento acetinado branco alto brilho, anti-UV com parafusos ocultos',
                totPlacas4x2, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('aparelhagem', 'placa4x2', 5.50) : 5.50),
                'Acabamento estético de embutir nas paredes'
            );

            // -------------------------------------------------------------
            // CATEGORIA 6: ILUMINAÇÃO & LUMINÁRIAS
            // -------------------------------------------------------------
            addItem(
                'Iluminação', 'iluminacao',
                'Plafon LED de Sobrepor / Embutir Quadrado 18W / 24W Bivolt',
                'Fluxo luminoso 1600lm - 2200lm, IRC > 80, Driver bivolt integrado (100-240V)',
                totIlumQtd, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('iluminacao', 'plafon18w', 26.00) : 26.00),
                'Iluminação geral difusa de alta eficiência energética para os cômodos'
            );
            addItem(
                'Iluminação', 'iluminacao',
                'Painel Plafon LED Slim Redondo 12W Bivolt (Branco Neutro)',
                'Iluminação auxiliar embutida em forros de gesso e sancas',
                Math.max(2, Math.round(totComodos * 0.5)), 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('iluminacao', 'plafon12w', 18.00) : 18.00),
                'Áreas de circulação, lavabos e iluminação complementar'
            );
            addItem(
                'Iluminação', 'iluminacao',
                'Soquete Base E27 em Porcelana com Rabicho',
                'NBR IEC 60238, Base metálica em latão com suporte de fixação em caixa 4x4',
                Math.max(2, Math.round(totComodos * 0.3)), 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('iluminacao', 'soquete_e27', 4.50) : 4.50),
                'Pontos provisórios de obra, áreas técnicas e depósitos'
            );

            // -------------------------------------------------------------
            // CATEGORIA 7: SISTEMA DE ATERRAMENTO (SPDA / BEP)
            // -------------------------------------------------------------
            addItem(
                'Aterramento & SPDA', 'aterramento',
                'Haste de Aterramento em Aço Cobreado 5/8" × 2,40 metros (Camada 254µm)',
                'NBR 13571 / NBR 5410, Alta resistência à corrosão galvânica e excelente dispersão de corrente',
                3, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('aterramento', 'haste', 42.00) : 42.00),
                'Eletrodo de aterramento em configuração de triângulo no solo'
            );
            addItem(
                'Aterramento & SPDA', 'aterramento',
                'Grampo Conector Tipo Grampo Cabo-Haste em Bronze / Latão 5/8"',
                'Fixação mecânica de alta pressão com parafuso sextavado',
                3, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('aterramento', 'grampo', 8.50) : 8.50),
                'Conexão firme entre a haste de aterramento e o condutor de cobre nu'
            );
            addItem(
                'Aterramento & SPDA', 'aterramento',
                'Caixa de Inspeção Cilíndrica para Aterramento em PVC / Concreto com Tampa',
                'DN 300mm com tampa reforçada para tráfego leve',
                3, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('aterramento', 'caixa_inspecao', 32.00) : 32.00),
                'Acesso para medição periódica da resistência de aterramento (< 10 ohms)'
            );
            addItem(
                'Aterramento & SPDA', 'aterramento',
                'Cabo de Cobre Nu Eletrolítico 25 mm² ou 16 mm²',
                'NBR 6524, Cobre tempera meio-dura para interligação do anel de aterramento',
                15, 'm', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('aterramento', 'cabo_nu', 19.50) : 19.50),
                'Interligação equipotencial entre as 3 hastes de aterramento e o BEP'
            );
            addItem(
                'Aterramento & SPDA', 'aterramento',
                'Barramento de Equipotencialização Principal (BEP) com Caixa Protetora',
                'Barra de cobre maciço 150mm com furos roscados e isoladores',
                1, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('aterramento', 'bep', 68.00) : 68.00),
                'Equipotencialização de todas as massas metálicas, neutro e aterramento da edificação'
            );

            // -------------------------------------------------------------
            // CATEGORIA 8: INSUMOS DE MONTAGEM & FIXAÇÃO
            // -------------------------------------------------------------
            addItem(
                'Insumos & Montagem', 'insumos',
                'Fita Isolante de PVC Anti-Chamas 20m (750V / 90°C)',
                'NBR NM 60454-3-1, Classe A, alta elasticidade e excelente poder de adesão',
                6, 'rolo', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('insumos', 'fita_isolante', 7.50) : 7.50),
                'Isolação elétrica segura de emendas de condutores e barramentos'
            );
            addItem(
                'Insumos & Montagem', 'insumos',
                'Fita de Auto-Fusão 10m (Alta Tensão / Vedação Dielétrica)',
                'Borracha etileno-propileno (EPR), funde-se em massa homogênea sem cola',
                1, 'rolo', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('insumos', 'fita_auto_fusao', 24.00) : 24.00),
                'Vedação à prova d\'água de emendas do alimentador principal e áreas externas'
            );
            addItem(
                'Insumos & Montagem', 'insumos',
                'Kit Conectores de Emenda Rápida tipo Mola (2, 3 e 5 vias - Linha WAGO 221)',
                'Alavanca de engate rápido transparente para cabos flexíveis e rígidos até 4mm²',
                25, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('insumos', 'conector_wago', 2.80) : 2.80),
                'Emendas rápidas e seguras sem solda nas caixas de teto e derivações 4x2'
            );
            addItem(
                'Insumos & Montagem', 'insumos',
                'Terminais Tubulares Ilhós Estanhados Sortidos (1,5mm² a 10mm²)',
                'Cobre estanhado com isolação plástica para prensagem em pontas de cabos flexíveis',
                100, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('insumos', 'terminais_ilhos', 0.35) : 0.35),
                'Crimpagem nas pontas dos cabos para encaixe perfeito nos disjuntores DIN e bornes'
            );
            addItem(
                'Insumos & Montagem', 'insumos',
                'Kit Buchas Plásticas S6 com Aba + Parafusos Auto-atarraxantes Zincados',
                'Polietileno de alta densidade com parafusos fenda cruzada',
                80, 'kit', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('insumos', 'kit_buchas', 0.25) : 0.25),
                'Fixação firme de caixas 4x2 em alvenaria, luminárias e suportes'
            );
            addItem(
                'Insumos & Montagem', 'insumos',
                'Fita Guia Passa-Fio em Polipropileno com Alma de Aço 20m',
                'Ponta flexível de latão arredondada para passagem suave em curvas',
                1, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('insumos', 'passa_fio', 28.00) : 28.00),
                'Puxamento de condutores através da rede de eletrodutos embutidos'
            );
            addItem(
                'Insumos & Montagem', 'insumos',
                'Vaselina Industrial Líquida / Gel Lubrificante para Cabos (500ml)',
                'Não degrada a capa plástica do PVC e reduz o atrito mecânico em 80%',
                1, 'un', (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('insumos', 'vaselina', 16.00) : 16.00),
                'Lubrificação facilitadora do puxamento de condutores em eletrodutos longos'
            );

            // -------------------------------------------------------------
            // CATEGORIA 9: AUTOMAÇÃO RESIDENCIAL (aba Automação, quando incluída no projeto)
            // -------------------------------------------------------------
            if (typeof obterMateriaisAutomacao === 'function') {
                obterMateriaisAutomacao().forEach(it => addItem(
                    'Automação Residencial', 'automacao', it.item, it.especificacao, it.qtd, it.unidade,
                    (typeof obterPrecoMaterial === 'function' ? obterPrecoMaterial('automacao', it.chave, it.precoRef) : it.precoRef),
                    it.aplicacao, it.margem || 0, it.chave
                ));
            }

            state.quantitativoMateriaisDetalhado = materiais;
            return materiais;
        }

        function trocarVisaoMateriais(visao) {
            const paineis = {
                completo: document.getElementById('painelVisaoCompleto'),
                cabos: document.getElementById('painelVisaoCabos'),
                disjuntores: document.getElementById('painelVisaoDisjuntores'),
                barramento: document.getElementById('painelVisaoBarramento'),
                maoDeObra: document.getElementById('painelVisaoMaoDeObra')
            };

            const botoes = {
                completo: document.getElementById('btnVisaoCompleto'),
                cabos: document.getElementById('btnVisaoCabos'),
                disjuntores: document.getElementById('btnVisaoDisjuntores'),
                barramento: document.getElementById('btnVisaoBarramento'),
                maoDeObra: document.getElementById('btnVisaoMaoDeObra'),
                todos: document.getElementById('btnVisaoTodos')
            };

            Object.values(botoes).forEach(b => {
                if (!b) return;
                b.classList.remove('bg-amber-500', 'text-slate-950', 'active', 'shadow');
                b.classList.add('bg-slate-900', 'text-slate-300');
            });

            if (visao === 'todos') {
                Object.values(paineis).forEach(p => p && p.classList.remove('hidden'));
                if (botoes.todos) {
                    botoes.todos.classList.remove('bg-slate-900', 'text-slate-300');
                    botoes.todos.classList.add('bg-amber-500', 'text-slate-950', 'active', 'shadow');
                }
            } else {
                Object.keys(paineis).forEach(k => {
                    if (!paineis[k]) return;
                    if (k === visao) {
                        paineis[k].classList.remove('hidden');
                    } else {
                        paineis[k].classList.add('hidden');
                    }
                });
                if (botoes[visao]) {
                    botoes[visao].classList.remove('bg-slate-900', 'text-slate-300');
                    botoes[visao].classList.add('bg-amber-500', 'text-slate-950', 'active', 'shadow');
                }
                // o conteúdo da visão fica abaixo dos indicadores: no celular a troca não
                // aparecia na tela e parecia que o botão não funcionava. Rola até ele.
                const alvo = paineis[visao];
                if (alvo) {
                    const topo = alvo.getBoundingClientRect().top;
                    if (topo > window.innerHeight * 0.6 || topo < 0) {
                        requestAnimationFrame(() => alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                    }
                }
            }
        }

        function renderizarTabelaMateriaisCompleta(materiais) {
            if (!materiais || !Array.isArray(materiais)) {
                materiais = state.quantitativoMateriaisDetalhado || [];
            }

            // Atualiza contadores dos botões de filtro
            const contadores = {
                todos: materiais.length,
                condutores: materiais.filter(m => m.categoriaId === 'condutores').length,
                eletrodutos: materiais.filter(m => m.categoriaId === 'eletrodutos').length,
                caixas: materiais.filter(m => m.categoriaId === 'caixas').length,
                protecao: materiais.filter(m => m.categoriaId === 'protecao').length,
                aparelhagem: materiais.filter(m => m.categoriaId === 'aparelhagem').length,
                iluminacao: materiais.filter(m => m.categoriaId === 'iluminacao').length,
                aterramento: materiais.filter(m => m.categoriaId === 'aterramento').length,
                insumos: materiais.filter(m => m.categoriaId === 'insumos').length,
                automacao: materiais.filter(m => m.categoriaId === 'automacao').length
            };

            const mapIds = {
                todos: 'contFiltroTodos',
                condutores: 'contFiltroCabos',
                eletrodutos: 'contFiltroEletrodutos',
                caixas: 'contFiltroCaixas',
                protecao: 'contFiltroProtecao',
                aparelhagem: 'contFiltroAparelhagem',
                iluminacao: 'contFiltroIluminacao',
                aterramento: 'contFiltroAterramento',
                insumos: 'contFiltroInsumos',
                automacao: 'contFiltroAutomacao'
            };

            Object.keys(mapIds).forEach(k => {
                const el = document.getElementById(mapIds[k]);
                if (el) el.textContent = contadores[k] || 0;
            });

            // Atualiza KPIs no topo
            let totMetrosCabos = 0;
            let totMetrosEletro = 0;
            let totDisjQdt = 0;
            let totAparelhagem = 0;
            let totOrcamentoReais = 0;

            materiais.forEach(m => {
                totOrcamentoReais += (m.subtotal || 0);
                if (m.categoriaId === 'condutores' && m.unidade === 'm') totMetrosCabos += m.qtdTotal;
                if (m.categoriaId === 'eletrodutos' && m.unidade === 'm') totMetrosEletro += m.qtdTotal;
                if (m.categoriaId === 'protecao' && m.unidade === 'un') totDisjQdt += m.qtdTotal;
                if ((m.categoriaId === 'aparelhagem' || m.categoriaId === 'iluminacao') && m.unidade === 'un') totAparelhagem += m.qtdTotal;
            });

            const kpiItens = document.getElementById('kpiTotalItensMateriais');
            if (kpiItens) kpiItens.textContent = materiais.length;

            const kpiCabos = document.getElementById('kpiTotalMetrosCabos');
            if (kpiCabos) kpiCabos.textContent = `${totMetrosCabos.toLocaleString('pt-BR')} m`;

            const kpiRolos = document.getElementById('kpiRolosSugeridos');
            if (kpiRolos) kpiRolos.textContent = `~${Math.ceil(totMetrosCabos / 100)} rolos de 100m`;

            const kpiEletro = document.getElementById('kpiTotalMetrosEletrodutos');
            if (kpiEletro) kpiEletro.textContent = `${totMetrosEletro.toLocaleString('pt-BR')} m`;

            const kpiDisj = document.getElementById('kpiTotalDisjuntoresQdt');
            if (kpiDisj) kpiDisj.textContent = `${totDisjQdt} un`;

            const kpiPontos = document.getElementById('kpiTotalPontosAparelhagem');
            if (kpiPontos) kpiPontos.textContent = `${totAparelhagem} un`;

            const kpiOrcamento = document.getElementById('kpiTotalOrcamentoEstimado');
            if (kpiOrcamento) kpiOrcamento.textContent = `R$ ${totOrcamentoReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const kpiFonteInfo = document.getElementById('kpiFonteOrcamentoInfo');
            if (kpiFonteInfo) {
                const fonteAtual = (state.tabelaPrecos && state.tabelaPrecos.fonteAtual) ? state.tabelaPrecos.fonteAtual : 'tabela de referência';
                kpiFonteInfo.textContent = fonteAtual;
                kpiFonteInfo.title = fonteAtual;
            }

            const rodapeTotalItens = document.getElementById('rodapeTotalItens');
            if (rodapeTotalItens) rodapeTotalItens.textContent = `${materiais.length} itens`;

            const rodapeTotalSubtotal = document.getElementById('rodapeTotalSubtotal');
            if (rodapeTotalSubtotal) rodapeTotalSubtotal.textContent = `R$ ${totOrcamentoReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            // Mão de obra, BDI e total geral (js/app/16-mao-de-obra.js)
            if (typeof atualizarOrcamentoMaoDeObra === 'function') atualizarOrcamentoMaoDeObra(totOrcamentoReais);

            // 1. RENDERIZAÇÃO DA TABELA DEDICADA DE CABOS POR SEÇÃO & COR (NBR 5410)
            const corpoCabos = document.getElementById('corpoTabelaCabosPorCor');
            if (corpoCabos) {
                corpoCabos.innerHTML = '';
                const gruposBitola = state.quantitativoCabosAgrupadosPorBitola || [];
                let somaCabosProj = 0, somaCabosSobras = 0, somaCabosTot = 0;

                if (gruposBitola.length > 0) {
                    gruposBitola.forEach((gb, idxGrupo) => {
                        somaCabosProj += gb.metrosProjetoTotal;
                        somaCabosSobras += gb.sobraTotal;
                        somaCabosTot += gb.metrosTotal;

                        // 1.1 BANNER DE AGRUPAMENTO POR BITOLA
                        const precoMetroCabo = typeof obterPrecoCaboMetro === 'function' ? obterPrecoCaboMetro(gb.secao) : 2.85;
                        const precoRoloCabo = typeof obterPrecoCaboRolo === 'function' ? obterPrecoCaboRolo(gb.secao) : (precoMetroCabo * 100);
                        const trHeader = document.createElement('tr');
                        trHeader.className = 'bg-gradient-to-r from-amber-500/25 via-slate-900 to-amber-500/10 border-t-2 border-b border-amber-500/40';
                        trHeader.innerHTML = `
                            <td colspan="4" class="p-3 text-amber-300">
                                <div class="flex items-center justify-between gap-2.5 flex-wrap">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500 text-slate-950 font-black text-xs shadow-sm">
                                            <i class="fa-solid fa-bolt"></i> BITOLA ${gb.secao}
                                        </span>
                                        <span class="text-white text-xs font-bold">
                                            Cabos Flexíveis de Cobre 750V (NBR NM 247-3 / NBR 5410)
                                        </span>
                                        <span class="text-[11px] text-amber-300/80 font-mono font-medium">
                                            — ${gb.cores.length} ${gb.cores.length === 1 ? 'cor normativa' : 'cores normativas'}
                                        </span>
                                    </div>
                                    <div class="inline-flex items-center gap-2">
                                        <span class="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-slate-700 text-emerald-400 font-mono text-xs font-bold shadow-inner">
                                            R$ ${precoMetroCabo.toFixed(2).replace('.', ',')}/m <span class="text-slate-500 font-normal">|</span> R$ ${precoRoloCabo.toFixed(2).replace('.', ',')}/rolo 100m
                                        </span>
                                        <button type="button" onclick="editarPrecoBitolaRapido('${gb.secao}')" class="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm" title="Editar valor do metro e rolo de 100m desta bitola">
                                            <i class="fa-solid fa-pen-to-square text-[11px]"></i> Editar Preço
                                        </button>
                                        <button type="button" onclick="pesquisarBitolaNaInternet('${gb.secao}')" class="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-200 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm" title="Pesquisar o preço desta bitola na internet">
                                            <i class="fa-solid fa-magnifying-glass-dollar text-[11px]"></i> Pesquisar
                                        </button>
                                    </div>
                                </div>
                            </td>
                            <td class="p-3 text-right font-mono font-bold text-slate-200 text-xs">
                                ${gb.metrosProjetoTotal} m
                            </td>
                            <td class="p-3 text-right font-mono font-bold text-amber-400 text-xs">
                                +${gb.sobraTotal} m
                            </td>
                            <td class="p-3 text-right font-mono font-black text-blue-400 text-xs">
                                ${gb.metrosTotal} m
                            </td>
                            <td class="p-3 text-center font-mono font-bold text-emerald-400 text-xs">
                                ~${gb.rolos100Total} rolos de 100m
                            </td>
                            <td class="p-3 text-right font-mono text-emerald-300 text-xs font-bold">
                                R$ ${gb.subtotal.toFixed(2).replace('.', ',')}
                            </td>
                        `;
                        corpoCabos.appendChild(trHeader);

                        // 1.2 LINHAS DE CADA COR DENTRO DESTA BITOLA
                        gb.cores.forEach((c, idxCor) => {
                            const tr = document.createElement('tr');
                            tr.className = (idxCor % 2 === 0 ? 'bg-slate-950/40 hover:bg-slate-800/60' : 'bg-slate-900/30 hover:bg-slate-800/60') + ' transition border-b border-slate-850/60';
                            tr.innerHTML = `
                                <td class="p-3 align-top font-mono font-bold text-amber-300 pl-4">
                                    <span class="inline-block px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-slate-300">
                                        ${c.secao}
                                    </span>
                                </td>
                                <td class="p-3 align-top">
                                    <strong class="text-white block font-semibold text-xs">${c.funcao}</strong>
                                    <span class="text-[11px] text-slate-400 block mt-0.5 leading-tight">${c.aplicacao || ''}</span>
                                </td>
                                <td class="p-3 align-top">
                                    <div class="flex items-center gap-2">
                                        <span class="w-3.5 h-3.5 rounded-full inline-block border border-slate-500 shadow-sm flex-shrink-0" style="background-color: ${c.corHex};"></span>
                                        <span class="text-xs font-bold text-slate-200">${c.cor}</span>
                                    </div>
                                    <span class="text-[10px] text-slate-400 block mt-0.5">${c.norma}</span>
                                </td>
                                <td class="p-3 align-top text-slate-400 text-[11px] font-mono leading-snug">
                                    NBR NM 247-3 / NBR 5410<br><span class="text-slate-500">PVC 70°C BWF-B</span>
                                </td>
                                <td class="p-3 align-top text-right font-mono text-slate-300 text-xs">
                                    ${c.metrosProjeto} m
                                </td>
                                <td class="p-3 align-top text-right font-mono text-amber-400 text-[11px]">
                                    +${c.sobra} m
                                </td>
                                <td class="p-3 align-top text-right font-mono font-bold text-blue-400 text-xs">
                                    ${c.metrosTotal} m
                                </td>
                                <td class="p-3 align-top text-center text-emerald-400 font-mono text-[11px]">
                                    ${c.rolosSugeridos}
                                </td>
                                <td class="p-3 align-top text-slate-400 text-[11px] leading-snug">
                                    ${c.circuitosStr || 'Geral'}
                                </td>
                            `;
                            corpoCabos.appendChild(tr);
                        });
                    });
                } else {
                    const cabosList = state.quantitativoCabosPorCor || [];
                    cabosList.forEach((c, idx) => {
                        somaCabosProj += c.metrosProjeto;
                        somaCabosSobras += c.sobra;
                        somaCabosTot += c.metrosTotal;

                        const tr = document.createElement('tr');
                        tr.className = (idx % 2 === 0 ? 'bg-slate-950/40 hover:bg-slate-800/50' : 'bg-slate-900/30 hover:bg-slate-800/50') + ' transition';
                        tr.innerHTML = `
                            <td class="p-3 align-top font-mono font-bold text-amber-300">
                                <span class="inline-block px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-xs">
                                    ${c.secao}
                                </span>
                            </td>
                            <td class="p-3 align-top">
                                <strong class="text-white block font-semibold text-xs">${c.funcao}</strong>
                                <span class="text-[11px] text-slate-400 block mt-0.5">${c.aplicacao || ''}</span>
                            </td>
                            <td class="p-3 align-top">
                                <div class="flex items-center gap-2">
                                    <span class="w-3.5 h-3.5 rounded-full inline-block border border-slate-500 shadow-sm flex-shrink-0" style="background-color: ${c.corHex};"></span>
                                    <span class="text-xs font-semibold text-slate-200">${c.cor}</span>
                                </div>
                                <span class="text-[10px] text-slate-400 block mt-0.5">${c.norma}</span>
                            </td>
                            <td class="p-3 align-top text-slate-400 text-[11px] font-mono leading-snug">
                                NBR NM 247-3 / NBR 5410<br><span class="text-slate-500">PVC 70°C BWF-B</span>
                            </td>
                            <td class="p-3 align-top text-right font-mono text-slate-300 text-xs">
                                ${c.metrosProjeto} m
                            </td>
                            <td class="p-3 align-top text-right font-mono text-amber-400 text-[11px]">
                                +${c.sobra} m
                            </td>
                            <td class="p-3 align-top text-right font-mono font-bold text-blue-400 text-xs">
                                ${c.metrosTotal} m
                            </td>
                            <td class="p-3 align-top text-center text-emerald-400 font-mono text-[11px]">
                                ${c.rolosSugeridos}
                            </td>
                            <td class="p-3 align-top text-slate-400 text-[11px] leading-snug">
                                ${c.circuitosStr || 'Geral'}
                            </td>
                        `;
                        corpoCabos.appendChild(tr);
                    });
                }

                const elCabosResumoMetros = document.getElementById('cabosResumoTotalMetros');
                if (elCabosResumoMetros) elCabosResumoMetros.textContent = `${somaCabosTot} m`;

                const elCabosResumoRolos = document.getElementById('cabosResumoTotalRolos');
                if (elCabosResumoRolos) elCabosResumoRolos.textContent = `~${Math.ceil(somaCabosTot / 100)} rolos (100m)`;

                const rCabosProj = document.getElementById('rodapeCabosQtdProjeto');
                if (rCabosProj) rCabosProj.textContent = `${somaCabosProj} m`;

                const rCabosSob = document.getElementById('rodapeCabosSobras');
                if (rCabosSob) rCabosSob.textContent = `+${somaCabosSobras} m`;

                const rCabosTot = document.getElementById('rodapeCabosTotalCompra');
                if (rCabosTot) rCabosTot.textContent = `${somaCabosTot} m`;

                const rCabosRol = document.getElementById('rodapeCabosRolos');
                if (rCabosRol) rCabosRol.textContent = `~${Math.ceil(somaCabosTot / 100)} rolos`;
            }

            // 2. RENDERIZAÇÃO DO QUADRO INDIVIDUAL DE DISJUNTORES (NBR IEC 60898)
            const corpoDisj = document.getElementById('corpoTabelaDisjuntoresIndividuais');
            if (corpoDisj) {
                corpoDisj.innerHTML = '';
                const disjList = state.quantitativoDisjuntoresIndividuais || [];
                let somaDisjProj = 0, somaDisjRes = 0, somaDisjTot = 0, somaDisjSub = 0, somaPolos = 0;

                disjList.forEach((d, idx) => {
                    somaDisjProj += d.qtdProjeto;
                    somaDisjRes += d.reserva;
                    somaDisjTot += d.qtdTotal;
                    somaDisjSub += d.subtotal;
                    somaPolos += d.qtdTotal * (d.polos === '3P' ? 3 : (d.polos === '2P' ? 2 : 1));

                    const tr = document.createElement('tr');
                    tr.className = (idx % 2 === 0 ? 'bg-slate-950/40 hover:bg-slate-800/50' : 'bg-slate-900/30 hover:bg-slate-800/50') + ' transition';
                    tr.innerHTML = `
                        <td class="p-3 align-top">
                            <strong class="text-white block font-semibold text-xs">${d.tipo}</strong>
                            <span class="text-[11px] text-slate-400 block mt-0.5">${d.funcao}</span>
                        </td>
                        <td class="p-3 align-top text-center font-mono font-bold text-xs">
                            <span class="px-2 py-0.5 rounded ${d.polos === '2P' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : (d.polos === '3P' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700')}">
                                ${d.polos}
                            </span>
                        </td>
                        <td class="p-3 align-top text-center font-mono">
                            <span class="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
                                ${d.curva}
                            </span>
                        </td>
                        <td class="p-3 align-top text-center font-mono font-bold text-white text-xs">
                            ${d.correnteStr}
                        </td>
                        <td class="p-3 align-top text-center font-mono text-slate-400 text-xs">
                            ${d.tensao}
                        </td>
                        <td class="p-3 align-top text-right font-mono text-slate-300 text-xs">
                            ${d.qtdProjeto} un
                        </td>
                        <td class="p-3 align-top text-right font-mono text-amber-400 text-[11px]">
                            +${d.reserva} un
                        </td>
                        <td class="p-3 align-top text-right font-mono font-bold text-rose-400 text-xs">
                            ${d.qtdTotal} un
                        </td>
                        <td class="p-3 align-top text-right font-mono text-slate-400 text-xs">
                            R$ ${d.precoUnit.toFixed(2).replace('.', ',')}
                        </td>
                        <td class="p-3 align-top text-right font-mono font-bold text-white text-xs">
                            R$ ${d.subtotal.toFixed(2).replace('.', ',')}
                        </td>
                        <td class="p-3 align-top text-slate-400 text-[11px] leading-snug">
                            ${d.circuitosStr}
                        </td>
                    `;
                    corpoDisj.appendChild(tr);
                });

                const elDisjTotalUn = document.getElementById('disjResumoTotalUnidades');
                if (elDisjTotalUn) elDisjTotalUn.textContent = `${somaDisjTot} un`;

                const elDisjTotalPol = document.getElementById('disjResumoTotalPolos');
                if (elDisjTotalPol) elDisjTotalPol.textContent = `${somaPolos} módulos DIN`;

                const rDisjProj = document.getElementById('rodapeDisjQtdProjeto');
                if (rDisjProj) rDisjProj.textContent = `${somaDisjProj} un`;

                const rDisjRes = document.getElementById('rodapeDisjReserva');
                if (rDisjRes) rDisjRes.textContent = `+${somaDisjRes} un`;

                const rDisjTot = document.getElementById('rodapeDisjTotalCompra');
                if (rDisjTot) rDisjTot.textContent = `${somaDisjTot} un`;

                const rDisjSub = document.getElementById('rodapeDisjSubtotal');
                if (rDisjSub) rDisjSub.textContent = `R$ ${somaDisjSub.toFixed(2).replace('.', ',')}`;
            }

            // 3. RENDERIZAÇÃO DO PAINEL DE SUGESTÃO DE BARRAMENTO PENTE DIN
            const corpoBarramento = document.getElementById('corpoTabelaBarramentoPente');
            if (corpoBarramento && state.sugestaoBarramentoPente) {
                corpoBarramento.innerHTML = '';
                const sb = state.sugestaoBarramentoPente;

                const elBarSistema = document.getElementById('barramentoSistemaNome');
                if (elBarSistema) elBarSistema.textContent = sb.sistemaNome;

                const elBarPolos = document.getElementById('barramentoPolosOcupados');
                if (elBarPolos) elBarPolos.textContent = `${sb.polosOcupados} módulos DIN`;

                const elBarModelo = document.getElementById('barramentoModeloSugerido');
                if (elBarModelo) elBarModelo.textContent = sb.modeloSugerido;

                (sb.itensKit || []).forEach((it, idx) => {
                    const tr = document.createElement('tr');
                    tr.className = (idx % 2 === 0 ? 'bg-slate-950/40 hover:bg-slate-800/50' : 'bg-slate-900/30 hover:bg-slate-800/50') + ' transition';
                    tr.innerHTML = `
                        <td class="p-2.5 align-top">
                            <strong class="text-white block font-semibold text-xs">${it.item}</strong>
                            <span class="text-[10px] text-slate-400 block mt-0.5">${it.motivo}</span>
                        </td>
                        <td class="p-2.5 align-top text-slate-400 text-[11px] font-mono leading-snug">
                            ${it.espec}
                        </td>
                        <td class="p-2.5 align-top text-center font-mono font-bold text-amber-400 text-xs">
                            ${it.qtd}
                        </td>
                        <td class="p-2.5 align-top text-center text-slate-400 font-mono text-xs">
                            ${it.unid}
                        </td>
                        <td class="p-2.5 align-top text-right font-mono text-slate-400 text-xs">
                            R$ ${it.precoUnit.toFixed(2).replace('.', ',')}
                        </td>
                        <td class="p-2.5 align-top text-right font-mono font-bold text-emerald-400 text-xs">
                            R$ ${it.subtotal.toFixed(2).replace('.', ',')}
                        </td>
                    `;
                    corpoBarramento.appendChild(tr);
                });

                const rBarTot = document.getElementById('rodapeBarramentoTotal');
                if (rBarTot) rBarTot.textContent = `R$ ${sb.totalKit.toFixed(2).replace('.', ',')}`;
            }

            filtrarTabelaMateriais();
        }

        function filtrarTabelaMateriais(categoriaEscolhida = null) {
            if (categoriaEscolhida !== null) {
                _categoriaMaterialFiltroAtiva = categoriaEscolhida;
                document.querySelectorAll('#filtrosCategoriaMateriais .btn-filtro-mat').forEach(b => {
                    b.classList.remove('bg-amber-500', 'text-slate-950', 'active', 'shadow');
                    b.classList.add('bg-slate-900', 'text-slate-300');
                });
                const btnAtivo = Array.from(document.querySelectorAll('#filtrosCategoriaMateriais .btn-filtro-mat')).find(b => {
                    const oc = b.getAttribute('onclick') || '';
                    return oc.includes(`'${categoriaEscolhida}'`);
                });
                if (btnAtivo) {
                    btnAtivo.classList.remove('bg-slate-900', 'text-slate-300');
                    btnAtivo.classList.add('bg-amber-500', 'text-slate-950', 'active', 'shadow');
                }
            }

            const inputBusca = document.getElementById('inputBuscaMateriais');
            const termoBusca = (inputBusca ? inputBusca.value.trim().toLowerCase() : '');

            const corpo = document.getElementById('corpoTabelaMateriais');
            if (!corpo) return;
            corpo.innerHTML = '';

            const materiais = state.quantitativoMateriaisDetalhado || [];

            const filtrados = materiais.filter(m => {
                const bateCategoria = (_categoriaMaterialFiltroAtiva === 'todos' || m.categoriaId === _categoriaMaterialFiltroAtiva);
                if (!bateCategoria) return false;
                if (!termoBusca) return true;
                const textoGeral = `${m.categoria} ${m.item} ${m.especificacao} ${m.aplicacao}`.toLowerCase();
                return textoGeral.includes(termoBusca);
            });

            if (filtrados.length === 0) {
                corpo.innerHTML = `
                    <tr>
                        <td colspan="9" class="p-8 text-center text-slate-500">
                            <i class="fa-solid fa-magnifying-glass text-2xl mb-2 block text-slate-600"></i>
                            Nenhum material encontrado com os filtros aplicados.
                        </td>
                    </tr>
                `;
                if (_categoriaMaterialFiltroAtiva === 'todos' && typeof linhasMaoDeObraListaGeral === 'function') {
                    linhasMaoDeObraListaGeral(termoBusca).forEach(tr => corpo.appendChild(tr));
                }
                return;
            }

            const badgesCat = {
                condutores: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                eletrodutos: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                caixas: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
                protecao: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                aparelhagem: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                iluminacao: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
                aterramento: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
                insumos: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
            };

            let ultimaBitolaCondutor = '';
            filtrados.forEach((m, idx) => {
                // Se estiver filtrando condutores ou se for item de condutor, insere divisor por bitola
                if (m.categoriaId === 'condutores') {
                    const matchSecao = (m.item || '').match(/(\d+(?:\.\d+)?\s*mm²)/);
                    const secaoAtual = matchSecao ? matchSecao[1] : '';
                    if (secaoAtual && secaoAtual !== ultimaBitolaCondutor && _categoriaMaterialFiltroAtiva === 'condutores') {
                        ultimaBitolaCondutor = secaoAtual;
                        const trDiv = document.createElement('tr');
                        trDiv.className = 'bg-gradient-to-r from-blue-950/60 via-slate-900 to-transparent border-t border-b border-blue-500/40';
                        trDiv.innerHTML = `
                            <td colspan="9" class="p-2.5 pl-4 font-bold text-amber-300 text-xs">
                                <i class="fa-solid fa-bolt mr-2 text-amber-400"></i> Condutores Elétricos Agrupados — Bitola ${secaoAtual} (NBR 5410)
                            </td>
                        `;
                        corpo.appendChild(trDiv);
                    }
                }

                const idxMaterial = materiais.indexOf(m);
                const tr = document.createElement('tr');
                tr.className = (idx % 2 === 0 ? 'bg-slate-950/40 hover:bg-slate-800/50' : 'bg-slate-900/30 hover:bg-slate-800/50') + ' transition';
                const badgeClass = badgesCat[m.categoriaId] || 'bg-slate-800 text-slate-300 border-slate-700';

                tr.innerHTML = `
                    <td class="cel-categoria p-3 align-top">
                        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}">
                            ${m.categoria}
                        </span>
                    </td>
                    <td class="cel-item p-3 align-top">
                        <strong class="text-white block font-semibold text-xs">${m.item}</strong>
                        <span class="text-[11px] text-slate-400 block mt-0.5 leading-snug">${m.aplicacao}</span>
                    </td>
                    <td class="cel-espec p-3 align-top text-slate-400 text-[11px] leading-snug font-mono">
                        ${m.especificacao}
                    </td>
                    <td data-rotulo="Projeto" class="cel-num p-3 align-top text-right font-mono text-slate-300">
                        ${m.qtdCalculada.toLocaleString('pt-BR')}
                    </td>
                    <td data-rotulo="Sobra" class="cel-num p-3 align-top text-right font-mono text-amber-400/90 text-[11px]">
                        +${m.margemSobras.toLocaleString('pt-BR')}
                    </td>
                    <td data-rotulo="Comprar" class="cel-num p-3 align-top text-right font-mono font-bold text-emerald-400 text-xs">
                        ${m.qtdTotal.toLocaleString('pt-BR')}
                    </td>
                    <td data-rotulo="Unid." class="cel-num p-3 align-top text-center text-slate-400 font-mono text-xs">
                        ${m.unidade}
                    </td>
                    <td data-rotulo="Preço unit." class="cel-preco p-3 align-top text-right text-xs">
                        <div class="flex flex-col items-end gap-0.5">
                            <span class="font-mono font-bold text-emerald-400 whitespace-nowrap">R$ ${m.precoUnit.toFixed(2).replace('.', ',')}<span class="text-slate-500 font-normal">/${escHtml(m.unidade)}</span></span>
                            ${m.categoriaId === 'condutores' ? `<span class="font-mono text-[10px] text-amber-400/90 whitespace-nowrap">R$ ${(m.precoUnit * 100).toFixed(2).replace('.', ',')}/rolo 100m</span>` : (m.categoriaId === 'eletrodutos' && m.unidade === 'm' ? `<span class="font-mono text-[10px] text-amber-400/90 whitespace-nowrap">R$ ${(m.precoUnit * 50).toFixed(2).replace('.', ',')}/rolo 50m</span>` : '')}
                            ${/^Internet/.test(m.fontePreco || '') ? `<span class="text-[9px] text-violet-300 whitespace-nowrap" title="${escHtml(m.fontePreco)}"><i class="fa-solid fa-globe"></i> internet</span>` : ''}
                            <div class="flex items-center gap-2 mt-0.5 whitespace-nowrap">
                                <button type="button" onclick="pesquisarMaterialNaInternet(${idxMaterial})" class="text-[10px] text-violet-300 hover:text-violet-200 inline-flex items-center gap-1 transition" title="Pesquisar o preço deste material na internet">
                                    <i class="fa-solid fa-magnifying-glass-dollar text-[9px]"></i> Pesquisar
                                </button>
                                <button type="button" onclick="editarPrecoMaterialIdx(${idxMaterial})" class="text-[10px] text-slate-400 hover:text-amber-300 inline-flex items-center gap-1 transition" title="Ajustar o preço unitário deste material">
                                    <i class="fa-solid fa-pen text-[9px]"></i> Alterar
                                </button>
                            </div>
                        </div>
                    </td>
                    <td data-rotulo="Subtotal" class="cel-subtotal p-3 align-top text-right font-mono font-bold text-white text-xs">
                        R$ ${m.subtotal.toFixed(2).replace('.', ',')}
                    </td>
                `;
                corpo.appendChild(tr);
            });

            // Mão de obra lançada automaticamente na lista geral (seção própria, fora do total de material)
            if (_categoriaMaterialFiltroAtiva === 'todos' && typeof linhasMaoDeObraListaGeral === 'function') {
                linhasMaoDeObraListaGeral(termoBusca).forEach(tr => corpo.appendChild(tr));
            }
        }

        function copiarListaComprasTexto() {
            const materiais = state.quantitativoMateriaisDetalhado || [];
            if (materiais.length === 0) {
                mostrarNotificacaoToast('Nenhum material calculado no momento.', 'aviso');
                return;
            }

            let txt = `=======================================================\n`;
            txt += `LISTA DE MATERIAIS PARA COMPRA & COTAÇÃO - NBR 5410\n`;
            txt += `Projeto: ${(state.projetoAtual && state.projetoAtual.nome) || 'Instalação Elétrica Residencial'}\n`;
            txt += `Data: ${new Date().toLocaleDateString('pt-BR')} - Quantidades com margem de sobras (+10%)\n`;
            txt += `=======================================================\n\n`;

            // 1. CONDUTORES DETALHADOS AGRUPADOS POR BITOLA & CORES (NBR 5410)
            const gruposCabos = state.quantitativoCabosAgrupadosPorBitola || [];
            if (gruposCabos.length > 0) {
                txt += `[ CONDUTORES ELÉTRICOS AGRUPADOS POR BITOLA & CORES (NBR 5410 ITEM 6.1.5.3) ]\n`;
                gruposCabos.forEach(gb => {
                    txt += `► CONDUTORES BITOLA ${gb.secao} — Subtotal: ${gb.metrosTotal}m (Projeto: ${gb.metrosProjetoTotal}m + Sobra: ${gb.sobraTotal}m) | ~${gb.rolos100Total} rolos de 100m | R$ ${gb.subtotal.toFixed(2).replace('.', ',')}\n`;
                    gb.cores.forEach(c => {
                        txt += `   • Cor: ${c.cor} (${c.funcao}): ${c.metrosTotal}m [Projeto: ${c.metrosProjeto}m + Sobra: ${c.sobra}m] | Embalagem: ${c.rolosSugeridos} | Circuitos: ${c.circuitosStr}\n`;
                    });
                    txt += `\n`;
                });
            } else {
                const cabosList = state.quantitativoCabosPorCor || [];
                if (cabosList.length > 0) {
                    txt += `[ CONDUTORES ELÉTRICOS POR SEÇÃO & COR (NBR 5410 ITEM 6.1.5.3) ]\n`;
                    cabosList.forEach(c => {
                        txt += ` • ${c.secao} - Cor: ${c.cor} (${c.funcao}): ${c.metrosTotal}m (Projeto: ${c.metrosProjeto}m + Sobra: ${c.sobra}m)\n`;
                        txt += `   Embalagem Sugerida: ${c.rolosSugeridos} | Circuitos: ${c.circuitosStr}\n`;
                    });
                    txt += `\n`;
                }
            }

            // 2. DISJUNTORES INDIVIDUAIS POR POLOS, CURVA E CORRENTE
            const disjList = state.quantitativoDisjuntoresIndividuais || [];
            if (disjList.length > 0) {
                txt += `[ QUADRO DE DISJUNTORES INDIVIDUAIS DIN (NBR IEC 60898) ]\n`;
                disjList.forEach(d => {
                    txt += ` • ${d.tipo} ${d.curva} ${d.correnteStr} (${d.tensao}): ${d.qtdTotal} un (Projeto: ${d.qtdProjeto} + Reserva: ${d.reserva})\n`;
                    txt += `   Circuitos: ${d.circuitosStr}\n`;
                });
                txt += `\n`;
            }

            // 3. SUGESTÃO DE BARRAMENTO PENTE DIN & ACESSÓRIOS
            const sb = state.sugestaoBarramentoPente;
            if (sb && sb.itensKit) {
                txt += `[ SUGESTÃO DE BARRAMENTO TIPO PENTE DIN & ACESSÓRIOS (NBR 5410 ITEM 6.5.4) ]\n`;
                txt += `Modelo Sugerido: ${sb.modeloSugerido} (${sb.polosOcupados} módulos ocupados)\n`;
                sb.itensKit.forEach(it => {
                    txt += ` • ${it.qtd} ${it.unid} - ${it.item} (R$ ${it.subtotal.toFixed(2)})\n`;
                });
                txt += `\n`;
            }

            // 4. BOM COMPLETO POR CATEGORIA
            const cats = {};
            materiais.forEach(m => {
                if (!cats[m.categoria]) cats[m.categoria] = [];
                cats[m.categoria].push(m);
            });

            let totalEstimado = 0;
            Object.keys(cats).forEach(cat => {
                txt += `[ ${cat.toUpperCase()} ]\n`;
                cats[cat].forEach(it => {
                    totalEstimado += it.subtotal;
                    txt += ` • ${it.qtdTotal} ${it.unidade || it.unid || 'un'} - ${it.item}\n`;
                    txt += `   Especificação: ${it.especificacao}\n`;
                });
                txt += `\n`;
            });

            // Mão de obra e totais do orçamento
            if (typeof textoMaoDeObraParaCopiar === 'function') txt += textoMaoDeObraParaCopiar();
            const totOrc = state.orcamentoMaoDeObra && state.orcamentoMaoDeObra.totais;
            const brl = v => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            txt += `=======================================================\n`;
            txt += `MATERIAL: ${brl(totalEstimado)}\n`;
            if (totOrc) {
                txt += `MÃO DE OBRA: ${brl(totOrc.maoDeObra)}\n`;
                if (totOrc.bdi) txt += `BDI / MARGEM (${totOrc.bdiPct}%): ${brl(totOrc.bdi)}\n`;
                txt += `TOTAL GERAL: ${brl(totOrc.total)}\n`;
            }
            txt += `Normas Atendidas: ABNT NBR 5410, NBR 14136, NBR 15465, NBR IEC 60898, NBR IEC 61008\n`;
            txt += `=======================================================\n`;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(txt).then(() => {
                    mostrarNotificacaoToast('Lista de compras completa copiada para a área de transferência!', 'sucesso');
                }).catch(() => {
                    mostrarNotificacaoToast('Lista copiada!', 'sucesso');
                });
            } else {
                mostrarNotificacaoToast('Lista pronta para cotação.', 'info');
            }
        }

        function exportarParaExcel() {
            try {
                if (typeof XLSX === 'undefined') {
                    alert('Biblioteca SheetJS carregando... Por favor tente novamente em alguns segundos.');
                    return;
                }

                const wb = XLSX.utils.book_new();

                // 1. ABA 1: RESUMO DO PROJETO & ALIMENTADOR
                const dadosResumo = [
                    ['PRO-ELÉTRICA CAD NBR 5410 - MEMORIAL DESCRITIVO MULTI-PAVIMENTOS'],
                    ['Data de Emissão:', new Date().toLocaleDateString('pt-BR')],
                    ['Norma de Referência:', 'ABNT NBR 5410:2004 (Instalações Elétricas de Baixa Tensão)'],
                    ['Quantidade de Pavimentos:', `${state.pavimentos.length} (${state.pavimentos.map(p => p.nome).join(', ')})`],
                    [''],
                    ['PARÂMETROS GERAIS DA ENTRADA DE ENERGIA', ''],
                    ['Sistema de Alimentação:', (state.alimentacaoExterna && state.alimentacaoExterna.sistema ? state.alimentacaoExterna.sistema.toUpperCase() : 'BIFÁSICO')],
                    ['Condutores do Ramal:', document.getElementById('lblQtdCondutoresRamal') ? document.getElementById('lblQtdCondutoresRamal').innerText : '-'],
                    ['Cabo Alimentador Geral:', document.getElementById('lblCaboGeral') ? document.getElementById('lblCaboGeral').innerText : '-'],
                    ['Cabo de Proteção (Terra):', document.getElementById('lblTerraGeral') ? document.getElementById('lblTerraGeral').innerText : '-'],
                    ['Disjuntor Geral:', document.getElementById('lblDisjGeral') ? document.getElementById('lblDisjGeral').innerText : '-'],
                    ['Dispositivo Residual (IDR):', document.getElementById('lblIdrGeral') ? document.getElementById('lblIdrGeral').innerText : '-'],
                    ['Distância Alimentação Externa → QDT:', document.getElementById('lblFormulaCaboAlim') ? document.getElementById('lblFormulaCaboAlim').innerText : '-'],
                    ['Total de Cabos de Entrada:', document.getElementById('lblMetragemTotalCaboAlim') ? document.getElementById('lblMetragemTotalCaboAlim').innerText : '-']
                ];
                if (typeof linhasExcelTotaisOrcamento === 'function') dadosResumo.push(...linhasExcelTotaisOrcamento());
                const wsResumo = XLSX.utils.aoa_to_sheet(dadosResumo);
                XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Geral');

                // 2. ABA 2: QUADRO DE CIRCUITOS TERMINAIS
                const cabecalhoCircuitos = [
                    'Nº Circuito', 'Pavimento / Andar', 'Descrição da Carga', 'Tipo', 'Potência Prevista',
                    'Corrente Ib (A)', 'Bitola Condutor (mm²)', 'Disjuntor In (A)',
                    'Curva Disjuntor', 'Fase Conectada', 'Comprimento Rota (m)',
                    'Queda Tensão ΔV (%)', 'Eletroduto (DN)', 'Proteção DR (30mA)', 'Status NBR 5410'
                ];
                const linhasCircuitos = [cabecalhoCircuitos];

                (state.circuitosCalculados || []).forEach(c => {
                    linhasCircuitos.push([
                        c.num,
                        c.andar,
                        c.nome,
                        c.tipo,
                        c.pot,
                        c.ib,
                        c.cabo,
                        c.disj,
                        `Curva ${c.curva}`,
                        `Fase ${c.fase}`,
                        c.rota,
                        `${c.deltaVPct ? c.deltaVPct.toFixed(1) : '1.2'}%`,
                        c.eletroduto || 'DN 20 mm',
                        c.idrTag || 'IDR 30mA',
                        'CONFORME NBR 5410'
                    ]);
                });
                const wsCircuitos = XLSX.utils.aoa_to_sheet(linhasCircuitos);
                XLSX.utils.book_append_sheet(wb, wsCircuitos, 'Quadro de Circuitos');

                // 3. ABA 3: QUANTITATIVO DE MATERIAIS PARA COMPRA (BOM DETALHADO)
                const cabecalhoMateriais = ['Categoria', 'Item / Descrição', 'Especificação Técnica / Norma ABNT', 'Qtd. Projeto', 'Sobra (+10%)', 'Total para Compra', 'Unidade', 'Preço Unit. Est. (R$)', 'Subtotal Est. (R$)', 'Aplicação no Projeto'];
                const linhasMateriais = [cabecalhoMateriais];

                const mats = state.quantitativoMateriaisDetalhado || [];
                if (mats.length > 0) {
                    let totalGeralReais = 0;
                    mats.forEach(it => {
                        totalGeralReais += (it.subtotal || 0);
                        linhasMateriais.push([
                            it.categoria,
                            it.item,
                            it.especificacao,
                            it.qtdCalculada,
                            it.margemSobras,
                            it.qtdTotal,
                            it.unidade,
                            Number(it.precoUnit.toFixed(2)),
                            Number(it.subtotal.toFixed(2)),
                            it.aplicacao
                        ]);
                    });
                    linhasMateriais.push(['', '', '', '', '', '', 'TOTAL GERAL ESTIMADO:', '', Number(totalGeralReais.toFixed(2)), 'Tabela de referência — conferir com fornecedores']);
                } else {
                    const lisCabos = document.querySelectorAll('#listaCabos li');
                    lisCabos.forEach(li => {
                        const desc = li.querySelector('.font-semibold') ? li.querySelector('.font-semibold').innerText : 'Cabo';
                        const det = li.querySelector('.text-slate-400') ? li.querySelector('.text-slate-400').innerText : 'NBR 5410';
                        const qtd = li.querySelector('strong') ? li.querySelector('strong').innerText : '0';
                        linhasMateriais.push(['Cabos Flexíveis', desc, det, qtd, '0', qtd, 'm', 2.50, 0, 'Instalação Elétrica']);
                    });

                    const lisQuadros = document.querySelectorAll('#listaQuadros li');
                    lisQuadros.forEach(li => {
                        const desc = (li.querySelector('.font-semibold') || li.querySelector('span')) ? (li.querySelector('.font-semibold') || li.querySelector('span')).innerText : 'Quadro';
                        const detEl = li.querySelector('.text-slate-400');
                        const det = detEl ? detEl.innerText : 'NBR 5410 / NBR IEC 60898';
                        const qtd = li.querySelector('strong') ? li.querySelector('strong').innerText : '0';
                        linhasMateriais.push(['Quadro e Eletrodutos', desc, det, qtd, '0', qtd, 'un/m', 15.00, 0, 'Infraestrutura']);
                    });

                    const lisPontos = document.querySelectorAll('#listaPontosTomadas li');
                    lisPontos.forEach(li => {
                        const desc = li.querySelector('.font-semibold') ? li.querySelector('.font-semibold').innerText : 'Ponto';
                        const det = li.querySelector('.text-slate-400') ? li.querySelector('.text-slate-400').innerText : 'NBR 14136';
                        const qtd = li.querySelector('strong') ? li.querySelector('strong').innerText : '0';
                        linhasMateriais.push(['Pontos e Acessórios', desc, det, qtd, '0', qtd, 'un', 8.50, 0, 'Acabamento']);
                    });
                }

                const wsMateriais = XLSX.utils.aoa_to_sheet(linhasMateriais);
                XLSX.utils.book_append_sheet(wb, wsMateriais, 'Quantitativo de Materiais');

                // 3b. ABA: MÃO DE OBRA (js/app/16-mao-de-obra.js)
                const linhasMO = (typeof linhasExcelMaoDeObra === 'function') ? linhasExcelMaoDeObra() : null;
                if (linhasMO) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhasMO), 'Mão de Obra');

                // 4. ABA 4: PONTOS DE CONSUMO POR CÔMODO E PAVIMENTO
                const cabecalhoPontos = ['Pavimento', 'Cômodo', 'Identificação', 'Tipo', 'Potência (W)', 'Tensão (V)', 'Altura'];
                const linhasPontos = [cabecalhoPontos];

                state.pontosEletricos.forEach(pt => {
                    const c = state.comodos.find(cmd => cmd.id === pt.comodoId);
                    const pav = state.pavimentos.find(p => p.id === pt.pavimentoId);
                    linhasPontos.push([
                        pav ? pav.nome : 'Térreo',
                        c ? c.nome : 'Geral',
                        pt.nome,
                        pt.tipo,
                        pt.pot,
                        pt.tensao,
                        pt.altura || 'media'
                    ]);
                });
                const wsPontos = XLSX.utils.aoa_to_sheet(linhasPontos);
                XLSX.utils.book_append_sheet(wb, wsPontos, 'Pontos Elétricos TUG-TUE');

                
                // 5. ABA 5: CABOS DETALHADOS AGRUPADOS POR BITOLA & COR (NBR 5410)
                const cabecalhoCabos = ['Bitola / Seção', 'Função Normativa', 'Cor Normativa NBR 5410', 'Norma Regulamentar', 'Qtd. Projeto (m)', 'Sobra (+10%) (m)', 'Total Compra (m)', 'Embalagem Recomendada', 'Preço Unit. (R$)', 'Subtotal (R$)', 'Circuitos Atendidos'];
                const linhasCabos = [cabecalhoCabos];
                const gruposCabosXlsx = state.quantitativoCabosAgrupadosPorBitola || [];

                if (gruposCabosXlsx.length > 0) {
                    gruposCabosXlsx.forEach(gb => {
                        // Linha de Cabeçalho / Subtotal da Bitola
                        linhasCabos.push([
                            `► CONDUTORES BITOLA ${gb.secao}`,
                            'Agrupamento Normativo',
                            `${gb.cores.length} cores`,
                            'NBR NM 247-3 / NBR 5410',
                            gb.metrosProjetoTotal,
                            gb.sobraTotal,
                            gb.metrosTotal,
                            `~${gb.rolos100Total} rolo(s) 100m`,
                            '',
                            Number(gb.subtotal.toFixed(2)),
                            `SUBTOTAL BITOLA ${gb.secao}`
                        ]);
                        // Linhas de cada Cor desta Bitola
                        gb.cores.forEach(cb => {
                            linhasCabos.push([
                                cb.secao,
                                cb.funcao,
                                cb.cor,
                                cb.norma,
                                cb.metrosProjeto,
                                cb.sobra,
                                cb.metrosTotal,
                                cb.rolosSugeridos,
                                Number(cb.precoUnit.toFixed(2)),
                                Number(cb.subtotal.toFixed(2)),
                                cb.circuitosStr
                            ]);
                        });
                        linhasCabos.push(['', '', '', '', '', '', '', '', '', '', '']); // Linha de respiro
                    });
                } else {
                    const cabosListXlsx = state.quantitativoCabosPorCor || [];
                    cabosListXlsx.forEach(cb => {
                        linhasCabos.push([
                            cb.secao,
                            cb.funcao,
                            cb.cor,
                            cb.norma,
                            cb.metrosProjeto,
                            cb.sobra,
                            cb.metrosTotal,
                            cb.rolosSugeridos,
                            Number(cb.precoUnit.toFixed(2)),
                            Number(cb.subtotal.toFixed(2)),
                            cb.circuitosStr
                        ]);
                    });
                }
                const wsCabosCores = XLSX.utils.aoa_to_sheet(linhasCabos);
                XLSX.utils.book_append_sheet(wb, wsCabosCores, 'Cabos por Seção e Cor');

                // 6. ABA 6: DISJUNTORES INDIVIDUAIS DIN (NBR IEC 60898)
                const cabecalhoDisj = ['Dispositivo / Tipo', 'Polos', 'Curva Magnética', 'Corrente (In)', 'Tensão (Un)', 'Capacidade Ruptura', 'Qtd. Projeto', 'Reserva (+10%)', 'Total Compra', 'Preço Unit. (R$)', 'Subtotal (R$)', 'Circuitos Protegidos'];
                const linhasDisj = [cabecalhoDisj];
                const disjListXlsx = state.quantitativoDisjuntoresIndividuais || [];
                disjListXlsx.forEach(dj => {
                    linhasDisj.push([
                        dj.tipo,
                        dj.polos,
                        dj.curva,
                        dj.correnteStr,
                        dj.tensao,
                        dj.icn,
                        dj.qtdProjeto,
                        dj.reserva,
                        dj.qtdTotal,
                        Number(dj.precoUnit.toFixed(2)),
                        Number(dj.subtotal.toFixed(2)),
                        dj.circuitosStr
                    ]);
                });
                const wsDisj = XLSX.utils.aoa_to_sheet(linhasDisj);
                XLSX.utils.book_append_sheet(wb, wsDisj, 'Disjuntores Individuais DIN');

                // 7. ABA 7: SUGESTÃO DE BARRAMENTO PENTE DIN & ACESSÓRIOS
                const cabecalhoBar = ['Item / Acessório', 'Especificação Técnica', 'Qtd.', 'Unidade', 'Preço Unit. (R$)', 'Subtotal (R$)', 'Finalidade Normativa'];
                const linhasBar = [cabecalhoBar];
                const sbXlsx = state.sugestaoBarramentoPente;
                if (sbXlsx && sbXlsx.itensKit) {
                    sbXlsx.itensKit.forEach(it => {
                        linhasBar.push([
                            it.item,
                            it.espec,
                            it.qtd,
                            it.unid,
                            Number(it.precoUnit.toFixed(2)),
                            Number(it.subtotal.toFixed(2)),
                            it.motivo
                        ]);
                    });
                }
                const wsBar = XLSX.utils.aoa_to_sheet(linhasBar);
                XLSX.utils.book_append_sheet(wb, wsBar, 'Sugestão Barramento Pente');

                XLSX.writeFile(wb, 'Projeto_Eletrico_MultiPavimentos_NBR5410.xlsx');

            } catch (err) {
                console.error('Erro na exportação Excel:', err);
                alert('Ocorreu um erro ao exportar para Excel: ' + err.message);
            }
        }

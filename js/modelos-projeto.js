/* =============================================================================
   PRO-ELÉTRICA CAD — MODELOS DE PROJETO ("Novo Projeto")
   -----------------------------------------------------------------------------
   Modelos descritos em METROS: terreno (lote e recuos), cômodos posicionados
   dentro da área construível, cargas específicas (chuveiro, ar-condicionado,
   spots...) em posição relativa ao cômodo, quadro, prumada e entrada de energia.

   Antes os modelos tinham posições fixas em pixels (pensadas para 40 px/m) e
   não mudavam o terreno: em outra escala os cômodos se sobrepunham ou
   separavam, os pontos caíam fora dos cômodos e o lote do projeto anterior
   continuava na tela.

   montar(id, { escala, origem }) devolve tudo em pixels na escala pedida.
   A frente do lote fica embaixo (calçada); os fundos, em cima.

   Uso no navegador: window.ModelosProjeto   Uso no Node: require('./js/modelos-projeto.js')
   ============================================================================= */
(function (raiz, fabrica) {
    'use strict';
    const modulo = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = modulo;
    else raiz.ModelosProjeto = modulo;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const PAV_TERREO = { id: 'terreo', nome: 'Pavimento Térreo', nivel: 0, alturaPeDireito: 2.8, temLajePiso: true, tipoLajePiso: 'concreto', espessuraLajePiso: 0.20, temLajeTeto: true, tipoLajeTeto: 'concreto', espessuraLajeTeto: 0.15, tipoPassagemCabos: 'teto' };
    const PAV_SUPERIOR = Object.assign({}, PAV_TERREO, { id: 'superior', nome: '1º Pavimento (Superior)', nivel: 1 });

    // x, y: posição do cômodo (m) a partir do canto da área construível (fundos-esquerda)
    // pontos: cargas específicas; fx/fy = posição relativa dentro do cômodo (0 a 1)
    const MODELOS = Object.freeze({
        em_branco: {
            nome: 'Projeto em branco',
            descricao: 'Lote de 12 × 25 m com um pavimento e o quadro pronto para desenhar os cômodos do zero.',
            icone: 'fa-file', cor: 'slate', etiqueta: 'Em branco',
            terreno: { largura: 12, comprimento: 25, recuoFrontal: 4, recuoLateral: 1.5, recuoFundos: 3 },
            pavimentos: [PAV_TERREO],
            comodos: [],
            quadro: { x: 0.2, y: 0.2 }
        },
        casa_terrea: {
            nome: 'Casa térrea compacta (4 cômodos)',
            descricao: 'Sala, cozinha, dormitório e banheiro: bom para testar o app ou um anexo/edícula.',
            icone: 'fa-house', cor: 'amber', etiqueta: 'Compacta',
            terreno: { largura: 12, comprimento: 25, recuoFrontal: 4, recuoLateral: 1.5, recuoFundos: 3 },
            pavimentos: [PAV_TERREO],
            comodos: [
                { id: 101, pav: 'terreo', nome: 'Sala de Estar', tipo: 'geral', x: 0, y: 0, largura: 5.0, comprimento: 4.0 },
                { id: 102, pav: 'terreo', nome: 'Cozinha', tipo: 'servico', x: 5.0, y: 0, largura: 4.0, comprimento: 3.0,
                  pontos: [{ tipo: 'TUE', nome: 'Forno Elétrico de Embutir', pot: 2800, tensao: 220, altura: 'media', fx: 0.85, fy: 0.15 }] },
                { id: 103, pav: 'terreo', nome: 'Dormitório', tipo: 'geral', x: 0, y: 4.0, largura: 4.0, comprimento: 3.5 },
                { id: 104, pav: 'terreo', nome: 'Banheiro', tipo: 'servico', x: 4.0, y: 4.0, largura: 2.5, comprimento: 2.0,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico 5500 W', pot: 5500, tensao: 220, altura: 'alta', fx: 0.8, fy: 0.25 }] }
            ],
            quadro: { x: 6.6, y: 4.2 }
        },
        sobrado: {
            nome: 'Sobrado compacto (2 pavimentos)',
            descricao: 'Living, lavabo e cozinha no térreo; suíte, banheiro e dormitório em cima, com escada e prumada.',
            icone: 'fa-building', cor: 'sky', etiqueta: '2 pavimentos',
            terreno: { largura: 10, comprimento: 25, recuoFrontal: 4, recuoLateral: 1.25, recuoFundos: 3 },
            pavimentos: [PAV_TERREO, PAV_SUPERIOR],
            comodos: [
                { id: 201, pav: 'terreo', nome: 'Living / Sala', tipo: 'geral', x: 0, y: 0, largura: 5.5, comprimento: 4.0 },
                { id: 203, pav: 'terreo', nome: 'Lavabo', tipo: 'servico', x: 5.5, y: 0, largura: 2.0, comprimento: 1.8 },
                { id: 202, pav: 'terreo', nome: 'Cozinha Gourmet', tipo: 'servico', x: 0, y: 4.0, largura: 4.0, comprimento: 4.0,
                  pontos: [{ tipo: 'TUE', nome: 'Cooktop por Indução 4 Bocas', pot: 7200, tensao: 220, altura: 'baixa', fx: 0.5, fy: 0.15 }] },
                { id: 204, pav: 'superior', nome: 'Suíte Master', tipo: 'geral', x: 0, y: 0, largura: 4.5, comprimento: 4.0,
                  pontos: [{ tipo: 'TUE', nome: 'Ar Condicionado 12.000 BTU', pot: 1150, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.08 }] },
                { id: 206, pav: 'superior', nome: 'Banheiro Social', tipo: 'servico', x: 4.5, y: 0, largura: 2.5, comprimento: 2.0,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico 6800 W', pot: 6800, tensao: 220, altura: 'alta', fx: 0.75, fy: 0.3 }] },
                { id: 205, pav: 'superior', nome: 'Dormitório 2', tipo: 'geral', x: 0, y: 4.0, largura: 4.0, comprimento: 3.5 }
            ],
            // escada no Living: 0,95 m × 2,60 m (horizontal), de pé no canto dos fundos
            escadas: [{ id: 'escada_sobrado_1', comodoId: 201, comodoNome: 'Living / Sala', pavimentoOrigemId: 'terreo', pavimentoDestinoId: 'superior',
                x: 0.3, y: 0.3, largura: 0.95, comprimento: 2.60, direcao: 'H_DIR', orientacao: 'H', numDegraus: 16 }],
            quadro: { x: 4.4, y: 4.3 },
            prumada: { x: 5.3, y: 2.3 }
        },
        apartamento: {
            nome: 'Apartamento studio',
            descricao: 'Living e dormitório integrados, cozinha americana e banheiro, com ar-condicionado e spots.',
            icone: 'fa-city', cor: 'purple', etiqueta: 'Studio',
            // "lote" = área privativa do apartamento (sem recuos de terreno)
            terreno: { largura: 10, comprimento: 5.5, recuoFrontal: 0.25, recuoLateral: 0.25, recuoFundos: 0.25 },
            pavimentos: [Object.assign({}, PAV_TERREO, { nome: 'Apartamento Studio', alturaPeDireito: 2.7, espessuraLajePiso: 0.18 })],
            comodos: [
                { id: 301, pav: 'terreo', nome: 'Living / Dormitório', tipo: 'geral', x: 0, y: 0, largura: 6.0, comprimento: 4.5,
                  pontos: [
                      { tipo: 'ILUM', nome: 'Spot Sala de Estar', pot: 60, tensao: 127, altura: 'teto', fx: 0.28, fy: 0.5 },
                      { tipo: 'ILUM', nome: 'Spot Espaço Dormitório', pot: 60, tensao: 127, altura: 'teto', fx: 0.72, fy: 0.5 },
                      { tipo: 'TUE', nome: 'Ar Condicionado Inverter 9.000 BTU', pot: 850, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.06 }
                  ] },
                { id: 302, pav: 'terreo', nome: 'Cozinha Americana', tipo: 'servico', x: 6.0, y: 0, largura: 3.5, comprimento: 2.5 },
                { id: 303, pav: 'terreo', nome: 'Banheiro', tipo: 'servico', x: 6.0, y: 2.5, largura: 2.2, comprimento: 2.0,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico 5500 W', pot: 5500, tensao: 220, altura: 'alta', fx: 0.75, fy: 0.3 }] }
            ],
            quadro: { x: 8.4, y: 2.7 }
        },
        casa_popular_2q: {
            nome: 'Casa popular 2 quartos (≈ 50 m²)',
            descricao: 'Planta típica de habitação popular: sala, cozinha, área de serviço, banheiro, circulação e 2 quartos, em lote de 9,2 × 20 m.',
            icone: 'fa-house-chimney', cor: 'emerald', etiqueta: 'Popular • 1 pavimento',
            sistema: 'bifasico',
            terreno: { largura: 9.2, comprimento: 20, recuoFrontal: 4, recuoLateral: 1.0, recuoFundos: 2 },
            pavimentos: [PAV_TERREO],
            comodos: [
                { id: 401, pav: 'terreo', nome: 'Quarto 1', tipo: 'geral', x: 0, y: 0, largura: 2.8, comprimento: 3.0 },
                { id: 402, pav: 'terreo', nome: 'Banheiro', tipo: 'servico', x: 2.8, y: 0, largura: 1.5, comprimento: 2.2,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico Convencional 220V', pot: 5500, tensao: 220, altura: 'alta', fx: 0.7, fy: 0.3 }] },
                { id: 403, pav: 'terreo', nome: 'Circulação', tipo: 'geral', x: 2.8, y: 2.2, largura: 1.5, comprimento: 0.8 },
                { id: 404, pav: 'terreo', nome: 'Quarto 2', tipo: 'geral', x: 4.3, y: 0, largura: 2.8, comprimento: 3.0 },
                { id: 405, pav: 'terreo', nome: 'Sala de Estar', tipo: 'geral', x: 0, y: 3.0, largura: 4.3, comprimento: 3.6 },
                { id: 406, pav: 'terreo', nome: 'Cozinha', tipo: 'servico', x: 4.3, y: 3.0, largura: 2.8, comprimento: 3.6 },
                { id: 407, pav: 'terreo', nome: 'Área de Serviço', tipo: 'servico', x: 4.3, y: 6.6, largura: 2.8, comprimento: 1.6 }
            ],
            quadro: { x: 2.9, y: 2.3 }
        },
        casa_3q_suite: {
            nome: 'Casa térrea 3 quartos com suíte e garagem (≈ 140 m²)',
            descricao: 'Suíte, 2 quartos, banheiro social, sala de estar e jantar, cozinha, área de serviço, varanda e garagem coberta, em lote de 12 × 30 m.',
            icone: 'fa-house-flag', cor: 'amber', etiqueta: 'Família • 1 pavimento',
            sistema: 'bifasico',
            terreno: { largura: 12, comprimento: 30, recuoFrontal: 5, recuoLateral: 1.5, recuoFundos: 3 },
            pavimentos: [PAV_TERREO],
            comodos: [
                { id: 501, pav: 'terreo', nome: 'Suíte Master', tipo: 'geral', x: 0, y: 0, largura: 3.8, comprimento: 3.4,
                  pontos: [{ tipo: 'TUE', nome: 'Ar Condicionado Split Inverter 12.000 BTU', pot: 1150, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.08 }] },
                { id: 502, pav: 'terreo', nome: 'Banheiro da Suíte', tipo: 'servico', x: 3.8, y: 0, largura: 1.8, comprimento: 3.4,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico Turbo Master', pot: 7500, tensao: 220, altura: 'alta', fx: 0.7, fy: 0.25 }] },
                { id: 503, pav: 'terreo', nome: 'Quarto 2', tipo: 'geral', x: 5.6, y: 0, largura: 3.4, comprimento: 3.4,
                  pontos: [{ tipo: 'TUE', nome: 'Ar Condicionado Split Inverter 9.000 BTU', pot: 900, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.08 }] },
                { id: 504, pav: 'terreo', nome: 'Circulação', tipo: 'geral', x: 0, y: 3.4, largura: 9.0, comprimento: 1.2 },
                { id: 505, pav: 'terreo', nome: 'Quarto 3', tipo: 'geral', x: 0, y: 4.6, largura: 3.2, comprimento: 3.2 },
                { id: 506, pav: 'terreo', nome: 'Banheiro Social', tipo: 'servico', x: 3.2, y: 4.6, largura: 1.8, comprimento: 3.2,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico Convencional 220V', pot: 5500, tensao: 220, altura: 'alta', fx: 0.7, fy: 0.25 }] },
                { id: 507, pav: 'terreo', nome: 'Área de Serviço', tipo: 'servico', x: 5.0, y: 4.6, largura: 4.0, comprimento: 3.2,
                  pontos: [{ tipo: 'TUE', nome: 'Máquina Lava e Seca Front Load 220V', pot: 2200, tensao: 220, altura: 'media', fx: 0.8, fy: 0.2 }] },
                { id: 508, pav: 'terreo', nome: 'Sala de Estar e Jantar', tipo: 'geral', x: 0, y: 7.8, largura: 5.0, comprimento: 4.2,
                  pontos: [{ tipo: 'TUE', nome: 'Ar Condicionado Split Inverter 18.000 BTU', pot: 1700, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.06 }] },
                { id: 509, pav: 'terreo', nome: 'Cozinha', tipo: 'servico', x: 5.0, y: 7.8, largura: 4.0, comprimento: 4.2,
                  pontos: [
                      { tipo: 'TUE', nome: 'Forno Elétrico de Embutir Padrão (50L)', pot: 2800, tensao: 220, altura: 'media', fx: 0.85, fy: 0.15 },
                      { tipo: 'TUE', nome: 'Lava-Louças Grande 14 Serviços', pot: 1800, tensao: 220, altura: 'media', fx: 0.85, fy: 0.75 }
                  ] },
                { id: 510, pav: 'terreo', nome: 'Varanda', tipo: 'geral', x: 0, y: 12.0, largura: 5.0, comprimento: 2.0 },
                { id: 511, pav: 'terreo', nome: 'Garagem', tipo: 'geral', x: 5.0, y: 12.0, largura: 4.0, comprimento: 5.5,
                  pontos: [{ tipo: 'TUE', nome: 'Motor Portão Eletrônico Garagem 220V', pot: 400, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.95 }] }
            ],
            quadro: { x: 4.2, y: 3.5 }
        },
        sobrado_3suites: {
            nome: 'Sobrado 3 suítes com área gourmet (≈ 200 m²)',
            descricao: 'Térreo com varanda gourmet, cozinha, living, lavabo, despensa, área de serviço e garagem com carregador veicular; superior com 3 suítes, closet e varanda. Entrada trifásica.',
            icone: 'fa-building-user', cor: 'sky', etiqueta: 'Alto padrão • 2 pavimentos',
            sistema: 'trifasico',
            terreno: { largura: 10, comprimento: 25, recuoFrontal: 4, recuoLateral: 1.25, recuoFundos: 3 },
            pavimentos: [PAV_TERREO, PAV_SUPERIOR],
            comodos: [
                { id: 601, pav: 'terreo', nome: 'Varanda Gourmet', tipo: 'servico', x: 0, y: 0, largura: 4.25, comprimento: 3.25,
                  pontos: [{ tipo: 'TUE', nome: 'Cooktop por Indução 2 Bocas / Dominó', pot: 3600, tensao: 220, altura: 'baixa', fx: 0.5, fy: 0.15 }] },
                { id: 602, pav: 'terreo', nome: 'Área de Serviço', tipo: 'servico', x: 4.25, y: 0, largura: 3.25, comprimento: 2.25,
                  pontos: [{ tipo: 'TUE', nome: 'Máquina Lava e Seca Front Load 220V', pot: 2200, tensao: 220, altura: 'media', fx: 0.8, fy: 0.25 }] },
                { id: 603, pav: 'terreo', nome: 'Lavabo', tipo: 'servico', x: 4.25, y: 2.25, largura: 1.5, comprimento: 2.0 },
                { id: 604, pav: 'terreo', nome: 'Despensa', tipo: 'geral', x: 5.75, y: 2.25, largura: 1.75, comprimento: 2.0 },
                { id: 605, pav: 'terreo', nome: 'Cozinha', tipo: 'servico', x: 0, y: 3.25, largura: 4.25, comprimento: 3.5,
                  pontos: [
                      { tipo: 'TUE', nome: 'Cooktop por Indução 4 Bocas', pot: 7200, tensao: 220, altura: 'baixa', fx: 0.5, fy: 0.12 },
                      { tipo: 'TUE', nome: 'Forno Elétrico de Embutir Padrão (50L)', pot: 2800, tensao: 220, altura: 'media', fx: 0.9, fy: 0.5 }
                  ] },
                { id: 606, pav: 'terreo', nome: 'Hall / Escada', tipo: 'geral', x: 4.25, y: 4.25, largura: 3.25, comprimento: 2.5 },
                { id: 607, pav: 'terreo', nome: 'Living / Jantar', tipo: 'geral', x: 0, y: 6.75, largura: 7.5, comprimento: 4.5,
                  pontos: [{ tipo: 'TUE', nome: 'Ar Condicionado Split Inverter 24.000 BTU', pot: 2300, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.05 }] },
                { id: 608, pav: 'terreo', nome: 'Garagem', tipo: 'geral', x: 0, y: 11.25, largura: 5.5, comprimento: 5.0,
                  pontos: [
                      { tipo: 'TUE', nome: 'Carregador Veicular Wallbox 7 kW (32 A / 220V)', pot: 7040, tensao: 220, altura: 'media', fx: 0.08, fy: 0.3 },
                      { tipo: 'TUE', nome: 'Motor Portão Eletrônico Garagem 220V', pot: 400, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.95 }
                  ] },
                { id: 611, pav: 'superior', nome: 'Suíte 1', tipo: 'geral', x: 0, y: 0, largura: 4.25, comprimento: 3.5,
                  pontos: [{ tipo: 'TUE', nome: 'Ar Condicionado Split Inverter 9.000 BTU', pot: 900, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.08 }] },
                { id: 612, pav: 'superior', nome: 'Banheiro Suíte 1', tipo: 'servico', x: 4.25, y: 0, largura: 3.25, comprimento: 1.75,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico Convencional 220V', pot: 5500, tensao: 220, altura: 'alta', fx: 0.85, fy: 0.4 }] },
                { id: 613, pav: 'superior', nome: 'Banheiro Suíte 2', tipo: 'servico', x: 4.25, y: 1.75, largura: 3.25, comprimento: 1.75,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico Convencional 220V', pot: 5500, tensao: 220, altura: 'alta', fx: 0.85, fy: 0.6 }] },
                { id: 614, pav: 'superior', nome: 'Suíte 2', tipo: 'geral', x: 0, y: 3.5, largura: 4.25, comprimento: 3.5,
                  pontos: [{ tipo: 'TUE', nome: 'Ar Condicionado Split Inverter 9.000 BTU', pot: 900, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.08 }] },
                { id: 615, pav: 'superior', nome: 'Circulação', tipo: 'geral', x: 4.25, y: 3.5, largura: 3.25, comprimento: 3.25 },
                { id: 616, pav: 'superior', nome: 'Suíte Master', tipo: 'geral', x: 0, y: 7.0, largura: 4.75, comprimento: 4.25,
                  pontos: [{ tipo: 'TUE', nome: 'Ar Condicionado Split Inverter 12.000 BTU', pot: 1150, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.06 }] },
                { id: 617, pav: 'superior', nome: 'Banheiro Suíte Master', tipo: 'servico', x: 4.75, y: 6.75, largura: 2.75, comprimento: 2.5,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico Turbo Master', pot: 7500, tensao: 220, altura: 'alta', fx: 0.8, fy: 0.3 }] },
                { id: 618, pav: 'superior', nome: 'Closet', tipo: 'geral', x: 4.75, y: 9.25, largura: 2.75, comprimento: 2.0 },
                { id: 619, pav: 'superior', nome: 'Varanda', tipo: 'geral', x: 0, y: 11.25, largura: 4.75, comprimento: 1.5 }
            ],
            // escada no Hall: 0,95 m × 2,60 m (horizontal)
            escadas: [{ id: 'escada_sobrado3s_1', comodoId: 606, comodoNome: 'Hall / Escada', pavimentoOrigemId: 'terreo', pavimentoDestinoId: 'superior',
                x: 4.5, y: 4.5, largura: 0.95, comprimento: 2.60, direcao: 'H_DIR', orientacao: 'H', numDegraus: 16 }],
            quadro: { x: 4.35, y: 6.2 },
            prumada: { x: 6.6, y: 5.7 }
        },
        apartamento_2q: {
            nome: 'Apartamento 2 quartos com suíte e varanda (≈ 65 m²)',
            descricao: 'Suíte, quarto, 2 banheiros, living, cozinha, área de serviço e varanda; pé-direito de 2,60 m e fiação pela laje.',
            icone: 'fa-building', cor: 'violet', etiqueta: 'Apartamento',
            sistema: 'bifasico',
            terreno: { largura: 9.0, comprimento: 9.5, recuoFrontal: 0.25, recuoLateral: 0.25, recuoFundos: 0.25 },
            pavimentos: [Object.assign({}, PAV_TERREO, { nome: 'Apartamento', alturaPeDireito: 2.6, espessuraLajePiso: 0.12, espessuraLajeTeto: 0.12 })],
            comodos: [
                { id: 701, pav: 'terreo', nome: 'Suíte', tipo: 'geral', x: 0, y: 0, largura: 3.3, comprimento: 3.2,
                  pontos: [{ tipo: 'TUE', nome: 'Ar Condicionado Split Inverter 12.000 BTU', pot: 1150, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.08 }] },
                { id: 702, pav: 'terreo', nome: 'Banheiro da Suíte', tipo: 'servico', x: 3.3, y: 0, largura: 1.6, comprimento: 2.0,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico Convencional 220V', pot: 5500, tensao: 220, altura: 'alta', fx: 0.7, fy: 0.3 }] },
                { id: 703, pav: 'terreo', nome: 'Quarto 2', tipo: 'geral', x: 4.9, y: 0, largura: 3.0, comprimento: 3.2,
                  pontos: [{ tipo: 'TUE', nome: 'Ar Condicionado Split Inverter 9.000 BTU', pot: 900, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.08 }] },
                { id: 704, pav: 'terreo', nome: 'Banheiro Social', tipo: 'servico', x: 3.3, y: 2.0, largura: 1.6, comprimento: 2.0,
                  pontos: [{ tipo: 'TUE', nome: 'Chuveiro Elétrico Convencional 220V', pot: 5500, tensao: 220, altura: 'alta', fx: 0.7, fy: 0.7 }] },
                { id: 705, pav: 'terreo', nome: 'Circulação', tipo: 'geral', x: 0, y: 3.2, largura: 3.3, comprimento: 1.0 },
                { id: 706, pav: 'terreo', nome: 'Cozinha', tipo: 'servico', x: 4.9, y: 3.2, largura: 3.0, comprimento: 2.4,
                  pontos: [{ tipo: 'TUE', nome: 'Forno Elétrico de Embutir Padrão (50L)', pot: 2800, tensao: 220, altura: 'media', fx: 0.9, fy: 0.4 }] },
                { id: 707, pav: 'terreo', nome: 'Área de Serviço', tipo: 'servico', x: 4.9, y: 5.6, largura: 3.0, comprimento: 1.6,
                  pontos: [{ tipo: 'TUE', nome: 'Máquina Lava e Seca Front Load 220V', pot: 2200, tensao: 220, altura: 'media', fx: 0.8, fy: 0.3 }] },
                { id: 708, pav: 'terreo', nome: 'Living', tipo: 'geral', x: 0, y: 4.2, largura: 4.9, comprimento: 3.2,
                  pontos: [{ tipo: 'TUE', nome: 'Ar Condicionado Split Inverter 12.000 BTU', pot: 1150, tensao: 220, altura: 'alta', fx: 0.5, fy: 0.06 }] },
                { id: 709, pav: 'terreo', nome: 'Varanda', tipo: 'geral', x: 0, y: 7.4, largura: 4.9, comprimento: 1.5 }
            ],
            quadro: { x: 0.2, y: 3.3 }
        }
    });

    // ordem de exibição nos cartões do "Novo Projeto"
    const ORDEM = Object.freeze(['casa_popular_2q', 'casa_3q_suite', 'sobrado_3suites', 'apartamento_2q', 'casa_terrea', 'sobrado', 'apartamento', 'em_branco']);

    /** Resumo do modelo para o cartão: área, cômodos, pavimentos e cargas de uso específico. */
    function resumo(id) {
        const m = MODELOS[id];
        if (!m) return null;
        const tues = [].concat(...m.comodos.map(c => (c.pontos || []).filter(p => p.tipo === 'TUE')));
        return {
            id, nome: m.nome, descricao: m.descricao || '', icone: m.icone || 'fa-house', cor: m.cor || 'slate', etiqueta: m.etiqueta || '',
            pavimentos: m.pavimentos.length, comodos: m.comodos.length,
            areaM2: Math.round(m.comodos.reduce((s, c) => s + c.largura * c.comprimento, 0)),
            tues: tues.length, potTuesKW: Math.round(tues.reduce((s, p) => s + p.pot, 0) / 100) / 10,
            sistema: m.sistema || 'bifasico'
        };
    }

    /** Área construível (m) do modelo: lote menos os recuos. */
    function areaConstruivel(m) {
        const t = m.terreno;
        return { largura: t.largura - 2 * t.recuoLateral, comprimento: t.comprimento - t.recuoFrontal - t.recuoFundos };
    }

    /**
     * Monta o modelo em pixels.
     * @param {string} id
     * @param {{escala:number, origem?:{x:number,y:number}}} op escala (px/m) e canto superior-esquerdo do lote (px)
     */
    function montar(id, op) {
        const m = MODELOS[id] || MODELOS.em_branco;
        const E = Number(op && op.escala) || 40;
        const origem = (op && op.origem) || { x: 40, y: 40 };
        const t = m.terreno;
        const ox = origem.x + t.recuoLateral * E;          // canto da área construível (fundos-esquerda)
        const oy = origem.y + t.recuoFundos * E;
        const px = v => Math.round(v * E * 100) / 100;

        const comodos = m.comodos.map(c => ({
            id: c.id, pavimentoId: c.pav, nome: c.nome, tipo: c.tipo,
            largura: c.largura, comprimento: c.comprimento,
            area: Math.round(c.largura * c.comprimento * 100) / 100,
            perimetro: Math.round(2 * (c.largura + c.comprimento) * 100) / 100,
            x: ox + px(c.x), y: oy + px(c.y),
            cargas: [], passagemTomadas: 'horizontal', espessuraParede: null
        }));
        const pontos = [];
        m.comodos.forEach((c, i) => (c.pontos || []).forEach((p, k) => {
            const cx = comodos[i];
            pontos.push({
                id: `pt_${id}_${c.id}_${k}`, comodoId: c.id, pavimentoId: c.pav,
                tipo: p.tipo, nome: p.nome, pot: p.pot, tensao: p.tensao, altura: p.altura,
                x: cx.x + px(c.largura * p.fx), y: cx.y + px(c.comprimento * p.fy)
            });
        }));
        const escadas = (m.escadas || []).map(e => Object.assign({}, e, { x: ox + px(e.x), y: oy + px(e.y) }));
        const q = m.quadro || { x: 0.2, y: 0.2 };
        const qdtPos = { x: ox + px(q.x), y: oy + px(q.y), w: 45, h: 26 };
        const pr = m.prumada || { x: q.x + 1.3, y: q.y + 0.1 };
        const prumadaPos = { x: ox + px(pr.x), y: oy + px(pr.y), w: 20, h: 20 };
        // entrada da concessionária: na calçada/frente do lote, à esquerda
        const alimentacao = { x: origem.x + px(0.3), y: origem.y + px(t.comprimento) - 36 - 4, w: 75, h: 36, sistema: m.sistema || 'bifasico' };
        return {
            id, nome: m.nome,
            terreno: Object.assign({ ativo: true, customizado: false }, t, { x: origem.x, y: origem.y }),
            pavimentos: m.pavimentos.map(p => Object.assign({}, p)),
            comodos, pontos, escadas, qdtPos, prumadaPos, alimentacao
        };
    }

    return Object.freeze({ MODELOS, ORDEM, areaConstruivel, montar, resumo });
});

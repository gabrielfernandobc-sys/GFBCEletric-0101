/* =============================================================================
   PRO-ELÉTRICA CAD — PESQUISA DE PREÇOS NA INTERNET
   -----------------------------------------------------------------------------
   Regras sem DOM (testáveis no Node) para pesquisar o preço de um material:
     - monta o texto de busca a partir do item do quantitativo;
     - gera links de busca em lojas (abrem numa nova aba);
     - converte o preço de cada anúncio para a unidade do orçamento
       (rolo de 100 m → R$/m, lendo o comprimento no título);
     - descarta valores fora da curva e calcula menor / mediana / maior.

   A busca automática é feita pelo servidor local (/api/pesquisar-preco), que
   consulta o Mercado Livre; o navegador não pode chamar a loja diretamente.

   Uso no navegador:  window.PesquisaPrecos     Uso no Node: require(...)
   ============================================================================= */
(function (raiz, fabrica) {
    'use strict';
    const modulo = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = modulo;
    else raiz.PesquisaPrecos = modulo;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const LOJAS = [
        { id: 'ml', nome: 'Mercado Livre', icone: 'fa-handshake', url: q => `https://lista.mercadolivre.com.br/${encodeURIComponent(q.trim().replace(/\s+/g, '-'))}` },
        { id: 'google', nome: 'Google Shopping', icone: 'fa-google', marca: true, url: q => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}` },
        { id: 'leroy', nome: 'Leroy Merlin', icone: 'fa-store', url: q => `https://www.leroymerlin.com.br/search?term=${encodeURIComponent(q)}` },
        { id: 'amazon', nome: 'Amazon', icone: 'fa-amazon', marca: true, url: q => `https://www.amazon.com.br/s?k=${encodeURIComponent(q)}` },
        { id: 'buscape', nome: 'Buscapé', icone: 'fa-magnifying-glass-dollar', url: q => `https://www.buscape.com.br/search?q=${encodeURIComponent(q)}` }
    ];

    /** Seção do cabo em mm² ("2.5") a partir da chave ou do nome do item. */
    function secaoDoCabo(material) {
        if (material.chaveItem && /^\d+(\.\d+)?$/.test(String(material.chaveItem))) return String(material.chaveItem);
        const m = String(material.item || '').match(/(\d+(?:[.,]\d+)?)\s*mm²/);
        return m ? m[1].replace(',', '.') : null;
    }

    /** DN do eletroduto (mm) a partir do nome do item. */
    function dnDoEletroduto(material) {
        const m = String(material.item || '').match(/DN\s*(\d+)/i);
        return m ? m[1] : null;
    }

    /** "2.5" → "2,5"; "10.0" → "10". */
    function secaoBR(secao) {
        return String(Number(secao)).replace('.', ',');
    }

    /**
     * Como o preço do anúncio vira o preço do orçamento.
     * metros: comprimento padrão da embalagem para itens vendidos por metro
     * (usado só quando o título não informa o comprimento).
     */
    function tipoDoMaterial(material) {
        if (material.categoriaId === 'condutores') return { tipo: 'cabo', metros: 100, porMetro: true };
        if (material.categoriaId === 'eletrodutos' && material.unidade === 'm') return { tipo: 'eletroduto', metros: 50, porMetro: true };
        if (material.unidade === 'm') return { tipo: 'metro', metros: null, porMetro: true };
        return { tipo: 'unidade', metros: null, porMetro: false };
    }

    /**
     * Chave do grupo de preço: todos os cabos de uma bitola compartilham um preço
     * (independe da cor), assim como os eletrodutos de um DN.
     */
    function chaveGrupo(material) {
        const t = tipoDoMaterial(material);
        if (t.tipo === 'cabo') return 'cabo:' + Number(secaoDoCabo(material)).toFixed(1);
        if (t.tipo === 'eletroduto') return 'eletroduto:' + dnDoEletroduto(material);
        return 'item:' + material.item;
    }

    /** Nome curto do grupo para exibição. */
    function nomeGrupo(material) {
        const t = tipoDoMaterial(material);
        if (t.tipo === 'cabo') return `Cabo flexível 750 V ${secaoBR(secaoDoCabo(material))} mm² (todas as cores)`;
        if (t.tipo === 'eletroduto') {
            const pol = String(material.item || '').match(/\(([^)]*")\)/);
            return `Eletroduto corrugado DN ${dnDoEletroduto(material)}${pol ? ' (' + pol[1] + ')' : ''}`;
        }
        return material.item;
    }

    /** Texto de busca para a loja. */
    function montarConsulta(material) {
        const t = tipoDoMaterial(material);
        if (t.tipo === 'cabo') return `cabo flexível ${secaoBR(secaoDoCabo(material))}mm 750v rolo 100m`;
        if (t.tipo === 'eletroduto') {
            const pol = String(material.item || '').match(/\((\d[^)"]*)"\)/);
            return `eletroduto corrugado reforçado ${pol ? pol[1] : 'DN ' + dnDoEletroduto(material)} rolo 50m`;
        }
        const limpo = String(material.item || '')
            .replace(/\([^)]*\)/g, ' ')         // detalhes entre parênteses
            .replace(/\s+-\s+.*$/, ' ')         // " - Cor: ..." e complementos
            .replace(/[“”"]/g, '')
            .replace(/[×]/g, 'x')
            .replace(/\s+/g, ' ')
            .trim();
        return limpo.split(' ').slice(0, 9).join(' ');
    }

    function linksDeBusca(consulta) {
        return LOJAS.map(l => ({ id: l.id, nome: l.nome, icone: l.icone, marca: !!l.marca, url: l.url(consulta) }));
    }

    /**
     * Comprimento em metros informado no título do anúncio ("Rolo 100m",
     * "100 metros", "50 mts"). Ignora milímetros ("2,5mm") e "m²".
     */
    function metrosNoTitulo(titulo) {
        const t = String(titulo || '').toLowerCase();
        const m = t.match(/(?:^|[^\d,.])(\d{1,4})\s*(?:metros|metro|mts|mt|m)(?![a-z²\d])/);
        if (!m) return null;
        const n = parseInt(m[1], 10);
        return n >= 2 && n <= 2000 ? n : null;
    }

    function mediana(valores) {
        const v = valores.slice().sort((a, b) => a - b);
        if (!v.length) return null;
        const meio = Math.floor(v.length / 2);
        return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
    }

    /**
     * Converte os anúncios para o preço unitário do orçamento e resume.
     * @param {Array<{titulo:string, preco:number, link?:string, moeda?:string}>} resultados
     * @returns {{itens:Array, descartados:number, estatisticas:{n:number,min:number,mediana:number,max:number}|null}}
     */
    function analisarResultados(resultados, material) {
        const t = tipoDoMaterial(material);
        const convertidos = [];
        let descartados = 0;
        (resultados || []).forEach(r => {
            const preco = Number(r.preco);
            if (!isFinite(preco) || preco <= 0 || (r.moeda && r.moeda !== 'BRL')) { descartados++; return; }
            let metros = null, precoUnitario = preco;
            if (t.porMetro) {
                metros = metrosNoTitulo(r.titulo);
                if (!metros) {
                    if (t.metros) { descartados++; return; } // rolo sem comprimento: não dá para converter
                    metros = 1;                              // vendido por metro
                }
                precoUnitario = preco / metros;
            }
            convertidos.push({ titulo: r.titulo, preco, metros, precoUnitario, link: r.link || '' });
        });
        if (!convertidos.length) return { itens: [], descartados, estatisticas: null };

        // fora da curva: menos de 1/3 ou mais de 3× a mediana (kits, peças avulsas, acessórios)
        const med = mediana(convertidos.map(c => c.precoUnitario));
        convertidos.forEach(c => { c.foraDaCurva = c.precoUnitario < med / 3 || c.precoUnitario > med * 3; });
        const validos = convertidos.filter(c => !c.foraDaCurva).map(c => c.precoUnitario);
        const arred = v => Math.round(v * 100) / 100;
        return {
            itens: convertidos,
            descartados: descartados + convertidos.filter(c => c.foraDaCurva).length,
            estatisticas: {
                n: validos.length,
                min: arred(Math.min(...validos)),
                mediana: arred(mediana(validos)),
                max: arred(Math.max(...validos))
            }
        };
    }

    /** Agrupa o quantitativo nos itens que têm preço próprio (um por bitola/DN/item). */
    function agruparMateriais(materiais) {
        const grupos = new Map();
        (materiais || []).forEach(m => {
            const chave = chaveGrupo(m);
            if (!grupos.has(chave)) {
                grupos.set(chave, {
                    chave, nome: nomeGrupo(m), consulta: montarConsulta(m), tipo: tipoDoMaterial(m).tipo,
                    unidade: m.unidade, precoAtual: Number(m.precoUnit) || 0, quantidade: 0, materiais: []
                });
            }
            const g = grupos.get(chave);
            g.quantidade += Number(m.qtdTotal) || 0;
            g.materiais.push(m);
        });
        return [...grupos.values()];
    }

    return Object.freeze({
        LOJAS, secaoDoCabo, dnDoEletroduto, tipoDoMaterial, chaveGrupo, nomeGrupo,
        montarConsulta, linksDeBusca, metrosNoTitulo, mediana, analisarResultados, agruparMateriais
    });
});

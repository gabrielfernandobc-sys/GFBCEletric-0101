/* =============================================================================
   PRO-ELÉTRICA CAD — AUTOMAÇÃO RESIDENCIAL (cálculo puro, sem DOM)
   -----------------------------------------------------------------------------
   Regras testáveis no Node para o projeto de automação feito a partir dos dados
   que o projeto elétrico já tem (cômodos, pavimentos, pontos e circuitos):

     • catálogo de tecnologias (Wi-Fi, Zigbee, Z-Wave, Thread/Matter, Bluetooth
       Mesh, KNX, RS-485/Modbus e relés cabeados) com os critérios de comparação;
     • levantamento dos dispositivos por cômodo em três níveis;
     • pontuação ponderada das tecnologias pelas prioridades do usuário;
     • estimativa de alcance (perda por distância + paredes + lajes), malha,
       posição sugerida do hub e dos repetidores e mapa de calor;
     • painel de automação (fontes, atuadores, entradas, proteção, caixa);
     • nobreak (opcional), lista de materiais, cenas e memorial.

   Os valores de rádio, preço e largura em módulos são típicos de mercado
   (nov/2026) e servem para estimativa: confirme no catálogo do fabricante, na
   pesquisa de preços e, para o alcance, com medição no local.

   Uso no navegador: window.Automacao     Uso no Node: require('./js/automacao.js')
   ============================================================================= */
(function (raiz, fabrica) {
    'use strict';
    const modulo = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = modulo;
    else raiz.Automacao = modulo;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const DATA_REFERENCIA = 'nov/2026';
    const arred = (v, c) => { const f = Math.pow(10, c === undefined ? 2 : c); return Math.round(v * f) / f; };
    const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
    const minusculaInicial = s => String(s || '').charAt(0).toLowerCase() + String(s || '').slice(1);
    const semAcento = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    // =========================================================================
    // 1. TECNOLOGIAS
    // =========================================================================
    // ecossistemas: 'sim' (nativo), 'ponte' (via hub, ponte ou Home Assistant), 'nao'
    // notas 0–10 por critério (quanto maior, melhor) — base da pontuação ponderada
    const TECNOLOGIAS = Object.freeze([
        {
            id: 'wifi', nome: 'Wi-Fi (2,4 GHz)', nomeCurto: 'Wi-Fi', tipo: 'sem_fio', freqMHz: 2440,
            radio: { txDbm: 17, txHubDbm: 20, sensDbm: -82, saltosMax: 2, malha: false },
            alcance: '15 a 30 m em ambiente interno, a partir do roteador ou de cada ponto do sistema mesh',
            consumo: 'Alto: próprio para aparelhos ligados na rede elétrica; sensores a bateria duram meses',
            malha: 'Não (estrela). Um roteador Wi-Fi mesh amplia a cobertura',
            hub: 'Não precisa: usa o roteador da casa',
            semInternet: 'Parcial: a maioria depende da nuvem do fabricante; com firmware local ou Home Assistant funciona sem internet',
            custoPonto: 'R$ 60 a 150 por ponto',
            ecossistemas: { alexa: 'sim', google: 'sim', apple: 'ponte', homeassistant: 'sim', smartthings: 'sim' },
            limite: 'Roteadores domésticos começam a falhar entre 30 e 50 aparelhos conectados.',
            obsBrasil: 'Compre só aparelhos com selo da Anatel. Em prédios a faixa de 2,4 GHz costuma estar congestionada.',
            notas: { custo: 10, offline: 4, quantidade: 4, area: 6, paredes: 5, pavimentos: 6 },
            multiplicadorPreco: 1.0
        },
        {
            id: 'zigbee', nome: 'Zigbee 3.0', nomeCurto: 'Zigbee', tipo: 'sem_fio', freqMHz: 2440,
            radio: { txDbm: 8, txHubDbm: 10, sensDbm: -95, saltosMax: 6, malha: true },
            alcance: '10 a 20 m por salto em ambiente interno; a malha estende a cobertura',
            consumo: 'Muito baixo: sensores ficam 1 a 2 anos com uma bateria',
            malha: 'Sim: aparelhos ligados na rede elétrica repetem o sinal',
            hub: 'Sim: coordenador Zigbee (hub, alto-falante com Zigbee ou adaptador USB no Home Assistant)',
            semInternet: 'Sim com hub local (Home Assistant/Zigbee2MQTT); parcial em hubs que dependem da nuvem',
            custoPonto: 'R$ 70 a 160 por ponto (+ hub)',
            ecossistemas: { alexa: 'sim', google: 'ponte', apple: 'ponte', homeassistant: 'sim', smartthings: 'sim' },
            limite: 'Centenas de aparelhos por rede (na prática, 50 a 200 com bons roteadores).',
            obsBrasil: 'Usa a mesma faixa de 2,4 GHz do Wi-Fi: escolha os canais Zigbee 15, 20 ou 25 para conviver com o Wi-Fi. Exige homologação da Anatel.',
            notas: { custo: 8, offline: 8, quantidade: 9, area: 7, paredes: 6, pavimentos: 6 },
            multiplicadorPreco: 1.1
        },
        {
            id: 'zwave', nome: 'Z-Wave (sub-GHz)', nomeCurto: 'Z-Wave', tipo: 'sem_fio', freqMHz: 921.42,
            radio: { txDbm: 4, txHubDbm: 4, sensDbm: -100, saltosMax: 4, malha: true },
            alcance: '20 a 40 m em ambiente interno: a frequência abaixo de 1 GHz atravessa melhor as paredes',
            consumo: 'Muito baixo: sensores ficam anos com uma bateria',
            malha: 'Sim, até 4 saltos (Z-Wave Long Range usa estrela de longo alcance)',
            hub: 'Sim: controlador Z-Wave da região correta',
            semInternet: 'Sim: o controle é local no controlador',
            custoPonto: 'R$ 250 a 450 por ponto (oferta pequena no Brasil)',
            ecossistemas: { alexa: 'ponte', google: 'ponte', apple: 'ponte', homeassistant: 'sim', smartthings: 'sim' },
            limite: 'Até 232 aparelhos por rede.',
            obsBrasil: 'No Brasil o Z-Wave usa 921,42 MHz (mesma região da Austrália e Nova Zelândia). Aparelhos das versões dos EUA (908 MHz) ou da Europa (868 MHz) não conversam com controlador brasileiro e não são homologados aqui. Exige homologação da Anatel.',
            notas: { custo: 5, offline: 9, quantidade: 8, area: 8, paredes: 9, pavimentos: 8 },
            multiplicadorPreco: 2.2
        },
        {
            id: 'thread', nome: 'Thread / Matter', nomeCurto: 'Thread/Matter', tipo: 'sem_fio', freqMHz: 2440,
            radio: { txDbm: 8, txHubDbm: 8, sensDbm: -95, saltosMax: 6, malha: true },
            alcance: '10 a 20 m por salto em ambiente interno; a malha estende a cobertura',
            consumo: 'Muito baixo: sensores ficam 1 a 2 anos com uma bateria',
            malha: 'Sim (rede IPv6 em malha)',
            hub: 'Precisa de um roteador de borda Thread (alguns alto-falantes, centrais e TVs já trazem)',
            semInternet: 'Sim: o Matter funciona na rede local por padrão',
            custoPonto: 'R$ 120 a 250 por ponto',
            ecossistemas: { alexa: 'sim', google: 'sim', apple: 'sim', homeassistant: 'sim', smartthings: 'sim' },
            limite: 'Centenas de aparelhos; vários roteadores de borda podem trabalhar juntos.',
            obsBrasil: 'Padrão mais novo, com oferta crescendo no Brasil. Exige homologação da Anatel. Mesma faixa de 2,4 GHz do Wi-Fi.',
            notas: { custo: 6, offline: 9, quantidade: 9, area: 7, paredes: 6, pavimentos: 6 },
            multiplicadorPreco: 1.5
        },
        {
            id: 'blemesh', nome: 'Bluetooth Mesh', nomeCurto: 'Bluetooth Mesh', tipo: 'sem_fio', freqMHz: 2440,
            radio: { txDbm: 4, txHubDbm: 4, sensDbm: -92, saltosMax: 6, malha: true },
            alcance: '10 a 15 m por salto em ambiente interno',
            consumo: 'Baixo',
            malha: 'Sim (retransmissão em malha)',
            hub: 'Opcional: gateway só para acesso remoto e integração',
            semInternet: 'Sim pelo celular perto da casa; acesso remoto depende do gateway',
            custoPonto: 'R$ 50 a 120 por ponto',
            ecossistemas: { alexa: 'ponte', google: 'ponte', apple: 'nao', homeassistant: 'ponte', smartthings: 'nao' },
            limite: 'Bom para iluminação; poucos sensores e fechaduras no mercado.',
            obsBrasil: 'Mais comum em lâmpadas e fitas de LED. Exige homologação da Anatel.',
            notas: { custo: 9, offline: 6, quantidade: 6, area: 5, paredes: 4, pavimentos: 3 },
            multiplicadorPreco: 1.0
        },
        {
            id: 'knx', nome: 'KNX cabeado (par trançado)', nomeCurto: 'KNX', tipo: 'cabeado', freqMHz: 0,
            alcance: 'Barramento de até 1.000 m por linha (até 350 m da fonte a um aparelho e 700 m entre aparelhos)',
            consumo: 'Baixo: cada aparelho consome cerca de 5 a 10 mA do barramento de 30 Vcc',
            malha: 'Não: topologia livre em árvore (sem anel); linhas unidas por acopladores',
            hub: 'Não: é descentralizado. Interface IP para programar e para o aplicativo',
            semInternet: 'Sim: tudo funciona localmente, mesmo sem rede de dados',
            custoPonto: 'R$ 600 a 1.500 por ponto instalado',
            ecossistemas: { alexa: 'ponte', google: 'ponte', apple: 'ponte', homeassistant: 'sim', smartthings: 'ponte' },
            limite: 'Até 64 aparelhos por linha com fonte de 640 mA; mais linhas com acopladores.',
            obsBrasil: 'Norma ISO/IEC 14543-3. Programação no software ETS (licença paga) por integrador capacitado. Cabeado: não depende de homologação de rádio da Anatel.',
            notas: { custo: 1, offline: 10, quantidade: 10, area: 10, paredes: 10, pavimentos: 10 },
            multiplicadorPreco: 1.0
        },
        {
            id: 'rs485', nome: 'RS-485 / Modbus', nomeCurto: 'RS-485', tipo: 'cabeado', freqMHz: 0,
            alcance: 'Barramento de até 1.200 m em par trançado com terminação de 120 Ω',
            consumo: 'Baixo (módulos alimentados em 24 Vcc)',
            malha: 'Não: barramento linear (um aparelho após o outro)',
            hub: 'Sim: controlador mestre (central de automação ou CLP)',
            semInternet: 'Sim: o controlador comanda tudo localmente',
            custoPonto: 'R$ 200 a 400 por ponto',
            ecossistemas: { alexa: 'ponte', google: 'ponte', apple: 'ponte', homeassistant: 'sim', smartthings: 'ponte' },
            limite: 'Até 32 aparelhos por segmento (mais com repetidores); até 247 endereços Modbus.',
            obsBrasil: 'Muitas centrais nacionais de automação usam RS-485. Cabeado: não depende de homologação de rádio.',
            notas: { custo: 4, offline: 10, quantidade: 8, area: 10, paredes: 10, pavimentos: 10 },
            multiplicadorPreco: 1.0
        },
        {
            id: 'reles', nome: 'Relés cabeados (central/CLP)', nomeCurto: 'Relés cabeados', tipo: 'cabeado', freqMHz: 0,
            alcance: 'Cada ponto ligado por cabo até a central (estrela); limitado pela queda de tensão do comando em 24 Vcc',
            consumo: 'Baixo',
            malha: 'Não: fiação em estrela até a central',
            hub: 'Sim: central de relés ou CLP',
            semInternet: 'Sim',
            custoPonto: 'R$ 150 a 350 por ponto',
            ecossistemas: { alexa: 'ponte', google: 'ponte', apple: 'ponte', homeassistant: 'sim', smartthings: 'ponte' },
            limite: 'Limitado pelo número de entradas e saídas da central (expansível por módulos).',
            obsBrasil: 'Solução robusta e conhecida pelos eletricistas, mas leva um cabo de cada ponto até o quadro (mais eletroduto e cabo).',
            notas: { custo: 5, offline: 10, quantidade: 6, area: 9, paredes: 10, pavimentos: 9 },
            multiplicadorPreco: 1.0
        }
    ]);

    const ECOSSISTEMAS = Object.freeze({
        nenhum: 'Nenhum ainda', alexa: 'Amazon Alexa', google: 'Google Home', apple: 'Apple Home',
        homeassistant: 'Home Assistant', smartthings: 'SmartThings'
    });
    const VALOR_COMPAT = { sim: 10, ponte: 5, nao: 0 };
    const ROTULO_COMPAT = { sim: 'Sim', ponte: 'Via ponte/hub', nao: 'Não' };

    const CRITERIOS = Object.freeze({
        custo: 'Custo', offline: 'Funcionar sem internet', quantidade: 'Quantidade de dispositivos',
        area: 'Área', paredes: 'Paredes', pavimentos: 'Pavimentos', ecossistema: 'Ecossistema que já existe'
    });

    function tecnologia(id) { return TECNOLOGIAS.find(t => t.id === id) || null; }
    const ehCabeada = tec => !!tec && tec.tipo === 'cabeado';

    // =========================================================================
    // 2. DISPOSITIVOS E LEVANTAMENTO POR CÔMODO
    // =========================================================================
    // alimentacao: 'rede' | 'bateria' | 'ip' (rede de dados: câmera, vídeo-porteiro)
    // roteador: repete o sinal na malha (aparelhos ligados na rede elétrica)
    // cabeado: como o mesmo item fica num sistema cabeado (canal no painel, aparelho de barramento, entrada)
    const TIPOS = Object.freeze({
        modulo_rele:      { nome: 'Módulo relé inteligente (atrás do interruptor)', grupo: 'iluminacao', icone: 'fa-toggle-on', alimentacao: 'rede', roteador: true,  neutro: true,  consumoW: 0.5, preco: 75,  cabeado: { pulsador: true, canal: '10A' } },
        interruptor:      { nome: 'Interruptor inteligente touch (com neutro)',   grupo: 'iluminacao', icone: 'fa-toggle-on', alimentacao: 'rede', roteador: true,  neutro: true,  consumoW: 0.6, preco: 140, cabeado: { pulsador: true, canal: '10A' } },
        dimmer:           { nome: 'Dimmer inteligente',                           grupo: 'iluminacao', icone: 'fa-sliders',   alimentacao: 'rede', roteador: true,  neutro: true,  consumoW: 0.6, preco: 170, cabeado: { pulsador: true, canal: 'dimmer' } },
        tomada:           { nome: 'Tomada inteligente com medição',               grupo: 'tomadas',    icone: 'fa-plug',      alimentacao: 'rede', roteador: true,  neutro: false, consumoW: 0.6, preco: 110, cabeado: { canal: '16A' } },
        controle_ir:      { nome: 'Controle infravermelho (ar-condicionado/TV)',  grupo: 'clima',      icone: 'fa-snowflake', alimentacao: 'rede', roteador: false, neutro: false, consumoW: 1.0, preco: 95,  cabeado: { barramento: 'Interface para ar-condicionado (IR)', consumoBusMa: 10, preco: 1500 } },
        rele_potencia:    { nome: 'Relé de potência inteligente com medição',     grupo: 'cargas',     icone: 'fa-bolt',      alimentacao: 'rede', roteador: true,  neutro: true,  consumoW: 0.8, preco: 130, cabeado: { canal: '16A' } },
        sensor_presenca:  { nome: 'Sensor de presença',                           grupo: 'sensores',   icone: 'fa-person-walking', alimentacao: 'bateria', roteador: false, consumoW: 0, preco: 120, cabeado: { barramento: 'Detector de presença de teto', consumoBusMa: 10, preco: 1100, alternativo: { entrada: true, consumo24vW: 0.5 } } },
        sensor_abertura:  { nome: 'Sensor de abertura (porta/janela)',            grupo: 'sensores',   icone: 'fa-door-open', alimentacao: 'bateria', roteador: false, consumoW: 0, preco: 60,  cabeado: { entrada: true } },
        sensor_fumaca:    { nome: 'Detector de fumaça',                           grupo: 'seguranca',  icone: 'fa-fire',      alimentacao: 'bateria', roteador: false, consumoW: 0, preco: 160, cabeado: { entrada: true, consumo24vW: 1.2 } },
        sensor_gas:       { nome: 'Detector de gás (GLP/GN)',                     grupo: 'seguranca',  icone: 'fa-fire-flame-simple', alimentacao: 'rede', roteador: false, consumoW: 1.5, preco: 190, cabeado: { entrada: true, consumo24vW: 2.5 } },
        sensor_vazamento: { nome: 'Sensor de vazamento de água',                  grupo: 'seguranca',  icone: 'fa-droplet',   alimentacao: 'bateria', roteador: false, consumoW: 0, preco: 80,  cabeado: { entrada: true } },
        fechadura:        { nome: 'Fechadura digital integrada',                  grupo: 'acesso',     icone: 'fa-lock',      alimentacao: 'bateria', roteador: false, consumoW: 0, preco: 1200, cabeado: { semFio: true } },
        camera:           { nome: 'Câmera IP (Wi-Fi/PoE)',                        grupo: 'acesso',     icone: 'fa-video',     alimentacao: 'ip',      roteador: false, consumoW: 5, preco: 350, cabeado: { ip: true } },
        videoporteiro:    { nome: 'Vídeo-porteiro / campainha IP',                grupo: 'acesso',     icone: 'fa-bell',      alimentacao: 'ip',      roteador: false, consumoW: 4, preco: 450, cabeado: { ip: true } },
        cortina:          { nome: 'Motor de cortina/persiana',                    grupo: 'conforto',   icone: 'fa-bars-staggered', alimentacao: 'rede', roteador: true, neutro: false, consumoW: 0.8, preco: 650, cabeado: { canal: 'persiana' } },
        modulo_portao:    { nome: 'Módulo para motor de portão (contato seco)',   grupo: 'acesso',     icone: 'fa-warehouse', alimentacao: 'rede', roteador: false, neutro: false, consumoW: 0.6, preco: 95,  cabeado: { canal: '10A' } },
        sirene:           { nome: 'Sirene de alarme',                             grupo: 'seguranca',  icone: 'fa-volume-high', alimentacao: 'rede', roteador: false, neutro: false, consumoW: 1, preco: 200, cabeado: { canal: '10A' } }
    });

    const NIVEIS = Object.freeze({ basico: 'Básico', intermediario: 'Intermediário', completo: 'Completo' });
    const ordemNivel = n => ({ basico: 1, intermediario: 2, completo: 3 })[n] || 2;

    /** Perfil de uso do cômodo pelo nome. */
    function perfilAmbiente(nome) {
        const n = semAcento(nome);
        if (/lavabo/.test(n)) return 'lavabo';
        if (/banh|\bwc\b|sanit/.test(n)) return 'banheiro';
        if (/cozinha|copa/.test(n)) return 'cozinha';
        if (/gourmet|churrasq/.test(n)) return 'gourmet';
        if (/lavand|servico|\ba\.?\s*s\.?$/.test(n)) return 'servico';
        if (/home ?theater|cinema/.test(n)) return 'cinema';
        if (/escrit|office|estud|bibliot/.test(n)) return 'escritorio';
        if (/quarto|dormit|suite/.test(n)) return 'dormitorio';
        if (/jantar/.test(n)) return 'jantar';
        if (/sala|estar|living|tv/.test(n)) return 'sala';
        if (/varanda|sacada|terra[cç]o|alpendre/.test(n)) return 'varanda';
        if (/garag|abrigo|estacion/.test(n)) return 'garagem';
        if (/hall|entrada|circul|corredor|escada/.test(n)) return 'circulacao';
        if (/piscina|jardim|quintal|extern/.test(n)) return 'externo';
        if (/closet/.test(n)) return 'closet';
        if (/despensa|deposito/.test(n)) return 'despensa';
        return 'outro';
    }

    const ehArCondicionado = n => /ar[\s-]*condicionado|split|\bbtu\b/i.test(n || '');
    const ehCortinaTue = n => /cortina|persiana/i.test(n || '');
    const ehPortao = n => /port[aã]o/i.test(n || '');
    // cargas que não se desligam por automação (segurança ou conservação de alimentos)
    const ehCargaNaoComandada = n => /cooktop|fog[aã]o|forno|micro|lava[-\s]?lou|geladeira|refrigerador|freezer|adega|cervejeira|chopeira|elevador|plataforma|nobreak|workstation|rack|ice maker|gelo/i.test(n || '');
    const ehAquecimentoOuMotor = n => /chuveiro|torneira|ducha|aquecedor|boiler|sauna|piso aquecido|toalheiro|bomba|piscina|cascata|irriga|pressurizador|hidromassagem|banheira|jacuzzi|carregador|wallbox|lareira/i.test(n || '');

    /** Contator modular para a corrente da carga (categoria AC-1) e sua largura em módulos DIN. */
    function contatorPara(ib) {
        const tabela = [{ a: 20, mod: 1 }, { a: 25, mod: 1 }, { a: 40, mod: 2 }, { a: 63, mod: 3 }];
        const req = Number(ib) * 1.1;            // corrente AC-1 com folga sobre a corrente da carga
        return tabela.find(t => t.a >= req) || tabela[tabela.length - 1];
    }

    /**
     * Levantamento automático dos dispositivos.
     * @param {Object} p
     * @param {Array} p.comodos     {id, nome, x, y, largura, comprimento, pavimentoId} (x/y em px, medidas em m)
     * @param {Array} p.pontos      pontos elétricos {id, tipo, nome, destino, pot, tensao, x, y, comodoId, pavimentoId}
     * @param {Array} [p.pavimentos] {id, nivel}
     * @param {number} p.escala     px por metro
     * @param {string} p.nivel      'basico' | 'intermediario' | 'completo'
     * @returns {Array<{id, tipo, comodoId, pavimentoId, x, y, origemPontoId, detalhe, ib?}>} posições em px
     */
    function levantarDispositivos(p) {
        const nivel = ordemNivel(p.nivel);
        const esc = Number(p.escala) || 40;
        const comodos = p.comodos || [];
        const pontos = p.pontos || [];
        const pavs = p.pavimentos || [];
        const nivelPav = id => { const pv = pavs.find(x => x.id === id); return pv ? Number(pv.nivel) || 0 : 0; };
        const lista = [];
        const add = (tipo, c, x, y, extra) => lista.push(Object.assign({
            id: `${tipo}:${(extra && extra.origemPontoId) || c.id + ':' + lista.filter(d => d.tipo === tipo && d.comodoId === c.id).length}`,
            tipo, comodoId: c.id, pavimentoId: c.pavimentoId || 'terreo', x: arred(x, 1), y: arred(y, 1), origemPontoId: null, detalhe: ''
        }, extra || {}));

        // porta de entrada: sala/hall do pavimento mais baixo (ou o primeiro cômodo dele)
        const menorNivel = comodos.length ? Math.min(...comodos.map(c => nivelPav(c.pavimentoId || 'terreo'))) : 0;
        const doTerreo = comodos.filter(c => nivelPav(c.pavimentoId || 'terreo') === menorNivel);
        const entrada = doTerreo.find(c => /hall|entrada/.test(semAcento(c.nome))) || doTerreo.find(c => perfilAmbiente(c.nome) === 'sala') || doTerreo[0];
        const garagem = comodos.find(c => perfilAmbiente(c.nome) === 'garagem');

        comodos.forEach(c => {
            const perfil = perfilAmbiente(c.nome);
            const w = (Number(c.largura) || 3) * esc, h = (Number(c.comprimento) || 3) * esc;
            const m = Math.min(0.35 * esc, w / 4, h / 4);
            const pts = pontos.filter(pt => pt.comodoId === c.id);
            const social = ['sala', 'jantar', 'cozinha', 'gourmet', 'cinema', 'escritorio', 'dormitorio'].includes(perfil);
            const dimeriza = ['sala', 'jantar', 'cinema', 'dormitorio'].includes(perfil);

            // ILUMINAÇÃO: cada interruptor vira módulo, interruptor touch ou dimmer
            const interr = pts.filter(pt => pt.tipo === 'INTERRUPTOR');
            const tipoLuz = () => {
                if (nivel >= 3) return dimeriza ? 'dimmer' : 'interruptor';
                if (nivel === 2) return social ? 'interruptor' : 'modulo_rele';
                return 'modulo_rele';
            };
            if (interr.length) {
                interr.forEach(pt => add(tipoLuz(), c, pt.x, pt.y, { origemPontoId: pt.id, detalhe: `Comando da luz — ${pt.nome || 'interruptor'}` }));
            } else if (pts.some(pt => pt.tipo === 'ILUM') || nivel >= 1) {
                // todo cômodo tem ao menos um comando de luz (mesmo sem ponto lançado)
                add(tipoLuz(), c, c.x + m, c.y + h - m, { detalhe: 'Comando da luz (junto à porta)' });
            }

            // TOMADAS: pela destinação (TV, cafeteira, ferro...) ou todas no nível completo
            pts.filter(pt => pt.tipo === 'TUG').forEach((pt, i) => {
                const d = semAcento(pt.destino || pt.nome);
                if (/geladeira|freezer|frigobar|cervejeira|adega|roteador|modem|filtro|purificador|depurador|coifa|exaustor/.test(d)) return;
                const interessa = /tv|rack|cafeteira|ferro|aquario|cabeceira – lado esquerdo|cabeceira - lado esquerdo|aquecedor|abajur/.test(d) ||
                    (!pt.destino && perfil === 'sala' && i === 0);
                if (nivel >= 3 || (nivel === 2 && interessa)) {
                    add('tomada', c, pt.x, pt.y, { origemPontoId: pt.id, detalhe: pt.destino ? `Tomada — ${pt.destino}` : (pt.nome || 'Tomada') });
                }
            });

            // TUE: ar-condicionado → IR; aquecimento e motores → relé de potência; cortina e portão
            pts.filter(pt => pt.tipo === 'TUE').forEach(pt => {
                const nome = pt.nome || '';
                const tensao = Number(pt.tensao) || 220;
                const ib = (Number(pt.pot) || 0) / tensao;
                if (ehArCondicionado(nome)) {
                    add('controle_ir', c, pt.x, pt.y, { origemPontoId: pt.id, detalhe: nome });
                } else if (ehCortinaTue(nome)) {
                    if (nivel >= 2) add('cortina', c, pt.x, pt.y, { origemPontoId: pt.id, detalhe: nome });
                } else if (ehPortao(nome)) {
                    if (nivel >= 2) add('modulo_portao', c, pt.x, pt.y, { origemPontoId: pt.id, detalhe: nome });
                } else if (ehCargaNaoComandada(nome)) {
                    // sem comando remoto (segurança)
                } else if (nivel >= 3 || (nivel === 2 && ehAquecimentoOuMotor(nome))) {
                    add('rele_potencia', c, pt.x, pt.y, { origemPontoId: pt.id, detalhe: nome, ib: arred(ib, 1), tensao });
                }
            });

            // SENSORES E SEGURANÇA conforme o tipo de cômodo
            const cx = c.x + w / 2, cy = c.y + h / 2;
            const presenca = (nivel >= 1 && perfil === 'circulacao') ||
                (nivel >= 2 && ['banheiro', 'lavabo', 'garagem', 'cozinha', 'servico', 'closet', 'despensa'].includes(perfil)) ||
                (nivel >= 3 && !['dormitorio'].includes(perfil));
            if (presenca) add('sensor_presenca', c, c.x + w - m, c.y + m, { detalhe: perfil === 'circulacao' ? 'Liga a luz ao passar' : 'Luz automática / alarme' });
            const ehEntrada = entrada && c.id === entrada.id;
            if ((nivel >= 2 && (ehEntrada || perfil === 'garagem')) || (nivel >= 3 && ['sala', 'dormitorio', 'cozinha', 'servico', 'escritorio', 'jantar', 'varanda'].includes(perfil))) {
                add('sensor_abertura', c, cx, c.y + h - m / 2, { detalhe: ehEntrada ? 'Porta de entrada' : (perfil === 'garagem' ? 'Portão / porta da garagem' : 'Janela') });
            }
            if (['cozinha', 'gourmet'].includes(perfil) && nivel >= 2) add('sensor_fumaca', c, cx + m, cy, { detalhe: 'Detector de fumaça no teto' });
            if (nivel >= 3 && ['dormitorio', 'circulacao', 'sala'].includes(perfil)) add('sensor_fumaca', c, cx + m, cy, { detalhe: 'Detector de fumaça no teto' });
            if ((nivel >= 1 && perfil === 'cozinha') || (nivel >= 3 && ['gourmet', 'servico'].includes(perfil))) add('sensor_gas', c, c.x + m, c.y + m, { detalhe: 'Junto ao fogão / aquecedor a gás (a 30 cm do piso para GLP)' });
            if ((nivel >= 2 && perfil === 'servico') || (nivel >= 3 && ['banheiro', 'cozinha', 'lavabo'].includes(perfil))) add('sensor_vazamento', c, c.x + w - m, c.y + h - m, { detalhe: perfil === 'servico' ? 'Atrás da máquina de lavar' : 'Sob a pia / junto ao vaso' });
            if (ehEntrada && nivel >= 2) add('fechadura', c, cx, c.y + h - m / 3, { detalhe: 'Porta de entrada' });
            if (nivel >= 3 && perfil === 'garagem') add('fechadura', c, cx, c.y + m / 3, { detalhe: 'Porta da garagem para dentro de casa' });
            if (ehEntrada && nivel >= 2) add('videoporteiro', c, cx - m, c.y + h - m / 3, { detalhe: 'Campainha com vídeo na entrada' });
            if (nivel >= 2 && (ehEntrada || perfil === 'garagem') && !(garagem && ehEntrada && nivel < 3)) add('camera', c, c.x + m / 2, c.y + m / 2, { detalhe: perfil === 'garagem' ? 'Câmera da garagem' : 'Câmera da entrada' });
            if (nivel >= 3 && ['varanda', 'externo'].includes(perfil)) add('camera', c, c.x + m / 2, c.y + m / 2, { detalhe: 'Câmera externa' });
            if (nivel >= 3 && ['sala', 'dormitorio', 'cinema'].includes(perfil) && !lista.some(d => d.tipo === 'cortina' && d.comodoId === c.id)) add('cortina', c, cx, c.y + m / 2, { detalhe: 'Cortina da janela' });
            if (nivel >= 3 && ehEntrada) add('sirene', c, cx, c.y + m, { detalhe: 'Alarme' });
        });
        return lista;
    }

    /** Resumo por cômodo: { comodoId: { tipo: qtd } }. */
    function resumoPorComodo(dispositivos) {
        const r = {};
        (dispositivos || []).forEach(d => {
            r[d.comodoId] = r[d.comodoId] || {};
            r[d.comodoId][d.tipo] = (r[d.comodoId][d.tipo] || 0) + 1;
        });
        return r;
    }

    // =========================================================================
    // 3. PONTUAÇÃO DAS TECNOLOGIAS
    // =========================================================================
    /** Prioridades sugeridas (0 a 5) a partir do projeto. */
    function prioridadesAutomaticas(ctx) {
        const c = ctx || {};
        return {
            custo: 3,
            offline: 3,
            quantidade: limitar(Math.round((Number(c.qtdDispositivos) || 0) / 12), 1, 5),
            area: limitar(Math.round((Number(c.areaM2) || 0) / 50), 1, 5),
            paredes: limitar(Math.round((Number(c.paredesMedias) || 0) * 1.5), 1, 5),
            pavimentos: limitar(((Number(c.numPavimentos) || 1) - 1) * 2 + 1, 1, 5),
            ecossistema: (c.ecossistema && c.ecossistema !== 'nenhum') ? 4 : 1
        };
    }

    function notaEcossistema(tec, eco) {
        if (!eco || eco === 'nenhum') {
            const vals = Object.values(tec.ecossistemas).map(v => VALOR_COMPAT[v] || 0);
            return vals.reduce((s, v) => s + v, 0) / vals.length;
        }
        return VALOR_COMPAT[tec.ecossistemas[eco]] || 0;
    }

    /**
     * Dificuldade do projeto (0 a 1) em cada critério de cobertura: numa casa pequena, térrea e com
     * poucos aparelhos qualquer tecnologia atende, e a nota de alcance não deve dar vantagem.
     * Sem o dado do projeto, vale a dificuldade máxima (nota do catálogo).
     */
    function dificuldades(ctx) {
        const c = ctx || {};
        const d = (v, base, faixa) => (v === undefined || v === null || !isFinite(Number(v))) ? 1 : limitar((Number(v) - base) / faixa, 0, 1);
        return {
            quantidade: d(c.qtdDispositivos, 10, 50),
            area: d(c.areaM2, 60, 240),
            paredes: d(c.paredesMedias, 1, 3),
            pavimentos: d(c.numPavimentos, 1, 2)
        };
    }

    /**
     * Pontuação 0–100 de cada tecnologia (média ponderada das notas pelas prioridades).
     * @param {Object} prioridades {custo, offline, quantidade, area, paredes, pavimentos, ecossistema} (0–5)
     * @param {Object} ctx {ecossistema, qtdDispositivos, areaM2, numPavimentos, paredesMedias}
     * @returns {Array<{id, nome, pontuacao, contribuicoes, justificativa: string[], alertas: string[]}>} da melhor para a pior
     */
    function pontuarTecnologias(prioridades, ctx) {
        const pr = Object.assign({ custo: 3, offline: 3, quantidade: 3, area: 3, paredes: 3, pavimentos: 3, ecossistema: 3 }, prioridades || {});
        const c = ctx || {};
        const somaPesos = Object.keys(CRITERIOS).reduce((s, k) => s + Math.max(0, Number(pr[k]) || 0), 0) || 1;
        const dif = dificuldades(c);
        const res = TECNOLOGIAS.map(t => {
            const notas = Object.assign({}, t.notas, { ecossistema: notaEcossistema(t, c.ecossistema) });
            Object.keys(dif).forEach(k => { notas[k] = 10 - (10 - t.notas[k]) * dif[k]; });
            const contribuicoes = Object.keys(CRITERIOS).map(k => ({
                criterio: k, nome: CRITERIOS[k], peso: Math.max(0, Number(pr[k]) || 0), nota: arred(notas[k], 1),
                pontos: Math.max(0, Number(pr[k]) || 0) * notas[k]
            }));
            const pontuacao = arred(contribuicoes.reduce((s, x) => s + x.pontos, 0) / (somaPesos * 10) * 100, 0);
            const alertas = [];
            if (t.id === 'wifi' && (Number(c.qtdDispositivos) || 0) > 35) alertas.push(`${c.qtdDispositivos} aparelhos Wi-Fi exigem roteador robusto (ou mesh) — o limite prático dos domésticos é de 30 a 50 clientes.`);
            if (ehCabeada(t)) alertas.push('Exige cabo de barramento em eletroduto próprio até cada ponto: ideal em obra nova ou reforma completa.');
            if (t.id === 'zwave') alertas.push('Compre a versão de 921,42 MHz (região Brasil/ANZ) e com homologação da Anatel.');
            if (c.ecossistema && c.ecossistema !== 'nenhum' && t.ecossistemas[c.ecossistema] === 'nao') alertas.push(`Não funciona com ${ECOSSISTEMAS[c.ecossistema]}.`);
            return { id: t.id, nome: t.nome, nomeCurto: t.nomeCurto, tipo: t.tipo, pontuacao, contribuicoes, alertas, justificativa: [] };
        }).sort((a, b) => b.pontuacao - a.pontuacao);

        // justificativa por escrito: critérios que mais pesaram e diferença para o próximo
        res.forEach((r, i) => {
            const tops = r.contribuicoes.filter(x => x.peso > 0).sort((a, b) => b.pontos - a.pontos).slice(0, 3);
            const fracos = r.contribuicoes.filter(x => x.peso >= 3 && x.nota <= 5);
            const j = [];
            j.push(`${r.nome}: ${r.pontuacao} pontos de 100 (${i + 1}º lugar).`);
            if (tops.length) j.push('O que mais pesou a favor: ' + tops.map(x => `${x.nome.toLowerCase()} (prioridade ${x.peso}, nota ${String(x.nota).replace('.', ',')}/10)`).join('; ') + '.');
            if (fracos.length) j.push('Pontos fracos para as suas prioridades: ' + fracos.map(x => `${x.nome.toLowerCase()} (nota ${String(x.nota).replace('.', ',')}/10)`).join('; ') + '.');
            if (i === 0 && res[1]) {
                const dif = r.pontuacao - res[1].pontuacao;
                j.push(dif > 0 ? `Ficou ${dif} ponto${dif > 1 ? 's' : ''} à frente de ${res[1].nome}.` : `Empatou com ${res[1].nome}; a ordem segue o catálogo.`);
            }
            const ctxTxt = [];
            if (c.qtdDispositivos) ctxTxt.push(`${c.qtdDispositivos} dispositivos`);
            if (c.areaM2) ctxTxt.push(`${String(arred(c.areaM2, 0))} m²`);
            if (c.numPavimentos) ctxTxt.push(`${c.numPavimentos} pavimento${c.numPavimentos > 1 ? 's' : ''}`);
            if (c.paredesMedias) ctxTxt.push(`média de ${String(arred(c.paredesMedias, 1)).replace('.', ',')} paredes entre o centro da casa e os dispositivos`);
            if (c.ecossistema && c.ecossistema !== 'nenhum') ctxTxt.push(`ecossistema atual: ${ECOSSISTEMAS[c.ecossistema]} (${ROTULO_COMPAT[tecnologia(r.id).ecossistemas[c.ecossistema]].toLowerCase()})`);
            if (ctxTxt.length) j.push('Projeto considerado: ' + ctxTxt.join(', ') + '.');
            r.justificativa = j;
        });
        return res;
    }

    // =========================================================================
    // 4. ALCANCE (SIMULAÇÃO) — perda por distância + paredes + lajes
    // =========================================================================
    // perda por parede a 2,4 GHz (dB); abaixo de 1 GHz a perda é ~55% disso
    const MATERIAIS_PAREDE = Object.freeze({
        drywall: { nome: 'Drywall (gesso acartonado)', perda24: 3 },
        alvenaria: { nome: 'Alvenaria (tijolo/bloco cerâmico rebocado)', perda24: 8 },
        concreto: { nome: 'Concreto / bloco de concreto', perda24: 15 }
    });
    const PERDA_LAJE_24 = 20;          // laje de concreto (~12 a 15 cm) a 2,4 GHz
    const EXPOENTE_PERDA = 2.2;         // com as paredes somadas à parte
    const MARGEM_DESVANECIMENTO = 10;   // dB de folga sobre a sensibilidade
    const ALTURA_DISPOSITIVO = 1.2;     // m acima do piso

    const fatorFreq = f => (f > 0 && f < 1500 ? 0.55 : 1);
    const perdaParede = (tec, mat) => (MATERIAIS_PAREDE[mat] || MATERIAIS_PAREDE.alvenaria).perda24 * fatorFreq(tec.freqMHz);
    const perdaLaje = (tec, espessura) => PERDA_LAJE_24 * limitar((Number(espessura) || 0.15) / 0.15, 0.7, 1.5) * (tec.freqMHz < 1500 ? 0.6 : 1);
    const perdaEspacoLivre1m = f => 20 * Math.log10(f) - 27.55;

    /**
     * Geometria da planta em metros.
     * @param {Object} p {comodos (px), pavimentos {id, nivel, alturaPeDireito, espessuraLajePiso}, escala}
     */
    function geometriaPlanta(p) {
        const esc = Number(p.escala) || 40;
        const pavs = (p.pavimentos && p.pavimentos.length) ? p.pavimentos : [{ id: 'terreo', nivel: 0 }];
        const ordenados = pavs.slice().sort((a, b) => (Number(a.nivel) || 0) - (Number(b.nivel) || 0));
        const niveis = {};
        let z = 0;
        ordenados.forEach(pv => {
            niveis[pv.id] = { nivel: Number(pv.nivel) || 0, z0: z, pe: Number(pv.alturaPeDireito) || 2.8, laje: Number(pv.espessuraLajePiso) || 0.15 };
            z += (Number(pv.alturaPeDireito) || 2.8) + (Number(pv.espessuraLajePiso) || 0.15);
        });
        const salas = (p.comodos || []).map(c => ({
            id: c.id, pavId: c.pavimentoId || ordenados[0].id,
            x0: c.x / esc, y0: c.y / esc, x1: c.x / esc + (Number(c.largura) || 0), y1: c.y / esc + (Number(c.comprimento) || 0)
        }));
        return { escala: esc, niveis, salas };
    }

    /** Paredes atravessadas pelo segmento a→b (m) num pavimento; paredes coladas contam uma vez. */
    function paredesNoSegmento(geo, pavId, a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const L = Math.hypot(dx, dy);
        if (L < 1e-6) return 0;
        const ts = [];
        geo.salas.forEach(s => {
            if (s.pavId !== pavId) return;
            // bordas verticais x = x0 e x = x1
            [s.x0, s.x1].forEach(xw => {
                if (Math.abs(dx) < 1e-9) return;
                const t = (xw - a.x) / dx;
                if (t <= 1e-6 || t >= 1 - 1e-6) return;
                const y = a.y + t * dy;
                if (y >= Math.min(s.y0, s.y1) - 1e-6 && y <= Math.max(s.y0, s.y1) + 1e-6) ts.push(t);
            });
            [s.y0, s.y1].forEach(yw => {
                if (Math.abs(dy) < 1e-9) return;
                const t = (yw - a.y) / dy;
                if (t <= 1e-6 || t >= 1 - 1e-6) return;
                const x = a.x + t * dx;
                if (x >= Math.min(s.x0, s.x1) - 1e-6 && x <= Math.max(s.x0, s.x1) + 1e-6) ts.push(t);
            });
        });
        ts.sort((p, q) => p - q);
        let n = 0, ultimo = -Infinity;
        ts.forEach(t => { if ((t - ultimo) * L > 0.35) { n++; ultimo = t; } });
        return n;
    }

    /**
     * Perda do enlace entre a e b ({x, y em m; pavId}).
     * @returns {{perdaDb, distM, paredes, lajes}}
     */
    function perdaEnlace(tec, geo, a, b, material) {
        const na = geo.niveis[a.pavId] || { z0: 0, nivel: 0, laje: 0.15 };
        const nb = geo.niveis[b.pavId] || na;
        const za = na.z0 + (a.z !== undefined ? a.z : ALTURA_DISPOSITIVO);
        const zb = nb.z0 + (b.z !== undefined ? b.z : ALTURA_DISPOSITIVO);
        const d = Math.max(0.5, Math.hypot(b.x - a.x, b.y - a.y, zb - za));
        let paredes;
        if (a.pavId === b.pavId) paredes = paredesNoSegmento(geo, a.pavId, a, b);
        else {
            const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            paredes = paredesNoSegmento(geo, a.pavId, a, m) + paredesNoSegmento(geo, b.pavId, m, b);
        }
        // lajes entre os pavimentos (a laje de piso de cada pavimento acima do mais baixo)
        let lajesDb = 0, lajes = 0;
        const [lo, hi] = na.z0 <= nb.z0 ? [na, nb] : [nb, na];
        Object.values(geo.niveis).forEach(nv => {
            if (nv.z0 > lo.z0 && nv.z0 <= hi.z0) { lajes++; lajesDb += perdaLaje(tec, nv.laje); }
        });
        const perdaDb = perdaEspacoLivre1m(tec.freqMHz) + 10 * EXPOENTE_PERDA * Math.log10(d) + paredes * perdaParede(tec, material) + lajesDb;
        return { perdaDb: arred(perdaDb, 1), distM: arred(d, 2), paredes, lajes };
    }

    /** Contexto de simulação com cache das perdas (a simulação compara muitas posições). */
    function criarSimulador(tecId, geo, material) {
        const tec = tecnologia(tecId);
        const cache = new Map();
        const chave = q => `${q.x.toFixed(2)},${q.y.toFixed(2)},${q.pavId}`;
        function perda(a, b) {
            const k1 = chave(a), k2 = chave(b);
            const k = k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1;
            let v = cache.get(k);
            if (!v) { v = perdaEnlace(tec, geo, a, b, material); cache.set(k, v); }
            return v;
        }
        /** Margem (dB) do enlace: potência recebida − (sensibilidade + margem de desvanecimento). */
        function margem(a, b) {
            const r = tec.radio;
            const tx = Math.min(a.hub ? r.txHubDbm : r.txDbm, b.hub ? r.txHubDbm : r.txDbm);
            return arred(tx - perda(a, b).perdaDb - (r.sensDbm + MARGEM_DESVANECIMENTO), 1);
        }
        return { tec, geo, material, perda, margem };
    }

    /**
     * Rede resultante: quem alcança o hub (direto, pelos repetidores ou pela malha).
     * @param {Object} sim criarSimulador(...)
     * @param {{x,y,pavId}} hub
     * @param {Array<{x,y,pavId}>} repetidores
     * @param {Array<{id,x,y,pavId,roteador}>} dispositivos (m)
     * @returns {{aplicavel, porDispositivo: Object, conectados, fora: string[], enlaces: Array, nos: Array}}
     */
    function simularRede(sim, hub, repetidores, dispositivos) {
        const tec = sim.tec;
        if (!tec || ehCabeada(tec)) {
            const pd = {};
            (dispositivos || []).forEach(d => { pd[d.id] = { ok: true, margemDb: null, saltos: 0, pai: 'barramento' }; });
            return { aplicavel: false, porDispositivo: pd, conectados: (dispositivos || []).length, fora: [], enlaces: [], nos: [] };
        }
        const r = tec.radio;
        const H = Object.assign({ id: 'hub', hub: true }, hub);
        const reps = (repetidores || []).map((q, i) => Object.assign({ id: 'rep' + (i + 1), repetidor: true }, q));
        const devs = dispositivos || [];
        // nós que repetem: hub, repetidores e (na malha) os dispositivos ligados na rede elétrica
        const roteadores = reps.concat(r.malha ? devs.filter(d => d.roteador) : []);
        const estado = new Map([[H.id, { saltos: 0, margemDb: null, pai: null, no: H }]]);
        let fronteira = [H];
        const limiteSaltosRoteador = r.malha ? r.saltosMax : 2;
        for (let salto = 1; salto <= limiteSaltosRoteador && fronteira.length; salto++) {
            const proxima = [];
            roteadores.forEach(n => {
                if (estado.has(n.id)) return;
                let melhor = null;
                fronteira.forEach(f => { const m = sim.margem(f, n); if (m >= 0 && (!melhor || m > melhor.m)) melhor = { m, f }; });
                if (melhor) { estado.set(n.id, { saltos: salto, margemDb: melhor.m, pai: melhor.f.id, no: n }); proxima.push(n); }
            });
            fronteira = proxima;
        }
        const conectadosRot = [...estado.values()].map(e => e.no);
        const pd = {};
        const enlaces = [];
        devs.forEach(d => {
            if (estado.has(d.id)) {
                const e = estado.get(d.id);
                pd[d.id] = { ok: true, margemDb: e.margemDb, saltos: e.saltos, pai: e.pai };
                return;
            }
            let melhor = null, melhorNeg = null;
            conectadosRot.forEach(n => {
                const sal = estado.get(n.id).saltos + 1;
                const m = sim.margem(n, d);
                if (m >= 0 && sal <= Math.max(r.saltosMax, 1) + (r.malha ? 0 : 1) && (!melhor || m > melhor.m)) melhor = { m, n, sal };
                if (!melhorNeg || m > melhorNeg.m) melhorNeg = { m, n };
            });
            pd[d.id] = melhor ? { ok: true, margemDb: melhor.m, saltos: melhor.sal, pai: melhor.n.id }
                : { ok: false, margemDb: melhorNeg ? melhorNeg.m : null, saltos: null, pai: null };
        });
        estado.forEach((e, id) => { if (e.pai) enlaces.push({ de: e.pai, para: id, margemDb: e.margemDb }); });
        devs.forEach(d => { const e = pd[d.id]; if (e.ok && !estado.has(d.id)) enlaces.push({ de: e.pai, para: d.id, margemDb: e.margemDb }); });
        const fora = devs.filter(d => !pd[d.id].ok).map(d => d.id);
        reps.forEach(q => { if (!estado.has(q.id)) q.semSinal = true; });
        return { aplicavel: true, porDispositivo: pd, conectados: devs.length - fora.length, fora, enlaces, nos: [H].concat(reps), repetidoresSemSinal: reps.filter(q => q.semSinal).map(q => q.id) };
    }

    // conectados pesam mais; entre redes iguais, vale a folga dos conectados e o quanto os de fora
    // se aproximam do sinal (permite encadear repetidores até alcançar o dispositivo mais distante)
    const pontuacaoRede = res => res.conectados * 1000 + Object.values(res.porDispositivo).reduce((s, e) =>
        s + (e.ok ? Math.min(30, e.margemDb || 0) : Math.max(-80, e.margemDb === null ? -80 : e.margemDb) * 0.5), 0);

    /** Melhor posição do hub entre os candidatos (centros dos cômodos, quadro...). */
    function sugerirHub(sim, candidatos, dispositivos) {
        let melhor = null;
        (candidatos || []).forEach(c => {
            const res = simularRede(sim, c, [], dispositivos);
            const pts = pontuacaoRede(res);
            if (!melhor || pts > melhor.pts) melhor = { pts, candidato: c, resultado: res };
        });
        return melhor ? { hub: melhor.candidato, resultado: melhor.resultado } : null;
    }

    /** Repetidores sugeridos (escolha gulosa entre os candidatos) até todos alcançarem o hub. */
    function sugerirRepetidores(sim, hub, candidatos, dispositivos, maximo) {
        const reps = [];
        let atual = simularRede(sim, hub, reps, dispositivos);
        const max = maximo === undefined ? 8 : maximo;
        while (atual.fora.length && reps.length < max) {
            let melhor = null;
            (candidatos || []).forEach(c => {
                if (reps.some(r => r.x === c.x && r.y === c.y && r.pavId === c.pavId)) return;
                const res = simularRede(sim, hub, reps.concat([c]), dispositivos);
                if (res.repetidoresSemSinal && res.repetidoresSemSinal.length) return;
                if (pontuacaoRede(res) > pontuacaoRede(atual) + 1 && (!melhor || pontuacaoRede(res) > pontuacaoRede(melhor.res))) melhor = { c, res };
            });
            if (!melhor) break;
            reps.push(melhor.c);
            atual = melhor.res;
        }
        // descarta repetidores que não acrescentam nenhum dispositivo conectado
        for (let i = reps.length - 1; i >= 0; i--) {
            const sem = reps.slice(0, i).concat(reps.slice(i + 1));
            const res = simularRede(sim, hub, sem, dispositivos);
            if (res.conectados >= atual.conectados && !(res.repetidoresSemSinal || []).length) { reps.splice(i, 1); atual = res; }
        }
        return { repetidores: reps, resultado: atual };
    }

    /**
     * Mapa de calor do pavimento: margem (dB) do melhor nó conectado em cada célula.
     * @returns {{x0, y0, passo, nx, ny, valores: number[]}} valores[iy * nx + ix]
     */
    function mapaDeCalor(sim, nos, pavId, caixa, passo) {
        const p = passo || 0.5;
        const nx = Math.max(1, Math.ceil((caixa.x1 - caixa.x0) / p));
        const ny = Math.max(1, Math.ceil((caixa.y1 - caixa.y0) / p));
        const valores = new Array(nx * ny);
        for (let iy = 0; iy < ny; iy++) {
            for (let ix = 0; ix < nx; ix++) {
                const q = { x: caixa.x0 + (ix + 0.5) * p, y: caixa.y0 + (iy + 0.5) * p, pavId };
                let melhor = -Infinity;
                (nos || []).forEach(n => {
                    const m = sim.tec.radio.txDbm !== undefined ? sim.margem(n, q) : -Infinity;
                    if (m > melhor) melhor = m;
                });
                valores[iy * nx + ix] = melhor;
            }
        }
        return { x0: caixa.x0, y0: caixa.y0, passo: p, nx, ny, valores };
    }

    // =========================================================================
    // 5. PAINEL DE AUTOMAÇÃO (cabeado) E DISPOSITIVOS DIN
    // =========================================================================
    // larguras típicas (módulos de 18 mm) — confira no catálogo do fabricante
    const GRUPOS_CANAIS = {
        '10A':      [{ c: 4, mod: 2 }, { c: 8, mod: 4 }, { c: 12, mod: 6 }],
        '16A':      [{ c: 4, mod: 4 }, { c: 8, mod: 8 }, { c: 12, mod: 12 }],
        'persiana': [{ c: 2, mod: 2 }, { c: 4, mod: 4 }, { c: 8, mod: 8 }],
        'entrada':  [{ c: 4, mod: 2 }, { c: 8, mod: 4 }]
    };
    const TIPOS_LAMPADA = Object.freeze({
        led_corte: { nome: 'LED dimerizável / halógena (corte de fase)', grupos: [{ c: 2, mod: 4 }, { c: 4, mod: 8 }], atuador: 'Atuador dimmer universal (corte de fase)' },
        led_0_10: { nome: 'LED com driver 1–10 V', grupos: [{ c: 4, mod: 4 }, { c: 8, mod: 8 }], atuador: 'Atuador 1–10 V (relé + saída analógica)' },
        dali: { nome: 'LED com driver DALI', grupos: [{ c: 64, mod: 4 }], atuador: 'Gateway DALI (até 64 drivers)' }
    });
    const NOME_ATUADOR = {
        knx: { '10A': 'Atuador de comutação KNX 10 A', '16A': 'Atuador de comutação KNX 16 A (cargas capacitivas)', persiana: 'Atuador de persiana KNX (canais duplos subir/descer)', entrada: 'Entrada binária KNX (contatos secos)' },
        rs485: { '10A': 'Módulo de relés RS-485/Modbus 10 A', '16A': 'Módulo de relés RS-485/Modbus 16 A', persiana: 'Módulo de persiana RS-485 (canais duplos)', entrada: 'Módulo de entradas digitais RS-485' },
        reles: { '10A': 'Módulo de saídas a relé 10 A (expansão do CLP)', '16A': 'Módulo de saídas a relé 16 A (expansão do CLP)', persiana: 'Módulo de saídas para persiana (2 relés por canal)', entrada: 'Módulo de entradas digitais 24 Vcc (expansão do CLP)' }
    };
    const PRECO_ATUADOR = {
        knx: { '10A': { 4: 1300, 8: 2200, 12: 3000 }, '16A': { 4: 1800, 8: 3000, 12: 4200 }, persiana: { 2: 1700, 4: 2800, 8: 4500 }, entrada: { 4: 900, 8: 1500 } },
        rs485: { '10A': { 4: 380, 8: 650, 12: 900 }, '16A': { 4: 450, 8: 820, 12: 1150 }, persiana: { 2: 380, 4: 650, 8: 1100 }, entrada: { 4: 260, 8: 400 } },
        reles: { '10A': { 4: 320, 8: 560, 12: 780 }, '16A': { 4: 400, 8: 720, 12: 990 }, persiana: { 2: 320, 4: 560, 8: 950 }, entrada: { 4: 220, 8: 360 } }
    };
    const PRECO_DIMMER = { knx: { led_corte: { 2: 2200, 4: 3800 }, led_0_10: { 4: 2600, 8: 4200 }, dali: { 64: 4500 } }, outro: { led_corte: { 2: 520, 4: 900 }, led_0_10: { 4: 600, 8: 1000 }, dali: { 64: 1800 } } };
    const FONTES_24V = [{ w: 15, mod: 1, preco: 120 }, { w: 30, mod: 2, preco: 170 }, { w: 60, mod: 3, preco: 250 }, { w: 120, mod: 4, preco: 380 }, { w: 240, mod: 6, preco: 650 }, { w: 480, mod: 9, preco: 1200 }];
    const TAMANHOS_CAIXA = [12, 24, 36, 48, 60, 72, 96, 120, 144];

    /** Agrupa n canais em atuadores de 4/8/12 (ou os tamanhos dados), com o menor número de módulos. */
    function agruparCanais(n, tamanhos) {
        const tams = (tamanhos || GRUPOS_CANAIS['10A']).slice().sort((a, b) => a.c - b.c);
        const maior = tams[tams.length - 1];
        const res = [];
        let resto = Math.max(0, Math.round(n));
        while (resto > maior.c) { res.push(maior); resto -= maior.c; }
        if (resto > 0) res.push(tams.find(t => t.c >= resto) || maior);
        return res;
    }

    /** Distribui itens com {polos} em fileiras de 12 módulos: cada item vai para a primeira fileira onde cabe. */
    function distribuirEmFileiras(itens, largura) {
        const L = largura || 12;
        const fileiras = [], ocup = [];
        (itens || []).forEach(it => {
            const w = Math.min(L, Math.max(1, Math.round(it.polos || 1)));
            let k = ocup.findIndex(o => o + w <= L);
            if (k < 0) { fileiras.push([]); ocup.push(0); k = fileiras.length - 1; }
            fileiras[k].push(it); ocup[k] += w;
        });
        return fileiras;
    }

    function caixaComercial(modulosNecessarios) {
        const m = Math.max(1, Math.ceil(modulosNecessarios));
        const t = TAMANHOS_CAIXA.find(x => x >= m) || Math.ceil(m / 12) * 12;
        return { modulos: t, fileiras: Math.ceil(t / 12) };
    }

    /**
     * Composição do painel/itens DIN da automação.
     * @param {Object} p
     * @param {string} p.tecnologia
     * @param {Array} p.dispositivos levantamento (com ib nas cargas de potência)
     * @param {string} [p.tipoLampada] 'led_corte' | 'led_0_10' | 'dali'
     * @param {Function} [p.descricao] (dispositivo) → texto da carga para a tabela de canais
     * @param {Function} [p.circuitoDe] (dispositivo) → número do circuito
     */
    function montarPainel(p) {
        const tec = tecnologia(p.tecnologia) || TECNOLOGIAS[0];
        const devs = p.dispositivos || [];
        const desc = p.descricao || (d => d.detalhe || TIPOS[d.tipo].nome);
        const circ = p.circuitoDe || (() => null);
        const itens = [];          // [{id, nome, qtd, modulos (cada), preco, tipo, polos}]
        const canais = [];         // tabela canal → carga
        const alertas = [];
        const addItem = (id, nome, qtd, modulos, preco, extra) => { if (qtd > 0) itens.push(Object.assign({ id, nome, qtd, modulos, preco }, extra || {})); };

        // contatores para cargas acima de 16 A (vale para todas as tecnologias)
        const contatores = {};
        devs.filter(d => d.tipo === 'rele_potencia' && Number(d.ib) > 16).forEach(d => {
            const ct = contatorPara(d.ib);
            contatores[ct.a] = contatores[ct.a] || { ct, lista: [] };
            contatores[ct.a].lista.push(d);
        });
        Object.values(contatores).forEach(({ ct, lista }) => addItem('contator' + ct.a, `Contator modular ${ct.a} A 2NA (AC-1) — comandado pela automação`, lista.length, ct.mod, ct.a <= 25 ? 120 : (ct.a <= 40 ? 210 : 340), { grupo: 'potencia' }));

        if (!ehCabeada(tec)) {
            const modulos = itens.reduce((s, i) => s + i.qtd * i.modulos, 0);
            Object.values(contatores).forEach(({ ct, lista }) => lista.forEach(d => canais.push({ atuador: `Contator ${ct.a} A`, canal: '—', funcao: desc(d), dispositivoId: d.id, circuito: circ(d) })));
            return { tecnologia: tec.id, cabeado: false, itens, canais, modulosDispositivos: modulos, modulosReserva: 0, modulosTotal: modulos, caixa: null, alertas, fonte: null, linhasKnx: 0, dispositivosBarramento: 0 };
        }

        // CANAIS DE SAÍDA, DIMMERS E ENTRADAS
        const porCanal = { '10A': [], '16A': [], persiana: [], entrada: [], dimmer: [] };
        let pulsadores = 0, aparelhosBarramento = 0, consumoBusMa = 0, consumo24vW = 0;
        const barramento = {};
        devs.forEach(d => {
            const t = TIPOS[d.tipo];
            if (!t) return;
            const cb = t.cabeado || {};
            if (cb.pulsador) pulsadores++;
            if (cb.canal) porCanal[cb.canal].push(d);
            if (cb.entrada || (cb.alternativo && tec.id !== 'knx')) porCanal.entrada.push(d);
            if (cb.consumo24vW) consumo24vW += cb.consumo24vW;
            if (cb.alternativo && tec.id !== 'knx' && cb.alternativo.consumo24vW) consumo24vW += cb.alternativo.consumo24vW;
            if (cb.barramento && (tec.id === 'knx' || !cb.alternativo)) {
                const nome = tec.id === 'knx' ? `${cb.barramento} KNX` : `${cb.barramento} (${tec.nomeCurto})`;
                barramento[nome] = barramento[nome] || { qtd: 0, preco: tec.id === 'knx' ? cb.preco : Math.round(cb.preco * 0.35) };
                barramento[nome].qtd++;
                if (tec.id === 'knx') { aparelhosBarramento++; consumoBusMa += cb.consumoBusMa || 10; }
            }
        });

        const nomes = NOME_ATUADOR[tec.id];
        const precos = PRECO_ATUADOR[tec.id];
        let numAtuador = 0;
        ['10A', '16A', 'persiana', 'entrada'].forEach(tipoCanal => {
            const lista = porCanal[tipoCanal];
            if (!lista.length) return;
            const grupos = agruparCanais(lista.length, GRUPOS_CANAIS[tipoCanal]);
            let k = 0;
            grupos.forEach(g => {
                numAtuador++;
                const rot = `A${numAtuador}`;
                const nomeItem = `${nomes[tipoCanal]} ${g.c} canais`;
                const ex = itens.find(i => i.nome === nomeItem);
                if (ex) ex.qtd++; else addItem(`atuador_${tipoCanal}_${g.c}`, nomeItem, 1, g.mod, precos[tipoCanal][g.c], { grupo: 'atuador', canaisPorUnidade: g.c, tipoCanal });
                for (let ch = 1; ch <= g.c; ch++) {
                    const d = lista[k++];
                    canais.push({ atuador: `${rot} — ${nomes[tipoCanal]} (${g.c} canais)`, canal: tipoCanal === 'persiana' ? `${ch} (subir/descer)` : String(ch),
                        funcao: d ? desc(d) : 'Reserva', dispositivoId: d ? d.id : null, circuito: d ? circ(d) : null, reserva: !d });
                }
                if (tec.id === 'knx') { aparelhosBarramento++; consumoBusMa += 12; }
                else consumo24vW += tipoCanal === 'entrada' ? 1 : g.c * 0.45;
            });
        });

        if (porCanal.dimmer.length) {
            const tl = TIPOS_LAMPADA[p.tipoLampada] ? p.tipoLampada : 'led_corte';
            const info = TIPOS_LAMPADA[tl];
            const grupos = agruparCanais(porCanal.dimmer.length, info.grupos);
            const tabPreco = (tec.id === 'knx' ? PRECO_DIMMER.knx : PRECO_DIMMER.outro)[tl];
            let k = 0;
            grupos.forEach(g => {
                numAtuador++;
                const nomeItem = `${info.atuador}${tec.id === 'knx' ? ' KNX' : ` (${tec.nomeCurto})`} ${g.c === 64 ? '' : g.c + ' canais'}`.trim();
                const ex = itens.find(i => i.nome === nomeItem);
                if (ex) ex.qtd++; else addItem(`dimmer_${tl}_${g.c}`, nomeItem, 1, g.mod, tabPreco[g.c], { grupo: 'atuador', canaisPorUnidade: g.c, tipoCanal: 'dimmer' });
                const usados = Math.min(g.c, porCanal.dimmer.length - k);
                for (let ch = 1; ch <= (g.c === 64 ? usados : g.c); ch++) {
                    const d = porCanal.dimmer[k++];
                    canais.push({ atuador: `A${numAtuador} — ${info.atuador}`, canal: String(ch), funcao: d ? `${desc(d)} (dimerizável)` : 'Reserva', dispositivoId: d ? d.id : null, circuito: d ? circ(d) : null, reserva: !d });
                }
                if (tec.id === 'knx') { aparelhosBarramento++; consumoBusMa += 12; } else consumo24vW += 2;
            });
        }

        // comandos na parede
        if (pulsadores) {
            if (tec.id === 'knx') { addItem('pulsador_knx', 'Pulsador KNX 4 teclas com acoplador de barramento (parede, caixa 4x2)', pulsadores, 0, 750, { grupo: 'campo' }); aparelhosBarramento += pulsadores; consumoBusMa += pulsadores * 8; }
            else {
                addItem('pulsador_conv', 'Pulsador (botoeira) 4x2 de contato NA — ligado a entrada digital', pulsadores, 0, 28, { grupo: 'campo' });
                // cada pulsador ocupa uma entrada digital
                const g = agruparCanais(pulsadores, GRUPOS_CANAIS.entrada);
                g.forEach(gr => { const nomeItem = `${nomes.entrada} ${gr.c} canais (pulsadores)`; const ex = itens.find(i => i.nome === nomeItem); if (ex) ex.qtd++; else addItem(`entrada_puls_${gr.c}`, nomeItem, 1, gr.mod, precos.entrada[gr.c], { grupo: 'atuador' }); consumo24vW += 1; });
            }
        }
        Object.keys(barramento).forEach(n => addItem('bus_' + semAcento(n).replace(/\W+/g, '_'), n, barramento[n].qtd, 0, barramento[n].preco, { grupo: 'campo' }));
        const semFio = devs.filter(d => (TIPOS[d.tipo].cabeado || {}).semFio).length;

        // CONTROLE, INTERFACE E FONTES
        let linhasKnx = 0;
        if (tec.id === 'knx') {
            aparelhosBarramento += 1;                   // interface IP
            if (semFio) aparelhosBarramento += 1;       // gateway
            linhasKnx = Math.max(1, Math.ceil(aparelhosBarramento / 64));
            const acopladores = linhasKnx > 1 ? linhasKnx : 0;
            aparelhosBarramento += acopladores;
            const fontes = linhasKnx + (linhasKnx > 1 ? 1 : 0);   // + linha principal
            addItem('fonte_knx_640', 'Fonte de alimentação KNX 640 mA com bobina integrada', fontes, 4, 1800, { grupo: 'controle' });
            if (acopladores) addItem('acoplador_knx', 'Acoplador de linha KNX', acopladores, 2, 1800, { grupo: 'controle' });
            addItem('interface_ip_knx', linhasKnx > 1 ? 'Roteador IP KNX (programação, aplicativo e integração)' : 'Interface IP KNX (programação, aplicativo e integração)', 1, 2, linhasKnx > 1 ? 2600 : 1700, { grupo: 'controle' });
            if (semFio) addItem('gateway_knx', 'Gateway KNX ↔ rede sem fio (fechaduras e sensores sem fio)', 1, 2, 1900, { grupo: 'controle' });
            const porLinha = consumoBusMa / linhasKnx;
            if (porLinha > 640 * 0.9) alertas.push(`Consumo estimado de ${Math.round(porLinha)} mA por linha passa de 90% da fonte de 640 mA: divida em mais linhas.`);
            if (aparelhosBarramento > 64) alertas.push(`${aparelhosBarramento} aparelhos no barramento: acima de 64 por linha, o projeto usa ${linhasKnx} linhas com acopladores.`);
        } else {
            addItem('controlador', tec.id === 'rs485' ? 'Controlador mestre RS-485 / Modbus RTU (central de automação)' : 'CLP / controlador de automação com E/S digitais', 1, tec.id === 'rs485' ? 4 : 6, tec.id === 'rs485' ? 1800 : 1500, { grupo: 'controle' });
            consumo24vW += 5;
            if (semFio) addItem('gateway_semfio', 'Gateway sem fio (Zigbee) para fechaduras/sensores sem fio', 1, 0, 350, { grupo: 'controle' });
        }
        let fonte24 = null;
        if (consumo24vW > 0) {
            const necessaria = consumo24vW * 1.25;
            const f = FONTES_24V.find(x => x.w >= necessaria) || FONTES_24V[FONTES_24V.length - 1];
            fonte24 = { consumoW: arred(consumo24vW, 1), necessariaW: arred(necessaria, 1), potenciaW: f.w, modulos: f.mod };
            addItem('fonte_24v_' + f.w, `Fonte 24 Vcc ${f.w} W para trilho DIN (${tec.id === 'knx' ? 'sensores convencionais' : 'módulos, pulsadores e sensores'})`, 1, f.mod, f.preco, { grupo: 'controle' });
            if (necessaria > FONTES_24V[FONTES_24V.length - 1].w) alertas.push('Consumo em 24 Vcc acima de 480 W: use mais de uma fonte.');
        }

        // PROTEÇÃO DO PAINEL
        addItem('disj_painel', 'Disjuntor de alimentação do painel 1P 10 A curva C', 1, 1, 18, { grupo: 'protecao' });
        addItem('dps_painel', 'DPS classe II 275 V 20 kA (fase e neutro)', 2, 1, 42, { grupo: 'protecao' });
        const nCanais = canais.filter(c => !c.reserva).length;
        const bornes = nCanais * 2 + porCanal.entrada.length * 2 + 8;
        const modBornes = Math.ceil(bornes / 3.5);           // borne de 4 mm² com 5,2 mm de largura
        addItem('bornes', `Bornes de passagem 4 mm² (${bornes} un) com tampas e marcadores`, 1, modBornes, Math.round(bornes * 4.5), { grupo: 'protecao', bornes });

        const modulosDispositivos = itens.reduce((s, i) => s + i.qtd * (i.modulos || 0), 0);
        const modulosReserva = Math.max(2, Math.ceil(modulosDispositivos * 0.2));
        const caixa = caixaComercial(modulosDispositivos + modulosReserva);
        const canaletaM = arred((caixa.fileiras + 1) * 0.35 + 2 * (caixa.fileiras * 0.15 + 0.1), 1);
        addItem('canaleta', 'Canaleta ranhurada 30×50 mm com tampa (m)', canaletaM, 0, 28, { grupo: 'protecao', unidade: 'm' });
        return {
            tecnologia: tec.id, cabeado: true, itens, canais, alertas, fonte: fonte24, linhasKnx,
            dispositivosBarramento: aparelhosBarramento, consumoBusMa: Math.round(consumoBusMa),
            modulosDispositivos, modulosReserva, modulosTotal: modulosDispositivos + modulosReserva, caixa
        };
    }

    /** Itens DIN do painel expandidos em módulos (para o desenho em trilhos). */
    function itensDinDoPainel(painel) {
        const lista = [];
        (painel.itens || []).forEach(i => {
            if (!(i.modulos > 0)) return;
            for (let k = 0; k < i.qtd; k++) {
                // peças maiores que uma fileira (régua de bornes) são divididas em trechos de 12 módulos
                let resto = i.modulos, parte = 0;
                while (resto > 0) {
                    const w = Math.min(12, resto);
                    lista.push({ id: `${i.id}_${k}${parte ? '_' + parte : ''}`, tipo: 'automacao', nome: i.nome, grupo: i.grupo, polos: w });
                    resto -= w; parte++;
                }
            }
        });
        return lista;
    }

    /** Quadro de força separado ou painel integrado ao QDC. */
    function decidirLocalPainel(painel, modo) {
        if (modo === 'integrado' || modo === 'separado') {
            return { local: modo, justificativa: modo === 'integrado' ? 'Escolha do projetista: painel integrado ao quadro de distribuição (QDC).' : 'Escolha do projetista: quadro de automação separado, ao lado do QDC.' };
        }
        if (!painel.cabeado) {
            return { local: 'integrado', justificativa: painel.modulosDispositivos ? `Tecnologia sem fio: só os ${painel.modulosDispositivos} módulos de contatores vão para o QDC.` : 'Tecnologia sem fio: os módulos ficam nas caixas dos pontos; nada vai ao quadro.' };
        }
        if (painel.modulosTotal <= 12) {
            return { local: 'integrado', justificativa: `${painel.modulosTotal} módulos cabem numa fileira dedicada do QDC, com o barramento de baixa tensão (SELV) separado dos condutores de força por canaleta própria.` };
        }
        return { local: 'separado', justificativa: `${painel.modulosTotal} módulos (com ${painel.modulosReserva} de reserva) pedem um quadro de automação próprio, ao lado do QDC: separa o barramento de baixa tensão da força e deixa espaço para ampliação.` };
    }

    /**
     * Metragem do cabo de barramento pelas rotas da planta (percurso ortogonal + subidas).
     * KNX: árvore mínima a partir do painel; RS-485: barramento em sequência; relés: estrela.
     * @param {string} tecId
     * @param {{x,y,z}} painel posição em m (z = altura absoluta)
     * @param {Array<{x,y,z}>} pontos aparelhos de barramento/campo
     */
    function metragemBarramento(tecId, painel, pontos) {
        const pts = (pontos || []).filter(Boolean);
        if (!painel || !pts.length) return { metros: 0, topologia: '', limiteM: 0, ok: true };
        const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs((a.z || 0) - (b.z || 0)) + 1.0; // + descidas nas caixas
        let total = 0, topologia;
        if (tecId === 'reles') {
            topologia = 'Estrela: um cabo de cada ponto até o painel';
            pts.forEach(q => { total += dist(painel, q); });
        } else if (tecId === 'rs485') {
            topologia = 'Barramento linear (de um aparelho ao seguinte), com terminação de 120 Ω nas pontas';
            const rest = pts.slice();
            let atual = painel;
            while (rest.length) {
                let k = 0;
                rest.forEach((q, i) => { if (dist(atual, q) < dist(atual, rest[k])) k = i; });
                total += dist(atual, rest[k]);
                atual = rest.splice(k, 1)[0];
            }
        } else {
            topologia = 'Árvore (topologia livre KNX, sem anel), a partir do painel';
            const nos = [painel].concat(pts);
            const dentro = new Array(nos.length).fill(false);
            const melhor = new Array(nos.length).fill(Infinity);
            melhor[0] = 0;
            for (let it = 0; it < nos.length; it++) {
                let u = -1;
                for (let i = 0; i < nos.length; i++) if (!dentro[i] && (u < 0 || melhor[i] < melhor[u])) u = i;
                dentro[u] = true;
                total += melhor[u];
                for (let v = 0; v < nos.length; v++) if (!dentro[v]) melhor[v] = Math.min(melhor[v], dist(nos[u], nos[v]));
            }
        }
        const metros = Math.ceil(total * 1.15);
        const limiteM = tecId === 'knx' ? 1000 : (tecId === 'rs485' ? 1200 : 0);
        return { metros, topologia, limiteM, ok: !limiteM || metros <= limiteM };
    }

    // =========================================================================
    // 6. NOBREAK (somente quando exigido)
    // =========================================================================
    const VA_COMERCIAIS = { interativo: [600, 700, 800, 1000, 1200, 1400, 1500, 2000, 2200, 3000], online: [1000, 1500, 2000, 3000, 6000, 10000] };
    const FP_NOBREAK = { interativo: 0.6, online: 0.9 };
    const BATERIAS_AH = [7, 9, 12, 18, 26, 40, 45, 60, 70, 80, 100, 115, 150, 200, 220];

    /** Cargas que podem ficar no nobreak, a partir do projeto de automação. */
    function cargasNobreakSugeridas(p) {
        const tec = tecnologia(p.tecnologia) || TECNOLOGIAS[0];
        const devs = p.dispositivos || [];
        const n = tipo => devs.filter(d => d.tipo === tipo).length;
        const cargas = [];
        cargas.push({ id: 'hub', nome: ehCabeada(tec) ? 'Controlador/servidor de automação' : 'Hub / servidor de automação', potW: p.servidorLocal ? 20 : 8 });
        cargas.push({ id: 'roteador', nome: 'Roteador e modem/ONT da internet', potW: 22 });
        if (ehCabeada(tec)) {
            const fonteW = tec.id === 'knx' ? 30 : 0;
            const f24 = p.painel && p.painel.fonte ? p.painel.fonte.consumoW / 0.88 : 0;
            cargas.push({ id: 'fonteBarramento', nome: tec.id === 'knx' ? 'Fonte do barramento KNX (e fonte 24 Vcc)' : 'Fonte 24 Vcc do painel', potW: arred(fonteW + f24, 0), dc24: tec.id !== 'knx' });
        }
        if (n('camera') || n('videoporteiro')) cargas.push({ id: 'cameras', nome: `Câmeras (${n('camera')}) e gravador/vídeo-porteiro`, potW: n('camera') * 5 + n('videoporteiro') * 4 + (n('camera') ? 25 : 0) });
        if (n('fechadura')) cargas.push({ id: 'fechaduras', nome: `Fechaduras e controle de acesso (${n('fechadura')})`, potW: n('fechadura') * 10 });
        if (n('sirene') || n('sensor_abertura') || n('sensor_presenca')) cargas.push({ id: 'alarme', nome: 'Central de alarme e sirene', potW: 15 });
        return cargas;
    }

    /**
     * Dimensionamento do nobreak.
     * @param {Object} p {exigido, cargas: [{id, nome, potW, selecionada}], autonomiaMin, tipo 'interativo'|'online'}
     * @returns {null | Object} null quando não exigido
     */
    function dimensionarNobreak(p) {
        if (!p || !p.exigido) return null;
        const tipo = p.tipo === 'online' ? 'online' : 'interativo';
        const sel = (p.cargas || []).filter(c => c.selecionada !== false);
        const potW = sel.reduce((s, c) => s + (Number(c.potW) || 0), 0);
        const autonomiaMin = Math.max(5, Number(p.autonomiaMin) || 60);
        const projW = potW * 1.25;
        const fp = FP_NOBREAK[tipo];
        const vaMin = projW / fp;
        const lista = VA_COMERCIAIS[tipo];
        const va = lista.find(v => v >= vaMin) || lista[lista.length - 1];
        const alertas = [];
        if (vaMin > lista[lista.length - 1]) alertas.push('Carga acima do maior nobreak da lista: divida as cargas em mais de um nobreak.');
        const vBanco = tipo === 'online' ? (va <= 1500 ? 36 : (va <= 3000 ? 72 : 192)) : (va <= 1000 ? 12 : (va <= 2200 ? 24 : 48));
        const eficiencia = 0.85, profundidade = 0.5;
        const energiaWh = potW * autonomiaMin / 60 / (eficiencia * profundidade);
        const ahNecessario = energiaWh / vBanco;
        const maiorAh = BATERIAS_AH[BATERIAS_AH.length - 1];
        const paralelo = Math.max(1, Math.ceil(ahNecessario / maiorAh));
        const ahPorString = ahNecessario / paralelo;
        const ah = BATERIAS_AH.find(a => a >= ahPorString) || maiorAh;
        const serie = Math.round(vBanco / 12);
        const tensao = va > 2200 ? 220 : 127;
        const ib = arred(va / tensao, 1);
        // fonte 24 Vcc com DC-UPS: alternativa quando as cargas protegidas são de 24 Vcc
        const dcW = sel.filter(c => c.dc24).reduce((s, c) => s + (Number(c.potW) || 0), 0);
        const alternativaDC = dcW > 0 ? (() => {
            const i = dcW / 24;
            const ahDc = i * autonomiaMin / 60 / 0.8;
            const ahBat = BATERIAS_AH.find(a => a >= ahDc) || maiorAh;
            return { potW: arred(dcW, 0), correnteA: arred(i, 2), bateria: `2 × 12 V ${ahBat} Ah em série (24 V)`, ah: ahBat,
                texto: `Fonte 24 Vcc com módulo DC-UPS no trilho DIN e 2 baterias de 12 V ${ahBat} Ah: mantém ${arred(dcW, 0)} W em 24 Vcc por ${autonomiaMin} min sem inversor (mais eficiente que o nobreak para essas cargas).` };
        })() : null;
        return {
            tipo, potW: arred(potW, 0), projW: arred(projW, 0), fp, vaMin: arred(vaMin, 0), va, wNominal: Math.round(va * fp),
            autonomiaMin, energiaWh: arred(energiaWh, 0), banco: { tensaoV: vBanco, serie, paralelo, ah, total: serie * paralelo, ahNecessario: arred(ahNecessario, 1) },
            circuito: { potVA: va, tensao, ib, nome: `Nobreak ${va} VA (rack de automação)` },
            alternativaDC, alertas,
            justificativa: `Cargas protegidas: ${sel.map(c => `${c.nome} (${c.potW} W)`).join(', ') || 'nenhuma'}. Soma ${arred(potW, 0)} W + 25% de margem = ${arred(projW, 0)} W; com fator de potência ${String(fp).replace('.', ',')} do nobreak ${tipo === 'online' ? 'online senoidal' : 'interativo'}, pede ${arred(vaMin, 0)} VA → modelo comercial de ${va} VA (${Math.round(va * fp)} W). Autonomia de ${autonomiaMin} min: ${arred(energiaWh, 0)} Wh com rendimento de 85% e descarga até 50% → banco de ${vBanco} V com ${serie * paralelo} bateria(s) de 12 V ${ah} Ah (${serie} em série${paralelo > 1 ? ` × ${paralelo} em paralelo` : ''}).`
        };
    }

    // =========================================================================
    // 7. CENAS
    // =========================================================================
    function sugerirCenas(dispositivos, nomeComodo) {
        const devs = dispositivos || [];
        const nome = nomeComodo || (id => String(id));
        const tem = tipo => devs.some(d => d.tipo === tipo);
        const porPerfil = perfis => devs.filter(d => perfis.includes(perfilAmbiente(nome(d.comodoId))));
        const luzes = devs.filter(d => ['modulo_rele', 'interruptor', 'dimmer'].includes(d.tipo));
        const cenas = [];
        const sair = ['Apaga todas as luzes'];
        if (tem('tomada')) sair.push('Desliga as tomadas inteligentes (exceto geladeira e internet)');
        if (tem('controle_ir')) sair.push('Desliga os ares-condicionados');
        if (tem('rele_potencia')) sair.push('Desliga chuveiros, aquecedores e bombas comandados');
        if (tem('cortina')) sair.push('Fecha as cortinas');
        if (tem('fechadura')) sair.push('Tranca a porta de entrada');
        if (tem('sensor_abertura') || tem('sensor_presenca')) sair.push('Arma o alarme (sensores de abertura e presença)');
        if (tem('camera')) sair.push('Câmeras passam a gravar e avisar por movimento');
        cenas.push({ id: 'sair', nome: 'Sair de casa', icone: 'fa-door-closed', gatilho: 'Botão na entrada, aplicativo ou quando o último celular sai de casa', acoes: sair });

        const cine = [];
        const salas = porPerfil(['sala', 'cinema']);
        if (salas.some(d => d.tipo === 'dimmer')) cine.push('Luzes da sala a 10% (dimmer)'); else cine.push('Apaga as luzes da sala');
        if (salas.some(d => d.tipo === 'cortina')) cine.push('Fecha a cortina da sala');
        if (salas.some(d => d.tipo === 'tomada')) cine.push('Liga a tomada da TV / home theater');
        if (salas.some(d => d.tipo === 'controle_ir')) cine.push('Ar-condicionado da sala em 23 °C');
        cine.push('Apaga as luzes de circulação ao lado');
        cenas.push({ id: 'cinema', nome: 'Cinema', icone: 'fa-film', gatilho: 'Botão na sala ou comando de voz', acoes: cine });

        const dormir = ['Apaga as luzes da área social e de circulação'];
        const quartos = porPerfil(['dormitorio']);
        if (quartos.some(d => d.tipo === 'dimmer')) dormir.push('Luz dos quartos a 20% e desligando em 15 min'); else dormir.push('Apaga as luzes dos quartos em 15 min');
        if (quartos.some(d => d.tipo === 'cortina')) dormir.push('Fecha as cortinas dos quartos');
        if (quartos.some(d => d.tipo === 'controle_ir')) dormir.push('Ar-condicionado dos quartos no modo noturno');
        if (tem('fechadura')) dormir.push('Tranca a porta de entrada');
        if (tem('sensor_abertura')) dormir.push('Arma o alarme só das portas e janelas (perímetro)');
        if (devs.some(d => d.tipo === 'sensor_presenca' && perfilAmbiente(nome(d.comodoId)) === 'circulacao')) dormir.push('Corredor acende a 10% ao passar de madrugada');
        cenas.push({ id: 'dormir', nome: 'Dormir', icone: 'fa-moon', gatilho: 'Botão na cabeceira, comando de voz ou horário', acoes: dormir });

        if (tem('sensor_vazamento') || tem('sensor_gas') || tem('sensor_fumaca')) {
            const al = [];
            if (tem('sensor_vazamento')) al.push('Vazamento: avisa no celular (e fecha a válvula de água, se houver)');
            if (tem('sensor_gas')) al.push('Gás: avisa no celular e toca a sirene; não aciona cargas elétricas no ambiente');
            if (tem('sensor_fumaca')) al.push('Fumaça: toca a sirene, acende as luzes de circulação e destranca a porta de entrada');
            cenas.push({ id: 'seguranca', nome: 'Alertas de segurança', icone: 'fa-triangle-exclamation', gatilho: 'Automático pelos sensores', acoes: al });
        }
        if (luzes.length && tem('sensor_presenca')) {
            cenas.push({ id: 'presenca', nome: 'Luz automática', icone: 'fa-person-walking', gatilho: 'Sensores de presença', acoes: ['Acende a luz ao entrar nos ambientes com sensor e apaga após 3 min sem movimento'] });
        }
        return cenas;
    }

    // =========================================================================
    // 8. LISTA DE MATERIAIS E MÃO DE OBRA
    // =========================================================================
    const INFRA_SEM_FIO = {
        wifi: { hub: { nome: 'Roteador Wi-Fi mesh (ponto principal)', preco: 450 }, repetidor: { nome: 'Ponto de acesso Wi-Fi mesh (satélite)', preco: 350 } },
        zigbee: { hub: { nome: 'Hub / coordenador Zigbee 3.0', preco: 250 }, repetidor: { nome: 'Repetidor Zigbee de tomada', preco: 90 } },
        zwave: { hub: { nome: 'Controlador Z-Wave 921,42 MHz (versão Brasil)', preco: 650 }, repetidor: { nome: 'Repetidor Z-Wave 921,42 MHz', preco: 320 } },
        thread: { hub: { nome: 'Roteador de borda Thread / controlador Matter', preco: 600 }, repetidor: { nome: 'Repetidor Thread (plug roteador)', preco: 150 } },
        blemesh: { hub: { nome: 'Gateway Bluetooth Mesh (acesso remoto)', preco: 200 }, repetidor: { nome: 'Nó repetidor Bluetooth Mesh (plug)', preco: 80 } }
    };
    const CABO_BARRAMENTO = {
        knx: { nome: 'Cabo KNX/EIB YCYM 2×2×0,8 mm (verde)', preco: 6.5 },
        rs485: { nome: 'Cabo par trançado blindado 2 pares 24 AWG (RS-485)', preco: 4.5 },
        reles: { nome: 'Cabo de comando multipolar 4×0,75 mm² (pontos → painel)', preco: 3.8 }
    };

    /**
     * Lista de materiais da automação.
     * @returns {Array<{chave, item, especificacao, qtd, unidade, precoRef, aplicacao, margem}>}
     */
    function listaMateriais(p) {
        const tec = tecnologia(p.tecnologia) || TECNOLOGIAS[0];
        const devs = p.dispositivos || [];
        const itens = [];
        const add = (chave, item, especificacao, qtd, unidade, precoRef, aplicacao, margem) => {
            if (qtd > 0) itens.push({ chave, item, especificacao, qtd: arred(qtd, 1), unidade, precoRef: arred(precoRef, 2), aplicacao, margem: margem || 0 });
        };
        const cont = {};
        devs.forEach(d => { cont[d.tipo] = (cont[d.tipo] || 0) + 1; });
        const cabeada = ehCabeada(tec);
        Object.keys(TIPOS).forEach(tipo => {
            const n = cont[tipo] || 0;
            if (!n) return;
            const t = TIPOS[tipo];
            if (cabeada) {
                const cb = t.cabeado || {};
                if (cb.ip) add('auto_' + tipo, `${t.nome}`, 'Rede IP (PoE ou Wi-Fi), integrada ao controlador', n, 'un', t.preco, 'Segurança e acesso');
                else if (cb.semFio) add('auto_' + tipo, `${t.nome} (sem fio, via gateway)`, 'Integrada ao sistema pelo gateway sem fio', n, 'un', t.preco, 'Acesso');
                else if (cb.entrada && !['sensor_presenca'].includes(tipo)) {
                    const convencional = { sensor_abertura: ['Sensor magnético de abertura com fio (contato NF)', 18], sensor_fumaca: ['Detector de fumaça convencional 24 Vcc com contato seco', 120], sensor_gas: ['Detector de gás 24 Vcc com contato seco', 220], sensor_vazamento: ['Sonda de vazamento com contato seco', 70] }[tipo];
                    if (convencional) add('auto_' + tipo, convencional[0], 'Ligado a uma entrada binária/digital do painel', n, 'un', convencional[1], 'Sensores');
                } else if (tipo === 'sensor_presenca' && tec.id !== 'knx') add('auto_' + tipo, 'Sensor de presença PIR 24 Vcc com contato', 'Ligado a uma entrada digital do painel', n, 'un', 85, 'Sensores');
                else if (tipo === 'cortina') add('auto_' + tipo, 'Motor de cortina/persiana convencional (subir/descer)', 'Comandado pelo canal de persiana do painel', n, 'un', 480, 'Conforto');
            } else {
                add('auto_' + tipo + '_' + tec.id, `${t.nome} — ${tec.nomeCurto}`, t.neutro ? 'Exige condutor neutro na caixa' : (t.alimentacao === 'bateria' ? 'Alimentado por bateria' : 'Ligado na rede elétrica'), n, 'un', t.preco * (t.alimentacao === 'ip' ? 1 : tec.multiplicadorPreco), 'Dispositivos por cômodo');
            }
        });
        // itens do painel / DIN (contatores e, no cabeado, atuadores, fontes, proteção)
        (p.painel && p.painel.itens || []).forEach(i => add('auto_' + i.id, i.nome, i.modulos ? `${i.modulos} módulo(s) DIN cada` : (i.grupo === 'campo' ? 'Instalado no ponto (caixa 4x2/teto)' : ''), i.qtd, i.unidade || 'un', i.preco, i.grupo === 'potencia' ? 'Comando de cargas acima de 16 A' : 'Painel de automação', i.unidade === 'm' ? 0.1 : 0));
        if (!cabeada && devs.some(d => d.tipo === 'rele_potencia' && Number(d.ib) > 16)) {
            // o relé de potência das cargas > 16 A comanda a bobina do contator
        }
        if (cabeada && p.painel && p.painel.caixa && p.local === 'separado') {
            add('auto_caixa_' + p.painel.caixa.modulos, `Quadro de automação de embutir ${p.painel.caixa.modulos} módulos DIN (${p.painel.caixa.fileiras} fileiras) com porta`, 'Separado do QDC, com placa de montagem', 1, 'un', 180 + p.painel.caixa.modulos * 6, 'Painel de automação');
        }
        // rede sem fio: hub e repetidores
        if (!cabeada) {
            const inf = INFRA_SEM_FIO[tec.id];
            add('auto_hub_' + tec.id, inf.hub.nome, 'Posição sugerida pela simulação de alcance', 1, 'un', inf.hub.preco, 'Rede de automação');
            add('auto_rep_' + tec.id, inf.repetidor.nome, 'Posições sugeridas pela simulação de alcance', p.repetidores || 0, 'un', inf.repetidor.preco, 'Rede de automação');
        }
        if (p.servidorLocal) add('auto_servidor', 'Servidor local de automação (mini PC com Home Assistant)', 'Controle local, sem depender da internet', 1, 'un', 900, 'Rede de automação');
        if (cabeada && (cont.camera || cont.videoporteiro)) add('auto_switch_poe', 'Switch PoE 8 portas (câmeras e vídeo-porteiro)', 'No rack de automação', 1, 'un', 450, 'Rede de dados');
        if (cabeada && p.metrosBarramento) add('auto_cabo_' + tec.id, CABO_BARRAMENTO[tec.id].nome, 'Em eletroduto próprio, separado dos condutores de força', p.metrosBarramento, 'm', CABO_BARRAMENTO[tec.id].preco, 'Barramento de automação', 0.1);
        if (p.metrosNeutro) add('auto_neutro', 'Cabo flexível 1,5 mm² azul-claro (neutro até os interruptores inteligentes)', 'NBR NM 247-3, 450/750 V', p.metrosNeutro, 'm', 1.95, 'Neutro obrigatório nos interruptores e módulos inteligentes', 0.1);
        if (p.nobreak) {
            const nb = p.nobreak;
            add('auto_nobreak_' + nb.va, `Nobreak ${nb.tipo === 'online' ? 'online senoidal' : 'interativo'} ${nb.va} VA (${nb.wNominal} W)`, `Banco de ${nb.banco.tensaoV} V`, 1, 'un', nb.tipo === 'online' ? 900 + nb.va * 1.1 : 250 + nb.va * 0.45, 'Proteção das cargas de automação');
            if (nb.banco.ah > 9 || nb.banco.paralelo > 1) add('auto_bateria_' + nb.banco.ah, `Bateria estacionária VRLA 12 V ${nb.banco.ah} Ah`, `${nb.banco.serie} em série${nb.banco.paralelo > 1 ? ` × ${nb.banco.paralelo} em paralelo` : ''}`, nb.banco.total, 'un', 40 + nb.banco.ah * 6.5, 'Autonomia do nobreak');
        }
        if (devs.length) add('auto_caixa4x2_funda', 'Caixa 4x2 de embutir profunda (espaço para módulo inteligente)', 'Para módulos atrás dos interruptores', cabeada ? 0 : (cont.modulo_rele || 0), 'un', 4.2, 'Dispositivos por cômodo');
        return itens;
    }

    /** Quantidades de serviço da automação para o módulo de mão de obra. */
    function quantidadesMaoDeObra(p) {
        const devs = p.dispositivos || [];
        const tec = tecnologia(p.tecnologia) || TECNOLOGIAS[0];
        return {
            automacaoDispositivos: devs.length,
            automacaoConfiguracao: devs.length + (p.repetidores || 0) + 1,
            automacaoPainel: ehCabeada(tec) ? 1 : 0,
            automacaoCaboMetros: Math.ceil(Number(p.metrosBarramento) || 0),
            automacaoRede: 1 + (p.repetidores || 0) + (p.nobreak ? 1 : 0) + (p.servidorLocal ? 1 : 0),
            automacaoCenas: (p.cenas || []).length
        };
    }

    // =========================================================================
    // 9. IMPACTO NA PARTE ELÉTRICA E MEMORIAL
    // =========================================================================
    function impactoEletrico(p) {
        const devs = p.dispositivos || [];
        const tec = tecnologia(p.tecnologia) || TECNOLOGIAS[0];
        const comNeutro = ehCabeada(tec) ? [] : devs.filter(d => TIPOS[d.tipo] && TIPOS[d.tipo].neutro && ['modulo_rele', 'interruptor', 'dimmer'].includes(d.tipo));
        const modulosQdc = p.local === 'integrado' && p.painel ? p.painel.modulosDispositivos : (p.painel ? p.painel.itens.filter(i => i.grupo === 'potencia').reduce((s, i) => s + i.qtd * i.modulos, 0) : 0);
        const linhas = [];
        if (comNeutro.length) linhas.push(`${comNeutro.length} interruptor(es)/módulo(s) inteligente(s) exigem o condutor neutro na caixa do interruptor: o trecho luminária → interruptor passa a ter fase, neutro e retorno (${arred(p.metrosNeutro || 0, 0)} m de neutro 1,5 mm² a mais).`);
        if (ehCabeada(tec)) linhas.push('No sistema cabeado os interruptores viram pulsadores de baixa tensão: o retorno de cada luminária sai do atuador no painel, e a caixa do interruptor recebe só o cabo de barramento.');
        linhas.push(`Ponto de força dedicado para o rack/hub de automação: ${p.nobreak ? `circuito do nobreak de ${p.nobreak.va} VA` : 'tomada 2P+T 10 A em circuito próprio'}.`);
        if (modulosQdc) linhas.push(`${modulosQdc} módulo(s) DIN a mais no QDC para ${p.local === 'integrado' && ehCabeada(tec) ? 'o painel de automação integrado' : 'contatores das cargas acima de 16 A'} — já considerados no desenho do quadro.`);
        return { interruptoresComNeutro: comNeutro.length, metrosNeutro: arred(p.metrosNeutro || 0, 0), modulosQdc, linhas };
    }

    /**
     * Memorial de automação em seções de texto (a tela e a impressão formatam).
     * @returns {Array<{titulo, paragrafos: string[]}>}
     */
    function gerarMemorial(p) {
        const tec = tecnologia(p.tecnologia) || TECNOLOGIAS[0];
        const devs = p.dispositivos || [];
        const cont = {};
        devs.forEach(d => { cont[d.tipo] = (cont[d.tipo] || 0) + 1; });
        const s = [];
        s.push({ titulo: '1. Objetivo e premissas', paragrafos: [
            `Projeto de automação residencial no nível ${NIVEIS[p.nivel] || 'Intermediário'}, feito a partir dos cômodos, pontos e circuitos do projeto elétrico (NBR 5410).`,
            'Valores de alcance, consumo e preço são estimativas de referência e devem ser confirmados com o fabricante, a pesquisa de preços e medição no local.'
        ] });
        const rank = p.ranking && p.ranking[0];
        s.push({ titulo: '2. Tecnologia adotada', paragrafos: [
            `${tec.nome}${p.escolhaManual ? ' (escolhida pelo projetista)' : ''}. Alcance: ${tec.alcance}. Malha: ${tec.malha}. Hub: ${tec.hub}. Sem internet: ${tec.semInternet}.`,
            tec.obsBrasil
        ].concat(rank ? rank.justificativa : []) });
        s.push({ titulo: '3. Dispositivos', paragrafos: [Object.keys(cont).map(t => `${cont[t]} × ${TIPOS[t].nome}`).join('; ') + '.'] });
        if (p.rede) s.push({ titulo: '4. Rede e alcance (estimativa)', paragrafos: p.rede.aplicavel ? [
            `Simulação com perda por distância (expoente ${String(EXPOENTE_PERDA).replace('.', ',')}), paredes de ${(MATERIAIS_PAREDE[p.material] || MATERIAIS_PAREDE.alvenaria).nome.toLowerCase()} (${arred(perdaParede(tec, p.material), 1)} dB cada) e lajes de concreto (cerca de ${arred(perdaLaje(tec, 0.15), 0)} dB cada), com ${MARGEM_DESVANECIMENTO} dB de folga.`,
            `${p.rede.conectados} de ${devs.filter(d => TIPOS[d.tipo].alimentacao !== 'ip').length} dispositivos alcançam o hub${p.repetidores ? ` com ${p.repetidores} repetidor(es)` : ''}${p.rede.fora.length ? `; ${p.rede.fora.length} ficam fora de alcance e precisam de repetidor ou mudança de posição` : ''}.`,
            'A simulação não substitui a medição de sinal no local, com a obra pronta.'
        ] : [`Sistema cabeado: ${p.barramento ? `${p.barramento.metros} m de cabo de barramento (${minusculaInicial(p.barramento.topologia)})${p.barramento.limiteM ? `, dentro do limite de ${p.barramento.limiteM} m por linha` : ''}.` : 'barramento em eletroduto próprio.'}`] });
        if (p.painel && (p.painel.cabeado || p.painel.modulosDispositivos)) {
            const par = [p.localPainel ? p.localPainel.justificativa : ''];
            if (p.painel.cabeado) {
                par.push(`Composição: ${p.painel.itens.filter(i => i.modulos > 0).map(i => `${i.qtd} × ${i.nome}`).join('; ')}.`);
                par.push(`${p.painel.modulosDispositivos} módulos ocupados + ${p.painel.modulosReserva} de reserva → caixa de ${p.painel.caixa.modulos} módulos (${p.painel.caixa.fileiras} fileiras).`);
                if (p.painel.fonte) par.push(`Fonte 24 Vcc: consumo de ${String(p.painel.fonte.consumoW).replace('.', ',')} W × 1,25 = ${String(p.painel.fonte.necessariaW).replace('.', ',')} W → fonte de ${p.painel.fonte.potenciaW} W.`);
                if (p.painel.linhasKnx) par.push(`KNX: ${p.painel.dispositivosBarramento} aparelhos no barramento em ${p.painel.linhasKnx} linha(s), cerca de ${p.painel.consumoBusMa} mA; fonte de 640 mA por linha${p.painel.linhasKnx > 1 ? ' e acopladores de linha' : ''}.`);
            }
            s.push({ titulo: '5. Painel de automação', paragrafos: par.filter(Boolean).concat(p.painel.alertas || []) });
        }
        const imp = impactoEletrico(p);
        s.push({ titulo: '6. Impacto na instalação elétrica', paragrafos: imp.linhas });
        s.push({ titulo: '7. Nobreak', paragrafos: p.nobreak ? [p.nobreak.justificativa, `Circuito dedicado no QDC: ${p.nobreak.circuito.potVA} VA em ${p.nobreak.circuito.tensao} V (Ib = ${String(p.nobreak.circuito.ib).replace('.', ',')} A), com disjuntor e cabo dimensionados pela NBR 5410 no quadro de circuitos.`].concat(p.nobreak.alternativaDC ? [p.nobreak.alternativaDC.texto] : []) : ['Não exigido pela especificação: sem nobreak no orçamento e no quadro.'] });
        if (p.cenas && p.cenas.length) s.push({ titulo: '8. Cenas sugeridas', paragrafos: p.cenas.map(c => `${c.nome} (${c.gatilho.toLowerCase()}): ${c.acoes.join('; ')}.`) });
        return s;
    }

    return Object.freeze({
        DATA_REFERENCIA, TECNOLOGIAS, ECOSSISTEMAS, CRITERIOS, ROTULO_COMPAT, TIPOS, NIVEIS, MATERIAIS_PAREDE, TIPOS_LAMPADA,
        GRUPOS_CANAIS, TAMANHOS_CAIXA, MARGEM_DESVANECIMENTO,
        tecnologia, ehCabeada, perfilAmbiente, contatorPara, levantarDispositivos, resumoPorComodo,
        prioridadesAutomaticas, dificuldades, pontuarTecnologias,
        geometriaPlanta, paredesNoSegmento, perdaEnlace, criarSimulador, simularRede, sugerirHub, sugerirRepetidores, mapaDeCalor,
        agruparCanais, distribuirEmFileiras, caixaComercial, montarPainel, itensDinDoPainel, decidirLocalPainel, metragemBarramento,
        cargasNobreakSugeridas, dimensionarNobreak, sugerirCenas, listaMateriais, quantidadesMaoDeObra, impactoEletrico, gerarMemorial
    });
});

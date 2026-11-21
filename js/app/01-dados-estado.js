/* PRO-ELÉTRICA CAD — 01-dados-estado.js
   Biblioteca de cargas/aparelhos, sugestões de TUE por cômodo e o objeto global `state`.
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        // =========================================================================
        // BIBLIOTECA EXTENSIVA DE CARGAS E APARELHOS DO MERCADO BRASILEIRO (NBR 5410)
        // =========================================================================
        const SUGESTOES_CARGAS_BR = [
            // 1. BANHEIRO, SUÍTE & HIDRO (TUE)
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Chuveiro Elétrico Turbo Master', tipo: 'TUE', pot: 7500, tensao: 220, altura: 'alta', icon: 'fa-shower', desc: 'Chuveiro eletrônico pressurizado' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Chuveiro Elétrico Turbo Blindado', tipo: 'TUE', pot: 6800, tensao: 220, altura: 'alta', icon: 'fa-shower', desc: 'Resistência blindada contra água dura' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Chuveiro Elétrico Convencional 220V', tipo: 'TUE', pot: 5500, tensao: 220, altura: 'alta', icon: 'fa-shower', desc: 'Chuveiro multitemperaturas padrão 220V' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Chuveiro Elétrico Convencional 127V', tipo: 'TUE', pot: 5500, tensao: 127, altura: 'alta', icon: 'fa-shower', desc: 'Chuveiro 127V (demanda Ib=43.3A)' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Ducha Higiênica Aquecida 220V', tipo: 'TUE', pot: 3500, tensao: 220, altura: 'media', icon: 'fa-spray-can-sparkles', desc: 'Aquecedor individual para ducha higiênica' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Ducha Higiênica Aquecida 127V', tipo: 'TUE', pot: 3500, tensao: 127, altura: 'media', icon: 'fa-spray-can-sparkles', desc: 'Aquecedor individual ducha 127V (demanda 27.5A)' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Torneira Elétrica Banheiro / Lavatório', tipo: 'TUE', pot: 4500, tensao: 220, altura: 'media', icon: 'fa-faucet-drip', desc: 'Torneira elétrica bica móvel lavatório' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Hidromassagem Individual (1.0 HP)', tipo: 'TUE', pot: 1500, tensao: 220, altura: 'baixa', icon: 'fa-hot-tub-person', desc: 'Motobomba banheira com IDR 30mA' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Hidromassagem Dupla / Spa (1.5 HP)', tipo: 'TUE', pot: 2500, tensao: 220, altura: 'baixa', icon: 'fa-hot-tub-person', desc: 'Motobomba + aquecedor auxiliar banheira' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Banheira Jacuzzi c/ Aquecimento', tipo: 'TUE', pot: 3500, tensao: 220, altura: 'baixa', icon: 'fa-hot-tub-person', desc: 'Sistema integrado hidromassagem e aquecimento' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Toalheiro Térmico / Secador de Toalhas 220V', tipo: 'TUE', pot: 150, tensao: 220, altura: 'media', icon: 'fa-rug', desc: 'Aquecedor de toalhas de parede' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Toalheiro Térmico / Secador 127V', tipo: 'TUE', pot: 150, tensao: 127, altura: 'media', icon: 'fa-rug', desc: 'Aquecedor de toalhas de parede 127V' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Secador de Cabelo de Parede Hotel', tipo: 'TUE', pot: 1800, tensao: 220, altura: 'media', icon: 'fa-wind', desc: 'Secador fixo em suporte de parede' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Sauna Seca Residencial', tipo: 'TUE', pot: 6000, tensao: 220, altura: 'baixa', icon: 'fa-temperature-high', desc: 'Gerador elétrico para sauna seca 220V' },
            { grupo: 'Banheiro & Suíte (TUE)', nome: 'Sauna Úmida a Vapor', tipo: 'TUE', pot: 9000, tensao: 220, altura: 'baixa', icon: 'fa-cloud', desc: 'Gerador de vapor para sauna úmida' },

            // 2. COZINHA, COPA & ESPAÇO GOURMET (TUE)
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Cooktop por Indução 4 Bocas', tipo: 'TUE', pot: 7200, tensao: 220, altura: 'baixa', icon: 'fa-fire-burner', desc: 'Fogão de indução 4 zonas turbo' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Cooktop por Indução 2 Bocas / Dominó', tipo: 'TUE', pot: 3600, tensao: 220, altura: 'baixa', icon: 'fa-fire-burner', desc: 'Fogão de indução 2 zonas' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Cooktop Vitrocerâmico Elétrico 4 Bocas', tipo: 'TUE', pot: 6000, tensao: 220, altura: 'baixa', icon: 'fa-fire-burner', desc: 'Cooktop por resistência radiante' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Forno Elétrico de Embutir Grande (70L+)', tipo: 'TUE', pot: 3500, tensao: 220, altura: 'media', icon: 'fa-temperature-arrow-up', desc: 'Forno de embutir alta capacidade com convecção' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Forno Elétrico de Embutir Padrão (50L)', tipo: 'TUE', pot: 2800, tensao: 220, altura: 'media', icon: 'fa-temperature-arrow-up', desc: 'Forno elétrico de bancada ou torre quente' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Forno Micro-ondas de Embutir 220V', tipo: 'TUE', pot: 1400, tensao: 220, altura: 'media', icon: 'fa-microchip', desc: 'Micro-ondas com grill de torre quente 220V' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Forno Micro-ondas de Embutir 127V', tipo: 'TUE', pot: 1400, tensao: 127, altura: 'media', icon: 'fa-microchip', desc: 'Micro-ondas com grill de torre quente 127V' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Torneira Elétrica Cozinha 220V', tipo: 'TUE', pot: 5500, tensao: 220, altura: 'media', icon: 'fa-faucet', desc: 'Torneira elétrica desengordurante' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Torneira Elétrica Cozinha 127V', tipo: 'TUE', pot: 4500, tensao: 127, altura: 'media', icon: 'fa-faucet', desc: 'Torneira elétrica 127V (demanda 35.4A)' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Aquecedor Elétrico de Pia (Sob Bancada)', tipo: 'TUE', pot: 4500, tensao: 220, altura: 'baixa', icon: 'fa-fire', desc: 'Mini-boiler instantâneo sob a cuba' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Lava-Louças Grande 14 Serviços', tipo: 'TUE', pot: 1800, tensao: 220, altura: 'media', icon: 'fa-sink', desc: 'Máquina de lavar louças de embutir ou piso' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Lava-Louças Compacta 8 Serviços 220V', tipo: 'TUE', pot: 1500, tensao: 220, altura: 'media', icon: 'fa-sink', desc: 'Lava-louças compacta de nicho 220V' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Lava-Louças Compacta 8 Serviços 127V', tipo: 'TUE', pot: 1500, tensao: 127, altura: 'media', icon: 'fa-sink', desc: 'Lava-louças compacta 127V (demanda 11.8A)' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Triturador de Alimentos de Pia 1.0 HP', tipo: 'TUE', pot: 750, tensao: 220, altura: 'baixa', icon: 'fa-blender', desc: 'Triturador de resíduos orgânicos sob a cuba' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Triturador de Alimentos 127V', tipo: 'TUE', pot: 750, tensao: 127, altura: 'baixa', icon: 'fa-blender', desc: 'Triturador de resíduos sob a cuba 127V' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Coifa / Depurador Ilha Alta Sucção', tipo: 'TUE', pot: 350, tensao: 220, altura: 'alta', icon: 'fa-fan', desc: 'Coifa central de ilha com exaustão forçada' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Coifa de Parede / Depurador 127V', tipo: 'TUE', pot: 250, tensao: 127, altura: 'alta', icon: 'fa-fan', desc: 'Coifa de parede com iluminação LED integrada' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Churrasqueira Elétrica de Embutir Gourmet', tipo: 'TUE', pot: 3000, tensao: 220, altura: 'media', icon: 'fa-drumstick-bite', desc: 'Grill elétrico com refratários para bancada' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Forno de Pizza Elétrico de Embutir', tipo: 'TUE', pot: 2500, tensao: 220, altura: 'media', icon: 'fa-pizza-slice', desc: 'Forno refratário elétrico até 400°C' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Gaveta Aquecida de Louças (Warming Drawer)', tipo: 'TUE', pot: 600, tensao: 220, altura: 'baixa', icon: 'fa-box-archive', desc: 'Gaveta térmica de embutir sob o forno' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Máquina de Gelo (Ice Maker) Embutida', tipo: 'TUE', pot: 250, tensao: 220, altura: 'media', icon: 'fa-cubes', desc: 'Fabricador de gelo com abastecimento direto' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Cafeteira Expresso de Embutir', tipo: 'TUE', pot: 1500, tensao: 220, altura: 'media', icon: 'fa-mug-hot', desc: 'Máquina de café barista em torre de nicho' },
            { grupo: 'Cozinha & Espaço Gourmet (TUE)', nome: 'Chopeira Elétrica Residencial Gourmet', tipo: 'TUE', pot: 650, tensao: 220, altura: 'media', icon: 'fa-beer-mug-empty', desc: 'Chopeira torre a gelo/compressor' },

            // 3. ÁREA DE SERVIÇO & LAVANDERIA (TUE)
            { grupo: 'Área de Serviço & Lavanderia (TUE)', nome: 'Máquina Lava e Seca Front Load 220V', tipo: 'TUE', pot: 2200, tensao: 220, altura: 'media', icon: 'fa-soap', desc: 'Lavadora e secadora automática com aquecimento' },
            { grupo: 'Área de Serviço & Lavanderia (TUE)', nome: 'Máquina Lava e Seca Front Load 127V', tipo: 'TUE', pot: 2000, tensao: 127, altura: 'media', icon: 'fa-soap', desc: 'Lava e seca 127V (demanda 15.7A)' },
            { grupo: 'Área de Serviço & Lavanderia (TUE)', nome: 'Secadora de Roupas Elétrica Parede/Piso', tipo: 'TUE', pot: 3500, tensao: 220, altura: 'alta', icon: 'fa-wind', desc: 'Secadora de roupas por resistência térmica' },
            { grupo: 'Área de Serviço & Lavanderia (TUE)', nome: 'Secadora de Roupas a Gás (Tomada de Comando)', tipo: 'TUE', pot: 400, tensao: 127, altura: 'media', icon: 'fa-fire-flame-simple', desc: 'Ponto elétrico para comando da secadora a gás' },
            { grupo: 'Área de Serviço & Lavanderia (TUE)', nome: 'Torneira Elétrica Tanque / Lavanderia', tipo: 'TUE', pot: 4500, tensao: 220, altura: 'media', icon: 'fa-faucet', desc: 'Torneira com aquecimento elétrico para tanque' },
            { grupo: 'Área de Serviço & Lavanderia (TUE)', nome: 'Boiler Central de Água Quente 200L', tipo: 'TUE', pot: 3000, tensao: 220, altura: 'alta', icon: 'fa-cubes-stacked', desc: 'Reservatório térmico com aquecedor de apoio' },
            { grupo: 'Área de Serviço & Lavanderia (TUE)', nome: 'Boiler Central de Água Quente 300L/400L', tipo: 'TUE', pot: 5000, tensao: 220, altura: 'alta', icon: 'fa-cubes-stacked', desc: 'Boiler alta capacidade residencial' },
            { grupo: 'Área de Serviço & Lavanderia (TUE)', nome: 'Pressurizador de Água Sanitária 220V', tipo: 'TUE', pot: 550, tensao: 220, altura: 'baixa', icon: 'fa-gauge-high', desc: 'Bomba pressurizadora da rede de água fria/quente' },
            { grupo: 'Área de Serviço & Lavanderia (TUE)', nome: 'Pressurizador de Água Sanitária 127V', tipo: 'TUE', pot: 550, tensao: 127, altura: 'baixa', icon: 'fa-gauge-high', desc: 'Bomba pressurizadora 127V' },
            { grupo: 'Área de Serviço & Lavanderia (TUE)', nome: 'Passadeira a Vapor / Estação Profissional', tipo: 'TUE', pot: 2000, tensao: 220, altura: 'media', icon: 'fa-shirt', desc: 'Ferro com caldeira de vapor contínuo' },

            // 4. CLIMATIZAÇÃO & CONFORTO TÉRMICO (TUE)
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Ar Condicionado Split Inverter 7.000 BTU', tipo: 'TUE', pot: 750, tensao: 220, altura: 'alta', icon: 'fa-snowflake', desc: 'Quartos compactos até 9m²' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Ar Condicionado Split Inverter 9.000 BTU', tipo: 'TUE', pot: 900, tensao: 220, altura: 'alta', icon: 'fa-snowflake', desc: 'Dormitórios médios até 14m²' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Ar Condicionado Split Inverter 12.000 BTU', tipo: 'TUE', pot: 1150, tensao: 220, altura: 'alta', icon: 'fa-snowflake', desc: 'Suíte master e home offices até 20m²' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Ar Condicionado Split Inverter 18.000 BTU', tipo: 'TUE', pot: 1700, tensao: 220, altura: 'alta', icon: 'fa-snowflake', desc: 'Salas e ambientes integrados até 30m²' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Ar Condicionado Split Inverter 24.000 BTU', tipo: 'TUE', pot: 2300, tensao: 220, altura: 'alta', icon: 'fa-snowflake', desc: 'Salas amplas e espaços gourmet até 40m²' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Ar Condicionado Split Inverter 30.000 BTU', tipo: 'TUE', pot: 2900, tensao: 220, altura: 'alta', icon: 'fa-snowflake', desc: 'Grandes salões até 50m²' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Ar Condicionado Cassete / Piso-Teto 36.000 BTU', tipo: 'TUE', pot: 3500, tensao: 220, altura: 'alta', icon: 'fa-snowflake', desc: 'Embutido no gesso para áreas sociais' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Ar Condicionado Central Dutado 48.000 BTU', tipo: 'TUE', pot: 4800, tensao: 220, altura: 'alta', icon: 'fa-snowflake', desc: 'Sistema central com dutos e grelhas lineares' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Ar Condicionado de Janela 10.000 BTU 220V', tipo: 'TUE', pot: 1000, tensao: 220, altura: 'alta', icon: 'fa-snowflake', desc: 'Aparelho compacto monobloco 220V' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Ar Condicionado de Janela 10.000 BTU 127V', tipo: 'TUE', pot: 1000, tensao: 127, altura: 'alta', icon: 'fa-snowflake', desc: 'Aparelho compacto monobloco 127V' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Piso Aquecido Quarto/Banheiro (5 m²)', tipo: 'TUE', pot: 750, tensao: 220, altura: 'baixa', icon: 'fa-border-none', desc: 'Manta térmica elétrica sob porcelanato (150W/m²)' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Piso Aquecido Sala/Área Ampla (10 m²)', tipo: 'TUE', pot: 1500, tensao: 220, altura: 'baixa', icon: 'fa-border-none', desc: 'Calefação elétrica radiante de piso' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Aquecedor Termoventilador Ambiente 220V', tipo: 'TUE', pot: 2000, tensao: 220, altura: 'baixa', icon: 'fa-sun', desc: 'Calefator elétrico de ambiente 220V' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Aquecedor de Ambiente Óleo / Convector 127V', tipo: 'TUE', pot: 1500, tensao: 127, altura: 'baixa', icon: 'fa-sun', desc: 'Aquecedor de convecção 127V' },
            { grupo: 'Climatização & Conforto (TUE)', nome: 'Desumidificador de Ar Ambiente', tipo: 'TUE', pot: 400, tensao: 127, altura: 'media', icon: 'fa-droplet-slash', desc: 'Controle de umidade para closets e bibliotecas' },

            // 5. GARAGEM, VEÍCULOS & ÁREA EXTERNA (TUE)
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Carregador Carro Elétrico Wallbox 7.4 kW (Monofásico/Bifásico)', tipo: 'TUE', pot: 7400, tensao: 220, altura: 'media', icon: 'fa-car-battery', desc: 'Estação de recarga veicular Tipo 2 32A' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Carregador Veicular Rápido 11 kW (Trifásico 16A)', tipo: 'TUE', pot: 11000, tensao: 220, altura: 'media', icon: 'fa-car-battery', desc: 'Recarga veicular rápida trifásica 380V/220V' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Carregador Veicular Rápido 22 kW (Trifásico 32A)', tipo: 'TUE', pot: 22000, tensao: 220, altura: 'media', icon: 'fa-car-battery', desc: 'Estação ultra rápida comercial/residencial' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Carregador Veicular Portátil Tomada 20A / 3.5 kW', tipo: 'TUE', pot: 3500, tensao: 220, altura: 'media', icon: 'fa-car-battery', desc: 'Ponto dedicado de recarga lenta com plugue 20A' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Bomba Filtro de Piscina 0.75 HP', tipo: 'TUE', pot: 550, tensao: 220, altura: 'baixa', icon: 'fa-water', desc: 'Motobomba de circulação e filtragem' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Bomba Filtro de Piscina 1.0 HP', tipo: 'TUE', pot: 750, tensao: 220, altura: 'baixa', icon: 'fa-water', desc: 'Motobomba piscina média com IDR 30mA' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Bomba Filtro de Piscina 1.5 HP', tipo: 'TUE', pot: 1100, tensao: 220, altura: 'baixa', icon: 'fa-water', desc: 'Motobomba piscina grande' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Aquecedor Piscina Bomba de Calor Inverter', tipo: 'TUE', pot: 4500, tensao: 220, altura: 'baixa', icon: 'fa-temperature-arrow-up', desc: 'Trocador de calor elétrico para piscina' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Cascata / Hidromassagem da Piscina', tipo: 'TUE', pot: 1100, tensao: 220, altura: 'baixa', icon: 'fa-water', desc: 'Motobomba auxiliar para efeitos de água' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Motor Portão Eletrônico Garagem 220V', tipo: 'TUE', pot: 400, tensao: 220, altura: 'alta', icon: 'fa-door-open', desc: 'Automatizador basculante/deslizante rápido' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Motor Portão Eletrônico Garagem 127V', tipo: 'TUE', pot: 400, tensao: 127, altura: 'alta', icon: 'fa-door-open', desc: 'Automatizador portão 127V' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Bomba Submersa de Poço / Drenagem 1.5 HP', tipo: 'TUE', pot: 1100, tensao: 220, altura: 'baixa', icon: 'fa-water', desc: 'Bomba centrífuga submersa poço artesiano' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Sistema de Irrigação Automatizado Jardim', tipo: 'TUE', pot: 500, tensao: 220, altura: 'media', icon: 'fa-seedling', desc: 'Controlador de eletroválvulas + bomba booster' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Lavadora de Alta Pressão Externa (Wap)', tipo: 'TUE', pot: 2000, tensao: 220, altura: 'media', icon: 'fa-spray-can', desc: 'Tomada externa IP55 com tampa para lava-jatos' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Compressor de Ar para Oficina 2 HP', tipo: 'TUE', pot: 1500, tensao: 220, altura: 'baixa', icon: 'fa-screwdriver-wrench', desc: 'Compressor pistão ferramentas pneumáticas' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Furadeira de Bancada / Serra Oficina', tipo: 'TUE', pot: 1200, tensao: 220, altura: 'media', icon: 'fa-toolbox', desc: 'Maquinário de bancada e marcenaria' },
            { grupo: 'Garagem & Área Externa (TUE)', nome: 'Cortador de Grama Elétrico / Roçadeira', tipo: 'TUE', pot: 1800, tensao: 220, altura: 'media', icon: 'fa-scissors', desc: 'Ponto externo para jardinagem pesada' },

            // 6. SALA, ESCRITÓRIO, TI & AUTOMAÇÃO (TUE)
            { grupo: 'Sala, Escritório & Automação (TUE)', nome: 'Nobreak Senoidal Online / Rack TI 220V', tipo: 'TUE', pot: 1200, tensao: 220, altura: 'baixa', icon: 'fa-server', desc: 'Alimentação ininterrupta para rede estruturada' },
            { grupo: 'Sala, Escritório & Automação (TUE)', nome: 'Nobreak Senoidal / Rack Servidor 127V', tipo: 'TUE', pot: 1000, tensao: 127, altura: 'baixa', icon: 'fa-server', desc: 'Alimentação para roteadores, switch PoE e CFTV' },
            { grupo: 'Sala, Escritório & Automação (TUE)', nome: 'Workstation / Render & PC Gamer Extremo', tipo: 'TUE', pot: 850, tensao: 127, altura: 'baixa', icon: 'fa-desktop', desc: 'Computador profissional com fonte de alta demanda' },
            { grupo: 'Sala, Escritório & Automação (TUE)', nome: 'Projetor Home Cinema 4K + Telão Retrátil', tipo: 'TUE', pot: 450, tensao: 220, altura: 'alta', icon: 'fa-video', desc: 'Alimentação de teto para projetor motorizado' },
            { grupo: 'Sala, Escritório & Automação (TUE)', nome: 'Cortina / Persiana Motorizada Integrada', tipo: 'TUE', pot: 150, tensao: 127, altura: 'alta', icon: 'fa-blinds', desc: 'Motor tubular no cortineiro de gesso' },
            { grupo: 'Sala, Escritório & Automação (TUE)', nome: 'Elevador Residencial / Plataforma Acessibilidade', tipo: 'TUE', pot: 2200, tensao: 220, altura: 'alta', icon: 'fa-elevator', desc: 'Quadro de comando para plataforma elevatória' },

            // 7. ELETRODOMÉSTICOS GERAIS E MULTIUSO (TUG)
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Air Fryer (Fritadeira sem Óleo) 127V', tipo: 'TUG', pot: 1500, tensao: 127, altura: 'media', icon: 'fa-kitchen-set', desc: 'Fritadeira de bancada 127V' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Air Fryer (Fritadeira sem Óleo) 220V', tipo: 'TUG', pot: 1800, tensao: 220, altura: 'media', icon: 'fa-kitchen-set', desc: 'Fritadeira de bancada 220V' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Micro-ondas Bancada 127V', tipo: 'TUG', pot: 1200, tensao: 127, altura: 'media', icon: 'fa-microchip', desc: 'Forno micro-ondas comum' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Geladeira Frost Free Duplex 127V', tipo: 'TUG', pot: 300, tensao: 127, altura: 'media', icon: 'fa-snowflake', desc: 'Refrigerador duplex convencional' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Geladeira French Door / Side by Side', tipo: 'TUG', pot: 500, tensao: 127, altura: 'media', icon: 'fa-snowflake', desc: 'Refrigerador de grande porte multi portas' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Freezer Vertical Frost Free', tipo: 'TUG', pot: 350, tensao: 127, altura: 'media', icon: 'fa-snowflake', desc: 'Freezer auxiliar para cozinha ou despensa' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Adega Climatizada 24-40 Garrafas', tipo: 'TUG', pot: 200, tensao: 127, altura: 'baixa', icon: 'fa-wine-bottle', desc: 'Adega de vinhos com compressor silencioso' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Cervejeira Frost Free Especial', tipo: 'TUG', pot: 300, tensao: 127, altura: 'media', icon: 'fa-beer-mug-empty', desc: 'Refrigerador especial para bebidas (-4°C)' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Purificador / Bebedouro Refrigerado', tipo: 'TUG', pot: 120, tensao: 127, altura: 'media', icon: 'fa-droplet', desc: 'Purificador de água com água gelada' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Cafeteira Expresso de Bancada', tipo: 'TUG', pot: 1200, tensao: 127, altura: 'media', icon: 'fa-mug-hot', desc: 'Cafeteira de cápsulas ou pó' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Sanduicheira / Grill Portátil', tipo: 'TUG', pot: 800, tensao: 127, altura: 'media', icon: 'fa-burger', desc: 'Grill de apoio' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Liquidificador / Processador', tipo: 'TUG', pot: 1000, tensao: 127, altura: 'media', icon: 'fa-blender', desc: 'Eletroportátil de alta potência' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Batedeira Planetária', tipo: 'TUG', pot: 600, tensao: 127, altura: 'media', icon: 'fa-cake-candles', desc: 'Batedeira para massas pesadas' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Lavadora de Roupas Top Load (Abertura Superior)', tipo: 'TUG', pot: 800, tensao: 127, altura: 'media', icon: 'fa-soap', desc: 'Lavadora mecânica sem aquecimento' },
            { grupo: 'Cozinha & Serviço (TUG)', nome: 'Tanquinho Lavadora Semi-automática', tipo: 'TUG', pot: 450, tensao: 127, altura: 'media', icon: 'fa-soap', desc: 'Lavadora por turbilhonamento' },

            // 8. SALA & QUARTO (TUG)
            { grupo: 'Sala & Quarto (TUG)', nome: 'Smart TV 55"/65" 4K LED', tipo: 'TUG', pot: 120, tensao: 127, altura: 'media', icon: 'fa-tv', desc: 'Televisor inteligente em painel' },
            { grupo: 'Sala & Quarto (TUG)', nome: 'Smart TV 75"/85" Neo QLED / OLED', tipo: 'TUG', pot: 250, tensao: 127, altura: 'media', icon: 'fa-tv', desc: 'Televisor de grande porte para sala principal' },
            { grupo: 'Sala & Quarto (TUG)', nome: 'Home Theater / Receiver Surround 7.1', tipo: 'TUG', pot: 400, tensao: 127, altura: 'baixa', icon: 'fa-volume-high', desc: 'Amplificador e caixas acústicas' },
            { grupo: 'Sala & Quarto (TUG)', nome: 'Computador PC / Home Office', tipo: 'TUG', pot: 350, tensao: 127, altura: 'baixa', icon: 'fa-desktop', desc: 'Desktop padrão para estudo e trabalho' },
            { grupo: 'Sala & Quarto (TUG)', nome: 'Carregadores de Celular / Notebook (USB-C)', tipo: 'TUG', pot: 100, tensao: 127, altura: 'baixa', icon: 'fa-plug', desc: 'Ponto para cabeceira de cama e bancadas' },
            { grupo: 'Sala & Quarto (TUG)', nome: 'Aspirador Robô c/ Base de Carga', tipo: 'TUG', pot: 50, tensao: 127, altura: 'baixa', icon: 'fa-circle-dot', desc: 'Estação de recarga inteligente de piso' },
            { grupo: 'Sala & Quarto (TUG)', nome: 'Aspirador de Pó Vertical / Trenó', tipo: 'TUG', pot: 1400, tensao: 127, altura: 'baixa', icon: 'fa-broom', desc: 'Aspirador de alta sucção portátil' },
            { grupo: 'Sala & Quarto (TUG)', nome: 'Tomada Uso Geral 10A (NBR 5410)', tipo: 'TUG', pot: 100, tensao: 127, altura: 'baixa', icon: 'fa-plug', desc: 'Tomada residencial padrão 100 VA' },
            { grupo: 'Sala & Quarto (TUG)', nome: 'Tomada Serviço / Bancada 20A', tipo: 'TUG', pot: 600, tensao: 127, altura: 'media', icon: 'fa-plug', desc: 'Tomada de uso geral com capacidade até 20A (600 VA)' }
        ];

        // =========================================================================
        // MOTOR DE SUGESTÃO INTELIGENTE DE TUES POR CÔMODO (NBR 5410)
        // =========================================================================
        function obterTuesSugeridasPorComodo(c) {
            if (!c) return [];
            const nomeLower = (c.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const tipoLower = (c.tipo || '').toLowerCase();
            const tues = [];

            const ehLavabo = nomeLower.includes('lavabo');
            const ehBanheiro = nomeLower.includes('banh') || nomeLower.includes('suite') || nomeLower.includes('wc') || nomeLower.includes('sanit') || ehLavabo;
            const ehCozinha = nomeLower.includes('cozinha') || nomeLower.includes('copa') || (tipoLower.includes('servico') && !ehBanheiro && !nomeLower.includes('lavand') && !nomeLower.includes('area'));
            const ehLavanderia = nomeLower.includes('lavand') || nomeLower.includes('servico') || nomeLower.includes('area de serv');
            const ehQuarto = nomeLower.includes('quarto') || nomeLower.includes('dorm') || nomeLower.includes('suite') || nomeLower.includes('closet');
            const ehSala = nomeLower.includes('sala') || nomeLower.includes('estar') || nomeLower.includes('living') || nomeLower.includes('tv') || nomeLower.includes('home');
            const ehGourmet = nomeLower.includes('gourmet') || nomeLower.includes('churrasq') || nomeLower.includes('varanda') || nomeLower.includes('terraco');
            const ehGaragem = nomeLower.includes('garag') || nomeLower.includes('abrigo') || nomeLower.includes('estacion');
            const ehEscritorio = nomeLower.includes('escrit') || nomeLower.includes('office') || nomeLower.includes('estud') || nomeLower.includes('bibliot');
            const ehPiscina = nomeLower.includes('piscin') || nomeLower.includes('extern') || nomeLower.includes('jardim') || nomeLower.includes('quintal') || nomeLower.includes('maquin');

            if (ehLavabo) {
                tues.push({ nome: 'Torneira Elétrica Banheiro / Lavatório', pot: 4500, tensao: 220, altura: 'media', padraoSelecionado: true, icon: 'fa-faucet-drip', obs: 'Água quente no lavatório (NBR 5410)' });
                tues.push({ nome: 'Toalheiro Térmico / Secador de Toalhas 220V', pot: 150, tensao: 220, altura: 'media', padraoSelecionado: false, icon: 'fa-rug', obs: 'Conforto térmico' });
                tues.push({ nome: 'Secador de Cabelo de Parede Hotel', pot: 1800, tensao: 220, altura: 'media', padraoSelecionado: false, icon: 'fa-wind', obs: 'Ponto dedicado de secador' });
            } else if (ehBanheiro) {
                tues.push({ nome: 'Chuveiro Elétrico Turbo Master', pot: 7500, tensao: 220, altura: 'alta', padraoSelecionado: true, icon: 'fa-shower', obs: 'Item 9.5.3.1 NBR 5410 - Circuito Exclusivo' });
                tues.push({ nome: 'Chuveiro Elétrico Convencional 220V', pot: 5500, tensao: 220, altura: 'alta', padraoSelecionado: false, icon: 'fa-shower', obs: 'Alternativa convencional' });
                tues.push({ nome: 'Torneira Elétrica Banheiro / Lavatório', pot: 4500, tensao: 220, altura: 'media', padraoSelecionado: false, icon: 'fa-faucet-drip', obs: 'Água quente em cuba' });
                tues.push({ nome: 'Ducha Higiênica Aquecida 220V', pot: 3500, tensao: 220, altura: 'media', padraoSelecionado: false, icon: 'fa-spray-can-sparkles', obs: 'Aquecedor individual' });
                tues.push({ nome: 'Toalheiro Térmico / Secador de Toalhas 220V', pot: 150, tensao: 220, altura: 'media', padraoSelecionado: false, icon: 'fa-rug', obs: 'Toalhas secas e aquecidas' });
                if (nomeLower.includes('master') || nomeLower.includes('hidro') || nomeLower.includes('spa') || nomeLower.includes('banheira')) {
                    tues.push({ nome: 'Hidromassagem Dupla / Spa (1.5 HP)', pot: 2500, tensao: 220, altura: 'baixa', padraoSelecionado: true, icon: 'fa-hot-tub-person', obs: 'Motobomba com proteção IDR' });
                } else {
                    tues.push({ nome: 'Hidromassagem Individual (1.0 HP)', pot: 1500, tensao: 220, altura: 'baixa', padraoSelecionado: false, icon: 'fa-hot-tub-person', obs: 'Banheira de hidromassagem' });
                }
            }

            if (ehCozinha) {
                tues.push({ nome: 'Cooktop por Indução 4 Bocas', pot: 7200, tensao: 220, altura: 'baixa', padraoSelecionado: true, icon: 'fa-fire-burner', obs: 'Circuito Exclusivo' });
                tues.push({ nome: 'Forno Elétrico de Embutir Padrão (50L)', pot: 2800, tensao: 220, altura: 'media', padraoSelecionado: true, icon: 'fa-temperature-arrow-up', obs: 'Torre quente convecção' });
                tues.push({ nome: 'Torneira Elétrica Cozinha 220V', pot: 5500, tensao: 220, altura: 'media', padraoSelecionado: true, icon: 'fa-faucet', obs: 'Água quente para desengordurar' });
                tues.push({ nome: 'Lava-Louças Grande 14 Serviços', pot: 1800, tensao: 220, altura: 'media', padraoSelecionado: true, icon: 'fa-sink', obs: 'Máquina de lavar louça' });
                tues.push({ nome: 'Forno Micro-ondas de Embutir 220V', pot: 1400, tensao: 220, altura: 'media', padraoSelecionado: false, icon: 'fa-microchip', obs: 'Micro-ondas dedicado em torre quente' });
                tues.push({ nome: 'Coifa / Depurador Ilha Alta Sucção', pot: 350, tensao: 220, altura: 'alta', padraoSelecionado: false, icon: 'fa-fan', obs: 'Exaustor de ilha / teto' });
                tues.push({ nome: 'Triturador de Alimentos de Pia 1.0 HP', pot: 750, tensao: 220, altura: 'baixa', padraoSelecionado: false, icon: 'fa-blender', obs: 'Triturador na cuba inox' });
                tues.push({ nome: 'Aquecedor Elétrico de Pia (Sob Bancada)', pot: 4500, tensao: 220, altura: 'baixa', padraoSelecionado: false, icon: 'fa-fire', obs: 'Aquecedor individual sob pia' });
            }

            if (ehLavanderia) {
                tues.push({ nome: 'Máquina Lava e Seca Front Load 220V', pot: 2200, tensao: 220, altura: 'media', padraoSelecionado: true, icon: 'fa-soap', obs: 'Ciclo lavagem com água aquecida' });
                tues.push({ nome: 'Secadora de Roupas Elétrica Parede/Piso', pot: 3500, tensao: 220, altura: 'alta', padraoSelecionado: true, icon: 'fa-wind', obs: 'Resistência térmica alta demanda' });
                tues.push({ nome: 'Torneira Elétrica Tanque / Lavanderia', pot: 4500, tensao: 220, altura: 'media', padraoSelecionado: false, icon: 'fa-faucet', obs: 'Tanque aquecido' });
                tues.push({ nome: 'Boiler Central de Água Quente 200L', pot: 3000, tensao: 220, altura: 'alta', padraoSelecionado: false, icon: 'fa-cubes-stacked', obs: 'Aquecedor central acumulador' });
                tues.push({ nome: 'Pressurizador de Água Sanitária 220V', pot: 550, tensao: 220, altura: 'baixa', padraoSelecionado: false, icon: 'fa-gauge-high', obs: 'Bomba de pressão da rede' });
            }

            if (ehQuarto) {
                if (nomeLower.includes('master') || nomeLower.includes('casal')) {
                    tues.push({ nome: 'Ar Condicionado Split Inverter 12.000 BTU', pot: 1150, tensao: 220, altura: 'alta', padraoSelecionado: true, icon: 'fa-snowflake', obs: 'Climatização Suíte Master' });
                } else {
                    tues.push({ nome: 'Ar Condicionado Split Inverter 9.000 BTU', pot: 900, tensao: 220, altura: 'alta', padraoSelecionado: true, icon: 'fa-snowflake', obs: 'Climatização Dormitório' });
                }
                tues.push({ nome: 'Aquecedor Termoventilador Ambiente 220V', pot: 2000, tensao: 220, altura: 'baixa', padraoSelecionado: false, icon: 'fa-sun', obs: 'Conforto térmico no inverno' });
                tues.push({ nome: 'Piso Aquecido Quarto/Banheiro (5 m²)', pot: 750, tensao: 220, altura: 'baixa', padraoSelecionado: false, icon: 'fa-border-none', obs: 'Calefação radiante de piso' });
            }

            if (ehSala) {
                tues.push({ nome: 'Ar Condicionado Split Inverter 18.000 BTU', pot: 1700, tensao: 220, altura: 'alta', padraoSelecionado: true, icon: 'fa-snowflake', obs: 'Climatização Sala / Living amplo' });
                tues.push({ nome: 'Ar Condicionado Split Inverter 24.000 BTU', pot: 2300, tensao: 220, altura: 'alta', padraoSelecionado: false, icon: 'fa-snowflake', obs: 'Ambientes integrados e pé-direito duplo' });
                tues.push({ nome: 'Projetor Home Cinema 4K + Telão Retrátil', pot: 450, tensao: 220, altura: 'alta', padraoSelecionado: false, icon: 'fa-video', obs: 'Tomada de teto dedicada' });
                tues.push({ nome: 'Cortina / Persiana Motorizada Integrada', pot: 150, tensao: 127, altura: 'alta', padraoSelecionado: false, icon: 'fa-blinds', obs: 'Automação residencial' });
            }

            if (ehGourmet) {
                tues.push({ nome: 'Churrasqueira Elétrica de Embutir Gourmet', pot: 3000, tensao: 220, altura: 'media', padraoSelecionado: true, icon: 'fa-drumstick-bite', obs: 'Bancada gourmet' });
                tues.push({ nome: 'Cooktop por Indução 2 Bocas / Dominó', pot: 3600, tensao: 220, altura: 'baixa', padraoSelecionado: true, icon: 'fa-fire-burner', obs: 'Cooktop auxiliar de bancada' });
                tues.push({ nome: 'Ar Condicionado Split Inverter 18.000 BTU', pot: 1700, tensao: 220, altura: 'alta', padraoSelecionado: false, icon: 'fa-snowflake', obs: 'Climatização varanda fechada' });
                tues.push({ nome: 'Chopeira Elétrica Residencial Gourmet', pot: 650, tensao: 220, altura: 'media', padraoSelecionado: false, icon: 'fa-beer-mug-empty', obs: 'Ponto exclusivo para torre de chopp' });
                tues.push({ nome: 'Forno de Pizza Elétrico de Embutir', pot: 2500, tensao: 220, altura: 'media', padraoSelecionado: false, icon: 'fa-pizza-slice', obs: 'Forno pizza gourmet 400°C' });
            }

            if (ehGaragem) {
                tues.push({ nome: 'Carregador Carro Elétrico Wallbox 7.4 kW (Monofásico/Bifásico)', pot: 7400, tensao: 220, altura: 'media', padraoSelecionado: true, icon: 'fa-car-battery', obs: 'Recarga veicular Tipo 2' });
                tues.push({ nome: 'Motor Portão Eletrônico Garagem 220V', pot: 400, tensao: 220, altura: 'alta', padraoSelecionado: true, icon: 'fa-door-open', obs: 'Automatizador portão basculante' });
                tues.push({ nome: 'Lavadora de Alta Pressão Externa (Wap)', pot: 2000, tensao: 220, altura: 'media', padraoSelecionado: false, icon: 'fa-spray-can', obs: 'Tomada externa IP55 com tampa' });
                tues.push({ nome: 'Compressor de Ar para Oficina 2 HP', pot: 1500, tensao: 220, altura: 'baixa', padraoSelecionado: false, icon: 'fa-screwdriver-wrench', obs: 'Oficina / Ferramentas' });
            }

            if (ehEscritorio) {
                tues.push({ nome: 'Ar Condicionado Split Inverter 9.000 BTU', pot: 900, tensao: 220, altura: 'alta', padraoSelecionado: true, icon: 'fa-snowflake', obs: 'Climatização escritório / home office' });
                tues.push({ nome: 'Nobreak Senoidal Online / Rack TI 220V', pot: 1200, tensao: 220, altura: 'baixa', padraoSelecionado: false, icon: 'fa-server', obs: 'Alimentação estabilizada para servidores' });
                tues.push({ nome: 'Workstation / Render & PC Gamer Extremo', pot: 850, tensao: 127, altura: 'baixa', padraoSelecionado: false, icon: 'fa-desktop', obs: 'Fonte de alto desempenho' });
            }

            if (ehPiscina) {
                tues.push({ nome: 'Bomba Filtro de Piscina 1.0 HP', pot: 750, tensao: 220, altura: 'baixa', padraoSelecionado: true, icon: 'fa-water', obs: 'Motobomba com proteção IDR 30mA' });
                tues.push({ nome: 'Aquecedor Piscina Bomba de Calor Inverter', pot: 4500, tensao: 220, altura: 'baixa', padraoSelecionado: true, icon: 'fa-temperature-arrow-up', obs: 'Bomba de calor trocador térmico' });
                tues.push({ nome: 'Cascata / Hidromassagem da Piscina', pot: 1100, tensao: 220, altura: 'baixa', padraoSelecionado: false, icon: 'fa-water', obs: 'Motobomba auxiliar de hidromassagem' });
                tues.push({ nome: 'Sistema de Irrigação Automatizado Jardim', pot: 500, tensao: 220, altura: 'media', padraoSelecionado: false, icon: 'fa-seedling', obs: 'Controlador de eletroválvulas' });
            }

            if (tues.length === 0) {
                tues.push({ nome: 'Ar Condicionado Split Inverter 9.000 BTU', pot: 900, tensao: 220, altura: 'alta', padraoSelecionado: false, icon: 'fa-snowflake', obs: 'Ponto dedicado de climatização' });
            }

            return tues;
        }

        // Estado Global com Suporte Completo a Multi-Pavimentos
        const state = {
            // Camadas WOCA CAD
            camadas: {
                arquitetura: true,
                cotas: true,
                iluminacao: true,
                tomadas: true,
                eletrodutos: true,
                fiacao: true,
                qgbtUnifilar: true,
                terreno: true,
                grid: true
            },
            temaWoca: 'light',
            // Configuração do Terreno Total (Lote) vs Área Construída
            terreno: {
                ativo: true,
                largura: 12.0,      // metros de testada/frente
                comprimento: 25.0,  // metros de profundidade
                recuoFrontal: 4.0,  // metros
                recuoLateral: 1.5,  // metros
                recuoFundos: 3.0,   // metros
                x: 40,              // posição X inicial no canvas (px)
                y: 40               // posição Y inicial no canvas (px)
            },
            // Gerenciamento de Projetos e Checkpoints
            projetoAtual: {
                id: 'proj_' + Date.now(),
                nome: 'Residência Unifamiliar NBR 5410',
                template: 'casa_terrea',
                dataCriacao: new Date().toISOString(),
                ultimaModificacao: new Date().toISOString()
            },
            templateNovoProjetoSelecionado: 'em_branco',
            checkpoints: [],
            filtroElemento3d: 'todos', // 'todos' | 'ilum' | 'tomadas' | 'tubos'
            comodoArrasto3D: null,
            boundaryBoxMesh: null,

            modoCalculo: 'cad',
            ferramentaAtiva: 'select',
            ferramentaInstalacoes: 'mover_pontos',
            exibirRotulosInstalacoes: false, // Inicia limpo apenas com ícones conforme solicitado
            pavimentos: [
                { id: 'terreo', nome: 'Pavimento Térreo', nivel: 0, alturaPeDireito: 2.8, temLajePiso: true, tipoLajePiso: 'concreto', espessuraLajePiso: 0.20, temLajeTeto: true, tipoLajeTeto: 'concreto', espessuraLajeTeto: 0.15, tipoPassagemCabos: 'teto' },
                { id: 'superior', nome: '1º Pavimento (Superior)', nivel: 1, alturaPeDireito: 2.8, temLajePiso: true, tipoLajePiso: 'concreto', espessuraLajePiso: 0.20, temLajeTeto: true, tipoLajeTeto: 'concreto', espessuraLajeTeto: 0.15, tipoPassagemCabos: 'teto' }
            ],
            pavimentoAtivoId: 'terreo',
            exibirGabaritoFantasma: true,
            exibirLajesPiso3D: true,
            exibirLajesTeto3D: true,
            comodos: [],
            pontosEletricos: [],
            eletrodutoWaypoints: {},
            linhasMaoLivre: [],
            linhaAtual: null,
            qdtPos: { x: 40, y: 40, w: 45, h: 26 },
            prumadaPos: { x: 85, y: 45, w: 20, h: 20 },
            prumadaAtiva: true,
            alimentacaoExterna: { x: 40, y: 440, w: 75, h: 36, distanciaManual: null, sistema: 'bifasico' },
            escala: 40,
            comodosFixados: false,
            terreno: { ativo: true, largura: 12.0, comprimento: 25.0, recuoFrontal: 4.0, recuoLateral: 1.5, recuoFundos: 3.0, x: 40, y: 40, customizado: false },
            arrastando: null,
            arrastandoInstalacoes: null,
            offsetArrasto: { x: 0, y: 0 },
            // Modo Encaixe Magnético (Ímã de Cômodos) e Legenda de Transições
            snapMagnetico: true,
            linhasGuiaMagnetica: [],
            exibirLegendaTransicoes: true,
            exibirRotulosTransicoesTexto: false,
            comodoEmEdicaoId: null,
            pontoSelecionadoId: null,
            cargasFormulario: [],
            comprimentosManuaisCircuitos: {},
            transicoes: [],
            escadas: [],
            transicaoAtiva: null,
            circuitosCalculados: [],
            parametrosNBR: { circuitosAgrupados: 3, temperaturaAmbiente: 30 }, // FCA (Tab. 42) e FCT (Tab. 40)
            // Gestão Avançada de Lançamento de Condutores & Filtro de Circuitos
            circuitoDestaque: 'todos', // 'todos' | 'ilum' | 'tugs' | 'tues' | 'comodo_X'
            circuitosOcultos: [], // array de chaves de circuitos ocultos
            modoIsolarCircuito: false, // se true, desenha exclusivamente o circuito ativo
            // Espessura Normativa das Paredes (NBR 15575 / NBR 15270 / NBR 16868)
            espessuraParede: 0.15, // metros (15cm - Padrão NBR 15575 Alvenaria convencional com emboço e reboco)

            // Parâmetros do Quadro Real de Distribuição (NBR 5410)
            esquemaAterramento: 'TN-S', // 'TN-S' | 'TN-C-S' | 'TT' | 'TN-C'
            tipoConfigIdr: 'idr_geral', // 'idr_geral' | 'idr_grupos' | 'idr_parcial' | 'ddr_individual'
            modoFiacaoQuadro: true,      // true: exibe passagem virtual de cabos SVG
            modoCanaletasQuadro: 'abertas', // 'abertas' | 'fechadas'
            modoVisualQuadro: 'interno', // 'interno' | 'espelho'
            circuitoDestaqueQuadro: null,
            // Estado do Motor 3D
            scene3d: null,
            camera3d: null,
            renderer3d: null,
            controls3d: null,
            meshGroup3d: null,
            gridHelper3D: null,
            filtroPavimento3d: 'todos', // 'todos' | 'terreo' | 'superior'
            raioX3d: false,
            explodido3d: false,
            abaAtiva: 'planta',
            cena3dDesatualizada: true,
            render3dAtivo: false,
            modoEconomia3D: true,
            animFrameId3D: null,
            framesRestantes3D: 0,

            // Regime de Imóvel (Mesmo Imóvel vs Imóveis Separados)
            regimeImovel: 'mesmo_imovel', // 'mesmo_imovel' | 'imoveis_separados'
            unidadeQdtAtivaId: 'todos', // 'todos' | id do imóvel
            imoveis: [
                {
                    id: 'imovel_terreo',
                    nome: 'Imóvel 1 (Térreo)',
                    tipo: 'residencial',
                    pavimentos: ['terreo'],
                    sistema: 'bifasico',
                    distancia: 15
                },
                {
                    id: 'imovel_superior',
                    nome: 'Imóvel 2 (Superior)',
                    tipo: 'residencial',
                    pavimentos: ['superior'],
                    sistema: 'bifasico',
                    distancia: 18
                }
            ],

            // Camada de Linhas AutoCAD de Fundo (Underlay DXF) e Importações
            cadUnderlay: [], // { x1, y1, x2, y2, layer, color }
            exibirCadUnderlay: true,
            arquivoImportadoCache: null,
            tipoAbaImport: 'cad',

            // Roteamento Padrão de Infraestrutura Elétrica
            tipoPassagemCabos: 'teto', // 'teto' | 'chao'

            // Modo Interativo de Edição e Arraste 3D
            modoEdicao3D: false,
            objetoArrastado3d: null
        };

        // OBTER PAVIMENTO ATIVO
        function obterPavimentoAtivo() {
            let pav = state.pavimentos.find(p => p.id === state.pavimentoAtivoId);
            if (!pav && state.pavimentos.length > 0) {
                pav = state.pavimentos[0];
                state.pavimentoAtivoId = pav.id;
            }
            return pav;
        }

        // ALTERAR INFRAESTRUTURA DE PASSAGEM DE CABOS (INDEPENDENTE POR PAVIMENTO)
        function alterarPassagemCabos(tipo, pavId = null) {
            const pId = pavId || state.pavimentoAtivoId;
            const pav = state.pavimentos.find(p => p.id === pId);
            if (pav) {
                pav.tipoPassagemCabos = tipo;
            }
            state.tipoPassagemCabos = tipo;

            renderizarSeletorPavimentos();
            atualizarTabelas();
            desenharInstalacoes();
            reconstruirCena3D();
        }

        // TOGGLE RÁPIDO DE LAJE DE PISO DO PAVIMENTO ATIVO
        function toggleLajePisoPavimentoAtivo() {
            const pav = obterPavimentoAtivo();
            if (!pav) return;
            pav.temLajePiso = (pav.temLajePiso === false) ? true : false;
            renderizarSeletorPavimentos();
            reconstruirCena3D();
        }

        // TOGGLE RÁPIDO DE LAJE DE TETO DO PAVIMENTO ATIVO
        function toggleLajeTetoPavimentoAtivo() {
            const pav = obterPavimentoAtivo();
            if (!pav) return;
            pav.temLajeTeto = (pav.temLajeTeto === false) ? true : false;
            renderizarSeletorPavimentos();
            reconstruirCena3D();
        }

        // TOGGLES GLOBAIS DE VISUALIZAÇÃO DE LAJES EM 3D
        function toggle3dLajesPiso() {
            state.exibirLajesPiso3D = (state.exibirLajesPiso3D === false) ? true : false;
            const btn = document.getElementById('btn3dVerLajesPiso');
            if (btn) {
                btn.className = state.exibirLajesPiso3D ? 
                    'px-2.5 py-1.5 rounded-lg font-bold bg-amber-500/30 text-amber-300 border border-amber-500/60 flex items-center gap-1 shadow' :
                    'px-2.5 py-1.5 rounded-lg font-bold bg-slate-900 text-slate-500 border border-slate-800 flex items-center gap-1 line-through';
            }
            reconstruirCena3D();
        }

        function toggle3dLajesTeto() {
            state.exibirLajesTeto3D = (state.exibirLajesTeto3D === false) ? true : false;
            const btn = document.getElementById('btn3dVerLajesTeto');
            if (btn) {
                btn.className = state.exibirLajesTeto3D ? 
                    'px-2.5 py-1.5 rounded-lg font-bold bg-sky-500/30 text-sky-300 border border-sky-500/60 flex items-center gap-1 shadow' :
                    'px-2.5 py-1.5 rounded-lg font-bold bg-slate-900 text-slate-500 border border-slate-800 flex items-center gap-1 line-through';
            }
            reconstruirCena3D();
        }

        // MODAL DE CONFIGURAÇÃO DE PAVIMENTO E LAJES
        function abrirModalConfigPavimento() {
            const pav = obterPavimentoAtivo();
            if (!pav) return;

            const sub = document.getElementById('subtituloModalPavimento');
            if (sub) sub.textContent = `Configurações independentes para: ${pav.nome}`;

            const txtNome = document.getElementById('cfgPavNome');
            const numPe = document.getElementById('cfgPavPeDireito');
            const chkPiso = document.getElementById('cfgPavTemPiso');
            const selTipoPiso = document.getElementById('cfgPavTipoPiso');
            const numEspPiso = document.getElementById('cfgPavEspessuraPiso');
            const chkTeto = document.getElementById('cfgPavTemTeto');
            const selTipoTeto = document.getElementById('cfgPavTipoTeto');
            const numEspTeto = document.getElementById('cfgPavEspessuraTeto');
            const radTeto = document.getElementById('radCfgPassagemTeto');
            const radChao = document.getElementById('radCfgPassagemChao');

            if (txtNome) txtNome.value = pav.nome;
            if (numPe) numPe.value = pav.alturaPeDireito || 2.8;
            if (chkPiso) chkPiso.checked = (pav.temLajePiso !== false);
            if (selTipoPiso) selTipoPiso.value = pav.tipoLajePiso || 'concreto';
            if (numEspPiso) numEspPiso.value = Math.round((pav.espessuraLajePiso || 0.20) * 100);
            if (chkTeto) chkTeto.checked = (pav.temLajeTeto !== false);
            if (selTipoTeto) selTipoTeto.value = pav.tipoLajeTeto || 'concreto';
            if (numEspTeto) numEspTeto.value = Math.round((pav.espessuraLajeTeto || 0.15) * 100);

            const tipoPass = pav.tipoPassagemCabos || state.tipoPassagemCabos || 'teto';
            if (tipoPass === 'chao') {
                if (radChao) radChao.checked = true;
            } else {
                if (radTeto) radTeto.checked = true;
            }

            const chkPrumada = document.getElementById('cfgPrumadaAtiva');
            if (chkPrumada) chkPrumada.checked = (state.prumadaAtiva !== false);

            const modal = document.getElementById('modalConfigPavimento');
            if (modal) modal.classList.remove('hidden');
        }

        function fecharModalConfigPavimento() {
            const modal = document.getElementById('modalConfigPavimento');
            if (modal) modal.classList.add('hidden');
        }

        function salvarConfigPavimento() {
            const pav = obterPavimentoAtivo();
            if (!pav) return;

            const nome = document.getElementById('cfgPavNome').value.trim() || pav.nome;
            const pe = parseFloat(document.getElementById('cfgPavPeDireito').value) || 2.8;
            const temPiso = document.getElementById('cfgPavTemPiso').checked;
            const tipoPiso = document.getElementById('cfgPavTipoPiso').value;
            const espPiso = (parseFloat(document.getElementById('cfgPavEspessuraPiso').value) || 20) / 100.0;
            const temTeto = document.getElementById('cfgPavTemTeto').checked;
            const tipoTeto = document.getElementById('cfgPavTipoTeto').value;
            const espTeto = (parseFloat(document.getElementById('cfgPavEspessuraTeto').value) || 15) / 100.0;
            const radChao = document.getElementById('radCfgPassagemChao');
            const tipoPassagem = (radChao && radChao.checked) ? 'chao' : 'teto';
            const aplicarTodos = document.getElementById('chkAplicarTodosPavimentos').checked;
            const chkPrumada = document.getElementById('cfgPrumadaAtiva');
            if (chkPrumada) state.prumadaAtiva = chkPrumada.checked;

            if (aplicarTodos) {
                state.pavimentos.forEach(p => {
                    p.alturaPeDireito = pe;
                    p.temLajePiso = temPiso;
                    p.tipoLajePiso = tipoPiso;
                    p.espessuraLajePiso = espPiso;
                    p.temLajeTeto = temTeto;
                    p.tipoLajeTeto = tipoTeto;
                    p.espessuraLajeTeto = espTeto;
                    p.tipoPassagemCabos = tipoPassagem;
                });
            } else {
                pav.nome = nome;
                pav.alturaPeDireito = pe;
                pav.temLajePiso = temPiso;
                pav.tipoLajePiso = tipoPiso;
                pav.espessuraLajePiso = espPiso;
                pav.temLajeTeto = temTeto;
                pav.tipoLajeTeto = tipoTeto;
                pav.espessuraLajeTeto = espTeto;
                pav.tipoPassagemCabos = tipoPassagem;
            }

            fecharModalConfigPavimento();
            renderizarSeletorPavimentos();
            atualizarTudo();
            reconstruirCena3D();
        }

        function excluirPavimentoAtivo() {
            if (state.pavimentos.length <= 1) {
                alert('É necessário ter ao menos um pavimento cadastrado na edificação!');
                return;
            }
            const pav = obterPavimentoAtivo();
            if (!pav) return;

            if (!confirm(`Tem certeza que deseja excluir o "${pav.nome}" e todos os seus cômodos?`)) {
                return;
            }

            state.comodos = state.comodos.filter(c => c.pavimentoId !== pav.id);
            state.pavimentos = state.pavimentos.filter(p => p.id !== pav.id);
            state.pavimentoAtivoId = state.pavimentos[0].id;

            fecharModalConfigPavimento();
            renderizarSeletorPavimentos();
            atualizarTudo();
            reconstruirCena3D();
        }




        

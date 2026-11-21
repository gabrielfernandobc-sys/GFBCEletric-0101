/* PRO-ELÉTRICA CAD — 09-maquete-3d.js
   Maquete 3D/BIM com Three.js.
   Script clássico (escopo global compartilhado): os módulos de js/app/ são
   carregados em ordem numérica pelo index.html e dependem dessa ordem. */
        // ==========================================
        // MOTOR DE RENDERIZAÇÃO 3D BIM (THREE.JS)
        // ==========================================
        function initThreeEngine() {
            const container = document.getElementById('viewport3d');
            if (!container) return;

            // Já inicializado e elemento no DOM? Apenas redimensiona
            if (state.scene3d && state.renderer3d && container.contains(state.renderer3d.domElement)) {
                onWindowResize3d();
                return;
            }

            // Three.js indisponível? Exibe estado de carregamento e tenta novamente
            if (typeof THREE === 'undefined') {
                container.innerHTML = `
                    <div class="w-full h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 bg-slate-950 space-y-3">
                        <i class="fa-solid fa-cube text-4xl text-emerald-400 animate-spin"></i>
                        <h4 class="font-bold text-white text-base">Iniciando Motor 3D BIM...</h4>
                        <p class="text-xs text-slate-400 max-w-sm">Carregando Three.js e biblioteca de maquete tridimensional...</p>
                    </div>`;
                setTimeout(initThreeEngine, 350);
                return;
            }

            const w = container.clientWidth || 1120;
            const h = container.clientHeight || 620;

            try {
                state.scene3d = new THREE.Scene();
                state.scene3d.background = new THREE.Color(0x020617);

                state.camera3d = new THREE.PerspectiveCamera(45, (w > 0 && h > 0) ? (w / h) : (1120 / 620), 0.1, 1000);
                state.camera3d.position.set(16, 18, 22);

                state.renderer3d = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true,
                    preserveDrawingBuffer: true,
                    powerPreference: 'default'
                });
                state.renderer3d.setSize(w, h);
                state.renderer3d.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
                state.renderer3d.shadowMap.enabled = true;
                state.renderer3d.shadowMap.type = THREE.PCFSoftShadowMap;

                container.innerHTML = '';
                container.appendChild(state.renderer3d.domElement);
            } catch (errWebGL) {
                console.error('Falha ao inicializar WebGLRenderer:', errWebGL);
                container.innerHTML = `
                    <div class="w-full h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 bg-slate-950 space-y-3">
                        <i class="fa-solid fa-triangle-exclamation text-4xl text-amber-400"></i>
                        <h4 class="font-bold text-white text-base">Aceleração WebGL Indisponível</h4>
                        <p class="text-xs text-slate-400 max-w-md">O navegador não conseguiu abrir o contexto WebGL para renderizar a maquete 3D. Verifique se a aceleração por hardware está ativada nas configurações do navegador.</p>
                        <button onclick="initThreeEngine(); reconstruirCena3D(true);" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-2">
                            <i class="fa-solid fa-rotate-right"></i> Tentar Novamente
                        </button>
                    </div>`;
                return;
            }

            if (typeof THREE.OrbitControls !== 'undefined') {
                state.controls3d = new THREE.OrbitControls(state.camera3d, state.renderer3d.domElement);
                state.controls3d.enableDamping = true;
                state.controls3d.dampingFactor = 0.08;
                state.controls3d.target.set(6, 1.5, 5);
                state.controls3d.maxPolarAngle = Math.PI / 2 + 0.05; // Permite ver do chão sem inverter
                state.controls3d.addEventListener('change', () => pedirRenderizacao3D(8));
            }

            // Iluminação Ambiente e Direcional
            const ambLight = new THREE.AmbientLight(0xffffff, 0.85);
            state.scene3d.add(ambLight);

            const sunLight = new THREE.DirectionalLight(0xffedd5, 1.1);
            sunLight.position.set(25, 40, 20);
            sunLight.castShadow = true;
            sunLight.shadow.mapSize.width = 2048;
            sunLight.shadow.mapSize.height = 2048;
            sunLight.shadow.bias = -0.0001;
            state.scene3d.add(sunLight);

            const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
            fillLight.position.set(-20, 20, -20);
            state.scene3d.add(fillLight);

            // Malha 3D inicial (será alinhada dinamicamente pelo reconstruirCena3D)
            state.gridHelper3D = new THREE.GridHelper(30, 30, 0x38bdf8, 0x1e293b);
            state.gridHelper3D.position.set(7, -0.025, 12);
            state.scene3d.add(state.gridHelper3D);

            // Grupo de geometrias reconstruíveis
            state.meshGroup3d = new THREE.Group();
            state.scene3d.add(state.meshGroup3d);

            // INTERATIVIDADE, ARRASTE INDIVIDUAL E ATUALIZAÇÃO DA INFRAESTRUTURA EM TEMPO REAL
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const planeIntersection = new THREE.Vector3();
            let hoverMesh = null;
            let initialEmissive = 0.3;

            const dom = state.renderer3d.domElement;

            dom.addEventListener('pointermove', (e) => {
                if (!state.modoEdicao3D) return;
                const rect = dom.getBoundingClientRect();
                mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

                raycaster.setFromCamera(mouse, state.camera3d);

                if (state.objetoArrastado3d) {
                    // Intersecta com o plano na altura exata do objeto arrastado
                    dragPlane.set(new THREE.Vector3(0, 1, 0), -state.objetoArrastado3d.position.y);

                    if (raycaster.ray.intersectPlane(dragPlane, planeIntersection)) {
                        const targetGroup = state.objetoArrastado3d;
                        const uData = targetGroup.userData;
                        const escala3D = 1 / 40.0;
                        let targetX = planeIntersection.x;
                        let targetZ = planeIntersection.z;
                        let bateuParede = false;

                        // CONTENÇÃO ESTRITA AO CÔMODO (NÃO PODE ATRAVESSAR PARA OUTRO CÔMODO)
                        const comodo = state.comodoArrasto3D || (uData.comodoId ? state.comodos.find(c => c.id === uData.comodoId) : null) || uData.comodoRef;

                        if (comodo) {
                            const margem = 0.12; // Distância mínima física da parede
                            const minX = (comodo.x * escala3D) + margem;
                            const maxX = (comodo.x * escala3D + comodo.largura) - margem;
                            const minZ = (comodo.y * escala3D) + margem;
                            const maxZ = (comodo.y * escala3D + comodo.comprimento) - margem;

                            if (targetX <= minX || targetX >= maxX || targetZ <= minZ || targetZ >= maxZ) {
                                bateuParede = true;
                            }

                            targetX = Math.max(minX, Math.min(maxX, targetX));
                            targetZ = Math.max(minZ, Math.min(maxZ, targetZ));
                        }

                        // ATUALIZA EXCLUSIVAMENTE A POSIÇÃO DESTE OBJETO INDIVIDUAL
                        targetGroup.position.x = targetX;
                        targetGroup.position.z = targetZ;

                        // Sincroniza em tempo real com as coordenadas do ponto elétrico no 2D CAD
                        if (uData && uData.pontoRef) {
                            uData.pontoRef.x = targetX * 40;
                            uData.pontoRef.y = targetZ * 40;
                        }

                        // Se for tomada de parede, recalcula rotação para acompanhar a parede mais próxima
                        if (uData && uData.tipo === 'tomada' && comodo) {
                            const cx = comodo.x * escala3D;
                            const cz = comodo.y * escala3D;
                            const cw = comodo.largura;
                            const ch = comodo.comprimento;

                            const dO = Math.abs(targetX - cx);
                            const dL = Math.abs(targetX - (cx + cw));
                            const dN = Math.abs(targetZ - cz);
                            const dS = Math.abs(targetZ - (cz + ch));
                            const menorD = Math.min(dO, dL, dN, dS);

                            if (menorD === dO) targetGroup.rotation.y = Math.PI / 2;
                            else if (menorD === dL) targetGroup.rotation.y = -Math.PI / 2;
                            else if (menorD === dS) targetGroup.rotation.y = Math.PI;
                            else targetGroup.rotation.y = 0;
                        }

                        // ===================================================================
                        // ATUALIZAÇÃO DA INFRAESTRUTURA ELÉTRICA (ELETRODUTOS) EM TEMPO REAL
                        // ===================================================================
                        if (uData && uData.tipo === 'tomada' && uData.tuboMesh && uData.lumAlvoGroup) {
                            // O eletroduto desta tomada específica estica e acompanha o movimento imediatamente
                            atualizarGeometriaTuboConectado(
                                uData.tuboMesh,
                                uData.lumAlvoGroup.position,
                                targetGroup.position,
                                uData.pavPassagemChao,
                                uData.nivelY
                            );
                        } else if (uData && uData.tipo === 'luminaria' && uData.tubosConectados) {
                            // Se a luminária está sendo movida, todos os eletrodutos ligados a ela acompanham em tempo real!
                            uData.tubosConectados.forEach(item => {
                                if (item.ehEntreLuzes && item.tubo) {
                                    // Tubo entre múltiplas lâmpadas
                                    const novaCurvaLuzes = new THREE.LineCurve3(
                                        new THREE.Vector3(item.grupoA.position.x, item.grupoA.position.y, item.grupoA.position.z),
                                        new THREE.Vector3(item.grupoB.position.x, item.grupoB.position.y, item.grupoB.position.z)
                                    );
                                    if (item.tubo.geometry) item.tubo.geometry.dispose();
                                    item.tubo.geometry = new THREE.TubeGeometry(novaCurvaLuzes, 8, 0.022, 8, false);
                                } else if (item.tomadaGroup && item.tubo) {
                                    // Tubo ligando esta luminária até uma tomada
                                    atualizarGeometriaTuboConectado(
                                        item.tubo,
                                        targetGroup.position,
                                        item.tomadaGroup.position,
                                        item.pavPassagemChao,
                                        item.nivelY
                                    );
                                }
                            });
                        }

                        // Feedback no painel HUD
                        const txt = document.getElementById('txtInfoObjeto3D');
                        if (txt) {
                            const nomeObj = uData.pontoRef ? uData.pontoRef.nome : (uData.tipo === 'luminaria' ? 'Luminária' : 'Tomada');
                            const nomeComodo = comodo ? comodo.nome : 'Cômodo';
                            if (bateuParede) {
                                txt.innerHTML = `<span class="text-amber-400 font-bold"><i class="fa-solid fa-hand"></i> Parede atingida!</span> <b>${nomeObj}</b> mantido dentro de <b>${nomeComodo}</b> (não pode passar para outro cômodo).`;
                            } else {
                                txt.innerHTML = `<i class="fa-solid fa-arrows-up-down-left-right text-emerald-400"></i> Movendo <b>${nomeObj}</b> em <b>${nomeComodo}</b>: (${targetX.toFixed(2)}m, ${targetZ.toFixed(2)}m)`;
                            }
                        }

                        // Sincroniza visualização 2D
                        desenharCAD();
                        desenharInstalacoes();
                    }
                    return;
                }

                // Hover para destacar tomadas, luminárias e cabos virtuais / eletrodutos (Desktop / Mouse)
                const interativos = [];
                if (state.meshGroup3d) {
                    state.meshGroup3d.traverse(child => {
                        if (child.isMesh && child.userData && (child.userData.tipo === 'tomada' || child.userData.tipo === 'luminaria' || child.userData.tipo === 'eletroduto' || child.userData.elementoTipo === 'tubo')) {
                            interativos.push(child);
                        }
                    });
                }

                const intersects = raycaster.intersectObjects(interativos, false);
                if (intersects.length > 0) {
                    const hit = intersects[0].object;
                    if (hoverMesh !== hit) {
                        if (hoverMesh && hoverMesh.material && hoverMesh.material.emissive) {
                            hoverMesh.material.emissiveIntensity = initialEmissive;
                        }
                        hoverMesh = hit;
                        if (hoverMesh.material && hoverMesh.material.emissive) {
                            initialEmissive = hoverMesh.material.emissiveIntensity || 0;
                            hoverMesh.material.emissiveIntensity = 1.6;
                        }
                    }
                    dom.style.cursor = 'pointer';
                    const txt = document.getElementById('txtInfoObjeto3D');
                    if (txt) {
                        const u = hit.userData;
                        if (u.tipo === 'eletroduto' || u.elementoTipo === 'tubo') {
                            const pRef = u.pontoRef ? `${u.pontoRef.nome} (${u.pontoRef.tipo})` : 'Iluminação no Teto';
                            txt.innerHTML = `⚡ Cabo Virtual / Eletroduto em Destaque: <b>Conexão com ${pRef}</b> (NBR 5410)`;
                        } else {
                            const icone = u.tipo === 'luminaria' ? '💡' : '🔌';
                            const detalhe = u.pontoRef ? `${u.pontoRef.nome} (${u.pontoRef.pot}W - ${u.pontoRef.tipo})` : `Luminária (${u.comodoRef ? u.comodoRef.nome : ''})`;
                            txt.innerHTML = `Pronto para arrastar ${icone} <b>${detalhe}</b>`;
                        }
                    }
                } else {
                    if (hoverMesh && hoverMesh.material && hoverMesh.material.emissive) {
                        hoverMesh.material.emissiveIntensity = initialEmissive;
                        hoverMesh = null;
                    }
                    dom.style.cursor = 'default';
                }
            });

            dom.addEventListener('pointerdown', (e) => {
                if (!state.modoEdicao3D || e.button !== 0) return;
                const rect = dom.getBoundingClientRect();
                mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

                raycaster.setFromCamera(mouse, state.camera3d);
                const interativos = [];
                if (state.meshGroup3d) {
                    state.meshGroup3d.traverse(child => {
                        if (child.isMesh && child.userData && (child.userData.tipo === 'tomada' || child.userData.tipo === 'luminaria')) {
                            interativos.push(child);
                        }
                    });
                }

                const intersects = raycaster.intersectObjects(interativos, false);
                if (intersects.length > 0) {
                    const hitMesh = intersects[0].object;
                    // O objeto arrastado é SEMPRE o grupo raiz independente daquele ponto elétrico
                    const hitGroup = hitMesh.userData.grupoRaiz || hitMesh;
                    state.objetoArrastado3d = hitGroup;

                    if (state.controls3d) state.controls3d.enabled = false;
                    dom.style.cursor = 'grabbing';

                    // IDENTIFICAÇÃO DO CÔMODO
                    const uData = hitGroup.userData;
                    let comodo = null;
                    if (uData.comodoId) {
                        comodo = state.comodos.find(c => c.id === uData.comodoId);
                    } else if (uData.comodoRef) {
                        comodo = uData.comodoRef;
                    } else if (uData.pontoRef && uData.pontoRef.comodoId) {
                        comodo = state.comodos.find(c => c.id === uData.pontoRef.comodoId);
                    }
                    state.comodoArrasto3D = comodo;

                    // DESTAQUE VISUAL DOS LIMITES DO CÔMODO EM 3D (CONTENÇÃO VERDE)
                    if (comodo && state.scene3d) {
                        if (state.boundaryBoxMesh) {
                            state.scene3d.remove(state.boundaryBoxMesh);
                            if (state.boundaryBoxMesh.geometry) state.boundaryBoxMesh.geometry.dispose();
                            state.boundaryBoxMesh = null;
                        }
                        const escala3D = 1 / 40.0;
                        const cw = comodo.largura;
                        const cd = comodo.comprimento;
                        const cx = (comodo.x * escala3D) + cw / 2;
                        const cz = (comodo.y * escala3D) + cd / 2;
                        const pavObj = state.pavimentos.find(p => p.id === comodo.pavimentoId) || { nivel: 0 };
                        const nivelY = pavObj.nivel * 3.0 + (state.explodido3d ? pavObj.nivel * 1.8 : 0);
                        const peDir = pavObj.alturaPeDireito || 2.8;

                        const geoBox = new THREE.BoxGeometry(cw, peDir, cd);
                        const edges = new THREE.EdgesGeometry(geoBox);
                        const matEdges = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 3, transparent: true, opacity: 0.9 });
                        state.boundaryBoxMesh = new THREE.LineSegments(edges, matEdges);
                        state.boundaryBoxMesh.position.set(cx, nivelY + peDir / 2 + 0.1, cz);
                        state.scene3d.add(state.boundaryBoxMesh);
                    }
                }
            });

            const onPointerUp3D = () => {
                if (state.boundaryBoxMesh && state.scene3d) {
                    state.scene3d.remove(state.boundaryBoxMesh);
                    if (state.boundaryBoxMesh.geometry) state.boundaryBoxMesh.geometry.dispose();
                    state.boundaryBoxMesh = null;
                }
                state.comodoArrasto3D = null;

                if (state.objetoArrastado3d) {
                    state.objetoArrastado3d = null;
                    if (state.controls3d) state.controls3d.enabled = true;
                    dom.style.cursor = state.modoEdicao3D ? 'grab' : 'default';
                    desenharCAD();
                    desenharInstalacoes();
                    atualizarTabelas();
                    reconstruirCena3D(); // Reconecta e finaliza suavemente as curvas de toda a cena
                }
            };
            dom.addEventListener('pointerup', onPointerUp3D);
            window.addEventListener('pointerup', onPointerUp3D);

            window.addEventListener('resize', onWindowResize3d);

            // Interações que despertam o renderizador temporariamente
            dom.addEventListener('pointerdown', () => pedirRenderizacao3D(45));
            dom.addEventListener('wheel', () => pedirRenderizacao3D(25), { passive: true });
        }

        // =========================================================================
        // MOTOR DE RENDERIZAÇÃO 3D SOB DEMANDA (ECO-MODE / ECONOMIA EXTREMA DE ENERGIA)
        // =========================================================================
        function pedirRenderizacao3D(qtdFrames = 15) {
            state.framesRestantes3D = Math.max(state.framesRestantes3D, qtdFrames);
            if (state.abaAtiva === 'visualizacao3d' && !state.animFrameId3D) {
                iniciarLoop3D();
            }
        }

        function iniciarLoop3D() {
            if (state.animFrameId3D) return;
            state.render3dAtivo = true;

            function cicloRender3D() {
                if (!state.render3dAtivo || state.abaAtiva !== 'visualizacao3d') {
                    pausarLoop3D();
                    return;
                }

                let precisaContinuar = false;

                if (state.controls3d) {
                    const emMovimento = state.controls3d.update();
                    if (emMovimento) precisaContinuar = true;
                }

                if (state.framesRestantes3D > 0) {
                    state.framesRestantes3D--;
                    precisaContinuar = true;
                }

                if (state.renderer3d && state.scene3d && state.camera3d) {
                    const _t3d0 = performance.now();
                    state.renderer3d.render(state.scene3d, state.camera3d);
                    if (window.hardwareTelemetry) {
                        window.hardwareTelemetry.cpuBusyTime += (performance.now() - _t3d0);
                    }
                }

                if (precisaContinuar) {
                    state.animFrameId3D = requestAnimationFrame(cicloRender3D);
                } else {
                    // Sem interação e câmera parada: desliga animação e zera uso de GPU (0%)
                    state.animFrameId3D = null;
                }
            }

            state.animFrameId3D = requestAnimationFrame(cicloRender3D);
        }

        function pausarLoop3D() {
            state.render3dAtivo = false;
            state.framesRestantes3D = 0;
            if (state.animFrameId3D) {
                cancelAnimationFrame(state.animFrameId3D);
                state.animFrameId3D = null;
            }
        }

        function onWindowResize3d() {
            const container = document.getElementById('viewport3d');
            if (!container || !state.camera3d || !state.renderer3d) return;
            const w = container.clientWidth || 1120;
            const h = container.clientHeight || 620;
            if (w <= 0 || h <= 0) return;
            state.camera3d.aspect = w / h;
            state.camera3d.updateProjectionMatrix();
            state.renderer3d.setSize(w, h);
            state.renderer3d.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
        }

        function resetarCamera3D() {
            if (!state.camera3d || !state.controls3d) return;
            const escala3D = 1.0 / (state.escala || 40.0);
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            (state.comodos || []).forEach(c => {
                const cx = (c.x || 0) * escala3D;
                const cz = (c.y || 0) * escala3D;
                minX = Math.min(minX, cx);
                maxX = Math.max(maxX, cx + (c.largura || 4));
                minZ = Math.min(minZ, cz);
                maxZ = Math.max(maxZ, cz + (c.comprimento || 4));
            });

            const tw3d = (state.terreno && state.terreno.largura) ? state.terreno.largura : 12;
            const th3d = (state.terreno && state.terreno.comprimento) ? state.terreno.comprimento : 25;

            const midX = (state.terreno && state.terreno.x !== undefined) ? (state.terreno.x * escala3D) + tw3d / 2 : (isFinite(minX) ? (minX + maxX) / 2 : 7);
            const midZ = (state.terreno && state.terreno.y !== undefined) ? (state.terreno.y * escala3D) + th3d / 2 : (isFinite(minZ) ? (minZ + maxZ) / 2 : 12.5);

            const span = Math.max(tw3d, th3d, isFinite(maxX - minX) ? (maxX - minX + 6) : 14, 16);
            state.controls3d.target.set(midX, 1.5, midZ);
            state.camera3d.position.set(midX + span * 0.75, span * 0.7 + 2, midZ + span * 0.85);
            state.controls3d.update();
            pedirRenderizacao3D(35);
        }

        function setFiltro3d(modo) {
            state.filtroPavimento3d = modo;
            document.getElementById('btn3dVerTodos').className = modo === 'todos' ? 'px-3 py-1.5 rounded-lg font-bold bg-emerald-500 text-slate-950 shadow' : 'px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white';
            document.getElementById('btn3dVerTerreo').className = modo === 'terreo' ? 'px-3 py-1.5 rounded-lg font-bold bg-emerald-500 text-slate-950 shadow' : 'px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white';
            document.getElementById('btn3dVerSuperior').className = modo === 'superior' ? 'px-3 py-1.5 rounded-lg font-bold bg-emerald-500 text-slate-950 shadow' : 'px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white';
            reconstruirCena3D(true);
        }

        function toggle3dRaioX() {
            state.raioX3d = !state.raioX3d;
            const btn = document.getElementById('btn3dRaioX');
            if (btn) {
                btn.className = state.raioX3d ? 'px-3 py-1.5 rounded-xl font-bold bg-sky-500 text-slate-950 flex items-center gap-1.5 shadow' : 'px-3 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 flex items-center gap-1.5';
            }
            reconstruirCena3D(true);
        }

        function toggle3dExplodir() {
            state.explodido3d = !state.explodido3d;
            const btn = document.getElementById('btn3dExplodir');
            if (btn) {
                btn.className = state.explodido3d ? 'px-3 py-1.5 rounded-xl font-bold bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow' : 'px-3 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center gap-1.5';
            }
            reconstruirCena3D(true);
        }

        function setFiltroElemento3d(tipo) {
            state.filtroElemento3d = tipo;
            const btns = {
                todos: document.getElementById('btn3dFiltroTodosElem'),
                ilum: document.getElementById('btn3dFiltroIlum'),
                tomadas: document.getElementById('btn3dFiltroTomadas'),
                tubos: document.getElementById('btn3dFiltroTubos')
            };
            Object.keys(btns).forEach(k => {
                if (btns[k]) {
                    btns[k].className = (k === tipo) 
                        ? 'px-2.5 py-1.5 rounded-lg font-bold bg-slate-800 text-emerald-400 shadow text-xs' 
                        : 'px-2.5 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white text-xs flex items-center gap-1';
                }
            });
            reconstruirCena3D(true);
        }

        // Reconstrói todas as Lajes, Paredes, Lâmpadas, Tomadas e Tubulações 3D (Teto vs Chão com Laje Unificada)
        
        // ATUALIZAÇÃO EM TEMPO REAL DE ELETRODUTO/TUBULAÇÃO 3D DURANTE ARRASTE
        function atualizarGeometriaTuboConectado(meshTubo, pLuz, pTomada, pavPassagemChao, nivelY) {
            if (!meshTubo || !pLuz || !pTomada) return;
            let novaCurva;
            if (!pavPassagemChao) {
                // Passagem pelo teto: Luminária -> teto sobre a tomada -> descida na parede
                novaCurva = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(pLuz.x, pLuz.y, pLuz.z),
                    new THREE.Vector3(pTomada.x, pLuz.y, pTomada.z),
                    new THREE.Vector3(pTomada.x, pTomada.y + 0.1, pTomada.z)
                ]);
            } else {
                // Passagem pelo chão: Luminária -> descida ao contrapiso -> tomada
                const nivelChao = nivelY + 0.06;
                novaCurva = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(pLuz.x, nivelChao, pLuz.z),
                    new THREE.Vector3(pTomada.x, nivelChao, pTomada.z),
                    new THREE.Vector3(pTomada.x, pTomada.y - 0.05, pTomada.z)
                ]);
            }
            if (meshTubo.geometry) meshTubo.geometry.dispose();
            meshTubo.geometry = new THREE.TubeGeometry(novaCurva, 12, 0.025, 8, false);
        }

        function reconstruirCena3D(forcarImediato = false) {
            // Se o usuário estiver em abas 2D e não tiver forçado a montagem,
            // adia a reconstrução da maquete 3D para quando a aba for aberta.
            // Isso zera o consumo de CPU/GPU e elimina completamente o flickering!
            if (state.abaAtiva !== 'visualizacao3d' && !forcarImediato) {
                state.cena3dDesatualizada = true;
                return;
            }

            if (!state.meshGroup3d || !state.scene3d) {
                state.cena3dDesatualizada = true;
                return;
            }

            try {
                // Limpa meshes anteriores
                while (state.meshGroup3d.children.length > 0) {
                    const obj = state.meshGroup3d.children[0];
                    state.meshGroup3d.remove(obj);
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.children) {
                        obj.children.forEach(ch => { if (ch.geometry) ch.geometry.dispose(); });
                    }
                }

                const escala3D = 1.0 / (state.escala || 40.0); // Converte coordenadas do CAD em metros no 3D
                const opacidadeParede = state.raioX3d ? 0.25 : 0.85;

            // Materiais
            const matLaje = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.2 });
            const matParedeTerreo = new THREE.MeshStandardMaterial({ color: 0x334155, transparent: true, opacity: opacidadeParede, roughness: 0.6 });
            const matParedeSup = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, transparent: true, opacity: opacidadeParede, roughness: 0.6 });
            const matTuboEletroduto = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4, roughness: 0.3 });
            const matTuboChao = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.4, roughness: 0.3 });
            const matPrumada = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, emissiveIntensity: 0.6, roughness: 0.2 });

            // 0. MALHA 3D (GRID HELPER) DINÂMICA E ALINHADA COM A EDIFICAÇÃO
            if (state.gridHelper3D && state.scene3d) {
                state.scene3d.remove(state.gridHelper3D);
                if (state.gridHelper3D.geometry) state.gridHelper3D.geometry.dispose();
                state.gridHelper3D = null;
            }

            // Garante terreno devidamente ajustado e dimensionado aos cômodos
            if (typeof ajustarTerrenoAosComodos === 'function') {
                ajustarTerrenoAosComodos();
            }

            // Calcula centro e limites da edificação em metros
            let bMinX = Infinity, bMaxX = -Infinity, bMinZ = Infinity, bMaxZ = -Infinity;
            (state.comodos || []).forEach(c => {
                const cx = (c.x || 0) * escala3D;
                const cz = (c.y || 0) * escala3D;
                bMinX = Math.min(bMinX, cx);
                bMaxX = Math.max(bMaxX, cx + (c.largura || 4));
                bMinZ = Math.min(bMinZ, cz);
                bMaxZ = Math.max(bMaxZ, cz + (c.comprimento || 4));
            });

            const temComodos = isFinite(bMinX);
            const centroEdifX = temComodos ? (bMinX + bMaxX) / 2 : 7.0;
            const centroEdifZ = temComodos ? (bMinZ + bMaxZ) / 2 : 12.0;

            const tw3d = (state.terreno && state.terreno.largura) ? state.terreno.largura : 12.0;
            const th3d = (state.terreno && state.terreno.comprimento) ? state.terreno.comprimento : 25.0;

            // Posição central do lote/terreno em 3D
            const terX3D = (state.terreno && state.terreno.x !== undefined) ? (state.terreno.x * escala3D) + tw3d / 2 : centroEdifX;
            const terZ3D = (state.terreno && state.terreno.y !== undefined) ? (state.terreno.y * escala3D) + th3d / 2 : centroEdifZ;

            // Malha 3D perfeitamente posicionada e subdividida em passos exatos de 1 metro
            const tamanhoMalha = Math.max(Math.ceil(tw3d + 12), Math.ceil(th3d + 14), 32);
            const malhaCentroX = Math.round(terX3D);
            const malhaCentroZ = Math.round(terZ3D);
            state.gridHelper3D = new THREE.GridHelper(tamanhoMalha, tamanhoMalha, 0x38bdf8, 0x1e293b);
            state.gridHelper3D.position.set(malhaCentroX, -0.025, malhaCentroZ);
            state.scene3d.add(state.gridHelper3D);

            // 0. TERRENO TOTAL EM 3D (LOTE E ÁREA PERMEÁVEL)
            if (state.terreno && state.terreno.ativo) {
                const matGrama = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9, metalness: 0.1 });
                const geomTerreno = new THREE.PlaneGeometry(tw3d, th3d);
                const meshTerreno = new THREE.Mesh(geomTerreno, matGrama);
                meshTerreno.rotation.x = -Math.PI / 2;
                meshTerreno.position.set(terX3D, -0.02, terZ3D);
                meshTerreno.receiveShadow = true;
                state.meshGroup3d.add(meshTerreno);

                // Linha de Borda / Divisa do Lote
                const bordaGeom = new THREE.EdgesGeometry(geomTerreno);
                const matBorda = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
                const wireTerreno = new THREE.LineSegments(bordaGeom, matBorda);
                wireTerreno.rotation.x = -Math.PI / 2;
                wireTerreno.position.set(terX3D, -0.019, terZ3D);
                state.meshGroup3d.add(wireTerreno);

                // Calçada Frontal em 3D
                const matCalcada = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
                const geomCalcada = new THREE.PlaneGeometry(tw3d, 2.0);
                const meshCalcada = new THREE.Mesh(geomCalcada, matCalcada);
                meshCalcada.rotation.x = -Math.PI / 2;
                meshCalcada.position.set(terX3D, -0.015, terZ3D + th3d / 2 + 1.0);
                meshCalcada.receiveShadow = true;
                state.meshGroup3d.add(meshCalcada);
            }

            // 1. RECONSTRUÇÃO DOS PAVIMENTOS
            state.pavimentos.forEach((pav, pIdx) => {
                if (state.filtroPavimento3d === 'terreo' && pIdx !== 0) return;
                if (state.filtroPavimento3d === 'superior' && pIdx === 0) return;

                const nivelY = pIdx * 3.0 + (state.explodido3d ? pIdx * 1.8 : 0);
                const peDireito = pav.alturaPeDireito || 2.8;
                const pavPassagemChao = (pav.tipoPassagemCabos === 'chao');

                const comodosDoPav = state.comodos.filter(c => c.pavimentoId === pav.id);
                if (comodosDoPav.length === 0) return;

                // Bounding Box do Pavimento para Lajes
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                comodosDoPav.forEach(c => {
                    const cx = c.x * escala3D;
                    const cy = c.y * escala3D;
                    const cw = c.largura;
                    const ch = c.comprimento;
                    minX = Math.min(minX, cx);
                    maxX = Math.max(maxX, cx + cw);
                    minY = Math.min(minY, cy);
                    maxY = Math.max(maxY, cy + ch);
                });

                const margemLaje = 0.4;
                const largLaje = (maxX - minX) + margemLaje * 2;
                const compLaje = (maxY - minY) + margemLaje * 2;
                const centroLajeX = minX + (maxX - minX) / 2;
                const centroLajeZ = minY + (maxY - minY) / 2;

                // Função auxiliar para renderizar laje sólida ou com abertura para a escada
                function renderizarLajeComAberturas(yPos, espessura, matLajeUsar, tipoLaje, abrirEscada) {
                    const esc = (abrirEscada && state.escadas && state.escadas.length > 0) ? state.escadas[0] : null;

                    if (!esc) {
                        const geo = new THREE.BoxGeometry(largLaje, espessura, compLaje);
                        const mesh = new THREE.Mesh(geo, matLajeUsar);
                        mesh.position.set(centroLajeX, yPos, centroLajeZ);
                        mesh.userData = { tipo: tipoLaje, pavimentoId: pav.id };
                        state.meshGroup3d.add(mesh);
                        return;
                    }

                    // Calcula vão de passagem da escada
                    const isV = (esc.orientacao === 'V');
                    const margemVao = 0.05;
                    const hX0 = (esc.x * escala3D) - margemVao;
                    const hX1 = (esc.x * escala3D) + (isV ? esc.largura : esc.comprimento) + margemVao;
                    const hZ0 = (esc.y * escala3D) - margemVao;
                    const hZ1 = (esc.y * escala3D) + (isV ? esc.comprimento : esc.largura) + margemVao;

                    const slabX0 = minX - margemLaje;
                    const slabX1 = maxX + margemLaje;
                    const slabZ0 = minY - margemLaje;
                    const slabZ1 = maxY + margemLaje;

                    // 4 quadrantes para manter a laje sólida com o poço/vão livre para passagem da escada
                    const subPaineis = [
                        { x0: slabX0, x1: Math.min(slabX1, hX0), z0: slabZ0, z1: slabZ1 },
                        { x0: Math.max(slabX0, hX1), x1: slabX1, z0: slabZ0, z1: slabZ1 },
                        { x0: Math.max(slabX0, hX0), x1: Math.min(slabX1, hX1), z0: slabZ0, z1: Math.min(slabZ1, hZ0) },
                        { x0: Math.max(slabX0, hX0), x1: Math.min(slabX1, hX1), z0: Math.max(slabZ0, hZ1), z1: slabZ1 }
                    ];

                    subPaineis.forEach(sub => {
                        const pw = sub.x1 - sub.x0;
                        const pd = sub.z1 - sub.z0;
                        if (pw > 0.05 && pd > 0.05) {
                            const pGeo = new THREE.BoxGeometry(pw, espessura, pd);
                            const pMesh = new THREE.Mesh(pGeo, matLajeUsar);
                            pMesh.position.set(sub.x0 + pw / 2, yPos, sub.z0 + pd / 2);
                            pMesh.userData = { tipo: tipoLaje, pavimentoId: pav.id };
                            state.meshGroup3d.add(pMesh);
                        }
                    });
                }

                // A. LAJE DE PISO (CHÃO)
                if (pav.temLajePiso && state.exibirLajesPiso3D) {
                    const espPiso = pav.espessuraLajePiso || 0.20;
                    const matLajePiso = new THREE.MeshStandardMaterial({
                        color: pav.tipoLajePiso === 'radier' ? 0x0f172a : (pav.tipoLajePiso === 'contrapiso' ? 0x334155 : 0x1e293b),
                        roughness: 0.9,
                        metalness: 0.1
                    });
                    const abrirNoPiso = (pIdx > 0 && state.escadas && state.escadas.length > 0);
                    renderizarLajeComAberturas(nivelY - espPiso / 2, espPiso, matLajePiso, 'laje_piso', abrirNoPiso);
                }

                // B. LAJE DE TETO (COBERTURA / FORRO)
                if (pav.temLajeTeto && state.exibirLajesTeto3D) {
                    const espTeto = pav.espessuraLajeTeto || 0.15;
                    const nivelYTeto = nivelY + peDireito + espTeto / 2;
                    const matLajeTeto = new THREE.MeshStandardMaterial({
                        color: pav.tipoLajeTeto === 'gesso' ? 0xf8fafc : (pav.tipoLajeTeto === 'madeira' ? 0x78350f : 0x334155),
                        transparent: true,
                        opacity: state.raioX3d ? 0.3 : 0.88,
                        roughness: 0.7
                    });
                    const abrirNoTeto = (pIdx === 0 && state.pavimentos.length > 1 && state.escadas && state.escadas.length > 0);
                    renderizarLajeComAberturas(nivelYTeto, espTeto, matLajeTeto, 'laje_teto', abrirNoTeto);
                }

                // C. Paredes Extrudadas dos Cômodos (Espessura Conforme Normas Técnicas NBR)
                const espessuraPadrao = state.espessuraParede || 0.15;
                const matParedeUsar = pav.id === 'terreo' ? matParedeTerreo : matParedeSup;

                comodosDoPav.forEach(c => {
                    const cx = c.x * escala3D;
                    const cz = c.y * escala3D;
                    const cw = c.largura; // metros
                    const ch = c.comprimento; // metros
                    const espessura = c.espessuraParede || espessuraPadrao;

                    // 4 Paredes em volta do cômodo
                    const paredes = [
                        { w: cw, d: espessura, x: cx + cw/2, z: cz, rotY: 0 },
                        { w: cw, d: espessura, x: cx + cw/2, z: cz + ch, rotY: 0 },
                        { w: espessura, d: ch, x: cx, z: cz + ch/2, rotY: 0 },
                        { w: espessura, d: ch, x: cx + cw, z: cz + ch/2, rotY: 0 }
                    ];

                    paredes.forEach(p => {
                        const geoP = new THREE.BoxGeometry(p.w, peDireito, p.d);
                        const meshP = new THREE.Mesh(geoP, matParedeUsar);
                        meshP.position.set(p.x, nivelY + peDireito / 2 + 0.1, p.z);
                        meshP.castShadow = true;
                        meshP.receiveShadow = true;
                        state.meshGroup3d.add(meshP);
                    });

                    // D. PONTOS DE ILUMINAÇÃO (PERSISTENTES EM state.pontosEletricos)
                    const ptsDoComodo = state.pontosEletricos.filter(p => p.comodoId === c.id);
                    let luzesDoComodo = ptsDoComodo.filter(p => p.tipo === 'ILUM');

                    // Sem ILUM cadastrado: exibe uma luminária padrão apenas na maquete.
                    // NÃO grava no projeto (desenhar o 3D não pode alterar os dados; o QDT
                    // já considera a potência de iluminação padrão do cômodo nesse caso).
                    if (luzesDoComodo.length === 0) {
                        const novaLuz = {
                            id: 'pt_ilum_virtual_' + c.id,
                            virtual: true,
                            comodoId: c.id,
                            pavimentoId: pav.id,
                            tipo: 'ILUM',
                            nome: `Luz Central ${c.nome}`,
                            pot: 100 + (c.area >= 6 ? Math.floor((c.area - 6) / 4) * 60 : 0),
                            tensao: 127,
                            altura: 'teto',
                            x: c.x + (cw * state.escala) / 2,
                            y: c.y + (ch * state.escala) / 2
                        };
                        luzesDoComodo = [novaLuz];
                    }

                    // Lista de grupos de luminárias criados neste cômodo
                    const lumGruposDoComodo = [];

                    luzesDoComodo.forEach(luzPt => {
                        const luzX = luzPt.x * escala3D;
                        const luzZ = luzPt.y * escala3D;
                        const luzY = nivelY + peDireito - 0.02;

                        // GRUPO DESTA LUMINÁRIA ESPECÍFICA
                        const lumGroup = new THREE.Group();
                        lumGroup.position.set(luzX, luzY, luzZ);
                        lumGroup.userData = {
                            tipo: 'luminaria',
                            elementoTipo: 'ilum',
                            pontoRef: luzPt,
                            pontoId: luzPt.id,
                            comodoRef: c,
                            comodoId: c.id,
                            tubosConectados: []
                        };

                        // 1. Aro/Base circular de teto em alumínio acetinado
                        const geoAro = new THREE.CylinderGeometry(0.24, 0.26, 0.04, 24);
                        const matAro = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.5 });
                        const meshAro = new THREE.Mesh(geoAro, matAro);
                        lumGroup.add(meshAro);

                        // 2. Difusor translúcido central emissivo (Amarelo Quente / Sol)
                        const geoDifusor = new THREE.CylinderGeometry(0.19, 0.19, 0.025, 24);
                        const matDifusor = new THREE.MeshStandardMaterial({
                            color: 0xfffbeb,
                            emissive: 0xf59e0b,
                            emissiveIntensity: 1.4,
                            roughness: 0.1
                        });
                        const meshDifusor = new THREE.Mesh(geoDifusor, matDifusor);
                        meshDifusor.position.y = -0.018;
                        meshDifusor.userData = {
                            tipo: 'luminaria',
                            elementoTipo: 'ilum',
                            grupoRaiz: lumGroup,
                            pontoRef: luzPt,
                            pontoId: luzPt.id,
                            comodoRef: c,
                            comodoId: c.id
                        };
                        lumGroup.add(meshDifusor);

                        // 3. Halo luminoso (Corona emissiva ao redor do plafon)
                        const geoHalo = new THREE.RingGeometry(0.25, 0.42, 24);
                        const matHalo = new THREE.MeshBasicMaterial({
                            color: 0xfef08a,
                            transparent: true,
                            opacity: 0.45,
                            side: THREE.DoubleSide
                        });
                        const meshHalo = new THREE.Mesh(geoHalo, matHalo);
                        meshHalo.rotation.x = Math.PI / 2;
                        meshHalo.position.y = -0.022;
                        lumGroup.add(meshHalo);

                        // 4. Fonte de luz real suave pontual
                        const luzPontual = new THREE.PointLight(0xfff7ed, 0.75, 5.5, 1.6);
                        luzPontual.position.y = -0.15;
                        lumGroup.add(luzPontual);

                        state.meshGroup3d.add(lumGroup);
                        lumGruposDoComodo.push(lumGroup);
                    });

                    // Conecta eletrodutos entre múltiplas luminárias do mesmo cômodo
                    if (lumGruposDoComodo.length > 1) {
                        for (let lIdx = 0; lIdx < lumGruposDoComodo.length - 1; lIdx++) {
                            const gA = lumGruposDoComodo[lIdx];
                            const gB = lumGruposDoComodo[lIdx + 1];
                            const curvaEntreLuzes = new THREE.LineCurve3(
                                new THREE.Vector3(gA.position.x, gA.position.y, gA.position.z),
                                new THREE.Vector3(gB.position.x, gB.position.y, gB.position.z)
                            );
                            const geoInterLuz = new THREE.TubeGeometry(curvaEntreLuzes, 8, 0.022, 8, false);
                            const meshInterLuz = new THREE.Mesh(geoInterLuz, matTuboEletroduto);
                            meshInterLuz.userData = { tipo: 'eletroduto', elementoTipo: 'tubo' };
                            state.meshGroup3d.add(meshInterLuz);

                            // Registra para atualização em tempo real se qualquer uma das lâmpadas for arrastada
                            gA.userData.tubosConectados.push({ tubo: meshInterLuz, ehEntreLuzes: true, grupoA: gA, grupoB: gB });
                            gB.userData.tubosConectados.push({ tubo: meshInterLuz, ehEntreLuzes: true, grupoA: gA, grupoB: gB });
                        }
                    }

                    // Luminária primária para conexão aos conduítes gerais
                    let primLumGroup = lumGruposDoComodo[0];
                    if (!primLumGroup) {
                        primLumGroup = new THREE.Group();
                        primLumGroup.position.set(cx + cw / 2, nivelY + peDireito - 0.02, cz + ch / 2);
                        primLumGroup.userData = { tipo: 'luminaria', elementoTipo: 'ilum', tubosConectados: [] };
                        state.meshGroup3d.add(primLumGroup);
                        lumGruposDoComodo.push(primLumGroup);
                    }

                    // E. TOMADAS E INTERRUPTORES (CADA PONTO É UM OBJETO 3D TOTALMENTE INDEPENDENTE)
                    const pontosTomadas = ptsDoComodo.filter(p => p.tipo !== 'ILUM');
                    pontosTomadas.forEach(pt => {
                        const px = pt.x * escala3D;
                        const pz = pt.y * escala3D;
                        let py = nivelY + 0.30; // Tomada baixa padrão (30cm)
                        if (pt.altura === 'media') py = nivelY + 1.20; // Média (1.20m)
                        if (pt.altura === 'alta') py = nivelY + 2.00; // Alta (2.00m)
                        if (pt.altura === 'teto') py = nivelY + peDireito;

                        // GRUPO INDEPENDENTE DESTE PONTO (TOMADA OU INTERRUPTOR)
                        const tomadaGroup = new THREE.Group();
                        tomadaGroup.position.set(px, py, pz);

                        // Alinhamento da tomada com a parede mais próxima do cômodo
                        const dOeste = Math.abs(px - cx);
                        const dLeste = Math.abs(px - (cx + cw));
                        const dNorte = Math.abs(pz - cz);
                        const dSul = Math.abs(pz - (cz + ch));
                        const minD = Math.min(dOeste, dLeste, dNorte, dSul);

                        if (minD === dOeste) {
                            tomadaGroup.rotation.y = Math.PI / 2;
                        } else if (minD === dLeste) {
                            tomadaGroup.rotation.y = -Math.PI / 2;
                        } else if (minD === dSul) {
                            tomadaGroup.rotation.y = Math.PI;
                        } else {
                            tomadaGroup.rotation.y = 0;
                        }

                        // 1. Placa espelho 4x2 externa branca (0.13m larg x 0.20m alt)
                        const geoPlaca = new THREE.BoxGeometry(0.13, 0.20, 0.02);
                        const matPlaca = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1 });
                        const meshPlaca = new THREE.Mesh(geoPlaca, matPlaca);
                        meshPlaca.userData = {
                            tipo: 'tomada',
                            elementoTipo: 'tomada',
                            grupoRaiz: tomadaGroup,
                            pontoRef: pt,
                            pontoId: pt.id,
                            comodoId: c.id
                        };
                        tomadaGroup.add(meshPlaca);

                        // 2. Módulo central com diferenciação visual nítida
                        if (pt.tipo === 'INTERRUPTOR') {
                            // Tecla basculante de interruptor (Roxo / Violeta)
                            const geoTecla = new THREE.BoxGeometry(0.06, 0.10, 0.035);
                            const matTecla = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x7c3aed, emissiveIntensity: 0.45 });
                            const meshTecla = new THREE.Mesh(geoTecla, matTecla);
                            meshTecla.position.z = 0.008;
                            tomadaGroup.add(meshTecla);
                        } else if (pt.tipo === 'TUE') {
                            // Módulo TUE de alta potência (Azul Cobalto + Indicador)
                            const geoModulo = new THREE.BoxGeometry(0.08, 0.14, 0.03);
                            const matModulo = new THREE.MeshStandardMaterial({ color: 0x2563eb, emissive: 0x1d4ed8, emissiveIntensity: 0.55 });
                            const meshModulo = new THREE.Mesh(geoModulo, matModulo);
                            meshModulo.position.z = 0.006;
                            tomadaGroup.add(meshModulo);

                            // Furos 2P+T NBR 14136
                            const geoPin = new THREE.CylinderGeometry(0.008, 0.008, 0.015, 8);
                            const matPin = new THREE.MeshBasicMaterial({ color: 0x0f172a });
                            [-0.03, 0.0, 0.03].forEach(offY => {
                                const pin = new THREE.Mesh(geoPin, matPin);
                                pin.rotation.x = Math.PI / 2;
                                pin.position.set(0, offY, 0.02);
                                tomadaGroup.add(pin);
                            });
                        } else {
                            // Módulo TUG Geral (Moldura Verde Esmeralda)
                            const geoModulo = new THREE.BoxGeometry(0.08, 0.14, 0.03);
                            const matModulo = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.4 });
                            const meshModulo = new THREE.Mesh(geoModulo, matModulo);
                            meshModulo.position.z = 0.006;
                            tomadaGroup.add(meshModulo);

                            // Furos 2P+T NBR 14136
                            const geoPin = new THREE.CylinderGeometry(0.008, 0.008, 0.015, 8);
                            const matPin = new THREE.MeshBasicMaterial({ color: 0x0f172a });
                            [-0.03, 0.0, 0.03].forEach(offY => {
                                const pin = new THREE.Mesh(geoPin, matPin);
                                pin.rotation.x = Math.PI / 2;
                                pin.position.set(0, offY, 0.02);
                                tomadaGroup.add(pin);
                            });
                        }

                        // Encontra a luminária mais próxima deste ponto específico
                        let lumAlvo = primLumGroup;
                        let menorDist = Infinity;
                        lumGruposDoComodo.forEach(gL => {
                            if (gL && gL.position) {
                                const d = Math.hypot(gL.position.x - px, gL.position.z - pz);
                                if (d < menorDist) { menorDist = d; lumAlvo = gL; }
                            }
                        });

                        // Conexão de Eletroduto 3D (Teto vs Chão)
                        if (lumAlvo && lumAlvo.position) {
                            const distAlvo = Math.hypot(lumAlvo.position.x - px, lumAlvo.position.z - pz);
                            if (distAlvo > 0.05) {
                                let curvaTubo;
                                const matUsar = pavPassagemChao ? matTuboChao : matTuboEletroduto;
                                if (!pavPassagemChao) {
                                    curvaTubo = new THREE.CatmullRomCurve3([
                                        new THREE.Vector3(lumAlvo.position.x, lumAlvo.position.y, lumAlvo.position.z),
                                        new THREE.Vector3(px, lumAlvo.position.y, pz),
                                        new THREE.Vector3(px, py + 0.1, pz)
                                    ]);
                                } else {
                                    const nivelChao = nivelY + 0.06;
                                    curvaTubo = new THREE.CatmullRomCurve3([
                                        new THREE.Vector3(lumAlvo.position.x, nivelChao, lumAlvo.position.z),
                                        new THREE.Vector3(px, nivelChao, pz),
                                        new THREE.Vector3(px, py - 0.05, pz)
                                    ]);
                                }

                                const geoTubo = new THREE.TubeGeometry(curvaTubo, 12, 0.025, 8, false);
                                const meshTubo = new THREE.Mesh(geoTubo, matUsar);
                                meshTubo.userData = { tipo: 'eletroduto', elementoTipo: 'tubo', pontoRef: pt };
                                state.meshGroup3d.add(meshTubo);

                                // VINCULA O ELETRODUTO À TOMADA E À LUMINÁRIA PARA ATUALIZAÇÃO CONTÍNUA EM TEMPO REAL
                                tomadaGroup.userData.tuboMesh = meshTubo;
                                tomadaGroup.userData.lumAlvoGroup = lumAlvo;
                                tomadaGroup.userData.pavPassagemChao = pavPassagemChao;
                                tomadaGroup.userData.nivelY = nivelY;

                                if (lumAlvo.userData && lumAlvo.userData.tubosConectados) {
                                    lumAlvo.userData.tubosConectados.push({
                                        tubo: meshTubo,
                                        ehEntreLuzes: false,
                                        tomadaGroup: tomadaGroup,
                                        pavPassagemChao: pavPassagemChao,
                                        nivelY: nivelY
                                    });
                                }
                            }
                        }

                        state.meshGroup3d.add(tomadaGroup);
                    });

                    // INFRAESTRUTURA COMPARTILHADA ENTRE PAVIMENTOS (SE PASSAGEM CHÃO)
                    if (pavPassagemChao) {
                        const luzX = primLumGroup.position.x;
                        const luzY = primLumGroup.position.y;
                        const luzZ = primLumGroup.position.z;

                        if (pIdx < state.pavimentos.length - 1) {
                            const proxNivelChao = (pIdx + 1) * 3.0 + (state.explodido3d ? (pIdx + 1) * 1.8 : 0) + 0.06;
                            const curvaLajeUnica = new THREE.LineCurve3(
                                new THREE.Vector3(luzX, proxNivelChao, luzZ),
                                new THREE.Vector3(luzX, luzY, luzZ)
                            );
                            const geoDescidaLaje = new THREE.TubeGeometry(curvaLajeUnica, 8, 0.028, 8, false);
                            const meshDescida = new THREE.Mesh(geoDescidaLaje, matTuboChao);
                            meshDescida.userData = { tipo: 'eletroduto_infra_unica', elementoTipo: 'tubo' };
                            state.meshGroup3d.add(meshDescida);
                        } else {
                            const curvaSubidaTeto = new THREE.CatmullRomCurve3([
                                new THREE.Vector3(luzX, nivelY + 0.06, luzZ),
                                new THREE.Vector3(cx, nivelY + 0.06, cz),
                                new THREE.Vector3(cx, luzY, cz),
                                new THREE.Vector3(luzX, luzY, luzZ)
                            ]);
                            const geoSubida = new THREE.TubeGeometry(curvaSubidaTeto, 14, 0.025, 8, false);
                            const meshSubida = new THREE.Mesh(geoSubida, matTuboChao);
                            meshSubida.userData = { elementoTipo: 'tubo' };
                            state.meshGroup3d.add(meshSubida);
                        }
                    }
                });
            });

            // 2. PRUMADA VERTICAL 3D (SHAFT CONECTANDO OS ANDARES)
            if (state.prumadaAtiva !== false && state.pavimentos && state.pavimentos.length > 1) {
                const prumada = state.prumadaPos || { x: 300, y: 80 };
                const pruX = (prumada.x || 300) * escala3D;
                const pruZ = (prumada.y || 80) * escala3D;
                const alturaTotalPrumada = (state.pavimentos.length - 1) * 3.0 + (state.explodido3d ? 1.8 : 0);

                const curvaPrumada = new THREE.LineCurve3(
                    new THREE.Vector3(pruX, 0.2, pruZ),
                    new THREE.Vector3(pruX, alturaTotalPrumada + 2.8, pruZ)
                );
                const geoPrumada = new THREE.TubeGeometry(curvaPrumada, 16, 0.07, 12, false);
                const meshPrumada = new THREE.Mesh(geoPrumada, matPrumada);
                meshPrumada.userData = { elementoTipo: 'prumada' };
                state.meshGroup3d.add(meshPrumada);
            }

            // 3. TRANSIÇÕES 3D (PAREDES DE ALVENARIA, PORTAS, ETC.)
            (state.transicoes || []).forEach(t => {
                const pav = state.pavimentos.find(p => p.id === t.pavimentoId);
                if (!pav) return;
                const pIdx = state.pavimentos.indexOf(pav);
                const nivelY = pIdx * 3.0 + (state.explodido3d ? pIdx * 1.8 : 0);
                const peDir = pav.alturaPeDireito || 2.8;

                const tx = (t.x || 0) * escala3D;
                const tz = (t.y || 0) * escala3D;

                if (t.tipo === 'parede') {
                    const geoP = new THREE.BoxGeometry(t.orientacao === 'V' ? 0.18 : 1.6, peDir, t.orientacao === 'V' ? 1.6 : 0.18);
                    const matP = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
                    const meshP = new THREE.Mesh(geoP, matP);
                    meshP.position.set(tx, nivelY + peDir / 2, tz);
                    meshP.userData = { tipo: 'parede_divisoria', transicaoRef: t };
                    state.meshGroup3d.add(meshP);
                } else if (t.tipo === 'porta') {
                    const geoPorta = new THREE.BoxGeometry(t.orientacao === 'V' ? 0.08 : 0.9, 2.1, t.orientacao === 'V' ? 0.9 : 0.08);
                    const matPorta = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 });
                    const meshPorta = new THREE.Mesh(geoPorta, matPorta);
                    meshPorta.position.set(tx, nivelY + 1.05, tz);
                    meshPorta.userData = { tipo: 'porta_3d', transicaoRef: t };
                    state.meshGroup3d.add(meshPorta);
                }
            });

            // 4. ESCADAS ARQUITETÔNICAS 3D (INTERLIGAÇÃO FÍSICA ENTRE PAVIMENTOS COM DEGRAUS E GUARDA-CORPO)
            (state.escadas || []).forEach(esc => {
                const pavOrigem = state.pavimentos.find(p => p.id === esc.pavimentoOrigemId) || state.pavimentos[0];
                const pavDestino = state.pavimentos.find(p => p.id === esc.pavimentoDestinoId) || state.pavimentos[1];
                if (!pavOrigem) return;

                const pIdxOrigem = state.pavimentos.indexOf(pavOrigem);
                const pIdxDestino = pavDestino ? state.pavimentos.indexOf(pavDestino) : (pIdxOrigem + 1);

                const nivelYOrigem = pIdxOrigem * 3.0 + (state.explodido3d ? pIdxOrigem * 1.8 : 0);
                const nivelYDestino = pIdxDestino * 3.0 + (state.explodido3d ? pIdxDestino * 1.8 : 0);
                const alturaTotal = nivelYDestino - nivelYOrigem;

                const numDeg = esc.numDegraus || 16;
                const dY = alturaTotal / numDeg;
                const isVert = (esc.orientacao === 'V');
                const dir = esc.direcao || 'H_DIR';

                const escStartX = esc.x * escala3D;
                const escStartZ = esc.y * escala3D;
                const escLargura3D = esc.largura || 0.95; // metros
                const escComprimento3D = esc.comprimento || 2.60; // metros
                const stepRun = escComprimento3D / numDeg; // profundidade útil de cada degrau

                // Materiais de acabamento arquitetônico premium
                const matTread = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.1 }); // Madeira Nobre Carvalho Dourado
                const matEstrutura = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6, metalness: 0.4 }); // Aço estrutural escuro fosco
                const matInox = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, metalness: 0.85 }); // Inox polido

                // Renderiza os degraus em ascensão contínua
                for (let k = 0; k < numDeg; k++) {
                    const stepY = nivelYOrigem + (k + 1) * dY;
                    let stepCenterX, stepCenterZ;
                    let geomW, geomD;

                    if (!isVert) {
                        geomW = stepRun * 1.05;
                        geomD = escLargura3D;
                        const progX = (dir === 'H_ESQ') ? (escStartX + escComprimento3D - (k + 0.5) * stepRun) : (escStartX + (k + 0.5) * stepRun);
                        stepCenterX = progX;
                        stepCenterZ = escStartZ + escLargura3D / 2;
                    } else {
                        geomW = escLargura3D;
                        geomD = stepRun * 1.05;
                        const progZ = (dir === 'V_CIMA') ? (escStartZ + escComprimento3D - (k + 0.5) * stepRun) : (escStartZ + (k + 0.5) * stepRun);
                        stepCenterX = escStartX + escLargura3D / 2;
                        stepCenterZ = progZ;
                    }

                    // Prancha do degrau (tread)
                    const geoStep = new THREE.BoxGeometry(geomW, 0.045, geomD);
                    const meshStep = new THREE.Mesh(geoStep, matTread);
                    meshStep.position.set(stepCenterX, stepY - 0.022, stepCenterZ);
                    meshStep.castShadow = true;
                    meshStep.receiveShadow = true;
                    meshStep.userData = { tipo: 'escada_degrau', escadaId: esc.id };
                    state.meshGroup3d.add(meshStep);

                    // Viga de suporte central / espinha metálica sob o degrau
                    const spineW = isVert ? 0.16 : geomW * 0.98;
                    const spineD = isVert ? geomD * 0.98 : 0.16;
                    const geoSpine = new THREE.BoxGeometry(spineW, dY, spineD);
                    const meshSpine = new THREE.Mesh(geoSpine, matEstrutura);
                    meshSpine.position.set(stepCenterX, stepY - dY / 2 - 0.02, stepCenterZ);
                    state.meshGroup3d.add(meshSpine);

                    // Balaústre de proteção lateral a cada 2 degraus
                    if (k % 2 === 0) {
                        const geoBalaustre = new THREE.CylinderGeometry(0.012, 0.012, 0.90, 8);
                        const meshBal = new THREE.Mesh(geoBalaustre, matInox);
                        const balOffX = isVert ? (escLargura3D / 2 - 0.03) : 0;
                        const balOffZ = !isVert ? (escLargura3D / 2 - 0.03) : 0;
                        meshBal.position.set(stepCenterX + balOffX, stepY + 0.45, stepCenterZ + balOffZ);
                        state.meshGroup3d.add(meshBal);
                    }
                }

                // Tubo contínuo do corrimão lateral seguindo a inclinação da escada
                let pInicio, pFim;
                const hCorr = 0.90;
                if (!isVert) {
                    const startX = (dir === 'H_ESQ') ? (escStartX + escComprimento3D) : escStartX;
                    const endX = (dir === 'H_ESQ') ? escStartX : (escStartX + escComprimento3D);
                    const zCorr = escStartZ + escLargura3D - 0.03;
                    pInicio = new THREE.Vector3(startX, nivelYOrigem + hCorr, zCorr);
                    pFim = new THREE.Vector3(endX, nivelYDestino + hCorr, zCorr);
                } else {
                    const startZ = (dir === 'V_CIMA') ? (escStartZ + escComprimento3D) : escStartZ;
                    const endZ = (dir === 'V_CIMA') ? escStartZ : (escStartZ + escComprimento3D);
                    const xCorr = escStartX + escLargura3D - 0.03;
                    pInicio = new THREE.Vector3(xCorr, nivelYOrigem + hCorr, startZ);
                    pFim = new THREE.Vector3(xCorr, nivelYDestino + hCorr, endZ);
                }

                const curvaCorrimao = new THREE.LineCurve3(pInicio, pFim);
                const geoCorrimaoTubo = new THREE.TubeGeometry(curvaCorrimao, 16, 0.024, 8, false);
                const meshCorrTubo = new THREE.Mesh(geoCorrimaoTubo, matInox);
                state.meshGroup3d.add(meshCorrTubo);

                // Guarda-corpo de proteção no pavimento superior ao redor da abertura
                const nivelSuperiorChao = nivelYDestino;
                const holeX0 = escStartX;
                const holeX1 = escStartX + (isVert ? escLargura3D : escComprimento3D);
                const holeZ0 = escStartZ;
                const holeZ1 = escStartZ + (isVert ? escComprimento3D : escLargura3D);

                // 4 postes nos cantos da abertura no andar superior
                [
                    new THREE.Vector3(holeX0, nivelSuperiorChao, holeZ0),
                    new THREE.Vector3(holeX1, nivelSuperiorChao, holeZ0),
                    new THREE.Vector3(holeX1, nivelSuperiorChao, holeZ1),
                    new THREE.Vector3(holeX0, nivelSuperiorChao, holeZ1)
                ].forEach(ptP => {
                    const postGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.95, 8);
                    const postMesh = new THREE.Mesh(postGeo, matInox);
                    postMesh.position.set(ptP.x, nivelSuperiorChao + 0.475, ptP.z);
                    state.meshGroup3d.add(postMesh);
                });
            });

            aplicarFiltroElemento3d();
            state.cena3dDesatualizada = false;
            pedirRenderizacao3D(35);
            } catch (err3d) {
                console.error('Erro durante reconstrução da cena 3D:', err3d);
            }
        }

        

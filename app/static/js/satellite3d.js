class Satellite3DViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.earth = null;
        this.satellite = null;
        this.controls = null;
        this.orbitLine = null;
        this.orbitMesh = null;
        this.orbitMeshPast = null;
        this.orbitMeshFuture = null;
        this.lastGeoPosition = null;
        this.issLabel = null;
        this.currentSatellite = null;
        this.satellites = [];
        this.selectedSatellite = 'ISS_25544'; // Já define ISS como padrão
        this.earthCreated = false;
        this.lastUpdate = null;
        // ISS Modal View
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.issModalScene = null;
        this.issModalCamera = null;
        this.issModalRenderer = null;
        this.issModalControls = null;
        this.issModalActive = false;
        this.issGlow = null;
        this.isHoveringISS = false;
        this.init();
        // Carrega satélite automaticamente após um pequeno delay para garantir que a cena está pronta
        setTimeout(() => {
            // Mostra loading antes de carregar
            this.showCenterLoading(true);
        this.loadSatellites();
        }, 100);
    }

    init() {
        this.createScene();
        this.setupLighting();
        // Cria a Terra imediatamente para não ficar em branco
        this.createEarth();
        this.setupControls();
        this.setupEventListeners();
        this.animate();
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.container = document.getElementById('earthContainer');
        const { clientWidth, clientHeight } = this.container;
        this.camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000);
        this.camera.position.z = 3;
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(clientWidth, clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.4; // Mais exposição para realismo estilo NASA
        
        this.container.appendChild(this.renderer.domElement);
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createEarth() {
        if (this.earthCreated) return;
        
        // Geometria mais detalhada para melhor qualidade (estilo NASA)
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        const textureLoader = new THREE.TextureLoader();
        
        // Texturas da Terra
        const earthTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg');
        const earthBumpMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg');
        const earthSpecular = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg');
        
        // Melhorar qualidade das texturas (anisotropic filtering)
        earthTexture.anisotropy = 16;
        earthBumpMap.anisotropy = 16;
        earthSpecular.anisotropy = 16;
        
        // Usar MeshStandardMaterial para melhor realismo (PBR - Physical Based Rendering)
        const material = new THREE.MeshStandardMaterial({
            map: earthTexture,
            normalMap: earthBumpMap,
            normalScale: new THREE.Vector2(0.85, 0.85),
            roughnessMap: earthSpecular,
            roughness: 0.9,
            metalness: 0.1
        });
        
        this.earth = new THREE.Mesh(geometry, material);
        this.scene.add(this.earth);
        
        // Camada de nuvens melhorada e mais realista
        const cloudsTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png');
        cloudsTexture.anisotropy = 16;
        const cloudsMaterial = new THREE.MeshStandardMaterial({
            map: cloudsTexture,
            transparent: true,
            opacity: 0.6,
            alphaTest: 0.05,
            side: THREE.DoubleSide
        });
        const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.005, 64, 64), cloudsMaterial);
        this.scene.add(clouds);
        this.clouds = clouds;
        
        // Glow atmosférico melhorado (auréola azul realista estilo NASA)
        const atmosphereGeometry = new THREE.SphereGeometry(1.02, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                c: { value: 0.8 },
                p: { value: 2.0 },
                glowColor: { value: new THREE.Color(0x5FC0FF) },
                viewVector: { value: this.camera.position }
            },
            vertexShader: `
                uniform vec3 viewVector;
                uniform float c;
                uniform float p;
                varying float intensity;
                void main() {
                    vec3 vNormal = normalize(normalMatrix * normal);
                    vec3 vNormel = normalize(normalMatrix * viewVector);
                    intensity = pow(c - dot(vNormal, vNormel), p);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 glowColor;
                varying float intensity;
                void main() {
                    vec3 glow = glowColor * intensity;
                    gl_FragColor = vec4(glow, intensity * 0.6);
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(atmosphere);
        this.atmosphere = atmosphere;
        this.createStars();
        this.earthCreated = true;
    }

    createStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.8,
            sizeAttenuation: false,
            transparent: true,
            opacity: 0.9
        });
        
        const starsVertices = [];
        const starsColors = [];
        for (let i = 0; i < 8000; i++) {
            // Distribuição mais realista (mais estrelas próximas, menos distantes)
            const radius = Math.random() * 1500 + 500;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            starsVertices.push(x, y, z);
            
            // Variação sutil de brilho
            const brightness = 0.7 + Math.random() * 0.3;
            starsColors.push(brightness, brightness, brightness);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starsColors, 3));
        starsMaterial.vertexColors = true;
        
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
        this.stars = stars;
    }

    createSatellite() {
        if (this.satellite) {
            this.scene.remove(this.satellite);
        }

        const satelliteGroup = new THREE.Group();

        // Corpo principal do satélite (cubo pequeno)
        const bodyGeometry = new THREE.BoxGeometry(0.03, 0.02, 0.05);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xcccccc,
            shininess: 100
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        satelliteGroup.add(body);

        // Painéis solares
        const solarPanelGeometry = new THREE.BoxGeometry(0.1, 0.008, 0.06);
        const solarPanelMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2E86C1,
            shininess: 50
        });

        const solarPanel1 = new THREE.Mesh(solarPanelGeometry, solarPanelMaterial);
        solarPanel1.position.x = 0.065;
        satelliteGroup.add(solarPanel1);

        const solarPanel2 = new THREE.Mesh(solarPanelGeometry, solarPanelMaterial);
        solarPanel2.position.x = -0.065;
        satelliteGroup.add(solarPanel2);

        // Antena
        const antennaGeometry = new THREE.CylinderGeometry(0.002, 0.002, 0.04, 8);
        const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.z = 0.03;
        antenna.rotation.x = Math.PI / 2;
        satelliteGroup.add(antenna);

        this.satellite = satelliteGroup;
        this.scene.add(this.satellite);

        // Posiciona o satélite em uma posição inicial
        this.satellite.position.set(1.5, 0, 0);
    }

    setupLighting() {
        // Luz ambiente
        const ambientLight = new THREE.AmbientLight(0x333333, 0.7);
        this.scene.add(ambientLight);

        // Luz direcional principal (Sol) - mais brilhante para realismo
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 2.0);
        directionalLight.position.set(8, 5, 8);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Luz de preenchimento
        const fillLight = new THREE.DirectionalLight(0xFFFFFF, 0.6);
        fillLight.position.set(-6, -2, -4);
        this.scene.add(fillLight);

        // Luz hemisférica suave para iluminar regiões escuras
        const hemiLight = new THREE.HemisphereLight(0xA9CFF7, 0x0b1220, 0.4);
        this.scene.add(hemiLight);
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.minDistance = 1.5;
        this.controls.maxDistance = 10;
    }

    setupEventListeners() {
        // Sidebar removida - não precisa mais de listeners de busca e botão
        
        // Detecção de clique na ISS (só se renderer existir)
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));
            
            // Detecção de hover para glow
            this.renderer.domElement.addEventListener('mousemove', (e) => this.onCanvasHover(e));
            this.renderer.domElement.addEventListener('mouseleave', () => this.onCanvasLeave());
        }

        // Botão fechar modal ISS
        const closeBtn = document.getElementById('issCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeISSModal();
            });
        }
    }

    async loadSatellites() {
        try {
            const response = await fetch('/api/satellites');
            this.satellites = await response.json();
            // Carrega automaticamente a ISS (sempre será o primeiro/único)
            if (this.satellites.length > 0) {
                this.selectedSatellite = this.satellites[0].id || 'ISS_25544';
            } else {
                // Fallback: usa ISS diretamente se API não retornar
                this.selectedSatellite = 'ISS_25544';
            }
            // Carrega o satélite automaticamente
            await this.loadSelectedSatellite();
        } catch (error) {
            console.error('Erro ao carregar satélites:', error);
            // Em caso de erro, tenta carregar ISS diretamente
            this.selectedSatellite = 'ISS_25544';
            await this.loadSelectedSatellite();
        }
    }

    renderSatellites(satellites = this.satellites) {
        const container = document.getElementById('satelliteList');
        container.innerHTML = '';

        if (satellites.length === 0) {
            container.innerHTML = '<div class="no-satellites">Nenhum satélite encontrado</div>';
            return;
        }

        satellites.forEach(satellite => {
            const item = document.createElement('div');
            item.className = 'satellite-item';
            item.innerHTML = `
                <div class="satellite-icon">🛰️</div>
                <div class="satellite-info">
                    <h3>${satellite.name}</h3>
                    <p>ID: ${satellite.id}</p>
                    <small>NORAD: ${satellite.norad_id}</small>
                </div>
            `;

            item.addEventListener('click', () => {
                // Remove seleção anterior
                document.querySelectorAll('.satellite-item').forEach(el => {
                    el.classList.remove('active');
                });

                // Adiciona seleção atual
                item.classList.add('active');
                this.selectedSatellite = satellite.id;

                // Habilita botão
                document.getElementById('loadSatelliteBtn').disabled = false;
            });

            container.appendChild(item);
        });
    }

    filterSatellites(query) {
        if (!query) {
            this.renderSatellites();
            return;
        }

        const filtered = this.satellites.filter(sat => 
            sat.id.toLowerCase().includes(query.toLowerCase()) || 
            sat.name.toLowerCase().includes(query.toLowerCase())
        );
        this.renderSatellites(filtered);
    }

    async loadSelectedSatellite() {
        if (!this.selectedSatellite) {
            this.selectedSatellite = 'ISS_25544'; // Fallback para ISS
        }

        // Mostra loading centralizado se ainda não estiver mostrando
        this.showCenterLoading(true);

        try {
            // Garante que a Terra está criada
            if (!this.earthCreated) {
            this.createEarth();
            }
            // Carrega o satélite (modelo real da NASA)
            await this.loadISSFromGLB();
            
            // Aguarda um pouco para garantir que o modelo foi adicionado à cena
            await new Promise(resolve => setTimeout(resolve, 100));

            // Define satélite atual no servidor
            await fetch('/api/satellites/current', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ satellite_id: this.selectedSatellite })
            });

            // Busca posição atual
            await this.fetchSatellitePosition();

            // Busca dados orbitais
            await this.fetchOrbitData();

            this.currentSatellite = this.selectedSatellite;
            this.showCenterLoading(false);

        } catch (error) {
            console.error('Erro ao carregar satélite:', error);
            this.showCenterLoading(false);
        }
    }
    
    showCenterLoading(show) {
        const loadingCenter = document.getElementById('loadingCenter');
        if (loadingCenter) {
            if (show) {
                loadingCenter.classList.add('active');
            } else {
                loadingCenter.classList.remove('active');
            }
        }
    }

    // Caminhos estáticos do modelo da NASA
    get ISS_GLB_PATH() { return '/static/models/iss/ISS_stationary.glb'; }
    get ISS_USDZ_PATH() { return '/static/models/iss/ISS_stationary.usdz'; }

    loadISSFromGLB() {
        return new Promise((resolve, reject) => {
            if (this.satellite) this.scene.remove(this.satellite);

            const loader = new THREE.GLTFLoader();
            this.showLoading(true);
            loader.load(
                this.ISS_GLB_PATH,
                (gltf) => {
                    const model = gltf.scene;
                    model.scale.setScalar(0.001);
                    model.traverse((obj) => {
                        if (obj.isMesh) {
                            obj.castShadow = true;
                            obj.receiveShadow = true;
                        }
                    });
                    model.position.set(1.5, 0, 0);
                    this.satellite = model;
                    this.scene.add(this.satellite);
                    this.showLoading(false);
                    resolve();
                },
                undefined,
                (err) => {
                    console.error('Falha ao carregar GLB:', err);
                    this.showLoading(false);
                    this.showError('Falha ao carregar modelo GLB da ISS');
                    reject(err);
                }
            );
        });
    }

    loadISSFromUSDZ() {
        return new Promise((resolve, reject) => {
            if (this.satellite) this.scene.remove(this.satellite);

            const loader = new THREE.USDZLoader();
            this.showLoading(true);
            loader.load(
                this.ISS_USDZ_PATH,
                (group) => {
                    group.scale.setScalar(0.001);
                    group.traverse((obj) => {
                        if (obj.isMesh) {
                            obj.castShadow = true;
                            obj.receiveShadow = true;
                        }
                    });
                    group.position.set(1.5, 0, 0);
                    this.satellite = group;
                    this.scene.add(this.satellite);
                    this.showLoading(false);
                    resolve();
                },
                undefined,
                (err) => {
                    console.error('Falha ao carregar USDZ:', err);
                    this.showLoading(false);
                    this.showError('Falha ao carregar modelo USDZ da ISS');
                    reject(err);
                }
            );
        });
    }

    async fetchSatellitePosition() {
        try {
            // Use a posição prevista pelo mesmo TLE/SGP4 da trilha para ficar perfeitamente alinhado
            const response = await fetch(`/api/satellites/${this.selectedSatellite}/position_predicted`);
            const data = await response.json();
            
            if (data && !data.error) {
                this.updateSatellitePosition(data);
                this.updateInfoPanel(data);
            } else {
                this.showError('Dados do satélite não encontrados');
            }
        } catch (error) {
            console.error('Erro ao buscar posição:', error);
            this.showError('Erro ao buscar posição do satélite');
        }
    }

    async fetchOrbitData() {
        try {
            const response = await fetch(`/api/satellites/${this.selectedSatellite}/orbit_predicted?n=5400&step=60`);
            const orbitData = await response.json();
            this.orbitData = orbitData;
            this.showOrbit(orbitData);
        } catch (error) {
            console.error('Erro ao buscar dados orbitais:', error);
            this.showError('Erro ao carregar trajetória orbital');
        }
    }

    updateSatellitePosition(data) {
        if (!data.latitude || !data.longitude) {
            console.error('Dados de posição inválidos:', data);
            return;
        }

        const pos = this.geographicToCartesian(
            data.latitude, 
            data.longitude, 
            1.06  // Altitude fixa para a ISS (~400km acima da Terra)
        );

        // Guarda última posição geográfica para calcular degradê da órbita
        this.lastGeoPosition = { lat: data.latitude, lon: data.longitude };
        // Reposiciona o arco orbital para "grudar" na ISS sempre que a posição atualiza
        if (this.orbitData && this.orbitData.length > 0) {
            this.showOrbit(this.orbitData);
        }

        // Atualiza posição do satélite
        if (this.satellite) {
            this.satellite.position.copy(pos);
            
            // Orienta o satélite para "olhar" na direção do movimento
            this.satellite.lookAt(this.earth.position);
            
            // Rotação dos painéis solares (animação)
            if (this.satellite.children[1] && this.satellite.children[2]) {
                this.satellite.children[1].rotation.y += 0.01;
                this.satellite.children[2].rotation.y += 0.01;
            }
            
            // Atualiza label "ISS"
            this.updateISSLabel(pos);
        }
    }

    updateISSLabel(position) {
        if (!this.satellite) return;
        
        // Remove label anterior se existir
        if (this.issLabel) {
            this.scene.remove(this.issLabel);
        }
        
        // Cria canvas para o texto (SEM fundo preto - estilo NASA)
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Apenas texto branco, sem fundo
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ISS', canvas.width / 2, canvas.height / 2);
        
        // Cria texture e sprite
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(0.2, 0.1, 1);
        sprite.userData = { desireClickable: true }; // Marca como clicável
        
        // Posiciona ligeiramente acima do satélite
        const offset = position.clone().normalize().multiplyScalar(0.12);
        sprite.position.copy(position).add(offset);
        
        this.issLabel = sprite;
        this.scene.add(sprite);
    }

    updateInfoPanel(data) {
        // Atualiza apenas elementos que existem, com verificação de segurança
        const infoLatEl = document.getElementById('infoLat');
        const infoLonEl = document.getElementById('infoLon');
        const infoAltEl = document.getElementById('infoAlt');
        const infoVelEl = document.getElementById('infoVel');
        const infoUpdateEl = document.getElementById('infoUpdate');
        const statusElement = document.getElementById('infoStatus');
        
        if (infoLatEl) infoLatEl.textContent = data.latitude?.toFixed(4) + '°' || '-';
        if (infoLonEl) infoLonEl.textContent = data.longitude?.toFixed(4) + '°' || '-';
        if (infoAltEl) infoAltEl.textContent = data.altitude?.toFixed(0) + ' km' || '-';
        if (infoVelEl) infoVelEl.textContent = data.velocity?.toFixed(2) + ' km/s' || '-';
        if (infoUpdateEl) infoUpdateEl.textContent = new Date().toLocaleTimeString();
        
        if (statusElement) {
        statusElement.textContent = 'Online';
        statusElement.className = 'info-value status-online';
        }
    }

    showOrbit(orbitData) {
        if (!orbitData || !orbitData.length) {
            console.warn('Nenhum dado orbital disponível');
            return;
        }

        // Remove órbita anterior
        if (this.orbitLine) { this.scene.remove(this.orbitLine); this.orbitLine = null; }
        if (this.orbitPoints) { this.scene.remove(this.orbitPoints); this.orbitPoints = null; }
        if (this.orbitFutureLine) { this.scene.remove(this.orbitFutureLine); this.orbitFutureLine = null; }
        if (this.orbitPastLine) { this.scene.remove(this.orbitPastLine); this.orbitPastLine = null; }
        if (this.orbitMesh) { this.scene.remove(this.orbitMesh); this.orbitMesh = null; }
        if (this.orbitMeshPast) { this.scene.remove(this.orbitMeshPast); this.orbitMeshPast = null; }
        if (this.orbitMeshFuture) { this.scene.remove(this.orbitMeshFuture); this.orbitMeshFuture = null; }
        // Remove arrays de linhas com fade
        if (this.orbitPastLines) {
            this.orbitPastLines.forEach(line => this.scene.remove(line));
            this.orbitPastLines = null;
        }
        if (this.orbitFutureLines) {
            this.orbitFutureLines.forEach(line => this.scene.remove(line));
            this.orbitFutureLines = null;
        }

        const points = [];
        // Altitude orbital ligeiramente acima da Terra para evitar z-fighting
        const altitudeOrbit = 1.062;
        orbitData.forEach(point => {
            const pos = this.geographicToCartesian(
                point.latitude, 
                point.longitude, 
                altitudeOrbit
            );
            points.push(pos);
        });

        // Determina o índice mais próximo da posição atual para separar passado/futuro
        let splitIndex = Math.floor(points.length / 2);
        if (this.lastGeoPosition) {
            let bestDist = Infinity;
            orbitData.forEach((p, i) => {
                const dLat = (p.latitude - this.lastGeoPosition.lat);
                const dLon = (p.longitude - this.lastGeoPosition.lon);
                const dist = dLat * dLat + dLon * dLon;
                if (dist < bestDist) { bestDist = dist; splitIndex = i; }
            });
        }

        // Renderiza apenas o traço futuro (sem rastro passado)
        const futureCount = 180; // ~3h para frente (mais longo)
        const endFuture = Math.min(points.length - 1, splitIndex + futureCount);

        // Cria traço contínuo com fade dramático estilo NASA (quase invisível no final)
        const createFadedLine = (pointsArray, isPast = false) => {
            if (pointsArray.length < 2) return [];
            
            // Renderiza cada segmento individualmente para garantir continuidade completa
            const orbitLines = [];
            const totalPoints = pointsArray.length;
            
            // Renderiza cada par de pontos consecutivos para garantir traço contínuo
            for (let i = 0; i < totalPoints - 1; i += 1) {
                // Pega o ponto atual e o próximo para criar um segmento
                const startPoint = pointsArray[i];
                const endPoint = pointsArray[i + 1];
                
                if (!startPoint || !endPoint) continue;
                
                const segmentPoints = [startPoint, endPoint];
                const geom = new THREE.BufferGeometry().setFromPoints(segmentPoints);
                
                // Calcula distância normalizada do segmento até o satélite
                // Para passado: o último índice do array é onde está o satélite
                // Para futuro: o primeiro índice do array (0) é onde está o satélite
                let distFromSatellite;
                if (isPast) {
                    // Distância aumenta quanto mais longe do satélite (que está no final)
                    distFromSatellite = (totalPoints - 1 - i) / (totalPoints - 1);
                } else {
                    // Distância aumenta quanto mais longe do satélite (que está no início)
                    distFromSatellite = i / (totalPoints - 1);
                }
                
                // Fade dramático estilo NASA: muito visível no início, quase invisível no final
                // Usa função exponencial para fade suave e dramático
                const fadePower = 3.2; // Mais dramático para fade quase invisível
                const baseOpacity = Math.pow(1.0 - distFromSatellite, fadePower);
                
                // Opacidade mínima muito baixa (quase invisível) no final
                const minOpacity = 0.01; // Ainda mais invisível
                const finalOpacity = Math.max(minOpacity, baseOpacity);
                
                // Se opacidade muito baixa, não renderiza para performance
                if (finalOpacity < 0.008) continue;
                
                const color = isPast ? 0x8FA0B5 : 0xFFFFFF;
                
                const mat = new THREE.LineBasicMaterial({ 
                    color: color, 
                    transparent: true, 
                    opacity: finalOpacity,
                    depthTest: true, 
                    depthWrite: false
                });
                
                const line = new THREE.Line(geom, mat);
                orbitLines.push(line);
                this.scene.add(line);
            }
            
            return orbitLines;
        };

        // Apenas traço futuro - sem rastro passado
        // NUNCA inclui a posição atual do satélite
        // Começa DEPOIS do satélite para não sobrepor
        if (endFuture - splitIndex > 1) {
            const futureSlice = points.slice(splitIndex + 1, endFuture + 1); // Não inclui splitIndex (satélite)
            if (futureSlice.length > 1) {
                this.orbitFutureLines = createFadedLine(futureSlice, false) || [];
            }
        }
    }

    geographicToCartesian(lat, lon, altitude = 1.06) {
        // Converte coordenadas geográficas para cartesianas 3D
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -(altitude * Math.sin(phi) * Math.cos(theta));
        const z = altitude * Math.sin(phi) * Math.sin(theta);
        const y = altitude * Math.cos(phi);

        return new THREE.Vector3(x, y, z);
    }

    showLoading(show) {
        // Usa o loading centralizado ao invés do da sidebar
        this.showCenterLoading(show);
    }

    showError(message) {
        // Cria uma notificação de erro temporária
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 5000);
    }

    onWindowResize() {
        if (!this.container) return;
        const { clientWidth, clientHeight } = this.container;
        this.camera.aspect = clientWidth / clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(clientWidth, clientHeight);
        
        // Resize modal também se estiver aberto
        if (this.issModalActive && this.issModalRenderer) {
            const modalContainer = document.getElementById('issViewContainer');
            const { clientWidth: w, clientHeight: h } = modalContainer;
            this.issModalCamera.aspect = w / h;
            this.issModalCamera.updateProjectionMatrix();
            this.issModalRenderer.setSize(w, h);
        }
    }

    onCanvasClick(event) {
        if (!this.satellite) return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        // Verifica clique no satélite ou no label
        const objectsToCheck = [this.satellite];
        if (this.issLabel) objectsToCheck.push(this.issLabel);
        
        const intersects = this.raycaster.intersectObjects(objectsToCheck, true);
        
        if (intersects.length > 0) {
            // Se clicou no satélite ou label, mostra loading e abre modal 3D
            this.showCenterLoading(true);
            setTimeout(() => {
                this.openISSModal();
                this.showCenterLoading(false);
            }, 300);
        }
    }

    openISSModal() {
        if (!this.satellite) return;
        
        const modal = document.getElementById('issModal');
        modal.classList.add('active');
        this.issModalActive = true;
        
        this.createISSModalView();
    }

    createISSModalView() {
        const container = document.getElementById('issViewContainer');
        const { clientWidth, clientHeight } = container;
        
        // Cria cena separada para o modal
        this.issModalScene = new THREE.Scene();
        this.issModalScene.background = new THREE.Color(0x000000);
        
        // Câmera focada na ISS com visão externa e distante
        // Near plane muito baixo para permitir zoom muito próximo sem desaparecer
        this.issModalCamera = new THREE.PerspectiveCamera(60, clientWidth / clientHeight, 0.001, 1000);
        this.issModalCamera.position.set(0, 0.7, 2.5); // Visão externa distante
        
        // Renderer
        this.issModalRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.issModalRenderer.setSize(clientWidth, clientHeight);
        this.issModalRenderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.issModalRenderer.domElement);
        
        // Adiciona estrelas ao fundo (estilo NASA)
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 1.2,
            sizeAttenuation: false,
            transparent: true,
            opacity: 0.9
        });
        const starsVertices = [];
        const starsColors = [];
        for (let i = 0; i < 5000; i++) {
            const radius = Math.random() * 800 + 200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            starsVertices.push(x, y, z);
            const brightness = 0.7 + Math.random() * 0.3;
            starsColors.push(brightness, brightness, brightness);
        }
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starsColors, 3));
        starsMaterial.vertexColors = true;
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.issModalScene.add(stars);
        
        // Clona o modelo da ISS para a cena modal (SEM Terra ao fundo)
        const issClone = this.satellite.clone();
        issClone.position.set(0, 0, 0);
        issClone.rotation.set(0, 0, 0);
        // Mantém tamanho original - sem scale
        this.issModalScene.add(issClone);
        
        // Iluminação
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.issModalScene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(5, 5, 5);
        this.issModalScene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-5, -5, -5);
        this.issModalScene.add(directionalLight2);
        
        // Controles orbitais - zoom sem limite mínimo, permite aproximar bastante
        this.issModalControls = new THREE.OrbitControls(this.issModalCamera, this.issModalRenderer.domElement);
        this.issModalControls.enableDamping = true;
        this.issModalControls.dampingFactor = 0.05;
        this.issModalControls.minDistance = 0.05; // Zoom quase sem limite - pode aproximar muito
        this.issModalControls.maxDistance = 10; // Permite afastar bastante
        this.issModalControls.target.set(0, 0, 0);
        
        // Animação da ISS rotacionando
        const animateModal = () => {
            if (!this.issModalActive) return;
            
            requestAnimationFrame(animateModal);
            issClone.rotation.y += 0.002;
            this.issModalControls.update();
            this.issModalRenderer.render(this.issModalScene, this.issModalCamera);
        };
        animateModal();
        
        // Resize handler
        const modalResize = () => {
            if (!this.issModalActive) return;
            const { clientWidth: w, clientHeight: h } = container;
            this.issModalCamera.aspect = w / h;
            this.issModalCamera.updateProjectionMatrix();
            this.issModalRenderer.setSize(w, h);
        };
        window.addEventListener('resize', modalResize);
        this.issModalResizeHandler = modalResize;
    }

    showISSInfoPanel() {
        const panel = document.getElementById('issInfoPanel');
        if (panel) {
            panel.classList.add('active');
        }
    }

    closeISSInfoPanel() {
        const panel = document.getElementById('issInfoPanel');
        if (panel) {
            panel.classList.remove('active');
        }
    }

    closeISSModal() {
        const modal = document.getElementById('issModal');
        modal.classList.remove('active');
        this.issModalActive = false;
        
        // Limpa a cena modal
        if (this.issModalRenderer) {
            const container = document.getElementById('issViewContainer');
            container.removeChild(this.issModalRenderer.domElement);
            this.issModalRenderer.dispose();
            this.issModalRenderer = null;
        }
        
        if (this.issModalResizeHandler) {
            window.removeEventListener('resize', this.issModalResizeHandler);
            this.issModalResizeHandler = null;
        }
        
        this.issModalScene = null;
        this.issModalCamera = null;
        this.issModalControls = null;
    }

    onCanvasHover(event) {
        if (!this.satellite || this.issModalActive) return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.satellite, true);
        
        if (intersects.length > 0 && !this.isHoveringISS) {
            this.isHoveringISS = true;
            this.addISSGlow();
            this.renderer.domElement.style.cursor = 'pointer';
        } else if (intersects.length === 0 && this.isHoveringISS) {
            this.isHoveringISS = false;
            this.removeISSGlow();
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    onCanvasLeave() {
        if (this.isHoveringISS) {
            this.isHoveringISS = false;
            this.removeISSGlow();
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    addISSGlow() {
        if (!this.satellite || this.issGlow) return;
        
        // Cria um halo ao redor da ISS
        this.satellite.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0x007bff);
                child.material.emissiveIntensity = 0.5;
            }
        });
        this.issGlow = true;
    }

    removeISSGlow() {
        if (!this.satellite || !this.issGlow) return;
        
        this.satellite.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0x000000);
                child.material.emissiveIntensity = 0;
            }
        });
        this.issGlow = null;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Rotação suave da Terra
        if (this.earth) {
            this.earth.rotation.y += 0.0005;
        }
        if (this.clouds) {
            this.clouds.rotation.y += 0.0007;
        }

        // Atualiza viewVector do shader da atmosfera para glow dinâmico
        if (this.atmosphere && this.atmosphere.material && this.atmosphere.material.uniforms) {
            this.atmosphere.material.uniforms.viewVector.value = this.camera.position;
        }

        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);

        // Atualiza posição a cada 2 segundos para traço sempre em movimento (estilo NASA)
        if (this.currentSatellite && this.satellite) {
            const now = Date.now();
            if (!this.lastUpdate || now - this.lastUpdate > 2000) {
                this.fetchSatellitePosition();
                this.lastUpdate = now;
            }
        }
    }
}

// Inicializar quando a página carregar
window.addEventListener('load', () => {
    window.satelliteViewer = new Satellite3DViewer();
});
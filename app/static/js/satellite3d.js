class Satellite3DViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.earth = null;
        this.satellite = null;
        this.controls = null;
        this.orbitLine = null;
        this.currentSatellite = null;
        this.satellites = [];
        this.selectedSatellite = null;
        this.earthCreated = false;
        this.lastUpdate = null;
        this.init();
        this.loadSatellites();
    }

    init() {
        this.createScene();
        this.setupLighting();
        this.setupControls();
        this.setupEventListeners();
        this.animate();
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 3;
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 0);
        
        document.getElementById('earthContainer').appendChild(this.renderer.domElement);
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createEarth() {
        if (this.earthCreated) return;
        
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const textureLoader = new THREE.TextureLoader();
        
        // Texturas da Terra
        const earthTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg');
        const earthBumpMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg');
        const earthSpecular = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg');
        
        const material = new THREE.MeshPhongMaterial({
            map: earthTexture,
            bumpMap: earthBumpMap,
            bumpScale: 0.05,
            specularMap: earthSpecular,
            specular: new THREE.Color(0x333333),
            shininess: 5
        });
        
        this.earth = new THREE.Mesh(geometry, material);
        this.scene.add(this.earth);
        this.createStars();
        this.earthCreated = true;
    }

    createStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.02,
            transparent: true
        });
        
        const starsVertices = [];
        for (let i = 0; i < 5000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starsVertices.push(x, y, z);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
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
        const ambientLight = new THREE.AmbientLight(0x333333, 0.4);
        this.scene.add(ambientLight);

        // Luz direcional principal (Sol)
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
        directionalLight.position.set(5, 3, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Luz de preenchimento
        const fillLight = new THREE.DirectionalLight(0xFFFFFF, 0.3);
        fillLight.position.set(-5, -3, -5);
        this.scene.add(fillLight);
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
        // Busca em tempo real
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterSatellites(e.target.value);
        });

        // Botão carregar satélite
        document.getElementById('loadSatelliteBtn').addEventListener('click', () => {
            this.loadSelectedSatellite();
        });

        // Enter na pesquisa também carrega o satélite
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.selectedSatellite) {
                this.loadSelectedSatellite();
            }
        });
    }

    async loadSatellites() {
        try {
            const response = await fetch('/api/satellites');
            this.satellites = await response.json();
            this.renderSatellites();
        } catch (error) {
            console.error('Erro ao carregar satélites:', error);
            this.showError('Erro ao carregar lista de satélites');
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
        if (!this.selectedSatellite) return;

        this.showLoading(true);

        try {
            // Cria a Terra e o satélite
            this.createEarth();
            this.createSatellite();

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
            this.showLoading(false);

        } catch (error) {
            console.error('Erro ao carregar satélite:', error);
            this.showLoading(false);
            this.showError('Erro ao carregar dados do satélite');
        }
    }

    async fetchSatellitePosition() {
        try {
            const response = await fetch(`/api/satellites/${this.selectedSatellite}/position`);
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
            const response = await fetch(`/api/satellites/${this.selectedSatellite}/orbit`);
            const orbitData = await response.json();
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
        }
    }

    updateInfoPanel(data) {
        document.getElementById('infoName').textContent = data.name || this.selectedSatellite;
        document.getElementById('infoLat').textContent = data.latitude?.toFixed(4) + '°' || '-';
        document.getElementById('infoLon').textContent = data.longitude?.toFixed(4) + '°' || '-';
        document.getElementById('infoAlt').textContent = data.altitude?.toFixed(0) + ' km' || '-';
        document.getElementById('infoVel').textContent = data.velocity?.toFixed(2) + ' km/s' || '-';
        document.getElementById('infoUpdate').textContent = new Date().toLocaleTimeString();
        
        const statusElement = document.getElementById('infoStatus');
        statusElement.textContent = 'Online';
        statusElement.className = 'info-value status-online';
    }

    showOrbit(orbitData) {
        if (!orbitData || !orbitData.length) {
            console.warn('Nenhum dado orbital disponível');
            return;
        }

        // Remove órbita anterior
        if (this.orbitLine) {
            this.scene.remove(this.orbitLine);
            this.orbitLine = null;
        }

        const points = [];
        orbitData.forEach(point => {
            const pos = this.geographicToCartesian(
                point.latitude, 
                point.longitude, 
                1.06  // Altitude fixa
            );
            points.push(pos);
        });

        // Cria a linha da órbita apenas se houver pontos suficientes
        if (points.length > 1) {
            const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const orbitMaterial = new THREE.LineBasicMaterial({
                color: 0x007bff,
                transparent: true,
                opacity: 0.6,
                linewidth: 2
            });

            this.orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
            this.scene.add(this.orbitLine);
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
        document.getElementById('loading').style.display = show ? 'block' : 'none';
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
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Rotação suave da Terra
        if (this.earth) {
            this.earth.rotation.y += 0.0005;
        }

        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);

        // Atualiza posição a cada 5 segundos se houver satélite selecionado
        if (this.currentSatellite && this.satellite) {
            const now = Date.now();
            if (!this.lastUpdate || now - this.lastUpdate > 5000) {
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
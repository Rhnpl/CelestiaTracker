# 🛰️ SkyTrack - Rastreamento da ISS em Tempo Real

<div align="center">

![Python](https://img.shields.io/badge/Python-3.x-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-2.x-green?style=for-the-badge&logo=flask)
![Three.js](https://img.shields.io/badge/Three.js-Latest-black?style=for-the-badge&logo=three.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-orange?style=for-the-badge&logo=supabase)

**Visualização 3D interativa da Estação Espacial Internacional em tempo real**

[Características](#-características) • [Tecnologias](#-tecnologias) • [Instalação](#-instalação) • [Uso](#-como-usar) • [API](#-api-endpoints)

</div>

---

## 📖 Sobre o Projeto

SkyTrack é uma aplicação web moderna que permite visualizar a **Estação Espacial Internacional (ISS)** orbitando a Terra em tempo real. O projeto combina dados reais da API da ISS com cálculos orbitais precisos usando SGP4, proporcionando uma experiência visual impressionante com renderização 3D usando Three.js.

### ✨ Características Principais

- 🌍 **Terra 3D Realista**: Modelo da Terra com texturas NASA Blue Marble, atmosfera dinâmica e iluminação PBR
- 🛰️ **ISS em Tempo Real**: Rastreamento preciso da posição da ISS atualizado a cada 2 segundos
- 🎯 **Traço Orbital**: Visualização da trajetória orbital com fade suave e contínuo
- 📊 **Dados em Tempo Real**: Latitude, longitude, altitude, velocidade e histórico orbital
- 🎮 **Modal 3D Interativo**: Visualização detalhada da ISS com controles de rotação e zoom
- 📱 **Interface Responsiva**: Menu colapsável e design adaptável para diferentes tamanhos de tela
- 🔮 **Previsões Orbitais**: Cálculo de posições futuras usando SGP4/TLE

---

## 🛠️ Tecnologias

### Backend
- **Python 3.x** - Linguagem principal
- **Flask** - Framework web
- **SGP4** - Propagação orbital (padrão NASA)
- **Supabase** - Banco de dados PostgreSQL na nuvem
- **Requests** - Requisições HTTP para APIs externas

### Frontend
- **Three.js** - Renderização 3D
- **JavaScript (ES6+)** - Lógica da aplicação
- **HTML5/CSS3** - Estrutura e estilização
- **GLTF Loader** - Carregamento de modelos 3D

### APIs Externas
- **Open Notify API** - Posição atual da ISS
- **Celestrak** - Dados TLE (Two-Line Element) para cálculos orbitais

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Python 3.8+**
- **pip** (gerenciador de pacotes Python)
- **Conta no Supabase** (para banco de dados)
- **Navegador moderno** com suporte a WebGL (Chrome, Firefox, Edge)

---

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/CartelGeek/SkyTrack.git
cd SkyTrack
```

### 2. Crie um ambiente virtual

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate
```

**Linux/Mac:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

> 💡 **Dica**: Quando o ambiente virtual estiver ativo, você verá `(.venv)` no início do seu prompt de comando.

### 3. Instale as dependências

```bash
pip install -r requirements.txt
```

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anonima-aqui
```

> ⚠️ **Importante**: Nunca commite o arquivo `.env` no repositório. As credenciais devem ser mantidas em segredo.

### 5. Configure o banco de dados Supabase

Crie as seguintes tabelas no seu projeto Supabase:

**Tabela: `iss_positions`**
```sql
CREATE TABLE iss_positions (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL
);
```

**Tabela: `iss_tle`**
```sql
CREATE TABLE iss_tle (
    id SERIAL PRIMARY KEY,
    name TEXT,
    line1 TEXT NOT NULL,
    line2 TEXT NOT NULL,
    epoch TIMESTAMPTZ NOT NULL
);
```

**Tabela: `iss_orbit_pred`**
```sql
CREATE TABLE iss_orbit_pred (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    x_km DOUBLE PRECISION,
    y_km DOUBLE PRECISION,
    z_km DOUBLE PRECISION,
    vx_km_s DOUBLE PRECISION,
    vy_km_s DOUBLE PRECISION,
    vz_km_s DOUBLE PRECISION
);
```

---

## 🎮 Como Usar

### Iniciar o servidor

```bash
python run.py
```

O servidor Flask será iniciado em `http://127.0.0.1:5000`

### Acessar a aplicação

Abra seu navegador e acesse:
```
http://localhost:5000
```

### Funcionalidades da Interface

#### Visualização Principal
- **Rotacionar a câmera**: Clique e arraste na tela
- **Zoom**: Use a roda do mouse
- **Informações da ISS**: Painel lateral esquerdo (colapsável)

#### Modal 3D da ISS
- **Abrir**: Clique no satélite ISS na visualização principal
- **Rotacionar**: Arraste com o mouse
- **Zoom**: Roda do mouse (sem limites)
- **Fechar**: Clique no botão "← Voltar"

#### Menu Lateral
- **Expandir/Colapsar**: Clique no menu lateral esquerdo
- **Informações em tempo real**: Posição, velocidade, altitude
- **Dados históricos**: Lançamento, missão, especificações técnicas

---

## 📡 API Endpoints

### GET `/api/satellites`
Retorna lista de satélites rastreados.

**Resposta:**
```json
[
  {
    "id": "ISS_25544",
    "name": "International Space Station",
    "norad_id": "25544"
  }
]
```

### GET `/api/satellites/<satellite_id>/position`
Retorna a posição atual do satélite (do banco de dados).

### GET `/api/satellites/<satellite_id>/position_predicted`
Retorna a posição atual calculada via SGP4 (mais precisa).

**Parâmetros:**
- `satellite_id`: ID do satélite (ex: `ISS_25544`)

**Resposta:**
```json
{
  "id": "ISS_25544",
  "name": "International Space Station",
  "latitude": -50.1234,
  "longitude": 123.4567,
  "timestamp": "2025-10-31T12:00:00",
  "altitude": 408.5,
  "velocity": 7.66
}
```

### GET `/api/satellites/<satellite_id>/orbit_predicted`
Retorna pontos orbitais previstos usando SGP4.

**Parâmetros Query:**
- `n`: Total de segundos para calcular (padrão: 5400 = 90 min)
- `step`: Intervalo entre pontos em segundos (padrão: 60 = 1 min)

**Resposta:**
```json
[
  {
    "timestamp": "2025-10-31T12:00:00",
    "latitude": -50.1234,
    "longitude": 123.4567,
    "altitude": 408.5
  },
  ...
]
```

### GET `/api/orbit/calculate`
Calcula e salva órbita prevista no banco de dados.

### GET `/api/tle/download`
Baixa e salva o TLE mais recente da ISS.

---

## 📁 Estrutura do Projeto

```
SkyTrack/
│
├── app/
│   ├── static/
│   │   ├── js/
│   │   │   └── satellite3d.js      # Lógica 3D e visualização
│   │   └── models/
│   │       └── iss/
│   │           ├── ISS_stationary.glb   # Modelo 3D da ISS
│   │           └── ISS_stationary.usdz
│   └── templates/
│       └── index.html              # Interface principal
│
├── logs/                           # Logs de execução
├── .env                            # Variáveis de ambiente (não commitar)
├── requirements.txt                # Dependências Python
├── run.py                          # Servidor Flask principal
└── README.md                       # Este arquivo
```

---

## 🔧 Configurações Avançadas

### Atualização de Posição

A posição da ISS é atualizada automaticamente a cada **2 segundos** para manter o traço orbital sempre em movimento.

### Cálculo Orbital (SGP4)

O projeto usa o algoritmo SGP4 padrão da NASA para calcular posições orbitais precisas:
- **TLE Source**: Celestrak (atualização automática)
- **Precisão**: Depende da atualização do TLE (geralmente diária)
- **Conversão**: TEME → ECEF → Geodésicas (WGS84)

### Banco de Dados

Os dados são armazenados em três tabelas principais:
- `iss_positions`: Histórico de posições reais
- `iss_tle`: Dados TLE para cálculos
- `iss_orbit_pred`: Órbitas calculadas

---

## 🎨 Características Visuais

### Terra 3D
- **Geometria**: 64 segmentos (alta resolução)
- **Texturas**: NASA Blue Marble com anisotropic filtering (16x)
- **Material**: PBR (Physically Based Rendering)
- **Atmosfera**: Shader customizado com glow dinâmico
- **Iluminação**: Direcional (2.0 intensity) + Ambient

### Traço Orbital
- **Comprimento**: 3h à frente (apenas traço futuro)
- **Estilo**: Fade exponencial (potência 3.2)
- **Cor**: `#FFFFFF` (branco)
- **Opacidade Mínima**: 0.01 (quase invisível no final)
- **Atualização**: Dinâmica a cada 2 segundos

### Modal 3D
- **Near Plane**: 0.001 (permite zoom extremamente próximo)
- **Distância Inicial**: (0, 0.7, 2.5)
- **Controles**: OrbitControls com damping suave
- **Fundo**: Estrelas 3D (5000 pontos)

---

## 🐛 Troubleshooting

### Problema: "SUPABASE_URL e SUPABASE_KEY devem estar definidos"
**Solução**: Verifique se o arquivo `.env` existe e contém as credenciais corretas.

### Problema: Satélite não aparece
**Solução**: 
1. Verifique o console do navegador para erros
2. Certifique-se de que o modelo `ISS_stationary.glb` existe em `app/static/models/iss/`
3. Verifique a conexão com a API

### Problema: Traço orbital não aparece
**Solução**:
1. Verifique se os dados TLE foram baixados (`/api/tle/download`)
2. Verifique se a órbita foi calculada (`/api/orbit/calculate`)
3. Verifique o console para erros JavaScript

### Problema: Performance baixa
**Solução**:
1. Reduza a qualidade das texturas da Terra
2. Diminua o número de pontos no traço orbital
3. Desabilite estrelas no modal 3D

---

## 📚 Recursos e Referências

- [Open Notify API](http://api.open-notify.org/)
- [Celestrak TLE Data](https://celestrak.org/)
- [Three.js Documentation](https://threejs.org/docs/)
- [SGP4 Documentation](https://pypi.org/project/sgp4/)
- [Supabase Documentation](https://supabase.com/docs)

---

## 📝 Licença

Este projeto foi desenvolvido como parte de um curso SENAI Python.

---

## 👨‍💻 Desenvolvedor

Desenvolvido com ❤️ para rastrear a Estação Espacial Internacional em tempo real.

---

## 👥 Contribuidores

Nosso agradecimento especial aos desenvolvedores que contribuíram para este projeto:

<div align="center">

### Thanks to all contributors ❤️


<div align="center">
<br />
<a href="https://github.com/Rhnpl"><img src="https://github.com/Rhnpl.png" width="50px;" alt=""/></a>
<a href="https://github.com/analuizaf17"><img src="https://github.com/analuizaf17.png" width="50px;" alt=""/></a>
<a href="https://github.com/morpheus-alt"><img src="https://github.com/morpheus-alt.png" width="50px;" alt=""/></a>
</div>

---

<div align="center">

**⭐ Se este projeto foi útil, considere dar uma estrela! ⭐**

</div>

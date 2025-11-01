⚙️ 1. Criação do ambiente
Primeiro, criei o projeto com um ambiente virtual (venv) pra deixar tudo organizado e separado das outras libs do sistema.
 Instalei o que precisava:
requests pra fazer a chamada da API;


supabase pra enviar os dados pro banco;


logging pra registrar logs dos eventos;


e claro, o próprio time, datetime e os pra lidar com tempo, datas e diretórios.



🌍 2. Conexão com o Supabase
Depois configurei a conexão com o Supabase, que é tipo um banco de dados PostgreSQL na nuvem.
 Usei minha URL e a chave anônima do projeto pra conectar o client Python.
 Também criei uma tabela chamada iss_positions com as colunas:
id
timestamp
latitude
longitude
1
2025-10-26T04:22:12Z
-50.0314
169.5053

Esses dados são atualizados a cada 60 segundos.

🧠 3. Código principal (iss_tracker_service.py)
O código tem três partes principais:
get_iss_position()
Faz uma requisição na API da ISS (http://api.open-notify.org/iss-now.json)
 Ela retorna um JSON com latitude, longitude e timestamp.
 A função trata possíveis erros (tipo quando o servidor cai ou demora pra responder) e retorna os dados organizados.
send_to_supabase(data)
Pega o dicionário com os dados da ISS e faz o upsert no Supabase — ou seja, envia e, se já existir, atualiza.
main()
É o coração do script:
inicia o serviço,


chama a API,


envia pro Supabase,


e dorme 60 segundos antes de repetir o ciclo.


Tudo isso dentro de um while True, então o código fica rodando direto como um serviço.

🧾 4. Logs e organização
Criei uma pasta logs/ pra guardar o histórico de execução, tipo quando a ISS foi lida com sucesso ou se deu erro.
 Isso ajuda pra caramba pra saber se o script travou, se a API caiu ou se deu erro no Supabase.

🚀 5. Resultado final
Agora o Python roda e fica pegando a posição da ISS de minuto em minuto, jogando os dados pro Supabase em tempo real.
 A cada leitura bem-sucedida aparece no terminal algo tipo:
Registro enviado com sucesso: {'timestamp': '2025-10-26T04:24:16', 'latitude': -51.4299, 'longitude': -179.593}

E se der falha na leitura, o código tenta de novo, sem precisar reiniciar.







Página de status da API  (status.open-notify.org)



Conta Supabase: skytracker.senai@gmail.com:SkyTracker@2025 
ou 
SkyTrack@2025



api: http://api.open-notify.org/iss-now.json


⚙️ Passo a passo pra ativar e instalar no Windows (PowerShell)
1️⃣ No terminal (PowerShell), estando dentro da pasta do projeto:
.\.venv\Scripts\Activate


repare no nome (.venv) em verde isso demostra que esta ativo e pronto para o uso.



2️⃣ Agora que está dentro da venv, instale os pacotes:

pip install -r requirements.txt 
esse txt contem os requisitos para rodar o iss_tracker_service.py




🧮 6. SGP4 e Previsões Orbitais
Pra calcular onde a ISS vai estar no futuro (e onde esteve no passado), usei a biblioteca SGP4.
 Essa lib é padrão da NASA e serve pra fazer propagação orbital usando TLE (Two-Line Element).

O que é TLE?
TLE são dois arquivos de texto que contêm os dados orbitais da ISS.
 Esses dados vêm do site Celestrak (https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE)
 A ISS tem o NORAD ID 25544.

Como funciona no código (run.py):

download_tle_iss()
Baixa os dados TLE mais recentes do Celestrak.
 Salva no Supabase na tabela iss_tle com os campos:
 name (nome do satélite)
 line1 (primeira linha do TLE)
 line2 (segunda linha do TLE)
 epoch (momento que os dados foram atualizados)

calculate_iss_orbit()
Pega o TLE mais recente do banco.
 Usa Satrec.twoline2rv() pra criar o objeto do satélite.
 Calcula a posição da ISS em pontos futuros (de 0 a 600 minutos, a cada 10 minutos).
 Salva no Supabase na tabela iss_orbit_pred.

get_orbit_predicted()
Endpoint da API que calcula a órbita em tempo real.
 Recebe parâmetros opcionais:
 n = quantos segundos pra frente calcular (padrão: 5400 = 90 min)
 step = intervalo entre pontos em segundos (padrão: 60 = 1 min)
 Usa as funções teme_to_ecef() e ecef_to_geodetic() pra converter coordenadas.
 TEME (True Equator Mean Equinox) → ECEF (Earth-Centered, Earth-Fixed) → Lat/Lon/Alt

get_position_predicted()
Similar, mas retorna só a posição atual calculada pelo SGP4.
 Usado no frontend pra atualizar a posição do satélite em tempo real.

Por que SGP4 ao invés da API simples?
A API open-notify só dá a posição atual.
 Com SGP4 posso calcular:
 posições futuras (pra mostrar a trajetória)
 posições passadas (pra mostrar o histórico)
 qualquer momento no tempo, não só o agora.

Conversão de coordenadas:
TEME → ECEF: Precisa do GMST (Greenwich Mean Sidereal Time) pra rotacionar.
 ECEF → Geodésicas: Usa o elipsóide WGS84 pra calcular lat, lon e altitude real.
 WGS84_A = 6378.137 km (raio equatorial)
 WGS84_B = 6356.7523142 km (raio polar)
 WGS84_E2 = excentricidade do elipsóide


🎨 7. Layout e Interface (Frontend)

Visualização 3D Principal:
O centro da tela mostra a Terra e a ISS orbitando em tempo real.
 Feito com Three.js, uma biblioteca JavaScript pra gráficos 3D.
 A Terra é um modelo 3D com texturas reais (NASA Blue Marble).
 A ISS é um modelo GLB baixado (modelo real da NASA).

Menu Lateral Esquerdo (Colapsável):
Fica na lateral esquerda da tela, centralizado verticalmente.
 Quando expandido: mostra todas as informações em português.
 Quando colapsado: vira um pequeno ícone de satélite 🛰️ com o texto "Estação Espacial Internacional".
 Animação de pulso no emoji quando colapsado (pra chamar atenção).
 Ao clicar, expande/colapsa suavemente com animação.

Informações mostradas:
Status: Online
Latitude, Longitude, Altitude em tempo real
Velocidade: 7.66 km/s
Última atualização (horário)
Tempo em Órbita: 26 years : 345 days
Veículo de Lançamento: Russian Proton rocket
Local de Lançamento: Baikonur Cosmodrome, Kazakhstan
Sobre a ISS: descrição completa em português

Estilo dos painéis:
Fundo azul escuro semi-transparente.
 Borda arredondada e sombra suave.
 Estilo moderno tipo glassmorphism.
 Quando colapsado, fica circular com o emoji no centro.

Modal 3D da ISS:
Ao clicar no satélite na visualização principal, abre um modal em tela cheia.
 Mostra só a ISS em 3D contra um fundo de estrelas.
 Pode rotacionar arrastando o mouse.
 Pode dar zoom com a roda do mouse (sem limites, pode aproximar bastante).
 Instruções visíveis: "Rotacione: Arraste com o mouse" e "Zoom: Roda do mouse".
 Botão "← Voltar" no canto superior direito pra fechar.

Painéis de Informação (dentro do modal):
Painel Esquerdo: "International Space Station - Especificações"
 NORAD ID, Altitude, Velocidade, Órbita, Massa, Dimensões

Painel Direito: "Informações"
 Histórico: Lançamento, Primeiros habitantes, Veículo, Local
 Missão: Descrição da missão em português

Carregamento:
Spinner centralizado no meio da tela quando carregando dados.
 Texto "Carregando satélite..." com animação de brilho.
 Aparece quando:
 carregando o modelo 3D
 buscando dados da API
 inicializando a cena

Responsividade:
Menu lateral se ajusta em telas menores.
 Painéis do modal se adaptam ao tamanho da tela.
 Visualização 3D ocupa toda a área disponível.







Para pegar a SUPABASE_URL



Para pegar a SUPABASE_KEY




---

# 🔄 Atualizações Recentes - Visualização 3D e Segurança

## 🔐 Segurança - Credenciais no .env
**Data:** Outubro 2025

✅ **Movidas credenciais do Supabase para arquivo .env**
- As credenciais `SUPABASE_URL` e `SUPABASE_KEY` foram removidas do código (`run.py`)
- Agora são lidas do arquivo `.env` usando `os.getenv()`
- Adicionada validação para garantir que as variáveis existem antes de inicializar o cliente Supabase
- **Motivo:** Segurança - credenciais não ficam expostas no código fonte

**Como usar:**
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anonima
```

**Código atualizado em `run.py`:**
- `SUPABASE_URL = os.getenv('SUPABASE_URL')`
- `SUPABASE_KEY = os.getenv('SUPABASE_KEY')`
- Validação com `raise ValueError` se as variáveis não existirem

---

## 🌍 Melhorias na Visualização 3D da Terra e Órbita

### ✨ Terra Mais Realista
**Melhorias aplicadas no `app/static/js/satellite3d.js`:**

1. **Geometria de maior qualidade:**
   - Segmentos do `SphereGeometry` aumentados de 32 para 64
   - Superfície mais detalhada e suave

2. **Anisotropic Filtering:**
   - Texturas da Terra com `anisotropy: 16`
   - Aplicado em: `earthTexture`, `earthBumpMap`, `earthSpecular`
   - Texturas mais nítidas e detalhadas

3. **Physically Based Rendering (PBR):**
   - Material alterado de `MeshPhongMaterial` para `MeshStandardMaterial`
   - Adicionado `normalMap` e `normalScale` para relevo
   - `roughnessMap`, `roughness` e `metalness` para realismo
   - Nuvens também atualizadas para `MeshStandardMaterial` com `opacity: 0.6`

4. **Atmosfera com Shader Customizado:**
   - Glow atmosférico agora usa `ShaderMaterial` com vertex e fragment shaders customizados
   - Efeito de borda azul mais realista e dinâmico
   - `viewVector` atualizado em tempo real no loop de animação

5. **Iluminação e Exposição:**
   - Intensidade da luz direcional aumentada de 1.6 para 2.0
   - `toneMappingExposure` aumentado de 1.25 para 1.4
   - Visual mais brilhante e realista

### 🛰️ Traço Orbital Melhorado (Estilo NASA)

**Problema resolvido:** Traço orbital cortado e sobreposição do satélite

**Soluções implementadas:**

1. **Traço nunca sobrepõe o satélite:**
   - Traço passado termina **ANTES** da posição atual (`splitIndex` não incluso)
   - Traço futuro começa **DEPOIS** da posição atual (`splitIndex + 1`)
   - Sempre há um gap visível onde o satélite está

2. **Traço contínuo sem cortes:**
   - Cada segmento renderizado individualmente para garantir continuidade
   - Loop: `for (let i = 0; i < totalPoints - 1; i += 1)`
   - Traço sempre contínuo sem interrupções

3. **Traço mais longo:**
   - `pastCount` aumentado de 60 para 90 pontos (~1.5h atrás)
   - `futureCount` aumentado de 120 para 180 pontos (~3h à frente)
   - Órbita mais visível e impressionante

4. **Fade dramático estilo NASA:**
   - Função exponencial com `fadePower: 3.2` (mais dramático)
   - `minOpacity: 0.01` (quase invisível no final)
   - Fade muito sutil e elegante no final do traço
   - Cores ajustadas: passado `0x8FA0B5`, futuro `0xFFFFFF`

5. **Atualização dinâmica:**
   - Posição do satélite atualizada a cada 2 segundos (antes 5s)
   - Traço orbital recalculado a cada atualização
   - Visual sempre em movimento, estilo NASA

**Função `showOrbit()` atualizada:**
- Separação correta entre passado/futuro
- Renderização segmentada para continuidade
- Fade exponencial suave

---

## 🎮 Modal 3D da ISS - Ajustes e Correções

### 📐 Ajustes de Câmera e Zoom

1. **Visão inicial externa e distante:**
   - Posição da câmera: `(0, 0.7, 2.5)`
   - Visualização confortável e externa do satélite

2. **Near Plane corrigido:**
   - **Problema:** Satélite desaparecia ao dar zoom muito próximo
   - **Solução:** `near` plane reduzido de `0.1` para `0.001`
   - Permite zoom extremamente próximo sem cortar o modelo

3. **Limites de zoom flexíveis:**
   - `minDistance: 0.05` - Permite aproximar bastante
   - `maxDistance: 10` - Permite afastar bastante
   - Usuário tem controle total sobre o zoom

4. **Tamanho do modelo:**
   - Mantido no tamanho original (sem scale extra)
   - Visão externa preservada

**Função `createISSModalView()` atualizada:**
```javascript
this.issModalCamera = new THREE.PerspectiveCamera(60, clientWidth / clientHeight, 0.001, 1000);
this.issModalCamera.position.set(0, 0.7, 2.5);
this.issModalControls.minDistance = 0.05;
this.issModalControls.maxDistance = 10;
```

---

## 📊 Resumo das Alterações Técnicas

### Arquivos Modificados:
1. **`run.py`**
   - Leitura de variáveis de ambiente
   - Validação de credenciais

2. **`app/static/js/satellite3d.js`**
   - `createEarth()` - PBR, shaders, melhor qualidade
   - `setupLighting()` - Intensidade aumentada
   - `createScene()` - Exposição ajustada
   - `showOrbit()` - Traço contínuo, fade melhorado, não sobrepõe satélite
   - `updateSatellitePosition()` - Atualiza traço dinamicamente
   - `animate()` - Atualização de posição mais frequente (2s)
   - `createISSModalView()` - Near plane corrigido, zoom flexível

### Melhorias de Performance:
- Atualização de posição otimizada (2s em vez de 5s)
- Renderização de traço otimizada (segmentação individual)
- Skip de segmentos com opacidade muito baixa (`< 0.008`)

### Experiência do Usuário:
✅ Terra muito mais realista e detalhada
✅ Traço orbital contínuo estilo NASA
✅ Satélite nunca fica sobreposto ao traço
✅ Zoom funcional sem desaparecimentos
✅ Visualização sempre atualizada e dinâmica

---

## 🔧 Configurações Finais

### Variáveis de Ambiente (.env):
```
SUPABASE_URL=sua-url-aqui
SUPABASE_KEY=sua-chave-aqui
```

### Parâmetros do Traço Orbital:
- Past Count: 90 pontos (~1.5h)
- Future Count: 180 pontos (~3h)
- Fade Power: 3.2
- Min Opacity: 0.01

### Parâmetros da Câmera Modal:
- Near Plane: 0.001
- Initial Position: (0, 0.7, 2.5)
- Min Distance: 0.05
- Max Distance: 10









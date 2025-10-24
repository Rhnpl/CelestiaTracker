# Satellite Tracker (Rastreador de Satélites)

**Resumo**

Projeto em Python que usa TLEs reais (Celestrak / NASA) para calcular a posição em tempo real de satélites (latitude, longitude, altitude) e plotar trajetórias sobre um mapa interativo. Ideal para aprendizado de orbital mechanics, visualização e pequenos experimentos com dados reais.

---

## Funcionalidades

* Baixa e atualiza TLEs de fontes públicas (Celestrak / Space-Track / NOAA).
* Propaga órbita usando modelo SGP4/SDP4 e calcula posição em UTC.
* Converte coordenadas orbitais para latitude/longitude/altitude (WGS84).
* Plota trajetória passada e futura em mapa interativo (Folium) e/ou mapa estático (Matplotlib + Cartopy).
* Modo "realtime": loop que atualiza a posição a cada N segundos.
* Cache de TLEs com expiração para evitar downloads excessivos.
* Exportação de trajetórias para CSV/GeoJSON.

---

## Arquitetura (visão geral)

1. **Fetcher**: baixa TLEs (arquivo ou API) e grava cache.
2. **Propagador**: usa `sgp4` (ou `skyfield` que encapsula `sgp4`) para calcular posição ECI/tempos.
3. **Transformador**: converte ECI -> ECEF -> geodésicas (lat/lon/alt) usando `pyproj`/`numpy`.
4. **Visualizador**: gera mapa interativo com `folium` ou imagens estáticas com `matplotlib`/`cartopy`.
5. **App**: script CLI e/ou servidor Flask para mostrar atualização em tempo real via WebSocket/HTTP.

---

## Requisitos

* Python 3.10+
* Pacotes principais (recomendado instalar num virtualenv):

  * `requests` — baixar TLEs
  * `numpy` — cálculo numérico
  * `sgp4` — propagação orbital
  * `skyfield` — (opcional, alto nível)
  * `pyproj` — transformações de coordenadas
  * `pandas` — export/manipulação de dados
  * `folium` — mapas interativos (HTML)
  * `flask` e `flask-socketio` — (opcional) app web em tempo real
  * `python-dateutil`, `pytz` — tratamento de datas/UTC
  * `tqdm` — barras de progresso (opcional)

Exemplo rápido de instalação:

```bash
python -m venv venv
source venv/bin/activate
pip install requests numpy sgp4 skyfield pyproj pandas folium flask flask-socketio python-dateutil pytz tqdm
```

---

## Estrutura sugerida do projeto

```
sat-tracker/
├─ README.md
├─ requirements.txt
├─ tle_cache/
├─ src/
│  ├─ fetch_tle.py
│  ├─ propagate.py
│  ├─ coords.py
│  ├─ viz_folium.py
│  ├─ app.py  # flask + socketio (opcional)
│  └─ utils.py
└─ examples/
   ├─ track_iss.py
   └─ show_on_map.ipynb
```

---

## Como usar — exemplos

### 1) Baixar TLE e calcular posição única

```bash
python src/fetch_tle.py --sat "ISS (ZARYA)" --save tle_cache/iss.tle
python src/propagate.py --tle tle_cache/iss.tle --time "2025-10-24T12:00:00Z" --out pos.csv
```

**Explicação**: `fetch_tle.py` baixa o TLE e salva. `propagate.py` lê o TLE e calcula lat/lon/alt no tempo UTC especificado.

### 2) Gerar trajetória para N minutos à frente

```bash
python src/propagate.py --tle tle_cache/iss.tle --from now --minutes 90 --step 10 --out iss_traj.csv
```

Parâmetros importantes:

* `--step` em segundos (resolução da trajetória)
* `--minutes` duração total
* `--from now` usa o tempo atual em UTC

### 3) Mostrar no mapa interativo

```python
from src.viz_folium import traj_to_map
traj_to_map('iss_traj.csv', 'iss_map.html')
# abre iss_map.html no navegador
```

### 4) Rodar em tempo real com Flask (exemplo simples)

```bash
python src/app.py --tle tle_cache/iss.tle --interval 5
```

O servidor fornece um endpoint WebSocket que emite atualizações de posição a cada N segundos. No frontend, um mapa (Leaflet via Folium) consome esses pontos e move o marcador.

---

## Detalhes de implementação importantes

### Fontes de TLE

* Celestrak (ex.: `https://celestrak.com/NORAD/elements/stations.txt`)
* Space-Track (requer conta e autenticação)
* Arquivos locais para testes reproducíveis

### Propagação e tempos

* Use `UTC` sempre (sem conversão para fusos locais). Use `datetime.datetime.utcnow()` ou `skyfield.api.load.timescale()`.
* `sgp4` trabalha com TLE diretamente (retornando posições ECI em km). `skyfield` simplifica o manuseio de tempos e frames.

### Conversões de coordenadas

1. Posição ECI (TEME) do `sgp4` → converter para ECEF (girar pelo ângulo sideral) ou usar utilitários do `skyfield`.
2. ECEF → lat/lon/alt: `pyproj` (CRS WGS84) ou fórmulas geodésicas.

### Precisão e limitações

* TLEs são aproximados — precisão decai com o tempo desde sua epoch.
* Modelos SGP4 não capturam pequenas manobras ou perturbações atmosféricas detalhadas.
* Para precisão sub-km, precisa-se de dados de elementos mais atualizados ou modelos mais sofisticados.

### Performance

* Propagar muitos satélites com alta resolução requer vetorização (`numpy`) e paralelização (multiprocessing).
* Cache dos TLEs e usar step adaptativo para reduzir cálculos quando apropriado.

---

## Testes

* Teste unitário para parsing de TLEs e sanity checks (epoch, número de linhas).
* Testes numéricos comparando posições calculadas com bibliotecas de referência (`skyfield`) para casos de exemplo.
* Integração: script que baixa TLE, propaga 2 órbitas e abre o mapa — verificar se o comportamento parece correto.

---

## Deploy / Execução contínua

* Para execução 24/7, containerize com Docker e use supervisord ou systemd.
* Limite requests para fontes de TLE — respeite termos de uso.

Exemplo Dockerfile (básico):

```dockerfile# Satellite Tracker (Rastreador de Satélites)

**Resumo**

Projeto em Python que usa TLEs reais (Celestrak / NASA) para calcular a posição em tempo real de satélites (latitude, longitude, altitude) e plotar trajetórias sobre um mapa interativo. Ideal para aprendizado de orbital mechanics, visualização e pequenos experimentos com dados reais.

---

## Funcionalidades

* Baixa e atualiza TLEs de fontes públicas (Celestrak / Space-Track / NOAA).
* Propaga órbita usando modelo SGP4/SDP4 e calcula posição em UTC.
* Converte coordenadas orbitais para latitude/longitude/altitude (WGS84).
* Plota trajetória passada e futura em mapa interativo (Folium) e/ou mapa estático (Matplotlib + Cartopy).
* Modo "realtime": loop que atualiza a posição a cada N segundos.
* Cache de TLEs com expiração para evitar downloads excessivos.
* Exportação de trajetórias para CSV/GeoJSON.

---

## Arquitetura (visão geral)

1. **Fetcher**: baixa TLEs (arquivo ou API) e grava cache.
2. **Propagador**: usa `sgp4` (ou `skyfield` que encapsula `sgp4`) para calcular posição ECI/tempos.
3. **Transformador**: converte ECI -> ECEF -> geodésicas (lat/lon/alt) usando `pyproj`/`numpy`.
4. **Visualizador**: gera mapa interativo com `folium` ou imagens estáticas com `matplotlib`/`cartopy`.
5. **App**: script CLI e/ou servidor Flask para mostrar atualização em tempo real via WebSocket/HTTP.

---

## Requisitos

* Python 3.10+
* Pacotes principais (recomendado instalar num virtualenv):

  * `requests` — baixar TLEs
  * `numpy` — cálculo numérico
  * `sgp4` — propagação orbital
  * `skyfield` — (opcional, alto nível)
  * `pyproj` — transformações de coordenadas
  * `pandas` — export/manipulação de dados
  * `folium` — mapas interativos (HTML)
  * `flask` e `flask-socketio` — (opcional) app web em tempo real
  * `python-dateutil`, `pytz` — tratamento de datas/UTC
  * `tqdm` — barras de progresso (opcional)

Exemplo rápido de instalação:

```bash
python -m venv venv
source venv/bin/activate
pip install requests numpy sgp4 skyfield pyproj pandas folium flask flask-socketio python-dateutil pytz tqdm
```

---

## Estrutura sugerida do projeto

```
sat-tracker/
├─ README.md
├─ requirements.txt
├─ tle_cache/
├─ src/
│  ├─ fetch_tle.py
│  ├─ propagate.py
│  ├─ coords.py
│  ├─ viz_folium.py
│  ├─ app.py  # flask + socketio (opcional)
│  └─ utils.py
└─ examples/
   ├─ track_iss.py
   └─ show_on_map.ipynb
```

---

## Como usar — exemplos

### 1) Baixar TLE e calcular posição única

```bash
python src/fetch_tle.py --sat "ISS (ZARYA)" --save tle_cache/iss.tle
python src/propagate.py --tle tle_cache/iss.tle --time "2025-10-24T12:00:00Z" --out pos.csv
```

**Explicação**: `fetch_tle.py` baixa o TLE e salva. `propagate.py` lê o TLE e calcula lat/lon/alt no tempo UTC especificado.

### 2) Gerar trajetória para N minutos à frente

```bash
python src/propagate.py --tle tle_cache/iss.tle --from now --minutes 90 --step 10 --out iss_traj.csv
```

Parâmetros importantes:

* `--step` em segundos (resolução da trajetória)
* `--minutes` duração total
* `--from now` usa o tempo atual em UTC

### 3) Mostrar no mapa interativo

```python
from src.viz_folium import traj_to_map
traj_to_map('iss_traj.csv', 'iss_map.html')
# abre iss_map.html no navegador
```

### 4) Rodar em tempo real com Flask (exemplo simples)

```bash
python src/app.py --tle tle_cache/iss.tle --interval 5
```

O servidor fornece um endpoint WebSocket que emite atualizações de posição a cada N segundos. No frontend, um mapa (Leaflet via Folium) consome esses pontos e move o marcador.

---

## Detalhes de implementação importantes

### Fontes de TLE

* Celestrak (ex.: `https://celestrak.com/NORAD/elements/stations.txt`)
* Space-Track (requer conta e autenticação)
* Arquivos locais para testes reproducíveis

### Propagação e tempos

* Use `UTC` sempre (sem conversão para fusos locais). Use `datetime.datetime.utcnow()` ou `skyfield.api.load.timescale()`.
* `sgp4` trabalha com TLE diretamente (retornando posições ECI em km). `skyfield` simplifica o manuseio de tempos e frames.

### Conversões de coordenadas

1. Posição ECI (TEME) do `sgp4` → converter para ECEF (girar pelo ângulo sideral) ou usar utilitários do `skyfield`.
2. ECEF → lat/lon/alt: `pyproj` (CRS WGS84) ou fórmulas geodésicas.

### Precisão e limitações

* TLEs são aproximados — precisão decai com o tempo desde sua epoch.
* Modelos SGP4 não capturam pequenas manobras ou perturbações atmosféricas detalhadas.
* Para precisão sub-km, precisa-se de dados de elementos mais atualizados ou modelos mais sofisticados.

### Performance

* Propagar muitos satélites com alta resolução requer vetorização (`numpy`) e paralelização (multiprocessing).
* Cache dos TLEs e usar step adaptativo para reduzir cálculos quando apropriado.

---

## Testes

* Teste unitário para parsing de TLEs e sanity checks (epoch, número de linhas).
* Testes numéricos comparando posições calculadas com bibliotecas de referência (`skyfield`) para casos de exemplo.
* Integração: script que baixa TLE, propaga 2 órbitas e abre o mapa — verificar se o comportamento parece correto.

---

## Deploy / Execução contínua

* Para execução 24/7, containerize com Docker e use supervisord ou systemd.
* Limite requests para fontes de TLE — respeite termos de uso.

Exemplo Dockerfile (básico):

```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt
CMD ["python", "src/app.py"]
```

---

## Roadmap / Melhorias

* Suporte a múltiplos satélites simultâneos (clusters visuais).
* Interface web com histórico e replay (timeline).
* Cálculo de visibilidade para observadores no solo (passagens visíveis, magnitude aparente, elevação/azimute).
* Integração com APIs de imagens (satélite ao vivo / radar) — com cautela às licenças.

---

## Referências úteis

* Celestrak (TLE text files)
* NORAD / SGP4 papers
* skyfield & sgp4 python packages

---

## Licença

MIT — sinta-se à vontade para usar e modificar.

---

## Como contribuir

1. Abra um issue descrevendo a feature ou bug.
2. Faça um fork, crie branch `feature/*` e envie PR com testes.
3. Documente qualquer dependência extra no `requirements.txt`.

---

Se quiser, eu posso:

* Gerar exemplos prontos (scripts `fetch_tle.py`, `propagate.py`, `viz_folium.py`).
* Implementar o app Flask com WebSocket para updates em tempo real.
* Adicionar um notebook `examples/show_on_map.ipynb` com passo-a-passo.

Diga qual desses prefere que eu implemente primeiro.

FROM python:3.10-slim
WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt
CMD ["python", "src/app.py"]
```

---

## Roadmap / Melhorias

* Suporte a múltiplos satélites simultâneos (clusters visuais).
* Interface web com histórico e replay (timeline).
* Cálculo de visibilidade para observadores no solo (passagens visíveis, magnitude aparente, elevação/azimute).
* Integração com APIs de imagens (satélite ao vivo / radar) — com cautela às licenças.

---

## Referências úteis

* Celestrak (TLE text files)
* NORAD / SGP4 papers
* skyfield & sgp4 python packages

---

## Licença

MIT — sinta-se à vontade para usar e modificar.

---

## Como contribuir

1. Abra um issue descrevendo a feature ou bug.
2. Faça um fork, crie branch `feature/*` e envie PR com testes.
3. Documente qualquer dependência extra no `requirements.txt`.

---

Se quiser, eu posso:

* Gerar exemplos prontos (scripts `fetch_tle.py`, `propagate.py`, `viz_folium.py`).
* Implementar o app Flask com WebSocket para updates em tempo real.
* Adicionar um notebook `examples/show_on_map.ipynb` com passo-a-passo.

Diga qual desses prefere que eu implemente primeiro.

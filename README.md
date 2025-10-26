# 🛰️ SkyTrack – Rastreador da Estação Espacial Internacional (ISS)

> Projeto desenvolvido como parte do curso do SENAI, com o objetivo de rastrear em tempo real a posição da Estação Espacial Internacional e exibir sua rota em um globo 3D interativo.

---

## 🚀 Visão Geral

O **SkyTrack** é um sistema completo de monitoramento da ISS (International Space Station).  
A aplicação consome dados da **API pública da ISS**, armazena no **Supabase**, e depois os dados tratados são exibidos visualmente em um **globo 3D no front-end**.

A ideia é simples: pegar onde a ISS está, guardar, analisar e mostrar isso de forma visual pra qualquer um ver em tempo real 🌍.

---

## ⚙️ Fluxo do Projeto

1. **Coleta de dados (Python)**  
   O sistema consome a API pública da ISS: http://api.open-notify.org/iss-now.json
A cada 60 segundos o Python faz uma requisição e pega:
- Latitude  
- Longitude  
- Timestamp (horário da leitura)

Caso a API caia ou demore pra responder, o script tenta novamente, tudo logado num arquivo `iss_tracker.log`.

2. **Envio para o banco de dados (Supabase)**  
Após coletar os dados, o script envia tudo para uma tabela no Supabase chamada `iss_positions`.  
Essa tabela armazena as posições e horários da ISS em tempo real.

| id | timestamp | latitude | longitude |
|----|------------|-----------|-----------|
| 1  | 2025-10-26T04:22:12Z | -50.0314 | 169.5053 |

3. **Tratamento dos dados (Ana)**  
A Ana é responsável por tratar as informações recebidas — validar inconsistências, ajustar dados que possam estar fora do padrão e preparar as coordenadas para o front.  
Ela garante que os dados enviados ao globo estejam padronizados e prontos pra renderização sem ruído.

4. **Visualização e Rota no Globo 3D (Rhaniel)**  
O Rhaniel pega os dados tratados e usa no **front-end** — uma interface interativa mostrando a **rota da ISS em tempo real** sobre o planeta.  
O globo mostra:
- A posição atual da ISS  
- O trajeto percorrido nas últimas leituras  
- Atualização dinâmica conforme o Supabase recebe novos dados  

---

## 🧠 Estrutura do Projeto
SkyTrack/
├── app.py # Script principal (rastreamento ISS)
├── config.py # vai fazer algo futuramente
├── requirements.txt # Dependências do projeto
├── logs/ # Diretório com os logs de execução
├── README.md # Este arquivo
├── /frontend # Interface do globo 
└── iss_tracker_service.py #Consume API e manda para o banco de dados


---

## 🔧 Tecnologias Utilizadas

- **Python 3.13+**
  - `requests` → consumo da API da ISS  
  - `supabase` → integração com o banco de dados  
  - `logging` → registro de logs  
  - `time`, `datetime`, `os` → controle de tempo e organização

- **Supabase**
  - Banco de dados em nuvem PostgreSQL
  - API REST integrada

- **Front-end (Globo 3D)**
  - JavaScript / Three.js / Cesium.js *(dependendo da versão usada)*
  - Renderização de trajetória orbital da ISS em tempo real

---

## ⚡ Como Rodar Localmente

1. Clone o repositório:
```
   git clone https://github.com/Rhnpl/SkyTrack.git
   cd SkyTrack 
```
2. Crie e ative o ambiente virtual:
```
  python -m venv .venv
  .venv\Scripts\activate
```
 3. Instale as dependências:
```
pip install -r requirements.txt
```
4. Execute o serviço:
```
  python iss_tracker_service.py
```
O script começará a rodar e enviar as coordenadas automaticamente a cada 60 segundos para o Supabase.

| Membro      | Função                     | Descrição                                                                               |
| ----------- | -------------------------- | --------------------------------------------------------------------------------------- |
| **Cleber**    | Coleta Consome api       | Responsável por capturar os dados da API e preparar o sistema de rastreamento em Python |
| **Ana**     | Tratamento de Dados        | Realiza a limpeza, padronização e análise dos dados recebidos                           |
| **Rhaniel** | Front-end e Visualização   | Desenvolve o globo 3D e renderiza a rota da ISS em tempo real                           |

🧭 Logs e Monitoramento

Todos os eventos do sistema (erros, sucesso de envio, timestamps, etc.) são registrados automaticamente em:
```
logs/iss_tracker.log

```


📡 Futuras Melhorias

Adicionar alerta quando a ISS estiver passando sobre o Brasil 🇧🇷

Visualização 2D alternativa no mapa com Leaflet.js

Histórico de rotas e replays de órbitas anteriores

Painel de monitoramento com status da API

💬 Conclusão

O SkyTrack mostra como dá pra integrar várias tecnologias — Python, Supabase e visualização 3D — pra criar algo que coleta, processa e exibe informações em tempo real.
O projeto não é só técnico, mas também educativo: ajuda a entender como dados orbitais podem ser usados pra aplicações reais, como rastreamento de satélites e sistemas espaciais.

import pandas as pd
import plotly.express as px
from supabase import create_client
from dotenv import load_dotenv
import os

# Carrega variáveis do .env
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

# Consulta os dados da tabela iss_positions
response = supabase.table("iss_positions").select("*").execute()
df = pd.DataFrame(response.data)

# Converte o campo de tempo para datetime
df['timestamp'] = pd.to_datetime(df['timestamp'])

# Gera o gráfico interativo
fig = px.scatter_geo(
    df,
    lon='longitude',
    lat='latitude',
    color='timestamp',
    color_continuous_scale='Plasma',
    projection='natural earth',
    title='Trajetória da ISS — Dados do Supabase',
)

fig.update_traces(marker=dict(size=6))
fig.show()

fig.write_html("trajetoria_iss.html")
print(" Gráfico salvo como 'trajetoria_iss.html'")
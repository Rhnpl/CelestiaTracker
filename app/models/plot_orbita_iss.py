import plotly.graph_objects as go
from conexao_supabase import supabase

# Baixa os dados da tabela de predições orbitais
response = supabase.table("iss_orbit_pred").select("*").execute()
dados = response.data

if not dados:
    print(" Nenhum dado encontrado na tabela 'iss_orbit_pred'.")
    exit()

# Extrai coordenadas
x = [row["x_km"] for row in dados]
y = [row["y_km"] for row in dados]
z = [row["z_km"] for row in dados]

# Cria a figura 3D
fig = go.Figure()

# Linha principal da órbita
fig.add_trace(go.Scatter3d(
    x=x, y=y, z=z,
    mode="lines",
    line=dict(color="royalblue", width=3),
    name="Órbita ISS"
))

# Ponto inicial (verde)
fig.add_trace(go.Scatter3d(
    x=[x[0]], y=[y[0]], z=[z[0]],
    mode="markers",
    marker=dict(size=6, color="green"),
    name="Início"
))

# Ponto final (vermelho)
fig.add_trace(go.Scatter3d(
    x=[x[-1]], y=[y[-1]], z=[z[-1]],
    mode="markers",
    marker=dict(size=6, color="red"),
    name="Fim"
))

# Configura layout
fig.update_layout(
    title="Trajetória Orbital da ISS (Predição via TLE)",
    scene=dict(
        xaxis_title="X (km)",
        yaxis_title="Y (km)",
        zaxis_title="Z (km)",
        aspectmode="data"
    ),
    margin=dict(l=0, r=0, b=0, t=40)
)

# Mostra o gráfico interativo
fig.show()
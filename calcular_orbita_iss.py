from sgp4.api import Satrec, jday
from datetime import datetime, timedelta
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv
import os

# Carrega variáveis do .env
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

# Busca o TLE mais recente
res = supabase.table("iss_tle").select("*").order("epoch", desc=True).limit(1).execute()
tle_data = res.data[0]

line1 = tle_data["line1"]
line2 = tle_data["line2"]

print("Usando TLE:")
print(line1)
print(line2)

# Cria o objeto do satélite
satellite = Satrec.twoline2rv(line1, line2)

# Calcula posições para as próximas 10 órbitas (~15 horas)
resultados = []
now = datetime.utcnow()
for i in range(0, 600, 10):  # a cada 10 minutos
    t = now + timedelta(minutes=i)
    jd, fr = jday(t.year, t.month, t.day, t.hour, t.minute, t.second)
    e, r, v = satellite.sgp4(jd, fr)
    if e == 0:
        resultados.append({
            "timestamp": t.isoformat(),
            "x_km": r[0],
            "y_km": r[1],
            "z_km": r[2],
            "vx_km_s": v[0],
            "vy_km_s": v[1],
            "vz_km_s": v[2]
        })

df = pd.DataFrame(resultados)
print(df.head())

# Salvar resultados no Supabase
supabase.table("iss_orbit_pred").insert(resultados).execute()
print("Predições orbitais salvas no Supabase!")
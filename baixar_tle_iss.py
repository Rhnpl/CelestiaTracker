import requests
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv
import os

# Carrega variáveis do .env
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

# URL oficial da Celestrak para a ISS
TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE"

# Faz o download
response = requests.get(TLE_URL)
tle_text = response.text.strip().split("\n")

# Extrai as linhas
name = tle_text[0].strip()
line1 = tle_text[1].strip()
line2 = tle_text[2].strip()
epoch = datetime.utcnow().isoformat()

print(" Nome:", name)
print(" TLE epoch:", epoch)
print("Linha 1:", line1)
print("Linha 2:", line2)

# Insere no Supabase (crie a tabela iss_tle)
data = {
    "name": name,
    "line1": line1,
    "line2": line2,
    "epoch": epoch
}

res = supabase.table("iss_tle").insert(data).execute()
print(" Inserido no Supabase:", res)


import requests
from datetime import datetime
from supabase import create_client, Client
import time
import logging
import sys
import os

# === CONFIGURAÇÕES DO SUPABASE ===
SUPABASE_URL = "https://fvbioxnhhsjtweapufxa.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2YmlveG5oaHNqdHdlYXB1ZnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NDI5NjYsImV4cCI6MjA3NzAxODk2Nn0.CMiKXbHHQypA-J6xZfmaWZHT9B8664he5QnseydUld0"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# === CONFIGURAÇÃO DE LOGS ===
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)
logging.basicConfig(
    filename=os.path.join(LOG_DIR, "iss_tracker.log"),
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

def get_iss_position():
    """Busca posição atual da ISS"""
    url = "http://api.open-notify.org/iss-now.json"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        timestamp = datetime.utcfromtimestamp(data['timestamp'])
        latitude = float(data['iss_position']['latitude'])
        longitude = float(data['iss_position']['longitude'])
        return {"timestamp": timestamp.isoformat(), "latitude": latitude, "longitude": longitude}
    except Exception as e:
        logging.error(f"Erro ao buscar dados da ISS: {e}")
        return None

def send_to_supabase(data):
    """Envia dados para o Supabase"""
    try:
        supabase.table("iss_positions").upsert(data).execute()
        msg = f"Registro enviado com sucesso: {data}"
        print("✅", msg)
        logging.info(msg)
    except Exception as e:
        logging.error(f"Erro ao enviar dados: {e}")
        print("⚠️ Erro ao enviar dados:", e)

def main():
    print("🚀 Serviço de rastreamento ISS iniciado...")
    logging.info("Serviço iniciado")

    while True:
        data = get_iss_position()
        if data:
            send_to_supabase(data)
        else:
            print("⚠️ Falha na leitura da ISS, tentando novamente...")

        time.sleep(60)  # Espera 60 segundos entre cada ciclo

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Serviço encerrado manualmente.")
        logging.info("Serviço encerrado manualmente.")
        sys.exit(0)
    except Exception as e:
        logging.critical(f"Erro crítico: {e}", exc_info=True)
        sys.exit(1)

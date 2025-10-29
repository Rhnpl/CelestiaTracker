from flask import Flask, render_template, jsonify, request
import requests
from datetime import datetime, timedelta
import time
import os
from sgp4.api import Satrec, jday
from dotenv import load_dotenv
from supabase import create_client, Client
import threading

load_dotenv()

app = Flask(__name__, template_folder='app/templates', static_folder='app/static')

SUPABASE_URL = "https://fvbioxnhhsjtweapufxa.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2YmlveG5oaHNqdHdlYXB1ZnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NDI5NjYsImV4cCI6MjA3NzAxODk2Nn0.CMiKXbHHQypA-J6xZfmaWZHT9B8664he5QnseydUld0"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/satellites')
def get_satellites():
    try:
        response = supabase.table("iss_positions").select("id, timestamp, latitude, longitude").execute()
        satellites = []
        seen_ids = set()
        for row in response.data:
            if row['id'] not in seen_ids:
                satellites.append({
                    "id": f"ISS_{row['id']}",
                    "name": f"International Space Station #{row['id']}",
                    "norad_id": "25544"
                })
                seen_ids.add(row['id'])
        return jsonify(satellites)
    except Exception as e:
        print(f"Erro ao buscar satélites: {e}")
        return jsonify([])

@app.route('/api/satellites/<satellite_id>/position')
def get_satellite_position(satellite_id):
    try:
        numeric_id = satellite_id.replace("ISS_", "")
        response = supabase.table("iss_positions").select("*").eq("id", numeric_id).order("timestamp", desc=True).limit(1).execute()
        if response.data:
            position_data = response.data[0]
            return jsonify({
                "id": position_data["id"],
                "name": f"International Space Station #{position_data['id']}",
                "latitude": position_data["latitude"],
                "longitude": position_data["longitude"],
                "timestamp": position_data["timestamp"],
                "altitude": 408,
                "velocity": 7.66
            })
        else:
            return jsonify({"error": "Satélite não encontrado"}), 404
    except Exception as e:
        print(f"Erro ao buscar posição do satélite: {e}")
        return jsonify({"error": "Erro interno do servidor"}), 500

@app.route('/api/satellites/<satellite_id>/orbit')
def get_satellite_orbit(satellite_id):
    try:
        numeric_id = satellite_id.replace("ISS_", "")
        response = supabase.table("iss_positions").select("*").eq("id", numeric_id).order("timestamp").execute()
        orbit_data = [{
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "altitude": 408,
            "timestamp": row["timestamp"]
        } for row in response.data]
        return jsonify(orbit_data)
    except Exception as e:
        print(f"Erro ao buscar dados orbitais: {e}")
        return jsonify([])

@app.route('/api/satellites/current', methods=['POST'])
def set_current_satellite():
    data = request.json
    return jsonify({"status": "success", "satellite_id": data.get('satellite_id')})

def get_iss_position():
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
        print(f"Erro ao buscar dados da ISS: {e}")
        return None

def send_to_supabase(data):
    try:
        supabase.table("iss_positions").insert(data).execute()
        print(f"Registro enviado: {data}")
    except Exception as e:
        print(f"Erro ao enviar dados: {e}")

def start_tracker_service():
    def tracker_loop():
        print("Serviço de rastreamento ISS iniciado...")
        while True:
            data = get_iss_position()
            if data:
                send_to_supabase(data)
            else:
                print("Falha na leitura da ISS.")
            time.sleep(60)
    tracker_thread = threading.Thread(target=tracker_loop, daemon=True)
    tracker_thread.start()

def download_tle_iss():
    TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE"
    try:
        response = requests.get(TLE_URL)
        tle_text = response.text.strip().split("\n")
        name = tle_text[0].strip()
        line1 = tle_text[1].strip()
        line2 = tle_text[2].strip()
        epoch = datetime.utcnow().isoformat()
        data = {"name": name, "line1": line1, "line2": line2, "epoch": epoch}
        supabase.table("iss_tle").insert(data).execute()
        return line1, line2
    except Exception as e:
        print(f"Erro ao baixar TLE: {e}")
        return None, None

def calculate_iss_orbit():
    try:
        res = supabase.table("iss_tle").select("*").order("epoch", desc=True).limit(1).execute()
        if not res.data:
            line1, line2 = download_tle_iss()
            if not line1:
                return
        else:
            tle_data = res.data[0]
            line1, line2 = tle_data["line1"], tle_data["line2"]
        satellite = Satrec.twoline2rv(line1, line2)
        resultados = []
        now = datetime.utcnow()
        for i in range(0, 600, 10):
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
        if resultados:
            supabase.table("iss_orbit_pred").insert(resultados).execute()
    except Exception as e:
        print(f"Erro ao calcular órbitas: {e}")

@app.route('/api/tle/download')
def download_tle():
    line1, line2 = download_tle_iss()
    if line1:
        return jsonify({"status": "success"})
    else:
        return jsonify({"status": "error"}), 500

@app.route('/api/orbit/calculate')
def calculate_orbit():
    calculate_iss_orbit()
    return jsonify({"status": "success"})

if __name__ == '__main__':
    os.makedirs("logs", exist_ok=True)
    start_tracker_service()
    print("Servidor Flask iniciando em http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)

from flask import Flask, render_template, jsonify, request
import requests
from datetime import datetime, timedelta
import time
import os
from sgp4.api import Satrec, jday
import math
from dotenv import load_dotenv
from supabase import create_client, Client
import threading

load_dotenv()

app = Flask(__name__, template_folder='app/templates', static_folder='app/static')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL e SUPABASE_KEY devem estar definidos no arquivo .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/satellites')
def get_satellites():
    try:
        # Retorna apenas 1 satélite: a ISS atual (NORAD 25544)
        # Todos os registros históricos são da mesma estação espacial
        return jsonify([{
            "id": "ISS_25544",
            "name": "International Space Station",
            "norad_id": "25544"
        }])
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

# Utilidades simples para converter TEME -> ECEF -> geodésicas
WGS84_A = 6378.137  # km
WGS84_B = 6356.7523142  # km
WGS84_E2 = 1 - (WGS84_B**2 / WGS84_A**2)

def gmst_from_jd(jd):
    # GMST in radians (Vallado)
    T = (jd - 2451545.0) / 36525.0
    gmst_deg = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T ** 3) / 38710000.0
    gmst_deg = gmst_deg % 360.0
    return math.radians(gmst_deg)

def teme_to_ecef(r_teme, gmst):
    cos_g = math.cos(gmst)
    sin_g = math.sin(gmst)
    x, y, z = r_teme
    x_ecef =  cos_g * x + sin_g * y
    y_ecef = -sin_g * x + cos_g * y
    return x_ecef, y_ecef, z

def ecef_to_geodetic(x, y, z):
    r = math.hypot(x, y)
    if r < 1e-8:
        lon = 0.0
    else:
        lon = math.atan2(y, x)
    lat = math.atan2(z, r)
    for _ in range(5):
        sin_lat = math.sin(lat)
        N = WGS84_A / math.sqrt(1 - WGS84_E2 * sin_lat * sin_lat)
        alt = r / math.cos(lat) - N
        lat = math.atan2(z, r * (1 - WGS84_E2 * N / (N + alt)))
    sin_lat = math.sin(lat)
    N = WGS84_A / math.sqrt(1 - WGS84_E2 * sin_lat * sin_lat)
    alt = r / math.cos(lat) - N
    return math.degrees(lat), math.degrees(lon), alt

@app.route('/api/satellites/<satellite_id>/orbit_predicted')
def get_orbit_predicted(satellite_id):
    try:
        # buscar TLE mais recente; se não houver, baixar
        res = supabase.table("iss_tle").select("*").order("epoch", desc=True).limit(1).execute()
        if not res.data:
            line1, line2 = download_tle_iss()
            if not line1:
                return jsonify([])
        else:
            tle = res.data[0]
            line1, line2 = tle["line1"], tle["line2"]

        sat = Satrec.twoline2rv(line1, line2)
        # parâmetros da query
        total_seconds = int(request.args.get('n', 5400))  # padrão: 90 min
        step_seconds = int(request.args.get('step', 60))  # 1 min
        now = datetime.utcnow()
        points = []
        for tsec in range(0, total_seconds + 1, step_seconds):
            t = now + timedelta(seconds=tsec)
            jd, fr = jday(t.year, t.month, t.day, t.hour, t.minute, t.second + t.microsecond/1e6)
            e, r, _v = sat.sgp4(jd, fr)
            if e != 0:
                continue
            gmst = gmst_from_jd(jd + fr)
            x, y, z = teme_to_ecef(r, gmst)
            lat, lon, alt = ecef_to_geodetic(x, y, z)
            points.append({
                "timestamp": t.isoformat(),
                "latitude": lat,
                "longitude": lon,
                "altitude": alt
            })
        return jsonify(points)
    except Exception as e:
        print(f"Erro ao gerar órbita prevista: {e}")
        return jsonify([])

@app.route('/api/satellites/<satellite_id>/position_predicted')
def get_position_predicted(satellite_id):
    try:
        res = supabase.table("iss_tle").select("*").order("epoch", desc=True).limit(1).execute()
        if not res.data:
            line1, line2 = download_tle_iss()
            if not line1:
                return jsonify({"error": "sem TLE"}), 500
        else:
            tle = res.data[0]
            line1, line2 = tle["line1"], tle["line2"]

        sat = Satrec.twoline2rv(line1, line2)
        now = datetime.utcnow()
        jd, fr = jday(now.year, now.month, now.day, now.hour, now.minute, now.second + now.microsecond/1e6)
        e, r, _v = sat.sgp4(jd, fr)
        if e != 0:
            return jsonify({"error": "propagacao"}), 500
        gmst = gmst_from_jd(jd + fr)
        x, y, z = teme_to_ecef(r, gmst)
        lat, lon, alt = ecef_to_geodetic(x, y, z)
        return jsonify({
            "id": satellite_id,
            "name": "International Space Station",
            "latitude": lat,
            "longitude": lon,
            "timestamp": now.isoformat(),
            "altitude": alt,
            "velocity": 7.66
        })
    except Exception as e:
        print(f"Erro em position_predicted: {e}")
        return jsonify({"error": "internal"}), 500

if __name__ == '__main__':
    os.makedirs("logs", exist_ok=True)
    start_tracker_service()
    print("Servidor Flask iniciando em http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)

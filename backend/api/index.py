# /api/index.py
from mangum import Mangum
from app.main import app  # importa tu app FastAPI existente (la misma que usás en local)

# Handler para Vercel (convierte FastAPI a función serverless)
handler = Mangum(app)

# --- CORS preflight (OPTIONS) ---
if request.method == "OPTIONS":
    response.status_code = 204
    response.headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
    return response

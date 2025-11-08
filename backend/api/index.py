# /api/index.py
from mangum import Mangum
from app.main import app  # importa tu app FastAPI existente (la misma que usás en local)

# Handler para Vercel (convierte FastAPI a función serverless)
handler = Mangum(app)

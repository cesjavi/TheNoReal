# api/index.py
from app.main import app  # importa la instancia FastAPI existente

handler = app  # Vercel busca una variable llamada `handler`

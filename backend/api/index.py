"""Main entry point for Vercel serverless functions."""
from mangum import Mangum
from app.main import app

# Handler para Vercel
handler = Mangum(app, lifespan="off")
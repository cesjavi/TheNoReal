# backend/app/routes/ping.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api", tags=["ping"])

@router.get("/ping")
def ping():
    # Si CORS está bien, verás 'Access-Control-Allow-Origin' en la respuesta
    return JSONResponse({"pong": True})

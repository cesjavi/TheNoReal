# api/index.py  (Vercel Python)
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url=None,
)

# CORS amplio para WebView (https://localhost) y app nativa
ALLOWED_ORIGINS = [
    "*",  # si quieres restringir: "http://localhost", "https://localhost", "capacitor://localhost", "http://10.0.2.2"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

# ========= Handlers =========

@app.options("/api/{full_path:path}")
async def any_options(full_path: str):
    # Responder 204 al preflight para que nunca falle
    return PlainTextResponse("", status_code=204, headers={
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    })

@app.get("/api/ping")
async def ping():
    return JSONResponse({"pong": True})

@app.get("/api/backgrounds")
async def backgrounds():
    # Devuelve algo simple y JSON válido
    # Ejemplo: lista de nombres de SVG disponibles
    return JSONResponse({"items": ["misterio.svg", "bosque.svg", "ciudad.svg"]})

@app.post("/api/prompt/generate")
async def prompt_generate(req: Request):
    try:
        body = await req.json()
    except Exception:
        return JSONResponse({"error": "JSON inválido"}, status_code=400)

    # Simulación: arma un texto corto a partir de config
    prompt = "Semilla breve para la historia."
    return JSONResponse({"prompt": prompt, "echo": body})

@app.post("/api/story")
async def story(req: Request):
    try:
        body = await req.json()
    except Exception:
        return JSONResponse({"error": "JSON inválido"}, status_code=400)

    base = (body.get("story") or "").strip()
    if not base:
        # Importante: devolver JSON y status claro
        return JSONResponse({"error": "story no puede estar vacío"}, status_code=400)

    optionsCount = body.get("optionsPerDecision") or 2
    chapter = {
        "text": f"Capítulo inicial para: {base}",
        "options": ["Opción A", "Opción B"][:optionsCount]
    }
    return JSONResponse({"chapter": chapter})

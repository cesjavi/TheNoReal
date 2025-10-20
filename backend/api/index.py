from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    openapi_url="/api/openapi.json",  # <- mueve OpenAPI bajo /api
    docs_url="/api/docs",             # <- mueve Swagger bajo /api
    redoc_url=None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"ok": True}

@app.post("/api/prompt/generate")
async def prompt_generate(req: Request):
    body = await req.json()
    return JSONResponse({"prompt": "Texto generado según config.", "echo": body})

@app.post("/api/prompt/improve")   # <- esta ruta faltaba
async def prompt_improve(req: Request):
    body = await req.json()
    return JSONResponse({"improved": f"Mejora de: {body.get('prompt','')}", "echo": body})

@app.post("/api/story")
async def story(req: Request):
    body = await req.json()
    base = (body.get("story") or "").strip()
    if not base:
        return JSONResponse({"warning": "story vacío, usando fallback",
                             "chapter": {"text": "Capítulo inicial (fallback)",
                                         "options": ["Opción A", "Opción B"]}})
    return JSONResponse({"chapter": {"text": f"Capítulo inicial para: {base}",
                                     "options": ["Opción A", "Opción B"]}})

# api/index.py
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ConfigDict
from fastapi.middleware.cors import CORSMiddleware
import logging

logger = logging.getLogger("thenoreal")
logger.setLevel(logging.INFO)

app = FastAPI()

# Si en algún momento lo usás desde web normal (no Capacitor), deja CORS abierto:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # o restringí a tus dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====== MODELOS (Pydantic v2) ======

class Estilo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tono: List[str] = Field(default_factory=list)
    ritmo: List[str] = Field(default_factory=list)
    voz: List[str] = Field(default_factory=list)
    tiempo: List[str] = Field(default_factory=list)
    formato: List[str] = Field(default_factory=list)
    descripcion: List[str] = Field(default_factory=list)
    dialogo: List[str] = Field(default_factory=list)
    matiz: List[str] = Field(default_factory=list)

class Ajustes(BaseModel):
    model_config = ConfigDict(extra="ignore")
    publico: List[str] = Field(default_factory=list)
    epoca: List[str] = Field(default_factory=list)
    ambito: List[str] = Field(default_factory=list)
    estructura: List[str] = Field(default_factory=list)
    incluir: List[str] = Field(default_factory=list)
    evitar: List[str] = Field(default_factory=list)
    clasificacion: List[str] = Field(default_factory=list)
    idioma: List[str] = Field(default_factory=list)
    registro: List[str] = Field(default_factory=list)
    creatividad: Optional[float] = 0.75
    topP: Optional[float] = 0.9
    opcionesPorCapitulo: List[Any] = Field(default_factory=list)
    targetWords: Optional[int] = 220
    # variantes
    temperature: Optional[float] = None
    top_p: Optional[float] = None

class ConfigPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    generos: List[str] = Field(default_factory=list)
    estilo: Estilo = Estilo()
    ajustes: Ajustes = Ajustes()

class GeneratePromptBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    config: ConfigPayload

class StoryBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    story: str
    option: Optional[str] = ""
    optionsPerDecision: Optional[int] = 2
    genres: List[str] = Field(default_factory=list)
    estilo: Estilo = Estilo()
    ajustes: Ajustes = Ajustes()
    language: Optional[str] = "es"
    endingMode: Optional[str] = "capitulos"   # "capitulos" | "final"
    chaptersCount: Optional[int] = 3
    finalize: Optional[bool] = False

# ====== ENDPOINTS ======

@app.get("/api/health")
def health():
    return {"ok": True}

@app.post("/api/prompt/generate")
async def generate_prompt(body: GeneratePromptBody):
    # Log para ver exactamente qué llega
    logger.info("generate body %s", body.model_dump())
    # Simulación (reemplazá por tu lógica real)
    prompt = {
        "prompt": "Texto generado según config.",
        "debug": body.model_dump()
    }
    return JSONResponse(prompt)

@app.post("/api/story")
async def story(body: StoryBody):
    logger.info("story body %s", body.model_dump())
    # Validaciones mínimas que no rompan:
    if not body.story or len(body.story.strip()) == 0:
        return JSONResponse({"error": "story no puede estar vacío"}, status_code=400)

    # Simulación (reemplazá por tu lógica de LLM)
    chapter = {
        "text": f"Capítulo inicial para: {body.story}",
        "options": ["Opción A", "Opción B"][: body.optionsPerDecision or 2]
    }
    return JSONResponse({"chapter": chapter})

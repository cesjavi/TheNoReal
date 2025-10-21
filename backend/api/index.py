from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
import logging

logger = logging.getLogger("thenoreal")
logger.setLevel(logging.INFO)

app = FastAPI()

# CORS abierto
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====== ENDPOINTS ======

@app.get("/")
def root():
    return {"status": "ok", "message": "TheNoReal API"}

@app.get("/api")
def api_root():
    return {"status": "ok", "message": "TheNoReal API"}

@app.get("/api/health")
def health():
    return {"ok": True}

@app.post("/api/prompt/generate")
async def generate_prompt(body: GeneratePromptBody):
    try:
        logger.info(f"generate_prompt called with: {body.model_dump()}")
        prompt = {
            "prompt": "Texto generado según config.",
            "debug": body.model_dump()
        }
        return JSONResponse(content=prompt, status_code=200)
    except Exception as e:
        logger.error(f"Error in generate_prompt: {str(e)}")
        return JSONResponse(
            content={"error": str(e)}, 
            status_code=500
        )

@app.post("/api/story")
async def story(body: StoryBody):
    try:
        logger.info(f"story called with: {body.model_dump()}")
        
        if not body.story or len(body.story.strip()) == 0:
            return JSONResponse(
                content={"error": "story no puede estar vacío"}, 
                status_code=400
            )

        chapter = {
            "text": f"Capítulo inicial para: {body.story}",
            "options": ["Opción A", "Opción B"][: body.optionsPerDecision or 2]
        }
        
        return JSONResponse(
            content={"chapter": chapter}, 
            status_code=200
        )
    except Exception as e:
        logger.error(f"Error in story: {str(e)}")
        return JSONResponse(
            content={"error": str(e)}, 
            status_code=500
        )

# IMPORTANTE: Handler para Vercel usando Mangum
handler = Mangum(app, lifespan="off")
from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

from app.routes.backgrounds import router as backgrounds_router
from app.routes.options import router as options_router
from app.routes.ping import router as ping_router
from app.routes.prompt import router as prompt_router
from app.routes.story import router as story_router

# root_path mirrors the deployment path on Vercel where functions live under /api.
app = FastAPI(title="TheNoReal Backend", root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ⭐ AGREGAR ESTE HANDLER PARA PREFLIGHT
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

app.include_router(prompt_router)
app.include_router(options_router)
app.include_router(ping_router)
app.include_router(backgrounds_router)
app.include_router(story_router)
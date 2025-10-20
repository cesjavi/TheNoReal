# backend/app/services/main.py
from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from app.routes.prompt import router as prompt_router
from app.routes.story import router as story_router
from app.routes.backgrounds import router as backgrounds_router
from app.routes.options import router as options_router
from app.routes.ping import router as ping_router

app = FastAPI(title="TheNoReal Backend")

# Abrir CORS para validar preflight (sin credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.options("/{path:path}")
async def catch_all_preflight(path: str) -> Response:  # pragma: no cover - simple header helper
    """Return an empty 204 so Vercel passes CORS preflight checks."""
    return Response(status_code=204)

# Routers
app.include_router(prompt_router)
app.include_router(story_router)
app.include_router(backgrounds_router)
app.include_router(options_router)  # catcher OPTIONS
app.include_router(ping_router)     # ping de verificación rápida

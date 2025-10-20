# backend/app/services/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.backgrounds import router as backgrounds_router
from app.routes.options import router as options_router
from app.routes.ping import router as ping_router
from app.routes.prompt import router as prompt_router
from app.routes.story import router as story_router

# root_path ensures Vercel's /api proxy still reaches the routes while
# keeping local paths usable without the prefix.
app = FastAPI(title="TheNoReal Backend", root_path="/api")

# Abrir CORS para validar preflight (sin credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(prompt_router)
app.include_router(story_router)
app.include_router(backgrounds_router)
app.include_router(options_router)  # catcher OPTIONS
app.include_router(ping_router)     # ping de verificación rápida

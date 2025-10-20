from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.prompt import router as prompt_router
from app.routes.options import router as options_router
from app.routes.ping import router as ping_router

app = FastAPI(title="TheNoReal Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prompt_router)
app.include_router(options_router)
app.include_router(ping_router)

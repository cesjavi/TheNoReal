"""Main FastAPI application."""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import prompt, story, options, backgrounds, ping

logger = logging.getLogger(__name__)

app = FastAPI(title="TheNoReal API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(ping.router)
app.include_router(prompt.router)
app.include_router(story.router)
app.include_router(options.router)
app.include_router(backgrounds.router)

@app.get("/")
@app.get("/api")
def root():
    return {"status": "ok", "message": "TheNoReal API"}

@app.get("/api/health")
def health():
    return {"ok": True}
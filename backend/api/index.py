# api/index.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()  # <-- export principal

@app.get("/api/health")
async def health():
    return {"ok": True}

# ¡No llames a uvicorn.run() aquí!
# Nada de if __name__ == "__main__": ...

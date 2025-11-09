from mangum import Mangum
from app.main import app

# Log para verificar que cargó correctamente
import sys
print(">>> Vercel FastAPI handler started successfully", file=sys.stderr)

handler = Mangum(app)
